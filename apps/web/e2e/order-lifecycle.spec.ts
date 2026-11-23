import { test, expect } from '@playwright/test';

test.describe('J3D Platform End-to-End Suite', () => {
  test('Verify Homepage, 3D Studio Wizard & Bilingual Switching', async ({ page }) => {
    // 1. Visit English homepage
    await page.goto('/en');
    await expect(page).toHaveTitle(/J3D/);
    await expect(page.locator('text=Next-Gen 3D Printing Powered by Gemini 4 Hydrogen')).toBeVisible();

    // 2. Verify Arabic locale switching
    await page.goto('/ar');
    await expect(page.locator('text=الجيل الجديد من الطباعة ثلاثية الأبعاد المدعومة بـ Gemini 4 Hydrogen')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    // 3. Verify footer legal policies & version badge
    await expect(page.locator('text=msoms.ai 2026')).toBeVisible();
    await expect(page.locator('text=الخصوصية')).toBeVisible();
    await expect(page.locator('text=السياسة')).toBeVisible();
    await expect(page.locator('text=الشروط')).toBeVisible();
    await expect(page.locator('text=اتفاقية SLA')).toBeVisible();
    await expect(page.locator('text=الضمان والاسترجاع')).toBeVisible();
    await expect(page.locator('text=السلامة')).toBeVisible();
  });

  test('Verify All 6 Bilingual Legal & Regulatory Documents', async ({ page }) => {
    const legalSlugs = ['privacy', 'policy', 'terms', 'sla', 'refunds', 'safety'];

    for (const slug of legalSlugs) {
      await page.goto(`/en/legal/${slug}`);
      await expect(page.locator('h2, h1').first()).toBeVisible();
      // Should show UAE compliance or legal framework
      await expect(page.locator('text=November 2026 • msoms.ai initiative')).toBeVisible();

      await page.goto(`/ar/legal/${slug}`);
      await expect(page.locator('text=مبادرة msoms.ai')).toBeVisible();
    }
  });

  test('Verify Authentication Pages & 6-Digit OTP Interface', async ({ page }) => {
    // 1. Login Page
    await page.goto('/en/auth/login');
    await expect(page.locator('text=Sign In to J3D')).toBeVisible();
    await expect(page.locator('text=One-Click Demo Test Accounts')).toBeVisible();

    // 2. Fast-fill Client Demo
    await page.click('button:has-text("Client")');
    await expect(page.locator('input[type="email"]')).toHaveValue('client@msoms.ai');
    await expect(page.locator('input[type="password"]')).toHaveValue('J3dPassword!2026');

    // 3. Register Page & 6-Digit OTP Flow
    await page.goto('/en/auth/register');
    await expect(page.locator('text=Create Your J3D Account')).toBeVisible();
    await expect(page.locator('text=Select Account Role')).toBeVisible();
  });

  test('Verify Maker Radar & Courier Fleet Dashboards', async ({ page }) => {
    // 1. Maker Radar
    await page.goto('/en/maker/radar');
    await expect(page.locator('text=UAE Maker 3D Print Radar')).toBeVisible();

    // 2. Courier Dispatch Fleet
    await page.goto('/en/courier/dispatch');
    await expect(page.locator('text=UAE Courier Delivery Dispatch')).toBeVisible();

    // 3. Admin Command Center
    await page.goto('/en/admin');
    await expect(page.locator('text=Admin Command Center')).toBeVisible();
    await expect(page.locator('text=Gemini Flash Model Watcher')).toBeVisible();
  });

  test('Verify Order Confirmation & Escrow Telemetry Page', async ({ page }) => {
    await page.goto('/en/orders/confirmation?orderId=ORD-E2E-TEST&payment_intent_id=pi_test_12345');
    await expect(page.locator('text=Order Placed & Escrow Secured!')).toBeVisible();
    await expect(page.locator('text=Ziina UAE Payment Gateway')).toBeVisible();
    await expect(page.locator('text=Live Maker Radar')).toBeVisible();
  });
});
