import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma.service';
import { VaultCryptoService } from '../../common/vault-crypto.service';
import { AlarmSeverity } from '@j3d/shared-types';

export interface DiscoveredModel {
  name: string;
  displayName: string;
  description: string;
  isLatestFlash: boolean;
  isLatestPro: boolean;
}

@Injectable()
export class AiModelCatalogService {
  private readonly logger = new Logger(AiModelCatalogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vaultCrypto: VaultCryptoService,
  ) {}

  /**
   * Periodic background check (every 24 hours, or triggered manually from Admin UI)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handlePeriodicModelCheck() {
    this.logger.log('Executing periodic Gemini AI model discovery check...');
    const configs = await this.prisma.platformConfig.findMany();
    for (const config of configs) {
      await this.checkAndNotifyNewModels(config.tenantId);
    }
  }

  /**
   * Queries Google Generative Language API for live available models
   */
  async checkAndNotifyNewModels(tenantId: string) {
    const config = await this.prisma.platformConfig.findFirst({
      where: { tenantId },
    });

    if (!config) return null;

    let apiKey = process.env.DEFAULT_GEMINI_API_KEY || '';
    if (config.geminiApiKeyEncrypted) {
      try {
        const decrypted = this.vaultCrypto.decrypt(config.geminiApiKeyEncrypted);
        if (decrypted) apiKey = decrypted;
      } catch (err: any) {
        this.logger.warn(`Decryption error: ${err.message}`);
      }
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );

      if (!response.ok) {
        this.logger.warn(`Failed to query Google Models API: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      const modelsList = data.models || [];

      // Filter generateContent models
      const textModels = modelsList.filter((m: any) =>
        m.supportedGenerationMethods?.includes('generateContent'),
      );

      const parsedModels: DiscoveredModel[] = textModels.map((m: any) => {
        const id = m.name.replace('models/', '');
        return {
          name: id,
          displayName: m.displayName || id,
          description: m.description || '',
          isLatestFlash: id.includes('hydrogen') || id.includes('3.8-flash') || id === 'gemini-flash-latest',
          isLatestPro: id.includes('argon') || id.includes('2.5-pro') || id === 'gemini-pro-latest',
        };
      });

      // Find the best recommended model (Gemini 4 Hydrogen)
      const recommendedFlash =
        parsedModels.find((m) => m.name === 'gemini-4-hydrogen') ||
        parsedModels.find((m) => m.name === 'gemini-3.8-flash') ||
        parsedModels.find((m) => m.name === 'gemini-flash-latest') ||
        parsedModels.find((m) => m.name.includes('flash'));

      const recommendedFlashModel = recommendedFlash ? recommendedFlash.name : 'gemini-4-hydrogen';

      // Update cached models list
      await this.prisma.platformConfig.update({
        where: { id: config.id },
        data: {
          cachedGeminiModelsJson: parsedModels as any,
        },
      });

      // If active model is older than recommended, raise an Admin Alarm!
      if (recommendedFlashModel && config.activeGeminiTextModel !== recommendedFlashModel) {
        const existingAlarm = await this.prisma.adminAlarm.findFirst({
          where: {
            tenantId,
            category: 'AI_MODEL_UPDATE',
            isResolved: false,
          },
        });

        if (!existingAlarm) {
          await this.prisma.adminAlarm.create({
            data: {
              tenantId,
              severity: AlarmSeverity.INFO,
              category: 'AI_MODEL_UPDATE',
              title: `Newer Gemini Flash Model Available: ${recommendedFlashModel}`,
              detailsJson: {
                currentModel: config.activeGeminiTextModel,
                recommendedModel: recommendedFlashModel,
                message: `Google Gemini has released ${recommendedFlashModel}. You can switch to this model in one click in your AI Configuration.`,
                detectedAt: new Date().toISOString(),
              },
            },
          });
          this.logger.log(`Created Admin Alarm: Newer Gemini Flash model available (${recommendedFlashModel})`);
        }
      }

      return {
        activeModel: config.activeGeminiTextModel,
        recommendedFlashModel,
        models: parsedModels,
      };
    } catch (err: any) {
      this.logger.error(`Error checking Gemini models catalog: ${err.message}`);
      return null;
    }
  }

  /**
   * Hot-swap active model in database
   */
  async updateActiveModel(tenantId: string, modelName: string) {
    const config = await this.prisma.platformConfig.findFirst({
      where: { tenantId },
    });

    if (!config) return null;

    const updated = await this.prisma.platformConfig.update({
      where: { id: config.id },
      data: {
        activeGeminiTextModel: modelName,
      },
    });

    // Resolve any pending alarms regarding model update
    await this.prisma.adminAlarm.updateMany({
      where: {
        tenantId,
        category: 'AI_MODEL_UPDATE',
        isResolved: false,
      },
      data: { isResolved: true },
    });

    return updated;
  }
}
