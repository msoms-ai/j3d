System Architecture & Subsystem Specifications (j3d.msoms.ai)

1. Service Boundaries: Modular Monolith + Dedicated Worker Pool

J3D is structured as a Modular Monolith in NestJS 11 paired with a separate BullMQ Worker Pool for CPU-intensive 3D Constructive Solid Geometry (CSG) mesh compilation and AI calls. This design prevents 3D .STL slicing and mesh boolean operations from blocking real-time WebSocket bidding or HTTP API requests while avoiding distributed microservice network overhead.

Module

Responsibility

Key Dependencies

AuthModule

Email/password authentication, mandatory 6-digit OTP verification (REGISTER, RESET_PASSWORD, CHANGE_EMAIL, CHANGE_PASSWORD), HTTP-only cookie management, and RBAC guards

@node-rs/argon2, @nestjs/jwt, Redis

StudioAiModule

Orchestrates Typeform Step 3 dynamic questions via Google Gemini, generates parametric CSG descriptors, compiles watertight binary .STL files via @jscad/modeling, and computes volume ($\text{cm}^3$) and weight (g)

@google/genai, @jscad/modeling, BullMQ, Cloudflare R2 / S3

OrderDispatchModule

Manages the 13-state order lifecycle, Redis geospatial proximity matching (GEOSEARCH), Redlock "first-to-accept" concurrency locks, and Socket.IO job notifications

socket.io, ioredis, Prisma

EscrowPaymentModule

Computes filament and road-distance minimum budget floors in AED, locks client pre-authorization holds, evaluates provider/driver bids against client caps, queues over-budget counter-offers, and settles wallets on OTP verification

Stripe / PayTabs UAE Payment Intent API, Prisma interactive transactions

ProfileMediaModule

Handles user profile updates, OpenStreetMap Nominatim reverse geocoding, custom avatar/banner uploads, and AI image generation via Gemini / Imagen 3

sharp, @aws-sdk/client-s3, @google/genai

AdminGovernanceModule

Powers paginated User CRUD with role filtering, .STL file vault CRUD, Categories/Templates CRUD, Alarms & Dispute Resolution Center, runtime Gemini API Key/Model manager, Resend Email configuration & health check probe, and Audit Logs

AES-256-GCM Vault, Resend, @google/genai

2. Reverse Proxy, Load Balancing & TLS Termination (j3d.msoms.ai)

Incoming traffic to https://j3d.msoms.ai passes through Cloudflare (DDoS mitigation, WAF, and R2 CDN edge caching for static assets and .STL previews) to a Caddy v2 reverse proxy on the production host.

