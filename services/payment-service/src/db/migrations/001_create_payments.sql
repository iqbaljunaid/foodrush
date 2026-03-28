CREATE TABLE IF NOT EXISTS payments (
  id                       VARCHAR(36)    NOT NULL PRIMARY KEY,
  order_id                 VARCHAR(36)    NOT NULL,
  customer_id              VARCHAR(36)    NOT NULL,
  amount                   DECIMAL(10, 2) NOT NULL,
  currency                 VARCHAR(3)     NOT NULL DEFAULT 'USD',
  status                   ENUM('pending','authorized','captured','failed','refunded','partially_refunded') NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id VARCHAR(255)   NULL,
  idempotency_key          VARCHAR(255)   NOT NULL,
  refunded_amount          DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at               TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE INDEX idx_payments_idempotency (idempotency_key),
  INDEX idx_payments_order     (order_id),
  INDEX idx_payments_customer  (customer_id),
  INDEX idx_payments_status    (status),
  INDEX idx_payments_stripe_pi (stripe_payment_intent_id),
  INDEX idx_payments_created   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
