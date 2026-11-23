Frontend Architecture, Chakra UI v3 System & Responsive UX (j3d.msoms.ai)

1. Strict Chakra UI v3 Design System (https://chakra-ui.com/llms-full.txt)

All UI components in apps/web adhere strictly to Chakra UI v3 (llms-full.txt), Chakra UI v3 Migration Guide, and Chakra UI v3 Provider Setup:

System Engine: Configured using createSystem(defaultConfig, customConfig) and defineConfig from @chakra-ui/react.

v3 Prop & Token Conventions:

Uses colorPalette="extruder" or colorPalette="laser" (never v2 colorScheme).

Uses gap on Stack, HStack, and VStack (never v2 spacing).

Wraps all design token values in { value: "..." } objects and uses _light / _dark conditional semantic tokens.

Uses compound slot components (Dialog.Root, Drawer.Root, Field.Root, Select.Root, Slider.Root, Tabs.Root, Menu.Root) and lucide-react icons.

Uses logical CSS properties (ps, pe, ms, me, borderInlineStartWidth) so switching between Arabic (dir="rtl") and English (dir="ltr") mirrors layouts automatically.

apps/web/src/theme/system.ts (3D Printing Additive Manufacturing Theme)

import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const customConfig = defineConfig({

  globalCss: {

    "html, body": {

      bg: "bg.canvas",

      color: "fg.default",

      fontFamily: "body",

      scrollBehavior: "smooth",

    },

  },

  theme: {

    tokens: {

      fonts: {

        heading: { value: "'Space Grotesk', 'IBM Plex Sans Arabic', sans-serif" },

        body: { value: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" },

        mono: { value: "'JetBrains Mono', monospace" },

      },

      colors: {

        // Primary Brand: Molten Extruder Filament Orange

        extruder: {

          50: { value: "#FFF7ED" },

          100: { value: "#FFEDD5" },

          200: { value: "#FED7AA" },

          300: { value: "#FDBA74" },

          400: { value: "#FB923C" },

          500: { value: "#F97316" },

          600: { value: "#EA580C" },

          700: { value: "#C2410C" },

          800: { value: "#9A3412" },

          900: { value: "#7C2D12" },

        },

        // Secondary Accent: Laser Build-Plate Cyan / Teal

        laser: {

          50: { value: "#F0FDFA" },

          100: { value: "#CCFBF1" },

          200: { value: "#99F6E4" },

          300: { value: "#5EEAD4" },

          400: { value: "#2DD4BF" },

          500: { value: "#14B8A6" },

          600: { value: "#0D9488" },

          700: { value: "#0F766E" },

          800: { value: "#115E59" },

          900: { value: "#134E4A" },

        },

      },

    },

    semanticTokens: {

      colors: {

        bg: {

          canvas: { value: { _light: "#F8FAFC", _dark: "#090D16" } },

          panel: { value: { _light: "#FFFFFF", _dark: "#111827" } },

          buildPlate: { value: { _light: "#F1F5F9", _dark: "#0F172A" } },

        },

        fg: {

          default: { value: { _light: "#0F172A", _dark: "#F8FAFC" } },

          muted: { value: { _light: "#475569", _dark: "#94A3B8" } },

        },

        border: {

          subtle: { value: { _light: "#E2E8F0", _dark: "#1E293B" } },

          accent: { value: { _light: "{colors.extruder.500}", _dark: "{colors.laser.400}" } },

        },

      },

    },

  },

})

export const system = createSystem(defaultConfig, customConfig)

2. Mandatory Global Header & Global Footer Specifications

2.1 Global Header (GlobalHeader.tsx)

Sticky top bar (height="68px", bg="bg.panel/85", backdropFilter="blur(12px)", borderBottomWidth="1px", borderColor="border.subtle"):

Left Area:

Language Switch Icon (IconButton): Toggles between Arabic (العربية, dir="rtl") and English (EN, dir="ltr").

Theme Switch Icon (IconButton): Toggles Light Mode (Sun) and Dark Mode (Moon) via next-themes.

Help Icon (IconButton): Opens a guided Dialog.Root walkthrough explaining how J3D works for Clients, 3D Printer Owners, and UAE Delivery Services.

Middle Area:

Platform Logo: Custom 3D Extruder Nozzle & Isometric Cube emblem labeled J3D (j3d.msoms.ai).

Right Area:

Login / Profile Icon: Displays the Login icon button when unauthenticated, or the authenticated user's Profile Avatar + Role Badge linking to /[locale]/profile.

Three-Line Hamburger Drawer Menu (Drawer.Root): Clicking the three-line icon (Menu from lucide-react) toggles a slide-out navigation drawer showing/hiding links tailored to the user's role (AI 3D Studio, Orders, Printer Provider Job Radar, Delivery Dispatch Radar, Profile, and Admin Command Center).

2.2 Global Footer (GlobalFooter.tsx)

Responsive three-zone footer bar:

Left Side (Mandatory Legal & Policy Pages): Links to /legal/privacy (Data Privacy Policy), /legal/policy (Platform Policy), /legal/terms (Terms of Service), /legal/sla (Printing & Delivery SLA), /legal/refunds (Escrow & Refund Policy), and /legal/safety (3D Material & Safety Guidelines).

Middle Area: Displays an initiative from msoms.ai 2026 (Arabic: مبادرة من msoms.ai 2026).

Right Side (Dynamic GitHub Build Version): Renders a monospace badge (v1.2.0 • sha:9f8a21c) automatically updated on every push to https://github.com/msoms-ai/j3d.

3. Landing Page: Typeform AI Wizard & Real-Time 3D Preview Studio

3.1 Step-by-Step Typeform Questionnaire

Question 1 — "What would you like to 3D Print today with AI?"

Interactive card grid of 10 popular 3D printing categories:

Stands & Holders (Phone, tablet, Quran/book, headphone, laptop stands)

Giveaways & Event Favors (Eid Al-Fitr 10 AED rolled banknote rings, wedding favors, Ramadan giveaways)

Islamic Calligraphy & Decor (Desk ayat, mosque miniatures, crescent lamps)

Congratulations & Trophies (Graduation, promotion, marriage, achievement plaques)

Newborn & Family Keepsakes (Baby name blocks, birth year signs, boy/girl hospital door hangers)

Business & Office Signage (3D QR code stands, NFC payment stands, room door titles, desk nameplates)

School & STEM Projects (Mechanical gears, anatomical models, architectural scale models)

Home DIY & Organization (Wall hooks, cable organizers, IKEA Skadis accessories, brackets)

Gaming & Desk Accessories (Controller stands, keycaps, miniature organizers)

Custom Replacement Parts (Appliance knobs, clips, bespoke geometry)

Question 2 — "Select a template to start with:"

Islamic Phrases: Quranic verses, Duaa, Hadith, or custom Arabic calligraphy.

Congratulations (Arab World Samples): "مبارك التخرج", "زواج مبارك", "عيدكم مبارك / Eid Mubarak", "مبارك الترقية".

New Born: Baby name, birth year, Boy/Girl theme, icon motif.

Business: Scannable 3D QR code stand, company name, room door title, Wi-Fi QR plaque.

School Project: Science/engineering model parameters.

Home DIY: Mounting dimensions, hole diameters, load type.

Custom Requirements: Open natural-language specification with AI guidance.

Question 3+ — AI Contextual Deep-Dive:

Powered by Google Gemini, dynamically asking for exact text strings, banknote slot diameter (e.g., 14.5mm for a rolled UAE 10 AED note), quantity (50–100 pcs), and mounting angle.

3.2 Interactive 3D Preview Canvas (ThreeStlCanvas.tsx)

Once requirements are collected, the platform renders the 3D item on a virtual build plate using Three.js (@react-three/fiber) with live user controls:

Material Selector (Select.Root): PLA, PLA Silk, PETG, ABS, ASA, TPU 95A, Standard Resin, Tough Resin.

Color Mode Selector: Toggle between Mono Color (single filament color for the entire item) and Multicolor (up to 4 independent filament slots for base, embossed text, trim, and QR code).

Fixed-Step Size Slider (Slider.Root): Snaps to printer-verified scale steps (50%, 75%, 100%, 125%, 150%, 200%), displaying live millimeter dimensions ($X \times Y \times Z\text{ mm}$), estimated gram weight, and minimum print floor in AED.

Extra User Controls: 360° orbit/zoom, wireframe toggle, X-ray cross-section slice preview, and Print & Delivery Budget Range Sliders (in AED) before clicking Submit for 3D Printing Providers.

4. Responsive Breakpoints & Bilingual HTML Email Templates

Mobile (320px–480px): Single-column layout, minimum 44×44px touch targets, sticky bottom action bar in the 3D Studio, and full-screen Drawer.Root navigation.

Tablet (768px–1024px): Split 2-column studio (3D Canvas top/left, Material & Budget controls bottom/right).

Desktop (1200px+): 12-column grid with persistent split-screen 3D Studio and multi-panel Admin dashboards.

Bilingual HTML Email Templates (noreply@msoms.ai): Responsive table-based HTML templates in both Arabic (dir="rtl") and English (dir="ltr") for Registration OTP, Password Reset OTP, Email/Password Change OTP, Order Assigned, Counter-Offer Alert (when client budget is too low), and Delivery OTP notifications.