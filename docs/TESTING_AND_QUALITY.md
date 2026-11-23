Testing Strategy, Quality Gates & CI/CD Pipeline (j3d.msoms.ai)

1. Unit, Integration & E2E Testing Plan (80%+ Coverage Floor)

Test Suite

Framework

Target Coverage

Core Verification Scope

Backend Unit & CSG Mesh Tests

Jest

85%+

Validates that every parametric CSG archetype (including the Eid 10 AED rolled-note ring and Business 3D QR stand) generates a manifold binary .STL buffer with positive volume ($\text{cm}^3$) and accurate AED floor pricing.

API & RLS Integration Tests

Jest + Supertest

85%+

Verifies PostgreSQL Row-Level Security (RLS) across all 4 user roles (ADMIN, CLIENT, PRINTER_PROVIDER, DELIVERY_PROVIDER), Redis Redlock concurrency on simultaneous job claims, and OTP verification rate limits.

Frontend Component Tests

Vitest + Testing Library

80%+

Tests Chakra UI v3 Typeform wizard steps, RTL/LTR layout switching, Light/Dark mode persistence, and budget slider validation.

End-to-End (E2E) Workflow Tests

Playwright

All critical paths

Runs a multi-context browser test simulating the complete Eid Al-Fitr 10 AED Giveaway Ring scenario across Client, 3D Printer Provider, Delivery Provider, and Admin sessions.

Key E2E Scenarios Verified in Playwright (apps/web/e2e/j3d-marketplace.spec.ts)

Scenario A — Instant Match Within Budget:

Client completes the Typeform wizard for 100 pieces of the Eid Al-Fitr 10 AED Ring, previews the 3D canvas, sets Max Print Budget = 220 AED and Max Delivery Budget = 25 AED, and submits.

Printer Provider downloads the .STL file, bids 190 AED (<= 220 AED), and wins immediate assignment (PRINTING), while 30 AED is released back to the Client.

Printer Provider uploads batch packaging photo (READY_FOR_PICKUP).

Delivery Provider bids 22 AED (<= 25 AED), wins immediate assignment (DELIVERY_ASSIGNED), verifies the Printer's 6-digit Pickup OTP (IN_TRANSIT), and verifies the Client's 6-digit Delivery OTP (COMPLETED).

Scenario B — Over-Budget Counter-Offer Flow:

Client sets Max Print Budget = 100 AED for a custom stand.

Printer Provider submits expected pay of 135 AED (> 100 AED).

Verifies that the order transitions to BIDDING_PRINTER, sends the low-budget alert email from noreply@msoms.ai, and allows the Client to accept 135 AED or raise their budget slider.

2. In-Code Documentation & Type Safety Standards

Strict TypeScript: strict: true, noImplicitAny: true, and shared Zod schemas between apps/web and apps/api.

TSDoc Annotations: Every service method, CSG generator function, and REST controller action includes structured TSDoc comments documenting @param, @returns, @throws, and RBAC/RLS security invariants.

3. GitHub Actions CI/CD & Automatic Footer Version Injection

Every push to main on https://github.com/msoms-ai/j3d executes automated quality gates, computes the new semantic version and short commit SHA (v1.2.0-sha.9f8a21c), injects it into the Next.js build so the right side of the Global Footer updates automatically, and deploys via SSH to j3d.msoms.ai.

.github/workflows/ci-cd.yml Specification

name: J3D CI/CD Pipeline & Version Stamp

on:

  push:

    branches: [main]

  pull_request:

    branches: [main]

jobs:

  quality-and-tests:

    runs-on: ubuntu-latest

    steps:

      - name: Checkout Repository

        uses: actions/checkout@v4

      - name: Setup Node.js 22 LTS

        uses: actions/setup-node@v4

        with:

          node-version: 22

          cache: npm

      - name: Install Dependencies

        run: npm ci

      - name: Run Linter & Typecheck

        run: |

          npm run lint

          npm run typecheck

      - name: Run Unit & Integration Tests with Coverage Gate

        run: npm run test:cov

  deploy-to-j3d-host:

    needs: quality-and-tests

    if: github.ref == 'refs/heads/main'

    runs-on: ubuntu-latest

    steps:

      - name: Checkout Repository

        uses: actions/checkout@v4

        with:

          fetch-depth: 0

      - name: Generate Footer Version String from Git Commit

        id: build_meta

        run: |

          PKG_VERSION=$(node -p "require('./package.json').version")

          COMMIT_SHA=$(git rev-parse --short HEAD)

          COMMIT_DATE=$(date -u +"%Y-%m-%d %H:%M UTC")

          echo "NEXT_PUBLIC_APP_VERSION=v${PKG_VERSION}-${COMMIT_SHA}" >> "$GITHUB_OUTPUT"

          echo "NEXT_PUBLIC_BUILD_DATE=${COMMIT_DATE}" >> "$GITHUB_OUTPUT"

      - name: Trigger Production Deployment on j3d.msoms.ai via SSH

        uses: appleboy/ssh-action@v1.1.0

        with:

          host: ${{ secrets.J3D_SSH_HOST }}

          username: ${{ secrets.J3D_SSH_USER }}

          key: ${{ secrets.J3D_SSH_PRIVATE_KEY }}

          port: ${{ secrets.J3D_SSH_PORT }}

          script: |

            cd /srv/j3d

            ./scripts/deploy-release.sh "${{ steps.build_meta.outputs.NEXT_PUBLIC_APP_VERSION }}" "${{ steps.build_meta.outputs.NEXT_PUBLIC_BUILD_DATE }}"

