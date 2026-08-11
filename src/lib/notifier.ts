/**
 * Notification system for AssetFlow.
 *
 * Supports two channels:
 * - **in_app**: Stores notifications in the database (always enabled)
 * - **email**: Sends email via SMTP/Nodemailer (optional, requires SMTP env vars)
 *
 * Usage:
 *   import { notify, notifyMultiple } from '@/lib/notifier';
 *   await notify(recipientId, 'asset_assigned', 'Laptop XYZ has been assigned to you.');
 *   await notifyMultiple([id1, id2], 'booking_reminder', 'Your booking starts in 1 hour.');
 */

import { prisma } from './db';
import { logger } from './logger';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// ─── Channel Configuration ──────────────────────────────────────
export type NotificationChannel = 'in_app' | 'email' | 'both';

const DEFAULT_CHANNEL: NotificationChannel =
  (process.env.NOTIFICATION_CHANNEL as NotificationChannel) || 'both';

// ─── SMTP / Email Configuration ─────────────────────────────────
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.SMTP_FROM || 'AssetFlow <noreply@assetflow.app>';
const SMTP_SECURE = process.env.SMTP_SECURE === 'true'; // true for port 465

const isEmailConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASSWORD);

let transporter: Transporter | null = null;

if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });

  // Verify connection on startup (non-blocking)
  transporter.verify().then(() => {
    logger.info('SMTP connection verified', { host: SMTP_HOST, port: SMTP_PORT });
  }).catch((err) => {
    logger.warn('SMTP connection failed — email notifications will be skipped', {
      host: SMTP_HOST,
      error: err instanceof Error ? err.message : String(err),
    });
    transporter = null;
  });
} else {
  logger.info('SMTP not configured — email notifications disabled (in-app only)');
}

// ─── Email Sending ──────────────────────────────────────────────
async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  if (!transporter) return false;

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html: wrapEmailTemplate(subject, body),
    });
    logger.debug('Email sent', { to, subject });
    return true;
  } catch (err) {
    logger.error('Failed to send email', {
      to,
      subject,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

function wrapEmailTemplate(subject: string, body: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 20px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; font-weight: bold; font-size: 16px; line-height: 40px;">AF</div>
        </div>
        <h2 style="color: #18181b; font-size: 18px; margin: 0 0 16px;">${subject}</h2>
        <p style="color: #3f3f46; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">${body}</p>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
        <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
          This is an automated notification from AssetFlow. Do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `.trim();
}

// ─── Notification Type → Email Subject Mapping ──────────────────
const NOTIFICATION_SUBJECTS: Record<string, string> = {
  asset_assigned: '🏷️ Asset Assigned to You',
  asset_returned: '📦 Asset Returned',
  maintenance_approved: '✅ Maintenance Request Approved',
  maintenance_rejected: '❌ Maintenance Request Rejected',
  maintenance_resolved: '🔧 Maintenance Issue Resolved',
  booking_confirmed: '📅 Booking Confirmed',
  booking_cancelled: '🚫 Booking Cancelled',
  booking_reminder: '⏰ Booking Reminder',
  transfer_requested: '🔀 Transfer Request Received',
  transfer_approved: '✅ Transfer Approved',
  transfer_rejected: '❌ Transfer Rejected',
  overdue_return: '⚠️ Overdue Asset Return',
  audit_discrepancy: '🔍 Audit Discrepancy Found',
  role_changed: '👤 Your Role Has Been Updated',
};

// ─── Core Notification Functions ────────────────────────────────

/**
 * Send a notification to a single recipient.
 * Creates an in-app notification and optionally sends an email.
 */
export async function notify(
  recipientId: string,
  type: string,
  message: string,
  channel: NotificationChannel = DEFAULT_CHANNEL
): Promise<void> {
  // Always create in-app notification
  if (channel === 'in_app' || channel === 'both') {
    await prisma.notification.create({
      data: { recipientId, type, message },
    });
  }

  // Send email (fire-and-forget, non-blocking)
  if ((channel === 'email' || channel === 'both') && isEmailConfigured) {
    // Look up recipient email
    const recipient = await prisma.employee.findUnique({
      where: { id: recipientId },
      select: { email: true, name: true },
    });

    if (recipient?.email) {
      const subject = NOTIFICATION_SUBJECTS[type] || 'AssetFlow Notification';
      // Fire-and-forget — don't block the caller
      sendEmail(recipient.email, subject, message).catch(() => {});
    }
  }
}

/**
 * Send a notification to multiple recipients.
 * Creates in-app notifications in bulk and sends individual emails.
 */
export async function notifyMultiple(
  recipientIds: string[],
  type: string,
  message: string,
  channel: NotificationChannel = DEFAULT_CHANNEL
): Promise<void> {
  if (recipientIds.length === 0) return;

  // Bulk create in-app notifications
  if (channel === 'in_app' || channel === 'both') {
    await prisma.notification.createMany({
      data: recipientIds.map(recipientId => ({
        recipientId,
        type,
        message,
      })),
    });
  }

  // Send emails (fire-and-forget)
  if ((channel === 'email' || channel === 'both') && isEmailConfigured) {
    const recipients = await prisma.employee.findMany({
      where: { id: { in: recipientIds } },
      select: { email: true, name: true },
    });

    const subject = NOTIFICATION_SUBJECTS[type] || 'AssetFlow Notification';
    for (const recipient of recipients) {
      if (recipient.email) {
        sendEmail(recipient.email, subject, message).catch(() => {});
      }
    }
  }
}
