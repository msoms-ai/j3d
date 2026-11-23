'use client';

import { HStack, VStack, Box, Text, IconButton, Badge } from '@chakra-ui/react';
import { Sun, Moon, Languages, LogIn, User as UserIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HelpDialog } from './HelpDialog';
import { NavigationDrawer } from './NavigationDrawer';
import { useAuth } from '@/context/AuthContext';

export function GlobalHeader() {
  const { theme, setTheme } = useTheme();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const isAr = locale === 'ar';
  const { user } = useAuth();

  const toggleLanguage = () => {
    const nextLocale = isAr ? 'en' : 'ar';
    const pathSegments = pathname.split('/');
    pathSegments[1] = nextLocale;
    const nextPath = pathSegments.join('/') || `/${nextLocale}`;
    router.push(nextPath);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={100}
      h="68px"
      bg="bg.panel/90"
      backdropFilter="blur(16px)"
      borderBottomWidth="1px"
      borderColor="border.subtle"
      px={{ base: 4, md: 8 }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <HStack h="full" justify="space-between" align="center">
        {/* START Edge: Navigation Drawer (Right in AR, Left in EN) + Brand Logo */}
        <HStack gap={3} align="center">
          <NavigationDrawer />

          <Link href={`/${locale}`} style={{ textDecoration: 'none' }}>
            <HStack gap={2.5} cursor="pointer">
              <Box
                w="36px"
                h="36px"
                borderRadius="xl"
                bg="linear-gradient(135deg, #F97316 0%, #EA580C 50%, #14B8A6 100%)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                boxShadow="0 4px 14px rgba(249, 115, 22, 0.35)"
              >
                <Text fontSize="md" fontWeight="black" color="white" fontFamily="mono">
                  3D
                </Text>
              </Box>
              <VStack align="start" gap={0}>
                <HStack gap={1.5} align="baseline">
                  <Text fontSize="lg" fontWeight="black" letterSpacing="-0.5px" color="fg.default">
                    J3D
                  </Text>
                  <Badge size="xs" colorPalette="teal" variant="surface">
                    UAE
                  </Badge>
                </HStack>
                <Text fontSize="9px" color="fg.muted" display={{ base: 'none', sm: 'block' }}>
                  j3d.msoms.ai
                </Text>
              </VStack>
            </HStack>
          </Link>
        </HStack>

        {/* CENTER: Navigation Badges on Desktop */}
        <HStack gap={3} display={{ base: 'none', md: 'flex' }}>
          <Link href={`/${locale}`} style={{ textDecoration: 'none' }}>
            <Text
              fontSize="xs"
              fontWeight="bold"
              color={pathname === `/${locale}` ? 'extruder.500' : 'fg.muted'}
              _hover={{ color: 'extruder.500' }}
            >
              {isAr ? 'استوديو 3D' : '3D Studio'}
            </Text>
          </Link>
          <Text color="border.subtle">•</Text>
          <Link href={`/${locale}/orders`} style={{ textDecoration: 'none' }}>
            <Text
              fontSize="xs"
              fontWeight="bold"
              color={pathname.includes('/orders') ? 'laser.500' : 'fg.muted'}
              _hover={{ color: 'laser.500' }}
            >
              {isAr ? 'طلباتي' : 'My Orders'}
            </Text>
          </Link>
          <Text color="border.subtle">•</Text>
          <Link href={`/${locale}/maker/radar`} style={{ textDecoration: 'none' }}>
            <Text
              fontSize="xs"
              fontWeight="bold"
              color={pathname.includes('/maker') ? 'orange.400' : 'fg.muted'}
              _hover={{ color: 'orange.400' }}
            >
              {isAr ? 'رادار المصنّعين' : 'Maker Radar'}
            </Text>
          </Link>
          <Text color="border.subtle">•</Text>
          <Link href={`/${locale}/courier/dispatch`} style={{ textDecoration: 'none' }}>
            <Text
              fontSize="xs"
              fontWeight="bold"
              color={pathname.includes('/courier') ? 'blue.400' : 'fg.muted'}
              _hover={{ color: 'blue.400' }}
            >
              {isAr ? 'أسطول التوصيل' : 'Delivery Fleet'}
            </Text>
          </Link>
        </HStack>

        {/* END Edge: Controls, Auth & Drawer */}
        <HStack gap={2}>
          {/* Language Switcher */}
          <IconButton
            aria-label="Toggle Language"
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            color="fg.muted"
            _hover={{ color: 'extruder.500', bg: 'bg.panel' }}
          >
            <HStack gap={1}>
              <Languages size={17} />
              <Text fontSize="xs" fontWeight="bold">
                {isAr ? 'EN' : 'عربي'}
              </Text>
            </HStack>
          </IconButton>

          {/* Theme Toggle */}
          <IconButton
            aria-label="Toggle Theme"
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            color="fg.muted"
            _hover={{ color: 'extruder.500', bg: 'bg.panel' }}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </IconButton>

          {/* Help Dialog */}
          <HelpDialog />

          {/* User Sign In / Profile */}
          {user ? (
            <Link href={`/${locale}/profile`} style={{ textDecoration: 'none' }}>
              <HStack
                px={2.5}
                py={1}
                borderRadius="lg"
                borderWidth="1px"
                borderColor="border.subtle"
                bg="bg.canvas"
                gap={1.5}
                cursor="pointer"
                _hover={{ borderColor: 'extruder.500' }}
              >
                <UserIcon size={14} color="#F97316" />
                <Text fontSize="xs" fontWeight="bold" display={{ base: 'none', sm: 'block' }}>
                  {user.fullName?.split(' ')[0] || user.email.split('@')[0]}
                </Text>
                <Badge size="xs" colorPalette="orange" variant="surface">
                  {user.role === 'PRINTER_PROVIDER'
                    ? isAr ? 'مصنّع' : 'Maker'
                    : user.role === 'DELIVERY_PROVIDER'
                    ? isAr ? 'مندوب' : 'Courier'
                    : user.role === 'ADMIN'
                    ? 'Admin'
                    : isAr ? 'عميل' : 'Client'}
                </Badge>
              </HStack>
            </Link>
          ) : (
            <Link href={`/${locale}/auth/login`} style={{ textDecoration: 'none' }}>
              <IconButton
                aria-label="Sign In"
                variant="ghost"
                size="sm"
                color="fg.muted"
                _hover={{ color: 'extruder.500', bg: 'bg.panel' }}
              >
                <LogIn size={18} />
              </IconButton>
            </Link>
          )}
        </HStack>
      </HStack>
    </Box>
  );
}
