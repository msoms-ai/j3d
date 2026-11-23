J3D (j3d.msoms.ai) — AI-Powered On-Demand 3D Printing & Delivery Marketplace

Initiative: An initiative from msoms.ai 2026Production Domain: https://j3d.msoms.aiGitHub Repository: https://github.com/msoms-ai/j3dDesign System: Chakra UI v3 (llms-full.txt) & Chakra UI v3 Migration Guide

1. Project Overview & Mission Statement

J3D (j3d.msoms.ai) is a multi-tenant, bilingual (Arabic RTL & English LTR) web platform built by msoms.ai that operates as the "Uber for 3D Printing" across the United Arab Emirates. Many home users own 3D printers as a hobby, yet their printers sit idle when they lack new project ideas. Meanwhile, families, students, and businesses across the UAE frequently need custom 3D-printed products—such as Eid Al-Fitr 10 AED currency holder rings, Islamic calligraphy desk stands, newborn Mabrouk keepsakes, and corporate QR/NFC stands—without knowing how to model 3D CAD files.

J3D unites four distinct user groups (Administrators, Clients, 3D Printer Owners, and Delivery Services) into a single real-time workflow:

AI Typeform-to-STL Studio: Guides clients through a conversational questionnaire powered by Google Gemini, renders a live 3D preview canvas (Three.js / React Three Fiber) with material, mono/multicolor, and fixed-step scaling controls, and compiles a watertight .STL file automatically.

Instant Reverse-Bidding Print Marketplace: Dispatches new orders and their .STL files to registered 3D Printer Providers, assigning the job to the first verified maker who accepts within the client's budget (or routing structured counter-offers if the client's budget is too low).

Integrated UAE Last-Mile Delivery Network: Alerts registered UAE Delivery Personnel once the print is packaged (UNDER_DELIVERY), matching couriers against the client's delivery budget and securing custody transfers with dual 6-digit OTP handshakes.

2. System Architecture Diagram

graph TB

    subgraph "Edge & Reverse Proxy Layer"

        CF[Cloudflare DNS / WAF / CDN] --> CADDY[Caddy v2 TLS Proxy :443]

    end

    subgraph "Frontend Web Application (apps/web)"

        CADDY --> NEXT[Next.js 15 App Router :3000]

        NEXT --> CHAKRA[Chakra UI v3 System: RTL/LTR + Dark/Light]

        NEXT --> R3F[Three.js / React Three Fiber 3D Studio Canvas]

        NEXT --> LEAFLET[OpenStreetMap + Leaflet Geolocation Picker]

    end

    subgraph "Backend API & Workers (apps/api)"

        CADDY --> NEST[NestJS 11 Modular Monolith :4000]

        NEST --> WS[Socket.IO Real-Time Job & Bid Gateway]

        NEST --> WORKER[BullMQ Worker: OpenJSCAD Parametric STL Compiler]

        NEST --> GEMINI[Google Gemini API: Dynamic Questions, Avatar Gen & Vision Check]

        NEST --> RESEND[Resend.com API: Bilingual HTML OTP & Order Emails]

    end

    subgraph "Persistence, Cache & Object Storage"

        NEST --> PG[(PostgreSQL 16 + Row-Level Security)]

        WORKER --> PG

        NEST --> REDIS[(Redis 7.4: Sessions, Geo-Index, Redlock, OTPs)]

        WORKER --> REDIS

        NEST --> S3[(Cloudflare R2 / MinIO S3: .STL Vault & Media)]

        WORKER --> S3

    end

3. Core Technology Stack Selection

Layer

Technology

Rationale

Frontend Framework

Next.js 15 (App Router) + React 19 + TypeScript 5.7

Server-first rendering, built-in next-intl /ar and /en locale routing, and strict type safety

UI Design System

Chakra UI v3 + next-themes + lucide-react

Strict adherence to createSystem, defineConfig, semantic tokens, RTL logical properties, and Light/Dark mode

3D Preview & CSG Engine

Three.js + @react-three/fiber + @jscad/modeling

Real-time interactive build-plate rendering, multicolor zone preview, and watertight binary .STL generation

Maps & Geolocation

OpenStreetMap + Leaflet + Nominatim API

100% open-source interactive map pin detection and UAE district/emirate reverse geocoding

Backend Framework

NestJS 11 (Node.js 22 LTS) + Socket.IO

Clean modular monolith boundaries, WebSocket real-time bidding radar, and OpenAPI schema generation

Database & Isolation

PostgreSQL 16 + Prisma ORM

Relational integrity with mandatory tenant_id and PostgreSQL Row-Level Security (RLS) policies

Cache, Locks & Queues

Redis 7.4 + BullMQ

Sub-millisecond Redlock concurrency for "first-to-accept" job claims, geospatial indexing, and async STL jobs

AI & LLM Engine

Google Gemini SDK (@google/genai)

Dynamic Typeform questions, parametric CSG JSON synthesis, profile avatar/banner generation, and model hot-swapping

Transactional Email

Resend (resend.com)

High-deliverability bilingual HTML OTP and order lifecycle emails sent from noreply@msoms.ai

4. Monorepo Directory Structure (j3d)

j3d/

├── .github/workflows/                   # Automated CI tests & Git SHA version stamping for j3d.msoms.ai

├── apps/

│   ├── web/                             # Next.js 15 App Router Frontend (Chakra UI v3)

│   │   ├── messages/                    # ar.json (RTL Arabic) & en.json (LTR English)

│   │   └── src/

│   │       ├── app/[locale]/            # Localized pages: Landing Typeform, Orders, Provider, Delivery, Profile, Admin, Legal

│   │       ├── components/              # GlobalHeader, NavigationDrawer, GlobalFooter, TypeformWizard, ThreeStlCanvas

│   │       └── theme/system.ts          # Chakra UI v3 createSystem & defineConfig 3D printing theme

│   └── api/                             # NestJS 11 Backend API & BullMQ Workers

│       ├── prisma/                      # schema.prisma, RLS SQL migrations, and UAE catalog seed

│       └── src/modules/                 # auth, studio, orders, escrow, profile, admin, audit

├── docker-compose.yml                   # Local development stack (Postgres, Redis, MinIO, Mailpit)

└── package.json

5. Developer & AI Agent Bootstrap Guide

Provision Local Services: Start the local PostgreSQL 16, Redis 7.4, MinIO S3, and Mailpit containers defined in LOCAL_SETUP.md.

Initialize Database & RLS: Run the Prisma schema migration (npm run db:migrate) and seed script (npm run db:seed) to populate the msoms-uae tenant, 10 categories, 7 cultural templates, and 4 demo role accounts.

Start Development Servers: Launch npm run dev at the monorepo root to serve the Next.js 15 frontend on port 3000 and NestJS 11 API on port 4000.