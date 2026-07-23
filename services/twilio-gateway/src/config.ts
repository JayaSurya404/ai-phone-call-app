import 'dotenv/config';

export interface GatewayEnvironment {
  host: string;
  port: number;
  bearerToken: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  twilioValidateSignatures: boolean;
  publicBaseUrl: string;
  publicWebSocketUrl: string;
  maxCallSeconds: number;
  fallbackGreeting: string;
  geminiApiKey: string;
  geminiModel: string;
  englishVoice: string;
  tamilVoice: string;
  hindiVoice: string;
}

function required(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

function positiveInteger(key: string, fallback: number): number {
  const value = Number(process.env[key] ?? fallback);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${key} must be a positive integer.`);
  }
  return value;
}

function booleanValue(key: string, fallback: boolean): boolean {
  const value = process.env[key]?.trim().toLowerCase();
  if (!value) return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${key} must be true or false.`);
}

function publicUrl(): string {
  const raw = required('PUBLIC_BASE_URL').replace(/\/$/, '');
  const parsed = new URL(raw);
  if (parsed.protocol !== 'https:') {
    throw new Error('PUBLIC_BASE_URL must use https://.');
  }
  return raw;
}

export function loadGatewayEnvironment(): GatewayEnvironment {
  const publicBaseUrl = publicUrl();

  return {
    host: optional('GATEWAY_HOST', '0.0.0.0'),
    port: positiveInteger('GATEWAY_PORT', 3300),
    bearerToken: required('GATEWAY_BEARER_TOKEN'),
    twilioAccountSid: required('TWILIO_ACCOUNT_SID'),
    twilioAuthToken: required('TWILIO_AUTH_TOKEN'),
    twilioPhoneNumber: required('TWILIO_PHONE_NUMBER'),
    twilioValidateSignatures: booleanValue(
      'TWILIO_VALIDATE_SIGNATURES',
      false,
    ),
    publicBaseUrl,
    publicWebSocketUrl: publicBaseUrl.replace(/^https:/, 'wss:'),
    maxCallSeconds: positiveInteger('MAX_CALL_SECONDS', 180),
    fallbackGreeting: optional(
      'WELCOME_GREETING',
      'Hello, this is VoiceNexus, an AI assistant calling regarding your request. Is now a good time to talk?',
    ),
    geminiApiKey: required('GEMINI_API_KEY'),
    geminiModel: optional('GEMINI_MODEL', 'gemini-3.1-flash-lite'),
    englishVoice: optional(
      'ELEVENLABS_VOICE_EN',
      'mCQMfsqGDT6IDkEKR20a-flash_v2_5-0.95_0.55_0.80',
    ),
    tamilVoice: optional(
      'ELEVENLABS_VOICE_TA',
      'ZhJ5LanYnCmLKQUXvsV7-flash_v2_5-0.92_0.55_0.80',
    ),
    hindiVoice: optional(
      'ELEVENLABS_VOICE_HI',
      'IvLWq57RKibBrqZGpQrC-flash_v2_5-0.94_0.55_0.80',
    ),
  };
}
