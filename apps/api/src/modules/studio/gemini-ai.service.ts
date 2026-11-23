import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../../common/prisma.service';
import { VaultCryptoService } from '../../common/vault-crypto.service';

export interface DynamicQuestion {
  id: string;
  questionEn: string;
  questionAr: string;
  type: 'text' | 'number' | 'single_choice';
  options?: string[];
  suggestions?: string[];
  helpEn?: string;
  helpAr?: string;
}

@Injectable()
export class GeminiAiService {
  private readonly logger = new Logger(GeminiAiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vaultCrypto: VaultCryptoService,
  ) {}

  private async getAiClient(tenantId: string): Promise<{ ai: GoogleGenAI; textModel: string; imageModel: string }> {
    const config = await this.prisma.platformConfig.findFirst({
      where: { tenantId },
    });

    let apiKey = process.env.DEFAULT_GEMINI_API_KEY || '';
    let textModel = process.env.DEFAULT_GEMINI_TEXT_MODEL || 'gemini-4-hydrogen';
    let imageModel = process.env.DEFAULT_GEMINI_IMAGE_MODEL || 'imagen-3.0-generate-002';

    if (config?.geminiApiKeyEncrypted) {
      try {
        const decrypted = this.vaultCrypto.decrypt(config.geminiApiKeyEncrypted);
        if (decrypted) apiKey = decrypted;
      } catch (e: any) {
        this.logger.warn(`Could not decrypt stored Gemini API key: ${e.message}`);
      }
    }

    if (config?.activeGeminiTextModel) {
      textModel = config.activeGeminiTextModel;
    }
    // Safeguard: Ensure we always use modern Gemini models and never deprecated 2.5
    if (!textModel || textModel.includes('2.5-flash') || textModel.includes('3.8-flash')) {
      textModel = 'gemini-4-hydrogen';
    }
    if (config?.activeGeminiImageModel) {
      imageModel = config.activeGeminiImageModel;
    }

    return {
      ai: new GoogleGenAI({ apiKey }),
      textModel,
      imageModel,
    };
  }

  /**
   * Screens prompts for weapons, firearms, lock-picking tools, or hazardous items
   */
  async screenForSafety(input: string): Promise<{ isSafe: boolean; reason?: string }> {
    const prohibitedKeywords = [
      'gun', 'firearm', 'weapon', 'glock', 'bullet', 'receiver', 'suppressor',
      'lockpick', 'bump key', 'handcuff key', 'explosive', 'grenade', 'knife blade',
      'سلاح', 'مسدس', 'بندقية', 'رصاصة', 'مفتاح قفل', 'متفجرات', 'سكين',
    ];

    const lower = input.toLowerCase();
    for (const kw of prohibitedKeywords) {
      if (lower.includes(kw)) {
        return {
          isSafe: false,
          reason: `Input violates 3D safety policy: contains prohibited term '${kw}'`,
        };
      }
    }

    return { isSafe: true };
  }

