# VoiceNexus production and real-provider guide

## Current default

The application remains safe to run without paid services:

- `TELEPHONY_PROVIDER_MODE=simulator`
- `AI_PROVIDER_MODE=simulated`

The local telephony simulator and deterministic AI providers continue to work exactly as before.

## API security

Production mode adds:

- HTTP security headers.
- Explicit CORS origin configuration.
- Global API rate limiting.
- Configurable request body limits.
- Proxy-awareness for deployments behind a load balancer.
- HMAC-SHA256 verification for public telephony callbacks.
- Timestamp replay protection for callback requests.

Never commit production `.env` files. Copy `infra/docker/.env.production.example` to an ignored `.env.production` file and replace every placeholder.

## Real telephony gateway contract

Set:

```env
TELEPHONY_PROVIDER_MODE=http
TELEPHONY_HTTP_URL=https://your-gateway.example.com
TELEPHONY_HTTP_TOKEN=...
TELEPHONY_HTTP_PROVIDER_NAME=your-provider
TELEPHONY_WEBHOOK_PUBLIC_URL=https://api.example.com/api/v1/webhooks/telephony/events
TELEPHONY_WEBHOOK_SECRET=...
```

VoiceNexus calls the gateway with:

```http
POST /v1/calls
Authorization: Bearer <TELEPHONY_HTTP_TOKEN>
Content-Type: application/json
```

The request contains the call session, destination number, prompt, language, optional simulator-style scenario, and callback settings.

The gateway must return either:

```json
{
  "id": "provider-call-id"
}
```

or:

```json
{
  "providerCallId": "provider-call-id"
}
```

Cancellation uses:

```http
DELETE /v1/calls/:providerCallId
Authorization: Bearer <TELEPHONY_HTTP_TOKEN>
```

This gateway can later wrap Twilio, Telnyx, Vonage, Plivo, Azure Communication Services, a SIP platform, or another provider without changing the VoiceNexus call orchestration layer.

## Signed callback contract

Send provider events to:

```text
POST /api/v1/webhooks/telephony/events
```

Required headers:

```text
x-voicenexus-timestamp: <Unix seconds>
x-voicenexus-signature: sha256=<hex digest>
```

The signature input is:

```text
timestamp + "." + canonical-json-body
```

Canonical JSON recursively sorts object keys. Use HMAC-SHA256 with `TELEPHONY_WEBHOOK_SECRET`.

The accepted callback event model is the same durable provider-event contract already used by the simulator:

- `ringing`
- `connected`
- `transcript`
- `completed`
- `failed`
- `cancelled`

Duplicate `eventId` values remain idempotent.

## Docker production deployment

Create the secret file:

```powershell
Copy-Item `
  'infra\docker\.env.production.example' `
  'infra\docker\.env.production'
```

Validate:

```powershell
docker compose `
  --env-file infra/docker/.env.production `
  -f infra/docker/compose.prod.yml `
  config
```

Build and start:

```powershell
docker compose `
  --env-file infra/docker/.env.production `
  -f infra/docker/compose.prod.yml `
  up -d --build
```

Check:

```powershell
docker compose `
  --env-file infra/docker/.env.production `
  -f infra/docker/compose.prod.yml `
  ps
```

Stop without deleting database volumes:

```powershell
docker compose `
  --env-file infra/docker/.env.production `
  -f infra/docker/compose.prod.yml `
  down
```

## Expo Android builds

`apps/mobile/eas.json` provides:

- `development`: internal development-client APK.
- `preview`: internal preview APK.
- `production`: Play Store Android App Bundle.

Configure the production API URL and realtime token as EAS environment variables rather than committing secrets.

Example build command from `apps/mobile`:

```powershell
npx eas-cli build `
  --platform android `
  --profile preview
```

A production build uses:

```powershell
npx eas-cli build `
  --platform android `
  --profile production
```

## Release gate

A release is ready only when all of these pass:

```powershell
npm.cmd run api:check

npm.cmd run check `
  --workspace @voicenexus/telephony-simulator

Set-Location apps/mobile

npx.cmd tsc --noEmit
npm.cmd run lint
npx.cmd expo export --platform android
```

The GitHub Actions workflow repeats the same checks for pushes and pull requests.