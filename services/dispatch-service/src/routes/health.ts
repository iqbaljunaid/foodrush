import type { FastifyInstance } from 'fastify';
import { isProducerConnected } from '../events/producer.js';
import { isRedisConnected } from '../ws/gps-handler.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/healthz', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });

  app.get('/readyz', async (_request, reply) => {
    const kafkaReady = isProducerConnected();
    const redisReady = isRedisConnected();

    if (kafkaReady && redisReady) {
      return reply.status(200).send({
        status: 'ready',
        checks: { kafka: 'up', redis: 'up' },
      });
    }

    return reply.status(503).send({
      status: 'not_ready',
      checks: {
        kafka: kafkaReady ? 'up' : 'down',
        redis: redisReady ? 'up' : 'down',
      },
    });
  });
}
