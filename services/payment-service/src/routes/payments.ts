import type { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { getPool } from "../db/connection.js";
import {
  createPaymentIntent,
  capturePaymentIntent,
  createRefund,
} from "../stripe/client.js";
import { PaymentStatus } from "../types/index.js";
import type {
  CreatePaymentInput,
  CapturePaymentInput,
  RefundPaymentInput,
  Payment,
  PaymentRow,
  PaymentStatusType,
} from "../types/index.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

function rowToPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    orderId: row.order_id,
    customerId: row.customer_id,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status as Payment["status"],
    stripePaymentIntentId: row.stripe_payment_intent_id,
    idempotencyKey: row.idempotency_key,
    refundedAmount: Number(row.refunded_amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function paymentRoutes(app: FastifyInstance): Promise<void> {
  // Create a payment (authorize)
  app.post<{ Body: CreatePaymentInput }>(
    "/payments",
    async (request, reply) => {
      const {
        orderId,
        customerId,
        amount,
        currency,
        paymentMethodId,
        idempotencyKey,
      } = request.body;

      if (
        !orderId ||
        !customerId ||
        !amount ||
        !paymentMethodId ||
        !idempotencyKey
      ) {
        return reply.status(400).send({
          error:
            "orderId, customerId, amount, paymentMethodId, and idempotencyKey are required",
        });
      }

      if (amount <= 0) {
        return reply
          .status(400)
          .send({ error: "amount must be greater than zero" });
      }

      const pool = getPool();

      // Check for existing payment with same idempotency key
      const [existing] = await pool.execute<(PaymentRow & RowDataPacket)[]>(
        "SELECT * FROM payments WHERE idempotency_key = ?",
        [idempotencyKey],
      );

      if (existing[0]) {
        return reply.status(200).send(rowToPayment(existing[0]));
      }

      const id = uuidv4();
      const paymentCurrency = currency ?? "USD";

      let stripePaymentIntentId: string | null = null;
      let status: PaymentStatusType = PaymentStatus.PENDING;

      try {
        const paymentIntent = await createPaymentIntent(
          amount,
          paymentCurrency,
          paymentMethodId,
          idempotencyKey,
          { orderId, customerId, paymentId: id },
        );

        stripePaymentIntentId = paymentIntent.id;
        status = PaymentStatus.AUTHORIZED;
      } catch (err) {
        status = PaymentStatus.FAILED;
        app.log.error(
          `Stripe payment failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      await pool.execute<ResultSetHeader>(
        `INSERT INTO payments (id, order_id, customer_id, amount, currency, status, stripe_payment_intent_id, idempotency_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          orderId,
          customerId,
          amount,
          paymentCurrency,
          status,
          stripePaymentIntentId,
          idempotencyKey,
        ],
      );

      const [rows] = await pool.execute<(PaymentRow & RowDataPacket)[]>(
        "SELECT * FROM payments WHERE id = ?",
        [id],
      );

      const row = rows[0];
      if (!row) {
        return reply
          .status(500)
          .send({ error: "Failed to retrieve created payment" });
      }

      const payment = rowToPayment(row);

      if (status === PaymentStatus.FAILED) {
        return reply.status(402).send(payment);
      }

      return reply.status(201).send(payment);
    },
  );

  // Get payment by ID
  app.get<{ Params: { id: string } }>(
    "/payments/:id",
    async (request, reply) => {
      const pool = getPool();
      const [rows] = await pool.execute<(PaymentRow & RowDataPacket)[]>(
        "SELECT * FROM payments WHERE id = ?",
        [request.params.id],
      );

      const row = rows[0];
      if (!row) {
        return reply.status(404).send({ error: "Payment not found" });
      }

      return reply.send(rowToPayment(row));
    },
  );

  // Get payment by order ID
  app.get<{ Params: { orderId: string } }>(
    "/payments/order/:orderId",
    async (request, reply) => {
      const pool = getPool();
      const [rows] = await pool.execute<(PaymentRow & RowDataPacket)[]>(
        "SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC",
        [request.params.orderId],
      );

      return reply.send(rows.map(rowToPayment));
    },
  );

  // Capture an authorized payment
  app.post<{ Params: { id: string }; Body: CapturePaymentInput }>(
    "/payments/:id/capture",
    async (request, reply) => {
      const pool = getPool();
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const [rows] = await connection.execute<(PaymentRow & RowDataPacket)[]>(
          "SELECT * FROM payments WHERE id = ? FOR UPDATE",
          [request.params.id],
        );

        const row = rows[0];
        if (!row) {
          await connection.rollback();
          return reply.status(404).send({ error: "Payment not found" });
        }

        if (row.status !== PaymentStatus.AUTHORIZED) {
          await connection.rollback();
          return reply
            .status(409)
            .send({ error: `Cannot capture payment in status: ${row.status}` });
        }

        if (!row.stripe_payment_intent_id) {
          await connection.rollback();
          return reply
            .status(409)
            .send({ error: "No Stripe payment intent associated" });
        }

        const amountToCapture = request.body.amountToCapture;
        await capturePaymentIntent(
          row.stripe_payment_intent_id,
          amountToCapture,
        );

        await connection.execute<ResultSetHeader>(
          "UPDATE payments SET status = ? WHERE id = ?",
          [PaymentStatus.CAPTURED, request.params.id],
        );

        await connection.commit();

        const [updated] = await pool.execute<(PaymentRow & RowDataPacket)[]>(
          "SELECT * FROM payments WHERE id = ?",
          [request.params.id],
        );

        const updatedRow = updated[0];
        if (!updatedRow) {
          return reply
            .status(500)
            .send({ error: "Failed to retrieve updated payment" });
        }

        return reply.send(rowToPayment(updatedRow));
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    },
  );

  // Refund a payment (full or partial)
  app.post<{ Params: { id: string }; Body: RefundPaymentInput }>(
    "/payments/:id/refund",
    async (request, reply) => {
      const pool = getPool();
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const [rows] = await connection.execute<(PaymentRow & RowDataPacket)[]>(
          "SELECT * FROM payments WHERE id = ? FOR UPDATE",
          [request.params.id],
        );

        const row = rows[0];
        if (!row) {
          await connection.rollback();
          return reply.status(404).send({ error: "Payment not found" });
        }

        if (
          row.status !== PaymentStatus.CAPTURED &&
          row.status !== PaymentStatus.PARTIALLY_REFUNDED
        ) {
          await connection.rollback();
          return reply
            .status(409)
            .send({ error: `Cannot refund payment in status: ${row.status}` });
        }

        if (!row.stripe_payment_intent_id) {
          await connection.rollback();
          return reply
            .status(409)
            .send({ error: "No Stripe payment intent associated" });
        }

        const refundAmount =
          request.body.amount ??
          Number(row.amount) - Number(row.refunded_amount);
        const maxRefundable = Number(row.amount) - Number(row.refunded_amount);

        if (refundAmount <= 0 || refundAmount > maxRefundable) {
          await connection.rollback();
          return reply.status(400).send({
            error: `Invalid refund amount. Max refundable: ${maxRefundable}`,
          });
        }

        await createRefund(
          row.stripe_payment_intent_id,
          refundAmount,
          request.body.reason,
        );

        const newRefundedAmount = Number(row.refunded_amount) + refundAmount;
        const isFullRefund = newRefundedAmount >= Number(row.amount);
        const newStatus = isFullRefund
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED;

        await connection.execute<ResultSetHeader>(
          "UPDATE payments SET status = ?, refunded_amount = ? WHERE id = ?",
          [newStatus, newRefundedAmount, request.params.id],
        );

        await connection.commit();

        const [updated] = await pool.execute<(PaymentRow & RowDataPacket)[]>(
          "SELECT * FROM payments WHERE id = ?",
          [request.params.id],
        );

        const updatedRow = updated[0];
        if (!updatedRow) {
          return reply
            .status(500)
            .send({ error: "Failed to retrieve updated payment" });
        }

        return reply.send(rowToPayment(updatedRow));
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    },
  );
}
