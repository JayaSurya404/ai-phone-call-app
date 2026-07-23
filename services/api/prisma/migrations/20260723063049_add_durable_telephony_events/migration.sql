-- CreateEnum
CREATE TYPE "TelephonyEventType" AS ENUM ('RINGING', 'CONNECTED', 'TRANSCRIPT', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "telephony_events" (
    "id" UUID NOT NULL,
    "providerEventId" VARCHAR(191) NOT NULL,
    "sessionId" VARCHAR(191) NOT NULL,
    "callSessionId" UUID NOT NULL,
    "type" "TelephonyEventType" NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMPTZ(3),
    "processingError" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telephony_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telephony_events_providerEventId_key" ON "telephony_events"("providerEventId");

-- CreateIndex
CREATE INDEX "telephony_events_callSessionId_occurredAt_idx" ON "telephony_events"("callSessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "telephony_events_sessionId_occurredAt_idx" ON "telephony_events"("sessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "telephony_events_processedAt_idx" ON "telephony_events"("processedAt");

-- AddForeignKey
ALTER TABLE "telephony_events" ADD CONSTRAINT "telephony_events_callSessionId_fkey" FOREIGN KEY ("callSessionId") REFERENCES "call_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
