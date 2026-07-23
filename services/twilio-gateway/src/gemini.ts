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
  }>;
  error?: {
    message?: string;
  };
}

export async function generateGeminiReply(
  options:
    GeminiReplyOptions
): Promise<string> {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(
      options.model
    )}:generateContent?key=${encodeURIComponent(
      options.apiKey
    )}`;

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
              temperature: 0.7,
              maxOutputTokens: 160,
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
      `Gemini returned HTTP ${response.status}.`
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
    throw new Error(
      'Gemini returned an empty response.'
    );
  }

  return text;
}