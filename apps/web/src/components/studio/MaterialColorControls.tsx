'use client';

import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Grid,
  Button,
} from '@chakra-ui/react';
import { MaterialType, ColorMode } from '@j3d/shared-types';
import { Layers, Palette, Maximize2, Scale } from 'lucide-react';
import { useLocale } from 'next-intl';

interface ControlsProps {
  material: MaterialType;
  onMaterialChange: (m: MaterialType) => void;
  colorMode: ColorMode;
  onColorModeChange: (cm: ColorMode) => void;
  colorHexList: string[];
  onColorHexListChange: (colors: string[]) => void;
  scalePercent: number;
  onScaleChange: (scale: number) => void;
  dimXmm: number;
  dimYmm: number;
  dimZmm: number;
  volumeCm3: number;
  estimatedWeightG: number;
}

export function MaterialColorControls({
  material,
  onMaterialChange,
  colorMode,
  onColorModeChange,
  colorHexList,
  onColorHexListChange,
  scalePercent,
  onScaleChange,
  dimXmm,
  dimYmm,
  dimZmm,
  volumeCm3,
  estimatedWeightG,
}: ControlsProps) {
  const locale = useLocale();
  const isAr = locale === 'ar';

  const materials = [
    { type: MaterialType.PLA, label: 'PLA (Standard)', desc: 'Fast, smooth, eco-friendly' },
    { type: MaterialType.PLA_SILK, label: 'PLA Silk', desc: 'Glossy metallic finish' },
    { type: MaterialType.PETG, label: 'PETG', desc: 'Durable, heat & water resistant' },
    { type: MaterialType.ABS, label: 'ABS', desc: 'High strength, impact resistant' },
    { type: MaterialType.TPU_95A, label: 'TPU 95A', desc: 'Flexible rubber-like' },
    { type: MaterialType.RESIN_STANDARD, label: 'Resin', desc: 'Ultra-fine surface details' },
  ];

  const colorPalette = [
    { hex: '#F97316', label: 'Molten Orange' },
    { hex: '#14B8A6', label: 'Laser Teal' },
    { hex: '#EAB308', label: 'Silk Gold' },
    { hex: '#10B981', label: 'Emerald' },
    { hex: '#3B82F6', label: 'Cobalt Blue' },
    { hex: '#1E293B', label: 'Stealth Black' },
    { hex: '#F8FAFC', label: 'Pearl White' },
  ];

  const fixedScaleSteps = [50, 75, 100, 125, 150, 200];

  return (
    <VStack gap={5} align="stretch">
      {/* 1. Material Selector */}
      <Box p={4} borderRadius="xl" bg="bg.panel" border="1px solid" borderColor="border.subtle">
        <HStack justify="space-between" mb={3}>
          <HStack gap={2}>
            <Layers size={17} color="#F97316" />
            <Text fontSize="sm" fontWeight="bold">
              {isAr ? 'نوع الخامة' : 'Material Selection'}
            </Text>
          </HStack>
          <Badge colorPalette="orange" size="sm">
            {material}
          </Badge>
        </HStack>

        <Grid templateColumns="repeat(3, 1fr)" gap={2}>
          {materials.map((m) => {
            const isSelected = material === m.type;
            return (
              <Box
                key={m.type}
                as="button"
                p={2.5}
                borderRadius="lg"
                border="1px solid"
                borderColor={isSelected ? 'extruder.500' : 'border.subtle'}
                bg={isSelected ? 'extruder.500/10' : 'bg.canvas'}
                textAlign="start"
                onClick={() => onMaterialChange(m.type)}
                _hover={{ borderColor: 'extruder.500' }}
                cursor="pointer"
              >
                <Text fontSize="xs" fontWeight="bold" color={isSelected ? 'extruder.500' : 'fg.default'}>
                  {m.label}
                </Text>
                <Text fontSize="10px" color="fg.muted" truncate>
                  {m.desc}
                </Text>
              </Box>
            );
          })}
        </Grid>
      </Box>

      {/* 2. Color Mode & Filament Swatches */}
      <Box p={4} borderRadius="xl" bg="bg.panel" border="1px solid" borderColor="border.subtle">
        <HStack justify="space-between" mb={3}>
          <HStack gap={2}>
            <Palette size={17} color="#14B8A6" />
            <Text fontSize="sm" fontWeight="bold">
              {isAr ? 'نمط الألوان والفيلومنت' : 'Color Mode & AMS Zones'}
            </Text>
          </HStack>
          <HStack gap={1} bg="bg.canvas" p={1} borderRadius="md" border="1px solid" borderColor="border.subtle">
            <Button
              size="xs"
              variant={colorMode === ColorMode.MONO ? 'solid' : 'ghost'}
              colorPalette="teal"
              onClick={() => onColorModeChange(ColorMode.MONO)}
            >
              {isAr ? 'موحد' : 'Mono'}
            </Button>
            <Button
              size="xs"
              variant={colorMode === ColorMode.MULTICOLOR ? 'solid' : 'ghost'}
              colorPalette="orange"
              onClick={() => onColorModeChange(ColorMode.MULTICOLOR)}
            >
              {isAr ? 'متعدد (AMS)' : 'Multicolor'}
            </Button>
          </HStack>
        </HStack>

        <HStack gap={2} flexWrap="wrap">
          {colorPalette.map((c) => {
            const isChosen = colorHexList.includes(c.hex);
            return (
              <Box
                key={c.hex}
                as="button"
                w="32px"
                h="32px"
                borderRadius="full"
                bg={c.hex}
                border="2px solid"
                borderColor={isChosen ? 'extruder.500' : 'border.subtle'}
                boxShadow={isChosen ? '0 0 0 2px rgba(249, 115, 22, 0.4)' : 'none'}
                onClick={() => {
                  if (colorMode === ColorMode.MONO) {
                    onColorHexListChange([c.hex]);
                  } else {
                    if (isChosen && colorHexList.length > 1) {
                      onColorHexListChange(colorHexList.filter((x) => x !== c.hex));
                    } else if (!isChosen && colorHexList.length < 4) {
                      onColorHexListChange([...colorHexList, c.hex]);
                    }
                  }
                }}
                cursor="pointer"
              />
            );
          })}
        </HStack>
      </Box>

      {/* 3. Fixed-Step Size Slider */}
      <Box p={4} borderRadius="xl" bg="bg.panel" border="1px solid" borderColor="border.subtle">
        <HStack justify="space-between" mb={2}>
          <HStack gap={2}>
            <Maximize2 size={17} color="#38BDF8" />
            <Text fontSize="sm" fontWeight="bold">
              {isAr ? 'التحكم في الحجم (نسبة مئوية ثابتة)' : 'Fixed-Step Scale Size'}
            </Text>
          </HStack>
          <Badge colorPalette="cyan" size="md">
            {scalePercent}%
          </Badge>
        </HStack>

        <HStack justify="space-between" mt={3}>
          {fixedScaleSteps.map((step) => {
            const isCurrent = scalePercent === step;
            return (
              <Button
                key={step}
                size="xs"
                variant={isCurrent ? 'solid' : 'outline'}
                colorPalette="cyan"
                onClick={() => onScaleChange(step)}
              >
                {step}%
              </Button>
            );
          })}
        </HStack>
      </Box>

      {/* 4. Live Physical Dimensions & Weight */}
      <Box p={3.5} borderRadius="xl" bg="bg.canvas" border="1px solid" borderColor="border.subtle">
        <HStack justify="space-between" align="center">
          <HStack gap={2}>
            <Scale size={16} color="#94A3B8" />
            <Text fontSize="xs" color="fg.muted">
              {isAr ? 'المقاييس الفيزيائية:' : 'Physical Metrics:'}
            </Text>
          </HStack>
          <HStack gap={3}>
            <Text fontSize="xs" fontFamily="mono" fontWeight="bold" color="fg.default">
              {dimXmm} × {dimYmm} × {dimZmm} mm
            </Text>
            <Text fontSize="xs" fontFamily="mono" color="extruder.500" fontWeight="bold">
              ~{estimatedWeightG}g
            </Text>
            <Text fontSize="xs" fontFamily="mono" color="laser.500">
              {volumeCm3} cm³
            </Text>
          </HStack>
        </HStack>
      </Box>
    </VStack>
  );
}
