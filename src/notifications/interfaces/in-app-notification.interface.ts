import type { NotificationType, Prisma } from '@prisma/client';

/**
 * Payload used to create and push an in-app notification.
 */
export interface CreateInAppNotification {
  /** Target user ID */
  userId: string;

  /** Notification category */
  type: NotificationType;

  /** Short notification title */
  title: string;

  /** Notification body text */
  body: string;

  /** Optional arbitrary data payload (serialised as JSON) */
  data?: Prisma.InputJsonValue;
}
