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
import { useAuth } from '@/context/AuthContext';
import {
  UserPlus,
  Mail,
  Lock,
  User,
  Phone,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Printer,
  Truck,
  ShoppingBag,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function RegisterPage() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const router = useRouter();
  const { setUserSession } = useAuth();

  // Registration step: 1 = Form, 2 = 6-digit OTP
  const [step, setStep] = useState<1 | 2>(1);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+971 50 ');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CLIENT' | 'PRINTER_PROVIDER' | 'DELIVERY_PROVIDER'>('CLIENT');
  const [otpCode, setOtpCode] = useState('');

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
          role,
          locale,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || (isAr ? 'فشل إنشاء الحساب، يرجى مراجعة البيانات' : 'Registration failed.'));
      }

      setSuccess(
        isAr
          ? 'تم إرسال رمز التحقق (OTP) المكوّن من 6 أرقام إلى بريدك الإلكتروني.'
          : 'A 6-digit verification code has been dispatched to your email via Resend.',
      );
      setStep(2);
    } catch (err: any) {
      setError(err.message || (isAr ? 'حدث خطأ أثناء التسجيل' : 'An error occurred during registration.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otpCode: otpCode.trim(),
          purpose: 'REGISTER_OTP',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || (isAr ? 'رمز التحقق غير صحيح أو منتهي الصلاحية' : 'Invalid or expired OTP code.'));
      }

      const userData = data.data?.user || data.user;
      const tokenData = data.data?.token || data.token;
      if (userData && tokenData) {
        setUserSession(userData, tokenData);
      }

      setSuccess(isAr ? 'تم تأكيد الحساب بنجاح! جاري الدخول...' : 'Account verified successfully! Redirecting...');

      setTimeout(() => {
        if (role === 'PRINTER_PROVIDER') router.push(`/${locale}/maker/radar`);
        else if (role === 'DELIVERY_PROVIDER') router.push(`/${locale}/courier/dispatch`);
        else router.push(`/${locale}/orders`);
      }, 700);
    } catch (err: any) {
      setError(err.message || (isAr ? 'فشل التحقق من الرمز' : 'OTP verification failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="md" py={{ base: 8, md: 14 }}>
      <VStack gap={6} align="stretch">
        {/* Header */}
        <VStack gap={2} textAlign="center">
          <Box
            w="48px"
            h="48px"
            borderRadius="xl"
            bg="linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxShadow="0 4px 16px rgba(20, 184, 166, 0.3)"
          >
            {step === 1 ? <UserPlus size={24} color="white" /> : <KeyRound size={24} color="white" />}
          </Box>
          <Heading size="xl" fontWeight="bold">
            {step === 1
              ? isAr
                ? 'إنشاء حساب جديد في J3D'
                : 'Create Your J3D Account'
              : isAr
                ? 'التحقق عبر رمز البريد (OTP)'
                : 'Verify 6-Digit Email OTP'}
          </Heading>
          <Text fontSize="sm" color="fg.muted">
            {step === 1
              ? isAr
                ? 'انضم إلى شبكة التصنيع والتوزيع الذكية في الإمارات'
                : 'Join the UAE intelligent 3D printing & delivery ecosystem'
              : isAr
                ? `أدخل الرمز المكون من 6 أرقام المرسل إلى ${email}`
                : `Enter the 6-digit code sent from noreply@msoms.ai to ${email}`}
          </Text>
        </VStack>

        {/* Card Body */}
        <Box
          p={6}
          borderRadius="2xl"
          bg="bg.panel"
          borderWidth="1px"
          borderColor="border.subtle"
          boxShadow="sm"
        >
          {error && (
            <Box p={3} borderRadius="lg" bg="red.500/10" borderWidth="1px" borderColor="red.500/30" mb={4}>
              <Text fontSize="xs" color="red.500" fontWeight="bold">
                {error}
              </Text>
            </Box>
          )}

          {success && (
            <Box p={3} borderRadius="lg" bg="teal.500/10" borderWidth="1px" borderColor="teal.500/30" mb={4}>
              <HStack gap={2}>
                <CheckCircle2 size={16} color="#14B8A6" />
                <Text fontSize="xs" color="laser.500" fontWeight="bold">
                  {success}
                </Text>
              </HStack>
            </Box>
          )}

          {step === 1 ? (
            /* STEP 1: Registration Form */
            <form onSubmit={handleRegister}>
              <VStack gap={4} align="stretch">
                {/* Role Selector */}
                <VStack align="start" gap={1.5}>
                  <Text fontSize="xs" fontWeight="bold" color="fg.default">
                    {isAr ? 'نوع الحساب في المنصة' : 'Select Account Role'}
                  </Text>
                  <HStack w="full" gap={2}>
                    <Box
                      flex={1}
                      p={3}
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor={role === 'CLIENT' ? 'laser.500' : 'border.subtle'}
                      bg={role === 'CLIENT' ? 'laser.500/10' : 'bg.canvas'}
                      cursor="pointer"
                      onClick={() => setRole('CLIENT')}
                      textAlign="center"
                    >
                      <VStack gap={1}>
                        <ShoppingBag size={18} color={role === 'CLIENT' ? '#14B8A6' : '#A1A1AA'} />
                        <Text fontSize="xs" fontWeight="bold" color={role === 'CLIENT' ? 'laser.500' : 'fg.muted'}>
                          {isAr ? 'عميل (Client)' : 'Client'}
                        </Text>
                      </VStack>
                    </Box>

                    <Box
                      flex={1}
                      p={3}
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor={role === 'PRINTER_PROVIDER' ? 'extruder.500' : 'border.subtle'}
                      bg={role === 'PRINTER_PROVIDER' ? 'extruder.500/10' : 'bg.canvas'}
                      cursor="pointer"
                      onClick={() => setRole('PRINTER_PROVIDER')}
                      textAlign="center"
                    >
                      <VStack gap={1}>
                        <Printer size={18} color={role === 'PRINTER_PROVIDER' ? '#F97316' : '#A1A1AA'} />
                        <Text fontSize="xs" fontWeight="bold" color={role === 'PRINTER_PROVIDER' ? 'extruder.500' : 'fg.muted'}>
                          {isAr ? 'مصنّع (Maker)' : 'Maker'}
                        </Text>
                      </VStack>
                    </Box>

                    <Box
                      flex={1}
                      p={3}
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor={role === 'DELIVERY_PROVIDER' ? 'blue.500' : 'border.subtle'}
                      bg={role === 'DELIVERY_PROVIDER' ? 'blue.500/10' : 'bg.canvas'}
                      cursor="pointer"
                      onClick={() => setRole('DELIVERY_PROVIDER')}
                      textAlign="center"
                    >
                      <VStack gap={1}>
                        <Truck size={18} color={role === 'DELIVERY_PROVIDER' ? '#3B82F6' : '#A1A1AA'} />
                        <Text fontSize="xs" fontWeight="bold" color={role === 'DELIVERY_PROVIDER' ? 'blue.500' : 'fg.muted'}>
                          {isAr ? 'مندوب (Courier)' : 'Courier'}
                        </Text>
                      </VStack>
                    </Box>
                  </HStack>
                </VStack>

                {/* Full Name */}
                <VStack align="start" gap={1.5}>
                  <Text fontSize="xs" fontWeight="bold" color="fg.default">
                    {isAr ? 'الاسم الكامل' : 'Full Name'}
                  </Text>
                  <HStack
                    w="full"
                    px={3}
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="border.subtle"
                    bg="bg.canvas"
                    _focusWithin={{ borderColor: 'laser.500' }}
                  >
                    <User size={16} color="#A1A1AA" />
                    <Input
                      placeholder={isAr ? 'محمد راشد' : 'Rashid Al Maktoum'}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      border="none"
                      _focus={{ outline: 'none', boxShadow: 'none' }}
                      fontSize="sm"
                    />
                  </HStack>
                </VStack>

                {/* Email */}
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
                    _focusWithin={{ borderColor: 'laser.500' }}
                  >
                    <Mail size={16} color="#A1A1AA" />
                    <Input
                      type="email"
                      placeholder="user@example.ae"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      border="none"
                      _focus={{ outline: 'none', boxShadow: 'none' }}
                      fontSize="sm"
                    />
                  </HStack>
                </VStack>

                {/* Phone */}
                <VStack align="start" gap={1.5}>
                  <Text fontSize="xs" fontWeight="bold" color="fg.default">
                    {isAr ? 'رقم الهاتف الإماراتي' : 'UAE Phone Number'}
                  </Text>
                  <HStack
                    w="full"
                    px={3}
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="border.subtle"
                    bg="bg.canvas"
                    _focusWithin={{ borderColor: 'laser.500' }}
                  >
                    <Phone size={16} color="#A1A1AA" />
                    <Input
                      type="tel"
                      placeholder="+971 50 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      border="none"
                      _focus={{ outline: 'none', boxShadow: 'none' }}
                      fontSize="sm"
                    />
                  </HStack>
                </VStack>

                {/* Password */}
                <VStack align="start" gap={1.5}>
                  <Text fontSize="xs" fontWeight="bold" color="fg.default">
                    {isAr ? 'كلمة المرور' : 'Password (Argon2id Encrypted)'}
                  </Text>
                  <HStack
                    w="full"
                    px={3}
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="border.subtle"
                    bg="bg.canvas"
                    _focusWithin={{ borderColor: 'laser.500' }}
                  >
                    <Lock size={16} color="#A1A1AA" />
                    <Input
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      border="none"
                      _focus={{ outline: 'none', boxShadow: 'none' }}
                      fontSize="sm"
                    />
                  </HStack>
                </VStack>

                <Button
                  type="submit"
                  colorPalette="teal"
                  size="lg"
                  w="full"
                  loading={loading}
                  mt={2}
                  bg="linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)"
                  color="white"
                  _hover={{ opacity: 0.95 }}
                >
                  <HStack gap={2}>
                    <Text fontWeight="bold">
                      {isAr ? 'متابعة وإرسال رمز التحقق' : 'Continue & Request OTP'}
                    </Text>
                    {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                  </HStack>
                </Button>

                <Separator borderColor="border.subtle" my={2} />

                <HStack justify="center" gap={1}>
                  <Text fontSize="xs" color="fg.muted">
                    {isAr ? 'لديك حساب بالفعل؟' : 'Already have an account?'}
                  </Text>
                  <Link href={`/${locale}/auth/login`} style={{ textDecoration: 'none' }}>
                    <Text fontSize="xs" fontWeight="bold" color="laser.500" _hover={{ textDecoration: 'underline' }}>
                      {isAr ? 'تسجيل الدخول' : 'Sign in'}
                    </Text>
                  </Link>
                </HStack>
              </VStack>
            </form>
          ) : (
            /* STEP 2: 6-Digit OTP Verification Form */
            <form onSubmit={handleVerifyOtp}>
              <VStack gap={5} align="stretch">
                <Box p={4} borderRadius="xl" bg="bg.canvas" borderWidth="1px" borderColor="border.subtle" textAlign="center">
                  <Text fontSize="xs" color="fg.muted">
                    {isAr
                      ? 'تم إرسال رمز الأمان إلى البريد الإلكتروني التالي عبر منصة Resend:'
                      : 'Security code dispatched via Resend to:'}
                  </Text>
                  <Text fontSize="sm" fontWeight="bold" color="laser.500" mt={1}>
                    {email}
                  </Text>
                </Box>

                <VStack align="center" gap={2}>
                  <Text fontSize="xs" fontWeight="bold" color="fg.default">
                    {isAr ? 'أدخل الرمز السداسي (6-Digit Code)' : 'Enter 6-Digit Code'}
                  </Text>
                  <Input
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    textAlign="center"
                    letterSpacing="0.4em"
                    fontSize="2xl"
                    fontWeight="bold"
                    fontFamily="mono"
                    w="240px"
                    py={3}
                    borderRadius="xl"
                    borderColor="laser.500"
                    autoFocus
                    required
                  />
                  <Text fontSize="11px" color="fg.muted">
                    {isAr ? 'صلاحية الرمز: 10 دقائق • بحد أقصى 5 محاولات' : 'Code valid for 10 minutes • Max 5 attempts'}
                  </Text>
                </VStack>

                <Button
                  type="submit"
                  colorPalette="teal"
                  size="lg"
                  w="full"
                  loading={loading}
                  bg="linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)"
                  color="white"
                  _hover={{ opacity: 0.95 }}
                >
                  <HStack gap={2}>
                    <ShieldCheck size={18} />
                    <Text fontWeight="bold">
                      {isAr ? 'تأكيد الحساب والدخول' : 'Confirm & Activate Account'}
                    </Text>
                  </HStack>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  color="fg.muted"
                >
                  {isAr ? 'الرجوع لتعديل البيانات' : 'Back to Edit Details'}
                </Button>
              </VStack>
            </form>
          )}
        </Box>
      </VStack>
    </Container>
  );
}
