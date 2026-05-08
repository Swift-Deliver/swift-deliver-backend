/**
 * Reusable email templates for common notification scenarios.
 *
 * Each template returns an object with `subject` and `html` so callers can
 * simply spread the result into the notification service.
 */

const baseStyles = `
  body { margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .card { background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .header { text-align: center; margin-bottom: 32px; }
  .header h1 { margin: 0; font-size: 24px; color: #1a1a2e; }
  .content { color: #4a4a68; font-size: 16px; line-height: 1.6; }
  .btn { display: inline-block; padding: 14px 32px; background: #6c5ce7; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 24px 0; }
  .footer { text-align: center; margin-top: 32px; font-size: 13px; color: #9b9bb4; }
`;

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="card">
      ${body}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Swift Deliver. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Templates ───────────────────────────────────────────────────────────

export function welcomeEmail(name: string) {
  return {
    subject: 'Welcome to Swift Deliver! 🚀',
    html: layout(`
      <div class="header"><h1>Welcome aboard, ${name}!</h1></div>
      <div class="content">
        <p>We're thrilled to have you on Swift Deliver. Your account is all set up and ready to go.</p>
        <p>Start exploring what you can do:</p>
        <ul>
          <li>Schedule your first delivery</li>
          <li>Track packages in real time</li>
          <li>Manage your profile &amp; preferences</li>
        </ul>
        <p style="text-align:center;">
          <a class="btn" href="#">Get Started</a>
        </p>
      </div>
    `),
  };
}

export function passwordResetEmail(name: string, resetUrl: string) {
  return {
    subject: 'Reset your password',
    html: layout(`
      <div class="header"><h1>Password Reset</h1></div>
      <div class="content">
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the button below to choose a new one. This link will expire in 1 hour.</p>
        <p style="text-align:center;">
          <a class="btn" href="${resetUrl}">Reset Password</a>
        </p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `),
  };
}

export function orderConfirmationEmail(
  name: string,
  orderId: string,
  estimatedDelivery: string,
) {
  return {
    subject: `Order Confirmed — #${orderId}`,
    html: layout(`
      <div class="header"><h1>Order Confirmed! 🎉</h1></div>
      <div class="content">
        <p>Hi ${name},</p>
        <p>Your order <strong>#${orderId}</strong> has been confirmed and is being processed.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr>
            <td style="padding:8px 0;color:#9b9bb4;">Order ID</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;">#${orderId}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#9b9bb4;">Estimated Delivery</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;">${estimatedDelivery}</td>
          </tr>
        </table>
        <p>We'll notify you once your package is on its way.</p>
      </div>
    `),
  };
}

export function deliveryUpdateEmail(
  name: string,
  orderId: string,
  status: string,
  details: string,
) {
  return {
    subject: `Delivery Update — #${orderId}`,
    html: layout(`
      <div class="header"><h1>Delivery Update</h1></div>
      <div class="content">
        <p>Hi ${name},</p>
        <p>Your order <strong>#${orderId}</strong> status has changed to: <strong>${status}</strong>.</p>
        <p>${details}</p>
      </div>
    `),
  };
}
