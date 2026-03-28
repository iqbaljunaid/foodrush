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
    port: parseInt(optionalEnv("PORT", "3004"), 10),
    host: optionalEnv("HOST", "0.0.0.0"),
    logLevel: optionalEnv("LOG_LEVEL", "info"),

    redis: {
      host: requireEnv("REDIS_HOST"),
      port: parseInt(optionalEnv("REDIS_PORT", "6379"), 10),
      password: requireEnv("REDIS_PASSWORD"),
      tls: optionalEnv("REDIS_TLS", "true") === "true",
    },

    geofence: {
      defaultPickupRadiusMeters: parseInt(
        optionalEnv("DEFAULT_PICKUP_RADIUS_M", "100"),
        10,
      ),
      defaultDeliveryRadiusMeters: parseInt(
        optionalEnv("DEFAULT_DELIVERY_RADIUS_M", "50"),
        10,
      ),
    },
  } as const;
}

export type AppConfig = ReturnType<typeof loadConfig>;
