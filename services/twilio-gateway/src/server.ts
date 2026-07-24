import formbody from '@fastify/formbody';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';
import twilio from 'twilio';
import type { WebSocket } from 'ws';

import { sendProviderEvent } from './callback-client.js';
import { loadGatewayEnvironment } from './config.js';
import {
  generateGeminiReply,
  generateOpeningGreeting,
} from './gemini.js';
import {
  explicitLanguageRequest,
  languageName,
  normalizeLanguageMode,
  resolveCallerLanguage,
  responseLanguage,
} from './language.js';
import type {
  ActiveGatewayCall,
  LanguageMode,
  ProviderEventType,
  ProviderEventValues,
  StartCallInput,
  SupportedLanguage,
} from './types.js';
import { buildConversationRelayTwiml } from './xml.js';

const environment = loadGatewayEnvironment();

const app = Fastify({
  logger: true,
  bodyLimit: 1024 * 1024,
});

await app.register(formbody);
await app.register(websocket);

const twilioClient = twilio(
  environment.twilioAccountSid,
  environment.twilioAuthToken,
);

const callsByInternalId = new Map<string, ActiveGatewayCall>();
const callsByProviderId = new Map<string, ActiveGatewayCall>();

function authorizationValid(authorization: string | undefined): boolean {
  return authorization === `Bearer ${environment.bearerToken}`;
}

function getCall(
  callSessionId: string | undefined,
  providerCallId?: string | undefined,
): ActiveGatewayCall | null {
  if (callSessionId) {
    const call = callsByInternalId.get(callSessionId);
    if (call) return call;
  }

  if (providerCallId) {
    return callsByProviderId.get(providerCallId) ?? null;
  }

  return null;
}

function reportProviderEvent(
  call: ActiveGatewayCall,
  type: ProviderEventType,
  values: ProviderEventValues = {},
): void {
  void sendProviderEvent(call, type, values).catch((error) => {
    app.log.error(
      {
        error: error instanceof Error ? error.message : String(error),
        type,
        callSessionId: call.callSessionId,
        providerCallId: call.providerCallId,
      },
      'Provider callback delivery failed.',
    );
  });
}

function ensureConnected(call: ActiveGatewayCall): void {
  if (call.connectedSent) return;

  call.connectedSent = true;
  reportProviderEvent(call, 'connected');
  reportProviderEvent(call, 'transcript', {
    speaker: 'AI_AGENT',
    content: call.openingGreeting,
    sentiment: 'NEUTRAL',
    latencyMs: 0,
  });
}

function summaryFor(call: ActiveGatewayCall): string {
  const userTurns = call.transcript.filter(
    (item) => item.speaker === 'REMOTE_PARTY',
  ).length;
  const aiTurns = call.transcript.filter(
    (item) => item.speaker === 'AI_AGENT',
  ).length;

  if (userTurns === 0 && aiTurns === 0) {
    return 'The call ended before a conversation was recorded.';
  }

  return (
    `The AI phone call completed with ${userTurns} caller message` +
    `${userTurns === 1 ? '' : 's'} and ${aiTurns} AI response` +
    `${aiTurns === 1 ? '' : 's'}.`
  );
}

async function completeCall(call: ActiveGatewayCall): Promise<void> {
  if (call.completedSent) return;
  call.completedSent = true;

  if (call.timeout) clearTimeout(call.timeout);

  try {
    await sendProviderEvent(call, 'completed', {
      summary: summaryFor(call),
      sentiment: 'NEUTRAL',
    });
  } catch (error) {
    app.log.error(
      {
        error: error instanceof Error ? error.message : String(error),
        callSessionId: call.callSessionId,
      },
      'Final callback delivery failed.',
    );
  }
}

function sendText(
  socket: WebSocket,
  text: string,
  _language:
    SupportedLanguage
): void {
  socket.send(
    JSON.stringify({
      type: 'text',
      token: text,
      last: true,

      // ElevenLabs performs
      // automatic Tamil/English/
      // Hindi output detection.
      lang: 'multi',

      interruptible: true,
      preemptible: true,
    })
  );
}

function switchSessionLanguage(
  socket: WebSocket,
  language:
    LanguageMode
): void {
  const transcriptionLanguage =
    language === 'ta-IN'
      ? 'ta'
      : language === 'hi-IN'
        ? 'hi'
        : language === 'en-IN'
          ? 'en-IN'
          : 'multi';

  socket.send(
    JSON.stringify({
      type: 'language',

      // Keep TTS multilingual so
      // Tamil plus English words
      // are spoken naturally.
      ttsLanguage:
        'multi',

      transcriptionLanguage,
    })
  );
}

