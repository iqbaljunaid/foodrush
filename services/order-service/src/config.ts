function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export function loadConfig() {
  return {
    port: parseInt(optionalEnv("PORT", "3001"), 10),
    host: optionalEnv("HOST", "0.0.0.0"),
    logLevel: optionalEnv("LOG_LEVEL", "info"),

    db: {
      host: requireEnv("MYSQL_HOST"),
      port: parseInt(optionalEnv("MYSQL_PORT", "3306"), 10),
      user: requireEnv("MYSQL_USER"),
      password: requireEnv("MYSQL_PASSWORD"),
      database: optionalEnv("MYSQL_DATABASE", "foodrush_orders"),
      connectionLimit: parseInt(optionalEnv("MYSQL_POOL_SIZE", "10"), 10),
    },

    kafka: {
      brokers: requireEnv("KAFKA_BROKERS").split(","),
      clientId: optionalEnv("KAFKA_CLIENT_ID", "order-service"),
      saslUsername: requireEnv("KAFKA_SASL_USERNAME"),
      saslPassword: requireEnv("KAFKA_SASL_PASSWORD"),
      ssl: optionalEnv("KAFKA_SSL", "true") === "true",
    },
  } as const;
}

export type AppConfig = ReturnType<typeof loadConfig>;
