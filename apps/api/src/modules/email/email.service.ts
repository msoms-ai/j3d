import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { PrismaService } from '../../common/prisma.service';
import { VaultCryptoService } from '../../common/vault-crypto.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vaultCrypto: VaultCryptoService,
  ) {}

  private async getResendClient(tenantId: string): Promise<{ resend: Resend; sender: string }> {
    const config = await this.prisma.platformConfig.findFirst({
      where: { tenantId },
    });

    let apiKey = process.env.DEFAULT_RESEND_API_KEY || '';
    let sender = process.env.DEFAULT_SENDER_EMAIL || 'noreply@msoms.ai';

    if (config?.resendApiKeyEncrypted) {
      try {
        const decrypted = this.vaultCrypto.decrypt(config.resendApiKeyEncrypted);
        if (decrypted) apiKey = decrypted;
      } catch (err) {
        this.logger.warn('Failed to decrypt database Resend key, using fallback environment key', err);
      }
    }

    if (config?.senderEmailAddress) {
      sender = config.senderEmailAddress;
    }

    return {
      resend: new Resend(apiKey),
      sender: `J3D Platform <${sender}>`,
    };
  }

  /**
   * Dispatches a 6-digit bilingual HTML OTP email
   */
  async sendOtpEmail(options: {
    tenantId: string;
    to: string;
    otpCode: string;
    purpose: string;
    locale: string;
  }) {
    const { tenantId, to, otpCode, purpose, locale } = options;
    const isAr = locale === 'ar';

    const titles: Record<string, { ar: string; en: string }> = {
      REGISTER_OTP: { ar: 'تأكيد التسجيل في منصة J3D', en: 'Verify Your J3D Account Registration' },
      RESET_PASSWORD_OTP: { ar: 'إعادة تعيين كلمة المرور - منصة J3D', en: 'Reset Your J3D Password' },
      CHANGE_EMAIL_OTP: { ar: 'تأكيد تغيير البريد الإلكتروني - J3D', en: 'Confirm Your New Email Address' },
      CHANGE_PASSWORD_OTP: { ar: 'رمز التحقق لتغيير كلمة المرور - J3D', en: 'Password Change Verification Code' },
    };

    const subject = titles[purpose]?.[isAr ? 'ar' : 'en'] || (isAr ? 'رمز التحقق من منصة J3D' : 'J3D Verification Code');

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="${isAr ? 'ar' : 'en'}" dir="${isAr ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090D16; color: #F8FAFC; margin: 0; padding: 24px; }
        .card { max-width: 520px; margin: 0 auto; background: #111827; border: 1px solid #1E293B; border-radius: 12px; padding: 32px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
        .logo { font-size: 24px; font-weight: bold; color: #F97316; margin-bottom: 16px; text-align: center; }
        .title { font-size: 18px; font-weight: 600; text-align: center; margin-bottom: 24px; color: #E2E8F0; }
        .otp-box { background: #0F172A; border: 2px dashed #14B8A6; border-radius: 8px; font-size: 36px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 18px; color: #F97316; margin: 24px 0; }
        .footer { font-size: 12px; color: #64748B; text-align: center; margin-top: 24px; border-top: 1px solid #1E293B; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">J3D • منصة الطباعة ثلاثية الأبعاد</div>
        <div class="title">${subject}</div>
        <p style="color: #94A3B8; text-align: center;">
          ${isAr ? 'استخدم رمز التحقق السري التالي لإتمام طلبك (صالح لمدة ١٠ دقائق فقط):' : 'Please use the following single-use 6-digit verification code (valid for 10 minutes):'}
        </p>
        <div class="otp-box">${otpCode}</div>
        <p style="color: #64748B; font-size: 13px; text-align: center;">
          ${isAr ? 'إذا لم تطلب هذا الرمز، يمكنك تجاهل هذا البريد الإلكتروني بأمان.' : 'If you did not request this verification code, please disregard this email.'}
        </p>
        <div class="footer">
          J3D Platform • An initiative from msoms.ai 2026<br/>
          مبادرة من msoms.ai 2026 • الإمارات العربية المتحدة
        </div>
      </div>
    </body>
    </html>
    `;

    try {
      const { resend, sender } = await this.getResendClient(tenantId);
      const res = await resend.emails.send({
        from: sender,
        to: [to],
        subject,
        html: htmlContent,
      });
      this.logger.log(`OTP Email dispatched to ${to}: ${res.data?.id}`);
      return res;
    } catch (err: any) {
      this.logger.error(`Failed to send email via Resend to ${to}: ${err.message}`);
      // Don't crash in local dev, allow inspecting OTP from Redis/console
      return null;
    }
  }

  /**
   * Dispatches order status alert emails
   */
  async sendOrderAlert(options: {
    tenantId: string;
    to: string;
    orderNumber: string;
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
  }) {
    const { tenantId, to, orderNumber, title, message, actionUrl, actionText } = options;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #090D16; color: #F8FAFC; padding: 24px; }
        .card { max-width: 520px; margin: 0 auto; background: #111827; border: 1px solid #1E293B; border-radius: 12px; padding: 32px; }
        .logo { font-size: 22px; font-weight: bold; color: #F97316; margin-bottom: 16px; }
        .order-tag { display: inline-block; background: #1E293B; padding: 4px 10px; border-radius: 4px; color: #14B8A6; font-size: 13px; font-weight: bold; margin-bottom: 16px; }
        .button { display: inline-block; background: #F97316; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">J3D Platform</div>
        <div class="order-tag">Order #${orderNumber}</div>
        <h2>${title}</h2>
        <p style="color: #94A3B8; line-height: 1.6;">${message}</p>
        ${actionUrl ? `<a href="${actionUrl}" class="button">${actionText || 'View Order'}</a>` : ''}
      </div>
    </body>
    </html>
    `;

    try {
      const { resend, sender } = await this.getResendClient(tenantId);
      await resend.emails.send({
        from: sender,
        to: [to],
        subject: `[J3D #${orderNumber}] ${title}`,
        html: htmlContent,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to send order email to ${to}: ${err.message}`);
    }
  }
}
