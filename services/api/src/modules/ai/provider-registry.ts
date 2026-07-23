import type {
  AiProviderRegistry,
} from './contracts.js';

import {
  createHttpLanguageModelProvider,
  createHttpSpeechToTextProvider,
  createHttpTextToSpeechProvider,
} from './http-providers.js';

import {
  createSimulatedLanguageModelProvider,
  createSimulatedSpeechToTextProvider,
  createSimulatedTextToSpeechProvider,
} from './simulated-providers.js';

export interface AiProviderRegistryOptions {
  mode:
    | 'simulated'
    | 'http';
  inferenceBaseUrl: string;
  inferenceInternalToken: string;
  inferenceTimeoutMs: number;
  speechToTextName: string;
  languageModelName: string;
  textToSpeechName: string;
}

export function createAiProviderRegistry(
  options:
    AiProviderRegistryOptions
): AiProviderRegistry {
  const httpOptions = {
    baseUrl:
      options.inferenceBaseUrl,
    internalToken:
      options.inferenceInternalToken,
    timeoutMs:
      options.inferenceTimeoutMs,
    speechToTextName:
      options.speechToTextName,
    languageModelName:
      options.languageModelName,
    textToSpeechName:
      options.textToSpeechName,
  };

  const speechToText =
    options.mode === 'http'
      ? createHttpSpeechToTextProvider(
          httpOptions
        )
      : createSimulatedSpeechToTextProvider();

  const languageModel =
    options.mode === 'http'
      ? createHttpLanguageModelProvider(
          httpOptions
        )
      : createSimulatedLanguageModelProvider();

  const textToSpeech =
    options.mode === 'http'
      ? createHttpTextToSpeechProvider(
          httpOptions
        )
      : createSimulatedTextToSpeechProvider();

  return {
    mode: options.mode,
    speechToText,
    languageModel,
    textToSpeech,

    async health() {
      const [
        speechToTextHealth,
        languageModelHealth,
        textToSpeechHealth,
      ] = await Promise.all([
        speechToText.health(),
        languageModel.health(),
        textToSpeech.health(),
      ]);

      return {
        mode: options.mode,

        ready:
          speechToTextHealth.ready &&
          languageModelHealth.ready &&
          textToSpeechHealth.ready,

        providers: {
          speechToText:
            speechToTextHealth,
          languageModel:
            languageModelHealth,
          textToSpeech:
            textToSpeechHealth,
        },
      };
    },

    async close():
    Promise<void> {
      await Promise.all([
        speechToText.close(),
        languageModel.close(),
        textToSpeech.close(),
      ]);
    },
  };
}