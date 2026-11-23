'use client';

import {
  DrawerRoot,
  DrawerTrigger,
  DrawerBackdrop,
  DrawerPositioner,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerCloseTrigger,
  IconButton,
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  Button,
} from '@chakra-ui/react';
import {
  Menu,
  Box as BoxIcon,
  ShoppingBag,
  Cpu,
  Truck,
  User,
  ShieldAlert,
  LogOut,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';

export function NavigationDrawer() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { user, logout } = useAuth();

  const navLinks = [
    {
      href: `/${locale}`,
      label: isAr ? 'استوديو الذكاء الاصطناعي 3D' : '3D Studio Wizard',
      icon: BoxIcon,
      color: '#F97316',
      badge: isAr ? 'توليد 3D' : 'AI Gen',
    },
    {
      href: `/${locale}/orders`,
      label: isAr ? 'طلباتي ومتابعة الإنتاج' : 'My Orders & Escrow',
      icon: ShoppingBag,
      color: '#14B8A6',
    },
    {
      href: `/${locale}/maker/radar`,
      label: isAr ? 'رادار المصنّعين (أصحاب الطابعات)' : 'Maker Print Radar',
      icon: Cpu,
      color: '#FB923C',
      badge: isAr ? 'مناقصات' : 'Bidding',
    },
    {
      href: `/${locale}/courier/dispatch`,
      label: isAr ? 'أسطول التوصيل السريع (المناديب)' : 'Delivery Dispatch Fleet',
      icon: Truck,
      color: '#38BDF8',
      badge: isAr ? 'توصيل' : 'Courier',
    },
    {
      href: `/${locale}/profile`,
      label: isAr ? 'الملف الشخصي والموقع والأسطول' : 'Profile, Location & Fleet',
      icon: User,
      color: '#A855F7',
    },
    {
      href: `/${locale}/admin`,
      label: isAr ? 'لوحة تحكم الإدارة (Admin)' : 'Admin Command Center',
      icon: ShieldAlert,
      color: '#EF4444',
      badge: 'Admin',
    },
  ];

  return (
    <DrawerRoot placement={isAr ? 'end' : 'start'}>
      <DrawerTrigger asChild>
        <IconButton
          aria-label={isAr ? 'القائمة الرئيسية' : 'Main Menu'}
          variant="outline"
          size="sm"
          borderColor="border.subtle"
          color="fg.default"
          _hover={{ bg: 'bg.panel', borderColor: 'extruder.500' }}
        >
          <Menu size={18} />
        </IconButton>
      </DrawerTrigger>

      <DrawerBackdrop />
      <DrawerPositioner>
        <DrawerContent
          bg="bg.panel"
          borderColor="border.subtle"
          p={5}
          dir={isAr ? 'rtl' : 'ltr'}
          maxW={{ base: '320px', sm: '380px' }}
        >
        <DrawerHeader pb={4} px={0}>
          <HStack justify="space-between" align="center" w="full">
            <HStack gap={2.5}>
              <Box
                w="28px"
                h="28px"
                borderRadius="md"
                bg="linear-gradient(135deg, #F97316 0%, #14B8A6 100%)"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="xs" fontWeight="black" color="white" fontFamily="mono">
                  3D
                </Text>
              </Box>
              <DrawerTitle fontSize="md" fontWeight="bold">
                {isAr ? 'قائمة منصة J3D' : 'J3D Navigation'}
              </DrawerTitle>
            </HStack>
          </HStack>
        </DrawerHeader>

        <DrawerCloseTrigger color="fg.muted" />

        <DrawerBody pt={2} px={0}>
          <VStack gap={2} align="stretch">
            {/* User Profile Card if Logged In */}
            {user ? (
              <Box
                p={3.5}
                borderRadius="xl"
                bg="bg.canvas"
                borderWidth="1px"
                borderColor="border.subtle"
                mb={2}
              >
                <VStack align="stretch" gap={2}>
                  <HStack justify="space-between">
                    <VStack align="start" gap={0}>
                      <Text fontSize="sm" fontWeight="bold" color="fg.default">
                        {user.fullName || user.email}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {user.email}
                      </Text>
                    </VStack>
                    <Badge size="xs" colorPalette="orange" variant="subtle">
                      {user.role}
                    </Badge>
                  </HStack>

                  <HStack justify="space-between" pt={1} borderTop="1px solid" borderColor="border.subtle">
                    <HStack gap={1.5}>
                      <Wallet size={14} color="#14B8A6" />
                      <Text fontSize="xs" color="fg.muted">
                        {isAr ? 'الرصيد:' : 'Wallet:'}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" fontWeight="bold" color="laser.500">
                      {(user.walletBalanceAed ?? 500).toFixed(2)} {isAr ? 'درهم' : 'AED'}
                    </Text>
                  </HStack>
                </VStack>
              </Box>
            ) : null}

            {/* Navigation links */}
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                  <Box
                    p={3}
                    borderRadius="xl"
                    border="1px solid transparent"
                    _hover={{
                      bg: 'bg.canvas',
                      borderColor: 'border.subtle',
                    }}
                    transition="all 0.15s ease"
                  >
                    <HStack justify="space-between" align="center" w="full">
                      <HStack gap={3}>
                        <Box
                          p={1.5}
                          borderRadius="lg"
                          bg={`${link.color}15`}
                          color={link.color}
                        >
                          <Icon size={17} />
                        </Box>
                        <Text fontSize="sm" fontWeight="medium" color="fg.default">
                          {link.label}
                        </Text>
                      </HStack>
                      <HStack gap={2}>
                        {link.badge && (
                          <Badge size="xs" colorPalette="orange" variant="surface">
                            {link.badge}
                          </Badge>
                        )}
                        {isAr ? <ChevronLeft size={15} color="#A1A1AA" /> : <ChevronRight size={15} color="#A1A1AA" />}
                      </HStack>
                    </HStack>
                  </Box>
                </Link>
              );
            })}

            <Box borderTop="1px solid" borderColor="border.subtle" my={2} />

            {/* Auth Action */}
            {user ? (
              <Button
                variant="outline"
                size="sm"
                colorPalette="red"
                w="full"
                onClick={logout}
                justifyContent="center"
              >
                <HStack gap={2}>
                  <LogOut size={16} />
                  <Text>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</Text>
                </HStack>
              </Button>
            ) : (
              <Link href={`/${locale}/auth/login`} style={{ textDecoration: 'none' }}>
                <Box
                  p={3}
                  borderRadius="xl"
                  bg="extruder.500/10"
                  border="1px solid"
                  borderColor="extruder.500/20"
                  _hover={{ bg: 'extruder.500/20' }}
                >
                  <HStack justify="space-between">
                    <HStack gap={2}>
                      <User size={16} color="#F97316" />
                      <Text fontSize="sm" fontWeight="bold" color="extruder.500">
                        {isAr ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Register'}
                      </Text>
                    </HStack>
                    <ExternalLink size={14} color="#F97316" />
                  </HStack>
                </Box>
              </Link>
            )}
          </VStack>
        </DrawerBody>
        </DrawerContent>
      </DrawerPositioner>
    </DrawerRoot>
  );
}
