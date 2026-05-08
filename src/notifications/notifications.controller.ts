import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import {
  SendEmailDto,
  CreateNotificationDto,
  QueryNotificationsDto,
} from './dto/index.js';
import { JwtAuthGuard, RolesGuard } from '../common/guards/index.js';
import { Roles } from '../common/decorators/index.js';
import { Role } from '@prisma/client';
import type { RequestWithUser } from '../auth/interfaces/index.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ── Email (Admin only) ────────────────────────────────────────────────

  /**
   * POST /notifications/email
   * Sends an email via Resend. Restricted to ADMIN users.
   */
  @Post('email')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async sendEmail(@Body() dto: SendEmailDto) {
    const messageId = await this.notificationsService.sendEmail(dto);

    if (!messageId) {
      return { success: false, message: 'Failed to send email' };
    }

    return { success: true, messageId };
  }

  // ── In-App: Push (Admin only) ─────────────────────────────────────────

  /**
   * POST /notifications/push
   * Create and push an in-app notification to a specific user.
   */
  @Post('push')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async pushNotification(@Body() dto: CreateNotificationDto) {
    const notification = await this.notificationsService.pushNotification(dto);
    return { success: true, notification };
  }

  // ── In-App: Read (Current user) ───────────────────────────────────────

  /**
   * GET /notifications
   * Get paginated notifications for the authenticated user.
   */
  @Get()
  async getMyNotifications(
    @Request() req: RequestWithUser,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.notificationsService.getUserNotifications(
      req.user.userId,
      query,
    );
  }

  /**
   * GET /notifications/unread-count
   * Get the count of unread notifications for the authenticated user.
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req: RequestWithUser) {
    const count = await this.notificationsService.getUnreadCount(
      req.user.userId,
    );
    return { count };
  }

  // ── In-App: Update (Current user) ─────────────────────────────────────

  /**
   * PATCH /notifications/:id/read
   * Mark a single notification as read.
   */
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    await this.notificationsService.markAsRead(id, req.user.userId);
    return { success: true };
  }

  /**
   * PATCH /notifications/read-all
   * Mark ALL notifications as read for the authenticated user.
   */
  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Request() req: RequestWithUser) {
    await this.notificationsService.markAllAsRead(req.user.userId);
    return { success: true };
  }

  // ── In-App: Delete (Current user) ─────────────────────────────────────

  /**
   * DELETE /notifications/:id
   * Delete a notification.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteNotification(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    await this.notificationsService.deleteNotification(id, req.user.userId);
    return { success: true };
  }
}
