import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CurrentUser, TenantId, Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { UserRole, UserStatus, DisputeStatus } from '@j3d/shared-types';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getUsers(
    @TenantId() tenantId: string,
    @Query('role') role?: UserRole,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getUsers(tenantId, role, parseInt(page, 10), parseInt(limit, 10));
  }

  @Patch('users/:id/status')
  async updateUserStatus(
    @Param('id') userId: string,
    @Body('status') status: UserStatus,
    @TenantId() tenantId: string,
  ) {
    return this.adminService.updateUserStatus(userId, status, tenantId);
  }

  @Get('stl')
  async getStlFiles(
    @TenantId() tenantId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getStlFiles(tenantId, parseInt(page, 10), parseInt(limit, 10));
  }

  @Get('disputes')
  async getDisputes(@TenantId() tenantId: string) {
    return this.adminService.getDisputes(tenantId);
  }

  @Post('disputes/:id/resolve')
  async resolveDispute(
    @Param('id') disputeId: string,
    @Body('resolutionNotes') resolutionNotes: string,
    @Body('status') status: DisputeStatus,
    @TenantId() tenantId: string,
  ) {
    return this.adminService.resolveDispute(disputeId, resolutionNotes, status, tenantId);
  }

  @Get('alarms')
  async getAlarms(@TenantId() tenantId: string) {
    return this.adminService.getAlarms(tenantId);
  }

  @Patch('alarms/:id/resolve')
  async resolveAlarm(@Param('id') alarmId: string, @TenantId() tenantId: string) {
    return this.adminService.resolveAlarm(alarmId, tenantId);
  }

  @Get('config')
  async getConfig(@TenantId() tenantId: string) {
    return this.adminService.getConfig(tenantId);
  }

  @Patch('config/ai')
  async updateAiConfig(
    @TenantId() tenantId: string,
    @Body('apiKey') apiKey?: string,
    @Body('textModel') textModel?: string,
    @Body('imageModel') imageModel?: string,
  ) {
    return this.adminService.updateGeminiConfig(tenantId, apiKey, textModel, imageModel);
  }

  @Patch('config/email')
  async updateEmailConfig(
    @TenantId() tenantId: string,
    @Body('apiKey') apiKey?: string,
    @Body('senderEmail') senderEmail?: string,
  ) {
    return this.adminService.updateEmailConfig(tenantId, apiKey, senderEmail);
  }

  @Post('config/email/test')
  async testEmailConnection(@TenantId() tenantId: string) {
    return this.adminService.testEmailConnection(tenantId);
  }

  @Post('config/ai/check-models')
  async checkGeminiModels(@TenantId() tenantId: string) {
    return this.adminService.checkGeminiModels(tenantId);
  }

  @Post('config/ai/switch-model')
  async switchGeminiModel(
    @TenantId() tenantId: string,
    @Body('modelName') modelName: string,
  ) {
    return this.adminService.switchGeminiModel(tenantId, modelName);
  }
}