function validStartInput(value: unknown): value is StartCallInput {
  if (typeof value !== 'object' || value === null) return false;

  const input = value as Partial<StartCallInput>;
  return (
    typeof input.callSessionId === 'string' &&
    input.callSessionId.trim() !== '' &&
    typeof input.destinationNumber === 'string' &&
    input.destinationNumber.trim() !== '' &&
    typeof input.promptSnapshot === 'string' &&
    input.promptSnapshot.trim() !== '' &&
    typeof input.languageCode === 'string' &&
    typeof input.callback === 'object' &&
    input.callback !== null &&
    typeof input.callback.url === 'string' &&
    typeof input.callback.signingSecret === 'string'
  );
}

function buildTwiml(
  callSessionId: string,
  languageMode: LanguageMode,
  greeting: string,
  retry: number,
): string {
  const actionUrl =
    `${environment.publicBaseUrl}/twilio/connect-action?callSessionId=` +
    `${encodeURIComponent(callSessionId)}&retry=${retry}`;

  return buildConversationRelayTwiml({
    webSocketUrl: `${environment.publicWebSocketUrl}/twilio/conversation`,
    callSessionId,
    welcomeGreeting: greeting,
    actionUrl,
    languageMode,
    englishVoice: environment.englishVoice,
    tamilVoice: environment.tamilVoice,
    hindiVoice: environment.hindiVoice,
  });
}

function recognitionNote(
  unexpectedDetection: boolean,
  detectedTag: string | null,
  activeLanguage: SupportedLanguage,
): string {
  if (!unexpectedDetection) return '';

  return [
    '',
    `Important transcription note: Twilio labeled the last utterance as "${
      detectedTag ?? 'unknown'
    }", but this agent supports English, Tamil, and Hindi.`,
    'Do not answer in Spanish or another unsupported language.',
    'The caller may have spoken Tamil or code-switched.',
    `Reply briefly in ${languageName(
      activeLanguage,
    )} and ask for a short repetition only if the transcription does not make sense in context.`,
  ].join('\n');
}

function agentSystemPrompt(
  call: ActiveGatewayCall,
  callerLanguage: SupportedLanguage,
  unexpectedDetection: boolean,
  detectedTag: string | null,
): string {
  return [
    call.promptSnapshot,
    '',
    'You are VoiceNexus, an AI voice agent speaking during a real telephone call.',
    'The opening greeting has already disclosed that you are an AI assistant. Do not repeat that disclosure on every turn unless the caller asks.',
    'Follow the requested business purpose and move the conversation toward a clear useful outcome.',
    'Sound warm, calm, confident, concise, and natural.',
    'Use spoken conversational phrasing, not written-report phrasing.',
    'Usually answer with one or two short sentences.',
    'Acknowledge the caller naturally, then ask at most one useful question.',
    'Do not repeat the same introduction, apology, or question.',
    'Never use markdown, bullet points, emojis, headings, URLs, or stage directions.',
    `The reliable caller language for this turn is ${languageName(
      callerLanguage,
    )}.`,
    'Reply in that same language. Preserve natural English words when the caller code-switches.',
    'For Tamil, use fluent everyday spoken Tamil rather than a literal formal translation.',
    'For Hindi, use fluent everyday spoken Hindi.',
    'If audio is unclear, ask one short clarification question.',
    'Do not end the call merely because the language changed.',
    'Only close the call after the objective is complete and the caller confirms there is nothing else needed.',
    recognitionNote(unexpectedDetection, detectedTag, callerLanguage),
  ].join('\n');
}

