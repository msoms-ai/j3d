import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Runs queries with PostgreSQL session variables bound for Row-Level Security (RLS).
   */
  async withSessionContext<T>(
    context: { tenantId: string; userId?: string; role?: string },
    fn: (tx: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${context.tenantId}';`);
      if (context.userId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${context.userId}';`);
      }
      if (context.role) {
        await tx.$executeRawUnsafe(`SET LOCAL app.current_user_role = '${context.role}';`);
      }
      return fn(tx as unknown as PrismaClient);
    });
  }
}
