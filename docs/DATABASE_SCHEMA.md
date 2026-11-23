Complete PostgreSQL 16 & Prisma Database Schema (j3d.msoms.ai)

1. Entity Relationship Diagram

erDiagram

    TENANTS ||--o{ USERS : "isolates"

    TENANTS ||--o{ CATEGORIES : "owns"

    CATEGORIES ||--o{ TEMPLATES : "groups"

    USERS ||--o{ STL_FILES : "creates"

    USERS ||--o{ ORDERS : "places / prints / delivers"

    STL_FILES ||--o{ ORDERS : "attached_to"

    ORDERS ||--o{ ORDER_BIDS : "receives_bids"

    ORDERS ||--o{ ESCROW_LEDGER : "holds_funds"

    ORDERS ||--o{ ORDER_EVENTS : "audits_status"

    ORDERS ||--o{ DISPUTES : "escalates"

    DISPUTES ||--o{ DISPUTE_MESSAGES : "threads"

    TENANTS ||--o{ ADMIN_ALARMS : "monitors"

    TENANTS ||--o{ AUDIT_LOGS : "records"

    TENANTS ||--o{ PLATFORM_CONFIGS : "configures_ai_and_email"

2. Production prisma/schema.prisma

Every table carries tenantId (tenant_id UUID NOT NULL) with composite indexes and foreign key cascades to support PostgreSQL 16 Row-Level Security (RLS) via Prisma ORM.

generator client {

  provider = "prisma-client-js"

}

datasource db {

  provider = "postgresql"

  url      = env("DATABASE_URL")

}

enum UserRole {

  ADMIN

  CLIENT

  PRINTER_PROVIDER

  DELIVERY_PROVIDER

}

enum UserStatus {

  PENDING_OTP

  ACTIVE

  SUSPENDED

  BANNED

}

enum MaterialType {

  PLA

  PLA_SILK

  PETG

  ABS

  ASA

  TPU_95A

  RESIN_STANDARD

  RESIN_TOUGH

}

enum ColorMode {

  MONO

  MULTICOLOR

}

enum OrderStatus {

  DRAFT

  PENDING_PRINTER

  BIDDING_PRINTER

  PRINTING

  PRINT_COMPLETED_PACKAGED

  READY_FOR_PICKUP

  BIDDING_DELIVERY

  DELIVERY_ASSIGNED

  IN_TRANSIT

  DELIVERED

  COMPLETED

  CANCELLED

  DISPUTED

}

enum BidRole {

  PRINTER_PROVIDER

  DELIVERY_PROVIDER

}

enum BidStatus {

  INSTANT_MATCHED

  COUNTER_OFFER_PENDING

  CLIENT_ACCEPTED

  REJECTED

  EXPIRED

}

enum DisputeStatus {

  OPEN

  UNDER_ADMIN_REVIEW

  RESOLVED_CLIENT_REFUND

  RESOLVED_PROVIDER_PAYOUT

  RESOLVED_SPLIT

  CLOSED

}

enum AlarmSeverity {

  INFO

  WARNING

  HIGH

  CRITICAL

}

model Tenant {

  id          String   @id @default(uuid()) @db.Uuid

  slug        String   @unique @db.VarChar(64)

  nameEn      String   @map("name_en") @db.VarChar(120)

  nameAr      String   @map("name_ar") @db.VarChar(120)

  isActive    Boolean  @default(true) @map("is_active")

  createdAt   DateTime @default(now()) @map("created_at")

  updatedAt   DateTime @updatedAt @map("updated_at")

  users       User[]

  categories  Category[]

  templates   Template[]

  stlFiles    StlFile[]

  orders      Order[]

  disputes    Dispute[]

  alarms      AdminAlarm[]

  auditLogs   AuditLog[]

  configs     PlatformConfig[]

  @@map("tenants")

}

model User {

  id                  String         @id @default(uuid()) @db.Uuid

  tenantId            String         @map("tenant_id") @db.Uuid

  email               String         @db.VarChar(255)

  passwordHash        String         @map("password_hash") @db.VarChar(255)

  role                UserRole       @default(CLIENT)

  status              UserStatus     @default(PENDING_OTP)

  fullName            String         @map("full_name") @db.VarChar(120)

  phone               String         @db.VarChar(32)

  preferredLocale     String         @default("ar") @map("preferred_locale") @db.VarChar(5)

  preferredTheme      String         @default("dark") @map("preferred_theme") @db.VarChar(10)

  avatarUrl           String?        @map("avatar_url") @db.Text

  bannerUrl           String?        @map("banner_url") @db.Text

  avatarAiPrompt      String?        @map("avatar_ai_prompt") @db.Text

  bannerAiPrompt      String?        @map("banner_ai_prompt") @db.Text

  // OpenStreetMap / Nominatim Location Fields

  emirate             String?        @db.VarChar(64)

  district            String?        @db.VarChar(120)

  streetAddress       String?        @map("street_address") @db.Text

  latitude            Decimal?       @db.Decimal(10, 7)

  longitude           Decimal?       @db.Decimal(10, 7)

  // 3D Printer Provider Fleet Specifications

  printerModels       Json?          @map("printer_models")

  maxBedXmm           Int?           @default(256) @map("max_bed_x_mm")

  maxBedYmm           Int?           @default(256) @map("max_bed_y_mm")

  maxBedZmm           Int?           @default(256) @map("max_bed_z_mm")

  supportsMulticolor  Boolean        @default(false) @map("supports_multicolor")

  supportedMaterials  MaterialType[] @map("supported_materials")

  // UAE Delivery Provider Specifications

  vehicleType         String?        @map("vehicle_type") @db.VarChar(64)

  plateNumber         String?        @map("plate_number") @db.VarChar(32)

  isOnline            Boolean        @default(false) @map("is_online")

  walletBalanceAed    Decimal        @default(0.00) @map("wallet_balance_aed") @db.Decimal(10, 2)

  ratingAvg           Decimal        @default(5.00) @map("rating_avg") @db.Decimal(3, 2)

  ratingCount         Int            @default(0) @map("rating_count")

  createdAt           DateTime       @default(now()) @map("created_at")

  updatedAt           DateTime       @updatedAt @map("updated_at")

  tenant              Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  stlFiles            StlFile[]

  clientOrders        Order[]        @relation("ClientOrders")

  printerOrders       Order[]        @relation("PrinterOrders")

  deliveryOrders      Order[]        @relation("DeliveryOrders")

  bids                OrderBid[]

  disputesRaised      Dispute[]

  disputeMessages     DisputeMessage[]

  auditLogs           AuditLog[]

  @@unique([tenantId, email])

  @@index([tenantId, role, status])

  @@map("users")

}

model Category {

  id            String     @id @default(uuid()) @db.Uuid

  tenantId      String     @map("tenant_id") @db.Uuid

  slug          String     @db.VarChar(64)

  nameEn        String     @map("name_en") @db.VarChar(120)

  nameAr        String     @map("name_ar") @db.VarChar(120)

  descriptionEn String     @map("description_en") @db.Text

  descriptionAr String     @map("description_ar") @db.Text

  iconName      String     @map("icon_name") @db.VarChar(64)

  sortOrder     Int        @default(0) @map("sort_order")

  isActive      Boolean    @default(true) @map("is_active")

  createdAt     DateTime   @default(now()) @map("created_at")

  updatedAt     DateTime   @updatedAt @map("updated_at")

  tenant        Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  templates     Template[]

  stlFiles      StlFile[]

  @@unique([tenantId, slug])

  @@map("categories")

}

model Template {

  id                  String    @id @default(uuid()) @db.Uuid

  tenantId            String    @map("tenant_id") @db.Uuid

  categoryId          String    @map("category_id") @db.Uuid

  slug                String    @db.VarChar(64)

  nameEn              String    @map("name_en") @db.VarChar(120)

  nameAr              String    @map("name_ar") @db.VarChar(120)

  samplePromptsEn     Json      @map("sample_prompts_en")

  samplePromptsAr     Json      @map("sample_prompts_ar")

  csgArchetype        String    @map("csg_archetype") @db.VarChar(64)

  defaultParamsJson   Json      @map("default_params_json")

  baseSetupFeeAed     Decimal   @default(10.00) @map("base_setup_fee_aed") @db.Decimal(8, 2)

  isActive            Boolean   @default(true) @map("is_active")

  createdAt           DateTime  @default(now()) @map("created_at")

  updatedAt           DateTime  @updatedAt @map("updated_at")

  tenant              Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  category            Category  @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  stlFiles            StlFile[]

  @@unique([tenantId, slug])

  @@map("templates")

}

model StlFile {

  id                  String       @id @default(uuid()) @db.Uuid

  tenantId            String       @map("tenant_id") @db.Uuid

  creatorId           String       @map("creator_id") @db.Uuid

  categoryId          String?      @map("category_id") @db.Uuid

  templateId          String?      @map("template_id") @db.Uuid

  title               String       @db.VarChar(160)

  typeformAnswersJson Json         @map("typeform_answers_json")

  parametricSpecJson  Json         @map("parametric_spec_json")

  storageKey          String       @map("storage_key") @db.Text

  downloadUrl         String       @map("download_url") @db.Text

  thumbnailUrl        String?      @map("thumbnail_url") @db.Text

  material            MaterialType @default(PLA)

  colorMode           ColorMode    @default(MONO)

  colorHexList        Json         @map("color_hex_list")

  scalePercent        Int          @default(100) @map("scale_percent")

  infillPercent       Int          @default(20) @map("infill_percent")

  dimXmm              Decimal      @map("dim_x_mm") @db.Decimal(8, 2)

  dimYmm              Decimal      @map("dim_y_mm") @db.Decimal(8, 2)

  dimZmm              Decimal      @map("dim_z_mm") @db.Decimal(8, 2)

  volumeCm3           Decimal      @map("volume_cm3") @db.Decimal(10, 3)

  estimatedWeightG    Decimal      @map("estimated_weight_g") @db.Decimal(10, 2)

  triangleCount       Int          @map("triangle_count")

  isWatertight        Boolean      @default(true) @map("is_watertight")

  unitFloorAed        Decimal      @map("unit_floor_aed") @db.Decimal(10, 2)

  createdAt           DateTime     @default(now()) @map("created_at")

  tenant              Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  creator             User         @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  category            Category?    @relation(fields: [categoryId], references: [id])

  template            Template?    @relation(fields: [templateId], references: [id])

  orders              Order[]

  @@index([tenantId, creatorId])

  @@map("stl_files")

}

model Order {

  id                          String      @id @default(uuid()) @db.Uuid

  tenantId                    String      @map("tenant_id") @db.Uuid

  orderNumber                 String      @unique @map("order_number") @db.VarChar(32)

  clientId                    String      @map("client_id") @db.Uuid

  printerProviderId           String?     @map("printer_provider_id") @db.Uuid

  deliveryProviderId          String?     @map("delivery_provider_id") @db.Uuid

  stlFileId                   String      @map("stl_file_id") @db.Uuid

  quantity                    Int         @default(1)

  status                      OrderStatus @default(PENDING_PRINTER)

  // Client Budget Caps & Floor Guardrails (in AED)

  minPrintFloorAed            Decimal     @map("min_print_floor_aed") @db.Decimal(10, 2)

  clientMaxPrintBudgetAed     Decimal     @map("client_max_print_budget_aed") @db.Decimal(10, 2)

  agreedPrintPriceAed         Decimal?    @map("agreed_print_price_aed") @db.Decimal(10, 2)

  minDeliveryFloorAed         Decimal     @map("min_delivery_floor_aed") @db.Decimal(10, 2)

  clientMaxDeliveryBudgetAed  Decimal     @map("client_max_delivery_budget_aed") @db.Decimal(10, 2)

  agreedDeliveryPriceAed      Decimal?    @map("agreed_delivery_price_aed") @db.Decimal(10, 2)

  // Verification & Dual OTP Handshakes

  batchPrintPhotoUrl          String?     @map("batch_print_photo_url") @db.Text

  pickupOtpHash               String?     @map("pickup_otp_hash") @db.VarChar(255)

  pickupOtpPlainForPrinter    String?     @map("pickup_otp_plain_for_printer") @db.VarChar(6)

  deliveryOtpHash             String?     @map("delivery_otp_hash") @db.VarChar(255)

  deliveryOtpPlainForClient   String?     @map("delivery_otp_plain_for_client") @db.VarChar(6)

  // Delivery Addresses Snapshot

  pickupEmirate               String?     @map("pickup_emirate") @db.VarChar(64)

  pickupDistrict              String?     @map("pickup_district") @db.VarChar(120)

  pickupLat                   Decimal?    @map("pickup_lat") @db.Decimal(10, 7)

  pickupLng                   Decimal?    @map("pickup_lng") @db.Decimal(10, 7)

  dropoffEmirate              String      @map("dropoff_emirate") @db.VarChar(64)

  dropoffDistrict             String      @map("dropoff_district") @db.VarChar(120)

  dropoffStreetAddress        String      @map("dropoff_street_address") @db.Text

  dropoffLat                  Decimal     @map("dropoff_lat") @db.Decimal(10, 7)

  dropoffLng                  Decimal     @map("dropoff_lng") @db.Decimal(10, 7)

  requiredByDate              DateTime    @map("required_by_date")

  createdAt                   DateTime    @default(now()) @map("created_at")

  updatedAt                   DateTime    @updatedAt @map("updated_at")

  tenant                      Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  client                      User        @relation("ClientOrders", fields: [clientId], references: [id])

  printerProvider             User?       @relation("PrinterOrders", fields: [printerProviderId], references: [id])

  deliveryProvider            User?       @relation("DeliveryOrders", fields: [deliveryProviderId], references: [id])

  stlFile                     StlFile     @relation(fields: [stlFileId], references: [id])

  bids                        OrderBid[]

  disputes                    Dispute[]

  @@index([tenantId, status])

  @@map("orders")

}

model OrderBid {

  id                  String    @id @default(uuid()) @db.Uuid

  tenantId            String    @map("tenant_id") @db.Uuid

  orderId             String    @map("order_id") @db.Uuid

  providerId          String    @map("provider_id") @db.Uuid

  bidRole             BidRole   @map("bid_role")

  proposedAmountAed   Decimal   @map("proposed_amount_aed") @db.Decimal(10, 2)

  estimatedHours      Int       @map("estimated_hours")

  notes               String?   @db.Text

  isWithinClientMax   Boolean   @map("is_within_client_max")

  status              BidStatus @default(COUNTER_OFFER_PENDING)

  createdAt           DateTime  @default(now()) @map("created_at")

  order               Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)

  provider            User      @relation(fields: [providerId], references: [id], onDelete: Cascade)

  @@index([tenantId, orderId, bidRole])

  @@map("order_bids")

}

model Dispute {

  id              String           @id @default(uuid()) @db.Uuid

  tenantId        String           @map("tenant_id") @db.Uuid

  orderId         String           @map("order_id") @db.Uuid

  raisedById      String           @map("raised_by_id") @db.Uuid

  reason          String           @db.VarChar(160)

  description     String           @db.Text

  status          DisputeStatus    @default(OPEN)

  resolutionNotes String?          @map("resolution_notes") @db.Text

  createdAt       DateTime         @default(now()) @map("created_at")

  updatedAt       DateTime         @updatedAt @map("updated_at")

  tenant          Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  order           Order            @relation(fields: [orderId], references: [id], onDelete: Cascade)

  raisedBy        User             @relation(fields: [raisedById], references: [id])

  messages        DisputeMessage[]

  @@index([tenantId, status])

  @@map("disputes")

}

model DisputeMessage {

  id          String   @id @default(uuid()) @db.Uuid

  disputeId   String   @map("dispute_id") @db.Uuid

  senderId    String   @map("sender_id") @db.Uuid

  messageBody String   @map("message_body") @db.Text

  attachment  String?  @db.Text

  createdAt   DateTime @default(now()) @map("created_at")

  dispute     Dispute  @relation(fields: [disputeId], references: [id], onDelete: Cascade)

  sender      User     @relation(fields: [senderId], references: [id])

  @@map("dispute_messages")

}

model AdminAlarm {

  id          String        @id @default(uuid()) @db.Uuid

  tenantId    String        @map("tenant_id") @db.Uuid

  severity    AlarmSeverity @default(WARNING)

  category    String        @db.VarChar(64)

  title       String        @db.VarChar(160)

  detailsJson Json          @map("details_json")

  isResolved  Boolean       @default(false) @map("is_resolved")

  createdAt   DateTime      @default(now()) @map("created_at")

  tenant      Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, isResolved, severity])

  @@map("admin_alarms")

}

model PlatformConfig {

  id                      String   @id @default(uuid()) @db.Uuid

  tenantId                String   @unique @map("tenant_id") @db.Uuid

  geminiApiKeyEncrypted   String   @map("gemini_api_key_encrypted") @db.Text

  geminiKeyMasked         String   @map("gemini_key_masked") @db.VarChar(32)

  activeGeminiTextModel   String   @default("gemini-2.5-pro") @map("active_gemini_text_model") @db.VarChar(80)

  activeGeminiImageModel  String   @default("imagen-3.0-generate-002") @map("active_gemini_image_model") @db.VarChar(80)

  cachedGeminiModelsJson  Json     @map("cached_gemini_models_json")

  senderEmailAddress      String   @default("noreply@msoms.ai") @map("sender_email_address") @db.VarChar(160)

  resendApiKeyEncrypted   String   @map("resend_api_key_encrypted") @db.Text

  resendKeyMasked         String   @map("resend_key_masked") @db.VarChar(32)

  lastEmailProbeStatus    String   @default("HEALTHY") @map("last_email_probe_status") @db.VarChar(32)

  lastEmailProbeAt        DateTime @default(now()) @map("last_email_probe_at")

  updatedAt               DateTime @updatedAt @map("updated_at")

  tenant                  Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("platform_configs")

}

model AuditLog {

  id          String   @id @default(uuid()) @db.Uuid

  tenantId    String   @map("tenant_id") @db.Uuid

  actorId     String?  @map("actor_id") @db.Uuid

  actorRole   String   @map("actor_role") @db.VarChar(32)

  action      String   @db.VarChar(120)

  entityType  String   @map("entity_type") @db.VarChar(64)

  entityId    String?  @map("entity_id") @db.VarChar(64)

  ipAddress   String   @map("ip_address") @db.VarChar(64)

  metadata    Json

  createdAt   DateTime @default(now()) @map("created_at")

  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  actor       User?    @relation(fields: [actorId], references: [id])

  @@index([tenantId, createdAt(sort: Desc)])

  @@map("audit_logs")

}

