import { NoSQLClient, ServiceType } from "oracle-nosqldb";
import type { AppConfig } from "../config.js";

let client: NoSQLClient | null = null;

export function initNoSQLClient(config: AppConfig["nosql"]): void {
  const clientConfig = config.endpoint
    ? {
        serviceType: ServiceType.CLOUD,
        endpoint: config.endpoint,
        compartment: config.compartmentId,
      }
    : {
        serviceType: ServiceType.CLOUD,
        compartment: config.compartmentId,
      };

  client = new NoSQLClient(clientConfig);
}

export function getNoSQLClient(): NoSQLClient {
  if (!client) {
    throw new Error(
      "NoSQL client not initialized. Call initNoSQLClient first.",
    );
  }
  return client;
}

export async function checkNoSQLConnection(
  tableName: string,
): Promise<boolean> {
  try {
    const c = getNoSQLClient();
    await c.getTable(tableName);
    return true;
  } catch {
    return false;
  }
}

export async function closeNoSQLClient(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}
