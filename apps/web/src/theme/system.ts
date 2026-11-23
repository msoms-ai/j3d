import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const customConfig = defineConfig({
  globalCss: {
    'html, body': {
      bg: 'bg.canvas',
      color: 'fg.default',
      fontFamily: "var(--font-dubai), 'Dubai', sans-serif",
      scrollBehavior: 'smooth',
    },
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: "var(--font-dubai), 'Dubai', sans-serif" },
        body: { value: "var(--font-dubai), 'Dubai', sans-serif" },
        mono: { value: "'JetBrains Mono', monospace" },
      },
      colors: {
        // Primary Brand: Molten Extruder Filament Orange
        extruder: {
          50: { value: '#FFF7ED' },
          100: { value: '#FFEDD5' },
          200: { value: '#FED7AA' },
          300: { value: '#FDBA74' },
          400: { value: '#FB923C' },
          500: { value: '#F97316' },
          600: { value: '#EA580C' },
          700: { value: '#C2410C' },
          800: { value: '#9A3412' },
          900: { value: '#7C2D12' },
        },
        // Secondary Accent: Laser Build-Plate Cyan / Teal
        laser: {
          50: { value: '#F0FDFA' },
          100: { value: '#CCFBF1' },
          200: { value: '#99F6E4' },
          300: { value: '#5EEAD4' },
          400: { value: '#2DD4BF' },
          500: { value: '#14B8A6' },
          600: { value: '#0D9488' },
          700: { value: '#0F766E' },
          800: { value: '#115E59' },
          900: { value: '#134E4A' },
        },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          canvas: { value: { _light: '#F8FAFC', _dark: '#090D16' } },
          panel: { value: { _light: '#FFFFFF', _dark: '#111827' } },
          buildPlate: { value: { _light: '#F1F5F9', _dark: '#0F172A' } },
        },
        fg: {
          default: { value: { _light: '#0F172A', _dark: '#F8FAFC' } },
          muted: { value: { _light: '#475569', _dark: '#94A3B8' } },
        },
        border: {
          subtle: { value: { _light: '#E2E8F0', _dark: '#1E293B' } },
          accent: { value: { _light: '{colors.extruder.500}', _dark: '{colors.laser.400}' } },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, customConfig);
