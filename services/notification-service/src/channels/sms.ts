import * as ons from 'oci-ons';
import * as common from 'oci-common';
import type { AppConfig } from '../config.js';
import type { SmsPayload } from '../types/index.js';

let client: ons.NotificationDataPlaneClient | null = null;

export function initSmsClient(config: AppConfig['oci']): void {
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
    throw new Error('SMS client not initialized. Call initSmsClient() first.');
  }
  return client;
}

export async function sendSms(
  topicId: string,
  payload: SmsPayload,
): Promise<{ messageId: string }> {
  const smsClient = getClient();

  const messageDetails: ons.models.MessageDetails = {
    body: `FoodRush: ${payload.message}`,
    title: 'FoodRush SMS',
  };

  const response = await smsClient.publishMessage({
    topicId,
    messageDetails,
  });

  return { messageId: response.publishResult.messageId };
}
