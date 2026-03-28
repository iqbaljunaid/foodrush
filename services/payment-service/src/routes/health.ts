import type { FastifyInstance } from 'fastify';
import { checkConnection } from '../db/connection.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/healthz', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });

  app.get('/readyz', async (_request, reply) => {
    const dbReady = await checkConnection();

    if (dbReady) {
      return reply.status(200).send({
        status: 'ready',
        checks: { database: 'up' },
      });
    }

    return reply.status(503).send({
      status: 'not_ready',
      checks: { database: 'down' },
    });
  });
}
