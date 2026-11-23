#!/usr/bin/env bash
# ==============================================================================
# J3D Platform (j3d.msoms.ai) Production Release Deployment Script
# Usage: ./scripts/deploy-release.sh [APP_VERSION] [BUILD_DATE]
# ==============================================================================

set -euo pipefail

APP_VERSION="${1:-v1.0.0-manual}"
BUILD_DATE="${2:-$(date -u +"%Y-%m-%d %H:%M UTC")}"

echo "=========================================================="
echo "🚀 Deploying J3D Platform Release: ${APP_VERSION}"
echo "📅 Build Timestamp: ${BUILD_DATE}"
echo "=========================================================="

# Export build metadata for Next.js injection
export NEXT_PUBLIC_APP_VERSION="${APP_VERSION}"
export NEXT_PUBLIC_BUILD_DATE="${BUILD_DATE}"

# Update repository
echo "📥 Pulling latest release from Git..."
git fetch origin main
git reset --hard origin/main

# Install dependencies cleanly
echo "📦 Installing clean dependencies..."
npm ci --legacy-peer-deps

# Build shared types package
echo "🔨 Building shared types..."
npm run build --prefix packages/shared-types

# Run Prisma migrations
echo "🗄️ Applying PostgreSQL database migrations..."
cd apps/api
npx prisma db push --skip-generate
npx prisma generate
cd ../..

# Build Backend API
echo "⚙️ Compiling NestJS API..."
npm run build --prefix apps/api

# Build Frontend Web Application with stamped version
echo "🎨 Compiling Next.js 15 Web Application with ${APP_VERSION}..."
NEXT_PUBLIC_APP_VERSION="${APP_VERSION}" npm run build --prefix apps/web

# Restart services via PM2 or Docker
if command -v pm2 &> /dev/null; then
  echo "🔄 Reloading PM2 processes..."
  pm2 reload ecosystem.config.js || pm2 restart all
elif command -v docker &> /dev/null; then
  echo "🔄 Restarting application containers..."
  docker compose -f docker-compose.prod.yml restart web api || true
fi

echo "=========================================================="
echo "✅ J3D Platform ${APP_VERSION} deployed successfully!"
echo "🌐 URL: https://j3d.msoms.ai"
echo "=========================================================="
