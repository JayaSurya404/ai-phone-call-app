import type {
  ConversationMessage,
} from './types.js';

export interface GeminiReplyOptions {
  apiKey: string;
  model: string;
  systemPrompt: string;
  history:
    ConversationMessage[];
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

export async function generateGeminiReply(
  options:
    GeminiReplyOptions
): Promise<string> {
  const endpoint =
    (
      `https://generativelanguage.googleapis.com/` +
      `v1beta/models/`
    ) +
    (
      `${encodeURIComponent(
        options.model
      )}:generateContent?key=` +
      encodeURIComponent(
        options.apiKey
      )
    );

  const response =
    await fetch(
      endpoint,
      {
        method: 'POST',

        headers: {
          'content-type':
            'application/json',
        },

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
              temperature: 0.65,
              topP: 0.9,
              maxOutputTokens: 180,
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
      `Gemini blocked the prompt: ` +
      body.promptFeedback
        .blockReason
    );
  }

  const text =
    body.candidates?.[0]
      ?.content?.parts
      ?.map(
        (part) =>
          part.text ?? ''
      )
      .join('')
      .trim();

  if (!text) {
    const finishReason =
      body.candidates?.[0]
        ?.finishReason;

    throw new Error(
      finishReason
        ? (
            `Gemini returned no text. ` +
            `Finish reason: ` +
            finishReason
          )
        : (
            'Gemini returned an empty response.'
          )
    );
  }

  return text;
}