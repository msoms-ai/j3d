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
  Input,
  Grid,
  Spinner,
} from '@chakra-ui/react';
import { User, MapPin, Sparkles, Cpu, Truck, Wallet, Shield, AlertTriangle } from 'lucide-react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { OsmLocationPicker } from '@/components/location/OsmLocationPicker';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { user, login, fetchWithAuth } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [aiPrompt, setAiPrompt] = useState('Cyberpunk 3D printing maker in Dubai');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setWalletBalance(user.walletBalanceAed ?? 500);
      setAvatarUrl(
        user.avatarUrl ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email || 'J3D')}&backgroundColor=090d16,14b8a6,f97316`,
      );
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth('/profile');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (data.fullName) setFullName(data.fullName);
        if (data.phone) setPhone(data.phone);
        if (typeof data.walletBalanceAed === 'number') setWalletBalance(data.walletBalanceAed);
        if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
      }
    } catch (e) {
      console.error('Failed to load profile', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const handleGenerateAvatar = async () => {
    setIsGenerating(true);
    try {
      const seed = encodeURIComponent(aiPrompt || 'J3D');
      const newUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=090d16,14b8a6,f97316`;
      setAvatarUrl(newUrl);

      // Save via API if logged in
      if (user) {
        await fetchWithAuth('/profile', {
          method: 'PATCH',
          body: JSON.stringify({ avatarUrl: newUrl }),
        });
      }
    } catch (e) {
      console.error('Failed to generate avatar', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetchWithAuth('/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName, phone }),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      }
    } catch (e) {
      console.error('Failed to save profile', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxW="5xl" py={8}>
      <VStack align="stretch" gap={6}>
        <HStack justify="space-between" flexWrap="wrap" gap={3}>
          <VStack align="start" gap={1}>
            <Heading size="2xl" fontWeight="black">
              {isAr ? 'الملف الشخصي والموقع والأسطول' : 'User Profile, Location & Fleet'}
            </Heading>
            <Text fontSize="sm" color="fg.muted">
              {isAr
                ? 'إعدادات الحساب، الموقع الجغرافي التفاعلي (OSM)، مواصفات الطابعات، ومولد الصور بالذكاء الاصطناعي'
                : 'Account settings, interactive OSM location pin, printer fleet specs, and AI avatar synthesis'}
            </Text>
          </VStack>

          {user && (
            <HStack gap={3} p={3} borderRadius="xl" bg="bg.panel" border="1px solid" borderColor="border.subtle">
              <Wallet size={18} color="#14B8A6" />
              <VStack align="start" gap={0}>
                <Text fontSize="10px" color="fg.muted">
                  {isAr ? 'رصيد المحفظة / الضمان:' : 'Escrow Wallet Balance:'}
                </Text>
                <Text fontSize="sm" fontWeight="black" color="laser.500" fontFamily="mono">
                  {walletBalance.toFixed(2)} AED
                </Text>
              </VStack>
            </HStack>
          )}
        </HStack>

        {/* Not Logged In Banner */}
        {!user && (
          <Box p={4} borderRadius="xl" bg="orange.500/10" border="1px solid" borderColor="orange.500/30">
            <HStack justify="space-between" flexWrap="wrap" gap={3}>
              <HStack gap={2.5}>
                <AlertTriangle size={20} color="#F97316" />
                <VStack align="start" gap={0.5}>
                  <Text fontSize="sm" fontWeight="bold" color="orange.400">
                    {isAr ? 'قم بتسجيل الدخول لعرض بيانات حسابك الحقيقية' : 'Sign in to view your actual account data'}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {isAr
                      ? 'يمكنك الدخول كعميل أو مدير أو صاحب طابعة لحفظ إعداداتك وموقعك'
                      : 'You can sign in as Client, Admin, Maker or Courier to save your settings'}
                  </Text>
                </VStack>
              </HStack>
              <Button asChild size="sm" colorPalette="orange">
                <Link href={`/${locale}/auth/login`}>
                  {isAr ? 'صفحة تسجيل الدخول' : 'Go to Login'}
                </Link>
              </Button>
            </HStack>
          </Box>
        )}

        <Grid templateColumns={{ base: '1fr', lg: '5fr 7fr' }} gap={6} alignContent="start">
          {/* Left Column: Personal Info & AI Avatar Generator */}
          <VStack gap={5} align="stretch">
            {/* AI Avatar Box */}
            <Box p={5} borderRadius="xl" bg="bg.panel" border="1px solid" borderColor="border.subtle" textAlign="center">
              <Box
                w="96px"
                h="96px"
                borderRadius="full"
                overflow="hidden"
                mx="auto"
                mb={3}
                border="3px solid"
                borderColor="extruder.500"
                bg="bg.canvas"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Box display="flex" alignItems="center" justifyContent="center" h="full">
                    <User size={36} color="#94A3B8" />
                  </Box>
                )}
              </Box>

              <Text fontSize="xs" fontWeight="bold" color="fg.default" mb={2}>
                {isAr ? 'توليد صورة رمزية بالذكاء الاصطناعي (Gemini)' : 'AI Avatar Generator (Gemini)'}
              </Text>

              <VStack gap={2}>
                <Input
                  size="xs"
                  placeholder={isAr ? 'اكتب وصف الصورة...' : 'Describe avatar style...'}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  bg="bg.canvas"
                />
                <Button
                  size="xs"
                  colorPalette="orange"
                  w="full"
                  onClick={handleGenerateAvatar}
                  loading={isGenerating}
                >
                  <Sparkles size={13} style={{ marginRight: '4px' }} />
                  {isAr ? 'توليد الأفاتار بالذكاء الاصطناعي' : 'Synthesize AI Avatar'}
                </Button>
              </VStack>
            </Box>

            {/* Profile Form */}
            <Box p={5} borderRadius="xl" bg="bg.panel" border="1px solid" borderColor="border.subtle">
              <Text fontSize="sm" fontWeight="bold" mb={3}>
                {isAr ? 'المعلومات الأساسية' : 'General Information'}
              </Text>
              <VStack gap={3} align="stretch">
                <Box>
                  <Text fontSize="xs" color="fg.muted" mb={1}>
                    {isAr ? 'البريد الإلكتروني:' : 'Email Address:'}
                  </Text>
                  <Input
                    size="sm"
                    value={user?.email || 'guest@msoms.ai'}
                    disabled
                    bg="bg.canvas"
                  />
                </Box>
                <Box>
                  <Text fontSize="xs" color="fg.muted" mb={1}>
                    {isAr ? 'الاسم الكامل:' : 'Full Name:'}
                  </Text>
                  <Input
                    size="sm"
                    placeholder={isAr ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    bg="bg.canvas"
                  />
                </Box>
                <Box>
                  <Text fontSize="xs" color="fg.muted" mb={1}>
                    {isAr ? 'رقم الهاتف (الإمارات):' : 'Phone (UAE):'}
                  </Text>
                  <Input
                    size="sm"
                    placeholder="+971 50 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    bg="bg.canvas"
                  />
                </Box>
                <Button
                  size="sm"
                  colorPalette="teal"
                  onClick={handleSaveProfile}
                  loading={saving}
                  disabled={!user}
                >
                  {isAr ? 'حفظ التعديلات' : 'Save Changes'}
                </Button>
                {savedSuccess && (
                  <Text fontSize="xs" color="laser.500" textAlign="center">
                    {isAr ? 'تم حفظ التعديلات بنجاح' : 'Changes saved successfully'}
                  </Text>
                )}
              </VStack>
            </Box>
          </VStack>

          {/* Right Column: OpenStreetMap Geopicker & Maker Fleet */}
          <VStack gap={5} align="stretch">
            {/* Interactive Location Picker */}
            <OsmLocationPicker
              onLocationSelect={async (loc: any) => {
                if (user && loc) {
                  try {
                    await fetchWithAuth('/profile', {
                      method: 'PATCH',
                      body: JSON.stringify({
                        lat: loc.lat,
                        lng: loc.lng,
                        emirate: loc.emirate,
                        district: loc.district,
                        streetAddress: loc.streetAddress,
                      }),
                    });
                  } catch (e) {
                    console.error('Failed to update profile location', e);
                  }
                }
              }}
            />

            {/* 3D Printer Fleet Specifications (for PRINTER_PROVIDER or ADMIN) */}
            <Box p={5} borderRadius="xl" bg="bg.panel" border="1px solid" borderColor="border.subtle">
              <HStack justify="space-between" mb={3}>
                <HStack gap={2}>
                  <Cpu size={18} color="#F97316" />
                  <Text fontSize="sm" fontWeight="bold">
                    {isAr ? 'مواصفات أسطول الطابعات (3D Printer Fleet)' : '3D Printer Fleet Specifications'}
                  </Text>
                </HStack>
                <Badge colorPalette="orange" size="sm">
                  Bambu Lab X1C (AMS)
                </Badge>
              </HStack>

              <VStack align="stretch" gap={2} fontSize="xs" color="fg.muted">
                <HStack justify="space-between" p={2} bg="bg.canvas" borderRadius="md">
                  <Text>{isAr ? 'أبعاد قاعدة الطباعة:' : 'Build Volume:'}</Text>
                  <Text fontWeight="bold" color="fg.default">256 × 256 × 256 mm</Text>
                </HStack>
                <HStack justify="space-between" p={2} bg="bg.canvas" borderRadius="md">
                  <Text>{isAr ? 'دعم الألوان المتعددة (AMS):' : 'Multicolor AMS Zones:'}</Text>
                  <Badge colorPalette="teal" size="xs">4 Colors AMS</Badge>
                </HStack>
                <HStack justify="space-between" p={2} bg="bg.canvas" borderRadius="md">
                  <Text>{isAr ? 'الخامات المدعومة:' : 'Supported Filaments:'}</Text>
                  <Text fontWeight="bold" color="fg.default">PLA, PETG, ABS, TPU</Text>
                </HStack>
              </VStack>
            </Box>
          </VStack>
        </Grid>
      </VStack>
    </Container>
  );
}
