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
  CreateMenuItemInput,
  UpdateMenuItemInput,
  MenuItem,
} from "../types/index.js";

function rowToMenuItem(row: Record<string, unknown>): MenuItem {
  return {
    id: row["id"] as string,
    catalogueId: row["catalogue_id"] as string,
    restaurantId: row["restaurant_id"] as string,
    name: row["name"] as string,
    description: row["description"] as string,
    price: row["price"] as number,
    currency: row["currency"] as string,
    category: row["category"] as string,
    dietaryTags: (row["dietary_tags"] as string[]) ?? [],
    isAvailable: row["is_available"] as boolean,
    preparationTimeMinutes: row["preparation_time_minutes"] as number,
    imageUrl: (row["image_url"] as string) || null,
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
  };
}

export async function menuRoutes(app: FastifyInstance): Promise<void> {
  const config = loadConfig();
  const tableName = config.nosql.menusTable;

  // Create menu item
  app.post<{ Body: CreateMenuItemInput }>("/menus", async (request, reply) => {
    const {
      catalogueId,
      restaurantId,
      name,
      description,
      price,
      currency,
      category,
      dietaryTags,
      preparationTimeMinutes,
    } = request.body;

    if (
      !catalogueId ||
      !restaurantId ||
      !name ||
      !description ||
      price == null ||
      !currency ||
      !category
    ) {
      return reply.status(400).send({ error: "Missing required fields" });
    }

    if (price < 0) {
      return reply.status(400).send({ error: "Price must be non-negative" });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const client = getNoSQLClient();

    await client.put(tableName, {
      id,
      catalogue_id: catalogueId,
      restaurant_id: restaurantId,
      name,
      description,
      price,
      currency,
      category,
      dietary_tags: dietaryTags ?? [],
      is_available: true,
      preparation_time_minutes: preparationTimeMinutes,
      image_url: null,
      created_at: now,
      updated_at: now,
    });

    const menuItem: MenuItem = {
      id,
      catalogueId,
      restaurantId,
      name,
      description,
      price,
      currency,
      category,
      dietaryTags: dietaryTags ?? [],
      isAvailable: true,
      preparationTimeMinutes: preparationTimeMinutes,
      imageUrl: null,
      createdAt: now,
      updatedAt: now,
    };

    return reply.status(201).send(menuItem);
  });

  // Get menu item by ID
  app.get<{ Params: { id: string } }>("/menus/:id", async (request, reply) => {
    const client = getNoSQLClient();
    const result = await client.get(tableName, { id: request.params.id });

    if (!result.row) {
      return reply.status(404).send({ error: "Menu item not found" });
    }

    return reply.send(rowToMenuItem(result.row as Record<string, unknown>));
  });

  // List menu items by catalogue or restaurant
  app.get<{
    Querystring: {
      catalogueId?: string;
      restaurantId?: string;
      category?: string;
      available?: string;
      limit?: string;
      offset?: string;
    };
  }>("/menus", async (request, reply) => {
    const {
      catalogueId,
      restaurantId,
      category,
      available,
      limit = "50",
      offset = "0",
    } = request.query;

    if (!catalogueId && !restaurantId) {
      return reply.status(400).send({
        error: "catalogueId or restaurantId query parameter is required",
      });
    }

    const parsedLimit = Math.min(parseInt(limit, 10) || 50, 200);
    const parsedOffset = parseInt(offset, 10) || 0;

    const conditions: string[] = [];
    const variables: Record<string, string | number | boolean> = {
      $limit: parsedLimit,
      $offset: parsedOffset,
    };

    if (catalogueId) {
      conditions.push("catalogue_id = $catalogueId");
      variables["$catalogueId"] = catalogueId;
    }

    if (restaurantId) {
      conditions.push("restaurant_id = $restaurantId");
      variables["$restaurantId"] = restaurantId;
    }

    if (category) {
      conditions.push("category = $category");
      variables["$category"] = category;
    }

    if (available !== undefined) {
      conditions.push("is_available = $isAvailable");
      variables["$isAvailable"] = available === "true";
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const statement = `SELECT * FROM ${tableName} ${whereClause} ORDER BY name ASC LIMIT $limit OFFSET $offset`;

    const client = getNoSQLClient();
    const preparedStmt = await client.prepare(statement);
    for (const [key, value] of Object.entries(variables)) {
      preparedStmt.set(key, value);
    }
    const result = await client.query(preparedStmt);

    const items = result.rows.map((row: Record<string, unknown>) =>
      rowToMenuItem(row),
    );

    return reply.send(items);
  });

  // Update menu item
  app.put<{ Params: { id: string }; Body: UpdateMenuItemInput }>(
    "/menus/:id",
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body;
      const client = getNoSQLClient();

      const existing = await client.get(tableName, { id });
      if (!existing.row) {
        return reply.status(404).send({ error: "Menu item not found" });
      }

      if (updates.price !== undefined && updates.price < 0) {
        return reply.status(400).send({ error: "Price must be non-negative" });
      }

      const row = existing.row as Record<string, unknown>;
      const now = new Date().toISOString();

      const updatedRow = {
        ...row,
        name: updates.name ?? row["name"],
        description: updates.description ?? row["description"],
        price: updates.price ?? row["price"],
        currency: updates.currency ?? row["currency"],
        category: updates.category ?? row["category"],
        dietary_tags: updates.dietaryTags ?? row["dietary_tags"],
        is_available: updates.isAvailable ?? row["is_available"],
        preparation_time_minutes:
          updates.preparationTimeMinutes ?? row["preparation_time_minutes"],
        updated_at: now,
      };

      await client.put(tableName, updatedRow);

      return reply.send(rowToMenuItem(updatedRow));
    },
  );

  // Delete menu item
  app.delete<{ Params: { id: string } }>(
    "/menus/:id",
    async (request, reply) => {
      const { id } = request.params;
      const client = getNoSQLClient();

      const existing = await client.get(tableName, { id });
      if (!existing.row) {
        return reply.status(404).send({ error: "Menu item not found" });
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

  // Upload menu item image
  app.post<{ Params: { id: string } }>(
    "/menus/:id/image",
    async (request, reply) => {
      const { id } = request.params;
      const client = getNoSQLClient();

      const existing = await client.get(tableName, { id });
      if (!existing.row) {
        return reply.status(404).send({ error: "Menu item not found" });
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
      const objectName = `menus/${id}/image.${extension}`;

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
