import {
  UserRole,
  UserStatus,
  MaterialType,
  ColorMode,
  OrderStatus,
  BidRole,
  BidStatus,
  DisputeStatus,
  AlarmSeverity,
  OtpPurpose,
} from './enums';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    platformVersion?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface AuthSessionUser {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  preferredLocale: string;
  preferredTheme: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
}

export interface CategorySummary {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  iconName: string;
  sortOrder: number;
}

export interface TemplateSummary {
  id: string;
  categoryId: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  samplePromptsEn: string[];
  samplePromptsAr: string[];
  csgArchetype: string;
  defaultParamsJson: Record<string, any>;
  baseSetupFeeAed: number;
}

export interface StlMeshSummary {
  id: string;
  title: string;
  storageKey: string;
  downloadUrl: string;
  thumbnailUrl?: string | null;
  material: MaterialType;
  colorMode: ColorMode;
  colorHexList: string[];
  scalePercent: number;
  infillPercent: number;
  dimXmm: number;
  dimYmm: number;
  dimZmm: number;
  volumeCm3: number;
  estimatedWeightG: number;
  triangleCount: number;
  isWatertight: boolean;
  unitFloorAed: number;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  clientId: string;
  printerProviderId?: string | null;
  deliveryProviderId?: string | null;
  stlFileId: string;
  quantity: number;
  status: OrderStatus;
  minPrintFloorAed: number;
  clientMaxPrintBudgetAed: number;
  agreedPrintPriceAed?: number | null;
  minDeliveryFloorAed: number;
  clientMaxDeliveryBudgetAed: number;
  agreedDeliveryPriceAed?: number | null;
  batchPrintPhotoUrl?: string | null;
  pickupOtpPlainForPrinter?: string | null;
  deliveryOtpPlainForClient?: string | null;
  pickupEmirate?: string | null;
  pickupDistrict?: string | null;
  dropoffEmirate: string;
  dropoffDistrict: string;
  dropoffStreetAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  requiredByDate: string;
  createdAt: string;
}

export interface ZiinaPaymentIntentResult {
  id: string;
  amount: number;
  currency_code: string;
  status: string;
  redirect_url: string;
}
