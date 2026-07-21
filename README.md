# VoiceNexus Mobile AI Phone Agent

VoiceNexus Mobile AI Phone Agent is a mobile-controlled, multilingual, real-time AI phone-agent research platform.

The primary goal is to study and improve realistic AI telephone conversations, including low latency, interruption handling, turn detection, multilingual speech, code-switching, prosody, pronunciation, contextual memory and natural response timing.

## Product Scope

The mobile application will contain only two major screens:

1. Owner Screen
2. Call Monitor Screen

The initial product will not include:

- CRM functionality
- Billing
- Organization management
- Analytics dashboards
- Public user registration
- Unnecessary administration features

## High-Level Architecture

The mobile application acts as the control and monitoring client.

The backend owns:

- Telephone call lifecycle
- Realtime media processing
- Streaming speech-to-text
- Streaming language-model generation
- Streaming text-to-speech
- Conversation state
- Interruption handling
- Call metrics and summaries

## Technology Stack

### Mobile

- React Native
- Expo
- TypeScript
- Expo Router
- TanStack Query
- Zustand

### Backend

- Fastify
- TypeScript
- PostgreSQL
- Prisma
- Redis
- WebSocket

### AI Inference

- Python 3.12
- Interchangeable STT providers
- Interchangeable LLM providers
- Interchangeable TTS providers

### Infrastructure

- Docker
- Docker Compose
- npm workspaces
- GitHub

## Repository Structure

```text
apps/       User-facing applications
services/   Backend, voice and inference services
packages/   Shared contracts and configuration
infra/      Docker and deployment infrastructure
docs/       Architecture, research and operating documentation