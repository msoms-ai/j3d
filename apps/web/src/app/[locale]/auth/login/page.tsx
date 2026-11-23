'use client';

import { useState } from 'react';
import {
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Box,
  Input,
  Button,
  Separator,
  Badge,
} from '@chakra-ui/react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ArrowLeft, LogIn, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userData = await login(email, password);
      setSuccess(
        isAr
          ? `مرحباً بك مجدداً ${userData.fullName || userData.email}! جاري التحويل...`
          : `Welcome back ${userData.fullName || userData.email}! Redirecting...`,
      );

      setTimeout(() => {
        if (userData.role === 'ADMIN') router.push(`/${locale}/admin`);
        else if (userData.role === 'PRINTER_PROVIDER') router.push(`/${locale}/maker/radar`);
        else if (userData.role === 'DELIVERY_PROVIDER') router.push(`/${locale}/courier/dispatch`);
        else router.push(`/${locale}/orders`);
      }, 700);
    } catch (err: any) {
      setError(err.message || (isAr ? 'فشل تسجيل الدخول، تأكد من بياناتك' : 'Login failed. Please check credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoRole: string) => {
    setEmail(demoEmail);
    setPassword('J3dPassword!2026');
  };

  return (
    <Container maxW="md" py={{ base: 8, md: 16 }}>
      <VStack gap={6} align="stretch">
        {/* Header Branding */}
        <VStack gap={2} textAlign="center">
          <Box
            w="48px"
            h="48px"
            borderRadius="xl"
            bg="linear-gradient(135deg, #F97316 0%, #14B8A6 100%)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxShadow="0 4px 16px rgba(249, 115, 22, 0.3)"
          >
            <LogIn size={24} color="white" />
          </Box>
          <Heading size="xl" fontWeight="bold">
            {isAr ? 'تسجيل الدخول إلى J3D' : 'Sign In to J3D'}
          </Heading>
          <Text fontSize="sm" color="fg.muted">
            {isAr
              ? 'المنصة الذكية للطباعة ثلاثية الأبعاد والتوصيل في الإمارات'
              : 'AI-Powered On-Demand 3D Printing & UAE Delivery Marketplace'}
          </Text>
        </VStack>

        {/* Login Box */}
        <Box
          p={6}
          borderRadius="2xl"
          bg="bg.panel"
          borderWidth="1px"
          borderColor="border.subtle"
          boxShadow="sm"
        >
          <form onSubmit={handleLogin}>
            <VStack gap={4} align="stretch">
              {error && (
                <Box p={3} borderRadius="lg" bg="red.500/10" borderWidth="1px" borderColor="red.500/30">
                  <Text fontSize="xs" color="red.500" fontWeight="bold">
                    {error}
                  </Text>
                </Box>
              )}

              {success && (
                <Box p={3} borderRadius="lg" bg="teal.500/10" borderWidth="1px" borderColor="teal.500/30">
                  <HStack gap={2}>
                    <CheckCircle2 size={16} color="#14B8A6" />
                    <Text fontSize="xs" color="laser.500" fontWeight="bold">
                      {success}
                    </Text>
                  </HStack>
                </Box>
              )}

              <VStack align="start" gap={1.5}>
                <Text fontSize="xs" fontWeight="bold" color="fg.default">
                  {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                </Text>
                <HStack
                  w="full"
                  px={3}
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="border.subtle"
                  bg="bg.canvas"
                  _focusWithin={{ borderColor: 'extruder.500' }}
                >
                  <Mail size={16} color="#A1A1AA" />
                  <Input
                    type="email"
                    placeholder="name@msoms.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    border="none"
                    _focus={{ outline: 'none', boxShadow: 'none' }}
                    fontSize="sm"
                  />
                </HStack>
              </VStack>

              <VStack align="start" gap={1.5}>
                <HStack justify="space-between" w="full">
                  <Text fontSize="xs" fontWeight="bold" color="fg.default">
                    {isAr ? 'كلمة المرور' : 'Password'}
                  </Text>
                  <Text fontSize="xs" color="extruder.500" cursor="pointer">
                    {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                  </Text>
                </HStack>
                <HStack
                  w="full"
                  px={3}
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="border.subtle"
                  bg="bg.canvas"
                  _focusWithin={{ borderColor: 'extruder.500' }}
                >
                  <Lock size={16} color="#A1A1AA" />
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    border="none"
                    _focus={{ outline: 'none', boxShadow: 'none' }}
                    fontSize="sm"
                  />
                </HStack>
              </VStack>

              <Button
                type="submit"
                colorPalette="orange"
                size="lg"
                w="full"
                loading={loading}
                mt={2}
                bg="linear-gradient(135deg, #F97316 0%, #EA580C 100%)"
                color="white"
                _hover={{ opacity: 0.95 }}
              >
                <HStack gap={2}>
                  <Text fontWeight="bold">{isAr ? 'تسجيل الدخول' : 'Sign In'}</Text>
                  {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                </HStack>
              </Button>

              <Separator borderColor="border.subtle" my={2} />

              <HStack justify="center" gap={1}>
                <Text fontSize="xs" color="fg.muted">
                  {isAr ? 'ليس لديك حساب بعد؟' : "Don't have an account?"}
                </Text>
                <Link href={`/${locale}/auth/register`} style={{ textDecoration: 'none' }}>
                  <Text fontSize="xs" fontWeight="bold" color="extruder.500" _hover={{ textDecoration: 'underline' }}>
                    {isAr ? 'إنشاء حساب جديد' : 'Register now'}
                  </Text>
                </Link>
              </HStack>
            </VStack>
          </form>
        </Box>

        {/* Demo Fast-Login Section */}
        <Box p={4} borderRadius="xl" bg="bg.canvas" borderWidth="1px" borderColor="border.subtle">
          <VStack align="stretch" gap={2}>
            <HStack justify="space-between">
              <HStack gap={1.5}>
                <Sparkles size={14} color="#F97316" />
                <Text fontSize="xs" fontWeight="bold" color="fg.muted">
                  {isAr ? 'حسابات التجربة السريعة (Demo Accounts)' : 'One-Click Demo Test Accounts'}
                </Text>
              </HStack>
              <Badge size="xs" colorPalette="teal" variant="subtle">
                UAE 2026
              </Badge>
            </HStack>
            <HStack gap={2} flexWrap="wrap">
              <Button
                size="xs"
                variant="outline"
                onClick={() => handleFillDemo('client@msoms.ai', 'CLIENT')}
              >
                Client
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => handleFillDemo('maker@msoms.ai', 'PRINTER_PROVIDER')}
              >
                Maker
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => handleFillDemo('courier@msoms.ai', 'DELIVERY_PROVIDER')}
              >
                Courier
              </Button>
              <Button
                size="xs"
                variant="outline"
                colorPalette="red"
                onClick={() => handleFillDemo('admin@msoms.ai', 'ADMIN')}
              >
                Admin
              </Button>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}
