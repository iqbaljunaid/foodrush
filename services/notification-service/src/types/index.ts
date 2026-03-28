export const NotificationChannel = {
  PUSH: "push",
  SMS: "sms",
  EMAIL: "email",
} as const;

export type NotificationChannelType =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const NotificationStatus = {
  PENDING: "pending",
  SENT: "sent",
  FAILED: "failed",
} as const;

export type NotificationStatusType =
  (typeof NotificationStatus)[keyof typeof NotificationStatus];

export interface NotificationRequest {
  recipientId: string;
  channel: NotificationChannelType;
  subject?: string;
  body: string;
  metadata?: Record<string, string>;
}

export interface NotificationResult {
  id: string;
  recipientId: string;
  channel: NotificationChannelType;
  status: NotificationStatusType;
  sentAt: string | null;
  errorMessage: string | null;
}

export interface SendNotificationInput {
  recipientId: string;
  channel: NotificationChannelType;
  destination: string;
  subject?: string;
  body: string;
  metadata?: Record<string, string>;
}

export interface NotificationEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  payload: {
    recipientId: string;
    channel: NotificationChannelType;
    destination: string;
    subject?: string;
    body: string;
    orderId?: string;
    metadata?: Record<string, string>;
  };
}

export interface PushPayload {
  title: string;
  body: string;
  deviceToken: string;
  data?: Record<string, string>;
}

export interface SmsPayload {
  phoneNumber: string;
  message: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  from: string;
}
