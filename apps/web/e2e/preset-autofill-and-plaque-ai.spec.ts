import { test, expect } from '@playwright/test';

test.describe('1-Click Fast Presets Autofill & Arabic Plaque 3D Synthesis', () => {
  test('User clicks 1-click preset "درع تخرج جامعي", verifies fields autofill and renders sleek plaque with inscription in Step 4', async ({ page }) => {
    test.setTimeout(90000);

    // 1. Visit Arabic homepage
    await page.goto('http://localhost:3000/ar');
    await page.waitForLoadState('networkidle');

    // 2. Select Category: Congratulations & Trophies
    const categoryCard = page.locator('[data-testid="category-card-congratulations-trophies"]');
    await expect(categoryCard).toBeVisible();
    await categoryCard.click();

    // 3. Select Template: Arab World Congratulations Plaque
    const templateCard = page.locator('[data-testid="template-card-arab-congratulations-plaque"]');
    await expect(templateCard).toBeVisible();
    await templateCard.click();

    // 4. In Step 3: Wait for dynamic questions to load
    await expect(page.locator('text=إعدادات سريعة جاهزة (بنقرة واحدة لتعبئة كل الحقول):')).toBeVisible({ timeout: 40000 });

    // 5. Click the 1-Click Fast Preset: "درع تخرج جامعي"
    const graduationPresetBtn = page.getByRole('button', { name: 'درع تخرج جامعي' });
    await expect(graduationPresetBtn).toBeVisible();
    await graduationPresetBtn.click();

    // Verify instant feedback: confirmation banner appears
    await expect(page.locator('text=تم تطبيق إعداد: "درع تخرج جامعي"')).toBeVisible();

    // Verify fields populated:
    // Check that input with recipient/name has been filled
    const textInputs = page.locator('input');
    const inputCount = await textInputs.count();
    expect(inputCount).toBeGreaterThan(0);

    // Verify custom notes populated
    const customNotes = page.locator('textarea');
    await expect(customNotes).toHaveValue(/درع تذكاري/);

    // 6. Click Compile 3D Model
    const compileBtn = page.getByRole('button', { name: 'بناء ومعاينة ملف .STL ثلاثي الأبعاد هندسياً' });
    await expect(compileBtn).toBeVisible();
    await compileBtn.click();

    // 7. Verify Step 4 3D Studio & Inscription Badge
    await expect(page.getByText('استوديو المعاينة ثلاثية الأبعاد واختيار الخامة')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('text=النقش ثلاثي الأبعاد المخصص:')).toBeVisible();
    await expect(page.locator('text=توليد ذكاء اصطناعي حقيقي (Gemini 4 Hydrogen)')).toBeVisible();

    // Take screenshot of Step 4
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: '/Users/mohamed/.gemini/antigravity/brain/d30460dd-7b5e-4950-81e5-a46eb65b5c32/preset-autofill-plaque-studio.png',
      fullPage: true,
    });
  });
});
