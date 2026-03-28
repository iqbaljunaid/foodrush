import type { FastifyInstance } from "fastify";
import { isConsumerConnected } from "../consumers/notification-consumer.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/healthz", async (_request, reply) => {
    return reply.status(200).send({ status: "ok" });
  });

  app.get("/readyz", async (_request, reply) => {
    const kafkaReady = isConsumerConnected();

    if (kafkaReady) {
      return reply.status(200).send({
        status: "ready",
        checks: { kafka: "up" },
      });
    }

    return reply.status(503).send({
      status: "not_ready",
      checks: { kafka: "down" },
    });
  });
}
