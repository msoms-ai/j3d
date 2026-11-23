import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { EmailService } from '../email/email.service';
import {
  RegisterDto,
  VerifyOtpDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './auth.dto';
import { UserRole, UserStatus, OtpPurpose } from '@j3d/shared-types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly emailService: EmailService,
  ) {}

  private async getPrimaryTenantId(): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: 'msoms-uae' },
    });
    return tenant ? tenant.id : '00000000-0000-0000-0000-000000000001';
  }

  private generateTokens(user: {
    id: string;
    tenantId: string;
    email: string;
    role: string;
    locale: string;
  }) {
    const accessSecret =
      process.env.JWT_ACCESS_SECRET ||
      'a4ff2b32ad30ec063cf417a195a826800229419c845b929681f8adaa85689396';
    const refreshSecret =
      process.env.JWT_REFRESH_SECRET ||
      'cf9582299a4c86bcda3159735638cdff7adf96044306cca02fe9f2e438877924';

    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      locale: user.locale,
    };

    const accessToken = jwt.sign(payload, accessSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: '7d' });

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const tenantId = await this.getPrimaryTenantId();
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });

    if (existing && existing.status !== UserStatus.PENDING_OTP) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await argon2.hash(dto.password, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    let user = existing;
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          tenantId,
          email,
          passwordHash,
          role: dto.role,
          status: UserStatus.PENDING_OTP,
          fullName: dto.fullName,
          phone: dto.phone,
          preferredLocale: dto.locale || 'ar',
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          role: dto.role,
          fullName: dto.fullName,
          phone: dto.phone,
          preferredLocale: dto.locale || 'ar',
        },
      });
    }

    // Generate 6-digit OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    await this.redis.storeOtp(email, OtpPurpose.REGISTER_OTP, otpCode, 600);
    this.logger.log(`Generated registration OTP for ${email}: ${otpCode}`);

    await this.emailService.sendOtpEmail({
      tenantId,
      to: email,
      otpCode,
      purpose: OtpPurpose.REGISTER_OTP,
      locale: dto.locale || 'ar',
    });

    return {
      message: 'Verification code sent to your email.',
      email,
      status: UserStatus.PENDING_OTP,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const tenantId = await this.getPrimaryTenantId();
    const email = dto.email.toLowerCase().trim();

    const isValid = await this.redis.verifyOtp(email, dto.purpose, dto.otpCode);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });

    if (!user) {
      throw new BadRequestException('User account not found.');
    }

    // Activate user if pending
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { status: UserStatus.ACTIVE },
    });

    const tokens = this.generateTokens({
      id: updated.id,
      tenantId: updated.tenantId,
      email: updated.email,
      role: updated.role,
      locale: updated.preferredLocale,
    });

    return {
      user: {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        role: updated.role,
        status: updated.status,
        preferredLocale: updated.preferredLocale,
        preferredTheme: updated.preferredTheme,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const tenantId = await this.getPrimaryTenantId();
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status === UserStatus.PENDING_OTP) {
      // Re-send OTP
      const otpCode = crypto.randomInt(100000, 999999).toString();
      await this.redis.storeOtp(email, OtpPurpose.REGISTER_OTP, otpCode, 600);
      await this.emailService.sendOtpEmail({
        tenantId,
        to: email,
        otpCode,
        purpose: OtpPurpose.REGISTER_OTP,
        locale: user.preferredLocale,
      });
      throw new UnauthorizedException('Account not yet verified. A new verification OTP was sent to your email.');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.BANNED) {
      throw new UnauthorizedException('Account suspended or banned. Please contact support.');
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const tokens = this.generateTokens({
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      locale: user.preferredLocale,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        preferredLocale: user.preferredLocale,
        preferredTheme: user.preferredTheme,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl,
      },
      ...tokens,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const tenantId = await this.getPrimaryTenantId();
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });

    if (user) {
      const otpCode = crypto.randomInt(100000, 999999).toString();
      await this.redis.storeOtp(email, OtpPurpose.RESET_PASSWORD_OTP, otpCode, 600);
      this.logger.log(`Password reset OTP for ${email}: ${otpCode}`);

      await this.emailService.sendOtpEmail({
        tenantId,
        to: email,
        otpCode,
        purpose: OtpPurpose.RESET_PASSWORD_OTP,
        locale: dto.locale || user.preferredLocale || 'ar',
      });
    }

    return { message: 'If an account exists with this email, a reset code was sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tenantId = await this.getPrimaryTenantId();
    const email = dto.email.toLowerCase().trim();

    const isValid = await this.redis.verifyOtp(email, OtpPurpose.RESET_PASSWORD_OTP, dto.otpCode);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired reset code.');
    }

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    const newHash = await argon2.hash(dto.newPassword, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return { message: 'Password has been successfully updated.' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        phone: true,
        preferredLocale: true,
        preferredTheme: true,
        avatarUrl: true,
        bannerUrl: true,
        emirate: true,
        district: true,
        streetAddress: true,
        latitude: true,
        longitude: true,
        printerModels: true,
        maxBedXmm: true,
        maxBedYmm: true,
        maxBedZmm: true,
        supportsMulticolor: true,
        supportedMaterials: true,
        vehicleType: true,
        plateNumber: true,
        isOnline: true,
        walletBalanceAed: true,
        ratingAvg: true,
        ratingCount: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
