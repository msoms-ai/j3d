'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, VStack, HStack, Text, Badge, Input, Button } from '@chakra-ui/react';
import { MapPin, Search } from 'lucide-react';
import { useLocale } from 'next-intl';

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialEmirate?: string;
  initialDistrict?: string;
  initialAddress?: string;
  onLocationSelect: (loc: {
    lat: number;
    lng: number;
    emirate: string;
    district: string;
    streetAddress: string;
  }) => void;
}

export function OsmLocationPicker({
  initialLat = 25.1012,
  initialLng = 55.2054,
  initialEmirate = 'Dubai',
  initialDistrict = 'Al Barsha 2',
  initialAddress = 'Street 14B, Villa 22',
  onLocationSelect,
}: LocationPickerProps) {
  const locale = useLocale();
  const isAr = locale === 'ar';

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [emirate, setEmirate] = useState(initialEmirate);
  const [district, setDistrict] = useState(initialDistrict);
  const [streetAddress, setStreetAddress] = useState(initialAddress);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Dynamic Leaflet loading on client
  useEffect(() => {
    let mapInstance: any;
    let markerInstance: any;

    const initMap = async () => {
      if (!mapContainerRef.current) return;
      const L = await import('leaflet');
      import('leaflet/dist/leaflet.css');

      mapInstance = L.map(mapContainerRef.current).setView([lat, lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapInstance);

      // Custom orange icon
      const customIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="background-color: #F97316; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4);"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      markerInstance = L.marker([lat, lng], { draggable: true, icon: customIcon }).addTo(mapInstance);

      const reverseGeocode = async (newLat: number, newLng: number) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'j3d.msoms.ai/1.0 (noreply@msoms.ai)',
              },
            },
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const resolvedEmirate = addr.state || addr.city || 'Dubai';
            const resolvedDistrict = addr.suburb || addr.neighbourhood || addr.quarter || 'Al Barsha';
            const resolvedRoad = addr.road || data.display_name?.split(',')[0] || '';

            setLat(newLat);
            setLng(newLng);
            setEmirate(resolvedEmirate);
            setDistrict(resolvedDistrict);
            setStreetAddress(resolvedRoad);

            onLocationSelect({
              lat: newLat,
              lng: newLng,
              emirate: resolvedEmirate,
              district: resolvedDistrict,
              streetAddress: resolvedRoad,
            });
          }
        } catch {
          // Keep current fallback coordinates
        }
      };

      markerInstance.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        reverseGeocode(pos.lat, pos.lng);
      });

      mapInstance.on('click', (e: any) => {
        markerInstance.setLatLng(e.latlng);
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });
    };

    initMap();

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, []);

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', United Arab Emirates')}&limit=1`,
        {
          headers: { 'User-Agent': 'j3d.msoms.ai/1.0 (noreply@msoms.ai)' },
        },
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const item = results[0];
          const newLat = parseFloat(item.lat);
          const newLng = parseFloat(item.lon);
          setLat(newLat);
          setLng(newLng);
          setDistrict(item.display_name.split(',')[0]);
          onLocationSelect({
            lat: newLat,
            lng: newLng,
            emirate,
            district: item.display_name.split(',')[0],
            streetAddress,
          });
        }
      }
    } catch {
      // Ignored
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <VStack gap={4} align="stretch" p={4} borderRadius="xl" bg="bg.panel" border="1px solid" borderColor="border.subtle">
      <HStack justify="space-between">
        <HStack gap={2}>
          <MapPin size={18} color="#F97316" />
          <Text fontSize="sm" fontWeight="bold">
            {isAr ? 'محدد الموقع التفاعلي (OpenStreetMap)' : 'OpenStreetMap Interactive Pin Detector'}
          </Text>
        </HStack>
        <Badge colorPalette="teal" size="sm">
          {emirate} • {district}
        </Badge>
      </HStack>

      {/* Search Bar */}
      <HStack gap={2}>
        <Input
          size="sm"
          borderRadius="md"
          placeholder={isAr ? 'ابحث عن منطقة في الإمارات (مثال: JVC, Al Barsha, Downtown)' : 'Search UAE area (e.g. JVC, Al Barsha, Downtown)'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          bg="bg.canvas"
          borderColor="border.subtle"
        />
        <Button size="sm" colorPalette="orange" onClick={handleSearch} loading={isSearching}>
          <Search size={15} />
        </Button>
      </HStack>

      {/* Leaflet Map Box */}
      <Box
        ref={mapContainerRef}
        w="full"
        h="260px"
        borderRadius="lg"
        overflow="hidden"
        border="1px solid"
        borderColor="border.subtle"
      />

      {/* Geocoded Address Info */}
      <HStack justify="space-between" p={2.5} borderRadius="md" bg="bg.canvas" fontSize="xs">
        <Text color="fg.muted">
          {streetAddress || 'Address on Map'}, {district}, {emirate}
        </Text>
        <Text fontFamily="mono" color="fg.muted">
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </Text>
      </HStack>
    </VStack>
  );
}
