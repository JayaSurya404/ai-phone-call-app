export interface SpeechToTextRequest {
  audioBase64: string;
  mimeType: string;
  languageCode: string;
}

export interface SpeechToTextResult {
  text: string;
  confidence: number | null;
  languageCode: string;
  latencyMs: number;
}

export interface LanguageModelMessage {
  role:
    | 'system'
    | 'user'
    | 'assistant';
  content: string;
}

export interface LanguageModelRequest {
  systemPrompt: string;
  messages:
    readonly LanguageModelMessage[];
  languageCode: string;
}

export interface LanguageModelResult {
  text: string;
  latencyMs: number;
  model: string;
}

export interface TextToSpeechRequest {
  text: string;
  languageCode: string;
  voice: string | null;
}

export interface TextToSpeechResult {
  audioBase64: string;
  mimeType: string;
  sampleRateHz: number;
  latencyMs: number;
  voice: string;
}

export interface ProviderHealth {
  name: string;
  ready: boolean;
  detail: string | null;
}

export interface SpeechToTextProvider {
  readonly name: string;

  transcribe(
    request: SpeechToTextRequest
  ): Promise<SpeechToTextResult>;

  health():
  Promise<ProviderHealth>;

  close(): Promise<void>;
}

export interface LanguageModelProvider {
  readonly name: string;

  generate(
    request: LanguageModelRequest
  ): Promise<LanguageModelResult>;

  health():
  Promise<ProviderHealth>;

  close(): Promise<void>;
}

export interface TextToSpeechProvider {
  readonly name: string;

  synthesize(
    request: TextToSpeechRequest
  ): Promise<TextToSpeechResult>;

  health():
  Promise<ProviderHealth>;

  close(): Promise<void>;
}

export interface AiProviderRegistry {
  readonly mode:
    | 'simulated'
    | 'http';

  readonly speechToText:
    SpeechToTextProvider;

  readonly languageModel:
    LanguageModelProvider;

  readonly textToSpeech:
    TextToSpeechProvider;

  health(): Promise<{
    mode: 'simulated' | 'http';
    ready: boolean;
    providers: {
      speechToText:
        ProviderHealth;
      languageModel:
        ProviderHealth;
      textToSpeech:
        ProviderHealth;
    };
  }>;

  close(): Promise<void>;
}