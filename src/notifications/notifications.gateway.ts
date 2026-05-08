import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import type { Notification } from '@prisma/client';

/**
 * WebSocket gateway for real-time in-app notifications.
 *
 * Clients connect with their JWT:
 *   io('http://localhost:3000/notifications', {
 *     auth: { token: 'Bearer <jwt>' }
 *   })
 *
 * On connection the socket auto-joins a private room `user:<userId>`
 * so notifications can be pushed to specific users.
 */
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*' },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  // ── Connection lifecycle ──────────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} rejected — no token`);
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId: string = payload.sub;

      // Attach userId to socket data for later use
      client.data.userId = userId;

      // Join a private room so we can target this user
      await client.join(`user:${userId}`);

      this.logger.log(`Client ${client.id} connected (user ${userId})`);
    } catch {
      this.logger.warn(`Client ${client.id} rejected — invalid token`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  // ── Public methods (called by NotificationsService) ───────────────────

  /**
   * Push a notification to a specific user in real time.
   */
  sendToUser(userId: string, notification: Notification) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  /**
   * Push a notification to ALL connected users (e.g. system-wide alerts).
   */
  broadcast(notification: Notification) {
    this.server.emit('notification', notification);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private extractToken(client: Socket): string | null {
    // Support both `auth.token` and `Authorization` header
    const authField =
      client.handshake.auth?.token ?? client.handshake.headers?.authorization;

    if (!authField || typeof authField !== 'string') return null;

    // Strip "Bearer " prefix if present
    return authField.startsWith('Bearer ')
      ? authField.slice(7)
      : authField;
  }
}
