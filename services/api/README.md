# VoiceNexus API

The VoiceNexus API is the TypeScript/Fastify control-plane service for the mobile AI phone agent.

## Current Responsibilities

The initial API foundation provides:

- Environment validation
- Structured logging
- Liveness endpoint
- Readiness endpoint
- Graceful shutdown
- Automated tests
- TypeScript compilation

Database, Redis, WebSocket, telephony and AI-provider integrations are added in later steps.

## Local Environment

Copy the example environment file:

```powershell
Copy-Item services\api\.env.example services\api\.env