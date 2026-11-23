import { test, expect } from '@playwright/test';

test.describe('Typeform Workflow AI Synthesis with Gemini 4 Hydrogen', () => {
  test('User selects category, template, answers parameters, and clicks Generate to produce bespoke AI 3D design', async ({ page }) => {
    test.setTimeout(90000);

    // Listen to console
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // 1. Visit English homepage
    await page.goto('http://localhost:3000/en');
    await page.waitForLoadState('networkidle');

    // 2. Select Business & QR Signage category
    const categoryCard = page.locator('[data-testid="category-card-business-signage"]');
    await expect(categoryCard).toBeVisible();
    await categoryCard.click();

    // 3. Select Business QR Stand template
    const templateCard = page.locator('[data-testid="template-card-business-qr-stand"]');
    await expect(templateCard).toBeVisible();
    await templateCard.click();

    // 4. In Step 3: Wait for questions to finish loading and fill custom notes
    const notesInput = page.locator('textarea');
    await expect(notesInput).toBeVisible({ timeout: 35000 });
    await notesInput.fill('Need a heavy weighted base with 65-degree angled plate for https://msoms.ai and dual card pocket');

    // Click the big Action Button to Generate
    const compileBtn = page.getByRole('button', { name: /Compile & Render 3D Watertight Preview/i });
    await expect(compileBtn).toBeVisible();
    await compileBtn.click();

    // 5. In Step 4: Verify 3D Studio & AI Generative CAD Synthesis Diagnostics
    await expect(page.locator('text=Interactive 3D Studio & Material Plate')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('text=AI Generative CAD Synthesis (Gemini 4 Hydrogen)')).toBeVisible();
    await expect(page.locator('text=gemini-4-hydrogen')).toBeVisible();
    await expect(page.locator('text=100% Watertight Solid')).toBeVisible();

    // Open prompt inspector
    const inspectBtn = page.getByRole('button', { name: /View AI Prompt & CAD Recipe/i });
    if (await inspectBtn.isVisible()) {
      await inspectBtn.click();
      await expect(page.locator('text=Exact Engineering Prompt Sent to Gemini 4 Hydrogen:')).toBeVisible();
    }

    // Wait for 3D canvas render
    await page.waitForTimeout(3000);

    // Capture screenshot
    await page.screenshot({
      path: '/Users/mohamed/.gemini/antigravity/brain/d30460dd-7b5e-4950-81e5-a46eb65b5c32/workflow-ai-generated-stand.png',
      fullPage: true,
    });
  });
});
