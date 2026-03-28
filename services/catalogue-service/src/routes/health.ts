import type { FastifyInstance } from "fastify";
import { checkNoSQLConnection } from "../db/nosql-client.js";
import { loadConfig } from "../config.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/healthz", async (_request, reply) => {
    return reply.status(200).send({ status: "ok" });
  });

  app.get("/readyz", async (_request, reply) => {
    const config = loadConfig();
    const nosqlReady = await checkNoSQLConnection(config.nosql.catalogueTable);

    if (nosqlReady) {
      return reply.status(200).send({
        status: "ready",
        checks: { nosql: "up" },
      });
    }

    return reply.status(503).send({
      status: "not_ready",
      checks: { nosql: "down" },
    });
  });
}
