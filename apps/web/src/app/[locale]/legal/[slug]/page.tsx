'use client';

import {
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Box,
  Badge,
  Separator,
  Button,
} from '@chakra-ui/react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { Shield, FileText, ArrowLeft, ArrowRight, AlertTriangle, Scale, Clock, RefreshCcw } from 'lucide-react';

interface LegalDoc {
  titleEn: string;
  titleAr: string;
  badgeEn: string;
  badgeAr: string;
  icon: any;
  sectionsEn: { title: string; content: string }[];
  sectionsAr: { title: string; content: string }[];
}

const LEGAL_DOCS: Record<string, LegalDoc> = {
  privacy: {
    titleEn: 'Data Privacy Policy',
    titleAr: 'سياسة خصوصية البيانات وحماية المعلومات',
    badgeEn: 'UAE PDPL Compliant',
    badgeAr: 'متوافق مع قانون حماية البيانات الإماراتي',
    icon: Shield,
    sectionsEn: [
      {
        title: '1. Regulatory Framework & Scope',
        content:
          'J3D Platform (msoms.ai) operates in full compliance with UAE Federal Decree-Law No. 45 of 2021 regarding Personal Data Protection (PDPL). This privacy policy governs the collection, processing, and protection of user information across our on-demand 3D printing and delivery ecosystem.',
      },
      {
        title: '2. Cryptographic Security & Vault Storage',
        content:
          'All identity credentials, API tokens, and session secrets are encrypted using AES-256-GCM envelope encryption with hardware-secured keys. Passwords are never stored in plaintext and are hashed using the Argon2id memory-hard algorithm. Authentication cookies use strict HttpOnly, SameSite=Strict, and TLS-encrypted transport.',
      },
      {
        title: '3. Data Retention & Geographic Sovereignty',
        content:
          'All tenant databases, 3D CAD meshes, and transaction ledgers are hosted within state-of-the-art UAE data centers. User location coordinates collected via OpenStreetMap geocoding are strictly utilized for delivery distance computation and route optimization, and are never monetized or shared with unauthorized third parties.',
      },
      {
        title: '4. User Rights & Data Deletion',
        content:
          'Registered users retain full rights to request an export of their personal account history or initiate complete account deactivation and data scrubbing by contacting privacy@msoms.ai.',
      },
    ],
    sectionsAr: [
      {
        title: '١. الإطار التنظيمي والقانوني',
        content:
          'تعمل منصة J3D التابعة لـ msoms.ai بالامتثال التام للمرسوم بقانون اتحادي رقم (45) لسنة 2021 بشأن حماية البيانات الشخصية في دولة الإمارات العربية المتحدة. تنظم هذه السياسة معالجة وحماية بيانات العملاء والمصنّعين ومناديب التوصيل.',
      },
      {
        title: '٢. الحماية والتشفير المتقدم',
        content:
          'يتم تشفير كافة كلمات المرور باستخدام خوارزمية Argon2id المقاومة للهجمات السيبرانية، وتشفير مفاتيح الربط والبيانات الحساسة بتقنية AES-256-GCM. ملفات تعريف الارتباط محمية بصيغة HttpOnly وعبر بروتوكول TLS المشفر بالكامل.',
      },
      {
        title: '٣. السيادة الجغرافية وحفظ البيانات',
        content:
          'تُحفظ كافة ملفات التصميم ثلاثي الأبعاد والبيانات الجغرافية داخل خوادم مؤمنة في دولة الإمارات العربية المتحدة. وتُستخدم إحداثيات الموقع حصراً لحساب تكلفة الشحن ومسارات المناديب ولا يتم بيعها أو مشاركتها مع أي جهة خارجية.',
      },
      {
        title: '٤. حقوق المستخدم ومسح البيانات',
        content:
          'يحق لأي مستخدم مسجل طلب نسخة رقمية من كافة بياناته أو طلب الحذف النهائي لحسابه وسجلاته عبر التواصل مع فريق الخصوصية على privacy@msoms.ai.',
      },
    ],
  },
  policy: {
    titleEn: 'Platform & AI Safety Policy',
    titleAr: 'سياسة المنصة وضوابط الذكاء الاصطناعي',
    badgeEn: 'Zero-Weapons Tolerance',
    badgeAr: 'حظر تام للأسلحة والممنوعات',
    icon: AlertTriangle,
    sectionsEn: [
      {
        title: '1. Strict Prohibition of 3D Printed Weapons',
        content:
          'Under UAE Federal Law No. 17 of 2019 concerning weapons, ammunition, and explosives, J3D enforces an absolute, zero-tolerance prohibition against synthesizing, uploading, slicing, or fabricating firearms, receivers, trigger mechanisms, silencers, knives, knuckle dusters, or lethal components.',
      },
      {
        title: '2. Automated Gemini AI Guardrails',
        content:
          'Every natural language customization prompt and generated 3D geometry is screened through multi-layered Google Gemini AI safety filters. Any attempt to synthesize weaponized geometry or bypass system constraints triggers an immediate system alert, account suspension, and logging in the immutable administrative audit trail.',
      },
      {
        title: '3. Lock-Picking & Security Bypass Items',
        content:
          'The fabrication of bump keys, lock-picking sets, universal master keys, vehicle transponder clones, or intrusion tools is strictly prohibited and subject to immediate order cancellation with forfeiture of pre-authorized funds.',
      },
      {
        title: '4. Provider Reporting Duty',
        content:
          'All verified 3D Printer Providers (Makers) are legally obligated to inspect 3D meshes before production. Any suspicious or non-compliant design must be flagged immediately via the Maker Radar interface for compliance review.',
      },
    ],
    sectionsAr: [
      {
        title: '١. الحظر القاطع لتصنيع الأسلحة ثلاثية الأبعاد',
        content:
          'وفقاً للقانون الاتحادي رقم (17) لسنة 2019 بشأن الأسلحة والذخائر والمتفجرات والعتاد العسكري في دولة الإمارات، تفرض المنصة حظراً قاطعاً على نمذجة أو طباعة أي قطع أسلحة نارية، أو هياكل مسدسات، أو أسلحة بيضاء، أو كواتم صوت.',
      },
      {
        title: '٢. حواجز الأمان الآلية بالذكاء الاصطناعي',
        content:
          'يخضع كل وصف يتم إدخاله إلى فحص فوري ومحكم بواسطة نماذج Google Gemini المتقدمة. يؤدي أي اشتباه بإنشاء مجسمات خطرة أو أسلحة إلى إلغاء المعاملة تلقائياً وتسجيل إنذار فوري عالي الخطورة لدى الإدارة.',
      },
      {
        title: '٣. أدوات فتح الأقفال واختراق الحماية',
        content:
          'يُحظر منعاً باتاً تصنيع مفاتيح Master عامة غير مصرح بها، أو أدوات فك الأقفال والسرقة، أو أدوات استنساخ أجهزة التحكم بالمركبات.',
      },
      {
        title: '٤. مسؤولية المصنّعين القانونية في الإبلاغ',
        content:
          'يلتزم كافة المصنّعين المعتمدين في الإمارات بفحص ملفات المجسمات قبل بدء الطباعة، ورفع إبلاغ فوري في حال اكتشاف أي تصميم مشبوه عبر واجهة الرادار.',
      },
    ],
  },
  terms: {
    titleEn: 'Terms of Service',
    titleAr: 'الشروط والأحكام العامة للمنصة',
    badgeEn: 'Binding Legal Contract',
    badgeAr: 'عقد قانوني ملزم',
    icon: Scale,
    sectionsEn: [
      {
        title: '1. Multi-Party Marketplace Dynamics',
        content:
          'J3D functions as an intelligent matchmaking marketplace connecting three distinct parties: Clients who request 3D prints, Maker Providers who own additive manufacturing hardware, and Courier Fleets who execute rapid UAE deliveries.',
      },
      {
        title: '2. Escrow & Reverse-Bidding Mechanism',
        content:
          'Clients specify maximum budgetary ceilings for both fabrication and delivery. Providers bid openly or counter-offer. When a bid matches or undercuts the budget ceiling, the order is locked via distributed Redis locks, and any financial savings are immediately refunded to the client.',
      },
      {
        title: '3. Dual-OTP Handshake Accountability',
        content:
          'Chain of custody is cryptographically guaranteed using dual 6-digit one-time passcodes. Makers generate a Pickup OTP verified by Couriers upon handoff. Clients verify a Delivery OTP upon physical receipt, releasing escrow payouts.',
      },
      {
        title: '4. Dispute Adjudication',
        content:
          'Disputes regarding dimensional warping, broken parts, or delivery delays are mediated by J3D Administration using high-resolution print-bed photo proof and timestamped telemetry.',
      },
    ],
    sectionsAr: [
      {
        title: '١. نموذج العمل والأطراف المشاركة',
        content:
          'تعمل J3D كمنصة تقنية تربط بين ثلاثة أطراف: العميل صاحب الطلب، المصنّع صاحب الطابعة ثلاثية الأبعاد، والمندوب المسؤول عن التوصيل السريع داخل مدن الإمارات.',
      },
      {
        title: '٢. آلية الضمان المالي والمناقصة العكسية',
        content:
          'يحدد العميل الحد الأقصى لميزانيته، ويقوم المصنّعون بتقديم عروضهم. عند قبول عرض بأقل من الميزانية، يتم حجز الطلب فوراً ورد فارق السعر إلى محفظة أو بطاقة العميل مباشرة.',
      },
      {
        title: '٣. رمز الاستلام والتسليم الثنائي (Dual-OTP)',
        content:
          'لضمان الشفافية، يتم تأكيد استلام الطرد من المصنّع برمز Pickup OTP سداسي، وتأكيد تسليمه للعميل برمز Delivery OTP سداسي، مما يُفعّل الإفراج الآلي عن مستحقات المصنّع والمندوب.',
      },
      {
        title: '٤. فض النزاعات والتحكيم',
        content:
          'في حال حدوث أي تلف أو كسر أو تأخر في التسليم، تفصل إدارة المنصة في الشكوى بالاعتماد على صور المجسم المرفوعة قبل التعبئة وبيانات التتبع الموثقة.',
      },
    ],
  },
  sla: {
    titleEn: 'Printing & Delivery SLA',
    titleAr: 'اتفاقية مستوى الخدمة وجودة الطباعة',
    badgeEn: 'Tolerance ±0.2mm',
    badgeAr: 'دقة تصنيع ±0.2 مم',
    icon: Clock,
    sectionsEn: [
      {
        title: '1. Dimensional Tolerances & Mesh Integrity',
        content:
          'Makers must maintain a dimensional accuracy of ±0.2mm on critical mating surfaces and ensure that prints match the watertight .STL geometry without layer delamination or severe stringing.',
      },
      {
        title: '2. Turnaround Commitments',
        content:
          'Standard orders must be printed and photo-verified within 24 to 48 hours of acceptance. Express turnaround orders must enter the READY_FOR_PICKUP state within 12 hours.',
      },
      {
        title: '3. Last-Mile Courier Standards',
        content:
          'Couriers must inspect the package integrity upon pickup, handle fragile PLA/PETG/Resin models with protective packaging, and complete inter-emirate deliveries within the scheduled delivery window.',
      },
      {
        title: '4. Photo Verification Mandatory Step',
        content:
          'Before an order can transition to READY_FOR_PICKUP, the Maker must upload a clear, high-resolution photo of the completed print on the build plate showing complete layer adhesion.',
      },
    ],
    sectionsAr: [
      {
        title: '١. دقة الأبعاد وجودة النماذج المطبوعة',
        content:
          'يلتزم المصنّع بتحقيق دقة قياسية تتراوح بين ±0.2 مم، والتأكد من تماسك الطبقات وانعدام التشوّه أو التصدّع في المجسم ثلاثي الأبعاد.',
      },
      {
        title: '٢. الجداول الزمنية للإنتاج',
        content:
          'تستغرق الطباعة القياسية ما بين 24 إلى 48 ساعة من وقت قبول العرض، بينما تستغرق الطلبات العاجلة 12 ساعة كحد أقصى لتكون جاهزة للاستلام.',
      },
      {
        title: '٣. معايير أسطول التوصيل',
        content:
          'يتعين على المندوب فحص سلامة التغليف الخارجي للقطعة والتعامل بحذر شديد مع مجسمات الريزن والبلاستيك الهشة، والالتزام بمسار التوصيل المحدد.',
      },
      {
        title: '٤. التوثيق الإلزامي بالصور',
        content:
          'لا يمكن نقل الطلب لحالة الجاهزية للاستلام إلا بعد رفع صورة واضحة وعالية الدقة للقطعة المطبوعة على قاعدة الطابعة للتأكد من سلامة المنتج النهائي.',
      },
    ],
  },
  refunds: {
    titleEn: 'Escrow & Refund Policy',
    titleAr: 'سياسة الضمان المالي والاسترداد',
    badgeEn: 'Ziina Escrow Protection',
    badgeAr: 'حماية الضمان المالي عبر Ziina',
    icon: RefreshCcw,
    sectionsEn: [
      {
        title: '1. Pre-Authorization & Escrow Hold',
        content:
          'When an order is created, client funds are pre-authorized and held securely in escrow via Ziina Payment. Funds are never released to providers until the final physical delivery is confirmed.',
      },
      {
        title: '2. Automatic Savings Refund',
        content:
          'If a Client sets a maximum budget of 100 AED and a Maker accepts the order for 75 AED, the 25 AED difference is immediately and automatically refunded to the Client upon order match.',
      },
      {
        title: '3. Cancellation Prior to Print Start',
        content:
          'Clients may cancel an order with a 100% full refund at any time before a Maker has accepted the order and commenced physical printing.',
      },
      {
        title: '4. Quality Failure & Replacement',
        content:
          'If a print fails dimensional tolerances or arrives damaged, the Client may trigger a dispute within 24 hours. If verified, the order will be either re-printed at no charge or fully refunded from escrow.',
      },
    ],
    sectionsAr: [
      {
        title: '١. الحجز المالي الآمن في الضمان',
        content:
          'عند إنشاء الطلب، يتم تفويض المبلغ واحتجازه بأمان في حساب الضمان عبر بوابة Ziina المعتمدة في الإمارات، ولا يتم تحويل الأرباح للمصنّع أو المندوب إلا بعد استلام العميل للطلب.',
      },
      {
        title: '٢. رد الوفر المالي الفوري',
        content:
          'إذا كانت ميزانية العميل القصوى 100 درهم وقدم المصنّع عرضاً بقيمة 75 درهماً، يُعاد فارق الـ 25 درهماً تلقائياً وبشكل فوري لحساب العميل.',
      },
      {
        title: '٣. سياسة الإلغاء قبل الطباعة',
        content:
          'يحق للعميل إلغاء الطلب واسترداد كامل المبلغ بنسبة 100% في أي وقت طالما لم يتم قبول الطلب والبدء الفعلي في عملية الطباعة.',
      },
      {
        title: '٤. التعويض في حال عيوب التصنيع',
        content:
          'إذا وصل المجسم تالفاً أو غير مطابق للمواصفات الهندسية، يفتح العميل بلاغاً خلال 24 ساعة، ويحق له إعادة الطباعة مجاناً أو استرداد كامل المبلغ المحتجز.',
      },
    ],
  },
  safety: {
    titleEn: '3D Material Safety Guidelines',
    titleAr: 'دليل سلامة المواد والطباعة ثلاثية الأبعاد',
    badgeEn: 'ISO/ASTM Guidelines',
    badgeAr: 'إرشادات السلامة القياسية',
    icon: Shield,
    sectionsEn: [
      {
        title: '1. Material Classification & Uses',
        content:
          'PLA is biodegradable and suitable for display models and non-structural indoor use. PETG provides superior thermal and chemical resistance. Standard photopolymer resins are rigid and brittle and require UV post-curing.',
      },
      {
        title: '2. Food Contact Warning',
        content:
          'Unless explicitly certified using FDA-approved food-safe filament and stainless-steel nozzles, 3D printed items must not be used for direct contact with food or liquids, due to micro-crevices between layer lines that harbor bacterial growth.',
      },
      {
        title: '3. Resin Chemical Hazards & Ventilation',
        content:
          'Makers operating MSLA/SLA resin printers must wear nitrile gloves and work in well-ventilated spaces. Liquid resin is toxic to aquatic organisms and must be fully cured before disposal.',
      },
      {
        title: '4. Thermal Limitations',
        content:
          'PLA softens at 55°C to 60°C and must not be left inside vehicles during UAE summer months. Use PETG or ASA for automotive accessories and high-heat environments.',
      },
    ],
    sectionsAr: [
      {
        title: '١. تصنيف المواد الخام واستخداماتها',
        content:
          'مادة PLA صديقة للبيئة ومناسبة للمجسمات المكتبية والديكور. مادة PETG تتميز بمقاومة عالية للحرارة والمواد الكيميائية، بينما تُستخدم مواد الريزن للمجسمات الدقيقة والتفاصيل المعقدة.',
      },
      {
        title: '٢. تحذير ملامسة الأطعمة والمشروبات',
        content:
          'ما لم يتم استخدام خامات معتمدة طبياً وفوهات طباعة من الفولاذ المقاوم للصدأ، يُمنع استخدام المطبوعات للأكل والشرب المباشر لاحتواء الأسطح على فجوات مجهرية تجمع البكتيريا.',
      },
      {
        title: '٣. سلامة التعامل مع الريزن الكيميائي',
        content:
          'يجب على مشغلي طابعات الريزن ارتداء قفازات النيتريل وتوفير تهوية جيدة، ومعالجة بقايا سائل الريزن بالأشعة فوق البنفسجية قبل التخلص منها لمنع تلوث البيئة.',
      },
      {
        title: '٤. درجات الحرارة ومناخ الإمارات',
        content:
          'تبدأ مادة PLA بالتشوه عند درجات حرارة تتجاوز 55 مئوية، لذا يُحظر تركها داخل المركبات صيفاً، ويُنصح باستخدام خامات PETG أو ASA للأماكن المعرضة لأشعة الشمس والحرارة العالية.',
      },
    ],
  },
};