  /**
   * Generates 3-4 intuitive, non-technical, human-friendly questions with suggestion chips
   */
  async generateDynamicQuestions(options: {
    tenantId: string;
    categorySlug: string;
    templateSlug: string;
    userNotes?: string;
    locale: string;
  }): Promise<DynamicQuestion[]> {
    const { tenantId, categorySlug, templateSlug, userNotes, locale } = options;

    if (userNotes) {
      const safety = await this.screenForSafety(userNotes);
      if (!safety.isSafe) {
        throw new Error(safety.reason);
      }
    }

    try {
      const { ai, textModel } = await this.getAiClient(tenantId);

      const prompt = `
You are an expert, friendly 3D printing product designer for J3D (j3d.msoms.ai), an on-demand 3D printing marketplace in the UAE.
The user wants to customize a 3D printable object:
- Category: "${categorySlug}"
- Template: "${templateSlug}"
${userNotes ? `- User Notes: "${userNotes}"` : ''}

CRITICAL RULES:
1. The end-user is a regular non-technical person who doesn't understand 3D printing jargon (do NOT ask about infill %, layer heights, G-code, shells, or wall thickness).
2. Ask 3 or 4 practical, visual, intuitive questions about:
   - What device, occasion, or setting it is for.
   - What text, name, phone number, or URL should be engraved or embossed on the front.
   - Functional features (e.g., charging cable notch, viewing angle, business card slot, mounting style).
3. For text inputs, ALWAYS provide 3-5 quick "suggestions" (pre-made 1-click pills the user can click).
4. Provide high-quality bilingual English & Arabic texts.

Respond strictly with a valid JSON array of objects with this schema:
[
  {
    "id": "unique_camelCase_id",
    "questionEn": "Human-friendly question in English",
    "questionAr": "سؤال واضح وسهل بالعربية بدون مصطلحات معقدة",
    "type": "text" | "single_choice",
    "options": ["Option 1", "Option 2"], // required if type is single_choice
    "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"], // helpful quick presets
    "helpEn": "Short 1-sentence tip in English",
    "helpAr": "تلميح مبسط في جملة واحدة"
  }
]

Output ONLY the JSON array inside a \`\`\`json markdown block.
`;

      let resp;
      try {
        resp = await ai.models.generateContent({
          model: textModel,
          contents: prompt,
        });
      } catch (genErr: any) {
        if (textModel !== 'gemini-4-hydrogen') {
          this.logger.warn(`Dynamic questions failed with ${textModel}: ${genErr.message}. Retrying with gemini-4-hydrogen...`);
          resp = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: prompt,
          });
        } else {
          throw genErr;
        }
      }

