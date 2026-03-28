import type { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { getNoSQLClient } from "../db/nosql-client.js";
import { loadConfig } from "../config.js";
import {
  uploadImage,
  deleteImage,
  validateImage,
} from "../storage/object-storage.js";
import type {
  CreateCatalogueInput,
  UpdateCatalogueInput,
  Catalogue,
} from "../types/index.js";

function rowToCatalogue(row: Record<string, unknown>): Catalogue {
  return {
    id: row["id"] as string,
    restaurantId: row["restaurant_id"] as string,
    name: row["name"] as string,
    description: row["description"] as string,
    category: row["category"] as string,
    imageUrl: (row["image_url"] as string) || null,
    isActive: row["is_active"] as boolean,
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
  };
}

export async function catalogueRoutes(app: FastifyInstance): Promise<void> {
  const config = loadConfig();
  const tableName = config.nosql.catalogueTable;

  // Create catalogue
  app.post<{ Body: CreateCatalogueInput }>(
    "/catalogues",
    async (request, reply) => {
      const { restaurantId, name, description, category } = request.body;

      if (!restaurantId || !name || !description || !category) {
        return reply
          .status(400)
          .send({
            error:
              "Missing required fields: restaurantId, name, description, category",
          });
      }

      const id = uuidv4();
      const now = new Date().toISOString();
      const client = getNoSQLClient();

      await client.put(tableName, {
        id,
        restaurant_id: restaurantId,
        name,
        description,
        category,
        image_url: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      });

      const catalogue: Catalogue = {
        id,
        restaurantId,
        name,
        description,
        category,
        imageUrl: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      return reply.status(201).send(catalogue);
    },
  );

  // Get catalogue by ID
  app.get<{ Params: { id: string } }>(
    "/catalogues/:id",
    async (request, reply) => {
      const client = getNoSQLClient();
      const result = await client.get(tableName, { id: request.params.id });

      if (!result.row) {
        return reply.status(404).send({ error: "Catalogue not found" });
      }

      return reply.send(rowToCatalogue(result.row as Record<string, unknown>));
    },
  );

  // List catalogues by restaurant
  app.get<{
    Querystring: { restaurantId: string; limit?: string; offset?: string };
  }>("/catalogues", async (request, reply) => {
    const { restaurantId, limit = "20", offset = "0" } = request.query;

    if (!restaurantId) {
      return reply
        .status(400)
        .send({ error: "restaurantId query parameter is required" });
    }

    const parsedLimit = Math.min(parseInt(limit, 10) || 20, 100);
    const parsedOffset = parseInt(offset, 10) || 0;

    const client = getNoSQLClient();
    const statement = `SELECT * FROM ${tableName} WHERE restaurant_id = $restaurantId ORDER BY created_at DESC LIMIT $limit OFFSET $offset`;

    const preparedStmt = await client.prepare(statement);
    preparedStmt.set("$restaurantId", restaurantId);
    preparedStmt.set("$limit", parsedLimit);
    preparedStmt.set("$offset", parsedOffset);
    const result = await client.query(preparedStmt);

    const catalogues = result.rows.map((row: Record<string, unknown>) =>
      rowToCatalogue(row),
    );

    return reply.send(catalogues);
  });

  // Update catalogue
  app.put<{ Params: { id: string }; Body: UpdateCatalogueInput }>(
    "/catalogues/:id",
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body;
      const client = getNoSQLClient();

      const existing = await client.get(tableName, { id });
      if (!existing.row) {
        return reply.status(404).send({ error: "Catalogue not found" });
      }

      const row = existing.row as Record<string, unknown>;
      const now = new Date().toISOString();

      const updatedRow = {
        ...row,
        name: updates.name ?? row["name"],
        description: updates.description ?? row["description"],
        category: updates.category ?? row["category"],
        is_active: updates.isActive ?? row["is_active"],
        updated_at: now,
      };

      await client.put(tableName, updatedRow);

      return reply.send(rowToCatalogue(updatedRow));
    },
  );

  // Delete catalogue
  app.delete<{ Params: { id: string } }>(
    "/catalogues/:id",
    async (request, reply) => {
      const { id } = request.params;
      const client = getNoSQLClient();

      const existing = await client.get(tableName, { id });
      if (!existing.row) {
        return reply.status(404).send({ error: "Catalogue not found" });
      }

      const row = existing.row as Record<string, unknown>;
      const imageUrl = row["image_url"] as string | null;

      if (imageUrl) {
        const objectName = imageUrl.split("/o/").pop();
        if (objectName) {
          await deleteImage(decodeURIComponent(objectName));
        }
      }

      await client.delete(tableName, { id });
      return reply.status(204).send();
    },
  );

  // Upload catalogue image
  app.post<{ Params: { id: string } }>(
    "/catalogues/:id/image",
    async (request, reply) => {
      const { id } = request.params;
      const client = getNoSQLClient();

      const existing = await client.get(tableName, { id });
      if (!existing.row) {
        return reply.status(404).send({ error: "Catalogue not found" });
      }

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const buffer = await data.toBuffer();
      const contentType = data.mimetype;

      const validation = validateImage(contentType, buffer.length);
      if (!validation.valid) {
        return reply.status(400).send({ error: validation.error });
      }

      const extension = contentType.split("/")[1] ?? "bin";
      const objectName = `catalogues/${id}/image.${extension}`;

      const uploadResult = await uploadImage(objectName, buffer, contentType);

      const row = existing.row as Record<string, unknown>;
      await client.put(tableName, {
        ...row,
        image_url: uploadResult.url,
        updated_at: new Date().toISOString(),
      });

      return reply.send(uploadResult);
    },
  );
}
