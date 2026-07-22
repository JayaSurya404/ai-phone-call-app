-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('DRAFT', 'QUEUED', 'STARTING', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TranscriptSpeaker" AS ENUM ('AI_AGENT', 'REMOTE_PARTY', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SentimentLabel" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "promptText" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_sessions" (
    "id" UUID NOT NULL,
    "destinationNumber" VARCHAR(32) NOT NULL,
    "promptSnapshot" TEXT NOT NULL,
    "promptTemplateId" UUID,
    "status" "CallStatus" NOT NULL DEFAULT 'DRAFT',
    "languageCode" VARCHAR(16) NOT NULL DEFAULT 'en-IN',
    "provider" VARCHAR(64),
    "providerCallId" VARCHAR(191),
    "startedAt" TIMESTAMPTZ(3),
    "endedAt" TIMESTAMPTZ(3),
    "summary" TEXT,
    "sentiment" "SentimentLabel" NOT NULL DEFAULT 'UNKNOWN',
    "failureReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "call_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcript_segments" (
    "id" UUID NOT NULL,
    "callSessionId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "speaker" "TranscriptSpeaker" NOT NULL,
    "content" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "sentiment" "SentimentLabel" NOT NULL DEFAULT 'UNKNOWN',
    "latencyMs" INTEGER,
    "startedAtMs" INTEGER,
    "endedAtMs" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcript_segments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prompt_templates_name_key" ON "prompt_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "call_sessions_providerCallId_key" ON "call_sessions"("providerCallId");

-- CreateIndex
CREATE INDEX "call_sessions_promptTemplateId_idx" ON "call_sessions"("promptTemplateId");

-- CreateIndex
CREATE INDEX "call_sessions_status_createdAt_idx" ON "call_sessions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "call_sessions_destinationNumber_createdAt_idx" ON "call_sessions"("destinationNumber", "createdAt");

-- CreateIndex
CREATE INDEX "transcript_segments_callSessionId_createdAt_idx" ON "transcript_segments"("callSessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_segments_callSessionId_sequence_key" ON "transcript_segments"("callSessionId", "sequence");

-- AddForeignKey
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "prompt_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_callSessionId_fkey" FOREIGN KEY ("callSessionId") REFERENCES "call_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
