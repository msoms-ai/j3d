Security, Authentication, Payment Escrow & AI Guardrails (j3d.msoms.ai)

1. Authentication, Mandatory Email OTP & Session Security

1.1 Mandatory 6-Digit Email OTP Flows (noreply@msoms.ai)

Every identity-critical action on j3d.msoms.ai requires verification via a 6-digit cryptographic OTP generated using Node.js crypto.randomInt(100000, 999999), hashed with Argon2id in Redis (TTL = 600s, max 5 attempts), and delivered via Resend from noreply@msoms.ai in a responsive Arabic (RTL) or English (LTR) HTML email:

Account Registration (REGISTER_OTP): Newly registered accounts (CLIENT, PRINTER_PROVIDER, DELIVERY_PROVIDER) start in PENDING_OTP status and cannot log in or bid until the 6-digit email OTP is confirmed.

Lost Password Reset (RESET_PASSWORD_OTP): Initiating a password reset dispatches a 6-digit OTP to the registered email; the password is updated only after verifying the OTP and revoking all active sessions.

Profile Email Change (CHANGE_EMAIL_OTP): Requesting an email change from the User Profile page sends a 6-digit OTP to the new email address and a security alert notification to the old email address.

Profile Password Change (CHANGE_PASSWORD_OTP): Changing the password from the User Profile page requires verifying the current password plus confirming a 6-digit OTP sent to the user's email.

1.2 Cookie & Token Hardening

Password Hashing: Argon2id (memoryCost: 65536, timeCost: 3, parallelism: 4).

Access Cookie (__Host-j3d_access): HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=900 (15 minutes). Contains { sub, tenantId, role, locale }.

Refresh Cookie (__Host-j3d_refresh): HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh; Max-Age=604800 (7 days). Rotated on every refresh with token-family reuse detection in Redis.

CSRF Protection: Double-Submit Cookie (__Host-j3d_csrf) validated against the X-CSRF-Token request header on all state-mutating requests (POST, PUT, PATCH, DELETE).

2. Role-Based Access Control (RBAC) Permission Matrix

Platform Action / Endpoint Scope

ADMIN

CLIENT

PRINTER_PROVIDER

DELIVERY_PROVIDER

Use Typeform AI Wizard & 3D Studio Preview

✅

✅

✅

❌

Submit Print Order & Pre-Authorize AED Escrow

✅

✅

❌

❌

View Open Print Jobs, Download .STL & Submit Print Bid

✅

Own Order

✅

❌

Upload Batch Print Photo & Generate Pickup OTP

✅

❌

Assigned Printer

❌

View Ready-for-Pickup Deliveries & Submit Delivery Bid

✅

❌

❌

✅

Verify Pickup OTP & Delivery OTP Handshakes

✅

❌

❌

Assigned Driver

Profile Settings, OSM Map Location & AI Avatar/Banner Gen

✅

✅

✅

✅

Admin Users CRUD, STL Vault CRUD, Categories/Templates CRUD

✅

❌

❌

❌

Admin Disputes & Alarms Resolution + Immutable Audit Logs

✅

Own Dispute

Own Dispute

Own Dispute

Admin Gemini AI Key/Model Config & Resend Email Config

✅

❌

❌

❌

3. Envelope Encryption for Dynamic Admin API Keys (Gemini & Resend)

Because administrators can configure and test the Google Gemini API key and Resend API key directly from the Admin Panel:

AES-256-GCM Envelope Encryption: Before storing gemini_api_key or resend_api_key in the platform_configs table, VaultCryptoService encrypts the plaintext key using a 256-bit MASTER_ENCRYPTION_KEY (injected via host environment variable) with a unique 96-bit IV and 128-bit authentication tag (iv:authTag:ciphertext).

Zero Plaintext Readback: GET /api/v1/admin/config/ai and GET /api/v1/admin/config/email never return the raw secret key to the frontend; they return a masked preview (AIzaSy••••••9Q2a or re_8xK••••••4mP) along with the last health-check timestamp and status.

4. End-to-End Payment & Reverse-Bidding Security Architecture

To close all loopholes in the dual-stage pricing workflow (Client budget range vs. Printer Provider bid vs. Delivery Provider bid):

4.1 Algorithmic Minimum Floor Enforcement

Minimum Print Floor ($\text{AED}$): $$\text{MinPrintBudget}{\text{AED}} = \max\left(15, \lceil (\text{Volume}{\text{cm}^3} \times \text{MaterialRate}{\text{AED/cm}^3} \times \text{MulticolorFactor} + \text{SetupFee}{\text{AED}}) \times \text{Quantity} \rceil\right)$$

Prevents a Client from requesting 100 pieces of an Eid 10 AED Giveaway Ring with a maximum budget of 10 AED.

Minimum Delivery Floor ($\text{AED}$): $$\text{MinDeliveryBudget}{\text{AED}} = \max\left(15, \lceil 12 + (\text{Distance}{\text{km}} \times 1.25) \rceil\right)$$

Ensures delivery budgets realistically cover fuel and time across UAE emirates.

4.2 Exact Matching, Instant Savings Refund & Counter-Offer Rules

Case A — Provider Bid Within Client Max Budget ($\text{Bid}{\text{AED}} \le \text{ClientMax}{\text{AED}}$):

Example: Client sets a maximum print budget of 100 AED for 1 QR code stand. Printer Provider enters 75 AED and clicks Accept.

The system acquires the Redis Redlock (j3d:lock:print:{orderId}), assigns the order to the provider, locks the agreed print price at 75 AED, and immediately releases the 25 AED difference on the Client's payment pre-authorization.

Case B — Provider Bid Above Client Max Budget ($\text{Bid}{\text{AED}} > \text{ClientMax}{\text{AED}}$):

Example: Client sets 100 AED, but providers submit expected pay of 125 AED and 130 AED.

The system records these as COUNTER_OFFER bids (status = 'BIDDING_PRINTER') and notifies the Client via Email (noreply@msoms.ai) and in-app alert: "No 3D Printing Providers accepted your order at 100 AED. The lowest verified provider offer is 125 AED. Increase your budget or accept 125 AED with one click."

Case C — Delivery Provider Bid Evaluation:

Applies the exact same instant-match ($\le \text{ClientMaxDelivery}{\text{AED}}$) or counter-offer notification ($> \text{ClientMaxDelivery}{\text{AED}}$) workflow when the order enters READY_FOR_PICKUP.

Provider Bond & Anti-Gaming:

Providers cannot see the exact ClientMaxBudget number (instead seeing a Budget Compatibility Indicator and recommended market range) so they bid competitively (e.g., 75 AED) rather than automatically typing 100 AED every time.

5. AI Guardrails & 3D Printing Safety Policy

System Prompt Isolation & Structured Output Validation:

User inputs in the Typeform wizard and AI Avatar/Banner generator are passed inside XML-delimited <user_input> blocks and validated with strict Zod schemas.

Prohibited 3D Item Screening:

Before generating a 3D mesh or .STL file, Gemini safety filters and a dedicated classifier block requests for weapons, firearm components, key-duplication blanks, or hazardous items, logging a HIGH severity alarm in the Admin Alarms dashboard.

Per-User Token & Generation Quotas:

Rate-limited via Redis sliding windows: max 15 AI 3D synthesis calls per hour and 10 AI Avatar/Banner image generations per day per authenticated user.