import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { StudioService } from './studio.service';
import {
  StudioQuestionsDto,
  GenerateStlDto,
  UpdateStlDto,
  GenerateCustomAiDto,
} from './studio.dto';
import { Public, CurrentUser, TenantId } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';

@Controller('studio')
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

  @Public()
  @Get('catalog')
  async getCatalog(@TenantId() tenantId: string) {
    return this.studioService.getCatalog(tenantId);
  }

  @Public()
  @Post('questions')
  async getQuestions(@Body() dto: StudioQuestionsDto, @TenantId() tenantId: string) {
    return this.studioService.getQuestions(dto, tenantId);
  }

  @Public()
  @Post('generate-stl')
  async generateStl(
    @Body() dto: GenerateStlDto,
    @TenantId() tenantId: string,
    @CurrentUser('sub') creatorId?: string,
  ) {
    return this.studioService.generateStl(dto, tenantId, creatorId);
  }

  @Public()
  @Post('generate-custom-ai')
  async generateCustomAi(
    @Body() dto: GenerateCustomAiDto,
    @TenantId() tenantId: string,
    @CurrentUser('sub') creatorId?: string,
  ) {
    return this.studioService.generateCustomAiModel(dto, tenantId, creatorId);
  }

  @Public()
  @Patch('stl/:id')
  async updateStl(
    @Param('id') stlId: string,
    @Body() dto: UpdateStlDto,
    @TenantId() tenantId: string,
  ) {
    return this.studioService.updateStl(stlId, dto, tenantId);
  }

  @Public()
  @Get('stl/:id')
  async getStlById(@Param('id') stlId: string, @TenantId() tenantId: string) {
    return this.studioService.getStlById(stlId, tenantId);
  }
}
