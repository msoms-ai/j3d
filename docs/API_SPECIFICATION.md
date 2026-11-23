REST & WebSocket API Specification (j3d.msoms.ai)

All REST endpoints are mounted under /api/v1 and return standardized JSON envelopes:

{

  "success": true,

  "data": {},

  "meta": {

    "page": 1,

    "limit": 20,

    "total": 148,

    "platformVersion": "v1.2.0-sha.9f8a21c"

  }

}

1. Authentication & Email OTP Endpoints (/api/v1/auth)

Method

Route

Access

Request / Action Summary

POST

/auth/register

Public

Accepts { email, password, fullName, phone, role, locale }. Creates user in PENDING_OTP status and sends a 6-digit HTML OTP from noreply@msoms.ai via Resend.

POST

/auth/verify-otp

Public

Verifies { email, otpCode, purpose } (REGISTER_OTP, RESET_PASSWORD_OTP, CHANGE_EMAIL_OTP, CHANGE_PASSWORD_OTP). Activates user and sets __Host-j3d_access & __Host-j3d_refresh cookies.

POST

/auth/login

Public

Authenticates active user credentials and issues HTTP-only session cookies.

POST

/auth/forgot-password

Public

Sends a localized 6-digit password reset OTP email from noreply@msoms.ai.

POST

/auth/reset-password

Public

Verifies { email, otpCode, newPassword }, updates Argon2id hash, and revokes prior sessions.

POST

/auth/logout

Authenticated

Revokes refresh token in Redis and clears cookies.

2. AI Typeform Wizard & 3D Parametric Studio (/api/v1/studio)

Method

Route

Access

Request / Action Summary

GET

/studio/catalog

Public

Returns all active 3D printing categories (Q1) and cultural/functional templates (Q2) in ar and en.

POST

/studio/questions

Public

Accepts { categorySlug, templateSlug, userNotes, locale }. Calls Google Gemini to generate 2–4 dynamic Step 3 follow-up questions tailored to the item (e.g., asking for the 10 AED note slot orientation, custom Eid text, or QR target URL).

POST

/studio/generate-stl

Public / Client

Synthesizes the parametric CSG descriptor, compiles the watertight binary .STL mesh via @jscad/modeling, uploads to S3/R2, and returns { stlFileId, downloadUrl, dimXmm, dimYmm, dimZmm, volumeCm3, estimatedWeightG, unitFloorAed, colorZones }.

PATCH

/studio/stl/:id

Client

Adjusts material, colorMode (MONO / MULTICOLOR), colorHexList, scalePercent (50, 75, 100, 125, 150, 200), or infillPercent, recalculating dimensions and minimum AED floor price in real time.

3. Orders, Reverse-Bidding & Lifecycle Management (/api/v1/orders)

3.1 Complete Order State Machine & Exception Handling

stateDiagram-v2

    [*] --> PENDING_PRINTER : Client Approves 3D Canvas & Sets Print/Delivery Max Budgets (AED)

    PENDING_PRINTER --> PRINTING : Printer Bid <= Client Max Print Budget (Instant Assignment)

    PENDING_PRINTER --> BIDDING_PRINTER : Printer Bid > Client Max (Counter-Offer Queued)

    BIDDING_PRINTER --> PRINTING : Client Accepts Counter-Offer or Raises Print Budget

    PRINTING --> PRINT_COMPLETED_PACKAGED : Printer Uploads Batch Photo (Gemini Vision Checked)

    PRINT_COMPLETED_PACKAGED --> READY_FOR_PICKUP : System Broadcasts Job to UAE Delivery Fleet

    READY_FOR_PICKUP --> DELIVERY_ASSIGNED : Driver Bid <= Client Max Delivery Budget (Instant Assignment)

    READY_FOR_PICKUP --> BIDDING_DELIVERY : Driver Bid > Client Max (Counter-Offer Queued)

    BIDDING_DELIVERY --> DELIVERY_ASSIGNED : Client Accepts Driver Counter-Offer or Raises Delivery Budget

    DELIVERY_ASSIGNED --> IN_TRANSIT : Driver Enters Printer's 6-Digit Pickup OTP

    IN_TRANSIT --> DELIVERED : Driver Enters Client's 6-Digit Delivery OTP

    DELIVERED --> COMPLETED : Escrow Released to Printer & Driver Wallets

3.2 Handling Delays, Cancellations & Modifications Across All 4 Roles

Modifications & Cancellations before PRINTING: While an order is in PENDING_PRINTER or BIDDING_PRINTER, the Client can edit quantities, adjust budget sliders, or cancel for an immediate 100% escrow release.

Cancellations or Changes during PRINTING: Once a 3D Printer Provider is actively printing, the Client cannot unilaterally alter the .STL file; clicking Request Change / Cancel pauses the order and offers a pro-rata filament compensation split or escalates to Admin Dispute review.

Automated SLA Delay Timers:

If a PRINTER_PROVIDER exceeds requiredByDate without uploading completion photos, a WARNING alarm is raised in the Admin Center and the Client can click Reassign to Marketplace at zero penalty.

