'use client';

import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
} from '@chakra-ui/react';
import { ShieldCheck, Download, CreditCard, ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';

interface BudgetProps {
  unitFloorAed: number;
  quantity: number;
  onQuantityChange: (q: number) => void;
  printBudgetAed: number;
  onPrintBudgetChange: (b: number) => void;
  deliveryBudgetAed: number;
  onDeliveryBudgetChange: (b: number) => void;
  downloadUrl?: string;
  onOrderSubmit: () => void;
  isOrdering?: boolean;
}

export function BudgetFloorControls({
  unitFloorAed,
  quantity,
  onQuantityChange,
  printBudgetAed,
  onPrintBudgetChange,
  deliveryBudgetAed,
  onDeliveryBudgetChange,
  downloadUrl,
  onOrderSubmit,
  isOrdering = false,
}: BudgetProps) {
  const locale = useLocale();
  const isAr = locale === 'ar';

  const totalMinFloorAed = Math.max(15, Math.ceil(unitFloorAed * quantity));
  const minDeliveryFloorAed = 25; // UAE cross-emirate minimum

  return (
    <VStack gap={4} align="stretch" p={5} borderRadius="xl" bg="bg.panel" border="1px solid" borderColor="border.subtle">
      {/* 1. Algorithmic Floor Display */}
      <HStack justify="space-between" p={3} borderRadius="lg" bg="laser.500/10" border="1px solid" borderColor="laser.500/20">
        <HStack gap={2}>
          <ShieldCheck size={18} color="#14B8A6" />
          <Text fontSize="xs" fontWeight="bold" color="laser.500">
            {isAr ? 'الحد الأدنى الخوارزمي المضمون' : 'Algorithmic Minimum Floor'}
          </Text>
        </HStack>
        <Text fontSize="sm" fontWeight="black" color="laser.500" fontFamily="mono">
          {totalMinFloorAed} AED
        </Text>
      </HStack>

      {/* 2. Quantity Selector */}
      <HStack justify="space-between">
        <Text fontSize="xs" fontWeight="bold" color="fg.default">
          {isAr ? 'الكمية المطلوبة (قطع)' : 'Quantity (Pieces)'}
        </Text>
        <HStack gap={1.5}>
          {[1, 5, 25, 50, 100].map((q) => (
            <Button
              key={q}
              size="xs"
              variant={quantity === q ? 'solid' : 'outline'}
              colorPalette="orange"
              onClick={() => onQuantityChange(q)}
            >
              {q}
            </Button>
          ))}
        </HStack>
      </HStack>

      {/* 3. Client Print Budget */}
      <VStack align="stretch" gap={1}>
        <HStack justify="space-between">
          <Text fontSize="xs" color="fg.muted">
            {isAr ? 'ميزانية الطباعة القصوى (درهم)' : 'Max Print Budget (AED)'}
          </Text>
          <Text fontSize="sm" fontWeight="bold" color="extruder.500" fontFamily="mono">
            {printBudgetAed} AED
          </Text>
        </HStack>
        <input
          type="range"
          min={totalMinFloorAed}
          max={totalMinFloorAed * 2 + 50}
          step={5}
          value={printBudgetAed}
          onChange={(e) => onPrintBudgetChange(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#F97316' }}
        />
      </VStack>

      {/* 4. Client Delivery Budget */}
      <VStack align="stretch" gap={1}>
        <HStack justify="space-between">
          <Text fontSize="xs" color="fg.muted">
            {isAr ? 'ميزانية التوصيل السريع (درهم)' : 'Max Delivery Budget (AED)'}
          </Text>
          <Text fontSize="sm" fontWeight="bold" color="cyan.400" fontFamily="mono">
            {deliveryBudgetAed} AED
          </Text>
        </HStack>
        <input
          type="range"
          min={minDeliveryFloorAed}
          max={100}
          step={5}
          value={deliveryBudgetAed}
          onChange={(e) => onDeliveryBudgetChange(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#38BDF8' }}
        />
      </VStack>

      <Box borderTop="1px solid" borderColor="border.subtle" my={1} />

      {/* 5. Total & Checkout Action */}
      <HStack justify="space-between" align="baseline">
        <Text fontSize="xs" color="fg.muted">
          {isAr ? 'إجمالي الضمان المالي المفوّض:' : 'Total Escrow Pre-Authorization:'}
        </Text>
        <Text fontSize="xl" fontWeight="black" color="fg.default" fontFamily="mono">
          {printBudgetAed + deliveryBudgetAed} <span style={{ fontSize: '13px', color: '#F97316' }}>AED</span>
        </Text>
      </HStack>

      <VStack gap={2} pt={2}>
        <Button
          w="full"
          size="lg"
          colorPalette="orange"
          onClick={onOrderSubmit}
          loading={isOrdering}
        >
          <CreditCard size={18} style={{ marginRight: '8px' }} />
          {isAr ? 'تفويض الضمان عبر Ziina وبدء المناقصة' : 'Authorize Escrow via Ziina & Dispatch'}
          <ChevronRight size={18} />
        </Button>

        {downloadUrl && (
          <Button
            asChild
            w="full"
            size="sm"
            variant="ghost"
            color="fg.muted"
            _hover={{ color: 'laser.500', bg: 'bg.canvas' }}
          >
            <a
              href={downloadUrl}
              target="_blank"
              download
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Download size={15} />
              {isAr ? 'تحميل ملف .STL ثلاثي الأبعاد مباشرة' : 'Download Watertight .STL File'}
            </a>
          </Button>
        )}
      </VStack>
    </VStack>
  );
}
