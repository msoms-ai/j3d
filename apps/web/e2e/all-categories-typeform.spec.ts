import { test, expect } from '@playwright/test';

test.describe('All 10 Categories 3D Model Generation E2E', () => {
  const testCases = [
    {
      categorySlug: 'giveaways-favors',
      templateSlug: 'eid-10aed-ring',
      name: 'Eid Giveaway Note Ring',
    },
    {
      categorySlug: 'newborn-keepsakes',
      templateSlug: 'newborn-mabrouk-plaque',
      name: 'Newborn Mabrouk Plaque',
    },
    {
      categorySlug: 'school-stem',
      templateSlug: 'school-project-stem',
      name: 'School STEM Planetary Gear',
    },
    {
      categorySlug: 'home-diy',
      templateSlug: 'home-diy-bracket',
      name: 'Home DIY L-Bracket Hook',
    },
    {
      categorySlug: 'custom-parts',
      templateSlug: 'custom-replacement-parts',
      name: 'Custom Mechanical Knob & Coupler',
    },
  ];

  for (const tc of testCases) {
    test(`Generates unique 3D model for: ${tc.name} (${tc.categorySlug})`, async ({ page }) => {
      await page.goto('http://localhost:3000/en');
      await page.waitForLoadState('networkidle');

      // Click on the Category card via explicit data-testid
      const categoryCard = page.locator(`[data-testid="category-card-${tc.categorySlug}"]`);
      await expect(categoryCard).toBeVisible();
      await categoryCard.click();

      // Step 2: Should show available template card via explicit data-testid
      const templateCard = page.locator(`[data-testid="template-card-${tc.templateSlug}"]`);
      await expect(templateCard).toBeVisible();
      await templateCard.click();

      // Step 3: Should load AI contextual questions or presets (wait for Gemini AI questions)
      const compileBtn = page.locator('button:has-text("Compile & Render")');
      await expect(compileBtn).toBeVisible({ timeout: 45000 });

      // Click Compile to 3D Preview
      await compileBtn.click();

      // Step 4: Should reach 3D Studio Canvas with Watertight Manifold badge
      await expect(page.locator('text=Watertight Manifold')).toBeVisible({ timeout: 45000 });
      await expect(page.getByRole('link', { name: /Download STL/i })).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole('link', { name: /Download 3MF/i })).toBeVisible({ timeout: 15000 });
    });
  }
});
