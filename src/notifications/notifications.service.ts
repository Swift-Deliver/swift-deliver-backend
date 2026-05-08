import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsGateway } from './notifications.gateway.js';
import type { EmailOptions } from './interfaces/email-options.interface.js';
import type { CreateInAppNotification } from './interfaces/in-app-notification.interface.js';
import type { Notification, Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly resend: Resend;
  private readonly logger = new Logger(NotificationsService.name);
  private readonly defaultFrom: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY is not set — emails will not be delivered',
      );
    }
    this.resend = new Resend(apiKey);
    this.defaultFrom =
      process.env.RESEND_FROM_EMAIL || 'Swift Deliver <onboarding@resend.dev>';
  }

  // ══════════════════════════════════════════════════════════════════════
  // EMAIL (Resend)
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Send a single email via Resend.
   *
   * @returns The Resend message ID on success, or `null` on failure.
   */
  async sendEmail(options: EmailOptions): Promise<string | null> {
    const { to, subject, html, text, from, replyTo, cc, bcc, tags } = options;

    try {
      const { data, error } = await this.resend.emails.send({
        from: from ?? this.defaultFrom,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(text && { text }),
        ...(replyTo && { replyTo }),
        ...(cc && { cc: Array.isArray(cc) ? cc : [cc] }),
        ...(bcc && { bcc: Array.isArray(bcc) ? bcc : [bcc] }),
        ...(tags && { tags }),
      });

      if (error) {
        this.logger.error(
          `Failed to send email to ${to}: ${error.message}`,
          error,
        );
        return null;
      }

      this.logger.log(`Email sent successfully [id=${data?.id}] to ${to}`);
      return data?.id ?? null;
    } catch (err) {
      this.logger.error(`Unexpected error sending email to ${to}`, err);
      return null;
    }
  }

  /**
   * Send multiple emails in a single batch request (up to 100).
   *
   * @returns Array of Resend message IDs on success, or `null` on failure.
   */
  async sendBatchEmails(
    emailsList: EmailOptions[],
  ): Promise<string[] | null> {
    try {
      const payload = emailsList.map((opts) => ({
        from: opts.from ?? this.defaultFrom,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
        ...(opts.text && { text: opts.text }),
        ...(opts.replyTo && { replyTo: opts.replyTo }),
        ...(opts.cc && { cc: Array.isArray(opts.cc) ? opts.cc : [opts.cc] }),
        ...(opts.bcc && {
          bcc: Array.isArray(opts.bcc) ? opts.bcc : [opts.bcc],
        }),
        ...(opts.tags && { tags: opts.tags }),
      }));

      const { data, error } = await this.resend.batch.send(payload);

      if (error) {
        this.logger.error(`Batch email send failed: ${error.message}`, error);
        return null;
      }

      const ids = data?.data?.map((d) => d.id) ?? [];
      this.logger.log(`Batch email sent successfully — ${ids.length} emails`);
      return ids;
    } catch (err) {
      this.logger.error('Unexpected error sending batch emails', err);
      return null;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // IN-APP NOTIFICATIONS (Prisma + WebSocket)
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Create a persistent notification and push it to the user in real time.
   */
  async pushNotification(
    input: CreateInAppNotification,
  ): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        ...(input.data !== undefined && { data: input.data as Prisma.InputJsonValue }),
      },
    });

    // Push via WebSocket (fire-and-forget, never throws)
    try {
      this.gateway.sendToUser(input.userId, notification);
    } catch (err) {
      this.logger.warn('WebSocket push failed — notification still saved', err);
    }

    return notification;
  }

  /**
   * Broadcast a notification to ALL users (persisted per-user).
   * Useful for system-wide announcements.
   */
  async broadcastNotification(
    userIds: string[],
    input: Omit<CreateInAppNotification, 'userId'>,
  ): Promise<number> {
    const notifications = await this.prisma.notification.createManyAndReturn({
      data: userIds.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        ...(input.data !== undefined && { data: input.data as Prisma.InputJsonValue }),
      })),
    });

    // Push each to their WebSocket room
    for (const n of notifications) {
      try {
        this.gateway.sendToUser(n.userId, n);
      } catch {
        /* best-effort */
      }
    }

    return notifications.length;
  }

  /**
   * Get paginated notifications for a user.
   */
  async getUserNotifications(
    userId: string,
    options: { cursor?: string; take?: number; unreadOnly?: boolean } = {},
  ) {
    const { cursor, take = 20, unreadOnly = false } = options;

    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { read: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1, // fetch one extra to determine if there's a next page
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // skip the cursor itself
      }),
    });

    const hasMore = notifications.length > take;
    const items = hasMore ? notifications.slice(0, take) : notifications;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  /**
   * Get the count of unread notifications.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  /**
   * Delete a single notification.
   */
  async deleteNotification(notificationId: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }
}