j3d.msoms.ai {

    encode zstd gzip

    header {

        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"

        X-Content-Type-Options "nosniff"

        X-Frame-Options "DENY"

        Referrer-Policy "strict-origin-when-cross-origin"

        Permissions-Policy "geolocation=(self), camera=(self)"

        -Server

    }

    handle /api/* {

        reverse_proxy api:4000 {

            header_up X-Real-IP {remote_host}

            header_up X-Forwarded-Proto {scheme}

            health_uri /api/v1/health

            health_interval 10s

        }

    }

    handle /socket.io/* {

        reverse_proxy api:4000 {

            header_up Upgrade {http.request.header.Upgrade}

            header_up Connection "Upgrade"

        }

    }

    handle {

        reverse_proxy web:3000

    }

}

3. Caching, Geospatial Indexing & Distributed Locks (Redis 7.4)

Redis Key Pattern

Data Type

TTL

Purpose & Invalidation Strategy

j3d:cfg:ai:{tenantId}

Hash

3600s

Cached active Gemini model ID, temperature, and decrypted key fingerprint. Invalidated immediately on Admin AI Config update.

j3d:cfg:email:{tenantId}

Hash

3600s

Cached Resend sender email (noreply@msoms.ai) and health status. Invalidated on Admin Email Config update.

j3d:catalog:{tenantId}:{locale}

String (JSON)

1800s

Active 3D categories and cultural templates for Typeform Steps 1 & 2. Invalidated on Admin Category/Template CRUD.

j3d:otp:{purpose}:{email}

Hash

600s

Argon2id-hashed 6-digit OTP code, creation timestamp, and failed attempt counter (locked after 5 failed attempts).

j3d:geo:printers:{tenantId}

GeoSet (GEOADD)

Persistent

Longitude/latitude index of verified 3D Printer Providers across UAE emirates. Updated on profile address change.

j3d:geo:drivers:{tenantId}

GeoSet (GEOADD)

300s

Real-time coordinates of online UAE Delivery Personnel for proximity dispatch and road-distance floor calculation.

j3d:lock:print:{orderId}

String (SET NX PX)

10000ms

Distributed mutex ensuring only the very first Printer Provider to click "Accept" within budget claims the job.

j3d:lock:delivery:{orderId}

String (SET NX PX)

10000ms

Distributed mutex ensuring only the very first Delivery Provider to click "Accept" within budget claims the delivery.

4. Hybrid AI-Parametric 3D Studio & Watertight .STL Pipeline

To guarantee that every generated model is 100% manifold (watertight), dimensionally accurate in millimeters, and immediately printable on desktop FDM/SLA printers without manual mesh repair:

Conversational Requirement Extraction (Typeform Q1 -> Q2 -> Q3):

Q1 (Category Selection): User selects from 10 curated categories (e.g., Giveaways & Event Favors, Desk & Phone Stands, Islamic Decor, Newborn Keepsakes, Business Signage & QR).

Q2 (Cultural Template Selection): User selects from 7 base templates (e.g., Islamic Phrases: Quran/Duaa/Hadith, Congratulations: Eid/Graduation/Marriage, Newborn: Name/Year/Boy-Girl, Business: QR Stand/Door Title, School Project, Home DIY, Custom).

Q3 (Gemini Dynamic Deep-Dive): StudioAiService calls the active Gemini model configured by the Admin with responseMimeType: "application/json" to ask 2–4 contextual questions (e.g., for the Eid Al-Fitr 10 AED Giveaway Ring, asking for the greeting text, font style, rolled banknote slot diameter 14.5mm, and batch quantity 50–100 pcs).

Parametric CSG Descriptor & .STL Compilation:

Gemini outputs a strongly typed ParametricModelSpec JSON object.

Both the browser preview (@react-three/fiber) and the backend BullMQ worker (@jscad/modeling + opentype.js for Arabic/English vector extrusion) execute deterministic CSG operations (cylinders, rings, chamfers, QR code raised voxel matrices, and extruded Arabic calligraphy).

The backend serializes the mesh to binary .STL, computes exact volume ($\text{cm}^3$), bounding box ($X \times Y \times Z\text{ mm}$), and estimated filament weight ($\text{Volume}{\text{cm}^3} \times \text{MaterialDensity}{\text{g/cm}^3}$), and uploads the .STL to S3/R2 with a signed download URL.

Interactive Studio Controls on the Canvas:

Material Selector: PLA ($1.24\text{ g/cm}^3$), PLA Silk ($1.25\text{ g/cm}^3$), PETG ($1.27\text{ g/cm}^3$), ABS ($1.04\text{ g/cm}^3$), ASA ($1.07\text{ g/cm}^3$), TPU 95A ($1.21\text{ g/cm}^3$), Standard Resin ($1.18\text{ g/cm}^3$).

Color Mode Selector: Mono Color (single hex swatch applied to whole mesh) or Multicolor (up to 4 distinct color zones for AMS/MMU printers, such as Base Body, Raised Text/Calligraphy, Inner Ring Trim, and QR Matrix).

Fixed-Step Printer Scale Slider: Discrete snaps (50%, 75%, 100%, 125%, 150%, 200%) that dynamically update the millimeter dimensions ($X, Y, Z$), ensure the object fits standard printer beds (180×180mm Bambu A1 Mini, 256×256mm Bambu X1C/P1S, 300×300mm Creality K1 Max), and recalculate the minimum print budget floor in real time.

5. Transactional Email Subsystem (noreply@msoms.ai via Resend)

All platform emails are dispatched asynchronously via a BullMQ email-dispatch queue using the Resend SDK:

Sender Identity: J3D by msoms.ai <noreply@msoms.ai> (configurable in Admin Panel -> Email Configuration).

Bilingual Localization: Automatically renders RTL Arabic (dir="rtl", Cairo/IBM Plex Sans Arabic font stack) or LTR English (dir="ltr", Plus Jakarta Sans) based on user.preferredLocale.

Health Check Probe: The Admin Email Configuration page includes a "Check API Status" button (POST /api/v1/admin/config/email/verify) that calls Resend's Domains API (GET https://api.resend.com/domains) to verify API key validity, SPF/DKIM verification for msoms.ai, and latency in milliseconds.