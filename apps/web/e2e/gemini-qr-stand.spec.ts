import { test, expect } from '@playwright/test';

test.describe('Gemini 4 Hydrogen Prompt-to-3D QR Stand Synthesis', () => {
  test('User enters website QR code stand prompt and receives custom AI 3D model', async ({ page }) => {
    test.setTimeout(90000);
    // Listen to console and request failures
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('requestfailed', request =>
      console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText)
    );

    // Navigate to English homepage
    await page.goto('http://localhost:3000/en');
    await page.waitForLoadState('networkidle');

    // Locate the prompt-to-3d input field
    const promptInput = page.locator('input[placeholder*="Desk organizer tray"]');
    await expect(promptInput).toBeVisible();

    // Fill with the user's exact prompt
    const userPrompt = 'A desktop stand that should contain the QR code of my website';
    await promptInput.fill(userPrompt);

    // Click the Generate button
    const generateBtn = page.getByRole('button', { name: /Generate/i });
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // Wait for the Gemini 4 Hydrogen + Manifold-3D synthesis to complete and transition to Step 4
    await expect(page.locator('text=Interactive 3D Studio & Material Plate')).toBeVisible({ timeout: 45000 });

    // Verify 3D Studio Elements
    await expect(page.locator('text=Watertight Manifold')).toBeVisible();
    await expect(page.locator('text=100% Watertight Solid')).toBeVisible();
    await expect(page.locator('text=AI Generative CAD Synthesis (Gemini 4 Hydrogen)')).toBeVisible();
    await expect(page.getByRole('link', { name: /Download STL/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Download 3MF/i })).toBeVisible();

    // Click "View AI Prompt & CAD Recipe" to test transparency inspector
    const inspectBtn = page.getByRole('button', { name: /View AI Prompt & CAD Recipe/i });
    if (await inspectBtn.isVisible()) {
      await inspectBtn.click();
      await expect(page.locator('text=Exact Engineering Prompt Sent to Gemini 4 Hydrogen:')).toBeVisible();
    }

    // Allow 3D canvas animation to settle
    await page.waitForTimeout(3000);

    // Save screenshot to artifact folder
    await page.screenshot({
      path: '/Users/mohamed/.gemini/antigravity/brain/d30460dd-7b5e-4950-81e5-a46eb65b5c32/gemini-qr-stand.png',
      fullPage: true,
    });
  });
});
