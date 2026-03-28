import type { FastifyInstance } from 'fastify';
import { checkConnection } from '../db/connection.js';
import { isProducerConnected } from '../events/producer.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/healthz', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });

  app.get('/readyz', async (_request, reply) => {
    const dbReady = await checkConnection();
    const kafkaReady = isProducerConnected();

    if (dbReady && kafkaReady) {
      return reply.status(200).send({
        status: 'ready',
        checks: { database: 'up', kafka: 'up' },
      });
    }

    return reply.status(503).send({
      status: 'not_ready',
      checks: {
        database: dbReady ? 'up' : 'down',
        kafka: kafkaReady ? 'up' : 'down',
      },
    });
  });
}
