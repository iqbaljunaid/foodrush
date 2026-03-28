import * as ons from 'oci-ons';
import * as common from 'oci-common';
import type { AppConfig } from '../config.js';
import type { PushPayload } from '../types/index.js';

let client: ons.NotificationDataPlaneClient | null = null;

export function initPushClient(config: AppConfig['oci']): void {
  const provider = new common.ConfigFileAuthenticationDetailsProvider(
    undefined,
    undefined,
  );
  client = new ons.NotificationDataPlaneClient({
    authenticationDetailsProvider: provider,
  });
  client.region = config.region;
}

function getClient(): ons.NotificationDataPlaneClient {
  if (!client) {
    throw new Error('Push notification client not initialized. Call initPushClient() first.');
  }
  return client;
}

export async function sendPushNotification(
  topicId: string,
  payload: PushPayload,
): Promise<{ messageId: string }> {
  const pushClient = getClient();

  const messageDetails: ons.models.MessageDetails = {
    title: payload.title,
    body: payload.body,
  };

  const response = await pushClient.publishMessage({
    topicId,
    messageDetails,
  });

  return { messageId: response.publishResult.messageId };
}
