import os from "oci-objectstorage";
import { ConfigFileAuthenticationDetailsProvider, Region } from "oci-common";
import type { AppConfig } from "../config.js";
import type { ImageUploadResult } from "../types/index.js";

let objectStorageClient: os.ObjectStorageClient | null = null;
let storageConfig: AppConfig["objectStorage"] | null = null;

export function initObjectStorage(config: AppConfig["objectStorage"]): void {
  storageConfig = config;
  const provider = new ConfigFileAuthenticationDetailsProvider();
  objectStorageClient = new os.ObjectStorageClient({
    authenticationDetailsProvider: provider,
  });
  objectStorageClient.region = config.region as unknown as Region;
}

function getClient(): os.ObjectStorageClient {
  if (!objectStorageClient) {
    throw new Error(
      "Object storage client not initialized. Call initObjectStorage first.",
    );
  }
  return objectStorageClient;
}

function getConfig(): AppConfig["objectStorage"] {
  if (!storageConfig) {
    throw new Error("Object storage config not initialized.");
  }
  return storageConfig;
}

export function validateImage(
  contentType: string,
  size: number,
): { valid: boolean; error?: string } {
  const config = getConfig();

  if (!config.allowedMimeTypes.includes(contentType)) {
    return {
      valid: false,
      error: `Invalid content type: ${contentType}. Allowed: ${config.allowedMimeTypes.join(", ")}`,
    };
  }

  if (size > config.maxFileSizeBytes) {
    return {
      valid: false,
      error: `File size ${size} exceeds max allowed ${config.maxFileSizeBytes} bytes`,
    };
  }

  return { valid: true };
}

export async function uploadImage(
  objectName: string,
  body: Buffer,
  contentType: string,
): Promise<ImageUploadResult> {
  const client = getClient();
  const config = getConfig();

  await client.putObject({
    namespaceName: config.namespace,
    bucketName: config.bucketName,
    objectName,
    contentType,
    contentLength: body.length,
    putObjectBody: body,
  });

  const url = `https://objectstorage.${config.region}.oraclecloud.com/n/${config.namespace}/b/${config.bucketName}/o/${encodeURIComponent(objectName)}`;

  return {
    objectName,
    url,
    contentType,
    size: body.length,
  };
}

export async function deleteImage(objectName: string): Promise<void> {
  const client = getClient();
  const config = getConfig();

  await client.deleteObject({
    namespaceName: config.namespace,
    bucketName: config.bucketName,
    objectName,
  });
}