      const text = resp.text || '';
      const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        const jsonStr = match[1] || match[0];
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err: any) {
      this.logger.warn(`Gemini dynamic question generation failed: ${err.message}. Using built-in curated questions.`);
    }

    // High quality curated fallback questions per template
    if (templateSlug === 'phone-tablet-stand') {
      return [
        {
          id: 'deviceType',
          questionEn: 'Which device will you primarily rest on this stand?',
          questionAr: 'ما هو الجهاز الأساسي الذي ستضعه على هذا الحامل؟',
          type: 'single_choice',
          options: [
            'Smartphones (iPhone 14/15/16, Samsung Galaxy)',
            'Tablets & iPads (10 to 13 inch)',
            'Universal Desk Display (Phone + Business Cards)',
          ],
          suggestions: ['iPhone / Galaxy', 'iPad / Tablet', 'Universal Desk'],
          helpEn: 'We optimize the cradle width and backrest tilt to fit your device securely.',
          helpAr: 'نقوم بضبط أبعاد الحامل وقوة انحنائه ليناسب وزن وحجم جهازك تماماً.',
        },
        {
          id: 'embossedText',
          questionEn: 'Custom name, monogram, or phrase to emboss on the front bevel:',
          questionAr: 'الاسم أو العبارة المراد نقشها على الحافة الأمامية للحامل:',
          type: 'text',
          suggestions: ['مكتبي الخاص', 'My Desk', 'Mohamed', 'CEO Office', 'Apple Fan', 'Work In Progress'],
          helpEn: 'Embossed with 0.8mm depth for crisp, visible 3D lettering.',
          helpAr: 'يتم حفر الحروف بدقة ٠.٨ ملم لتظهر بارزة وواضحة جداً عند الطباعة.',
        },
        {
          id: 'viewingAngle',
          questionEn: 'Preferred viewing angle on your desk:',
          questionAr: 'زاوية الرؤية المفضلة لجهازك على المكتب:',
          type: 'single_choice',
          options: [
            'Ergonomic 65° (Optimal for Zoom & FaceTime video calls)',
            'Relaxed 75° (Ideal for watching videos & notifications)',
          ],
        },
        {
          id: 'cableManagement',
          questionEn: 'Charging cable channel option:',
          questionAr: 'ممر كابل الشحن في قاعدة الحامل:',
          type: 'single_choice',
          options: [
            'Pass-Through Notch (Charge phone upright while resting)',
            'Solid Smooth Front (Clean minimalist look)',
          ],
        },
      ];
    } else if (templateSlug === 'business-qr-stand') {
      return [
        {
          id: 'qrAction',
          questionEn: 'What action should customers take when scanning your 3D QR stand?',
          questionAr: 'ما الإجراء المطلوب عند مسح رمز الـ QR من قبل عملائك؟',
          type: 'single_choice',
          options: [
            'Instagram / Social Media Page',
            'Google Review & Maps Location',
            'Digital Menu / Website Link',
            'Direct Payment / Tip Link',
          ],
          suggestions: ['Instagram', 'Google Reviews', 'Website', 'Payment'],
          helpEn: 'We calibrate high-contrast 3D raised blocks for 100% optical camera readability.',
          helpAr: 'نبرز مربعات الـ QR بثلاثية أبعاد بارزة لتقرأها كاميرات الهواتف فوراً دون خطأ.',
        },
        {
          id: 'companyHeader',
          questionEn: 'Company name or social handle to display on the top banner:',
          questionAr: 'اسم المنشأة أو حساب التواصل الذي سيوضع في الشريط العلوي:',
          type: 'text',
          suggestions: ['@MyBrand', 'Scan Me', 'MSOMS AI', 'Cafe Lounge', 'تابعنا على إنستغرام'],
          helpEn: 'Displays above the QR matrix on the inclined placard.',
          helpAr: 'يوضع في أعلى اللوحة المائلة فوق رمز الـ QR تماماً.',
        },
        {
          id: 'cardSlotOption',
          questionEn: 'Front pedestal business card pocket:',
          questionAr: 'جيب إضافي لحمل بطاقات العمل (Business Cards) أمام الستاند:',
          type: 'single_choice',
          options: [
            'Include Front Card Pocket (Holds ~15 business cards)',
            'Slim Clean Stand (Without card pocket)',
          ],
        },
      ];
    } else if (templateSlug === 'eid-10aed-ring') {
      return [
        {
          id: 'embossedText',
          questionEn: 'Custom Eid greeting or family name to emboss on the outer ring:',
          questionAr: 'العبارة أو اسم العائلة المراد نقشه على الخاتم الخارجي:',
          type: 'text',
          suggestions: ['عيدكم مبارك', 'عساكم من عواده', 'عيدية عائلة المنصوري', 'Eid Mubarak', 'كل عام وأنتم بخير'],
          helpEn: 'Embossed along the front face with celebratory Arabic calligraphy.',
          helpAr: 'تُنقش بخط عربي احتفالي أنيق وواضح حول واجهة الخاتم.',
        },
        {
          id: 'crestStyle',
          questionEn: 'Decorative top crest style:',
          questionAr: 'الشكل الزخرفي في قمة الخاتم:',
          type: 'single_choice',
          options: [
            'Crescent Moon & Star Crown (رمز الهلال والنجمة)',
            'Sleek Beveled Ring (تصميم انسيابي ناعم)',
          ],
        },
      ];
    } else if (templateSlug === 'islamic-phrases-stand') {
      return [
        {
          id: 'phraseText',
          questionEn: 'Choose or type the sacred phrase / verse to display:',
          questionAr: 'اختر أو اكتب الآية الكريمة أو العبارة الإسلامية المطلوبة:',
          type: 'text',
          suggestions: [
            'ما شاء الله تبارك الله',
            'آية الكرسي',
            'بسم الله الرحمن الرحيم',
            'الحمد لله رب العالمين',
            'دعاء دخول المنزل',
          ],
          helpEn: 'Rendered in raised 3D architectural relief inside an arched Mihrab frame.',
          helpAr: 'تظهر بارزة ثلاثية الأبعاد داخل إطار محراب إسلامي مقوس ومبهر.',
        },
        {
          id: 'pedestalTier',
          questionEn: 'Pedestal base style:',
          questionAr: 'نمط القاعدة المكتبي:',
          type: 'single_choice',
          options: [
            'Dual-Tier Ceremonial Base (قاعدة رخامية مدرجة ثنائية)',
            'Modern Minimalist Solid Base (قاعدة مستقيمة عصرية)',
          ],
        },
      ];
    } else if (templateSlug === 'newborn-mabrouk-plaque') {
      return [
        {
          id: 'babyName',
          questionEn: "Newborn baby's name (in Arabic or English):",
          questionAr: 'اسم المولود الجديد (بالعربية أو الإنجليزية):',
          type: 'text',
          suggestions: ['زايد • Zayed', 'مريم • Mariam', 'راشد • Rashid', 'نورة • Noura', 'سلطان • Sultan', 'فاطمة • Fatima'],
          helpEn: 'Embossed with rounded 3D letters on the main central arch banner.',
          helpAr: 'يُطبع بحروف بارزة ثلاثية الأبعاد وناعمة على واجهة اللوحة الرئيسية.',
        },
        {
          id: 'genderTheme',
          questionEn: 'Decorative theme & motifs:',
          questionAr: 'طابع وزخارف الاستقبال:',
          type: 'single_choice',
          options: [
            'Boy Theme: Crescent Moon & Golden Star (ولد: هلال ونجمة)',
            'Girl Theme: Crown & Elegant Bow Knot (بنت: تاج وفيونكة ناعمة)',
          ],
        },
        {
          id: 'birthYear',
          questionEn: 'Birth year or date to display on the base pedestal:',
          questionAr: 'سنة أو تاريخ الميلاد المنقوش على قاعدة المجسم:',
          type: 'text',
          suggestions: ['2026', '١٤٤٧ هـ', 'Welcome Little Prince', 'Welcome Little Princess', 'نورت الدنيا'],
        },
      ];
    } else if (templateSlug === 'school-project-stem') {
      return [
        {
          id: 'stemTheme',
          questionEn: 'What is the focus of your STEM / school science model?',
          questionAr: 'ما هو موضوع مشروعك المدرسي أو العلمي؟',
          type: 'single_choice',
          options: [
            'Planetary Mechanical Gear System (نظام التروس الميكانيكي)',
            'Physics Demonstration Stage (منصة تجارب فيزيائية)',
            'Engineering Mechanism Display (نموذج هندسي تفاعلي)',
          ],
          suggestions: ['Mechanical Gears', 'Physics Demo', 'Engineering'],
        },
        {
          id: 'gearTeethCount',
          questionEn: 'Preferred gear tooth ratio / density:',
          questionAr: 'عدد أسنان الترس المركزي المناسب للمشروع:',
          type: 'single_choice',
          options: [
            'Standard 24-Teeth Sun Gear (حجم قياسي ٢٤ سناً)',
            'High-Reduction 36-Teeth Gear (ترس كبير ٣٦ سناً)',
            'Compact 16-Teeth Gear (ترس مدمج ١٦ سناً)',
          ],
        },
        {
          id: 'projectLabelText',
          questionEn: 'Student name, grade, or project title for the front label:',
          questionAr: 'اسم الطالب، الصف، أو عنوان المشروع للشريط الأمامي:',
          type: 'text',
          suggestions: ['STEM 2026', 'Grade 10 Physics', 'مشروع العلوم', 'Solar System Gears'],
        },
      ];
    } else if (templateSlug === 'home-diy-bracket') {
      return [
        {
          id: 'bracketUsage',
          questionEn: 'What will you mount or hang with this bracket?',
          questionAr: 'ما هو الغرض الأساسي من هذه الزاوية أو الحامل المنزلي؟',
          type: 'single_choice',
          options: [
            'Under-Desk Headphone / Bag Hook (حامل تحت المكتب للسماعات والحقائب)',
            'Wall-Mounted Shelf Support Bracket (زاوية تثبيت رف جداري)',
            'Cable & Power Strip Organizer Mount (حامل ومثبت مقابس وكابلات)',
          ],
        },
        {
          id: 'mountingMethod',
          questionEn: 'Mounting & attachment preference:',
          questionAr: 'طريقة التثبيت المفضلة على السطح أو الجدار:',
          type: 'single_choice',
          options: [
            'Screw Mount (4x Countersunk 4.2mm holes) (تثبيت بمسامير غائرة)',
            'Heavy-Duty Double-Sided VHB Tape Bed (سطح أملس للشريط اللاصق القوي)',
          ],
        },
        {
          id: 'customText',
          questionEn: 'Custom engraved label on the bracket arm (optional):',
          questionAr: 'كلمة أو رمز محفور على ذراع الحامل (اختياري):',
          type: 'text',
          suggestions: ['J3D Heavy-Duty', 'Max 5KG', 'Desk Organizer', 'Home Workshop'],
        },
      ];
    } else if (templateSlug === 'headphone-desk-hanger') {
      return [
        {
          id: 'cradleStyle',
          questionEn: 'Headphone headband cradle contour:',
          questionAr: 'شكل قوس تثبيت طوق السماعة:',
          type: 'single_choice',
          options: [
            'Curved Wide Cradle (Optimal for leather & padded headbands)',
            'Deep Notch Cradle (Prevents headphones slipping off)',
          ],
        },
        {
          id: 'baseFeature',
          questionEn: 'Pedestal base convenience feature:',
          questionAr: 'ميزة قاعدة الستاند المكتبية:',
          type: 'single_choice',
          options: [
            'Concave Catch-All Tray (Holds coins, keys, flash drives)',
            'Solid Weighted Beveled Disc (Minimalist look)',
          ],
        },
        {
          id: 'engravedLogo',
          questionEn: 'Custom gamer tag, studio name, or logo text:',
          questionAr: 'اسم المستخدم، اسم الاستوديو، أو العبارة المراد نقشها:',
          type: 'text',
          suggestions: ['Gamer Zone', 'Studio Pro', 'No Sound No Life', 'محمد • Mohamed'],
        },
      ];
    } else if (templateSlug === 'custom-replacement-parts') {
      return [
        {
          id: 'partType',
          questionEn: 'What type of replacement part or mechanical fixture do you need?',
          questionAr: 'ما نوع قطعة الغيار أو المكون الميكانيكي المطلوب؟',
          type: 'single_choice',
          options: [
            'Control Knob & Potentiometer Dial (مقبض تحكم ومفتاح أجهزة)',
            'Shaft Coupler & Adapter Collar (وصلة ومحول محاور أسطواني)',
            'Mechanical Bushing & Spacer (جلية مباعدة وحلقة تثبيت)',
          ],
        },
        {
          id: 'shaftType',
          questionEn: 'Inner shaft bore shape & diameter:',
          questionAr: 'قطر وشكل فتحة العمود الداخلية:',
          type: 'single_choice',
          options: [
            'Standard 6.0mm D-Shaft (with Flat Key) (عمود ٦ ملم مقطوع D)',
            'Standard 6.0mm Round Bore with M3 Set-Screw (عمود دائري ٦ ملم مع مسمار تثبيت)',
            'Universal 8.0mm Round Shaft (عمود دائري ٨ ملم)',
          ],
        },
        {
          id: 'gripStyle',
          questionEn: 'Outer surface texture & ergonomics:',
          questionAr: 'الملمس السطحي الخارجي لسهولة الإمساك:',
          type: 'single_choice',
          options: [
            '16 Ribbed Flutes (High-Traction Knurling) (أضلاع بارزة ١٦ سناً لمنع الانزلاق)',
            'Smooth Minimalist Cylinder with Indicator Notch (أسطوانة ناعمة مع علامة مؤشر)',
          ],
        },
      ];
    }

    return [
      {
        id: 'customText',
        questionEn: 'Custom engraved name or phrase:',
        questionAr: 'الاسم أو العبارة المراد نقشها على المجسم:',
        type: 'text',
        suggestions: ['J3D UAE', 'Custom 3D', 'My Office', 'هدية تذكارية'],
      },
      {
        id: 'mountingOption',
        questionEn: 'Intended placement:',
        questionAr: 'مكان وضع المجسم:',
        type: 'single_choice',
        options: ['Freestanding Desk (مكتبي قائم بذاته)', 'Wall / Surface Mount (تثبيت جداري)'],
      },
    ];
  }

  /**
   * Generates a watertight CSG primitive recipe from natural language user prompt using Gemini 4 Hydrogen
   */
  async generateCustomModelRecipe(options: {
    tenantId: string;
    prompt: string;
    locale: string;
  }): Promise<{
    titleEn: string;
    titleAr: string;
    designRationale: string;
    nodes: any[];
    modelUsed: string;
    promptSent: string;
    inferenceLatencyMs: number;
  }> {
    const { tenantId, prompt, locale } = options;

    const safety = await this.screenForSafety(prompt);
    if (!safety.isSafe) {
      throw new Error(safety.reason);
    }

    const startTime = Date.now();
    let textModel = 'gemini-4-hydrogen';
    let aiPrompt = '';

    try {
      const clientInfo = await this.getAiClient(tenantId);
      const ai = clientInfo.ai;
      textModel = clientInfo.textModel || 'gemini-4-hydrogen';

      // Detect if the prompt contains a target website or URL
      let targetUrl = 'https://msoms.ai';
      const urlMatch = prompt.match(/https?:\/\/[^\s"'\\]+/i);
      if (urlMatch) {
        targetUrl = urlMatch[0];
      } else if (/j3d/i.test(prompt)) {
        targetUrl = 'https://j3d.msoms.ai';
      }

      aiPrompt = `
You are a Principal 3D Computational Geometry & CAD Engineer for J3D (j3d.msoms.ai).
The user wants to 3D print a custom object from this prompt:
"${prompt}"

CRITICAL 3D PRINTING & SOLID MANIFOLD RULES:
1. Output MUST be an interconnected, 100% watertight solid (manifold geometry) designed for additive manufacturing (FDM / Bambu Lab / Creality).
2. The model MUST have a stable flat bottom resting on the build plate (Z=0). Base height should be 8mm to 16mm.
3. Absolutely NO floating or disconnected parts. Every single node must physically connect with the base or main body.
4. Scale: Realistic millimeter units (total bounding box between 50mm and 180mm).
5. Supported CSG primitives:
   - "box": with size [x,y,z], optional roundRadius (fillet/chamfer in mm), position [x,y,z], rotationDeg [rx,ry,rz].
   - "cylinder": with radius, height, position [x,y,z], rotationDeg [rx,ry,rz].
   - "sphere": with radius, position [x,y,z].
   - "qr_code": for QR codes/scannable placards, with text (target URL), size [widthMm, heightMm, reliefDepthMm], position [x,y,z], rotationDeg [rx,ry,rz].
   - "text": for 3D raised Arabic calligraphy or embossed text inscriptions, with text (the phrase/name to sculpt in 3D), size [widthMm, heightMm, reliefDepthMm], position [x,y,z], rotationDeg [rx,ry,rz].
6. Boolean operations:
   - "add": union / join solid parts.
   - "subtract": bore holes, cut slots, create pencil/pen grooves, hollow cavities.
   - "intersect": keep overlapping region.

SPECIALIZED DESIGN PATTERNS:
- For desktop stands, phone stands, or QR code displays:
  1. Base plate: Wide, chamfered/rounded solid base resting on Z=0 (e.g. [76, 76, 12] with roundRadius: 4, position: [0, 0, 6]).
  2. Angled display placard: Angled backward at 60° to 75° elevation (e.g. rotationDeg [65, 0, 0]) for optimal scanning and ergonomic viewing.
  3. Diagonal rear strut or gusset to guarantee mechanical strength and rigidity.
  4. If a QR code, barcode, or website is requested (URL detected: "${targetUrl}"), add a "qr_code" node with text: "${targetUrl}", size [50, 50, 1.2], placed flush on the front face of the angled placard with the SAME rotationDeg (e.g. [65, 0, 0]).
  5. Add convenient ergonomic features like a pen slot or business card pocket using "subtract" operation.

- For commemorative plaques, graduation shields, award trophies, or Arabic calligraphy stands (MakerWorld / Printables Grade):
  1. Base plate: Stepped dual-tier ceremonial base with generous chamfers (e.g. lower tier [136, 48, 8] with roundRadius: 3 at [0, 0, 4], upper tier [120, 36, 6] with roundRadius: 2 at [0, 0, 10]).
  2. Shield / Arch body: Sleek and elegant (thickness strictly 5mm to 6mm, NEVER bulky or thick blocks!). E.g., main plaque [96, 5, 116] with roundRadius: 3 at [0, 0, 65].
  3. Rear Rigidity Gussets: Twin triangular buttress ribs at the back (e.g. [5, 18, 34] at [-34, 11, 24] and [34, 11, 24]) for physical print rigidity and trophy aesthetics.
  4. Apex Crest Motif: An 8-point geometric Islamic star crest at the apex (e.g. [24, 3.5, 24] rotated 45° at [0, -1.0, 124] with center cylinder medallion).
  5. Raised Picture-Frame Border: Raised outer perimeter rim (+1.8mm proud) around the front face (e.g. [86, 2.2, 88] with roundRadius: 2 at [0, -2.6, 60]).
  6. Framed Recessed Bed: Recessed pocket cavity using "subtract" (e.g. [80, 1.8, 82] with roundRadius: 1.5 at [0, -3.2, 60]), creating a recessed bed ideal for dual-color filament contrast.
  7. Decorative Divider: Subtle horizontal separator bar (e.g. [54, 1.4, 2.2] at [0, -2.6, 51]).
  8. 3D Raised Calligraphy & Text: Always create a "text" node with the user's primary greeting (e.g. text: "مبارك التخرج" or custom phrase, size: [72, 18, 2.6], position: [0, -4.4, 66], rotationDeg: [90, 0, 0]), and if a recipient name or date is requested, a secondary "text" node (e.g. size: [64, 12, 2.0], position: [0, -4.4, 38], rotationDeg: [90, 0, 0]).
  Text MUST be placed horizontal along X, upright along Z, with proud relief protruding forward (-Y direction).

Return strictly a JSON object with this schema:
{
  "titleEn": "Concise English Title",
  "titleAr": "عنوان واضح وموجز بالعربية",
  "designRationale": "1-sentence CAD engineering rationale explaining structural integrity and ergonomics",
  "nodes": [
    {
      "type": "box" | "cylinder" | "sphere" | "qr_code" | "text",
      "operation": "add" | "subtract" | "intersect",
      "size": [x, y, z],
      "radius": 15,
      "height": 40,
      "position": [x, y, z],
      "rotationDeg": [rx, ry, rz],
      "roundRadius": 2,
      "text": "Calligraphy or URL string"
    }
  ]
}

Output ONLY the JSON object inside a \`\`\`json markdown block.
`;

      let resp;
      try {
        resp = await ai.models.generateContent({
          model: textModel,
          contents: aiPrompt,
        });
      } catch (genErr: any) {
        if (textModel !== 'gemini-4-hydrogen') {
          this.logger.warn(`Custom CSG synthesis failed with ${textModel}: ${genErr.message}. Retrying with gemini-4-hydrogen...`);
          textModel = 'gemini-4-hydrogen';
          resp = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: aiPrompt,
          });
        } else {
          throw genErr;
        }
      }

      const text = resp.text || '';
      const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      if (match) {
        const jsonStr = match[1] || match[0];
        const parsed = JSON.parse(jsonStr);
        if (parsed.nodes && Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
          const latencyMs = Date.now() - startTime;
          this.logger.log(`Gemini 4 Hydrogen synthesized ${parsed.nodes.length} CSG nodes in ${latencyMs}ms for: "${prompt.slice(0, 50)}..."`);
          return {
            titleEn: parsed.titleEn || 'Custom 3D Object',
            titleAr: parsed.titleAr || 'مجسم مخصص ثلاثي الأبعاد',
            designRationale: parsed.designRationale || 'Watertight parametric CSG solid designed for 3D printing.',
            nodes: parsed.nodes,
            modelUsed: textModel,
            promptSent: aiPrompt,
            inferenceLatencyMs: latencyMs,
          };
        }
      }
    } catch (err: any) {
      this.logger.warn(`Gemini custom CSG synthesis failed: ${err.message}. Using robust parametric fallback.`);
    }

    const latencyMs = Date.now() - startTime;
    // High quality fallback: Desk Organizer Tray with slots
    return {
      titleEn: 'Custom Multi-Compartment Desk Organizer',
      titleAr: 'منظم مكتبي متعدد الأقسام مخصص',
      designRationale: 'Watertight multi-compartment solid tray with pen bores and chamfered edges.',
      modelUsed: textModel,
      promptSent: aiPrompt,
      inferenceLatencyMs: latencyMs,
      nodes: [
        // Solid outer body
        {
          type: 'box',
          operation: 'add',
          size: [100, 70, 36],
          position: [0, 0, 18],
          roundRadius: 3,
        },
        // Main left compartment cut
        {
          type: 'box',
          operation: 'subtract',
          size: [42, 58, 32],
          position: [-24, 0, 20],
          roundRadius: 2,
        },
        // Right pen holder cylindrical bore 1
        {
          type: 'cylinder',
          operation: 'subtract',
          radius: 12,
          height: 34,
          position: [24, -15, 20],
        },
        // Right pen holder cylindrical bore 2
        {
          type: 'cylinder',
          operation: 'subtract',
          radius: 12,
          height: 34,
          position: [24, 15, 20],
        },
      ],
    };
  }
}
