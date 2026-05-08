export { NotificationsModule } from './notifications.module.js';
export { NotificationsService } from './notifications.service.js';
export { NotificationsGateway } from './notifications.gateway.js';
export type { EmailOptions, CreateInAppNotification } from './interfaces/index.js';
export {
  welcomeEmail,
  passwordResetEmail,
  orderConfirmationEmail,
  deliveryUpdateEmail,
} from './templates/index.js';
