import { PrismaClient, UserRole, UserStatus, MaterialType } from '@prisma/client';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/**
 * Encrypts a plaintext API key using AES-256-GCM with the 32-byte MASTER_ENCRYPTION_KEY.
 */
function encryptSecret(plaintext: string, masterKeyHex: string): string {
  const key = Buffer.from(masterKeyHex.padEnd(64, '0').slice(0, 64), 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function maskKey(key: string): string {
  if (!key || key.length < 10) return '••••••••';
  return `${key.slice(0, 6)}••••••${key.slice(-4)}`;
}

async function main() {
  console.log('Seeding J3D (j3d.msoms.ai) multi-tenant database...');

  const masterKeyHex =
    process.env.MASTER_ENCRYPTION_KEY ||
    '75d593696c9731f4bcb1d25524d518e1b4fbed1eac4b216f39ded98da419ccd9';

  // 1. Upsert Primary UAE Marketplace Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'msoms-uae' },
    update: {},
    create: {
      slug: 'msoms-uae',
      nameEn: 'J3D UAE Marketplace',
      nameAr: 'منصة J3D للطباعة ثلاثية الأبعاد - الإمارات',
      isActive: true,
    },
  });

  // 2. Upsert Encrypted AI & Email Configuration for Admin Panel
  const rawGeminiKey = process.env.DEFAULT_GEMINI_API_KEY || '';
  const rawResendKey = process.env.DEFAULT_RESEND_API_KEY || '';

  await prisma.platformConfig.upsert({
    where: { tenantId: tenant.id },
    update: {
      geminiApiKeyEncrypted: encryptSecret(rawGeminiKey, masterKeyHex),
      geminiKeyMasked: maskKey(rawGeminiKey),
      activeGeminiTextModel: process.env.DEFAULT_GEMINI_TEXT_MODEL || 'gemini-4-hydrogen',
      resendApiKeyEncrypted: encryptSecret(rawResendKey, masterKeyHex),
      resendKeyMasked: maskKey(rawResendKey),
    },
    create: {
      tenantId: tenant.id,
      geminiApiKeyEncrypted: encryptSecret(rawGeminiKey, masterKeyHex),
      geminiKeyMasked: maskKey(rawGeminiKey),
      activeGeminiTextModel: process.env.DEFAULT_GEMINI_TEXT_MODEL || 'gemini-4-hydrogen',
      activeGeminiImageModel: process.env.DEFAULT_GEMINI_IMAGE_MODEL || 'imagen-3.0-generate-002',
      cachedGeminiModelsJson: [
        { id: 'gemini-4-hydrogen', displayName: 'Gemini 4 Hydrogen (Next-Gen High Speed CAD Model)' },
        { id: 'gemini-4-argon', displayName: 'Gemini 4 Argon (Flagship Reasoning Model)' },
        { id: 'gemini-3.8-flash', displayName: 'Gemini 3.8 Flash' },
        { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro (Deep Reasoning)' },
        { id: 'imagen-3.0-generate-002', displayName: 'Imagen 3 (AI Profile Avatar & Banner Generator)' },
      ],
      senderEmailAddress: process.env.DEFAULT_SENDER_EMAIL || 'noreply@msoms.ai',
      resendApiKeyEncrypted: encryptSecret(rawResendKey, masterKeyHex),
      resendKeyMasked: maskKey(rawResendKey),
      lastEmailProbeStatus: 'HEALTHY',
    },
  });

  // 3. Upsert Four Verified Role Accounts (Default Password: J3dPassword!2026)
  const defaultPasswordHash = await argon2.hash('J3dPassword!2026', {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@msoms.ai' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@msoms.ai',
      passwordHash: defaultPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      fullName: 'MSOMS Platform Administrator',
      phone: '+971500000001',
      preferredLocale: 'en',
      preferredTheme: 'dark',
      emirate: 'Dubai',
      district: 'Dubai Internet City',
      streetAddress: 'Building 3, Dubai Internet City',
      latitude: 25.0952,
      longitude: 55.1592,
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'client@msoms.ai' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'client@msoms.ai',
      passwordHash: defaultPasswordHash,
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      fullName: 'Ahmed Al-Mansoori (Client)',
      phone: '+971500000002',
      preferredLocale: 'ar',
      preferredTheme: 'dark',
      emirate: 'Dubai',
      district: 'Al Barsha 2',
      streetAddress: 'Street 14B, Villa 22, Al Barsha 2',
      latitude: 25.1012,
      longitude: 55.2054,
      walletBalanceAed: 500.0,
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'maker@msoms.ai' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'maker@msoms.ai',
      passwordHash: defaultPasswordHash,
      role: UserRole.PRINTER_PROVIDER,
      status: UserStatus.ACTIVE,
      fullName: 'Khalid Print Studio (3D Printer Provider)',
      phone: '+971500000003',
      preferredLocale: 'en',
      preferredTheme: 'dark',
      emirate: 'Dubai',
      district: 'Jumeirah Village Circle (JVC)',
      streetAddress: 'District 12, JVC, Dubai',
      latitude: 25.0551,
      longitude: 55.2094,
      printerModels: ['Bambu Lab X1 Carbon (AMS 4-Color)', 'Prusa MK4'],
      maxBedXmm: 256,
      maxBedYmm: 256,
      maxBedZmm: 256,
      supportsMulticolor: true,
      supportedMaterials: [
        MaterialType.PLA,
        MaterialType.PLA_SILK,
        MaterialType.PETG,
        MaterialType.ABS,
        MaterialType.TPU_95A,
      ],
      walletBalanceAed: 120.0,
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'courier@msoms.ai' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'courier@msoms.ai',
      passwordHash: defaultPasswordHash,
      role: UserRole.DELIVERY_PROVIDER,
      status: UserStatus.ACTIVE,
      fullName: 'Saeed Express Delivery (UAE Courier)',
      phone: '+971500000004',
      preferredLocale: 'ar',
      preferredTheme: 'dark',
      emirate: 'Dubai',
      district: 'Al Quoz',
      streetAddress: 'Al Quoz Industrial Area 3, Dubai',
      latitude: 25.1328,
      longitude: 55.2211,
      vehicleType: 'Motorcycle / Van',
      plateNumber: 'DXB-48291',
      isOnline: true,
      walletBalanceAed: 85.0,
    },
  });

  // 4. Upsert All 10 Typeform Q1 Categories
  const categoriesData = [
    {
      slug: 'stands-holders',
      nameEn: 'Stands & Holders',
      nameAr: 'حوامل وستاندات مكتبية',
      descriptionEn: 'Desk stands for phones, tablets, Quran books, headphones, and displays.',
      descriptionAr: 'حوامل للهواتف والأجهزة اللوحية والمصاحف والسماعات والمكاتب.',
      iconName: 'Smartphone',
      sortOrder: 1,
    },
    {
      slug: 'giveaways-favors',
      nameEn: 'Giveaways & Event Favors',
      nameAr: 'توزيعات وهدايا المناسبات والأعياد',
      descriptionEn: 'Eid Al-Fitr 10 AED note rings, Ramadan giveaways, and wedding favors.',
      descriptionAr: 'خواتم وحوامل عيدية ١٠ دراهم لعيد الفطر وتوزيعات رمضان والمناسبات.',
      iconName: 'Gift',
      sortOrder: 2,
    },
    {
      slug: 'islamic-calligraphy',
      nameEn: 'Islamic Calligraphy & Decor',
      nameAr: 'مخطوطات وديكورات إسلامية',
      descriptionEn: '3D extruded Quranic verses, Duaa stands, Hadith plaques, and crescents.',
      descriptionAr: 'آيات قرآنية مجسمة، أدعية، أحاديث نبوية، وديكورات رمضانية.',
      iconName: 'Sparkles',
      sortOrder: 3,
    },
    {
      slug: 'congratulations-trophies',
      nameEn: 'Congratulations & Trophies',
      nameAr: 'تهاني ودروع التبريكات',
      descriptionEn: 'Custom Arabic & English plaques for graduation, marriage, and promotions.',
      descriptionAr: 'مجسمات ودروع تهنئة بالتخرج والزواج والترقية.',
      iconName: 'Award',
      sortOrder: 4,
    },
    {
      slug: 'newborn-keepsakes',
      nameEn: 'Newborn & Family Keepsakes',
      nameAr: 'هدايا واستقبال المواليد',
      descriptionEn: 'Personalized baby name signs, birth year blocks, and boy/girl keepsakes.',
      descriptionAr: 'مجسمات أسماء المواليد وسنة الميلاد وتوزيعات قدوم المولود.',
      iconName: 'Baby',
      sortOrder: 5,
    },
    {
      slug: 'business-signage',
      nameEn: 'Business & QR Signage',
      nameAr: 'مجسمات الأعمال ورموز QR',
      descriptionEn: '3D scannable QR code stands, company logos, and office door title plates.',
      descriptionAr: 'ستاندات رموز الاستجابة السريعة QR، شعارات الشركات، ولوحات المكاتب.',
      iconName: 'QrCode',
      sortOrder: 6,
    },
    {
      slug: 'school-stem',
      nameEn: 'School & STEM Projects',
      nameAr: 'مشاريع مدرسية وتعليمية STEM',
      descriptionEn: 'Mechanical gears, anatomical models, and architectural school projects.',
      descriptionAr: 'تروس ميكانيكية، مجسمات علمية وهندسية للمدارس والجامعات.',
      iconName: 'GraduationCap',
      sortOrder: 7,
    },
    {
      slug: 'home-diy',
      nameEn: 'Home DIY & Organization',
      nameAr: 'تنظيم المنزل وقطع DIY',
      descriptionEn: 'Custom wall hooks, cable organizers, brackets, and pegboard mounts.',
      descriptionAr: 'خطافات جدارية، منظمات كابلات، وحوامل منزلية مخصصة.',
      iconName: 'Wrench',
      sortOrder: 8,
    },
    {
      slug: 'gaming-desk',
      nameEn: 'Gaming & Desk Accessories',
      nameAr: 'إكسسوارات الألعاب والمكتب',
      descriptionEn: 'Controller holders, headset mounts, custom keycaps, and desk trays.',
      descriptionAr: 'حوامل يد التحكم، قواعد السماعات، ومنظمات المكتب.',
      iconName: 'Gamepad2',
      sortOrder: 9,
    },
    {
      slug: 'custom-parts',
      nameEn: 'Custom Replacement Parts',
      nameAr: 'قطع غيار وتصاميم خاصة',
      descriptionEn: 'Bespoke mechanical adapters, knobs, clips, and custom dimensions.',
      descriptionAr: 'مقابض، أغطية، وقطع غيار مصممة حسب المقاسات المطلوبة.',
      iconName: 'Cog',
      sortOrder: 10,
    },
  ];

  const categoryMap: Record<string, string> = {};

  for (const cat of categoriesData) {
    const saved = await prisma.category.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: cat.slug } },
      update: cat,
      create: { ...cat, tenantId: tenant.id },
    });
    categoryMap[cat.slug] = saved.id;
  }

  // 5. Upsert All Typeform Q2 Templates (Including the Flagship Phone Stand & Eid 10 AED Ring)
  const templatesData = [
    {
      slug: 'phone-tablet-stand',
      categoryId: categoryMap['stands-holders'],
      nameEn: 'Ergonomic Phone & Tablet Stand (with Cable Pass)',
      nameAr: 'حامل مكتبي مريح للهاتف والتابلت مع ممر كابل الشحن',
      samplePromptsEn: [
        'Universal desktop stand for iPhone 16 Pro Max and iPad with charging cable cutout',
        'Angled phone holder with personalized nameplate and non-slip lip',
      ],
      samplePromptsAr: [
        'ستاند مكتبي للهاتف والآيباد مع فتحة لكابل الشحن والاسم محفور',
        'حامل هاتف بزاوية مريحة للمشاهدة مع حافة أمامية متينة',
      ],
      csgArchetype: 'PHONE_TABLET_DUAL_STAND',
      defaultParamsJson: {
        widthMm: 72.0,
        depthMm: 82.0,
        heightMm: 92.0,
        tiltAngleDeg: 65,
        cableNotchWidthMm: 22.0,
        embossedTextAr: 'مكتبي',
        embossedTextEn: 'Desk Stand',
      },
      baseSetupFeeAed: 12.0,
    },
    {
      slug: 'eid-10aed-ring',
      categoryId: categoryMap['giveaways-favors'],
      nameEn: 'Eid Al-Fitr 10 AED Rolled Note Ring',
      nameAr: 'خاتم وحامل عيدية ١٠ دراهم لعيد الفطر',
      samplePromptsEn: [
        "Circular ring with 'Eid Mubarak' text holding a rolled 10 AED note (50 to 100 pieces)",
        "Crescent-topped ring with 'Eidukum Mubarak' and a 14.5mm cylinder slot for rolled 10 AED bills",
      ],
      samplePromptsAr: [
        'خاتم دائري بعبارة عيدكم مبارك يحمل ورقة ١٠ دراهم ملفوفة (٥٠ إلى ١٠٠ قطعة)',
        'حامل عيدية بتصميم هلال وعبارة كل عام وأنتم بخير مع فتحة أسطوانية لعملة ١٠ دراهم',
      ],
      csgArchetype: 'EID_CURRENCY_HOLDER_RING',
      defaultParamsJson: {
        outerRingDiameterMm: 32.0,
        innerBillCylinderDiameterMm: 14.5,
        ringHeightMm: 18.0,
        embossedTextAr: 'عيدكم مبارك',
        embossedTextEn: 'Eid Mubarak',
        defaultQuantity: 50,
      },
      baseSetupFeeAed: 15.0,
    },
    {
      slug: 'islamic-phrases-stand',
      categoryId: categoryMap['islamic-calligraphy'],
      nameEn: 'Islamic Phrases (Quran, Duaa, Hadith, Custom Text)',
      nameAr: 'عبارات إسلامية (آية قرآنية، دعاء، حديث، نص مخصص)',
      samplePromptsEn: [
        'Desk stand with Ayat Al-Kursi calligraphy in gold on emerald base',
        "Entrance stand saying 'Bismillah MashaAllah' with geometric arch",
      ],
      samplePromptsAr: [
        'ستاند مكتبي بعبارة الحمد لله أو بسم الله ما شاء الله',
        'مجسم دعاء دخول المنزل بخط عربي بارز على قاعدة متينة',
      ],
      csgArchetype: 'ISLAMIC_CALLIGRAPHY_STAND',
      defaultParamsJson: {
        baseWidthMm: 160.0,
        baseDepthMm: 45.0,
        extrusionHeightMm: 65.0,
        bevelRadiusMm: 2.0,
        phraseText: 'ما شاء الله لا قوة إلا بالله',
      },
      baseSetupFeeAed: 12.0,
    },
    {
      slug: 'arab-congratulations-plaque',
      categoryId: categoryMap['congratulations-trophies'],
      nameEn: 'Congratulations (Arab World Samples)',
      nameAr: 'تهاني ومباركات (نماذج من العالم العربي)',
      samplePromptsEn: [
        'Alf Mabrouk Al-Takharruj (Graduation Congratulations) trophy stand with name and year',
        'Mabrouk Al-Zawaj (Wedding Congratulations) desk keepsake',
      ],
      samplePromptsAr: [
        'ألف مبروك التخرج مع الاسم وسنة التخرج',
        'بارك الله لكما وبارك عليكما - تهنئة زواج أو ترقية',
      ],
      csgArchetype: 'CONGRATULATIONS_PLAQUE',
      defaultParamsJson: {
        plaqueWidthMm: 180.0,
        plaqueHeightMm: 90.0,
        greetingPreset: 'ألف مبروك التخرج',
        recipientName: 'محمد',
      },
      baseSetupFeeAed: 12.0,
    },
    {
      slug: 'newborn-mabrouk-plaque',
      categoryId: categoryMap['newborn-keepsakes'],
      nameEn: 'New Born (Name, Year, Boy or Girl)',
      nameAr: 'مولود جديد (الاسم، السنة، ولد أو بنت)',
      samplePromptsEn: [
        "Newborn baby boy stand with name 'Zayed', year 2026, and crescent/star motif",
        "Newborn baby girl keepsake plaque with name 'Mariam' and pastel crown",
      ],
      samplePromptsAr: [
        'مجسم استقبال مولود ولد باسم زايد ٢٠٢٦',
        'ستاند استقبال مولودة بنت باسم مريم ٢٠٢٦',
      ],
      csgArchetype: 'NEWBORN_KEEPSAKE_SIGN',
      defaultParamsJson: {
        babyName: 'زايد • Zayed',
        birthYear: 2026,
        genderTheme: 'BOY',
        widthMm: 150.0,
      },
      baseSetupFeeAed: 12.0,
    },
    {
      slug: 'business-qr-stand',
      categoryId: categoryMap['business-signage'],
      nameEn: 'Business (QR Stand, Company Name, Room Door Title)',
      nameAr: 'الأعمال (ستاند QR، اسم الشركة، لوحة باب المكتب)',
      samplePromptsEn: [
        "Angled desk QR code stand with company logo and 'Scan to Pay / Google Review'",
        "Executive room door nameplate reading 'CEO Office / مكتب المدير التنفيذي'",
      ],
      samplePromptsAr: [
        'ستاند رمز QR للمكتب أو الكافيه مع اسم الشركة',
        'لوحة باب مكتب بعبارة المدير العام مع شعار بارز',
      ],
      csgArchetype: 'BUSINESS_QR_DOOR_STAND',
      defaultParamsJson: {
        qrTargetUrl: 'https://j3d.msoms.ai',
        companyTitle: 'msoms.ai',
        standAngleDeg: 65,
        widthMm: 100.0,
        heightMm: 125.0,
      },
      baseSetupFeeAed: 10.0,
    },
    {
      slug: 'school-project-stem',
      categoryId: categoryMap['school-stem'],
      nameEn: 'School Project & STEM Model',
      nameAr: 'مشروع مدرسي ونموذج تعليمي',
      samplePromptsEn: [
        'Planetary gear set with base plate for physics class demonstration',
        'Labeled plant/animal cell 3D relief board for biology project',
      ],
      samplePromptsAr: [
        'مجموعة تروس ميكانيكية متحركة لمشروع العلوم',
        'مجسم تعليمي ثلاثي الأبعاد مع تسميات بارزة',
      ],
      csgArchetype: 'SCHOOL_STEM_GEAR_MODEL',
      defaultParamsJson: {
        gearTeethCount: 24,
        moduleMm: 2.5,
        basePlateMm: 120.0,
      },
      baseSetupFeeAed: 10.0,
    },
    {
      slug: 'home-diy-bracket',
      categoryId: categoryMap['home-diy'],
      nameEn: 'Home DIY & Custom Requirements',
      nameAr: 'أعمال منزلية DIY ومتطلبات خاصة',
      samplePromptsEn: [
        'Heavy-duty under-desk headphone hook with 35mm clamp gap',
        'Custom L-bracket shelf support with 4mm countersunk screw holes',
      ],
      samplePromptsAr: [
        'حامل سماعة تحت المكتب بمقاس فتحة ٣٥ ملم',
        'زاوية تثبيت جدارية مخصصة مع فتحات مسامير ٤ ملم',
      ],
      csgArchetype: 'HOME_DIY_CUSTOM_BRACKET',
      defaultParamsJson: {
        armLengthMm: 80.0,
        clampOpeningMm: 35.0,
        wallThicknessMm: 5.0,
        screwHoleDiameterMm: 4.2,
      },
      baseSetupFeeAed: 10.0,
    },
    {
      slug: 'headphone-desk-hanger',
      categoryId: categoryMap['gaming-desk'],
      nameEn: 'Desk Headphone & Headset Stand',
      nameAr: 'حامل سماعات الرأس الاحترافي للمكتب',
      samplePromptsEn: [
        'Curved headphone desk stand with weighted base and cable organizer',
      ],
      samplePromptsAr: [
        'حامل سماعات رأس مكتبي بتصميم قوسي أنيق مع قاعدة ثقيلة',
      ],
      csgArchetype: 'HEADPHONE_HANGER_STAND',
      defaultParamsJson: {
        heightMm: 140.0,
        cradleWidthMm: 60.0,
      },
      baseSetupFeeAed: 14.0,
    },
    {
      slug: 'custom-replacement-parts',
      categoryId: categoryMap['custom-parts'],
      nameEn: 'Custom Replacement Part & Mechanical Knob / Adapter',
      nameAr: 'قطعة غيار مخصصة ومحول ميكانيكي / مقبض تحكم',
      samplePromptsEn: [
        'Custom cylindrical knob with D-shaft bore and ribbed grip',
        'Bespoke mechanical mounting bracket and cable clip with custom dimensions',
      ],
      samplePromptsAr: [
        'مقبض أسطواني مخصص مع فتحة عمود D وأضلاع لسهولة الإمساك',
        'قطعة تثبيت ميكانيكية ومشبك كابلات بمقاسات مخصصة',
      ],
      csgArchetype: 'CUSTOM_REPLACEMENT_PART',
      defaultParamsJson: {
        outerDiameterMm: 36.0,
        shaftHoleDiameterMm: 6.0,
        partHeightMm: 24.0,
        gripRibsCount: 16,
      },
      baseSetupFeeAed: 15.0,
    },
  ];

  for (const tpl of templatesData) {
    await prisma.template.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: tpl.slug } },
      update: tpl,
      create: { ...tpl, tenantId: tenant.id },
    });
  }

  console.log('Seed completed: Tenant msoms-uae, 4 Role Users, 10 Categories, and 7 Templates ready.');
}

main()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
