# VoiceNexus Local Data Infrastructure

This folder contains the Docker Compose configuration for the local VoiceNexus development databases.

## Services

### PostgreSQL

PostgreSQL stores durable application data such as calls, transcript segments, personas, voice configurations, summaries and latency records.

Default local address:

```text
postgresql://voicenexus:<password>@127.0.0.1:5432/voicenexus