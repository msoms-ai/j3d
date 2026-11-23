Local Development & Docker Compose Setup (j3d.msoms.ai)

1. Local Infrastructure (docker-compose.yml)

Provides local instances of PostgreSQL 16, Redis 7.4, MinIO (S3-compatible object storage for generated .STL files, batch verification photos, and AI avatars), and Mailpit (local SMTP/email viewer for testing noreply@msoms.ai templates).

services:

  postgres:

    image: postgres:16-alpine

    container_name: j3d-postgres

    restart: unless-stopped

    environment:

      POSTGRES_USER: j3d_admin

      POSTGRES_PASSWORD: j3d_dev_password

      POSTGRES_DB: j3d_platform

    ports:

      - "5432:5432"

    volumes:

      - j3d_pg_data:/var/lib/postgresql/data

  redis:

    image: redis:7.4-alpine

    container_name: j3d-redis

    restart: unless-stopped

    ports:

      - "6379:6379"

    volumes:

      - j3d_redis_data:/data

  minio:

    image: minio/minio:latest

    container_name: j3d-minio

    restart: unless-stopped

    environment:

      MINIO_ROOT_USER: j3d_minio_user

      MINIO_ROOT_PASSWORD: j3d_minio_password

    ports:

      - "9000:9000"

      - "9001:9001"

    volumes:

      - j3d_minio_data:/data

  mailpit:

    image: axllent/mailpit:latest

    container_name: j3d-mailpit

    restart: unless-stopped

    ports:

      - "1025:1025"

      - "8025:8025"

volumes:

  j3d_pg_data:

  j3d_redis_data:

  j3d_minio_data:

2. Environment Variables Template (.env.example)

# Application Ports & Public URLs

NODE_ENV="development"

PORT_WEB="3000"

PORT_API="4000"

NEXT_PUBLIC_SITE_URL="https://j3d.msoms.ai"

NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"

NEXT_PUBLIC_WS_URL="http://localhost:4000"

# GitHub Automated Footer Version Metadata

NEXT_PUBLIC_APP_VERSION="v1.0.0-local"

NEXT_PUBLIC_BUILD_DATE="2026-11-07T00:00:00Z"

NEXT_PUBLIC_GITHUB_REPO="https://github.com/msoms-ai/j3d"

# PostgreSQL 16 (Row-Level Security Enabled)

DATABASE_URL="postgresql://j3d_admin:j3d_dev_password@localhost:5432/j3d_platform?schema=public"

# Redis 7.4 (Sessions, Geospatial Sets, Redlock, OTP Cache)

REDIS_URL="redis://localhost:6379"

# Cookie Signing Secrets & AES-256-GCM Master Key for Admin Config Vault

JWT_ACCESS_SECRET="replace-with-64-char-hex-secret-for-http-only-access-cookie"

JWT_REFRESH_SECRET="replace-with-64-char-hex-secret-for-http-only-refresh-cookie"

MASTER_ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# Initial Seed Values for Admin AI Configuration (Hot-Swappable in Admin UI)

DEFAULT_GEMINI_API_KEY="AIzaSyDummyGeminiKeyForLocalSeedOnly"

DEFAULT_GEMINI_TEXT_MODEL="gemini-2.5-pro"

DEFAULT_GEMINI_IMAGE_MODEL="imagen-3.0-generate-002"

# Initial Seed Values for Admin Email Configuration (Hot-Swappable in Admin UI)

DEFAULT_SENDER_EMAIL="noreply@msoms.ai"

DEFAULT_RESEND_API_KEY="re_DummyResendKeyForLocalSeedOnly"

# S3 / Cloudflare R2 Object Storage (.STL Vault, Print Photos & Profile Media)

S3_ENDPOINT="http://localhost:9000"

S3_BUCKET="j3d-assets"

S3_ACCESS_KEY="j3d_minio_user"

S3_SECRET_KEY="j3d_minio_password"

S3_PUBLIC_BASE_URL="http://localhost:9000/j3d-assets"

# OpenStreetMap Nominatim Geocoding Header

OSM_NOMINATIM_USER_AGENT="j3d.msoms.ai/1.0 (noreply@msoms.ai)"

3. Multi-Tenant & 4-Role UAE Seed Data (prisma/seed.ts)

Running npm run db:seed provisions the local database with:

Default Tenant: msoms-uae (J3D UAE Marketplace / منصة J3D الإمارات).

All 10 Categories & 7 Cultural Templates: Pre-configured parametric CSG archetypes for:

Eid Al-Fitr 10 AED Giveaway Ring (14.5mm inner rolled banknote cylinder slot + embossed "عيدكم مبارك • Eid Mubarak")

Islamic Calligraphy Desk Stand (Quranic verse / Duaa / Hadith)

Arab World Congratulations Plaque (Graduation, Wedding, Promotion)

Newborn Keepsake Plaque (Baby name, year, boy/girl palette)

Business 3D QR Code & Room Door Stand

School STEM Project Kit

Home DIY Mounting Bracket

Four Pre-Verified Demo Accounts (One for Each User Group):

Administrator (ADMIN): admin@msoms.ai

Client (CLIENT): client@msoms.ai (Al Barsha 2, Dubai — 25.1012° N, 55.2054° E)

3D Printer Owner (PRINTER_PROVIDER): maker@msoms.ai (Jumeirah Village Circle, Dubai — equipped with Bambu Lab X1C 4-color AMS, 256×256×256mm build volume)

Delivery Service (DELIVERY_PROVIDER): courier@msoms.ai (Active UAE courier in Dubai)