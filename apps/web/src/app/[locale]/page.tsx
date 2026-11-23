'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  Grid,
  Button,
  Input,
  Textarea,
  Separator,
  Spinner,
} from '@chakra-ui/react';
import {
  Sparkles,
  Cpu,
  Layers,
  ArrowRight,
  ArrowLeft,
  Wand2,
  CheckCircle2,
  Box as BoxIcon,
  ShoppingBag,
  RotateCcw,
  Download,
  ShieldCheck,
  CreditCard,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Gift,
  Award,
  Baby,
  QrCode,
  GraduationCap,
  Wrench,
  Gamepad2,
  Cog,
  Radio,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThreeStlCanvas } from '../../components/studio/ThreeStlCanvas';
import { OsmLocationPicker } from '../../components/location/OsmLocationPicker';
import { useAuth } from '@/context/AuthContext';
import { MaterialType, ColorMode } from '@j3d/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function TypeformStudioLandingPage() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const router = useRouter();
  const { user, fetchWithAuth } = useAuth();

  // Wizard Step: 1 = Category, 2 = Template, 3 = AI Parameters, 4 = 3D Studio Preview, 5 = UAE Delivery & Escrow
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Data states
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selectedCat, setSelectedCat] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Step 3: AI Questions & Answers
  const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [activePresetIdx, setActivePresetIdx] = useState<number | null>(null);
  const [userCustomNotes, setUserCustomNotes] = useState('');
  const [isCompilingStl, setIsCompilingStl] = useState(false);

  // Natural Language Prompt-to-3D State (Gemini 4 Hydrogen + Manifold-3D)
  const [freeformPrompt, setFreeformPrompt] = useState('');
  const [isSynthesizingFreeform, setIsSynthesizingFreeform] = useState(false);

  // Step 4: 3D Studio & Mesh Spec
  const [compiledStl, setCompiledStl] = useState<any>(null);
  const [showAiPromptInspector, setShowAiPromptInspector] = useState(false);
  const [material, setMaterial] = useState<MaterialType>(MaterialType.PLA);
  const [colorMode, setColorMode] = useState<ColorMode>(ColorMode.MONO);
  const [selectedColor, setSelectedColor] = useState<string>('#F97316');
  const [scalePercent, setScalePercent] = useState<number>(100);
  const [quantity, setQuantity] = useState<number>(25);

  // Step 5: UAE Delivery & Budget Ceiling
  const [selectedEmirate, setSelectedEmirate] = useState('Dubai');
  const [district, setDistrict] = useState('Downtown Dubai');
  const [streetAddress, setStreetAddress] = useState('Boulevard Plaza Tower 1');
  const [deliveryLat, setDeliveryLat] = useState(25.1972);
  const [deliveryLng, setDeliveryLng] = useState(55.2744);
  const [printBudgetAed, setPrintBudgetAed] = useState<number>(150);
  const [deliveryBudgetAed, setDeliveryBudgetAed] = useState<number>(35);
  const [isAuthorizingEscrow, setIsAuthorizingEscrow] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const iconMap: Record<string, any> = {
    'stands-holders': Smartphone,
    'giveaways-favors': Gift,
    'islamic-calligraphy': Sparkles,
    'congratulations-trophies': Award,
    'newborn-keepsakes': Baby,
    'business-signage': QrCode,
    'school-stem': GraduationCap,
    'home-diy': Wrench,
    'gaming-desk': Gamepad2,
    'custom-parts': Cog,
  };

  const emiratesList = [
    { id: 'Dubai', en: 'Dubai', ar: 'دبي' },
    { id: 'Abu Dhabi', en: 'Abu Dhabi', ar: 'أبوظبي' },
    { id: 'Sharjah', en: 'Sharjah', ar: 'الشارقة' },
    { id: 'Ajman', en: 'Ajman', ar: 'عجمان' },
    { id: 'Ras Al Khaimah', en: 'Ras Al Khaimah', ar: 'رأس الخيمة' },
    { id: 'Fujairah', en: 'Fujairah', ar: 'الفجيرة' },
    { id: 'Umm Al Quwain', en: 'Umm Al Quwain', ar: 'أم القيوين' },
  ];

  const colorPaletteOptions = [
    { hex: '#F97316', labelEn: 'Extruder Orange', labelAr: 'برتقالي' },
    { hex: '#14B8A6', labelEn: 'Laser Teal', labelAr: 'تيل بحري' },
    { hex: '#18181B', labelEn: 'Matte Black', labelAr: 'أسود مطفي' },
    { hex: '#F8FAFC', labelEn: 'Pure White', labelAr: 'أبيض ناصع' },
    { hex: '#EAB308', labelEn: 'Silk Gold', labelAr: 'ذهبي حريري' },
    { hex: '#3B82F6', labelEn: 'Royal Blue', labelAr: 'أزرق ملكي' },
  ];

  const categoryExamplesMap: Record<string, { en: string; ar: string }> = {
    'stands-holders': {
      en: 'iPhone Stand • iPad Holder • Cable Pass Notch',
      ar: 'حامل هواتف • مسند أجهزة لوحية • ممر كابل شحن',
    },
    'giveaways-favors': {
      en: 'Eid 10 AED Note Ring • Event Favors • Wedding Gifts',
      ar: 'خواتم عيدية النقدية • توزيعات أعراس • هدايا مناسبات',
    },
    'islamic-calligraphy': {
      en: 'Mihrab Architectural Arch • Quranic Desk Stand',
      ar: 'أقواس المحاريب المعمارية • آيات مكتبية ثلاثية الأبعاد',
    },
    'congratulations-trophies': {
      en: 'Graduation Shield • 8-Point Star Trophy • Inscription Plaque',
      ar: 'دروع تخرج • أوسمة نجمية • لوحات إهداء تذكارية',
    },
    'newborn-keepsakes': {
      en: 'Baby Milestone Sign • Name Plaque • Crib Keepsake',
      ar: 'لوحات مواليد • أسماء بارزة • تذكارات استقبال',
    },
    'business-signage': {
      en: '3D QR Stand • Instagram Card • Desk Placard & Slot',
      ar: 'مساند كود QR • بطاقات إنستغرام • لافتات مكتبية بجيوب',
    },
    'school-stem': {
      en: 'Spur Gear Model • Planetary Cogs • Physics Demonstrators',
      ar: 'تروس ميكانيكية • نماذج تعليمية • مشاريع فيزياء',
    },
    'home-diy': {
      en: 'Reinforced 90° L-Bracket • Cable Guides • Wall Mounts',
      ar: 'زوايا تثبيت مقواة • مثبتات حائط • منظمات كوابل',
    },
    'gaming-desk': {
      en: 'Headphone Riser • Controller Cradle • Desk Organizer',
      ar: 'حوامل سماعات مكتبية • قواعد يد تحكم • مساند ألعاب',
    },
    'custom-parts': {
      en: 'Knobs & Dials • Custom Housings • Snap-fit Enclosures',
      ar: 'مقابض وأزرار • أغطية محكمة • قطع غيار مخصصة',
    },
  };

  const templatePresetsMap: Record<string, Array<{ labelEn: string; labelAr: string; answers: Record<string, any> }>> = {
    'phone-tablet-stand': [
      {
        labelEn: 'Office Desk Video Calls',
        labelAr: 'مكتب العمل ومكالمات Zoom',
        answers: {
          deviceType: 'Smartphones (iPhone 14/15/16, Samsung Galaxy)',
          embossedText: 'My Desk',
          viewingAngle: 'Ergonomic 65° (Optimal for Zoom & FaceTime video calls)',
          cableManagement: 'Pass-Through Notch (Charge phone upright while resting)',
        },
      },
      {
        labelEn: 'Bedside Nightstand',
        labelAr: 'طاولة السرير الجانبية',
        answers: {
          deviceType: 'Smartphones (iPhone 14/15/16, Samsung Galaxy)',
          embossedText: 'Nightstand',
          viewingAngle: 'Relaxed 75° (Ideal for watching videos & notifications)',
          cableManagement: 'Pass-Through Notch (Charge phone upright while resting)',
        },
      },
      {
        labelEn: 'Reception / Tablet Counter',
        labelAr: 'طاولة استقبال / جهاز لوحي',
        answers: {
          deviceType: 'Tablets & iPads (10 to 13 inch)',
          embossedText: 'Welcome',
          viewingAngle: 'Ergonomic 65° (Optimal for Zoom & FaceTime video calls)',
          cableManagement: 'Pass-Through Notch (Charge phone upright while resting)',
        },
      },
    ],
    'business-qr-stand': [
      {
        labelEn: 'Instagram Account',
        labelAr: 'حساب إنستغرام المتجر',
        answers: {
          qrType: 'Instagram Profile',
          businessName: 'My UAE Boutique',
          qrContent: 'https://instagram.com/mybrand',
        },
      },
      {
        labelEn: 'WhatsApp Support',
        labelAr: 'واتساب خدمة العملاء',
        answers: {
          qrType: 'WhatsApp Chat',
          businessName: 'Customer Support',
          qrContent: 'https://wa.me/971500000000',
        },
      },
      {
        labelEn: 'Guest Free Wi-Fi',
        labelAr: 'واي فاي مجاني للزوار',
        answers: {
          qrType: 'WiFi Network Login',
          businessName: 'Guest WiFi',
          qrContent: 'WIFI:S:Guest-WiFi;T:WPA;P:Welcome2026;;',
        },
      },
    ],
    'eid-10aed-ring': [
      {
        labelEn: 'Eid Al-Fitr 10 AED Note',
        labelAr: 'عيدية عيد الفطر ١٠ دراهم',
        answers: {
          embossedText: 'عيدكم مبارك',
          crestStyle: 'Crescent Moon & Star Crown (رمز الهلال والنجمة)',
        },
      },
      {
        labelEn: 'Eid Al-Adha Blessing',
        labelAr: 'تهنئة عيد الأضحى المبارك',
        answers: {
          embossedText: 'عساكم من عواده',
          crestStyle: 'Crescent Moon & Star Crown (رمز الهلال والنجمة)',
        },
      },
    ],
    'eid-currency-ring': [
      {
        labelEn: 'Eid Al-Fitr 10 AED Note',
        labelAr: 'عيدية عيد الفطر ١٠ دراهم',
        answers: {
          embossedText: 'عيدكم مبارك',
          crestStyle: 'Crescent Moon & Star Crown (رمز الهلال والنجمة)',
        },
      },
    ],
    'islamic-phrases-stand': [
      {
        labelEn: 'MashaAllah TabarakAllah',
        labelAr: 'ما شاء الله تبارك الله',
        answers: {
          phraseText: 'ما شاء الله لا قوة إلا بالله',
          pedestalTier: 'Dual-Tier Ceremonial Base (قاعدة رخامية مدرجة ثنائية)',
        },
      },
      {
        labelEn: 'Ayat Al-Kursi Stand',
        labelAr: 'آية الكرسي الشريفة',
        answers: {
          phraseText: 'آية الكرسي',
          pedestalTier: 'Dual-Tier Ceremonial Base (قاعدة رخامية مدرجة ثنائية)',
        },
      },
    ],
    'islamic-calligraphy-arch': [
      {
        labelEn: 'MashaAllah TabarakAllah',
        labelAr: 'ما شاء الله تبارك الله',
        answers: {
          phraseText: 'ما شاء الله لا قوة إلا بالله',
        },
      },
    ],
    'arab-congratulations-plaque': [
      {
        labelEn: 'Graduation Shield',
        labelAr: 'درع تخرج جامعي',
        answers: {
          occasionType: 'Graduation (تخرج)',
          mainGreetingText: 'مبارك التخرج',
          recipientNameAndDate: 'محمد • Mohamed - دفعة 2026',
          displayStyle: 'Tabletop Display Stand (مع قاعدة لوضعها على الطاولة أو الرف)',
          recipientName: 'محمد • Mohamed',
          occasionTitle: 'ألف مبروك التخرج (Graduation Honor)',
        },
      },
      {
        labelEn: 'Wedding Congratulations',
        labelAr: 'تهنئة زواج مبارك',
        answers: {
          occasionType: 'Wedding / Engagement (زواج أو خطوبة)',
          mainGreetingText: 'بارك الله لكما وبارك عليكما',
          recipientNameAndDate: 'العروسين • Newlyweds - 2026',
          displayStyle: 'Tabletop Display Stand (مع قاعدة لوضعها على الطاولة أو الرف)',
          recipientName: 'العروسين • Newlyweds',
          occasionTitle: 'بارك الله لكما وبارك عليكما (Wedding Congratulations)',
        },
      },
    ],
    'newborn-mabrouk-plaque': [
      {
        labelEn: 'Baby Boy Prince',
        labelAr: 'استقبال مولود ولد (هلال ونجمة)',
        answers: {
          babyName: 'زايد • Zayed',
          genderTheme: 'Boy Theme: Crescent Moon & Golden Star (ولد: هلال ونجمة)',
          birthYear: '2026',
          customText: 'زايد • Zayed',
          mainGreetingText: 'أهلاً بك يا زايد',
          recipientNameAndDate: 'زايد • Zayed - 2026',
        },
      },
      {
        labelEn: 'Baby Girl Princess',
        labelAr: 'استقبال مولودة بنت (تاج وفيونكة)',
        answers: {
          babyName: 'مريم • Mariam',
          genderTheme: 'Girl Theme: Crown & Elegant Bow Knot (بنت: تاج وفيونكة ناعمة)',
          birthYear: '2026',
          customText: 'مريم • Mariam',
          mainGreetingText: 'أهلاً بكِ يا مريم',
          recipientNameAndDate: 'مريم • Mariam - 2026',
        },
      },
    ],
    'school-project-stem': [
      {
        labelEn: 'Planetary Gear Mechanism',
        labelAr: 'منظومة تروس ميكانيكية متداخلة',
        answers: {
          stemTheme: 'Planetary Mechanical Gear System (نظام التروس الميكانيكي)',
          gearTeethCount: 'Standard 24-Teeth Sun Gear (حجم قياسي ٢٤ سناً)',
          projectLabelText: 'STEM 2026 Physics',
        },
      },
      {
        labelEn: 'High-Reduction Cogs',
        labelAr: 'تروس عالية النسبة الهندسية',
        answers: {
          stemTheme: 'Engineering Mechanism Display (نموذج هندسي تفاعلي)',
          gearTeethCount: 'High-Reduction 36-Teeth Gear (ترس كبير ٣٦ سناً)',
          projectLabelText: 'Grade 10 Mechanics',
        },
      },
    ],
    'home-diy-bracket': [
      {
        labelEn: 'Under-Desk Headphone Hook',
        labelAr: 'حامل سماعات تحت المكتب',
        answers: {
          bracketUsage: 'Under-Desk Headphone / Bag Hook (حامل تحت المكتب للسماعات والحقائب)',
          mountingMethod: 'Screw Mount (4x Countersunk 4.2mm holes) (تثبيت بمسامير غائرة)',
          customText: 'Desk Hook Pro',
        },
      },
      {
        labelEn: 'Heavy-Duty Shelf L-Bracket',
        labelAr: 'زاوية تثبيت رف جداري قوية',
        answers: {
          bracketUsage: 'Wall-Mounted Shelf Support Bracket (زاوية تثبيت رف جداري)',
          mountingMethod: 'Screw Mount (4x Countersunk 4.2mm holes) (تثبيت بمسامير غائرة)',
          customText: 'Heavy Duty 5KG',
        },
      },
    ],
    'headphone-desk-hanger': [
      {
        labelEn: 'Studio Pro Headset Stand',
        labelAr: 'حامل سماعات استوديو مع صحن تخزين',
        answers: {
          cradleStyle: 'Curved Wide Cradle (Optimal for leather & padded headbands)',
          baseFeature: 'Concave Catch-All Tray (Holds coins, keys, flash drives)',
          engravedLogo: 'Studio Pro 2026',
        },
      },
    ],
    'custom-replacement-parts': [
      {
        labelEn: 'Control Knob (Ribbed Grip)',
        labelAr: 'مقبض تحكم بأضلاع منع الانزلاق',
        answers: {
          partType: 'Control Knob & Potentiometer Dial (مقبض تحكم ومفتاح أجهزة)',
          shaftType: 'Standard 6.0mm D-Shaft (with Flat Key) (عمود ٦ ملم مقطوع D)',
          gripStyle: '16 Ribbed Flutes (High-Traction Knurling) (أضلاع بارزة ١٦ سناً لمنع الانزلاق)',
        },
      },
      {
        labelEn: 'Shaft Coupler & Adapter',
        labelAr: 'وصلة محاور ميكانيكية بمسمار تثبيت',
        answers: {
          partType: 'Shaft Coupler & Adapter Collar (وصلة ومحول محاور أسطواني)',
          shaftType: 'Standard 6.0mm Round Bore with M3 Set-Screw (عمود دائري ٦ ملم مع مسمار تثبيت)',
          gripStyle: 'Smooth Minimalist Cylinder with Indicator Notch (أسطوانة ناعمة مع علامة مؤشر)',
        },
      },
    ],
  };

  // 1. Fetch real catalog from API on mount
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await fetch(`${API_BASE}/studio/catalog`);
        if (res.ok) {
          const json = await res.json();
          const cats = Array.isArray(json.data) ? json.data : [];
          setCategories(cats);
          if (cats.length > 0) {
            setSelectedCat(cats[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      } finally {
        setLoadingCatalog(false);
      }
    };
    fetchCatalog();
  }, []);

  // 2. Step 1 -> Select Category and Advance
  const handleSelectCategory = (cat: any) => {
    setSelectedCat(cat);
    setStep(2);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // 3. Step 2 -> Select Template and Fetch Gemini AI Dynamic Questions
  const handleSelectTemplate = async (template: any) => {
    setSelectedTemplate(template);
    setLoadingQuestions(true);
    setActivePresetIdx(null);
    setStep(3);
    window.scrollTo({ top: 120, behavior: 'smooth' });

    try {
      const res = await fetch(`${API_BASE}/studio/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorySlug: selectedCat?.slug || 'giveaways-favors',
          templateSlug: template.slug,
          locale,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const questions = Array.isArray(json.data) ? json.data : [];
        setDynamicQuestions(questions);

        // Initialize default answers
        const initAnswers: Record<string, any> = {};
        questions.forEach((q: any) => {
          if (q.options && q.options.length > 0) {
            initAnswers[q.id] = q.options[0];
          } else {
            initAnswers[q.id] = isAr ? 'عيدكم مبارك' : 'Eid Mubarak';
          }
        });
        setAnswers(initAnswers);
      }
    } catch (e) {
      console.error('Failed to fetch AI questions', e);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // 1-Click Preset Applicator with Semantic Field Matching
  const handleApplyPreset = (preset: any, idx: number) => {
    setActivePresetIdx(idx);

    const updatedAnswers: Record<string, any> = { ...answers, ...preset.answers };

    // Semantically map answers to dynamic questions
    dynamicQuestions.forEach((q) => {
      const qIdLower = (q.id || '').toLowerCase();
      const qEnLower = (q.questionEn || '').toLowerCase();
      const qArLower = (q.questionAr || '').toLowerCase();

      // 1. Occasion / Event question
      if (
        qIdLower.includes('occasion') ||
        qIdLower.includes('event') ||
        qEnLower.includes('occasion') ||
        qArLower.includes('مناسبة')
      ) {
        if (q.type === 'single_choice' && Array.isArray(q.options)) {
          const matched = q.options.find((opt: string) => {
            const optL = opt.toLowerCase();
            if (preset.labelEn.toLowerCase().includes('graduat') && (optL.includes('graduat') || optL.includes('تخرج'))) return true;
            if (preset.labelEn.toLowerCase().includes('wed') && (optL.includes('wed') || optL.includes('زواج'))) return true;
            if (preset.labelEn.toLowerCase().includes('baby') || preset.labelEn.toLowerCase().includes('newborn')) {
              if (optL.includes('baby') || optL.includes('مولود') || optL.includes('newborn')) return true;
            }
            if (preset.answers.occasionTitle && optL.includes(preset.answers.occasionTitle.toLowerCase())) return true;
            return false;
          });
          if (matched) updatedAnswers[q.id] = matched;
        } else {
          if (preset.answers.occasionTitle) updatedAnswers[q.id] = preset.answers.occasionTitle;
        }
      }

      // 2. Main Greeting / Phrase / Calligraphy / Embossed Text
      if (
        qIdLower.includes('greeting') ||
        qIdLower.includes('phrase') ||
        qIdLower.includes('emboss') ||
        qIdLower.includes('text') ||
        qIdLower.includes('title') ||
        qEnLower.includes('phrase') ||
        qEnLower.includes('greeting') ||
        qArLower.includes('عبارة') ||
        qArLower.includes('تهنئة') ||
        qArLower.includes('نص')
      ) {
        const phrase =
          preset.answers.mainGreetingText ||
          preset.answers.occasionTitle ||
          preset.answers.phraseText ||
          preset.answers.embossedText ||
          preset.answers.projectLabelText;
        if (phrase) updatedAnswers[q.id] = phrase;
      }

      // 3. Recipient / Name / Date
      if (
        qIdLower.includes('recipient') ||
        qIdLower.includes('name') ||
        qIdLower.includes('date') ||
        qIdLower.includes('baby') ||
        qEnLower.includes('name') ||
        qArLower.includes('اسم')
      ) {
        const recipient =
          preset.answers.recipientNameAndDate ||
          preset.answers.recipientName ||
          preset.answers.babyName ||
          preset.answers.businessName;
        if (recipient) updatedAnswers[q.id] = recipient;
      }

      // 4. Display / Mounting style
      if (
        qIdLower.includes('display') ||
        qIdLower.includes('mount') ||
        qIdLower.includes('placement') ||
        qEnLower.includes('display') ||
        qArLower.includes('عرض') ||
        qArLower.includes('تثبيت')
      ) {
        if (q.type === 'single_choice' && Array.isArray(q.options)) {
          const standOpt = q.options.find(
            (o: string) =>
              o.toLowerCase().includes('stand') ||
              o.toLowerCase().includes('table') ||
              o.includes('طاولة') ||
              o.includes('قاعدة')
          );
          if (standOpt) updatedAnswers[q.id] = standOpt;
        }
      }

      // 5. Device type or STEM theme
      if (preset.answers.deviceType && (qIdLower.includes('device') || qEnLower.includes('device') || qArLower.includes('جهاز'))) {
        updatedAnswers[q.id] = preset.answers.deviceType;
      }
      if (preset.answers.stemTheme && (qIdLower.includes('stem') || qIdLower.includes('theme'))) {
        updatedAnswers[q.id] = preset.answers.stemTheme;
      }
    });

    setAnswers(updatedAnswers);

    // Populate user custom notes with rich instructions for Gemini
    const customBrief = isAr
      ? `الإعداد المسبق: ${preset.labelAr} - تصميم لوحة/درع تذكاري أنيق مع خط عربي بارز واضح وسماكة متناسقة (4-5 مم) وقاعدة مكتبية.`
      : `Preset: ${preset.labelEn} - Commemorative plaque with raised calligraphic relief, balanced 4-5mm slim plate thickness, and desk stand.`;
    setUserCustomNotes(customBrief);
  };

  // 4. Step 3 -> Compile Watertight 3D CSG Mesh
  const handleCompileStl = async () => {
    if (!selectedTemplate) return;
    setIsCompilingStl(true);
    setOrderError(null);

    try {
      const res = await fetch(`${API_BASE}/studio/generate-stl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user ? { Authorization: `Bearer ${localStorage.getItem('j3d_token')}` } : {}),
        },
        body: JSON.stringify({
          templateSlug: selectedTemplate.slug,
          answers: {
            ...answers,
            userNotes: userCustomNotes,
          },
          scalePercent,
          material,
          quantity,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to compile 3D mesh');
      }

      const stlRecord = json.data;
      setCompiledStl(stlRecord);

      setSelectedTemplate((prev: any) => ({
        ...prev,
        nameEn: stlRecord.title || prev?.nameEn,
        nameAr: stlRecord.title || prev?.nameAr,
        csgArchetype: stlRecord.aiMetadata ? 'CUSTOM_AI_MODEL' : prev?.csgArchetype,
      }));

      // Compute minimum floor price
      const unitFloor = stlRecord.unitFloorAed || 20;
      const calculatedFloor = Math.ceil(unitFloor * quantity);
      setPrintBudgetAed(Math.max(calculatedFloor + 20, 150));

      setStep(4);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } catch (err: any) {
      setOrderError(err.message || 'CSG Synthesis error');
    } finally {
      setIsCompilingStl(false);
    }
  };

  // 5. Step 5 -> Submit Order & Pre-Authorize Ziina Escrow
  const handleAuthorizeEscrow = async () => {
    if (!compiledStl) return;
    setIsAuthorizingEscrow(true);
    setOrderError(null);

    try {
      // Must be logged in to create orders
      if (!user) {
        // Auto demo fast-login or redirect to login
        router.push(`/${locale}/auth/login?redirect=studio`);
        return;
      }

      const res = await fetchWithAuth('/orders', {
        method: 'POST',
        body: JSON.stringify({
          stlFileId: compiledStl.id,
          quantity,
          clientMaxPrintBudgetAed: printBudgetAed,
          clientMaxDeliveryBudgetAed: deliveryBudgetAed,
          dropoffEmirate: selectedEmirate,
          dropoffDistrict: district,
          dropoffStreetAddress: streetAddress,
          dropoffLat: deliveryLat,
          dropoffLng: deliveryLng,
          requiredByDate: new Date(Date.now() + 86400000 * 3).toISOString(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || json.error?.message || 'Order creation failed');
      }

      const orderData = json.data?.order || json.data;
      const paymentIntent = json.data?.paymentIntent;

      if (paymentIntent?.redirectUrl) {
        window.location.href = paymentIntent.redirectUrl;
      } else {
        router.push(
          `/${locale}/orders/confirmation?orderId=${orderData.id}&payment_intent_id=${paymentIntent?.id || 'pi_test'}`,
        );
      }
    } catch (err: any) {
      setOrderError(err.message || 'Payment intent creation failed');
    } finally {
      setIsAuthorizingEscrow(false);
    }
  };

  // 6. Freeform AI Prompt-to-3D Solid Generation (Gemini 4 Hydrogen + Manifold-3D)
  const handleGenerateCustomPrompt = async (promptOverride?: string) => {
    const textToSubmit = promptOverride || freeformPrompt;
    if (!textToSubmit.trim()) return;

    setIsSynthesizingFreeform(true);
    setOrderError(null);

    try {
      const res = await fetch(`${API_BASE}/studio/generate-custom-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user ? { Authorization: `Bearer ${localStorage.getItem('j3d_token')}` } : {}),
        },
        body: JSON.stringify({
          prompt: textToSubmit,
          locale,
          material,
          colorMode,
          colorHexList: [selectedColor],
          scalePercent,
          quantity,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'AI 3D generation failed');
      }

      const stlRecord = json.data;
      setCompiledStl(stlRecord);

      setSelectedTemplate({
        nameEn: stlRecord.title,
        nameAr: stlRecord.title,
        csgArchetype: 'CUSTOM_AI_MODEL',
      });

      const unitFloor = stlRecord.unitFloorAed || 25;
      const calculatedFloor = Math.ceil(unitFloor * quantity);
      setPrintBudgetAed(Math.max(calculatedFloor + 20, 150));

      setStep(4);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } catch (err: any) {
      setOrderError(err.message || 'Error generating custom 3D model');
    } finally {
      setIsSynthesizingFreeform(false);
    }
  };

  // Floor calculations
  const unitFloor = compiledStl?.unitFloorAed || 20;
  const minPrintFloor = Math.ceil(unitFloor * quantity);
  const minDeliveryFloor = 31; // UAE 15km baseline floor

  return (
    <Box minH="calc(100vh - 140px)" py={{ base: 6, md: 10 }}>
      <Container maxW="5xl">
        {/* ========================================================================= */}
        {/* TYPEFORM PROGRESS HEADER & STEP BAR                                       */}
        {/* ========================================================================= */}
        <VStack gap={4} mb={8} align="stretch">
          {/* Top Info Bar */}
          <HStack justify="space-between" align="center">
            <HStack gap={2}>
              <Box
                w="32px"
                h="32px"
                borderRadius="lg"
                bg="extruder.500/10"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="extruder.500"
              >
                <Wand2 size={18} />
              </Box>
              <VStack align="start" gap={0}>
                <Text fontSize="xs" fontWeight="bold" color="fg.muted" textTransform="uppercase">
                  {isAr ? `المرحلة ${step} من ٥` : `Step ${step} of 5`}
                </Text>
                <Text fontSize="sm" fontWeight="bold" color="fg.default">
                  {step === 1 && (isAr ? 'اختر فئة الطباعة ثلاثية الأبعاد' : 'Select 3D Print Category')}
                  {step === 2 && (isAr ? `اختر النموذج من فئة ${selectedCat?.nameAr || ''}` : `Choose Template in ${selectedCat?.nameEn || ''}`)}
                  {step === 3 && (isAr ? 'تخصيص المعايير الهندسية بـ Gemini 4 Hydrogen' : 'AI Parametric Customization with Gemini 4 Hydrogen')}
                  {step === 4 && (isAr ? 'معاينة المجسم ثلاثي الأبعاد والخامة' : 'Interactive 3D Studio & Material Plate')}
                  {step === 5 && (isAr ? 'موقع التوصيل الإماراتي وميزانية الضمان' : 'UAE Delivery Location & Escrow Budget')}
                </Text>
              </VStack>
            </HStack>

            <HStack gap={2}>
              {step > 1 && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setStep((s) => (s > 1 ? ((s - 1) as any) : 1))}
                  color="fg.muted"
                  _hover={{ color: 'fg.default' }}
                >
                  <HStack gap={1}>
                    {isAr ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
                    <Text>{isAr ? 'السابق' : 'Back'}</Text>
                  </HStack>
                </Button>
              )}
              <Badge size="sm" colorPalette="orange" variant="surface">
                {Math.round((step / 5) * 100)}%
              </Badge>
            </HStack>
          </HStack>

          {/* Stepped Progress Bar */}
          <Box w="full" h="6px" borderRadius="full" bg="bg.panel" overflow="hidden" borderWidth="1px" borderColor="border.subtle">
            <Box
              h="full"
              borderRadius="full"
              bg="linear-gradient(90deg, #F97316 0%, #14B8A6 100%)"
              w={`${(step / 5) * 100}%`}
              transition="width 0.3s ease"
            />
          </Box>
        </VStack>

        {/* Global Error Banner */}
        {orderError && (
          <Box p={4} borderRadius="xl" bg="red.500/10" borderWidth="1px" borderColor="red.500/30" mb={6}>
            <HStack gap={2}>
              <Text fontSize="sm" fontWeight="bold" color="red.500">
                {orderError}
              </Text>
            </HStack>
          </Box>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: CATEGORY SELECTION                                                */}
        {/* ========================================================================= */}
        {step === 1 && (
          <VStack gap={8} align="stretch">
            <VStack gap={2} textAlign="center" py={2}>
              <HStack gap={2} bg="extruder.500/10" px={3.5} py={1} borderRadius="full" border="1px solid" borderColor="extruder.500/20">
                <Sparkles size={14} color="#F97316" />
                <Text fontSize="xs" fontWeight="bold" color="extruder.500">
                  {isAr ? 'الجيل الجديد من الطباعة ثلاثية الأبعاد المدعومة بـ Gemini 4 Hydrogen' : 'Next-Gen 3D Printing Powered by Gemini 4 Hydrogen'}
                </Text>
              </HStack>

              <Heading size={{ base: '2xl', md: '3xl' }} fontWeight="black">
                {isAr ? 'ماذا تريد أن تطبع بتقنية 3D اليوم بالذكاء الاصطناعي؟' : 'What would you like to 3D Print today with AI?'}
              </Heading>
              <Text fontSize="sm" color="fg.muted" maxW="xl">
                {isAr
                  ? 'اختر إحدى فئات المنتجات المعتمدة في الإمارات للانطلاق في تجربة التخصيص التفاعلية خطوة بخطوة:'
                  : 'Select one of our curated UAE categories to start your step-by-step parametric customization:'}
              </Text>
            </VStack>

            {/* Freeform Prompt-to-3D Generator Card */}
            <Box
              p={{ base: 5, md: 6 }}
              borderRadius="3xl"
              bg="linear-gradient(135deg, rgba(249, 115, 22, 0.06) 0%, rgba(20, 184, 166, 0.06) 100%)"
              borderWidth="1px"
              borderColor="border.subtle"
            >
              <VStack align="stretch" gap={3}>
                <HStack justify="space-between" align="center">
                  <HStack gap={2}>
                    <Box p={2} borderRadius="lg" bg="extruder.500/10" color="extruder.500">
                      <Sparkles size={18} />
                    </Box>
                    <VStack align="start" gap={0}>
                      <Text fontSize="sm" fontWeight="black" color="fg.default">
                        {isAr ? 'توليد فوري بأي وصف تريده (Prompt-to-3D)' : 'Generate Any 3D Solid from Text'}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {isAr
                          ? 'يقوم Gemini 4 Hydrogen بتحويل وصفك إلى مجسم مصمت قابل للطباعة عبر Manifold-3D'
                          : 'Gemini 4 Hydrogen translates your prompt into a watertight 3D solid via Manifold-3D'}
                      </Text>
                    </VStack>
                  </HStack>
                  <Badge size="xs" colorPalette="teal" variant="solid">
                    Manifold-3D WASM
                  </Badge>
                </HStack>

                <HStack gap={2} w="full">
                  <Input
                    placeholder={
                      isAr
                        ? 'مثال: منظم مكتبي للأقلام وبطاقات العمل بقاعدة ثابتة...'
                        : 'E.g., Desk organizer tray with 2 pen slots and card holder...'
                    }
                    value={freeformPrompt}
                    onChange={(e) => setFreeformPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGenerateCustomPrompt();
                    }}
                    bg="bg.canvas"
                    borderRadius="xl"
                    size="md"
                  />
                  <Button
                    colorPalette="orange"
                    size="md"
                    loading={isSynthesizingFreeform}
                    onClick={() => handleGenerateCustomPrompt()}
                    px={5}
                    bg="linear-gradient(135deg, #F97316 0%, #EA580C 100%)"
                    color="white"
                  >
                    <HStack gap={1.5}>
                      <Wand2 size={16} />
                      <Text fontWeight="bold">{isAr ? 'توليد 3D' : 'Generate'}</Text>
                    </HStack>
                  </Button>
                </HStack>

                {/* Instant Prompt Idea Chips */}
                <HStack gap={1.5} flexWrap="wrap" pt={1}>
                  <Text fontSize="10px" color="fg.muted" fontWeight="semibold">
                    {isAr ? 'أفكار سريعة للتجربة:' : 'Try these prompts:'}
                  </Text>
                  {[
                    {
                      en: 'A desktop stand with QR code display for website',
                      ar: 'حامل مكتبي مائل لعرض كود QR وبطاقات العمل',
                    },
                    {
                      en: 'Desk organizer tray with two pen holders',
                      ar: 'منظم مكتبي للأقلام والبطاقات',
                    },
                    {
                      en: 'Phone charging stand with cable notch',
                      ar: 'حامل هاتف مكتبي مع ممر شاحن',
                    },
                    {
                      en: 'Reinforced wall mounting hook with screw hole',
                      ar: 'علاقة حائط للمفاتيح مقواة',
                    },
                    {
                      en: 'Desktop award trophy shield with star',
                      ar: 'درع تكريم مكتبي بنجمة تذكارية',
                    },
                  ].map((chip, idx) => (
                    <Badge
                      key={idx}
                      as="button"
                      size="xs"
                      cursor="pointer"
                      variant="surface"
                      colorPalette="orange"
                      onClick={() => {
                        setFreeformPrompt(isAr ? chip.ar : chip.en);
                        handleGenerateCustomPrompt(isAr ? chip.ar : chip.en);
                      }}
                      _hover={{ transform: 'scale(1.03)', borderColor: 'extruder.500' }}
                      transition="all 0.15s ease"
                      px={2}
                      py={0.5}
                      borderRadius="full"
                    >
                      {isAr ? chip.ar : chip.en}
                    </Badge>
                  ))}
                </HStack>
              </VStack>
            </Box>

            <HStack justify="center" align="center" gap={3} my={-2}>
              <Box flex={1} h="1px" bg="border.subtle" />
              <Text fontSize="xs" fontWeight="bold" color="fg.muted" textTransform="uppercase">
                {isAr ? 'أو اختر من فئات المنتجات الجاهزة' : 'Or Choose from Curated Categories'}
              </Text>
              <Box flex={1} h="1px" bg="border.subtle" />
            </HStack>

            {loadingCatalog ? (
              <Box py={20} textAlign="center">
                <Spinner size="xl" color="extruder.500" />
                <Text fontSize="sm" color="fg.muted" mt={4}>
                  {isAr ? 'جاري تحميل فئات النماذج ثلاثية الأبعاد...' : 'Loading 3D catalog...'}
                </Text>
              </Box>
            ) : (
              <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={4}>
                {categories.map((cat) => {
                  const Icon = iconMap[cat.slug] || Sparkles;
                  return (
                    <Box
                      key={cat.id || cat.slug}
                      data-testid={`category-card-${cat.slug}`}
                      p={5}
                      borderRadius="2xl"
                      bg="bg.panel"
                      borderWidth="1px"
                      borderColor="border.subtle"
                      cursor="pointer"
                      onClick={() => handleSelectCategory(cat)}
                      _hover={{
                        borderColor: 'extruder.500',
                        transform: 'translateY(-3px)',
                        boxShadow: '0 8px 24px rgba(249, 115, 22, 0.12)',
                      }}
                      transition="all 0.2s ease"
                    >
                      <VStack align="start" gap={3}>
                        <HStack justify="space-between" w="full">
                          <Box p={3} borderRadius="xl" bg="extruder.500/10" color="extruder.500">
                            <Icon size={24} />
                          </Box>
                          <Badge size="xs" colorPalette="orange" variant="surface">
                            {cat.templates?.length || 1} {isAr ? 'نماذج' : 'templates'}
                          </Badge>
                        </HStack>

                        <VStack align="start" gap={1}>
                          <Text fontSize="md" fontWeight="bold" color="fg.default">
                            {isAr ? cat.nameAr : cat.nameEn}
                          </Text>
                          <Text fontSize="xs" color="fg.muted" lineHeight="tall">
                            {isAr ? cat.descriptionAr : cat.descriptionEn}
                          </Text>
                          {categoryExamplesMap[cat.slug] && (
                            <Text
                              fontSize="10px"
                              color="extruder.500"
                              fontWeight="semibold"
                              bg="extruder.500/8"
                              px={2}
                              py={0.5}
                              borderRadius="md"
                              mt={1}
                            >
                              {isAr ? categoryExamplesMap[cat.slug].ar : categoryExamplesMap[cat.slug].en}
                            </Text>
                          )}
                        </VStack>

                        <HStack justify="flex-end" w="full" pt={2}>
                          <HStack gap={1} color="extruder.500" fontSize="xs" fontWeight="bold">
                            <Text>{isAr ? 'استعراض النماذج' : 'Select Category'}</Text>
                            {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                          </HStack>
                        </HStack>
                      </VStack>
                    </Box>
                  );
                })}
              </Grid>
            )}
          </VStack>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: TEMPLATE SELECTION                                                */}
        {/* ========================================================================= */}
        {step === 2 && (
          <VStack gap={6} align="stretch">
            <VStack gap={2} textAlign="center" py={2}>
              <Badge size="sm" colorPalette="teal" variant="subtle">
                {isAr ? selectedCat?.nameAr : selectedCat?.nameEn}
              </Badge>
              <Heading size={{ base: 'xl', md: '2xl' }} fontWeight="black">
                {isAr ? 'اختر تصميماً أساسياً لتهيئته بالذكاء الاصطناعي' : 'Choose a Baseline Parametric Template'}
              </Heading>
              <Text fontSize="sm" color="fg.muted" maxW="xl">
                {isAr
                  ? 'اختر قالباً أولياً للبدء في ضبط المقاييس والنقوش وخيارات التصنيع:'
                  : 'Select a base archetype to begin customizing with Gemini 4 Hydrogen:'}
              </Text>
            </VStack>

            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={5}>
              {(selectedCat?.templates || []).map((tmpl: any) => (
                <Box
                  key={tmpl.id || tmpl.slug}
                  data-testid={`template-card-${tmpl.slug}`}
                  p={6}
                  borderRadius="2xl"
                  bg="bg.panel"
                  borderWidth="1px"
                  borderColor="border.subtle"
                  cursor="pointer"
                  onClick={() => handleSelectTemplate(tmpl)}
                  _hover={{
                    borderColor: 'laser.500',
                    transform: 'translateY(-3px)',
                    boxShadow: '0 8px 24px rgba(20, 184, 166, 0.12)',
                  }}
                  transition="all 0.2s ease"
                >
                  <VStack align="start" gap={4}>
                    <HStack justify="space-between" w="full">
                      <Badge size="sm" colorPalette="teal" variant="surface">
                        {tmpl.csgArchetype || 'PARAMETRIC'}
                      </Badge>
                      <Text fontSize="xs" fontWeight="bold" color="laser.500">
                        {tmpl.baseSetupFeeAed || 15} {isAr ? 'درهم رسوم قالب' : 'AED Setup'}
                      </Text>
                    </HStack>

                    <VStack align="start" gap={1}>
                      <Text fontSize="lg" fontWeight="black" color="fg.default">
                        {isAr ? tmpl.nameAr : tmpl.nameEn}
                      </Text>
                      <Text fontSize="xs" color="fg.muted" lineHeight="tall">
                        {isAr ? tmpl.descriptionAr : tmpl.descriptionEn}
                      </Text>
                    </VStack>

                    <HStack justify="space-between" w="full" pt={2} borderTopWidth="1px" borderColor="border.subtle" fontSize="xs" color="fg.muted">
                      <HStack gap={1}>
                        <BoxIcon size={14} color="#14B8A6" />
                        <Text>
                          {tmpl.defaultDimXmm || 32}×{tmpl.defaultDimYmm || 32}×{tmpl.defaultDimZmm || 18} mm
                        </Text>
                      </HStack>
                      <HStack gap={1} color="laser.500" fontWeight="bold">
                        <Text>{isAr ? 'تخصيص بالذكاء الاصطناعي' : 'Customize with AI'}</Text>
                        {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                      </HStack>
                    </HStack>
                  </VStack>
                </Box>
              ))}
            </Grid>

            <HStack justify="flex-start" pt={4}>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                <HStack gap={1}>
                  {isAr ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                  <Text>{isAr ? 'الرجوع لاختيار فئة أخرى' : 'Back to Categories'}</Text>
                </HStack>
              </Button>
            </HStack>
          </VStack>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: AI PARAMETRIC CUSTOMIZATION (GEMINI 4 HYDROGEN)                   */}
        {/* ========================================================================= */}
        {step === 3 && (
          <VStack gap={6} align="stretch">
            <VStack gap={2} textAlign="center" py={2}>
              <Badge size="sm" colorPalette="orange" variant="subtle">
                {isAr ? selectedTemplate?.nameAr : selectedTemplate?.nameEn}
              </Badge>
              <Heading size={{ base: 'xl', md: '2xl' }} fontWeight="black">
                {isAr ? 'تخصيص المعايير الهندسية بالذكاء الاصطناعي' : 'Gemini 4 Hydrogen Parametric Customization'}
              </Heading>
              <Text fontSize="sm" color="fg.muted" maxW="xl">
                {isAr
                  ? 'يقوم الذكاء الاصطناعي بتحليل طلبك وصياغة معايير الأبعاد والنقوش بدقة هندسية عالية:'
                  : 'Tailor custom engravings, dimensions, and quantities for your watertight 3D print:'}
              </Text>
            </VStack>

            <Box p={{ base: 6, md: 8 }} borderRadius="3xl" bg="bg.panel" borderWidth="1px" borderColor="border.subtle">
              {loadingQuestions ? (
                <VStack py={14} gap={4} textAlign="center">
                  <Spinner size="xl" color="extruder.500" />
                  <Text fontSize="sm" color="fg.muted">
                    {isAr
                      ? 'يقوم Gemini 4 Hydrogen بتحليل النموذج وتوليد الأسئلة الهندسية التفاعلية...'
                      : 'Gemini 4 Hydrogen is generating tailored design parameters...'}
                  </Text>
                </VStack>
              ) : (
                <VStack gap={6} align="stretch">
                  {/* 1-Click Quick AI Presets */}
                  {selectedTemplate && templatePresetsMap[selectedTemplate.slug] && (
                    <VStack
                      align="start"
                      gap={2.5}
                      p={4}
                      borderRadius="2xl"
                      bg="bg.canvas"
                      borderWidth="1px"
                      borderColor="border.subtle"
                    >
                      <HStack gap={1.5}>
                        <Sparkles size={14} color="#F97316" />
                        <Text fontSize="xs" fontWeight="bold" color="fg.default">
                          {isAr ? 'إعدادات سريعة جاهزة (بنقرة واحدة لتعبئة كل الحقول):' : '1-Click Quick AI Presets:'}
                        </Text>
                      </HStack>
                      <HStack gap={2} flexWrap="wrap">
                        {templatePresetsMap[selectedTemplate.slug].map((p, idx) => {
                          const isSelected = activePresetIdx === idx;
                          return (
                            <Button
                              key={idx}
                              size="xs"
                              variant={isSelected ? 'solid' : 'surface'}
                              colorPalette="orange"
                              onClick={() => handleApplyPreset(p, idx)}
                              _hover={{ transform: 'scale(1.03)', borderColor: 'extruder.500' }}
                              transition="all 0.15s ease"
                              fontWeight={isSelected ? 'bold' : 'normal'}
                            >
                              {isSelected && <CheckCircle2 size={13} style={{ marginInlineEnd: 4 }} />}
                              {isAr ? p.labelAr : p.labelEn}
                            </Button>
                          );
                        })}
                      </HStack>
                      {activePresetIdx !== null && templatePresetsMap[selectedTemplate.slug]?.[activePresetIdx] && (
                        <HStack
                          mt={1}
                          px={3}
                          py={1.5}
                          borderRadius="xl"
                          bg="orange.500/10"
                          borderWidth="1px"
                          borderColor="orange.500/30"
                          gap={2}
                          w="full"
                        >
                          <CheckCircle2 size={14} color="#F97316" />
                          <Text fontSize="xs" fontWeight="semibold" color="orange.600" _dark={{ color: 'orange.300' }}>
                            {isAr
                              ? `✓ تم تطبيق إعداد: "${templatePresetsMap[selectedTemplate.slug][activePresetIdx].labelAr}" وتمت تعبئة كافة الحقول والنصوص المطلوبة بنجاح!`
                              : `✓ Applied preset: "${templatePresetsMap[selectedTemplate.slug][activePresetIdx].labelEn}" - all fields and custom text populated!`}
                          </Text>
                        </HStack>
                      )}
                    </VStack>
                  )}

                  {/* Dynamic Questions from Gemini */}
                  {dynamicQuestions.map((q) => (
                    <VStack key={q.id} align="start" gap={2}>
                      <VStack align="start" gap={0.5}>
                        <Text fontSize="sm" fontWeight="bold" color="fg.default">
                          {isAr ? q.questionAr : q.questionEn}
                        </Text>
                        {(q.helpAr || q.helpEn) && (
                          <Text fontSize="xs" color="fg.muted">
                            {isAr ? q.helpAr || q.helpEn : q.helpEn || q.helpAr}
                          </Text>
                        )}
                      </VStack>

                      {q.type === 'single_choice' && q.options ? (
                        <HStack gap={2.5} flexWrap="wrap">
                          {q.options.map((opt: string) => {
                            const isChosen = answers[q.id] === opt;
                            return (
                              <Button
                                key={opt}
                                size="sm"
                                variant={isChosen ? 'solid' : 'outline'}
                                colorPalette={isChosen ? 'orange' : 'gray'}
                                onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                              >
                                {opt}
                              </Button>
                            );
                          })}
                        </HStack>
                      ) : (
                        <VStack align="stretch" w="full" gap={2}>
                          <Input
                            placeholder={isAr ? 'أدخل العبارة أو النص المطلوب هنا...' : 'Enter custom text or dimensions...'}
                            value={answers[q.id] || ''}
                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                            size="md"
                            bg="bg.canvas"
                            borderRadius="xl"
                          />
                          {q.suggestions && q.suggestions.length > 0 && (
                            <HStack gap={1.5} flexWrap="wrap" pt={0.5}>
                              <Text fontSize="11px" color="fg.muted" fontWeight="semibold">
                                {isAr ? 'اقتراحات شائعة:' : 'Suggestions:'}
                              </Text>
                              {q.suggestions.map((sug: string) => (
                                <Badge
                                  key={sug}
                                  as="button"
                                  size="xs"
                                  cursor="pointer"
                                  variant={answers[q.id] === sug ? 'solid' : 'surface'}
                                  colorPalette={answers[q.id] === sug ? 'orange' : 'gray'}
                                  onClick={() => setAnswers({ ...answers, [q.id]: sug })}
                                  _hover={{ borderColor: 'extruder.500', transform: 'scale(1.04)' }}
                                  transition="all 0.15s ease"
                                  px={2.5}
                                  py={1}
                                  borderRadius="full"
                                >
                                  {sug}
                                </Badge>
                              ))}
                            </HStack>
                          )}
                        </VStack>
                      )}
                    </VStack>
                  ))}

                  {/* Quantity Counter */}
                  <VStack align="start" gap={2} pt={2}>
                    <Text fontSize="sm" fontWeight="bold" color="fg.default">
                      {isAr ? 'الكمية المطلوبة (قطع)' : 'Quantity Required (Pieces)'}
                    </Text>
                    <HStack gap={3}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setQuantity((q) => Math.max(1, q - 5))}
                      >
                        -5
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      >
                        -1
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        w="90px"
                        textAlign="center"
                        fontWeight="bold"
                        borderRadius="xl"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setQuantity((q) => q + 1)}
                      >
                        +1
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setQuantity((q) => q + 5)}
                      >
                        +5
                      </Button>
                      <Text fontSize="xs" color="fg.muted">
                        {isAr ? `إجمالي: ${quantity} قطعة` : `Total: ${quantity} pcs`}
                      </Text>
                    </HStack>
                  </VStack>

                  {/* Custom Notes */}
                  <VStack align="start" gap={2}>
                    <Text fontSize="sm" fontWeight="bold" color="fg.default">
                      {isAr ? 'ملاحظات إضافية للتصنيع والتغليف' : 'Additional Manufacturing & Packaging Notes'}
                    </Text>
                    <Textarea
                      placeholder={
                        isAr
                          ? 'أي تفاصيل خاصة بتوزيعات العيد أو التغليف في أكياس مخملية...'
                          : 'Any specific instructions for surface finish, gift boxes...'
                      }
                      value={userCustomNotes}
                      onChange={(e) => setUserCustomNotes(e.target.value)}
                      rows={2}
                      bg="bg.canvas"
                      borderRadius="xl"
                    />
                  </VStack>

                  <Separator borderColor="border.subtle" />

                  {/* Action Button */}
                  <Button
                    colorPalette="orange"
                    size="xl"
                    w="full"
                    onClick={handleCompileStl}
                    loading={isCompilingStl}
                    bg="linear-gradient(135deg, #F97316 0%, #EA580C 100%)"
                    color="white"
                    boxShadow="0 8px 24px rgba(249, 115, 22, 0.3)"
                  >
                    <HStack gap={2}>
                      <Wand2 size={20} />
                      <Text fontWeight="black" fontSize="md">
                        {isAr
                          ? 'بناء ومعاينة ملف .STL ثلاثي الأبعاد هندسياً'
                          : 'Compile & Render 3D Watertight Preview'}
                      </Text>
                    </HStack>
                  </Button>
                </VStack>
              )}
            </Box>
          </VStack>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: 3D BUILD-PLATE CANVAS & MATERIAL STUDIO                           */}
        {/* ========================================================================= */}
        {step === 4 && (
          <VStack gap={6} align="stretch">
            <VStack gap={2} textAlign="center" py={2}>
              <Badge size="sm" colorPalette="teal" variant="subtle">
                {isAr ? 'معاينة WebGL التفاعلية المباشرة' : 'Live Interactive WebGL Preview'}
              </Badge>
              <Heading size={{ base: 'xl', md: '2xl' }} fontWeight="black">
                {isAr ? 'استوديو المعاينة ثلاثية الأبعاد واختيار الخامة' : '3D Build-Plate Canvas & Material Selection'}
              </Heading>
              <Text fontSize="sm" color="fg.muted" maxW="xl">
                {isAr
                  ? 'يمكنك تدوير وتكبير النموذج والتأكد من المقاييس الحقيقية، واختيار نوع الفيلومنت والألوان:'
                  : 'Inspect your manifold 3D geometry, choose filament or resin material, and test scaling:'}
              </Text>
            </VStack>

            <Grid templateColumns={{ base: '1fr', lg: '7fr 5fr' }} gap={6} alignContent="start">
              {/* Left Column: Interactive 3D Canvas */}
              <Box borderRadius="3xl" overflow="hidden" borderWidth="1px" borderColor="border.subtle" bg="bg.panel">
                <Box p={4} borderBottomWidth="1px" borderColor="border.subtle" bg="bg.canvas">
                  <HStack justify="space-between">
                    <HStack gap={2}>
                      <Box w={2.5} h={2.5} borderRadius="full" bg="laser.500" />
                      <Text fontSize="xs" fontWeight="bold" color="fg.default">
                        {compiledStl?.title || selectedTemplate?.nameEn || '3D Parametric Mesh'}
                      </Text>
                    </HStack>
                    <Badge size="xs" colorPalette="teal" variant="surface">
                      Watertight Manifold
                    </Badge>
                  </HStack>
                </Box>

                <ThreeStlCanvas
                  stlUrl={compiledStl?.downloadUrl}
                  archetype={selectedTemplate?.csgArchetype}
                  material={material}
                  colorMode={colorMode}
                  colorHexList={[selectedColor]}
                  scalePercent={scalePercent}
                />

                <Box p={4} borderTopWidth="1px" borderColor="border.subtle" bg="bg.canvas" fontSize="xs" color="fg.muted">
                  <HStack justify="space-between" flexWrap="wrap">
                    <Text>
                      {isAr ? 'الأبعاد الحقيقية:' : 'Dimensions:'}{' '}
                      <span style={{ fontWeight: 'bold', color: '#14B8A6' }}>
                        {Math.round((compiledStl?.dimXmm || 32) * (scalePercent / 100))}×
                        {Math.round((compiledStl?.dimYmm || 32) * (scalePercent / 100))}×
                        {Math.round((compiledStl?.dimZmm || 18) * (scalePercent / 100))} mm
                      </span>
                    </Text>
                    <Text>
                      {isAr ? 'الحجم:' : 'Volume:'}{' '}
                      <span style={{ fontWeight: 'bold' }}>
                        {((compiledStl?.volumeCm3 || 11.43) * Math.pow(scalePercent / 100, 3)).toFixed(2)} cm³
                      </span>
                    </Text>
                    <Text>
                      {isAr ? 'الوزن التقريبي:' : 'Weight:'}{' '}
                      <span style={{ fontWeight: 'bold' }}>
                        {((compiledStl?.estimatedWeightG || 14.17) * Math.pow(scalePercent / 100, 3)).toFixed(1)} g
                      </span>
                    </Text>
                  </HStack>
                </Box>

                {/* Manifold Status & Direct Download Bar */}
                <Box p={3.5} borderTopWidth="1px" borderColor="border.subtle" bg="bg.panel">
                  <HStack justify="space-between" flexWrap="wrap" gap={2}>
                    <HStack gap={2}>
                      <Badge size="xs" colorPalette="teal" variant="solid">
                        Manifold-3D Kernel
                      </Badge>
                      <Text fontSize="10px" color="fg.muted">
                        {isAr ? 'مجسم مصمت وخالٍ من الفجوات' : '100% Watertight Solid'}
                      </Text>
                    </HStack>
                    <HStack gap={2}>
                      {compiledStl?.downloadUrl && (
                        <Button asChild size="xs" variant="outline" colorPalette="orange">
                          <a href={compiledStl.downloadUrl} download>
                            <Download size={12} style={{ marginRight: '4px' }} />
                            {isAr ? 'تحميل STL' : 'Download STL'}
                          </a>
                        </Button>
                      )}
                      {compiledStl?.threeMfUrl && (
                        <Button asChild size="xs" variant="solid" colorPalette="teal">
                          <a href={compiledStl.threeMfUrl} download>
                            <Download size={12} style={{ marginRight: '4px' }} />
                            {isAr ? 'تحميل 3MF (Bambu)' : 'Download 3MF'}
                          </a>
                        </Button>
                      )}
                    </HStack>
                  </HStack>
                </Box>

                {/* AI Generative CAD Synthesis Diagnostics */}
                {(compiledStl?.aiMetadata || compiledStl?.parametricSpecJson?.aiMetadata) && (() => {
                  const meta = compiledStl?.aiMetadata || compiledStl?.parametricSpecJson?.aiMetadata;
                  return (
                    <Box p={4} borderTopWidth="1px" borderColor="teal.500/20" bg="teal.500/5">
                      <VStack align="stretch" gap={2}>
                        <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
                          <HStack gap={2}>
                            <Sparkles size={16} color="#14B8A6" />
                            <Text fontSize="xs" fontWeight="bold" color="teal.300">
                              {isAr ? 'توليد ذكاء اصطناعي حقيقي (Gemini 4 Hydrogen)' : 'AI Generative CAD Synthesis (Gemini 4 Hydrogen)'}
                            </Text>
                          </HStack>
                          <HStack gap={1.5}>
                            <Badge size="xs" colorPalette="purple" variant="solid">
                              {meta.model || 'gemini-4-hydrogen'}
                            </Badge>
                            {meta.latencyMs && (
                              <Badge size="xs" colorPalette="teal" variant="outline">
                                {meta.latencyMs}ms
                              </Badge>
                            )}
                          </HStack>
                        </HStack>

                        {meta.rationale && (
                          <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                            &ldquo;{meta.rationale}&rdquo;
                          </Text>
                        )}

                        {(meta.inscribedText || meta.recipientName) && (
                          <HStack
                            px={3}
                            py={1.5}
                            borderRadius="lg"
                            bg="orange.500/10"
                            borderWidth="1px"
                            borderColor="orange.500/30"
                            gap={2}
                          >
                            <Sparkles size={12} color="#F97316" />
                            <Text fontSize="xs" fontWeight="semibold" color="orange.600" _dark={{ color: 'orange.300' }}>
                              {isAr
                                ? `النقش ثلاثي الأبعاد المخصص: ${[meta.inscribedText, meta.recipientName].filter(Boolean).join(' • ')}`
                                : `Custom 3D Inscription: ${[meta.inscribedText, meta.recipientName].filter(Boolean).join(' • ')}`}
                            </Text>
                          </HStack>
                        )}

                        <HStack justify="space-between" align="center" pt={1}>
                          <Text fontSize="10px" color="fg.subtle">
                            {isAr
                              ? `${meta.nodeCount || 'متعدد'} مجسمات هندسية متراكبة (CSG Primitives)`
                              : `${meta.nodeCount || 'Multiple'} Watertight Solid CSG Nodes`}
                          </Text>
                          <Button
                            size="xs"
                            variant="ghost"
                            colorPalette="teal"
                            onClick={() => setShowAiPromptInspector(!showAiPromptInspector)}
                          >
                            {showAiPromptInspector
                              ? (isAr ? 'إخفاء البرومبت والوصفة' : 'Hide AI Prompt & Recipe')
                              : (isAr ? 'عرض البرومبت والوصفة الهندسية' : 'View AI Prompt & CAD Recipe')}
                          </Button>
                        </HStack>

                        {showAiPromptInspector && (
                          <Box mt={2} p={3} borderRadius="lg" bg="bg.canvas" borderWidth="1px" borderColor="border.subtle" maxH="220px" overflowY="auto">
                            <Text fontSize="10px" fontWeight="bold" color="fg.default" mb={1}>
                              {isAr ? 'البرومبت الهندسي المرسل لنموذج Gemini 4 Hydrogen:' : 'Exact Engineering Prompt Sent to Gemini 4 Hydrogen:'}
                            </Text>
                            <Text fontSize="10px" fontFamily="monospace" whiteSpace="pre-wrap" color="fg.muted">
                              {meta.promptSent || 'Prompt telemetry loaded'}
                            </Text>
                          </Box>
                        )}
                      </VStack>
                    </Box>
                  );
                })()}
              </Box>

              {/* Right Column: Material, Color, Scale Controls */}
              <Box p={6} borderRadius="3xl" bg="bg.panel" borderWidth="1px" borderColor="border.subtle">
                <VStack gap={5} align="stretch">
                  {/* Material Selector */}
                  <VStack align="start" gap={2}>
                    <Text fontSize="xs" fontWeight="bold" color="fg.default">
                      {isAr ? 'نوع الخامة (Filament / Resin)' : 'Material Formulation'}
                    </Text>
                    <Grid templateColumns="repeat(2, 1fr)" gap={2} w="full">
                      {[
                        { id: MaterialType.PLA, name: 'PLA Standard', desc: isAr ? 'أملس واقتصادي' : 'Smooth & Fast' },
                        { id: MaterialType.PLA_SILK, name: 'PLA Silk', desc: isAr ? 'لمعان حريري مميز' : 'Glossy Metallic' },
                        { id: MaterialType.PETG, name: 'PETG', desc: isAr ? 'مقاوم للحرارة والماء' : 'Durable & Heat-safe' },
                        { id: MaterialType.ABS, name: 'ABS', desc: isAr ? 'متين ضد الصدمات' : 'Impact Resistant' },
                      ].map((m) => {
                        const isChosen = material === m.id;
                        return (
                          <Box
                            key={m.id}
                            p={3}
                            borderRadius="xl"
                            borderWidth="1px"
                            borderColor={isChosen ? 'extruder.500' : 'border.subtle'}
                            bg={isChosen ? 'extruder.500/10' : 'bg.canvas'}
                            cursor="pointer"
                            onClick={() => setMaterial(m.id as any)}
                          >
                            <Text fontSize="xs" fontWeight="bold" color={isChosen ? 'extruder.500' : 'fg.default'}>
                              {m.name}
                            </Text>
                            <Text fontSize="10px" color="fg.muted">
                              {m.desc}
                            </Text>
                          </Box>
                        );
                      })}
                    </Grid>
                  </VStack>

                  {/* Color Selector */}
                  <VStack align="start" gap={2}>
                    <Text fontSize="xs" fontWeight="bold" color="fg.default">
                      {isAr ? 'لون الطباعة الأساسي' : 'Primary Filament Color'}
                    </Text>
                    <HStack gap={2} flexWrap="wrap">
                      {colorPaletteOptions.map((c) => {
                        const isChosen = selectedColor === c.hex;
                        return (
                          <Box
                            key={c.hex}
                            w="32px"
                            h="32px"
                            borderRadius="full"
                            bg={c.hex}
                            cursor="pointer"
                            borderWidth="2px"
                            borderColor={isChosen ? 'white' : 'transparent'}
                            boxShadow={isChosen ? `0 0 0 2px #F97316` : 'none'}
                            onClick={() => setSelectedColor(c.hex)}
                          />
                        );
                      })}
                    </HStack>
                  </VStack>

                  {/* Scale Slider */}
                  <VStack align="start" gap={2}>
                    <HStack justify="space-between" w="full">
                      <Text fontSize="xs" fontWeight="bold" color="fg.default">
                        {isAr ? 'التحكم في الحجم (Scale)' : 'Fixed-Step Scale Size'}
                      </Text>
                      <Badge size="xs" colorPalette="teal" variant="surface">
                        {scalePercent}%
                      </Badge>
                    </HStack>
                    <HStack gap={1.5} w="full">
                      {[50, 75, 100, 125, 150].map((sc) => (
                        <Button
                          key={sc}
                          flex={1}
                          size="xs"
                          variant={scalePercent === sc ? 'solid' : 'outline'}
                          colorPalette={scalePercent === sc ? 'teal' : 'gray'}
                          onClick={() => setScalePercent(sc)}
                        >
                          {sc}%
                        </Button>
                      ))}
                    </HStack>
                  </VStack>

                  {/* Pricing Overview */}
                  <Box p={3.5} borderRadius="xl" bg="bg.canvas" borderWidth="1px" borderColor="border.subtle">
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="fg.muted">
                        {isAr ? 'الحد الأدنى الخوارزمي للتكلفة:' : 'Algorithmic Floor Price:'}
                      </Text>
                      <Text fontSize="sm" fontWeight="black" color="laser.500">
                        {minPrintFloor} {isAr ? 'درهم' : 'AED'} ({quantity} {isAr ? 'قطع' : 'pcs'})
                      </Text>
                    </HStack>
                  </Box>

                  {/* Continue Button */}
                  <Button
                    colorPalette="teal"
                    size="lg"
                    w="full"
                    onClick={() => {
                      setStep(5);
                      window.scrollTo({ top: 120, behavior: 'smooth' });
                    }}
                    bg="linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)"
                    color="white"
                  >
                    <HStack gap={2}>
                      <Text fontWeight="bold">
                        {isAr ? 'متابعة إلى موقع التوصيل والضمان المالي' : 'Continue to UAE Delivery & Escrow Budget'}
                      </Text>
                      {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                    </HStack>
                  </Button>
                </VStack>
              </Box>
            </Grid>
          </VStack>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: UAE DELIVERY & ESCROW REVERSE-BIDDING                             */}
        {/* ========================================================================= */}
        {step === 5 && (
          <VStack gap={6} align="stretch">
            <VStack gap={2} textAlign="center" py={2}>
              <Badge size="sm" colorPalette="orange" variant="subtle">
                {isAr ? 'تفويض الضمان المالي ومناقصة التوصيل' : 'Escrow Pre-Authorization & Reverse-Bidding'}
              </Badge>
              <Heading size={{ base: 'xl', md: '2xl' }} fontWeight="black">
                {isAr ? 'حدد موقع التوصيل وسقف ميزانية الضمان' : 'UAE Delivery Location & Escrow Ceilings'}
              </Heading>
              <Text fontSize="sm" color="fg.muted" maxW="xl">
                {isAr
                  ? 'حدّد الحد الأقصى لميزانيتك، وسيتنافس المصنّعون والمناديب لتقديم عروض أقل، مع رد الوفر المالي فوراً لحسابك:'
                  : 'Set your maximum budget ceilings. Makers and couriers bid downwards, and any cost savings are instantly refunded:'}
              </Text>
            </VStack>

            <Grid templateColumns={{ base: '1fr', lg: '7fr 5fr' }} gap={6} alignContent="start">
              {/* Left Column: OpenStreetMap Geopicker & Address */}
              <Box p={6} borderRadius="3xl" bg="bg.panel" borderWidth="1px" borderColor="border.subtle">
                <VStack gap={4} align="stretch">
                  <Text fontSize="sm" fontWeight="bold" color="fg.default">
                    {isAr ? '١. موقع استلام الشحنة في الإمارات' : '1. UAE Dropoff Location'}
                  </Text>

                  {/* Emirate Selector */}
                  <HStack gap={2} flexWrap="wrap">
                    {emiratesList.map((em) => {
                      const isChosen = selectedEmirate === em.id;
                      return (
                        <Button
                          key={em.id}
                          size="xs"
                          variant={isChosen ? 'solid' : 'outline'}
                          colorPalette={isChosen ? 'orange' : 'gray'}
                          onClick={() => setSelectedEmirate(em.id)}
                        >
                          {isAr ? em.ar : em.en}
                        </Button>
                      );
                    })}
                  </HStack>

                  {/* Interactive Map Picker */}
                  <OsmLocationPicker
                    onLocationSelect={(loc) => {
                      setDeliveryLat(loc.lat);
                      setDeliveryLng(loc.lng);
                      if (loc.district) setDistrict(loc.district);
                      if (loc.streetAddress) setStreetAddress(loc.streetAddress);
                    }}
                  />

                  {/* District & Street */}
                  <HStack gap={3}>
                    <Input
                      placeholder={isAr ? 'الحي / المنطقة' : 'District'}
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      size="sm"
                      borderRadius="xl"
                      bg="bg.canvas"
                    />
                    <Input
                      placeholder={isAr ? 'العنوان / الشارع والفيلا' : 'Street & Villa / Building'}
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      size="sm"
                      borderRadius="xl"
                      bg="bg.canvas"
                    />
                  </HStack>
                </VStack>
              </Box>

              {/* Right Column: Reverse-Bidding Escrow Budget Sliders */}
              <Box p={6} borderRadius="3xl" bg="bg.panel" borderWidth="1px" borderColor="border.subtle">
                <VStack gap={5} align="stretch">
                  <Text fontSize="sm" fontWeight="bold" color="fg.default">
                    {isAr ? '٢. ميزانية الضمان المالي ومناقصة الأسعار' : '2. Reverse-Bidding Escrow Budget'}
                  </Text>

                  {/* Print Budget Slider */}
                  <VStack align="start" gap={2}>
                    <HStack justify="space-between" w="full">
                      <Text fontSize="xs" fontWeight="bold" color="fg.muted">
                        {isAr ? 'سقف ميزانية الطباعة ثلاثية الأبعاد:' : 'Max 3D Print Budget Ceiling:'}
                      </Text>
                      <Text fontSize="sm" fontWeight="black" color="extruder.500">
                        {printBudgetAed} {isAr ? 'درهم' : 'AED'}
                      </Text>
                    </HStack>
                    <input
                      type="range"
                      min={minPrintFloor}
                      max={minPrintFloor * 2 + 100}
                      value={printBudgetAed}
                      onChange={(e) => setPrintBudgetAed(parseInt(e.target.value, 10))}
                      style={{ width: '100%', accentColor: '#F97316' }}
                    />
                    <Text fontSize="10px" color="fg.muted">
                      {isAr ? `الحد الأدنى الخوارزمي المسموح به: ${minPrintFloor} درهم` : `Algorithmic Floor Protection: Minimum ${minPrintFloor} AED`}
                    </Text>
                  </VStack>

                  {/* Delivery Budget Slider */}
                  <VStack align="start" gap={2}>
                    <HStack justify="space-between" w="full">
                      <Text fontSize="xs" fontWeight="bold" color="fg.muted">
                        {isAr ? 'سقف ميزانية التوصيل السريع:' : 'Max Delivery Budget Ceiling:'}
                      </Text>
                      <Text fontSize="sm" fontWeight="black" color="laser.500">
                        {deliveryBudgetAed} {isAr ? 'درهم' : 'AED'}
                      </Text>
                    </HStack>
                    <input
                      type="range"
                      min={minDeliveryFloor}
                      max={80}
                      value={deliveryBudgetAed}
                      onChange={(e) => setDeliveryBudgetAed(parseInt(e.target.value, 10))}
                      style={{ width: '100%', accentColor: '#14B8A6' }}
                    />
                    <Text fontSize="10px" color="fg.muted">
                      {isAr ? `الحد الأدنى لتغطية الوقود والمسافة: ${minDeliveryFloor} درهم` : `UAE Minimum Delivery Floor: ${minDeliveryFloor} AED`}
                    </Text>
                  </VStack>

                  {/* Total Pre-Authorization Summary */}
                  <Box p={4} borderRadius="2xl" bg="bg.canvas" borderWidth="1px" borderColor="border.subtle">
                    <VStack align="stretch" gap={2}>
                      <HStack justify="space-between">
                        <Text fontSize="xs" color="fg.muted">
                          {isAr ? 'إجمالي المبلغ المحتجز في الضمان:' : 'Total Authorized Escrow:'}
                        </Text>
                        <Text fontSize="md" fontWeight="black" color="fg.default">
                          {printBudgetAed + deliveryBudgetAed} {isAr ? 'درهم' : 'AED'}
                        </Text>
                      </HStack>

                      <Separator borderColor="border.subtle" my={1} />

                      <HStack gap={2} align="start">
                        <ShieldCheck size={18} color="#14B8A6" style={{ marginTop: '2px' }} />
                        <Text fontSize="11px" color="fg.muted" lineHeight="tall">
                          {isAr
                            ? '💡 حماية الوفر المالي: إذا قدّم المصنّع عرضاً بـ ١٨٠ درهماً لميزانيتك المحددة بـ ٢٠٠ درهم، يُعاد فارق الـ ٢٠ درهماً فوراً إلى بطاقتك الائتمانية دون أي تأخير.'
                            : '💡 Instant Savings: If a maker bids below your budget, the cost difference is automatically refunded to your card upon order match.'}
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>

                  {/* Escrow Authorize Button */}
                  <Button
                    colorPalette="orange"
                    size="xl"
                    w="full"
                    onClick={handleAuthorizeEscrow}
                    loading={isAuthorizingEscrow}
                    bg="linear-gradient(135deg, #F97316 0%, #EA580C 100%)"
                    color="white"
                    boxShadow="0 8px 24px rgba(249, 115, 22, 0.3)"
                  >
                    <HStack gap={2}>
                      <CreditCard size={20} />
                      <Text fontWeight="black" fontSize="md">
                        {isAr
                          ? 'تفويض الضمان المالي عبر Ziina ونشر الطلب'
                          : 'Authorize Escrow via Ziina & Dispatch'}
                      </Text>
                    </HStack>
                  </Button>
                </VStack>
              </Box>
            </Grid>
          </VStack>
        )}
      </Container>
    </Box>
  );
}
