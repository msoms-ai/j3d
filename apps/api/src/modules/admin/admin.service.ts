import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { VaultCryptoService } from '../../common/vault-crypto.service';
import { AiModelCatalogService } from './ai-model-catalog.service';
import { UserRole, UserStatus, DisputeStatus } from '@j3d/shared-types';
import { Resend } from 'resend';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vaultCrypto: VaultCryptoService,
    private readonly aiCatalog: AiModelCatalogService,
  ) {}

  // 1. Users CRUD
  async getUsers(tenantId: string, role?: UserRole, page = 1, limit = 20) {
    const where: any = { tenantId };
    if (role) where.role = role;

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          status: true,
          preferredLocale: true,
          emirate: true,
          district: true,
          walletBalanceAed: true,
          ratingAvg: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, page, limit, users };
  }

  async updateUserStatus(userId: string, status: UserStatus, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }

  // 2. STL Files
  async getStlFiles(tenantId: string, page = 1, limit = 20) {
    const [total, files] = await Promise.all([
      this.prisma.stlFile.count({ where: { tenantId } }),
      this.prisma.stlFile.findMany({
        where: { tenantId },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          creator: { select: { fullName: true, email: true } },
          template: { select: { nameEn: true, nameAr: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, page, limit, files };
  }

  // 3. Disputes & Alarms
  async getDisputes(tenantId: string) {
    return this.prisma.dispute.findMany({
      where: { tenantId },
      include: {
        order: true,
        raisedBy: { select: { fullName: true, email: true } },
        messages: {
          include: { sender: { select: { fullName: true, role: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveDispute(disputeId: string, resolutionNotes: string, status: DisputeStatus, tenantId: string) {
    return this.prisma.dispute.update({
      where: { id: disputeId },
      data: { resolutionNotes, status },
    });
  }

  async getAlarms(tenantId: string) {
    return this.prisma.adminAlarm.findMany({
      where: { tenantId },
      orderBy: [{ isResolved: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async resolveAlarm(alarmId: string, tenantId: string) {
    return this.prisma.adminAlarm.update({
      where: { id: alarmId },
      data: { isResolved: true },
    });
  }

  // 4. Platform Config (AI & Email Vaults)
  async getConfig(tenantId: string) {
    const config = await this.prisma.platformConfig.findFirst({
      where: { tenantId },
    });

    if (!config) return null;

    return {
      id: config.id,
      geminiKeyMasked: config.geminiKeyMasked,
      activeGeminiTextModel: config.activeGeminiTextModel,
      activeGeminiImageModel: config.activeGeminiImageModel,
      cachedGeminiModels: config.cachedGeminiModelsJson,
      senderEmailAddress: config.senderEmailAddress,
      resendKeyMasked: config.resendKeyMasked,
      lastEmailProbeStatus: config.lastEmailProbeStatus,
      lastEmailProbeAt: config.lastEmailProbeAt,
    };
  }

  async updateGeminiConfig(tenantId: string, apiKey?: string, textModel?: string, imageModel?: string) {
    const config = await this.prisma.platformConfig.findFirst({ where: { tenantId } });
    if (!config) throw new NotFoundException('Platform config not found');

    const data: any = {};
    if (apiKey) {
      data.geminiApiKeyEncrypted = this.vaultCrypto.encrypt(apiKey);
      data.geminiKeyMasked = this.vaultCrypto.maskKey(apiKey);
    }
    if (textModel) data.activeGeminiTextModel = textModel;
    if (imageModel) data.activeGeminiImageModel = imageModel;

    return this.prisma.platformConfig.update({
      where: { id: config.id },
      data,
    });
  }

  async updateEmailConfig(tenantId: string, apiKey?: string, senderEmail?: string) {
    const config = await this.prisma.platformConfig.findFirst({ where: { tenantId } });
    if (!config) throw new NotFoundException('Platform config not found');

    const data: any = {};
    if (apiKey) {
      data.resendApiKeyEncrypted = this.vaultCrypto.encrypt(apiKey);
      data.resendKeyMasked = this.vaultCrypto.maskKey(apiKey);
    }
    if (senderEmail) data.senderEmailAddress = senderEmail;

    return this.prisma.platformConfig.update({
      where: { id: config.id },
      data,
    });
  }

  async testEmailConnection(tenantId: string) {
    const config = await this.prisma.platformConfig.findFirst({ where: { tenantId } });
    let apiKey = process.env.DEFAULT_RESEND_API_KEY || '';
    if (config?.resendApiKeyEncrypted) {
      const dec = this.vaultCrypto.decrypt(config.resendApiKeyEncrypted);
      if (dec) apiKey = dec;
    }

    try {
      const resend = new Resend(apiKey);
      const domains = await resend.domains.list();
      const status = domains.data ? 'HEALTHY' : 'DEGRADED';

      await this.prisma.platformConfig.update({
        where: { id: config?.id },
        data: {
          lastEmailProbeStatus: status,
          lastEmailProbeAt: new Date(),
        },
      });

      return { status, domains: domains.data };
    } catch (err: any) {
      await this.prisma.platformConfig.update({
        where: { id: config?.id },
        data: {
          lastEmailProbeStatus: 'ERROR',
          lastEmailProbeAt: new Date(),
        },
      });
      return { status: 'ERROR', error: err.message };
    }
  }

  async checkGeminiModels(tenantId: string) {
    return this.aiCatalog.checkAndNotifyNewModels(tenantId);
  }

  async switchGeminiModel(tenantId: string, modelName: string) {
    return this.aiCatalog.updateActiveModel(tenantId, modelName);
  }
}
