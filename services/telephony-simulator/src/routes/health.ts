import type {
  FastifyPluginAsync,
} from 'fastify';

export const healthRoutes:
FastifyPluginAsync = async (app) => {
  app.get(
    '/health/live',
    async () => ({
      status: 'alive',
      service:
        'voicenexus-telephony-simulator',
      timestamp:
        new Date().toISOString(),
    })
  );

  app.get(
    '/health/ready',
    async () => ({
      status: 'ready',
      service:
        'voicenexus-telephony-simulator',
      timestamp:
        new Date().toISOString(),
    })
  );
};