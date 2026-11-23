'use client';

import { Box, HStack, Stack, Text, Link as ChakraLink } from '@chakra-ui/react';
import { useLocale } from 'next-intl';
import Link from 'next/link';

export function GlobalFooter() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || 'v1.0.0-local';

  const legalLinks = [
    { href: `/${locale}/legal/privacy`, labelEn: 'Data Privacy', labelAr: 'الخصوصية' },
    { href: `/${locale}/legal/policy`, labelEn: 'Policy', labelAr: 'السياسة' },
    { href: `/${locale}/legal/terms`, labelEn: 'Terms', labelAr: 'الشروط' },
    { href: `/${locale}/legal/sla`, labelEn: 'SLA', labelAr: 'اتفاقية SLA' },
    { href: `/${locale}/legal/refunds`, labelEn: 'Escrow & Refunds', labelAr: 'الضمان والاسترجاع' },
    { href: `/${locale}/legal/safety`, labelEn: '3D Safety', labelAr: 'السلامة' },
  ];

  return (
    <Box
      as="footer"
      mt="auto"
      py={6}
      px={{ base: 4, md: 8 }}
      borderTopWidth="1px"
      borderColor="border.subtle"
      bg="bg.panel/60"
    >
      <Stack
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
        align="center"
        gap={4}
      >
        {/* Left Side: Mandatory Legal Links */}
        <HStack gap={{ base: 3, sm: 4 }} flexWrap="wrap" justify={{ base: 'center', md: 'start' }}>
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
              <Text
                fontSize="xs"
                color="fg.muted"
                _hover={{ color: 'extruder.500' }}
                transition="color 0.15s ease"
              >
                {isAr ? link.labelAr : link.labelEn}
              </Text>
            </Link>
          ))}
        </HStack>

        {/* Middle Area: msoms.ai 2026 Initiative */}
        <HStack gap={1.5} justify="center">
          <Text fontSize="xs" color="fg.muted">
            {isAr ? 'مبادرة من' : 'An initiative from'}
          </Text>
          <ChakraLink
            href="https://msoms.ai"
            target="_blank"
            fontSize="xs"
            fontWeight="bold"
            color="extruder.500"
            _hover={{ textDecoration: 'underline' }}
          >
            msoms.ai 2026
          </ChakraLink>
        </HStack>

        {/* Right Side: Version Badge */}
        <HStack gap={2} justify={{ base: 'center', md: 'end' }}>
          <Box
            px={2.5}
            py={0.5}
            borderRadius="md"
            bg="bg.canvas"
            border="1px solid"
            borderColor="border.subtle"
          >
            <Text fontSize="10px" fontFamily="mono" color="fg.muted">
              {appVersion}
            </Text>
          </Box>
        </HStack>
      </Stack>
    </Box>
  );
}
