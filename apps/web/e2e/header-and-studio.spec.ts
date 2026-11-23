import { test, expect } from '@playwright/test';

test.describe('J3D Header Navigation & 3D Studio Typeform Flow', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('Arabic RTL: Drawer menu icon and drawer open from the RIGHT', async ({ page }) => {
    await page.goto('/ar');
    await page.waitForLoadState('networkidle');

    // Find the hamburger menu button
    const menuBtn = page.getByRole('button', { name: 'القائمة الرئيسية' });
    await expect(menuBtn).toBeVisible();

    const box = await menuBtn.boundingBox();
    expect(box).not.toBeNull();
    // In Arabic RTL on 1280px screen, the drawer button is on the far RIGHT edge (> 1100px)
    console.log(`Arabic Hamburger Button X Position: ${box!.x}px (Screen Width: 1280px)`);
    expect(box!.x).toBeGreaterThan(1100);

    // Click to open the drawer
    await menuBtn.click();
    await page.waitForTimeout(500);

    // Verify drawer content is visible on the right side
    const drawerTitle = page.getByText('قائمة منصة J3D');
    await expect(drawerTitle).toBeVisible();

    const titleBox = await drawerTitle.boundingBox();
    expect(titleBox).not.toBeNull();
    console.log(`Arabic Drawer Title X Position: ${titleBox!.x}px`);
    // Drawer panel is positioned on the right side of the screen (> 800px)
    expect(titleBox!.x).toBeGreaterThan(800);

    // Save screenshot for verification
    await page.screenshot({ path: 'apps/web/e2e/screenshots/ar-drawer-right.png' });
  });

  test('English LTR: Drawer menu icon and drawer open from the LEFT', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    // Find the hamburger menu button
    const menuBtn = page.getByRole('button', { name: 'Main Menu' });
    await expect(menuBtn).toBeVisible();

    const box = await menuBtn.boundingBox();
    expect(box).not.toBeNull();
    // In English LTR on 1280px screen, the drawer button is on the far LEFT edge (< 100px)
    console.log(`English Hamburger Button X Position: ${box!.x}px (Screen Width: 1280px)`);
    expect(box!.x).toBeLessThan(100);

    // Click to open the drawer
    await menuBtn.click();
    await page.waitForTimeout(500);

    // Verify drawer content is visible on the left side
    const drawerTitle = page.getByText('J3D Navigation');
    await expect(drawerTitle).toBeVisible();

    const titleBox = await drawerTitle.boundingBox();
    expect(titleBox).not.toBeNull();
    console.log(`English Drawer Title X Position: ${titleBox!.x}px`);
    // Drawer panel is positioned on the left side of the screen (< 350px)
    expect(titleBox!.x).toBeLessThan(350);

    // Save screenshot for verification
    await page.screenshot({ path: 'apps/web/e2e/screenshots/en-drawer-left.png' });
  });

  test('Prompt-to-3D Solid Generation (Gemini 4 Hydrogen + Manifold-3D)', async ({ page }) => {
    await page.goto('/ar');
    await page.waitForLoadState('networkidle');

    // Verify Prompt-to-3D card is visible
    await expect(page.getByText('توليد فوري بأي وصف تريده (Prompt-to-3D)')).toBeVisible();

    // Click quick prompt idea chip
    const ideaChip = page.getByRole('button', { name: 'منظم مكتبي للأقلام والبطاقات' });
    await expect(ideaChip).toBeVisible();
    await ideaChip.click();

    // Verify Step 4: 3D Build-Plate Studio is active with Manifold-3D badge & STL + 3MF download buttons
    await expect(page.getByText('استوديو المعاينة ثلاثية الأبعاد واختيار الخامة')).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Bambu Lab 256×256mm Bed')).toBeVisible();
    await expect(page.getByText('Manifold-3D Kernel')).toBeVisible();
    await expect(page.getByRole('link', { name: 'تحميل STL' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'تحميل 3MF (Bambu)' })).toBeVisible();

    await page.screenshot({ path: 'apps/web/e2e/screenshots/prompt-to-3d-manifold.png' });
  });

  test('Step-by-Step AI Typeform Studio Flow (Category -> Template -> Presets -> 3D Studio)', async ({ page }) => {
    await page.goto('/ar');
    await page.waitForLoadState('networkidle');

    // Verify Step 1 is active
    await expect(page.getByText('ماذا تريد أن تطبع بتقنية 3D اليوم بالذكاء الاصطناعي؟')).toBeVisible();

    // Verify Category example chips are visible
    await expect(page.getByText('حامل هواتف • مسند أجهزة لوحية • ممر كابل شحن')).toBeVisible();

    // Click "حوامل وستاندات مكتبية"
    const standsCard = page.getByText('حوامل وستاندات مكتبية');
    await standsCard.click();
    await page.waitForTimeout(600);

    // Verify Step 2 is active
    await expect(page.getByText('اختر تصميماً أساسياً لتهيئته بالذكاء الاصطناعي')).toBeVisible();
    await expect(page.getByText('حامل مكتبي مريح للهاتف والتابلت مع ممر كابل الشحن')).toBeVisible();

    // Click the Phone Stand template
    const templateCard = page.getByText('حامل مكتبي مريح للهاتف والتابلت مع ممر كابل الشحن');
    await templateCard.click();
    await page.waitForTimeout(1000);

    // Verify Step 3: AI Questions & 1-Click Presets
    await expect(page.getByText('تخصيص المعايير الهندسية بالذكاء الاصطناعي')).toBeVisible();
    await expect(page.getByText('إعدادات سريعة جاهزة (بنقرة واحدة لتعبئة كل الحقول):')).toBeVisible({ timeout: 25000 });

    // Click a quick preset
    const presetBtn = page.getByRole('button', { name: 'مكتب العمل ومكالمات Zoom' });
    await expect(presetBtn).toBeVisible();
    await presetBtn.click();
    await page.waitForTimeout(300);

    // Click Compile & Render 3D Preview
    const compileBtn = page.getByRole('button', { name: 'بناء ومعاينة ملف .STL ثلاثي الأبعاد هندسياً' });
    await expect(compileBtn).toBeVisible();
    await compileBtn.click();

    // Verify Step 4: 3D Build-Plate Studio is active (allow up to 60s for Gemini 4 Hydrogen CSG synthesis)
    await expect(page.getByText('استوديو المعاينة ثلاثية الأبعاد واختيار الخامة')).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('Bambu Lab 256×256mm Bed')).toBeVisible();
    await expect(page.getByText('نوع الخامة (Filament / Resin)')).toBeVisible();

    // Take screenshot of 3D studio
    await page.screenshot({ path: 'apps/web/e2e/screenshots/step4-3d-studio.png' });
  });
});