export default function LegalPage() {
  const params = useParams();
  const locale = useLocale();
  const isAr = locale === 'ar';
  const slug = (params?.slug as string) || 'terms';

  const doc = LEGAL_DOCS[slug];

  if (!doc) {
    return notFound();
  }

  const Icon = doc.icon;
  const sections = isAr ? doc.sectionsAr : doc.sectionsEn;

  return (
    <Container maxW="4xl" py={{ base: 8, md: 12 }}>
      <VStack gap={8} align="stretch">
        {/* Back Link */}
        <Link href={`/${locale}`} style={{ textDecoration: 'none' }}>
          <Button variant="ghost" size="sm" color="fg.muted" _hover={{ color: 'extruder.500' }}>
            <HStack gap={2}>
              {isAr ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
              <Text>{isAr ? 'العودة للاستوديو' : 'Back to Studio'}</Text>
            </HStack>
          </Button>
        </Link>

        {/* Document Header */}
        <Box
          p={6}
          borderRadius="2xl"
          bg="bg.panel"
          borderWidth="1px"
          borderColor="border.subtle"
          boxShadow="sm"
        >
          <HStack justify="space-between" align="start" flexWrap="wrap" gap={4}>
            <HStack gap={4}>
              <Box
                p={3}
                borderRadius="xl"
                bg="extruder.500/10"
                color="extruder.500"
                borderWidth="1px"
                borderColor="extruder.500/20"
              >
                <Icon size={28} />
              </Box>
              <VStack align="start" gap={1}>
                <Heading size="lg" fontWeight="bold">
                  {isAr ? doc.titleAr : doc.titleEn}
                </Heading>
                <Text fontSize="xs" color="fg.muted">
                  {isAr ? 'آخر تحديث: نوفمبر 2026 • مبادرة msoms.ai' : 'Last updated: November 2026 • msoms.ai initiative'}
                </Text>
              </VStack>
            </HStack>
            <Badge size="md" colorPalette="orange" variant="subtle">
              {isAr ? doc.badgeAr : doc.badgeEn}
            </Badge>
          </HStack>
        </Box>

        {/* Sections Content */}
        <VStack gap={6} align="stretch">
          {sections.map((section, idx) => (
            <Box
              key={idx}
              p={6}
              borderRadius="xl"
              bg="bg.panel"
              borderWidth="1px"
              borderColor="border.subtle"
            >
              <Heading size="sm" fontWeight="bold" mb={3} color="fg.default">
                {section.title}
              </Heading>
              <Text fontSize="sm" color="fg.muted" lineHeight="tall">
                {section.content}
              </Text>
            </Box>
          ))}
        </VStack>

        <Separator borderColor="border.subtle" />

        {/* Footer Navigation of other docs */}
        <Box
          p={6}
          borderRadius="xl"
          bg="bg.canvas"
          borderWidth="1px"
          borderColor="border.subtle"
        >
          <Text fontSize="xs" fontWeight="bold" color="fg.muted" mb={4} textTransform="uppercase">
            {isAr ? 'وثائق المنصة القانونية والتنظيمية' : 'Platform Legal & Regulatory Policies'}
          </Text>
          <HStack gap={3} flexWrap="wrap">
            {Object.entries(LEGAL_DOCS).map(([key, item]) => {
              const active = key === slug;
              return (
                <Link key={key} href={`/${locale}/legal/${key}`} style={{ textDecoration: 'none' }}>
                  <Button
                    size="xs"
                    variant={active ? 'solid' : 'outline'}
                    colorPalette={active ? 'orange' : 'gray'}
                  >
                    {isAr ? item.titleAr : item.titleEn}
                  </Button>
                </Link>
              );
            })}
          </HStack>
        </Box>
      </VStack>
    </Container>
  );
}
