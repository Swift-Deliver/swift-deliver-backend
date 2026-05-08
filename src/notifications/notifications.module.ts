import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { NotificationsController } from './notifications.controller.js';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret:
        process.env.JWT_SECRET || 'super-secret-key-change-this-in-production',
    }),
  ],
  providers: [NotificationsGateway, NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