async function handleCallerPrompt(
  socket: WebSocket,
  call: ActiveGatewayCall,
  callerText: string,
  detectedLanguage: string | undefined,
): Promise<void> {
  const now = Date.now();

  if (
    call.lastCallerText === callerText &&
    call.lastCallerAtMs !== undefined &&
    now - call.lastCallerAtMs < 1_500
  ) {
    app.log.info(
      { callSessionId: call.callSessionId, callerText },
      'Duplicate final prompt ignored.',
    );
    return;
  }

  call.lastCallerText = callerText;
  call.lastCallerAtMs = now;

  const languageResolution = resolveCallerLanguage(
    callerText,
    detectedLanguage,
    call.lastReliableLanguage,
  );

  if (languageResolution.detectionWasReliable) {
    call.lastReliableLanguage = languageResolution.language;
  }

  const requestedSwitch = explicitLanguageRequest(callerText);

  if (requestedSwitch) {
    call.activeTranscriptionLanguage = requestedSwitch;
    switchSessionLanguage(socket, requestedSwitch);

    if (requestedSwitch !== 'multi') {
      call.lastReliableLanguage = requestedSwitch;
    }

    app.log.info(
      { callSessionId: call.callSessionId, language: requestedSwitch },
      'Conversation language switched.',
    );
  }

  const startedAt = Date.now();

  call.history.push({ role: 'user', text: callerText });
  call.transcript.push({ speaker: 'REMOTE_PARTY', content: callerText });

  reportProviderEvent(call, 'transcript', {
    speaker: 'REMOTE_PARTY',
    content: callerText,
    sentiment: 'NEUTRAL',
  });

  app.log.info(
    {
      callSessionId: call.callSessionId,
      callerText,
      detectedLanguage,
      resolvedLanguage: languageResolution.language,
      unexpectedDetection: languageResolution.unexpectedDetection,
    },
    'Final caller prompt received.',
  );

  let responseText: string;

  try {
    responseText = await generateGeminiReply({
      apiKey: environment.geminiApiKey,
      model: environment.geminiModel,
      systemPrompt: agentSystemPrompt(
        call,
        languageResolution.language,
        languageResolution.unexpectedDetection,
        languageResolution.detectedTag,
      ),
      history: call.history.slice(-18),
    });
  } catch (error) {
    app.log.error(
      {
        error: error instanceof Error ? error.message : String(error),
        callSessionId: call.callSessionId,
        model: environment.geminiModel,
      },
      'Gemini response failed.',
    );

    responseText =
      languageResolution.language === 'ta-IN'
        ? 'மன்னிக்கவும், சிறிய இணைப்பு பிரச்சனை ஏற்பட்டது. தயவுசெய்து அதை இன்னொரு முறை சொல்லுங்கள்.'
        : languageResolution.language === 'hi-IN'
          ? 'माफ़ कीजिए, थोड़ी कनेक्शन समस्या हुई। कृपया एक बार फिर कहिए।'
          : 'Sorry, I had a brief connection issue. Please say that once more.';
  }

  const latency = Date.now() - startedAt;
  const spokenLanguage = responseLanguage(
    responseText,
    languageResolution.language,
  );

  sendText(socket, responseText, spokenLanguage);

  call.history.push({ role: 'model', text: responseText });
  call.transcript.push({ speaker: 'AI_AGENT', content: responseText });

  reportProviderEvent(call, 'transcript', {
    speaker: 'AI_AGENT',
    content: responseText,
    sentiment: 'NEUTRAL',
    latencyMs: latency,
  });

  app.log.info(
    {
      callSessionId: call.callSessionId,
      latencyMs: latency,
      responseLanguage: spokenLanguage,
      responseText,
    },
    'AI response sent to Twilio.',
  );
}

app.get('/health', async () => ({
  status: 'ok',
  service: 'voicenexus-twilio-gateway',
  provider: 'twilio-conversation-relay',
  languageMode: 'English-Tamil-Hindi',
  geminiModel: environment.geminiModel,
  maxCallSeconds: environment.maxCallSeconds,
}));

