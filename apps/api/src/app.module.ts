import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaService } from './common/prisma.service';
import { RedisService } from './common/redis.service';
import { VaultCryptoService } from './common/vault-crypto.service';
import { StorageService } from './common/storage.service';
import { HealthController } from './common/health.controller';

import { EmailService } from './modules/email/email.service';
import { AuthService } from './modules/auth/auth.service';
import { AuthController } from './modules/auth/auth.controller';

import { CsgBuilderService } from './modules/studio/csg-builder.service';
import { ManifoldEngineService } from './modules/studio/manifold-engine.service';
import { GeminiAiService } from './modules/studio/gemini-ai.service';
import { StudioService } from './modules/studio/studio.service';
import { StudioController } from './modules/studio/studio.controller';

import { ZiinaPaymentService } from './modules/escrow/ziina-payment.service';
import { OrdersService } from './modules/orders/orders.service';
import { OrdersController } from './modules/orders/orders.controller';

import { AiModelCatalogService } from './modules/admin/ai-model-catalog.service';
import { AdminService } from './modules/admin/admin.service';
import { AdminController } from './modules/admin/admin.controller';

import { ProfileService } from './modules/profile/profile.service';
import { ProfileController } from './modules/profile/profile.controller';

import { EventsGateway } from './modules/realtime/events.gateway';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [
    HealthController,
    AuthController,
    StudioController,
    OrdersController,
    AdminController,
    ProfileController,
  ],
  providers: [
    PrismaService,
    RedisService,
    VaultCryptoService,
    StorageService,
    EmailService,
    AuthService,
    CsgBuilderService,
    ManifoldEngineService,
    GeminiAiService,
    StudioService,
    ZiinaPaymentService,
    OrdersService,
    AiModelCatalogService,
    AdminService,
    ProfileService,
    EventsGateway,
  ],
})
export class AppModule {}
