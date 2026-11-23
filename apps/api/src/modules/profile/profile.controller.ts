import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CurrentUser, TenantId } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';

@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.profileService.getProfile(userId);
  }

  @Patch()
  async updateProfile(@CurrentUser('sub') userId: string, @Body() data: any) {
    return this.profileService.updateProfile(userId, data);
  }

  @Post('generate-avatar')
  async generateAvatar(
    @CurrentUser('sub') userId: string,
    @TenantId() tenantId: string,
    @Body('prompt') prompt: string,
    @Body('type') type: 'avatar' | 'banner',
  ) {
    return this.profileService.generateAvatar(userId, tenantId, prompt, type || 'avatar');
  }

  @Post('request-email-change')
  async requestEmailChange(
    @CurrentUser('sub') userId: string,
    @Body('newEmail') newEmail: string,
    @Body('locale') locale?: string,
  ) {
    return this.profileService.requestEmailChange(userId, newEmail, locale);
  }

  @Post('confirm-email-change')
  async confirmEmailChange(
    @CurrentUser('sub') userId: string,
    @Body('newEmail') newEmail: string,
    @Body('otpCode') otpCode: string,
  ) {
    return this.profileService.confirmEmailChange(userId, newEmail, otpCode);
  }
}
