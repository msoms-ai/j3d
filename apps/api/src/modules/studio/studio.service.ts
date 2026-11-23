import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { StorageService } from '../../common/storage.service';
import { ManifoldEngineService } from './manifold-engine.service';
import { GeminiAiService } from './gemini-ai.service';
import {
  StudioQuestionsDto,
  GenerateStlDto,
  UpdateStlDto,
  GenerateCustomAiDto,
} from './studio.dto';
import { MaterialType, ColorMode } from '@j3d/shared-types';

@Injectable()
export class StudioService {
  private readonly logger = new Logger(StudioService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly manifoldEngine: ManifoldEngineService,
    private readonly geminiAi: GeminiAiService,
  ) {}

  private async resolveTenantId(tenantIdOrSlug: string): Promise<string> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      tenantIdOrSlug || '',
    );
    if (isUuid) return tenantIdOrSlug;
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantIdOrSlug || 'msoms-uae' },
      select: { id: true },
    });
    return tenant ? tenant.id : '00000000-0000-0000-0000-000000000001';
  }

  async getCatalog(tenantId: string) {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const categories = await this.prisma.category.findMany({
      where: { tenantId: resolvedTenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        templates: {
          where: { isActive: true },
        },
      },
    });

    return categories;
  }

  async getQuestions(dto: StudioQuestionsDto, tenantId: string) {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.geminiAi.generateDynamicQuestions({
      tenantId: resolvedTenantId,
      categorySlug: dto.categorySlug,
      templateSlug: dto.templateSlug,
      userNotes: dto.userNotes,
      locale: dto.locale || 'ar',
    });
  }

  /**
   * Generates a 100% watertight solid model (.stl + .3mf) using Manifold-3D WASM
   */
  async generateStl(dto: GenerateStlDto, tenantId: string, creatorId?: string) {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const template = await this.prisma.template.findFirst({
      where: { tenantId: resolvedTenantId, slug: dto.templateSlug, isActive: true },
      include: { category: true },
    });

    if (!template) {
      throw new NotFoundException(`Template '${dto.templateSlug}' not found.`);
    }

    // Merge default template parameters with user answers
    const mergedParams: Record<string, any> = {
      ...(template.defaultParamsJson as Record<string, any>),
      ...dto.answers,
    };

    // For QR stand templates: resolve the qrUrl from common answer field names
    if (template.csgArchetype === 'BUSINESS_QR_DOOR_STAND' || template.csgArchetype === 'BUSINESS_QR_CARD_STAND') {
      const qrAnswer = mergedParams.qrAction || mergedParams.qrUrl || mergedParams.websiteUrl || mergedParams.qrTargetUrl;
      if (qrAnswer) {
        // Detect if the answer is a URL or a category keyword and map it
        const urlMatch = String(qrAnswer).match(/https?:\/\/[^\s]+/i);
        if (urlMatch) {
          mergedParams.qrUrl = urlMatch[0];
        } else if (/instagram|social/i.test(qrAnswer)) {
          mergedParams.qrUrl = `https://instagram.com/${mergedParams.companyHeader?.replace('@', '') || 'mybrand'}`;
        } else if (/google|review|maps/i.test(qrAnswer)) {
          mergedParams.qrUrl = `https://g.page/r/${mergedParams.companyHeader?.replace(/\s/g, '') || 'mybusiness'}`;
        } else if (/menu|website/i.test(qrAnswer)) {
          mergedParams.qrUrl = mergedParams.qrTargetUrl || 'https://j3d.msoms.ai';
        } else if (/payment|pay|tip/i.test(qrAnswer)) {
          mergedParams.qrUrl = `https://pay.j3d.msoms.ai/${mergedParams.companyHeader || ''}`;
        }
      }
    }

    // For Newborn sign: map babyName/birthYear/genderTheme from AI question IDs if needed
    if (template.csgArchetype === 'NEWBORN_KEEPSAKE_SIGN') {
      if (!mergedParams.babyName && mergedParams.customText) {
        mergedParams.babyName = mergedParams.customText;
      }
      if (!mergedParams.genderTheme && mergedParams.decorativeTheme) {
        const theme = String(mergedParams.decorativeTheme).toLowerCase();
        mergedParams.genderTheme = theme.includes('girl') || theme.includes('pink') || theme.includes('bow') ? 'GIRL' : 'BOY';
      }
      if (!mergedParams.birthYear) {
        mergedParams.birthYear = 2026;
      }
    }

    // For School STEM: map AI question answers to archetype params
    if (template.csgArchetype === 'SCHOOL_STEM_GEAR_MODEL') {
      if (!mergedParams.gearTeethCount) {
        // Try to extract from free-text answers
        const baseSetup = String(mergedParams.projectBaseSetup || '');
        const teethMatch = baseSetup.match(/(\d+)\s*teeth/i);
        mergedParams.gearTeethCount = teethMatch ? parseInt(teethMatch[1]) : 24;
      }
    }

    // For Home DIY: map AI question answers to bracket params
    if (template.csgArchetype === 'HOME_DIY_CUSTOM_BRACKET') {
      if (!mergedParams.armLengthMm) {
        const bracketUsage = String(mergedParams.bracketUsage || '');
        if (/headphone|hook/i.test(bracketUsage)) {
          mergedParams.armLengthMm = 90;
          mergedParams.clampOpeningMm = 38;
        } else if (/wall|shelf/i.test(bracketUsage)) {
          mergedParams.armLengthMm = 80;
          mergedParams.clampOpeningMm = 0; // flat shelf support, no hook
        }
      }
    }

    // For Custom Replacement Part: map AI question answers to knob/adapter params
    if (template.csgArchetype === 'CUSTOM_REPLACEMENT_PART') {
      const shaft = String(mergedParams.shaftType || '');
      if (/8\.0/i.test(shaft)) {
        mergedParams.shaftHoleDiameterMm = 8.0;
      } else if (/6\.0/i.test(shaft)) {
        mergedParams.shaftHoleDiameterMm = 6.0;
      }
      const part = String(mergedParams.partType || '');
      if (/coupler|collar/i.test(part)) {
        mergedParams.partHeightMm = 30.0;
        mergedParams.outerDiameterMm = 28.0;
      }
      const grip = String(mergedParams.gripStyle || '');
      if (/smooth/i.test(grip)) {
        mergedParams.gripRibsCount = 0;
      }
    }

    const scalePercent = dto.scalePercent || 100;
    const material = dto.material || MaterialType.PLA;
    const colorMode = dto.colorMode || ColorMode.MONO;
    const colorHexList = dto.colorHexList || ['#F97316'];
    const infillPercent = dto.infillPercent || 20;
    const baseSetupFeeAed = Number(template.baseSetupFeeAed);

    // 1. Synthesize watertight CSG solid tailored to user's selected parameters via Gemini 4 Hydrogen
    const answerEntries = Object.entries(dto.answers || {})
      .filter(([k, v]) => v !== undefined && v !== null && k !== 'userNotes' && String(v).trim().length > 0)
      .map(([k, v]) => `- ${k}: "${v}"`)
      .join('\n');
    const userNotes = dto.answers?.userNotes ? `\n- Additional User Instructions & Custom Notes: "${dto.answers.userNotes}"` : '';

    const aiSynthesisPrompt = `
Product to 3D print: "${template.nameEn}" (Category: "${(template as any).category?.nameEn || 'Custom 3D Printing'}")
Base Reference Archetype: "${template.csgArchetype}"

User Selected Options, Custom Dimensions & Engravings:
${answerEntries || '- Standard baseline parameters'}
${userNotes}

CRITICAL: Synthesize a custom, watertight, and production-ready 3D solid model designed specifically to incorporate ALL the user selections, features, and custom notes above.
`.trim();

    let customNodes: any[] | undefined = undefined;
    let aiMetadata: any = null;
    let synthesisArchetype = template.csgArchetype;

    try {
      const aiRecipe = await this.geminiAi.generateCustomModelRecipe({
        tenantId: resolvedTenantId,
        prompt: aiSynthesisPrompt,
        locale: 'en',
      });

      if (aiRecipe.nodes && aiRecipe.nodes.length > 0) {
        customNodes = aiRecipe.nodes;
        synthesisArchetype = 'CUSTOM_AI_MODEL';
        const inscribedText = mergedParams.mainGreetingText || mergedParams.greetingPreset || mergedParams.occasionTitle || mergedParams.phraseText || mergedParams.embossedText || '';
        const recipientName = mergedParams.recipientNameAndDate || mergedParams.recipientName || mergedParams.babyName || '';

        aiMetadata = {
          model: aiRecipe.modelUsed,
          promptSent: aiRecipe.promptSent,
          rationale: aiRecipe.designRationale,
          latencyMs: aiRecipe.inferenceLatencyMs,
          nodeCount: aiRecipe.nodes.length,
          inscribedText,
          recipientName,
        };

        // Guarantee 3D sculpted text relief is present if user specified inscriptions
        if (inscribedText && !customNodes.some((n: any) => n.type === 'text' || n.type === 'calligraphy')) {
          customNodes.push({
            type: 'text',
            operation: 'add',
            text: inscribedText,
            size: [68, 15, 1.8],
            position: [0, -3.9, recipientName ? 60 : 54],
            rotationDeg: [0, 0, 0],
          });
          if (recipientName) {
            customNodes.push({
              type: 'text',
              operation: 'add',
              text: recipientName,
              size: [56, 12, 1.4],
              position: [0, -3.9, 44],
              rotationDeg: [0, 0, 0],
            });
          }
        }
      }
    } catch (aiErr: any) {
      this.logger.warn(`Gemini 4 Hydrogen CSG synthesis for template ${template.slug} failed: ${aiErr.message}. Falling back to parametric archetype.`);
    }

    // 2. High-Performance Manifold-3D Solid Synthesis
    const mesh = this.manifoldEngine.compileMesh({
      archetype: synthesisArchetype,
      params: mergedParams,
      customNodes,
      scalePercent,
      material,
      colorMode,
      colorHexList,
      baseSetupFeeAed,
      quantity: dto.quantity || 1,
    });

    const fileId = crypto.randomUUID();

    // 3. Upload Binary STL
    const stlStorageKey = `stl/${resolvedTenantId}/${fileId}.stl`;
    const downloadUrl = await this.storage.uploadFile(
      stlStorageKey,
      mesh.stlBuffer,
      'application/vnd.ms-pki.stl',
    );

    // 4. Upload Bambu Lab Multi-Color .3MF Archive
    const threeMfStorageKey = `threemf/${resolvedTenantId}/${fileId}.3mf`;
    const threeMfUrl = await this.storage.uploadFile(
      threeMfStorageKey,
      mesh.threeMfBuffer,
      'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
    );

    // Ensure we have a creatorId (fallback to demo client if public preview)
    let finalCreatorId = creatorId;
    if (!finalCreatorId) {
      const demoClient = await this.prisma.user.findFirst({
        where: { tenantId: resolvedTenantId, email: 'client@msoms.ai' },
      });
      finalCreatorId = demoClient?.id;
    }

    if (!finalCreatorId) {
      throw new BadRequestException('Creator identity could not be resolved');
    }

    const stlTitle = aiMetadata?.rationale
      ? `${dto.title || template.nameEn} (Gemini 4 Hydrogen 3D)`
      : (dto.title || `${template.nameEn} (3D Print)`);

    const stlRecord = await this.prisma.stlFile.create({
      data: {
        id: fileId,
        tenantId: resolvedTenantId,
        creatorId: finalCreatorId,
        categoryId: template.categoryId,
        templateId: template.id,
        title: stlTitle,
        typeformAnswersJson: dto.answers,
        parametricSpecJson: {
          ...mergedParams,
          aiMetadata,
          customNodes,
          threeMfUrl,
          threeMfStorageKey,
        },
        storageKey: stlStorageKey,
        downloadUrl,
        material,
        colorMode,
        colorHexList,
        scalePercent,
        infillPercent,
        dimXmm: mesh.dimXmm,
        dimYmm: mesh.dimYmm,
        dimZmm: mesh.dimZmm,
        volumeCm3: mesh.volumeCm3,
        estimatedWeightG: mesh.estimatedWeightG,
        triangleCount: mesh.triangleCount,
        isWatertight: mesh.isWatertight,
        unitFloorAed: mesh.unitFloorAed,
      },
    });

    return {
      id: stlRecord.id,
      title: stlRecord.title,
      storageKey: stlRecord.storageKey,
      downloadUrl: stlRecord.downloadUrl,
      threeMfUrl,
      material: stlRecord.material,
      colorMode: stlRecord.colorMode,
      colorHexList: stlRecord.colorHexList,
      scalePercent: stlRecord.scalePercent,
      infillPercent: stlRecord.infillPercent,
      dimXmm: Number(stlRecord.dimXmm),
      dimYmm: Number(stlRecord.dimYmm),
      dimZmm: Number(stlRecord.dimZmm),
      volumeCm3: Number(stlRecord.volumeCm3),
      estimatedWeightG: Number(stlRecord.estimatedWeightG),
      triangleCount: stlRecord.triangleCount,
      isWatertight: stlRecord.isWatertight,
      unitFloorAed: Number(stlRecord.unitFloorAed),
      aiMetadata,
    };
  }

  /**
   * Generates a custom 3D model directly from a user prompt using Gemini 4 Hydrogen + Manifold-3D
   */
  async generateCustomAiModel(dto: GenerateCustomAiDto, tenantId: string, creatorId?: string) {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const locale = dto.locale || 'ar';
    const isAr = locale === 'ar';

    // 1. Synthesize watertight CSG primitives from prompt using Gemini 4 Hydrogen
    const aiRecipe = await this.geminiAi.generateCustomModelRecipe({
      tenantId: resolvedTenantId,
      prompt: dto.prompt,
      locale,
    });

    const titleEn = aiRecipe.titleEn;
    const titleAr = aiRecipe.titleAr;
    const nodes = aiRecipe.nodes;
    const params = {
      prompt: dto.prompt,
      designRationale: aiRecipe.designRationale,
      modelUsed: aiRecipe.modelUsed,
      promptSent: aiRecipe.promptSent,
      inferenceLatencyMs: aiRecipe.inferenceLatencyMs,
      nodeCount: nodes.length,
      aiRecipe,
    };

    const scalePercent = dto.scalePercent || 100;
    const material = dto.material || MaterialType.PLA;
    const colorMode = dto.colorMode || ColorMode.MONO;
    const colorHexList = dto.colorHexList || ['#F97316'];
    const quantity = dto.quantity || 1;

    // 2. Compile via Manifold-3D WebAssembly
    const mesh = this.manifoldEngine.compileMesh({
      archetype: 'CUSTOM_AI_MODEL',
      params,
      customNodes: nodes,
      scalePercent,
      material,
      colorMode,
      colorHexList,
      quantity,
      baseSetupFeeAed: 20,
    });

    const fileId = crypto.randomUUID();

    // 3. Upload Binary STL and .3MF
    const stlStorageKey = `stl/${resolvedTenantId}/${fileId}.stl`;
    const downloadUrl = await this.storage.uploadFile(
      stlStorageKey,
      mesh.stlBuffer,
      'application/vnd.ms-pki.stl',
    );

    const threeMfStorageKey = `threemf/${resolvedTenantId}/${fileId}.3mf`;
    const threeMfUrl = await this.storage.uploadFile(
      threeMfStorageKey,
      mesh.threeMfBuffer,
      'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
    );

    // Resolve creator ID
    let finalCreatorId = creatorId;
    if (!finalCreatorId) {
      const demoClient = await this.prisma.user.findFirst({
        where: { tenantId: resolvedTenantId, email: 'client@msoms.ai' },
      });
      finalCreatorId = demoClient?.id;
    }

    if (!finalCreatorId) {
      throw new BadRequestException('Creator identity could not be resolved');
    }

    const title = isAr ? titleAr : titleEn;

    const stlRecord = await this.prisma.stlFile.create({
      data: {
        id: fileId,
        tenantId: resolvedTenantId,
        creatorId: finalCreatorId,
        title: `${title} (Gemini 4 Hydrogen 3D)`,
        typeformAnswersJson: { prompt: dto.prompt, modelUsed: aiRecipe.modelUsed },
        parametricSpecJson: {
          ...params,
          prompt: dto.prompt,
          aiMetadata: {
            model: aiRecipe.modelUsed,
            promptSent: aiRecipe.promptSent,
            rationale: aiRecipe.designRationale,
            latencyMs: aiRecipe.inferenceLatencyMs,
            nodeCount: nodes.length,
          },
          threeMfUrl,
          threeMfStorageKey,
        },
        storageKey: stlStorageKey,
        downloadUrl,
        material,
        colorMode,
        colorHexList,
        scalePercent,
        infillPercent: 20,
        dimXmm: mesh.dimXmm,
        dimYmm: mesh.dimYmm,
        dimZmm: mesh.dimZmm,
        volumeCm3: mesh.volumeCm3,
        estimatedWeightG: mesh.estimatedWeightG,
        triangleCount: mesh.triangleCount,
        isWatertight: mesh.isWatertight,
        unitFloorAed: mesh.unitFloorAed,
      },
    });

    return {
      id: stlRecord.id,
      title: stlRecord.title,
      storageKey: stlRecord.storageKey,
      downloadUrl: stlRecord.downloadUrl,
      threeMfUrl,
      material: stlRecord.material,
      colorMode: stlRecord.colorMode,
      colorHexList: stlRecord.colorHexList,
      scalePercent: stlRecord.scalePercent,
      dimXmm: Number(stlRecord.dimXmm),
      dimYmm: Number(stlRecord.dimYmm),
      dimZmm: Number(stlRecord.dimZmm),
      volumeCm3: Number(stlRecord.volumeCm3),
      estimatedWeightG: Number(stlRecord.estimatedWeightG),
      triangleCount: stlRecord.triangleCount,
      isWatertight: stlRecord.isWatertight,
      unitFloorAed: Number(stlRecord.unitFloorAed),
      aiMetadata: {
        model: aiRecipe.modelUsed,
        promptSent: aiRecipe.promptSent,
        rationale: aiRecipe.designRationale,
        latencyMs: aiRecipe.inferenceLatencyMs,
        nodeCount: nodes.length,
      },
    };
  }

  async updateStl(stlId: string, dto: UpdateStlDto, tenantId: string) {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const stl = await this.prisma.stlFile.findFirst({
      where: { id: stlId, tenantId: resolvedTenantId },
      include: { template: true },
    });

    if (!stl) {
      throw new NotFoundException(`STL File '${stlId}' not found.`);
    }

    const scalePercent = dto.scalePercent ?? stl.scalePercent;
    const material = dto.material ?? stl.material;
    const colorMode = dto.colorMode ?? stl.colorMode;
    const colorHexList = dto.colorHexList ?? (stl.colorHexList as string[]);
    const infillPercent = dto.infillPercent ?? stl.infillPercent;

    const baseSetupFeeAed = stl.template ? Number(stl.template.baseSetupFeeAed) : 15.0;
    const archetype = stl.template?.csgArchetype || 'PHONE_TABLET_DUAL_STAND';
    const spec = (stl.parametricSpecJson as Record<string, any>) || {};
    const customNodes = spec.aiRecipe?.nodes;
    const resolvedArchetype = spec.isQrStand || spec.archetype === 'BUSINESS_QR_DOOR_STAND' || spec.archetype === 'BUSINESS_QR_CARD_STAND'
      ? 'BUSINESS_QR_DOOR_STAND'
      : (customNodes ? 'CUSTOM_AI_MODEL' : archetype);

    const mesh = this.manifoldEngine.compileMesh({
      archetype: resolvedArchetype,
      params: spec,
      customNodes,
      scalePercent,
      material: material as any,
      colorMode: colorMode as any,
      colorHexList,
      baseSetupFeeAed,
    });

    let downloadUrl = stl.downloadUrl;
    if (scalePercent !== stl.scalePercent) {
      downloadUrl = await this.storage.uploadFile(
        stl.storageKey,
        mesh.stlBuffer,
        'application/vnd.ms-pki.stl',
      );
      if (spec.threeMfStorageKey) {
        await this.storage.uploadFile(
          spec.threeMfStorageKey,
          mesh.threeMfBuffer,
          'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
        );
      }
    }

    const updated = await this.prisma.stlFile.update({
      where: { id: stlId },
      data: {
        scalePercent,
        material,
        colorMode,
        colorHexList,
        infillPercent,
        downloadUrl,
        dimXmm: mesh.dimXmm,
        dimYmm: mesh.dimYmm,
        dimZmm: mesh.dimZmm,
        volumeCm3: mesh.volumeCm3,
        estimatedWeightG: mesh.estimatedWeightG,
        triangleCount: mesh.triangleCount,
        unitFloorAed: mesh.unitFloorAed,
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      downloadUrl: updated.downloadUrl,
      material: updated.material,
      colorMode: updated.colorMode,
      colorHexList: updated.colorHexList,
      scalePercent: updated.scalePercent,
      infillPercent: updated.infillPercent,
      dimXmm: Number(updated.dimXmm),
      dimYmm: Number(updated.dimYmm),
      dimZmm: Number(updated.dimZmm),
      volumeCm3: Number(updated.volumeCm3),
      estimatedWeightG: Number(updated.estimatedWeightG),
      unitFloorAed: Number(updated.unitFloorAed),
    };
  }

  async getStlById(stlId: string, tenantId: string) {
    const stl = await this.prisma.stlFile.findFirst({
      where: { id: stlId, tenantId },
      include: {
        category: true,
        template: true,
      },
    });

    if (!stl) {
      throw new NotFoundException(`STL File '${stlId}' not found.`);
    }

    return stl;
  }
}
