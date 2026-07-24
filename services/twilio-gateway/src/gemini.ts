import type {
  ConversationMessage,
} from './types.js';

import type {
  LanguageProfile,
} from './language-profiles.js';

export interface GeminiReplyOptions {
  apiKey: string;
  model: string;
  systemPrompt: string;
  history:
    ConversationMessage[];
  timeoutMs?: number;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;

  promptFeedback?: {
    blockReason?: string;
  };

  error?: {
    message?: string;
  };
}

function spokenText(
  value: string
): string {
  return value
    .replaceAll(
      /```[\s\S]*?```/gu,
      ' '
    )
    .replaceAll(
      /[*_#>`~]/gu,
      ''
    )
    .replaceAll(
      /\s+/gu,
      ' '
    )
    .replaceAll(
      /^["']|["']$/gu,
      ''
    )
    .trim();
}

export async function generateGeminiReply(
  options:
    GeminiReplyOptions
): Promise<string> {
  const endpoint =
    (
      'https://generativelanguage.googleapis.com/' +
      'v1beta/models/'
    ) +
    (
      `${encodeURIComponent(
        options.model
      )}:generateContent?key=` +
      encodeURIComponent(
        options.apiKey
      )
    );

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      options.timeoutMs ??
      10_000
    );

  try {
    const response =
      await fetch(
        endpoint,
        {
          method: 'POST',

          headers: {
            'content-type':
              'application/json',
          },

          signal:
            controller.signal,

          body:
            JSON.stringify({
              systemInstruction: {
                parts: [
                  {
                    text:
                      options
                        .systemPrompt,
                  },
                ],
              },

              contents:
                options.history
                  .map(
                    (message) => ({
                      role:
                        message.role,

                      parts: [
                        {
                          text:
                            message.text,
                        },
                      ],
                    })
                  ),

              generationConfig: {
                temperature: 0.9,
                topP: 0.9,
                maxOutputTokens: 180,

                thinkingConfig: {
                  thinkingLevel:
                    'minimal',
                },
              },
            }),
        }
      );

    const body =
      await response
        .json() as
        GeminiResponse;

    if (!response.ok) {
      throw new Error(
        body.error?.message ||
        (
          `Gemini returned HTTP ` +
          `${response.status}.`
        )
      );
    }

    if (
      body.promptFeedback
        ?.blockReason
    ) {
      throw new Error(
        (
          'Gemini blocked the prompt: ' +
          body.promptFeedback
            .blockReason
        )
      );
    }

    const text =
      spokenText(
        body.candidates?.[0]
          ?.content?.parts
          ?.map(
            (part) =>
              part.text ?? ''
          )
          .join('') ??
        ''
      );

    if (!text) {
      const finishReason =
        body.candidates?.[0]
          ?.finishReason;

      throw new Error(
        finishReason
          ? (
              'Gemini returned no text. ' +
              `Finish reason: ${finishReason}`
            )
          : (
              'Gemini returned an empty response.'
            )
      );
    }

    return text;
  } finally {
    clearTimeout(
      timeout
    );
  }
}

export async function generateOpeningGreeting(
  options: {
    apiKey: string;
    model: string;
    callPurpose: string;
    profile:
      LanguageProfile;
  }
): Promise<string> {
  try {
    return await generateGeminiReply({
      apiKey:
        options.apiKey,

      model:
        options.model,

      timeoutMs: 8_000,

      systemPrompt: [
        (
          'Create the opening for a real outbound telephone call.'
        ),

        (
          'Disclose once that the caller is an AI assistant.'
        ),

        (
          'State the actual purpose naturally and ask exactly one ' +
          'useful opening question.'
        ),

        (
          'Use no more than two short spoken sentences.'
        ),

        (
          'Do not say "preferred language", "language selection", ' +
          'or anything that sounds like a chatbot menu.'
        ),

        (
          `Speak in ${options.profile.llmLanguageName}.`
        ),

        options.profile
          .llmInstruction,

        (
          'Use no markdown, list, heading, emoji, or stage direction.'
        ),
      ].join('\n'),

      history: [
        {
          role: 'user',

          text:
            options.callPurpose,
        },
      ],
    });
  } catch {
    return (
      'Hello, this is VoiceNexus, an AI assistant calling ' +
      'regarding your request. Is now a good time to talk?'
    );
  }
}