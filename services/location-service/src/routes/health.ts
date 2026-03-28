import type { FastifyInstance } from "fastify";
import { isRedisConnected } from "../geo/redis-geo.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/healthz", async (_request, reply) => {
    return reply.status(200).send({ status: "ok" });
  });

  app.get("/readyz", async (_request, reply) => {
    const redisReady = isRedisConnected();

    if (redisReady) {
      return reply.status(200).send({
        status: "ready",
        checks: { redis: "up" },
      });
    }

    return reply.status(503).send({
      status: "not_ready",
      checks: { redis: "down" },
    });
  });
}
