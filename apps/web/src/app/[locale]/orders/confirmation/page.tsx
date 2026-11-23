'use client';

import { Suspense, useEffect, useState } from 'react';
import {
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Box,
  Button,
  Badge,
  Separator,
  Spinner,
} from '@chakra-ui/react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Radio,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function ConfirmationContent() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const searchParams = useSearchParams();

  const orderId = searchParams.get('orderId') || 'ORD-DEMO-2026';
  const paymentIntentId = searchParams.get('payment_intent_id');
  const statusParam = searchParams.get('status') || 'completed';

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderId && orderId !== 'ORD-DEMO-2026') {
      setLoading(true);
      fetch(`${API_BASE}/orders/${orderId}`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (data?.data) setOrder(data.data);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [orderId]);

  return (
    <Container maxW="2xl" py={{ base: 8, md: 14 }}>
      <VStack gap={6} align="stretch">
        {/* Success Card Header */}
        <Box
          p={8}
          borderRadius="3xl"
          bg="bg.panel"
          borderWidth="1px"
          borderColor="laser.500/30"
          boxShadow="0 8px 30px rgba(20, 184, 166, 0.12)"
          textAlign="center"
        >
          <VStack gap={4}>
            <Box
              w="64px"
              h="64px"
              borderRadius="2xl"
              bg="laser.500/10"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="laser.500"
              borderWidth="1px"
              borderColor="laser.500/20"
            >
              <CheckCircle2 size={36} />
            </Box>

            <VStack gap={1}>
              <Badge size="md" colorPalette="teal" variant="surface">
                {isAr ? 'ضمان مالي معتمد عبر Ziina' : 'Escrow Pre-Authorized via Ziina'}
              </Badge>
              <Heading size="xl" fontWeight="black" mt={2}>
                {isAr ? 'تم استلام وتأكيد طلبك بنجاح!' : 'Order Placed & Escrow Secured!'}
              </Heading>
              <Text fontSize="sm" color="fg.muted" maxW="lg">
                {isAr
                  ? 'تم حجز المبلغ في حساب الضمان وتوزيع تفاصيل المجسم ثلاثي الأبعاد فوراً على شبكة المصنّعين في الإمارات.'
                  : 'Funds are securely held in escrow and your 3D design has been dispatched across the UAE maker network.'}
              </Text>
            </VStack>

            {/* Radar Pulse Notification */}
            <Box
              w="full"
              p={4}
              borderRadius="2xl"
              bg="extruder.500/10"
              borderWidth="1px"
              borderColor="extruder.500/20"
            >
              <HStack justify="center" gap={3}>
                <Radio size={20} color="#F97316" className="animate-pulse" />
                <Text fontSize="sm" fontWeight="bold" color="extruder.500">
                  {isAr
                    ? 'رادار المصنّعين نشط الآن: بانتظار عروض الأسعار العكسية من أصحاب الطابعات'
                    : 'Live Maker Radar: Awaiting reverse-bids from local UAE 3D printers'}
                </Text>
              </HStack>
            </Box>
          </VStack>
        </Box>

        {/* Order Details Breakdown */}
        <Box
          p={6}
          borderRadius="2xl"
          bg="bg.panel"
          borderWidth="1px"
          borderColor="border.subtle"
        >
          <VStack gap={4} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="xs" fontWeight="bold" color="fg.muted" textTransform="uppercase">
                {isAr ? 'بيانات المعاملة والطلب' : 'Transaction Telemetry'}
              </Text>
              <Badge size="xs" colorPalette="orange" variant="outline">
                {order?.orderNumber || orderId}
              </Badge>
            </HStack>

            <Separator borderColor="border.subtle" />

            <VStack gap={3} align="stretch" fontSize="sm">
              <HStack justify="space-between">
                <Text color="fg.muted">{isAr ? 'بوابة الدفع والضمان' : 'Payment Escrow Engine'}</Text>
                <HStack gap={1}>
                  <ShieldCheck size={16} color="#14B8A6" />
                  <Text fontWeight="bold">Ziina UAE Payment Gateway</Text>
                </HStack>
              </HStack>

              <HStack justify="space-between">
                <Text color="fg.muted">{isAr ? 'معرف الدفع في Ziina' : 'Ziina Intent Reference'}</Text>
                <Text fontFamily="mono" fontSize="xs" color="fg.muted">
                  {paymentIntentId || 'pi_test_live_secured'}
                </Text>
              </HStack>

              <HStack justify="space-between">
                <Text color="fg.muted">{isAr ? 'الحد الأقصى للطباعة' : 'Max Print Budget'}</Text>
                <Text fontWeight="bold">
                  {order?.maxPrintBudgetAed || '100'} {isAr ? 'درهم' : 'AED'}
                </Text>
              </HStack>

              <HStack justify="space-between">
                <Text color="fg.muted">{isAr ? 'الحد الأقصى للتوصيل' : 'Max Delivery Budget'}</Text>
                <Text fontWeight="bold">
                  {order?.maxDeliveryBudgetAed || '25'} {isAr ? 'درهم' : 'AED'}
                </Text>
              </HStack>

              <HStack justify="space-between">
                <Text color="fg.muted">{isAr ? 'حالة الطلب الحالية' : 'Current Lifecycle State'}</Text>
                <Badge size="sm" colorPalette="yellow" variant="subtle">
                  {isAr ? 'بانتظار المصنّعين (BIDDING_PRINTER)' : 'BIDDING_PRINTER'}
                </Badge>
              </HStack>
            </VStack>

            <Separator borderColor="border.subtle" />

            <Box p={3} borderRadius="lg" bg="bg.canvas" borderWidth="1px" borderColor="border.subtle">
              <Text fontSize="xs" color="fg.muted" lineHeight="tall">
                {isAr
                  ? '💡 ملاحظة: عند قبول أي مصنّع لطلبك بسعر أقل من ميزانيتك القصوى، سيتم رد الفارق فوراً إلى بطاقتك الائتمانية دون أي تأخير.'
                  : '💡 Note: If a maker accepts your order at a price below your maximum ceiling, the cost savings will be refunded to your card automatically.'}
              </Text>
            </Box>
          </VStack>
        </Box>

        {/* Navigation Action Buttons */}
        <HStack gap={4}>
          <Link href={`/${locale}/orders`} style={{ flex: 1, textDecoration: 'none' }}>
            <Button
              colorPalette="teal"
              size="lg"
              w="full"
              bg="linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)"
              color="white"
            >
              <HStack gap={2}>
                <ShoppingBag size={18} />
                <Text fontWeight="bold">
                  {isAr ? 'متابعة الطلب في لوحة الطلبات' : 'Track Order in My Orders'}
                </Text>
                {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </HStack>
            </Button>
          </Link>

          <Link href={`/${locale}`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="lg" borderColor="border.subtle">
              {isAr ? 'العودة للاستوديو' : 'Back to Studio'}
            </Button>
          </Link>
        </HStack>
      </VStack>
    </Container>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <Container maxW="md" py={20} textAlign="center">
          <Spinner size="xl" color="laser.500" />
        </Container>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
