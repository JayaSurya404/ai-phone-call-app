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
  welcomeGreeting: string;
  conversationLanguage: string;
  geminiApiKey: string;
  geminiModel: string;
}

function required(
  key: string
): string {
  const value =
    process.env[key]?.trim();

  if (!value) {
    throw new Error(
      `${key} is required.`
    );
  }

  return value;
}

function positiveInteger(
  key: string,
  fallback: number
): number {
  const value = Number(
    process.env[key] ??
    fallback
  );

  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${key} must be a positive integer.`
    );
  }

  return value;
}

function booleanValue(
  key: string,
  fallback: boolean
): boolean {
  const value =
    process.env[key]
      ?.trim()
      .toLowerCase();

  if (!value) {
    return fallback;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(
    `${key} must be true or false.`
  );
}

function publicUrl(): string {
  const raw =
    required(
      'PUBLIC_BASE_URL'
    ).replace(
      /\/$/,
      ''
    );

  const parsed =
    new URL(raw);

  if (
    parsed.protocol !==
    'https:'
  ) {
    throw new Error(
      'PUBLIC_BASE_URL must use https://.'
    );
  }

  return raw;
}

export function loadGatewayEnvironment():
GatewayEnvironment {
  const publicBaseUrl =
    publicUrl();

  return {
    host:
      process.env
        .GATEWAY_HOST
        ?.trim() ||
      '0.0.0.0',

    port:
      positiveInteger(
        'GATEWAY_PORT',
        3300
      ),

    bearerToken:
      required(
        'GATEWAY_BEARER_TOKEN'
      ),

    twilioAccountSid:
      required(
        'TWILIO_ACCOUNT_SID'
      ),

    twilioAuthToken:
      required(
        'TWILIO_AUTH_TOKEN'
      ),

    twilioPhoneNumber:
      required(
        'TWILIO_PHONE_NUMBER'
      ),

    twilioValidateSignatures:
      booleanValue(
        'TWILIO_VALIDATE_SIGNATURES',
        false
      ),

    publicBaseUrl,

    publicWebSocketUrl:
      publicBaseUrl.replace(
        /^https:/,
        'wss:'
      ),

    maxCallSeconds:
      positiveInteger(
        'MAX_CALL_SECONDS',
        60
      ),

    welcomeGreeting:
      process.env
        .WELCOME_GREETING
        ?.trim() ||
      'Hello! I am your AI phone assistant. How can I help you today?',

    conversationLanguage:
      process.env
        .CONVERSATION_LANGUAGE
        ?.trim() ||
      'en-US',

    geminiApiKey:
      required(
        'GEMINI_API_KEY'
      ),

    geminiModel:
      process.env
        .GEMINI_MODEL
        ?.trim() ||
      'gemini-3.1-flash-lite',
  };
}