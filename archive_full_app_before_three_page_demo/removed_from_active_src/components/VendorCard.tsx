import {
  BadgeCheck,
  CalendarDays,
  Heart,
  MapPin,
  Star,
} from 'lucide-react-native';
import { Image, Pressable, Text, View } from 'react-native';

import { getVendorImageSource } from '../data/vendorImages';
import { colors, styles } from '../theme/styles';
import type { Vendor } from '../types';
import { formatMoney } from '../utils/format';

export function VendorCard({
  vendor,
  isSaved,
  onOpen,
  onToggleSaved,
}: {
  vendor: Vendor;
  isSaved: boolean;
  onOpen: () => void;
  onToggleSaved: () => void;
}) {
  return (
    <View style={styles.vendorCard}>
      <Pressable
        accessibilityLabel={`Открыть ${vendor.name}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [
          styles.vendorCardPressable,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.vendorImage}>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={getVendorImageSource(vendor)}
            style={styles.vendorImagePhoto}
          />
        </View>

        <View style={styles.vendorInfo}>
          <View style={styles.vendorCardHeader}>
            <View style={styles.vendorIdentity}>
              <View style={styles.vendorNameRow}>
                <Text style={styles.vendorName}>{vendor.name}</Text>
                {vendor.verified ? (
                  <BadgeCheck
                    accessibilityLabel="Проверенный подрядчик"
                    color={colors.green}
                    fill={colors.greenSoft}
                    size={19}
                    strokeWidth={2.6}
                  />
                ) : null}
              </View>
              <Text style={styles.cardText}>{vendor.category}</Text>
            </View>

            <View style={styles.availabilityPill}>
              <CalendarDays color={colors.gold} size={13} strokeWidth={2.5} />
              <Text numberOfLines={2} style={styles.availabilityText}>
                {compactAvailability(vendor.availability)}
              </Text>
            </View>
          </View>

          <View style={styles.vendorMetaRow}>
            <View style={styles.inlineMeta}>
              <MapPin color={colors.muted} size={14} strokeWidth={2.4} />
              <Text style={styles.mutedSmall}>{vendor.city}</Text>
            </View>
            <View style={styles.inlineMeta}>
              <Star
                color={colors.gold}
                fill={colors.gold}
                size={14}
                strokeWidth={2}
              />
              <Text style={styles.mutedSmall}>{vendor.rating}</Text>
            </View>
          </View>

          <Text style={[styles.priceText, styles.vendorPriceText]}>
            от {formatMoney(vendor.priceFrom)}
          </Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityLabel={
          isSaved
            ? `Убрать ${vendor.name} из избранного`
            : `Сохранить ${vendor.name} в избранное`
        }
        accessibilityRole="button"
        onPress={onToggleSaved}
        style={({ pressed }) => [
          styles.vendorSaveButton,
          isSaved && styles.vendorSaveButtonActive,
          pressed && styles.pressed,
        ]}
      >
        <Heart
          color={isSaved ? colors.coral : colors.ink}
          fill={isSaved ? colors.coral : 'transparent'}
          size={20}
          strokeWidth={2.4}
        />
      </Pressable>
    </View>
  );
}

function compactAvailability(value: string) {
  return value
    .replace(/^Свободна\s+/i, '')
    .replace(/^Свободен\s+/i, '')
    .replace(/^Свободны\s+/i, '')
    .replace(/^Есть окна в\s+/i, 'Окна: ')
    .replace(/^Принимает заказы на\s+/i, 'Заказы: ')
    .replace(/^машины на\s+/i, '');
}
