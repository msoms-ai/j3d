import { Controller, Get } from '@nestjs/common';
import { Public } from './decorators';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'J3D Platform API',
      version: process.env.NEXT_PUBLIC_APP_VERSION || 'v1.0.0',
      timestamp: new Date().toISOString(),
      initiative: 'msoms.ai 2026',
    };
  }
}
