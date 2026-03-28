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
    port: parseInt(optionalEnv('PORT', '3002'), 10),
    host: optionalEnv('HOST', '0.0.0.0'),
    logLevel: optionalEnv('LOG_LEVEL', 'info'),

    nosql: {
      compartmentId: requireEnv('OCI_COMPARTMENT_ID'),
      catalogueTable: optionalEnv('NOSQL_CATALOGUE_TABLE', 'foodrush_prod_catalogue'),
      menusTable: optionalEnv('NOSQL_MENUS_TABLE', 'foodrush_prod_menus'),
      endpoint: optionalEnv('OCI_NOSQL_ENDPOINT', ''),
    },

    objectStorage: {
      namespace: requireEnv('OCI_OS_NAMESPACE'),
      bucketName: requireEnv('OCI_OS_BUCKET_NAME'),
      region: requireEnv('OCI_REGION'),
      maxFileSizeBytes: parseInt(optionalEnv('MAX_FILE_SIZE_BYTES', '5242880'), 10),
      allowedMimeTypes: optionalEnv(
        'ALLOWED_MIME_TYPES',
        'image/jpeg,image/png,image/webp',
      ).split(','),
    },
  } as const;
}

export type AppConfig = ReturnType<typeof loadConfig>;
