import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { MaterialType, ColorMode } from '@j3d/shared-types';

export class StudioQuestionsDto {
  @IsString()
  categorySlug!: string;

  @IsString()
  templateSlug!: string;

  @IsOptional()
  @IsString()
  userNotes?: string;

  @IsOptional()
  @IsString()
  locale?: string;
}

export class GenerateStlDto {
  @IsString()
  templateSlug!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsObject()
  answers!: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(200)
  scalePercent?: number;

  @IsOptional()
  @IsEnum(MaterialType)
  material?: MaterialType;

  @IsOptional()
  @IsEnum(ColorMode)
  colorMode?: ColorMode;

  @IsOptional()
  @IsArray()
  colorHexList?: string[];

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  infillPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;
}

export class UpdateStlDto {
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(200)
  scalePercent?: number;

  @IsOptional()
  @IsEnum(MaterialType)
  material?: MaterialType;

  @IsOptional()
  @IsEnum(ColorMode)
  colorMode?: ColorMode;

  @IsOptional()
  @IsArray()
  colorHexList?: string[];

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  infillPercent?: number;
}

export class GenerateCustomAiDto {
  @IsString()
  prompt!: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsEnum(MaterialType)
  material?: MaterialType;

  @IsOptional()
  @IsEnum(ColorMode)
  colorMode?: ColorMode;

  @IsOptional()
  @IsArray()
  colorHexList?: string[];

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(200)
  scalePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;
}
