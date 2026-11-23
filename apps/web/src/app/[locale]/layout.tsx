import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Provider } from '../../components/ui/provider';
import { AuthProvider } from '@/context/AuthContext';
import { GlobalHeader } from '../../components/layout/GlobalHeader';
import { GlobalFooter } from '../../components/layout/GlobalFooter';
import { Box } from '@chakra-ui/react';
import { locales } from '../../i18n/request';
import { dubaiFont } from '../../fonts';

export const metadata: Metadata = {
  title: 'J3D - AI-Powered On-Demand 3D Printing & UAE Delivery Marketplace',
  description:
    'Parametric CSG 3D Printing, Reverse-Bidding & Last-Mile Delivery Marketplace in UAE (msoms.ai)',
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  const messages = await getMessages({ locale });
  const isRtl = locale === 'ar';

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'} className={dubaiFont.variable} suppressHydrationWarning>
      <body className={dubaiFont.className} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <Provider>
              <Box display="flex" flexDirection="column" minH="100vh" bg="bg.canvas" color="fg.default">
                <GlobalHeader />
                <Box as="main" flex={1}>
                  {children}
                </Box>
                <GlobalFooter />
              </Box>
            </Provider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
