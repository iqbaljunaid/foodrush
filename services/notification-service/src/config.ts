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
    port: parseInt(optionalEnv('PORT', '3005'), 10),
    host: optionalEnv('HOST', '0.0.0.0'),
    logLevel: optionalEnv('LOG_LEVEL', 'info'),

    kafka: {
      brokers: requireEnv('KAFKA_BROKERS').split(','),
      clientId: optionalEnv('KAFKA_CLIENT_ID', 'notification-service'),
      groupId: optionalEnv('KAFKA_GROUP_ID', 'notification-service-group'),
      saslUsername: requireEnv('KAFKA_SASL_USERNAME'),
      saslPassword: requireEnv('KAFKA_SASL_PASSWORD'),
      ssl: optionalEnv('KAFKA_SSL', 'true') === 'true',
    },

    oci: {
      topicId: requireEnv('OCI_ONS_TOPIC_ID'),
      region: requireEnv('OCI_REGION'),
      tenancyId: requireEnv('OCI_TENANCY_ID'),
      userId: requireEnv('OCI_USER_ID'),
      fingerprint: requireEnv('OCI_FINGERPRINT'),
      privateKeyPath: requireEnv('OCI_PRIVATE_KEY_PATH'),
    },

    email: {
      senderAddress: requireEnv('EMAIL_SENDER_ADDRESS'),
      senderName: optionalEnv('EMAIL_SENDER_NAME', 'FoodRush'),
      smtpEndpoint: requireEnv('OCI_EMAIL_SMTP_ENDPOINT'),
    },
  } as const;
}

export type AppConfig = ReturnType<typeof loadConfig>;
