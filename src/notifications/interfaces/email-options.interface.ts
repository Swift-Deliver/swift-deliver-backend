/**
 * Options for sending an email via the notification service.
 */
export interface EmailOptions {
  /** Recipient email address(es) */
  to: string | string[];

  /** Email subject line */
  subject: string;

  /** HTML body content */
  html: string;

  /** Optional plain-text fallback */
  text?: string;

  /** Override the default "from" address for this email */
  from?: string;

  /** Optional reply-to address */
  replyTo?: string;

  /** CC recipients */
  cc?: string | string[];

  /** BCC recipients */
  bcc?: string | string[];

  /** Optional email tags for tracking in Resend dashboard */
  tags?: Array<{ name: string; value: string }>;
}