If a DELIVERY_PROVIDER fails to collect the package within 90 minutes of accepting DELIVERY_ASSIGNED, the system revokes the courier assignment and re-broadcasts the order as READY_FOR_PICKUP.

3.3 Order & Bidding Endpoints

Method

Route

Access

Request / Action Summary

POST

/orders

CLIENT

Creates order with { stlFileId, quantity, clientMaxPrintBudgetAed, clientMaxDeliveryBudgetAed, dropoffAddress, requiredByDate }, pre-authorizes escrow, and broadcasts order:new_print_job to eligible 3D Printer Providers.

GET

/orders

All 4 Roles

Paginated list of ongoing and historical orders filtered by status, date, and role scope.

POST

/orders/:id/bid-print

PRINTER_PROVIDER

Submits { proposedAmountAed, estimatedHours }. If proposedAmountAed <= clientMaxPrintBudgetAed, acquires Redlock, assigns order (PRINTING), and refunds savings to Client. If higher, logs counter-offer (BIDDING_PRINTER) and notifies Client.

POST

/orders/:id/accept-counter

CLIENT

Allows Client to accept a Printer Provider or Delivery Provider counter-offer above their initial budget cap.

POST

/orders/:id/complete-print

PRINTER_PROVIDER

Uploads packaged batch photo, transitions order to READY_FOR_PICKUP (UNDER_DELIVERY), generates 6-digit pickupOtp, and broadcasts order:new_delivery_job to UAE couriers.

POST

/orders/:id/bid-delivery

DELIVERY_PROVIDER

Submits { proposedAmountAed }. If <= clientMaxDeliveryBudgetAed, assigns courier immediately (DELIVERY_ASSIGNED); otherwise logs delivery counter-offer (BIDDING_DELIVERY) and notifies Client.

POST

/orders/:id/verify-pickup-otp

DELIVERY_PROVIDER

Verifies the 6-digit Pickup OTP given by the Printer Provider and moves order to IN_TRANSIT.

POST

/orders/:id/verify-delivery-otp

DELIVERY_PROVIDER

Verifies the 6-digit Delivery OTP given by the Client, moves order to DELIVERED / COMPLETED, and settles escrow payouts.

4. User Profile, Geolocation & AI Avatar/Banner (/api/v1/profile)

Method

Route

Access

Request / Action Summary

GET

/profile/me

All Roles

Returns current user profile, OSM map coordinates, and printer/courier capabilities.

PATCH

/profile/me

All Roles

Updates name, phone, locale, theme, printer fleet specs, and OpenStreetMap coordinates (latitude, longitude, emirate, district, streetAddress).

POST

/profile/email/request-otp

All Roles

Sends 6-digit OTP to new email via noreply@msoms.ai.

POST

/profile/email/confirm-otp

All Roles

Verifies OTP and updates user email.

POST

/profile/password/request-otp

All Roles

Sends 6-digit OTP to current email to authorize password change.

POST

/profile/password/confirm-otp

All Roles

Verifies current password + 6-digit OTP and updates password.

POST

/profile/media/upload

All Roles

Uploads custom Avatar or Profile Banner image (multipart/form-data).

POST

/profile/media/generate-ai

All Roles

Uses the platform's configured Google Gemini API key to generate a custom Avatar or Profile Banner from a short user text description ({ target: "AVATAR" | "BANNER", prompt }).

5. Admin Command Center Endpoints (/api/v1/admin)

Method

Route

Access

Request / Action Summary

GET / POST / PATCH / DELETE

/admin/users

ADMIN

Paginated Users CRUD (?page=1&limit=20&role=PRINTER_PROVIDER&status=ACTIVE&search=...).

GET / DELETE / PATCH

/admin/stl-files

ADMIN

Paginated listing of all generated .STL files, volume/weight metadata, download links, and CRUD actions.

GET / POST / PATCH / DELETE

/admin/categories & /admin/templates

ADMIN

Full CRUD for Typeform categories, cultural templates, and base pricing parameters.

GET / PATCH

/admin/alarms & /admin/disputes

ADMIN

View and resolve platform alarms, inspect 3-way dispute message threads, and trigger escrow refunds/splits.

GET / PUT

/admin/config/ai

ADMIN

View masked Gemini API key, update API key, and select active Gemini text & image models.

POST

/admin/config/ai/refresh-models

ADMIN

Queries https://generativelanguage.googleapis.com/v1beta/models using the active Gemini API key, caches and returns the latest available Gemini models (gemini-2.5-pro, gemini-2.5-flash, imagen-3.0-generate-002) for dropdown selection.

GET / PUT

/admin/config/email

ADMIN

View/update sender email (noreply@msoms.ai) and encrypted Resend API key.

POST

/admin/config/email/check-status

ADMIN

Live probe to Resend API verifying key validity, domain DKIM/SPF status, and latency (ms).

GET

/admin/logs

ADMIN

Paginated, filterable immutable audit logs of all platform actions.