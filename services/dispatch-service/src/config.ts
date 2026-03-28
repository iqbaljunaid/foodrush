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
    port: parseInt(optionalEnv('PORT', '3003'), 10),
    host: optionalEnv('HOST', '0.0.0.0'),
    logLevel: optionalEnv('LOG_LEVEL', 'info'),

    redis: {
      host: requireEnv('REDIS_HOST'),
      port: parseInt(optionalEnv('REDIS_PORT', '6379'), 10),
      password: requireEnv('REDIS_PASSWORD'),
      tls: optionalEnv('REDIS_TLS', 'true') === 'true',
    },

    kafka: {
      brokers: requireEnv('KAFKA_BROKERS').split(','),
      clientId: optionalEnv('KAFKA_CLIENT_ID', 'dispatch-service'),
      saslUsername: requireEnv('KAFKA_SASL_USERNAME'),
      saslPassword: requireEnv('KAFKA_SASL_PASSWORD'),
      ssl: optionalEnv('KAFKA_SSL', 'true') === 'true',
    },

    dispatch: {
      defaultRadiusKm: parseFloat(optionalEnv('DEFAULT_RADIUS_KM', '5')),
      maxRadiusKm: parseFloat(optionalEnv('MAX_RADIUS_KM', '15')),
      maxCourierCandidates: parseInt(optionalEnv('MAX_COURIER_CANDIDATES', '10'), 10),
    },
  } as const;
}

export type AppConfig = ReturnType<typeof loadConfig>;
