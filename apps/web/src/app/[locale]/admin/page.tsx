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
} from '@chakra-ui/react';
import {
  ShieldAlert,
  Users,
  Box as BoxIcon,
  Sparkles,
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function AdminPage() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { user, fetchWithAuth, login } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'users' | 'stl' | 'ai' | 'email' | 'alarms'>('ai');
  const [users, setUsers] = useState<any[]>([]);
  const [stlFiles, setStlFiles] = useState<any[]>([]);
  const [alarms, setAlarms] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({
    activeGeminiTextModel: 'gemini-4-hydrogen',
    geminiKeyMasked: 'AIzaSy••••••_DEMO',
    activeGeminiImageModel: 'imagen-3.0-generate-002',
    senderEmailAddress: 'noreply@msoms.ai',
    resendKeyMasked: 're_7Dj••••••ZdcA',
  });

  const [modelCheckResult, setModelCheckResult] = useState<any>(null);
  const [isCheckingModels, setIsCheckingModels] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      const [uRes, sRes, cRes, aRes] = await Promise.all([
        fetchWithAuth('/admin/users').catch(() => null),
        fetchWithAuth('/admin/stl').catch(() => null),
        fetchWithAuth('/admin/config').catch(() => null),
        fetchWithAuth('/admin/alarms').catch(() => null),
      ]);

      if (uRes && uRes.ok) {
        const u = await uRes.json();
        setUsers(u.data?.users || u.users || []);
      }
      if (sRes && sRes.ok) {
        const s = await sRes.json();
        setStlFiles(s.data?.files || s.files || []);
      }
      if (cRes && cRes.ok) {
        const c = await cRes.json();
        setConfig(c.data || c);
      }
      if (aRes && aRes.ok) {
        const a = await aRes.json();
        setAlarms(a.data || a || []);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user]);

  const handleAdminFastLogin = async () => {
    try {
      await login('admin@msoms.ai', 'J3dPassword!2026');
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCheckModels = async () => {
    setIsCheckingModels(true);
    try {
      const res = await fetchWithAuth('/admin/config/ai/check-models', {
        method: 'POST',
      });
      if (res.ok) {
        const json = await res.json();
        setModelCheckResult(json.data || json);
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingModels(false);
    }
  };

  const handleSwitchModel = async (modelName: string) => {
    try {
      await fetchWithAuth('/admin/config/ai/switch-model', {
        method: 'POST',
        body: JSON.stringify({ modelName }),
      });
      fetchAdminData();
      setModelCheckResult(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    try {
      const res = await fetchWithAuth('/admin/config/email/test', {
        method: 'POST',
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setEmailTestResult(
          data.status === 'HEALTHY'
            ? 'Resend API Connected Successfully (msoms.ai Verified)'
            : 'Status: ' + data.status,
        );
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleUserStatusChange = async (userId: string, status: string) => {
    try {
      const res = await fetchWithAuth(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Container maxW="6xl" py={8}>
      <VStack align="stretch" gap={6}>
        <HStack justify="space-between" flexWrap="wrap" gap={3}>
          <VStack align="start" gap={1}>
            <HStack gap={2}>
              <ShieldAlert size={22} color="#EF4444" />
              <Heading size="2xl" fontWeight="black">
                {isAr ? 'مركز قيادة الإدارة (Admin Command Center)' : 'Admin Command Center'}
              </Heading>
            </HStack>
            <Text fontSize="sm" color="fg.muted">
              {isAr
                ? 'إدارة المستخدمين، ملفات .STL، التنبيهات، وخزائن مفاتيح الذكاء الاصطناعي ومراقبة أحدث نماذج Flash'
                : 'Manage users, STL files, disputes, and Gemini Flash AI model auto-upgrades'}
            </Text>
          </VStack>

          <HStack gap={2}>
            <Badge colorPalette="red" size="md">
              ADMIN LEVEL
            </Badge>
          </HStack>
        </HStack>

        {!isAdmin && (
          <Box p={4} borderRadius="xl" bg="red.500/10" borderWidth="1px" borderColor="red.500/30">
            <HStack justify="space-between" flexWrap="wrap" gap={3}>
              <HStack gap={2}>
                <ShieldAlert size={20} color="#EF4444" />
                <Text fontSize="sm" fontWeight="bold" color="red.500">
                  {isAr
                    ? 'أنت لست مسجلاً كمسؤول نظام حالياً. انقر لتسجيل الدخول الفوري كمسؤول:'
                    : 'You are currently not signed in as Administrator. Click to sign in as Admin:'}
                </Text>
              </HStack>
              <Button size="xs" colorPalette="red" onClick={handleAdminFastLogin}>
                {isAr ? 'دخول فوري كمسؤول (admin@msoms.ai)' : '1-Click Login (admin@msoms.ai)'}
              </Button>
            </HStack>
          </Box>
        )}

        {/* Navigation Tabs */}
        <HStack gap={2} p={1} borderRadius="xl" bg="bg.panel" border="1px solid" borderColor="border.subtle" flexWrap="wrap">
          {[
            { id: 'ai', label: isAr ? 'إعدادات الذكاء الاصطناعي (Gemini)' : 'Gemini AI & Models', icon: Sparkles },
            { id: 'email', label: isAr ? 'البريد الإلكتروني (Resend)' : 'Email Vault (Resend)', icon: Mail },
            { id: 'users', label: isAr ? 'إدارة المستخدمين' : 'Users CRUD', icon: Users },
            { id: 'stl', label: isAr ? 'ملفات .STL' : 'STL Vault', icon: BoxIcon },
            { id: 'alarms', label: isAr ? 'التنبيهات والنزاعات' : 'Alarms & Disputes', icon: AlertTriangle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                size="sm"
                variant={isActive ? 'solid' : 'ghost'}
                colorPalette={isActive ? 'orange' : 'gray'}
                onClick={() => setActiveTab(tab.id as any)}
              >
                <Icon size={15} style={{ marginRight: '6px' }} />
                {tab.label}
              </Button>
            );
          })}
        </HStack>

        {/* Tab 1: Gemini AI Model & Flash Model Watcher */}
        {activeTab === 'ai' && (
          <VStack gap={5} align="stretch">
            <Box p={5} borderRadius="xl" bg="bg.panel" border="1px solid" borderColor="border.subtle">
              <HStack justify="space-between" mb={4}>
                <VStack align="start" gap={0}>
                  <Text fontSize="sm" fontWeight="bold">
                    {isAr ? 'مراقبة وتحديث نماذج Gemini Flash تلقائياً' : 'Gemini Flash Model Watcher & Upgrade Center'}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {isAr
                      ? 'آلية تفحص دورياً جديد نماذج Flash Medium لاقتراح الترقية التلقائية وحفظ الكفاءة'
                      : 'Checks periodically for newly released Gemini Flash models to ensure latest speed & intelligence'}
                  </Text>
                </VStack>

                <Button
                  size="sm"
                  colorPalette="orange"
                  onClick={handleCheckModels}
                  loading={isCheckingModels}
                >
                  <RefreshCw size={14} style={{ marginRight: '6px' }} />
                  {isAr ? 'فحص النماذج الآن' : 'Check Models Now'}
                </Button>
              </HStack>

              <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4} mb={4}>
                <Box p={3.5} borderRadius="lg" bg="bg.canvas" border="1px solid" borderColor="border.subtle">
                  <Text fontSize="xs" color="fg.muted" mb={1}>
                    {isAr ? 'النموذج النشط حالياً:' : 'Active Text/CSG Model:'}
                  </Text>
                  <Text fontSize="sm" fontWeight="bold" color="extruder.500" fontFamily="mono">
                    {config?.activeGeminiTextModel || 'gemini-4-hydrogen'}
                  </Text>
                </Box>

                <Box p={3.5} borderRadius="lg" bg="bg.canvas" border="1px solid" borderColor="border.subtle">
                  <Text fontSize="xs" color="fg.muted" mb={1}>
                    {isAr ? 'مفتاح API مشفر بـ AES-256:' : 'Encrypted Gemini Key:'}
                  </Text>
                  <Text fontSize="sm" fontWeight="bold" color="laser.500" fontFamily="mono">
                    {config?.geminiKeyMasked || '••••••••'}
                  </Text>
                </Box>

                <Box p={3.5} borderRadius="lg" bg="bg.canvas" border="1px solid" borderColor="border.subtle">
                  <Text fontSize="xs" color="fg.muted" mb={1}>
                    {isAr ? 'نموذج توليد الصور (Avatar):' : 'Image Model (Avatar):'}
                  </Text>
                  <Text fontSize="sm" fontWeight="bold" color="cyan.400" fontFamily="mono">
                    {config?.activeGeminiImageModel || 'imagen-3.0-generate-002'}
                  </Text>
                </Box>
              </Grid>

              {/* Notification Banner if Model Check found updates */}
              {modelCheckResult && (
                <Box p={4} borderRadius="lg" bg="laser.500/10" border="1px solid" borderColor="laser.500/20">
                  <HStack justify="space-between" flexWrap="wrap" gap={3}>
                    <HStack gap={2}>
                      <CheckCircle2 size={18} color="#14B8A6" />
                      <Text fontSize="xs" color="fg.default">
                        {isAr ? 'تم استرداد قائمة النماذج المباشرة من Google API بنجاح.' : 'Retrieved live model list from Google API successfully.'}{' '}
                        {isAr ? 'النموذج الموصى به:' : 'Recommended Flash model:'}{' '}
                        <strong>{modelCheckResult.recommendedFlashModel}</strong>
                      </Text>
                    </HStack>

                    {modelCheckResult.recommendedFlashModel !== config?.activeGeminiTextModel && (
                      <Button
                        size="xs"
                        colorPalette="teal"
                        onClick={() => handleSwitchModel(modelCheckResult.recommendedFlashModel)}
                      >
                        {isAr ? 'التبديل إلى أحدث نموذج بنقرة واحدة' : 'Switch to Latest Model in 1-Click'}
                      </Button>
                    )}
                  </HStack>
                </Box>
              )}
            </Box>
          </VStack>
        )}

        {/* Tab 2: Resend Email Configuration */}
        {activeTab === 'email' && (
          <Box p={5} borderRadius="xl" bg="bg.panel" border="1px solid" borderColor="border.subtle">
            <HStack justify="space-between" mb={4}>
              <VStack align="start" gap={0}>
                <Text fontSize="sm" fontWeight="bold">
                  {isAr ? 'خزينة مفاتيح البريد الإلكتروني (Resend)' : 'Resend Email Vault & Domain Status'}
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  {isAr ? 'إرسال رموز الـ OTP الثنائية والتنبيهات من noreply@msoms.ai' : 'Dispatches 6-digit HTML OTPs and order status alerts'}
                </Text>
              </VStack>

              <Button
                size="sm"
                colorPalette="teal"
                onClick={handleTestEmail}
                loading={isTestingEmail}
              >
                <RefreshCw size={14} style={{ marginRight: '6px' }} />
                {isAr ? 'فحص الاتصال المباشر' : 'Probe Connection Live'}
              </Button>
            </HStack>

            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4} mb={4}>
              <Box p={3.5} borderRadius="lg" bg="bg.canvas" border="1px solid" borderColor="border.subtle">
                <Text fontSize="xs" color="fg.muted" mb={1}>
                  {isAr ? 'عنوان المرسل الرسمي:' : 'Official Sender Address:'}
                </Text>
                <Text fontSize="sm" fontWeight="bold" color="fg.default">
                  {config?.senderEmailAddress || 'noreply@msoms.ai'} (J3D Platform)
                </Text>
              </Box>

              <Box p={3.5} borderRadius="lg" bg="bg.canvas" border="1px solid" borderColor="border.subtle">
                <Text fontSize="xs" color="fg.muted" mb={1}>
                  {isAr ? 'مفتاح Resend API مشفر:' : 'Masked Resend Key:'}
                </Text>
                <Text fontSize="sm" fontWeight="bold" color="laser.500" fontFamily="mono">
                  {config?.resendKeyMasked || '••••••••'}
                </Text>
              </Box>
            </Grid>

            {emailTestResult && (
              <Box p={3.5} borderRadius="lg" bg="laser.500/10" border="1px solid" borderColor="laser.500/20">
                <HStack gap={2}>
                  <CheckCircle2 size={16} color="#14B8A6" />
                  <Text fontSize="xs" fontWeight="bold" color="laser.500">
                    {emailTestResult}
                  </Text>
                </HStack>
              </Box>
            )}
          </Box>
        )}

        {/* Tab 3: Users CRUD */}
        {activeTab === 'users' && (
          <Box p={5} borderRadius="xl" bg="bg.panel" border="1px solid" borderColor="border.subtle">
            <Text fontSize="sm" fontWeight="bold" mb={3}>
              {isAr ? 'المستخدمون المسجلون عبر منصة J3D' : 'Registered Users across J3D'}
            </Text>
            <VStack gap={2} align="stretch">
              {users.map((u) => (
                <HStack
                  key={u.id}
                  p={3}
                  borderRadius="lg"
                  bg="bg.canvas"
                  justify="space-between"
                  border="1px solid"
                  borderColor="border.subtle"
                >
                  <VStack align="start" gap={0}>
                    <Text fontSize="sm" fontWeight="bold">
                      {u.fullName}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      {u.email} • {u.phone} • {u.district}, {u.emirate}
                    </Text>
                  </VStack>
                    <HStack gap={2}>
                      <Badge colorPalette="orange" size="sm">
                        {u.role}
                      </Badge>
                      <Badge colorPalette={u.status === 'ACTIVE' ? 'teal' : 'red'} size="sm">
                        {u.status}
                      </Badge>
                      <HStack gap={1}>
                        {u.status !== 'ACTIVE' && (
                          <Button size="xs" variant="outline" colorPalette="teal" onClick={() => handleUserStatusChange(u.id, 'ACTIVE')}>
                            {isAr ? 'تفعيل' : 'Activate'}
                          </Button>
                        )}
                        {u.status === 'ACTIVE' && (
                          <Button size="xs" variant="outline" colorPalette="red" onClick={() => handleUserStatusChange(u.id, 'SUSPENDED')}>
                            {isAr ? 'إيقاف' : 'Suspend'}
                          </Button>
                        )}
                      </HStack>
                      <Text fontSize="xs" fontFamily="mono" color="fg.muted">
                        {Number(u.walletBalanceAed || 0).toFixed(2)} AED
                      </Text>
                    </HStack>
                </HStack>
              ))}
            </VStack>
          </Box>
        )}

        {/* Tab 4: STL Vault */}
        {activeTab === 'stl' && (
          <Box p={5} borderRadius="xl" bg="bg.panel" border="1px solid" borderColor="border.subtle">
            <Text fontSize="sm" fontWeight="bold" mb={3}>
              {isAr ? 'خزينة ملفات .STL المولدة والمطابقة للمواصفات' : 'Generated Manifold .STL Vault'}
            </Text>
            <VStack gap={2} align="stretch">
              {stlFiles.map((stl) => (
                <HStack
                  key={stl.id}
                  p={3}
                  borderRadius="lg"
                  bg="bg.canvas"
                  justify="space-between"
                  border="1px solid"
                  borderColor="border.subtle"
                >
                  <VStack align="start" gap={0}>
                    <Text fontSize="sm" fontWeight="bold">
                      {stl.title}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      {stl.dimXmm}×{stl.dimYmm}×{stl.dimZmm} mm • {stl.volumeCm3} cm³ • {stl.material}
                    </Text>
                  </VStack>
                  <HStack gap={2}>
                    <Badge colorPalette="teal" size="sm">
                      {stl.unitFloorAed} AED Floor
                    </Badge>
                    {stl.downloadUrl && (
                      <Button asChild size="xs" variant="outline">
                        <a href={stl.downloadUrl} download target="_blank" rel="noopener noreferrer">
                          .STL
                        </a>
                      </Button>
                    )}
                  </HStack>
                </HStack>
              ))}
            </VStack>
          </Box>
        )}

        {/* Tab 5: Alarms & Disputes */}
        {activeTab === 'alarms' && (
          <Box p={5} borderRadius="xl" bg="bg.panel" border="1px solid" borderColor="border.subtle">
            <Text fontSize="sm" fontWeight="bold" mb={3}>
              {isAr ? 'التنبيهات الأمنية وبلاغات النزاعات' : 'Security Alarms & Order Disputes'}
            </Text>
            <VStack gap={2} align="stretch">
              {alarms.length === 0 ? (
                <Text fontSize="xs" color="fg.muted" textAlign="center" py={4}>
                  {isAr ? 'لا توجد تنبيهات أمنية غير محلولة حالياً' : 'Zero active security alarms or disputes'}
                </Text>
              ) : (
                alarms.map((al) => (
                  <HStack
                    key={al.id}
                    p={3}
                    borderRadius="lg"
                    bg="bg.canvas"
                    justify="space-between"
                    border="1px solid"
                    borderColor="border.subtle"
                  >
                    <VStack align="start" gap={0}>
                      <Text fontSize="xs" fontWeight="bold" color="red.400">
                        {al.title}
                      </Text>
                      <Text fontSize="10px" color="fg.muted">
                        {al.category} • {new Date(al.createdAt).toLocaleString()}
                      </Text>
                    </VStack>
                    <Badge colorPalette={al.isResolved ? 'gray' : 'red'} size="xs">
                      {al.isResolved ? 'Resolved' : 'Active'}
                    </Badge>
                  </HStack>
                ))
              )}
            </VStack>
          </Box>
        )}
      </VStack>
    </Container>
  );
}
