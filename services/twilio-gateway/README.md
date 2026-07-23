# VoiceNexus Twilio Gateway

This service connects the VoiceNexus API to real Twilio outbound calls.

Flow:

1. VoiceNexus API sends `POST /v1/calls`.
2. Gateway creates a Twilio PSTN call.
3. Twilio ConversationRelay connects to `/twilio/conversation`.
4. Twilio performs live STT and TTS.
5. Gemini generates concise conversational replies.
6. Gateway signs transcript and status events and sends them to the VoiceNexus API.
7. The React Native Call Monitor receives those events through the existing realtime pipeline.

Secrets belong only in `services/twilio-gateway/.env`.