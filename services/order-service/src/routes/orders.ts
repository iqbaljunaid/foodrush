import type { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { getPool } from "../db/connection.js";
import { rowToOrder, calculateTotal } from "../models/order.js";
import {
  validateTransition,
  InvalidTransitionError,
} from "../fsm/order-fsm.js";
import { publishOrderEvent } from "../events/producer.js";
import {
  TOPICS,
  buildOrderPlacedEvent,
  buildOrderStatusChangedEvent,
} from "../events/schemas.js";
import { OrderStatus } from "../types/index.js";
import type {
  CreateOrderInput,
  OrderRow,
  OrderStatusType,
} from "../types/index.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  // Create order
  app.post<{ Body: CreateOrderInput }>("/orders", async (request, reply) => {
    const { customerId, restaurantId, items, deliveryAddress, notes } =
      request.body;

    if (!customerId || !restaurantId || !items?.length || !deliveryAddress) {
      return reply.status(400).send({ error: "Missing required fields" });
    }

    const id = uuidv4();
    const totalAmount = calculateTotal(items);
    const pool = getPool();

    await pool.execute<ResultSetHeader>(
      `INSERT INTO orders (id, customer_id, restaurant_id, items, status, total_amount, delivery_address, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        customerId,
        restaurantId,
        JSON.stringify(items),
        OrderStatus.PLACED,
        totalAmount,
        deliveryAddress,
        notes ?? null,
      ],
    );

    const [rows] = await pool.execute<(OrderRow & RowDataPacket)[]>(
      "SELECT * FROM orders WHERE id = ?",
      [id],
    );

    const row = rows[0];
    if (!row) {
      return reply
        .status(500)
        .send({ error: "Failed to retrieve created order" });
    }

    const order = rowToOrder(row);

    await publishOrderEvent(TOPICS.ORDER_PLACED, buildOrderPlacedEvent(order));

    return reply.status(201).send(order);
  });

  // Get order by ID
  app.get<{ Params: { id: string } }>("/orders/:id", async (request, reply) => {
    const pool = getPool();
    const [rows] = await pool.execute<(OrderRow & RowDataPacket)[]>(
      "SELECT * FROM orders WHERE id = ?",
      [request.params.id],
    );

    const row = rows[0];
    if (!row) {
      return reply.status(404).send({ error: "Order not found" });
    }

    return reply.send(rowToOrder(row));
  });

  // List orders by customer
  app.get<{
    Querystring: { customerId: string; limit?: string; offset?: string };
  }>("/orders", async (request, reply) => {
    const { customerId, limit = "20", offset = "0" } = request.query;

    if (!customerId) {
      return reply
        .status(400)
        .send({ error: "customerId query parameter is required" });
    }

    const parsedLimit = Math.min(parseInt(limit, 10) || 20, 100);
    const parsedOffset = parseInt(offset, 10) || 0;

    const pool = getPool();
    const [rows] = await pool.execute<(OrderRow & RowDataPacket)[]>(
      "SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [customerId, parsedLimit, parsedOffset],
    );

    return reply.send(rows.map(rowToOrder));
  });

  // Transition order status
  app.patch<{
    Params: { id: string };
    Body: { status: OrderStatusType; actorId: string; reason?: string };
  }>("/orders/:id/status", async (request, reply) => {
    const { id } = request.params;
    const { status: toStatus, actorId, reason } = request.body;

    if (!toStatus || !actorId) {
      return reply
        .status(400)
        .send({ error: "status and actorId are required" });
    }

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.execute<(OrderRow & RowDataPacket)[]>(
        "SELECT * FROM orders WHERE id = ? FOR UPDATE",
        [id],
      );

      const row = rows[0];
      if (!row) {
        await connection.rollback();
        return reply.status(404).send({ error: "Order not found" });
      }

      const currentStatus = row.status as OrderStatusType;

      try {
        validateTransition(currentStatus, toStatus);
      } catch (err) {
        await connection.rollback();
        if (err instanceof InvalidTransitionError) {
          return reply.status(409).send({ error: err.message });
        }
        throw err;
      }

      await connection.execute<ResultSetHeader>(
        "UPDATE orders SET status = ? WHERE id = ?",
        [toStatus, id],
      );

      await connection.commit();

      const [updatedRows] = await pool.execute<(OrderRow & RowDataPacket)[]>(
        "SELECT * FROM orders WHERE id = ?",
        [id],
      );

      const updatedRow = updatedRows[0];
      if (!updatedRow) {
        return reply
          .status(500)
          .send({ error: "Failed to retrieve updated order" });
      }

      const updatedOrder = rowToOrder(updatedRow);

      await publishOrderEvent(
        TOPICS.ORDER_STATUS_CHANGED,
        buildOrderStatusChangedEvent(
          updatedOrder,
          currentStatus,
          actorId,
          reason,
        ),
      );

      return reply.send(updatedOrder);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  });
}
