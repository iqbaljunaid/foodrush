import type { AppConfig } from '../config.js';
import type { EmailPayload } from '../types/index.js';

interface EmailConfig {
  senderAddress: string;
  senderName: string;
  smtpEndpoint: string;
}

let emailConfig: EmailConfig | null = null;

export function initEmailClient(config: AppConfig['email']): void {
  emailConfig = {
    senderAddress: config.senderAddress,
    senderName: config.senderName,
    smtpEndpoint: config.smtpEndpoint,
  };
}

function getConfig(): EmailConfig {
  if (!emailConfig) {
    throw new Error('Email client not initialized. Call initEmailClient() first.');
  }
  return emailConfig;
}

export async function sendEmail(
  payload: EmailPayload,
): Promise<{ messageId: string }> {
  const config = getConfig();

  const emailBody = {
    sender: {
      senderAddress: { email: config.senderAddress, name: config.senderName },
    },
    recipients: {
      to: [{ email: payload.to }],
    },
    subject: payload.subject,
    bodyHtml: payload.bodyHtml,
    bodyText: payload.bodyText,
  };

  // OCI Email Delivery via HTTPS endpoint
  const response = await fetch(`${config.smtpEndpoint}/20220926/emailSubmittedResponses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email delivery failed: ${response.status} ${errorText}`);
  }

  const result = await response.json() as { messageId: string };
  return { messageId: result.messageId };
}
