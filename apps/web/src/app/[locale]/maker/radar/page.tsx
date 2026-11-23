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
import { Cpu, Download, Camera, KeyRound, Check, Send, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function MakerRadarPage() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { user, login, fetchWithAuth } = useAuth();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidAmounts, setBidAmounts] = useState<Record<string, number>>({});
  const [bidHours, setBidHours] = useState<Record<string, number>>({});
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
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
      console.error('Failed to fetch maker orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const handleDemoMakerLogin = async () => {
    setIsDemoLoggingIn(true);
    try {
      await login('maker@msoms.ai', 'J3dPassword!2026');
      await fetchOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDemoLoggingIn(false);
    }
  };

  const handleBid = async (orderId: string) => {
    const proposedAmountAed = bidAmounts[orderId] || 75;
    const estimatedHours = bidHours[orderId] || 4;

    try {
      const res = await fetchWithAuth(`/orders/${orderId}/bid`, {
        method: 'POST',
        body: JSON.stringify({ proposedAmountAed, estimatedHours }),
      });

      if (res.ok) {
        setActionSuccess(orderId);
        fetchOrders();
      }
    } catch (e) {
      console.error('Bid submission error', e);
    }
  };

  const handleUploadPhoto = async (orderId: string) => {
    const photoUrl = photoUrls[orderId] || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800';

    try {
      const res = await fetchWithAuth(`/orders/${orderId}/photo-proof`, {
        method: 'POST',
        body: JSON.stringify({ photoUrl }),
      });

      if (res.ok) {
        fetchOrders();
      }
    } catch (e) {
      console.error('Photo proof error', e);
    }
  };

  const isMakerRole = user?.role === 'PRINTER_PROVIDER' || user?.role === 'ADMIN';

  return (
    <Container maxW="6xl" py={8}>
      <VStack align="stretch" gap={6}>
        {/* Header */}
        <HStack justify="space-between" flexWrap="wrap" gap={3}>
          <VStack align="start" gap={1}>
            <HStack gap={2}>
              <Heading size="2xl" fontWeight="black">
                {isAr ? 'رادار أصحاب الطابعات ثلاثية الأبعاد (UAE Maker Radar)' : 'UAE Maker 3D Print Radar'}
              </Heading>
              <Badge colorPalette="orange" size="sm">
                Bambu Lab & Prusa
              </Badge>
            </HStack>
            <Text fontSize="sm" color="fg.muted">
              {isAr
                ? 'استقبل طلبات الطباعة، حمّل ملفات .STL إلى السلايسر، وقدّم عروض أسعارك التنافسية'
                : 'Accept print jobs, download watertight .STL files to your slicer, and submit competitive bids'}
            </Text>
          </VStack>

          {user && (
            <HStack gap={2} p={2.5} borderRadius="lg" bg="bg.panel" border="1px solid" borderColor="border.subtle">
              <Cpu size={18} color="#F97316" />
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

        {/* Auth notice banner if not signed in as Maker */}
        {!isMakerRole && (
          <Box
            p={4}
            borderRadius="xl"
            bg="orange.500/10"
            border="1px solid"
            borderColor="orange.500/30"
          >
            <HStack justify="space-between" flexWrap="wrap" gap={3}>
              <HStack gap={2.5}>
                <AlertTriangle size={20} color="#F97316" />
                <VStack align="start" gap={0.5}>
                  <Text fontSize="sm" fontWeight="bold" color="orange.400">
                    {isAr
                      ? 'أنت غير مسجّل حالياً كصاحب طابعة ثلاثية الأبعاد'
                      : 'You are currently not signed in as a 3D Maker'}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {isAr
                      ? 'للمشاركة في مناقصات الطباعة وتحميل ملفات الـ STL، سجّل الدخول بحساب المصنّع التجريبي'
                      : 'To participate in reverse-bidding and download production STL files, log in as Maker'}
                  </Text>
                </VStack>
              </HStack>
              <Button
                size="sm"
                colorPalette="orange"
                onClick={handleDemoMakerLogin}
                loading={isDemoLoggingIn}
              >
                {isAr ? 'دخول فوري بحساب المصنّع التجريبي (maker@msoms.ai)' : '1-Click Demo Maker Login'}
              </Button>
            </HStack>
          </Box>
        )}

        {/* Content list or Loading / Empty state */}
        {loading ? (
          <Box py={16} textAlign="center">
            <Spinner size="xl" color="extruder.500" />
            <Text fontSize="sm" color="fg.muted" mt={3}>
              {isAr ? 'جاري تحميل مناقصات الطابعات المتاحة...' : 'Scanning UAE print network for active jobs...'}
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
                bg="orange.500/10"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Cpu size={28} color="#F97316" />
              </Box>
              <VStack gap={1}>
                <Heading size="md" fontWeight="bold">
                  {isAr ? 'لا توجد طلبات طباعة مفتوحة حالياً' : 'No Open Print Jobs Right Now'}
                </Heading>
                <Text fontSize="xs" color="fg.muted">
                  {isAr
                    ? 'بمجرد أن يقوم العملاء بتصميم وتأكيد مجسم ثلاثي الأبعاد في الاستوديو، ستظهر تفاصيل الطلب وحسابات السعر والـ STL هنا فوراً.'
                    : 'When clients design and confirm a 3D object in the Studio wizard, order specifications and slicer-ready STLs will appear here.'}
                </Text>
              </VStack>
              <HStack gap={3}>
                <Button size="sm" variant="outline" onClick={fetchOrders}>
                  {isAr ? 'تحديث الرادار' : 'Refresh Radar'}
                </Button>
                <Button asChild size="sm" colorPalette="orange">
                  <Link href={`/${locale}`}>
                    {isAr ? 'إنشاء طلب تجريبي في الاستوديو' : 'Create Order in 3D Studio'}
                  </Link>
                </Button>
              </HStack>
            </VStack>
          </Box>
        ) : (
          <VStack gap={4} align="stretch">
            {orders.map((order) => {
              const isPrinting = order.status === 'PRINTING';
              const isReady = order.status === 'READY_FOR_PICKUP';

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
                    {/* Order Details & Slicer Download */}
                    <VStack align="start" gap={1}>
                      <HStack gap={2}>
                        <Badge colorPalette="teal" size="xs">
                          #{order.orderNumber}
                        </Badge>
                        <Badge colorPalette="orange" size="xs">
                          {order.status}
                        </Badge>
                      </HStack>
                      <Text fontSize="sm" fontWeight="bold">
                        {order.stlFile?.title || 'Custom Print Object'}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {order.quantity} pcs • {order.stlFile?.material || 'PLA'} • ~{order.stlFile?.estimatedWeightG || 14}g
                      </Text>
                      {order.stlFile?.downloadUrl ? (
                        <Button
                          asChild
                          size="xs"
                          variant="outline"
                          colorPalette="orange"
                          mt={1}
                        >
                          <a href={order.stlFile.downloadUrl} download>
                            <Download size={13} style={{ marginRight: '4px' }} />
                            {isAr ? 'تحميل .STL للسلايسر' : 'Download .STL'}
                          </a>
                        </Button>
                      ) : (
                        <Badge size="xs" colorPalette="gray" mt={1}>
                          STL in Cloud Storage
                        </Badge>
                      )}
                    </VStack>

                    {/* Floor & Escrow Telemetry */}
                    <VStack align="start" gap={1}>
                      <Text fontSize="xs" color="fg.muted">
                        {isAr ? 'ميزانية العميل / الضمان المحجوز:' : 'Client Escrow Locked:'}
                      </Text>
                      <Text fontSize="lg" fontWeight="black" color="laser.500" fontFamily="mono">
                        {order.totalEscrowAmountAed} AED
                      </Text>
                      <HStack gap={1} fontSize="11px" color="fg.muted">
                        <ShieldCheck size={12} color="#14B8A6" />
                        <Text>
                          {isAr ? 'الحد الأدنى الخوارزمي:' : 'Algorithmic Floor:'}{' '}
                          <strong>{order.makerMinFloorAed || 20} AED</strong>
                        </Text>
                      </HStack>
                    </VStack>

                    {/* Reverse Bidding Action */}
                    <VStack align="stretch" gap={2}>
                      <Text fontSize="xs" fontWeight="bold">
                        {isAr ? 'تقديم عرض سعر (Reverse-Bid):' : 'Submit Competitive Bid:'}
                      </Text>
                      <HStack gap={2}>
                        <Input
                          size="xs"
                          type="number"
                          placeholder={isAr ? 'السعر (AED)' : 'Bid (AED)'}
                          value={bidAmounts[order.id] || ''}
                          onChange={(e) =>
                            setBidAmounts((prev) => ({
                              ...prev,
                              [order.id]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          bg="bg.canvas"
                        />
                        <Input
                          size="xs"
                          type="number"
                          placeholder={isAr ? 'ساعات' : 'Hrs'}
                          value={bidHours[order.id] || ''}
                          onChange={(e) =>
                            setBidHours((prev) => ({
                              ...prev,
                              [order.id]: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          w="70px"
                          bg="bg.canvas"
                        />
                      </HStack>
                      <Button
                        size="xs"
                        colorPalette="teal"
                        onClick={() => handleBid(order.id)}
                        disabled={!isMakerRole}
                      >
                        <Send size={13} style={{ marginRight: '4px' }} />
                        {actionSuccess === order.id
                          ? isAr ? 'تم إرسال العرض' : 'Bid Placed'
                          : isAr ? 'إرسال العرض' : 'Place Bid'}
                      </Button>
                    </VStack>

                    {/* Quality Photo Proof & OTP */}
                    <VStack align="stretch" gap={2}>
                      <Text fontSize="xs" fontWeight="bold">
                        {isAr ? 'توثيق الجودة وصورة الطباعة:' : 'Photo Proof of Finish:'}
                      </Text>
                      <Input
                        size="xs"
                        placeholder="https://..."
                        value={photoUrls[order.id] || ''}
                        onChange={(e) =>
                          setPhotoUrls((prev) => ({
                            ...prev,
                            [order.id]: e.target.value,
                          }))
                        }
                        bg="bg.canvas"
                      />
                      <Button
                        size="xs"
                        variant="surface"
                        colorPalette="orange"
                        onClick={() => handleUploadPhoto(order.id)}
                        disabled={!isMakerRole}
                      >
                        <Camera size={13} style={{ marginRight: '4px' }} />
                        {isAr ? 'رفع إثبات الجودة' : 'Upload Finish Photo'}
                      </Button>

                      {isReady && order.pickupOtpPlainForPrinter && (
                        <Box
                          p={2}
                          borderRadius="md"
                          bg="teal.500/10"
                          border="1px dashed"
                          borderColor="teal.500"
                          textAlign="center"
                          mt={1}
                        >
                          <HStack gap={1} justify="center">
                            <KeyRound size={12} color="#14B8A6" />
                            <Text fontSize="10px" fontWeight="bold" color="teal.500">
                              {isAr ? 'رمز تسليم المندوب (Pickup OTP):' : 'Courier Pickup OTP:'}
                            </Text>
                          </HStack>
                          <Text fontSize="lg" fontWeight="black" color="laser.500" fontFamily="mono">
                            {order.pickupOtpPlainForPrinter}
                          </Text>
                        </Box>
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
