'use client';

import { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Grid,
  Button,
  Badge,
  Input,
} from '@chakra-ui/react';
import {
  Smartphone,
  Gift,
  Sparkles,
  Award,
  Baby,
  QrCode,
  GraduationCap,
  Wrench,
  Gamepad2,
  Cog,
  ArrowRight,
  ArrowLeft,
  Wand2,
} from 'lucide-react';
import { useLocale } from 'next-intl';

interface WizardProps {
  categories: any[];
  onStlGenerated: (stlData: any) => void;
}

export function TypeformWizard({ categories, onStlGenerated }: WizardProps) {
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCat, setSelectedCat] = useState<string>('giveaways-favors');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  const iconMap: Record<string, any> = {
    Smartphone,
    Gift,
    Sparkles,
    Award,
    Baby,
    QrCode,
    GraduationCap,
    Wrench,
    Gamepad2,
    Cog,
  };

  const handleSelectCategory = (catSlug: string) => {
    setSelectedCat(catSlug);
    setStep(2);
  };

  const handleSelectTemplate = async (template: any) => {
    setSelectedTemplate(template);
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiUrl}/studio/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorySlug: selectedCat,
          templateSlug: template.slug,
          locale,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setDynamicQuestions(json.data || json || []);
      }
    } catch {
      // Fallback questions
      setDynamicQuestions([
        {
          id: 'customText',
          questionEn: 'Custom name or phrase to emboss:',
          questionAr: 'الاسم أو العبارة المراد نقشها على المجسم:',
          type: 'text',
        },
      ]);
    } finally {
      setIsLoading(false);
      setStep(3);
    }
  };

  const handleCompileStl = async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiUrl}/studio/generate-stl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateSlug: selectedTemplate.slug,
          answers,
          scalePercent: 100,
          quantity: 1,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        onStlGenerated(json.data || json);
      }
    } catch (e) {
      console.error('Failed to compile STL', e);
    } finally {
      setIsLoading(false);
    }
  };

  const activeCategoryObj = categories.find((c) => c.slug === selectedCat) || categories[1] || categories[0];
  const templatesList = activeCategoryObj?.templates || [];

  return (
    <Box p={{ base: 4, md: 6 }} borderRadius="2xl" bg="bg.panel" border="1px solid" borderColor="border.subtle">
      {/* Wizard Progress Indicator */}
      <HStack justify="space-between" mb={5}>
        <HStack gap={2}>
          <Box p={2} bg="extruder.500/10" borderRadius="lg" color="extruder.500">
            <Wand2 size={18} />
          </Box>
          <VStack align="start" gap={0}>
            <Text fontSize="xs" color="fg.muted" fontWeight="bold">
              {isAr ? `المرحلة ${step} من ٣` : `Step ${step} of 3`}
            </Text>
            <Text fontSize="sm" fontWeight="bold" color="fg.default">
              {step === 1 && (isAr ? 'اختر فئة الطباعة ثلاثية الأبعاد' : 'Select 3D Print Category')}
              {step === 2 && (isAr ? 'اختر النموذج الأساسي' : 'Select Parametric Template')}
              {step === 3 && (isAr ? 'تخصيص المعايير بالذكاء الاصطناعي' : 'AI Dynamic Customization')}
            </Text>
          </VStack>
        </HStack>

        {step > 1 && (
          <Button size="xs" variant="ghost" onClick={() => setStep((step - 1) as any)}>
            {isAr ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
            {isAr ? 'رجوع' : 'Back'}
          </Button>
        )}
      </HStack>

      {/* Step 1: 10 Categories */}
      {step === 1 && (
        <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }} gap={3}>
          {categories.map((cat) => {
            const Icon = iconMap[cat.iconName] || Box;
            const isSelected = selectedCat === cat.slug;
            return (
              <Box
                key={cat.id || cat.slug}
                as="button"
                p={4}
                borderRadius="xl"
                border="1px solid"
                borderColor={isSelected ? 'extruder.500' : 'border.subtle'}
                bg={isSelected ? 'extruder.500/10' : 'bg.canvas'}
                textAlign="start"
                onClick={() => handleSelectCategory(cat.slug)}
                _hover={{ borderColor: 'extruder.500', transform: 'translateY(-2px)' }}
                transition="all 0.15s ease"
                cursor="pointer"
              >
                <Box p={2.5} borderRadius="lg" bg="bg.panel" w="fit-content" mb={3} color={isSelected ? 'extruder.500' : 'fg.muted'}>
                  <Icon size={20} />
                </Box>
                <Text fontSize="xs" fontWeight="bold" color="fg.default" mb={1}>
                  {isAr ? cat.nameAr : cat.nameEn}
                </Text>
                <Text fontSize="10px" color="fg.muted" lineClamp={2}>
                  {isAr ? cat.descriptionAr : cat.descriptionEn}
                </Text>
              </Box>
            );
          })}
        </Grid>
      )}

      {/* Step 2: Cultural / Functional Templates */}
      {step === 2 && (
        <VStack gap={3} align="stretch">
          <Text fontSize="xs" color="fg.muted">
            {isAr ? 'نماذج التصميم المتاحة لهذه الفئة:' : 'Available design templates for this category:'}
          </Text>

          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
            {templatesList.map((tpl: any) => {
              const isSelected = selectedTemplate?.slug === tpl.slug;
              return (
                <Box
                  key={tpl.id || tpl.slug}
                  as="button"
                  p={4}
                  borderRadius="xl"
                  border="1px solid"
                  borderColor={isSelected ? 'laser.500' : 'border.subtle'}
                  bg={isSelected ? 'laser.500/10' : 'bg.canvas'}
                  textAlign="start"
                  onClick={() => handleSelectTemplate(tpl)}
                  _hover={{ borderColor: 'laser.500' }}
                  cursor="pointer"
                >
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm" fontWeight="bold" color={isSelected ? 'laser.500' : 'fg.default'}>
                      {isAr ? tpl.nameAr : tpl.nameEn}
                    </Text>
                    <Badge colorPalette="teal" size="xs">
                      {tpl.baseSetupFeeAed} AED
                    </Badge>
                  </HStack>
                  <Text fontSize="xs" color="fg.muted" lineClamp={2}>
                    {isAr ? tpl.samplePromptsAr?.[0] : tpl.samplePromptsEn?.[0]}
                  </Text>
                </Box>
              );
            })}
          </Grid>
        </VStack>
      )}

      {/* Step 3: Dynamic Gemini AI Customization */}
      {step === 3 && (
        <VStack gap={4} align="stretch">
          <Box p={3} borderRadius="lg" bg="extruder.500/10" border="1px solid" borderColor="extruder.500/20">
            <HStack gap={2}>
              <Sparkles size={16} color="#F97316" />
              <Text fontSize="xs" fontWeight="bold" color="extruder.500">
                {isAr ? `تخصيص: ${selectedTemplate?.nameAr}` : `Customizing: ${selectedTemplate?.nameEn}`}
              </Text>
            </HStack>
          </Box>

          {dynamicQuestions.map((q: any) => (
            <Box key={q.id} p={3.5} borderRadius="xl" bg="bg.canvas" border="1px solid" borderColor="border.subtle">
              <Text fontSize="xs" fontWeight="bold" color="fg.default" mb={2}>
                {isAr ? q.questionAr : q.questionEn}
              </Text>

              {q.options && q.options.length > 0 ? (
                <HStack gap={2} flexWrap="wrap">
                  {q.options.map((opt: string) => {
                    const isSelected = answers[q.id] === opt;
                    return (
                      <Button
                        key={opt}
                        size="xs"
                        variant={isSelected ? 'solid' : 'outline'}
                        colorPalette="orange"
                        onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                      >
                        {opt}
                      </Button>
                    );
                  })}
                </HStack>
              ) : (
                <Input
                  size="sm"
                  borderRadius="md"
                  placeholder={isAr ? 'اكتب التفاصيل هنا...' : 'Type details here...'}
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  bg="bg.panel"
                  borderColor="border.subtle"
                />
              )}
            </Box>
          ))}

          <Button
            size="md"
            colorPalette="orange"
            onClick={handleCompileStl}
            loading={isLoading}
            w="full"
          >
            <Wand2 size={16} style={{ marginRight: '6px' }} />
            {isAr ? 'بناء وتوليد المعاينة ثلاثية الأبعاد (Manifold .STL)' : 'Compile 3D Manifold Preview (.STL)'}
          </Button>
        </VStack>
      )}
    </Box>
  );
}
