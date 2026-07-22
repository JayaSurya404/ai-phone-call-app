import 'dotenv/config';

import assert from 'node:assert/strict';

import {
  CallStatus,
  SentimentLabel,
  TranscriptSpeaker,
} from '../src/generated/prisma/client.ts';

import { loadEnvironment } from '../src/config/environment.js';
import { createPrismaClient } from '../src/infrastructure/prisma.js';

const environment = loadEnvironment();

const prisma = createPrismaClient({
  databaseUrl: environment.databaseUrl,
  timeoutMs:
    environment.dependencyTimeoutMs,
});

try {
  const result =
    await prisma.$transaction(
      async (transaction) => {
        const prompt =
          await transaction.promptTemplate.create({
            data: {
              name:
                `Database smoke ${Date.now()}`,
              description:
                'Temporary verification record',
              promptText:
                'Politely confirm the test call.',
            },
          });

        const call =
          await transaction.callSession.create({
            data: {
              destinationNumber:
                '+910000000000',

              promptSnapshot:
                prompt.promptText,

              promptTemplateId:
                prompt.id,

              status:
                CallStatus.COMPLETED,

              summary:
                'Database smoke test completed.',

              sentiment:
                SentimentLabel.NEUTRAL,

              transcriptSegments: {
                create: {
                  sequence: 1,

                  speaker:
                    TranscriptSpeaker.AI_AGENT,

                  content:
                    'This is a temporary database test.',

                  confidence: 0.99,
                  latencyMs: 120,
                  startedAtMs: 0,
                  endedAtMs: 1200,
                },
              },
            },

            include: {
              transcriptSegments: true,
            },
          });

        assert.equal(
          call.transcriptSegments.length,
          1
        );

        assert.equal(
          call.status,
          CallStatus.COMPLETED
        );

        await transaction.callSession.delete({
          where: {
            id: call.id,
          },
        });

        await transaction.promptTemplate.delete({
          where: {
            id: prompt.id,
          },
        });

        return {
          callId: call.id,
          transcriptSegments:
            call.transcriptSegments.length,
        };
      }
    );

  console.log(
    'Database smoke test passed:',
    result
  );
} finally {
  await prisma.$disconnect();
}