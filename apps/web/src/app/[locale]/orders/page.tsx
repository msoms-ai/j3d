'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  Button,
  Grid,
  Spinner,
  Separator,
} from '@chakra-ui/react';
import {
  ShoppingBag,
  KeyRound,
  Truck,
  Cpu,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  User,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function ClientOrdersPage() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { user, fetchWithAuth, login } = useAuth();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/orders');
      if (res.ok) {
        const json = await res.json();
        const ordersList = Array.isArray(json.data) ? json.data : json.data?.orders || [];
        setOrders(ordersList);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const handleClientFastLogin = async () => {
    try {
      await login('client@msoms.ai', 'J3dPassword!2026');
      fetchOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_PRINTER':
      case 'BIDDING_PRINTER':
        return { color: 'orange', labelEn: 'Awaiting Maker Reverse-Bids', labelAr: 'بانتظار عروض المصنّعين' };
      case 'PRINTING':
        return { color: 'purple', labelEn: 'Printing in Progress', labelAr: 'جاري الطباعة في الورشة' };
      case 'READY_FOR_PICKUP':
        return { color: 'blue', labelEn: 'Ready for Courier Pickup', labelAr: 'جاهز للاستلام والتوصيل' };
      case 'DELIVERY_ASSIGNED':
        return { color: 'cyan', labelEn: 'Courier Dispatched', labelAr: 'تم تعيين المندوب' };
      case 'IN_TRANSIT':
        return { color: 'teal', labelEn: 'Package In Transit', labelAr: 'في الطريق إلى بابك' };
      case 'COMPLETED':
      case 'DELIVERED':
        return { color: 'green', labelEn: 'Delivered & Escrow Settled', labelAr: 'تم التسليم وتسوية الضمان' };
      default:
        return { color: 'gray', labelEn: status, labelAr: status };
    }
  };

  return (
    <Container maxW="6xl" py={8}>
      <VStack align="stretch" gap={6}>
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <VStack align="start" gap={1}>
            <Heading size="2xl" fontWeight="black">
              {isAr ? 'طلباتي ومتابعة الإنتاج والضمان' : 'My 3D Print Orders & Escrow'}
            </Heading>
            <Text fontSize="sm" color="fg.muted">
              {isAr
                ? 'تابع حالة التصنيع، عروض الأسعار العكسية، ورمز التسليم السداسي المالي'
                : 'Track fabrication progress, live reverse-bidding savings, and your 6-digit Delivery OTP'}
            </Text>
          </VStack>

          <Link href={`/${locale}`} style={{ textDecoration: 'none' }}>
            <Button
              colorPalette="orange"
              size="sm"
              bg="linear-gradient(135deg, #F97316 0%, #EA580C 100%)"
              color="white"
            >
              <HStack gap={1}>
                <Text>{isAr ? 'طلب طباعة ثلاثية الأبعاد جديد' : 'New 3D Print Request'}</Text>
                {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </HStack>
            </Button>
          </Link>
        </HStack>

        {/* Not Logged In Prompt */}
        {!user && (
          <Box p={5} borderRadius="2xl" bg="bg.panel" borderWidth="1px" borderColor="extruder.500/30">
            <HStack justify="space-between" flexWrap="wrap" gap={3}>
              <HStack gap={3}>
                <User size={20} color="#F97316" />
                <VStack align="start" gap={0}>
                  <Text fontSize="sm" fontWeight="bold">
                    {isAr ? 'سجل دخولك لعرض ومتابعة طلباتك الخاصة' : 'Sign in to access your personal order history'}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {isAr
                      ? 'يمكنك تسجيل الدخول بضغطة واحدة باستخدام حساب العميل التجريبي'
                      : 'You can sign in with one click using the verified demo client account'}
                  </Text>
                </VStack>
              </HStack>
              <Button size="xs" colorPalette="orange" onClick={handleClientFastLogin}>
                {isAr ? 'دخول بحساب العميل (client@msoms.ai)' : '1-Click Login (client@msoms.ai)'}
              </Button>
            </HStack>
          </Box>
        )}

        {loading ? (
          <Box py={20} textAlign="center">
            <Spinner size="xl" color="laser.500" />
            <Text fontSize="sm" color="fg.muted" mt={3}>
              {isAr ? 'جاري استرجاع طلباتك من قاعدة البيانات...' : 'Loading orders ledger...'}
            </Text>
          </Box>
        ) : orders.length === 0 ? (
          <Box p={12} textAlign="center" borderRadius="2xl" bg="bg.panel" borderWidth="1px" borderColor="border.subtle">
            <ShoppingBag size={48} color="#F97316" style={{ margin: '0 auto 16px' }} />
            <Heading size="md" fontWeight="bold" mb={2}>
              {isAr ? 'لا توجد طلبات سابقة حالياً' : 'No active orders found'}
            </Heading>
            <Text fontSize="sm" color="fg.muted" mb={6} maxW="md" mx="auto">
              {isAr
                ? 'استخدم استوديو الذكاء الاصطناعي لإنشاء أول تصميم ثلاثي الأبعاد خاص بك واطرحه للمناقصة'
                : 'Use the 3D AI Studio Wizard to create your first customized print and broadcast to UAE makers'}
            </Text>
            <Link href={`/${locale}`} style={{ textDecoration: 'none' }}>
              <Button colorPalette="orange" size="md">
                {isAr ? 'فتح استوديو التصميم 3D' : 'Open 3D Studio'}
              </Button>
            </Link>
          </Box>
        ) : (
          <VStack gap={4} align="stretch">
            {orders.map((order) => {
              const statusInfo = getStatusBadge(order.status);
              return (
                <Box
                  key={order.id}
                  p={6}
                  borderRadius="2xl"
                  bg="bg.panel"
                  borderWidth="1px"
                  borderColor="border.subtle"
                  boxShadow="sm"
                >
                  <Grid templateColumns={{ base: '1fr', lg: 'repeat(4, 1fr)' }} gap={4} alignItems="center">
                    {/* Col 1: Order Identity & Mesh Info */}
                    <VStack align="start" gap={1}>
                      <HStack gap={2}>
                        <Text fontSize="md" fontWeight="black" fontFamily="mono" color="fg.default">
                          {order.orderNumber}
                        </Text>
                        <Badge size="xs" colorPalette={statusInfo.color as any} variant="surface">
                          {isAr ? statusInfo.labelAr : statusInfo.labelEn}
                        </Badge>
                      </HStack>
                      <Text fontSize="xs" fontWeight="bold" color="fg.muted">
                        {order.stlFile?.title || 'Custom 3D Print Object'}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {order.quantity} {isAr ? 'قطع' : 'pcs'} • {order.stlFile?.material || 'PLA'}
                      </Text>
                    </VStack>

                    {/* Col 2: Telemetry & Pricing Breakdown */}
                    <VStack align="start" gap={1}>
                      <Text fontSize="xs" color="fg.muted">
                        {isAr ? 'الطباعة والتصنيع:' : '3D Print Budget:'}{' '}
                        <span style={{ fontWeight: 'bold', color: '#F97316' }}>
                          {order.agreedPrintPriceAed || order.clientMaxPrintBudgetAed} {isAr ? 'درهم' : 'AED'}
                        </span>
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {isAr ? 'الشحن والتوصيل:' : 'Delivery Budget:'}{' '}
                        <span style={{ fontWeight: 'bold', color: '#14B8A6' }}>
                          {order.agreedDeliveryPriceAed || order.clientMaxDeliveryBudgetAed} {isAr ? 'درهم' : 'AED'}
                        </span>
                      </Text>
                      {order.agreedPrintPriceAed && order.agreedPrintPriceAed < order.clientMaxPrintBudgetAed && (
                        <Badge size="xs" colorPalette="teal" variant="subtle">
                          {isAr ? 'تم استرداد وفر:' : 'Savings Refunded:'}{' '}
                          {order.clientMaxPrintBudgetAed - order.agreedPrintPriceAed} AED
                        </Badge>
                      )}
                    </VStack>

                    {/* Col 3: Destination & Escrow Telemetry */}
                    <VStack align="start" gap={1}>
                      <HStack gap={1} fontSize="xs" color="fg.default">
                        <Truck size={14} color="#14B8A6" />
                        <Text fontWeight="bold">
                          {order.dropoffEmirate}, {order.dropoffDistrict}
                        </Text>
                      </HStack>
                      <Text fontSize="11px" color="fg.muted" lineClamp={1}>
                        {order.dropoffStreetAddress}
                      </Text>
                      <HStack gap={1} fontSize="10px" color="fg.muted">
                        <ShieldCheck size={12} color="#14B8A6" />
                        <Text>Ziina Escrow: {order.ziinaPaymentIntentId ? 'Authorized' : 'Secured'}</Text>
                      </HStack>
                    </VStack>

                    {/* Col 4: Delivery Handshake OTP Action */}
                    <VStack align={{ base: 'start', lg: 'end' }} gap={2}>
                      {order.deliveryOtpPlainForClient ? (
                        <Box p={3} borderRadius="xl" bg="laser.500/10" borderWidth="1px" borderColor="laser.500/20" textAlign="center">
                          <HStack gap={1.5} justify="center">
                            <KeyRound size={15} color="#14B8A6" />
                            <Text fontSize="xs" fontWeight="bold" color="laser.500">
                              {isAr ? 'رمز تسليم المندوب (OTP):' : 'Your Delivery OTP:'}
                            </Text>
                          </HStack>
                          <Text fontSize="xl" fontWeight="black" fontFamily="mono" color="laser.500" letterSpacing="0.2em">
                            {order.deliveryOtpPlainForClient}
                          </Text>
                          <Text fontSize="9px" color="fg.muted">
                            {isAr ? 'أعطِ هذا الرمز للمندوب عند استلام الطرد' : 'Provide to courier upon doorstep receipt'}
                          </Text>
                        </Box>
                      ) : (
                        <Badge size="sm" colorPalette="orange" variant="outline">
                          {order.status === 'COMPLETED'
                            ? isAr ? 'مكتمل بنجاح' : 'Order Fulfilled'
                            : isAr ? 'بانتظار جاهزية الشحنة' : 'Awaiting Production'}
                        </Badge>
                      )}
                    </VStack>
                  </Grid>
                </Box>
              );
            })}
          </VStack>
        )}
      </VStack>
    </Container>
  );
}
