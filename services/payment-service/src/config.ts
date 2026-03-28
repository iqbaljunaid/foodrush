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
    port: parseInt(optionalEnv('PORT', '3006'), 10),
    host: optionalEnv('HOST', '0.0.0.0'),
    logLevel: optionalEnv('LOG_LEVEL', 'info'),

    db: {
      host: requireEnv('MYSQL_HOST'),
      port: parseInt(optionalEnv('MYSQL_PORT', '3306'), 10),
      user: requireEnv('MYSQL_USER'),
      password: requireEnv('MYSQL_PASSWORD'),
      database: optionalEnv('MYSQL_DATABASE', 'foodrush_payments'),
      connectionLimit: parseInt(optionalEnv('MYSQL_POOL_SIZE', '10'), 10),
    },

    stripe: {
      secretKey: requireEnv('STRIPE_SECRET_KEY'),
      webhookSecret: requireEnv('STRIPE_WEBHOOK_SECRET'),
      apiVersion: optionalEnv('STRIPE_API_VERSION', '2024-12-18.acacia'),
    },
  } as const;
}

export type AppConfig = ReturnType<typeof loadConfig>;
