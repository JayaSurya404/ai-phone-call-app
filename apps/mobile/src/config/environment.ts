function normalizeBaseUrl(
  value: string
): string {
  return value.replace(
    /\/+$/,
    ''
  );
}

export const mobileEnvironment = {
  apiBaseUrl:
    normalizeBaseUrl(
      process.env
        .EXPO_PUBLIC_API_BASE_URL ??
      'http://10.0.2.2:3000'
    ),

  realtimeToken:
    process.env
      .EXPO_PUBLIC_REALTIME_TOKEN ??
    'voicenexus_local_realtime_token_2026',
} as const;