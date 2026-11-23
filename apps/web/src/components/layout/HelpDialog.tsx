'use client';

import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogCloseTrigger,
  IconButton,
  VStack,
  Text,
  Badge,
  HStack,
  Box,
} from '@chakra-ui/react';
import { HelpCircle, Layers, ShieldCheck, Truck, Sparkles } from 'lucide-react';
import { useLocale } from 'next-intl';

export function HelpDialog() {
  const locale = useLocale();
  const isAr = locale === 'ar';

  return (
    <DialogRoot placement="center" motionPreset="slide-in-bottom">
      <DialogTrigger asChild>
        <IconButton
          aria-label={isAr ? 'المساعدة والدليل' : 'Help & Guide'}
          variant="ghost"
          size="sm"
          color="fg.muted"
          _hover={{ color: 'extruder.500', bg: 'bg.panel' }}
        >
          <HelpCircle size={19} />
        </IconButton>
      </DialogTrigger>
      <DialogContent bg="bg.panel" borderColor="border.subtle" borderRadius="xl" maxW="580px" p={6}>
        <DialogHeader pb={3}>
          <HStack gap={3}>
            <Box p={2} bg="extruder.500/10" borderRadius="lg" color="extruder.500">
              <Sparkles size={22} />
            </Box>
            <DialogTitle fontSize="lg" fontWeight="bold" color="fg.default">
              {isAr ? 'كيف تعمل منصة J3D للطباعة والتوصيل؟' : 'How the J3D Platform Works'}
            </DialogTitle>
          </HStack>
        </DialogHeader>
        <DialogCloseTrigger color="fg.muted" />
        <DialogBody pt={2}>
          <VStack gap={4} align="stretch">
            <Box p={3} bg="bg.canvas" borderRadius="lg" border="1px solid" borderColor="border.subtle">
              <HStack gap={2} mb={1}>
                <Layers size={16} color="#F97316" />
                <Badge colorPalette="orange" size="sm">
                  {isAr ? '١. الذكاء الاصطناعي والتخصيص' : '1. AI 3D Studio'}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="fg.muted">
                {isAr
                  ? 'أجب على أسئلة المعالج التفاعلي المدعوم بـ Gemini 4 Hydrogen لبناء وتوليد نموذج 3D محكم ومتماسك تلقائياً.'
                  : 'Answer quick conversational prompts powered by Gemini 4 Hydrogen to synthesize watertight .STL 3D meshes in seconds.'}
              </Text>
            </Box>

            <Box p={3} bg="bg.canvas" borderRadius="lg" border="1px solid" borderColor="border.subtle">
              <HStack gap={2} mb={1}>
                <ShieldCheck size={16} color="#14B8A6" />
                <Badge colorPalette="teal" size="sm">
                  {isAr ? '٢. رادار المصنّعين والمناقصة العكسية' : '2. Reverse-Bidding & Escrow'}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="fg.muted">
                {isAr
                  ? 'يتم إرسال طلبك إلى أصحاب الطابعات ثلاثية الأبعاد في الإمارات. إذا قبل مصنّع بسعر أقل، يُعاد إليك الفارق المالي فوراً.'
                  : 'Open orders are dispatched to UAE 3D print farms. First provider matching your budget starts printing; savings are instantly refunded.'}
              </Text>
            </Box>

            <Box p={3} bg="bg.canvas" borderRadius="lg" border="1px solid" borderColor="border.subtle">
              <HStack gap={2} mb={1}>
                <Truck size={16} color="#38BDF8" />
                <Badge colorPalette="cyan" size="sm">
                  {isAr ? '٣. التوصيل السريع وضمان الـ OTP' : '3. Last-Mile Delivery & Dual OTP'}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="fg.muted">
                {isAr
                  ? 'يتم التسليم بواسطة مناديب التوصيل عبر رمزي تحقق OTP مشفرين لضمان استلامك للقطعة بأعلى جودة.'
                  : 'UAE couriers pick up your packaged print via a 6-digit Pickup OTP and complete delivery with your doorstep Delivery OTP.'}
              </Text>
            </Box>
          </VStack>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}