app.get('/v1/diagnostics', async (request, reply) => {
  if (!authorizationValid(request.headers.authorization)) {
    return reply.code(401).send({ message: 'Unauthorized.' });
  }

  try {
    const geminiReply = await generateGeminiReply({
      apiKey: environment.geminiApiKey,
      model: environment.geminiModel,
      systemPrompt: 'This is a connectivity test. Reply with READY only.',
      history: [{ role: 'user', text: 'Test now.' }],
    });

    return {
      status: 'ready',
      twilioConfigured: environment.twilioAccountSid.startsWith('AC'),
      gemini: {
        model: environment.geminiModel,
        response: geminiReply,
      },
      supportedLanguages: ['en-IN', 'ta-IN', 'hi-IN'],
      maxCallSeconds: environment.maxCallSeconds,
    };
  } catch (error) {
    return reply.code(502).send({
      status: 'not-ready',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post<{ Body: StartCallInput }>('/v1/calls', async (request, reply) => {
  if (!authorizationValid(request.headers.authorization)) {
    return reply.code(401).send({ message: 'Unauthorized.' });
  }

  if (!validStartInput(request.body)) {
    return reply.code(400).send({ message: 'Invalid call request.' });
  }

  const input = request.body;
  const languageMode = normalizeLanguageMode(input.languageCode);
  const openingGreeting = await generateOpeningGreeting({
    apiKey: environment.geminiApiKey,
    model: environment.geminiModel,
    callPurpose: input.promptSnapshot,
    language: languageMode,
    fallback: environment.fallbackGreeting,
  });

  const statusCallbackUrl =
    `${environment.publicBaseUrl}/twilio/status?callSessionId=` +
    encodeURIComponent(input.callSessionId);

  const twiml = buildTwiml(
    input.callSessionId,
    languageMode,
    openingGreeting,
    0,
  );

  try {
    const created = await twilioClient.calls.create({
      to: input.destinationNumber,
      from: environment.twilioPhoneNumber,
      twiml,
      statusCallback: statusCallbackUrl,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      timeout: 20,
    });

    const initialReliableLanguage: SupportedLanguage =
      languageMode === 'ta-IN'
        ? 'ta-IN'
        : languageMode === 'hi-IN'
          ? 'hi-IN'
          : 'en-IN';

    const state: ActiveGatewayCall = {
      callSessionId: input.callSessionId,
      providerCallId: created.sid,
      destinationNumber: input.destinationNumber,
      promptSnapshot: input.promptSnapshot,
      requestedLanguageMode: languageMode,
      activeTranscriptionLanguage: languageMode,
      lastReliableLanguage: initialReliableLanguage,
      openingGreeting,
      callback: input.callback,
      history: [],
      transcript: [{ speaker: 'AI_AGENT', content: openingGreeting }],
      createdAt: new Date().toISOString(),
      connectedSent: false,
      completedSent: false,
      reconnectAttempts: 0,
    };

    state.timeout = setTimeout(() => {
      void twilioClient
        .calls(created.sid)
        .update({ status: 'completed' })
        .catch((error) => {
          app.log.error(error, 'Failed to enforce call time limit.');
        });
    }, environment.maxCallSeconds * 1000);

    callsByInternalId.set(state.callSessionId, state);
    callsByProviderId.set(state.providerCallId, state);

    app.log.info(
      {
        callSessionId: state.callSessionId,
        providerCallId: state.providerCallId,
        destinationNumber: state.destinationNumber,
        languageMode,
        openingGreeting,
      },
      'Real Twilio call created.',
    );

    return reply.code(201).send({
      id: created.sid,
      providerCallId: created.sid,
    });
  } catch (error) {
    app.log.error(error, 'Twilio outbound call failed.');
    return reply.code(502).send({
      message:
        error instanceof Error
          ? error.message
          : 'Twilio could not create the outbound call.',
    });
  }
});

app.delete<{ Params: { id: string } }>('/v1/calls/:id', async (request, reply) => {
  if (!authorizationValid(request.headers.authorization)) {
    return reply.code(401).send({ message: 'Unauthorized.' });
  }

  const call = getCall(undefined, request.params.id);

  try {
    await twilioClient.calls(request.params.id).update({ status: 'completed' });

    if (call) {
      reportProviderEvent(call, 'cancelled', {
        reason: 'Cancelled from the mobile app.',
      });
    }

    return reply.code(204).send();
  } catch (error) {
    app.log.error(error, 'Twilio cancellation failed.');
    return reply.code(502).send({
      message:
        error instanceof Error
          ? error.message
          : 'Twilio could not cancel the call.',
    });
  }
});

app.post<{
  Querystring: { callSessionId?: string };
  Body: Record<string, string | undefined>;
}>('/twilio/status', async (request, reply) => {
  const callSid = request.body.CallSid;
  const callStatus = request.body.CallStatus?.toLowerCase();
  const call = getCall(request.query.callSessionId, callSid);

  if (!call) {
    app.log.warn(
      { callSid, callStatus },
      'Status callback arrived before gateway state was available.',
    );
    return reply.code(204).send();
  }

  switch (callStatus) {
    case 'ringing':
      reportProviderEvent(call, 'ringing');
      break;
    case 'in-progress':
      ensureConnected(call);
      break;
    case 'completed':
      await completeCall(call);
      break;
    case 'canceled':
      reportProviderEvent(call, 'cancelled', {
        reason: 'Twilio reported that the call was cancelled.',
      });
      break;
    case 'busy':
    case 'failed':
    case 'no-answer':
      reportProviderEvent(call, 'failed', {
        reason: `Twilio call status: ${callStatus}.`,
      });
      break;
    default:
      break;
  }

  return reply.code(204).send();
});

app.post<{
  Querystring: { callSessionId?: string; retry?: string };
  Body: Record<string, string | undefined>;
}>('/twilio/connect-action', async (request, reply) => {
  const call = getCall(request.query.callSessionId, request.body.CallSid);
  const retry = Number(request.query.retry ?? 0);
  const sessionStatus = request.body.SessionStatus?.toLowerCase();

  if (call && sessionStatus === 'failed' && retry < 1) {
    call.reconnectAttempts += 1;

    app.log.warn(
      {
        callSessionId: call.callSessionId,
        errorCode: request.body.ErrorCode,
        errorMessage: request.body.ErrorMessage,
      },
      'ConversationRelay failed; reconnecting once.',
    );

    return reply.type('text/xml').send(
      buildTwiml(
        call.callSessionId,
        call.activeTranscriptionLanguage,
        '',
        retry + 1,
      ),
    );
  }

  return reply
    .type('text/xml')
    .send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup /></Response>');
});

app.get('/twilio/conversation', { websocket: true }, (socket, request) => {
  if (environment.twilioValidateSignatures) {
    const signature = request.headers['x-twilio-signature'];
    const valid =
      typeof signature === 'string' &&
      twilio.validateRequest(
        environment.twilioAuthToken,
        signature,
        `${environment.publicWebSocketUrl}${request.url}`,
        {},
      );

    if (!valid) {
      socket.close(1008, 'Invalid Twilio signature.');
      return;
    }
  }

  let activeCall: ActiveGatewayCall | null = null;
  let processing = Promise.resolve();

  socket.on('message', (data) => {
    processing = processing
      .then(async () => {
        const message = JSON.parse(data.toString()) as {
          type?: string;
          callSid?: string;
          customParameters?: { callSessionId?: string };
          voicePrompt?: string;
          lang?: string;
          last?: boolean;
          utteranceUntilInterrupt?: string;
          durationUntilInterruptMs?: number;
          description?: string;
        };

        if (message.type === 'setup') {
          activeCall = getCall(
            message.customParameters?.callSessionId,
            message.callSid,
          );

          if (!activeCall) {
            socket.close(1008, 'Unknown call session.');
            return;
          }

          ensureConnected(activeCall);
          app.log.info(
            {
              callSessionId: activeCall.callSessionId,
              providerCallId: activeCall.providerCallId,
              languageMode: activeCall.activeTranscriptionLanguage,
            },
            'ConversationRelay setup completed.',
          );
          return;
        }

        if (message.type === 'prompt' && message.last === true && activeCall) {
          const callerText = message.voicePrompt?.trim();
          if (!callerText) return;

          await handleCallerPrompt(
            socket,
            activeCall,
            callerText,
            message.lang,
          );
          return;
        }

        if (message.type === 'interrupt') {
          app.log.info(
            {
              callSessionId: activeCall?.callSessionId,
              spokenBeforeInterrupt: message.utteranceUntilInterrupt,
              durationMs: message.durationUntilInterruptMs,
            },
            'Caller interrupted AI speech.',
          );
          return;
        }

        if (message.type === 'error') {
          app.log.error(
            {
              description: message.description,
              callSessionId: activeCall?.callSessionId,
            },
            'ConversationRelay error.',
          );
        }
      })
      .catch((error) => {
        app.log.error(
          {
            error: error instanceof Error ? error.message : String(error),
            callSessionId: activeCall?.callSessionId,
          },
          'Conversation message failed.',
        );
      });
  });

  socket.on('close', () => {
    if (activeCall) {
      app.log.info(
        { callSessionId: activeCall.callSessionId },
        'ConversationRelay socket closed.',
      );
    }
  });
});

await app.listen({
  host: environment.host,
  port: environment.port,
});

app.log.info(
  {
    port: environment.port,
    publicBaseUrl: environment.publicBaseUrl,
    provider: 'twilio-conversation-relay',
    languages: ['en-IN', 'ta-IN', 'hi-IN'],
    geminiModel: environment.geminiModel,
    maxCallSeconds: environment.maxCallSeconds,
  },
  'VoiceNexus Twilio gateway started.',
);
