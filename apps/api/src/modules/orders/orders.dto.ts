import {
  IsString,
  IsNumber,
  IsUUID,
  Min,
  IsDateString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { BidRole } from '@j3d/shared-types';

export class CreateOrderDto {
  @IsUUID()
  stlFileId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(15)
  clientMaxPrintBudgetAed!: number;

  @IsNumber()
  @Min(15)
  clientMaxDeliveryBudgetAed!: number;

  @IsString()
  dropoffEmirate!: string;

  @IsString()
  dropoffDistrict!: string;

  @IsString()
  dropoffStreetAddress!: string;

  @IsNumber()
  dropoffLat!: number;

  @IsNumber()
  dropoffLng!: number;

  @IsDateString()
  requiredByDate!: string;
}

export class SubmitBidDto {
  @IsNumber()
  @Min(5)
  proposedAmountAed!: number;

  @IsNumber()
  @Min(1)
  estimatedHours!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AcceptCounterOfferDto {
  @IsUUID()
  bidId!: string;
}

export class UploadBatchPhotoDto {
  @IsString()
  photoUrl!: string;
}

export class VerifyOtpHandshakeDto {
  @IsString()
  otpCode!: string;
}
