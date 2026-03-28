CREATE TABLE IF NOT EXISTS orders (
  id            VARCHAR(36)    NOT NULL PRIMARY KEY,
  customer_id   VARCHAR(36)    NOT NULL,
  restaurant_id VARCHAR(36)    NOT NULL,
  items         JSON           NOT NULL,
  status        ENUM('placed','accepted','preparing','ready','picked_up','delivered','cancelled') NOT NULL DEFAULT 'placed',
  total_amount  DECIMAL(10, 2) NOT NULL,
  delivery_address TEXT        NOT NULL,
  notes         TEXT           NULL,
  courier_id    VARCHAR(36)    NULL,
  created_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_orders_customer  (customer_id),
  INDEX idx_orders_restaurant (restaurant_id),
  INDEX idx_orders_status    (status),
  INDEX idx_orders_courier   (courier_id),
  INDEX idx_orders_created   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
