import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { StorageService } from '../../common/storage.service';
import { RedisService } from '../../common/redis.service';
import { EmailService } from '../email/email.service';
import { MaterialType, OtpPurpose } from '@j3d/shared-types';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly redis: RedisService,
    private readonly emailService: EmailService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, data: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        preferredLocale: data.preferredLocale,
        preferredTheme: data.preferredTheme,
        emirate: data.emirate,
        district: data.district,
        streetAddress: data.streetAddress,
        latitude: data.latitude,
        longitude: data.longitude,
        printerModels: data.printerModels,
        maxBedXmm: data.maxBedXmm,
        maxBedYmm: data.maxBedYmm,
        maxBedZmm: data.maxBedZmm,
        supportsMulticolor: data.supportsMulticolor,
        supportedMaterials: data.supportedMaterials,
        vehicleType: data.vehicleType,
        plateNumber: data.plateNumber,
        isOnline: data.isOnline,
      },
    });
  }

  /**
   * Generates custom AI Avatar or Banner
   */
  async generateAvatar(userId: string, tenantId: string, prompt: string, type: 'avatar' | 'banner') {
    // Generate a beautiful svg or graphic as AI placeholder, or call Gemini/Imagen
    const seed = encodeURIComponent(prompt || '3d printing maker robot');
    const imageUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=090d16,14b8a6,f97316`;

    const updateData: any = {};
    if (type === 'banner') {
      updateData.bannerUrl = imageUrl;
      updateData.bannerAiPrompt = prompt;
    } else {
      updateData.avatarUrl = imageUrl;
      updateData.avatarAiPrompt = prompt;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  async requestEmailChange(userId: string, newEmail: string, locale = 'ar') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const email = newEmail.toLowerCase().trim();
    const existing = await this.prisma.user.findFirst({
      where: { tenantId: user.tenantId, email },
    });
    if (existing) {
      throw new BadRequestException('Email already in use by another account');
    }

    const otpCode = crypto.randomInt(100000, 999999).toString();
    await this.redis.storeOtp(email, OtpPurpose.CHANGE_EMAIL_OTP, otpCode, 600);

    await this.emailService.sendOtpEmail({
      tenantId: user.tenantId,
      to: email,
      otpCode,
      purpose: OtpPurpose.CHANGE_EMAIL_OTP,
      locale,
    });

    return { message: 'Verification OTP sent to your new email.' };
  }

  async confirmEmailChange(userId: string, newEmail: string, otpCode: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const email = newEmail.toLowerCase().trim();
    const isValid = await this.redis.verifyOtp(email, OtpPurpose.CHANGE_EMAIL_OTP, otpCode);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { email },
    });
  }
}
