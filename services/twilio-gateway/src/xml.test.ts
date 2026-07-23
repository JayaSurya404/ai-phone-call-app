import assert
  from 'node:assert/strict';

import test
  from 'node:test';

import {
  buildConversationRelayTwiml,
} from './xml.js';

const baseOptions = {
  webSocketUrl:
    'wss://example.test/twilio/conversation',

  callSessionId:
    'call-session-1',

  welcomeGreeting:
    'Hello from VoiceNexus.',

  actionUrl:
    'https://example.test/twilio/connect-action',

  englishVoice:
    'unused-English-voice',

  tamilVoice:
    'unused-Tamil-voice',

  hindiVoice:
    'unused-Hindi-voice',
};

test(
  'multi TwiML uses Flux only on the parent relay',
  () => {
    const twiml =
      buildConversationRelayTwiml({
        ...baseOptions,
        languageMode:
          'multi',
      });

    assert.match(
      twiml,
      /language="multi"/
    );

    assert.match(
      twiml,
      /ttsProvider="ElevenLabs"/
    );

    assert.match(
      twiml,
      /transcriptionProvider="Deepgram"/
    );

    assert.match(
      twiml,
      /speechModel="flux"/
    );

    assert.match(
      twiml,
      /<Language code="en-IN" \/>/
    );

    assert.match(
      twiml,
      /<Language code="ta-IN" \/>/
    );

    assert.match(
      twiml,
      /<Language code="hi-IN" \/>/
    );

    assert.doesNotMatch(
      twiml,
      /<Language[^>]+speechModel=/
    );

    assert.doesNotMatch(
      twiml,
      /<Language[^>]+voice=/
    );
  }
);

test(
  'fixed-language TwiML omits Flux',
  () => {
    const twiml =
      buildConversationRelayTwiml({
        ...baseOptions,
        languageMode:
          'ta-IN',
      });

    assert.match(
      twiml,
      /language="ta-IN"/
    );

    assert.doesNotMatch(
      twiml,
      /speechModel="flux"/
    );

    assert.doesNotMatch(
      twiml,
      /<Language /
    );
  }
);

test(
  'TwiML escapes dynamic values',
  () => {
    const twiml =
      buildConversationRelayTwiml({
        ...baseOptions,

        languageMode:
          'multi',

        welcomeGreeting:
          'Hello & welcome.',
      });

    assert.match(
      twiml,
      /Hello &amp; welcome\./
    );
  }
);