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
  Input,
  Spinner,
} from '@chakra-ui/react';
import { Truck, MapPin, KeyRound, CheckCircle2, Send, Navigation, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function CourierDispatchPage() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { user, login, fetchWithAuth } = useAuth();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickupOtps, setPickupOtps] = useState<Record<string, string>>({});
  const [deliveryOtps, setDeliveryOtps] = useState<Record<string, string>>({});
  const [bidAmounts, setBidAmounts] = useState<Record<string, number>>({});
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isDemoLoggingIn, setIsDemoLoggingIn] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/orders');
      if (res.ok) {
        const json = await res.json();
        setOrders(json.data || json || []);
      }
    } catch (err) {
      console.error('Failed to fetch courier orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const handleDemoCourierLogin = async () => {
    setIsDemoLoggingIn(true);
    try {
      await login('courier@msoms.ai', 'J3dPassword!2026');
      await fetchOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDemoLoggingIn(false);
    }
  };

  const handleDeliveryBid = async (orderId: string) => {
    const proposedAmountAed = bidAmounts[orderId] || 25;
    try {
      const res = await fetchWithAuth(`/orders/${orderId}/bid`, {
        method: 'POST',
        body: JSON.stringify({ proposedAmountAed, estimatedHours: 2 }),
      });
      if (res.ok) {
        setActionSuccess(orderId);
        fetchOrders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerifyPickup = async (orderId: string) => {
    const otpCode = pickupOtps[orderId];
    if (!otpCode) return;

    try {
      const res = await fetchWithAuth(`/orders/${orderId}/verify-pickup-otp`, {
        method: 'POST',
        body: JSON.stringify({ otpCode }),
      });

      if (res.ok) {
        fetchOrders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerifyDelivery = async (orderId: string) => {
    const otpCode = deliveryOtps[orderId];
    if (!otpCode) return;

    try {
      const res = await fetchWithAuth(`/orders/${orderId}/verify-delivery-otp`, {
        method: 'POST',
        body: JSON.stringify({ otpCode }),
      });

      if (res.ok) {
        fetchOrders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isCourierRole = user?.role === 'DELIVERY_PROVIDER' || user?.role === 'ADMIN';

  return (
    <Container maxW="6xl" py={8}>
      <VStack align="stretch" gap={6}>
        {/* Header */}
        <HStack justify="space-between" flexWrap="wrap" gap={3}>
          <VStack align="start" gap={1}>
            <HStack gap={2}>
              <Heading size="2xl" fontWeight="black">
                {isAr ? 'أسطول التوصيل السريع (UAE Courier Dispatch)' : 'UAE Courier Delivery Dispatch'}
              </Heading>
              <Badge colorPalette="cyan" size="sm">
                7 Emirates Fleet
              </Badge>
            </HStack>
            <Text fontSize="sm" color="fg.muted">
              {isAr
                ? 'استلم الطرود المطبوعة من المصنّعين، وتحقق من رموز الـ OTP لتأكيد التسليم وصرف الأتعاب فوراً'
                : 'Pick up packaged 3D prints, verify dual OTP handshakes, and collect escrow payouts instantly'}
            </Text>
          </VStack>

          {user && (
            <HStack gap={2} p={2.5} borderRadius="lg" bg="bg.panel" border="1px solid" borderColor="border.subtle">
              <Truck size={18} color="#06B6D4" />
              <VStack align="start" gap={0}>
                <Text fontSize="xs" fontWeight="bold" color="fg.default">
                  {user.fullName || user.email}
                </Text>
                <Text fontSize="10px" color="fg.muted">
                  {user.role} • {(user.walletBalanceAed ?? 500).toFixed(2)} AED
                </Text>
              </VStack>
            </HStack>
          )}
        </HStack>

        {/* Auth notice banner if not signed in as Courier */}
        {!isCourierRole && (
          <Box
            p={4}
            borderRadius="xl"
            bg="cyan.500/10"
            border="1px solid"
            borderColor="cyan.500/30"
          >
            <HStack justify="space-between" flexWrap="wrap" gap={3}>
              <HStack gap={2.5}>
                <AlertTriangle size={20} color="#06B6D4" />
                <VStack align="start" gap={0.5}>
                  <Text fontSize="sm" fontWeight="bold" color="cyan.400">
                    {isAr
                      ? 'أنت غير مسجّل حالياً كمندوب توصيل معتمد'
                      : 'You are currently not signed in as an authorized Courier'}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {isAr
                      ? 'للمشاركة في مناقصات التوصيل وتأكيد استلام وتسليم الطرود، سجّل الدخول بحساب المندوب التجريبي'
                      : 'To bid on delivery routes and verify physical pickup/delivery OTPs, log in as Courier'}
                  </Text>
                </VStack>
              </HStack>
              <Button
                size="sm"
                colorPalette="cyan"
                onClick={handleDemoCourierLogin}
                loading={isDemoLoggingIn}
              >
                {isAr ? 'دخول فوري بحساب المندوب التجريبي (courier@msoms.ai)' : '1-Click Demo Courier Login'}
              </Button>
            </HStack>
          </Box>
        )}

        {/* Content list or Loading / Empty state */}
        {loading ? (
          <Box py={16} textAlign="center">
            <Spinner size="xl" color="cyan.500" />
            <Text fontSize="sm" color="fg.muted" mt={3}>
              {isAr ? 'جاري تحميل مسارات التوصيل المتاحة...' : 'Connecting to UAE courier routing grid...'}
            </Text>
          </Box>
        ) : orders.length === 0 ? (
          <Box
            p={12}
            textAlign="center"
            borderRadius="2xl"
            bg="bg.panel"
            border="1px dashed"
            borderColor="border.subtle"
          >
            <VStack gap={4} maxW="md" mx="auto">
              <Box
                w="56px"
                h="56px"
                borderRadius="2xl"
                bg="cyan.500/10"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Truck size={28} color="#06B6D4" />
              </Box>
              <VStack gap={1}>
                <Heading size="md" fontWeight="bold">
                  {isAr ? 'لا توجد شحنات جاهزة للتوصيل حالياً' : 'No Active Delivery Dispatches'}
                </Heading>
                <Text fontSize="xs" color="fg.muted">
                  {isAr
                    ? 'عندما ينهي المصنّعون طباعة المجسمات ويرفعون صور إثبات الجودة، ستظهر مهام التوصيل مع مواقع الاستلام والتسليم هنا.'
                    : 'When 3D makers complete print batches and upload photo proof, delivery routes and pickup OTP inputs will appear here.'}
                </Text>
              </VStack>
              <HStack gap={3}>
                <Button size="sm" variant="outline" onClick={fetchOrders}>
                  {isAr ? 'تحديث المسارات' : 'Refresh Routes'}
                </Button>
                <Button asChild size="sm" colorPalette="cyan">
                  <Link href={`/${locale}`}>
                    {isAr ? 'إنشاء طلب جديد في الاستوديو' : 'Create Order in 3D Studio'}
                  </Link>
                </Button>
              </HStack>
            </VStack>
          </Box>
        ) : (
          <VStack gap={4} align="stretch">
            {orders.map((order) => {
              const isAssigned = order.status === 'DELIVERY_ASSIGNED';
              const isInTransit = order.status === 'IN_TRANSIT';

              return (
                <Box
                  key={order.id}
                  p={5}
                  borderRadius="xl"
                  bg="bg.panel"
                  border="1px solid"
                  borderColor="border.subtle"
                >
                  <Grid templateColumns={{ base: '1fr', lg: 'repeat(4, 1fr)' }} gap={4} alignContent="center">
                    {/* Order & Route Info */}
                    <VStack align="start" gap={1}>
                      <Badge colorPalette="cyan" size="xs">
                        #{order.orderNumber}
                      </Badge>
                      <Text fontSize="sm" fontWeight="bold">
                        {order.stlFile?.title || '3D Print Package'}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {order.quantity} pcs • Est: ~{order.stlFile?.estimatedWeightG || 14}g
                      </Text>
                      <Badge size="xs" colorPalette="orange">
                        {order.status}
                      </Badge>
                    </VStack>

                    {/* Pickup & Dropoff Route */}
                    <VStack align="start" gap={1}>
                      <HStack gap={1.5}>
                        <MapPin size={13} color="#F97316" />
                        <Text fontSize="xs" fontWeight="bold">
                          {isAr ? 'المصنّع:' : 'Maker:'} Dubai Silicon Oasis
                        </Text>
                      </HStack>
                      <HStack gap={1.5}>
                        <Navigation size={13} color="#14B8A6" />
                        <Text fontSize="xs" fontWeight="bold">
                          {isAr ? 'العميل:' : 'Dropoff:'} {order.dropoffEmirate}, {order.dropoffDistrict}
                        </Text>
                      </HStack>
                      <Text fontSize="11px" color="fg.muted">
                        {order.dropoffStreetAddress}
                      </Text>
                      <HStack gap={1} fontSize="11px" color="fg.muted" mt={1}>
                        <ShieldCheck size={12} color="#14B8A6" />
                        <Text>
                          {isAr ? 'أرضية التوصيل:' : 'Min Delivery Floor:'}{' '}
                          <strong>{order.courierMinFloorAed || 25} AED</strong>
                        </Text>
                      </HStack>
                    </VStack>

                    {/* Delivery Bid */}
                    <VStack align="stretch" gap={2}>
                      <Text fontSize="xs" fontWeight="bold">
                        {isAr ? 'تقديم عرض توصيل:' : 'Submit Delivery Bid:'}
                      </Text>
                      <Input
                        size="xs"
                        type="number"
                        placeholder={isAr ? 'السعر (AED)' : 'Price (AED)'}
                        value={bidAmounts[order.id] || ''}
                        onChange={(e) =>
                          setBidAmounts((prev) => ({
                            ...prev,
                            [order.id]: parseFloat(e.target.value) || 0,
                          }))
                        }
                        bg="bg.canvas"
                      />
                      <Button
                        size="xs"
                        colorPalette="cyan"
                        onClick={() => handleDeliveryBid(order.id)}
                        disabled={!isCourierRole}
                      >
                        <Send size={13} style={{ marginRight: '4px' }} />
                        {actionSuccess === order.id
                          ? isAr ? 'تم إرسال العرض' : 'Bid Placed'
                          : isAr ? 'إرسال عرض التوصيل' : 'Submit Delivery Bid'}
                      </Button>
                    </VStack>

                    {/* Dual OTP Handshake Verification */}
                    <VStack align="stretch" gap={2}>
                      <Text fontSize="xs" fontWeight="bold">
                        {isAr ? 'المصافحة برمز OTP الرقمي:' : 'Digital OTP Handshake:'}
                      </Text>

                      {/* Pickup OTP from Maker */}
                      <HStack gap={2}>
                        <Input
                          size="xs"
                          placeholder={isAr ? 'OTP استلام من المصنّع' : 'Pickup OTP'}
                          value={pickupOtps[order.id] || ''}
                          onChange={(e) =>
                            setPickupOtps((prev) => ({
                              ...prev,
                              [order.id]: e.target.value,
                            }))
                          }
                          bg="bg.canvas"
                          fontFamily="mono"
                        />
                        <Button
                          size="xs"
                          colorPalette="orange"
                          onClick={() => handleVerifyPickup(order.id)}
                          disabled={!isCourierRole}
                        >
                          <KeyRound size={13} style={{ marginRight: '4px' }} />
                          {isAr ? 'استلام' : 'Pickup'}
                        </Button>
                      </HStack>

                      {/* Delivery OTP from Customer */}
                      <HStack gap={2}>
                        <Input
                          size="xs"
                          placeholder={isAr ? 'OTP تسليم للعميل' : 'Delivery OTP'}
                          value={deliveryOtps[order.id] || ''}
                          onChange={(e) =>
                            setDeliveryOtps((prev) => ({
                              ...prev,
                              [order.id]: e.target.value,
                            }))
                          }
                          bg="bg.canvas"
                          fontFamily="mono"
                        />
                        <Button
                          size="xs"
                          colorPalette="teal"
                          onClick={() => handleVerifyDelivery(order.id)}
                          disabled={!isCourierRole}
                        >
                          <CheckCircle2 size={13} style={{ marginRight: '4px' }} />
                          {isAr ? 'تسليم' : 'Deliver'}
                        </Button>
                      </HStack>
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
