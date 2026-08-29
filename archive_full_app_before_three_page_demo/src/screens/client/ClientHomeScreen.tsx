import type { LucideIcon } from 'lucide-react-native';
import {
  Building2,
  CakeSlice,
  Calculator,
  Camera,
  CarFront,
  ClipboardList,
  Flower2,
  Gem,
  ListChecks,
  Mic2,
  Music2,
  Palette,
  Search,
  Shirt,
  Sparkles,
  UserRoundCheck,
  Video,
  Volume2,
} from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ActionButton, GhostButton } from '../../components/Buttons';
import { MetricCard } from '../../components/MetricCard';
import { Section } from '../../components/Section';
import { ToolCard } from '../../components/ToolCard';
import { VendorCard } from '../../components/VendorCard';
import { colors, styles } from '../../theme/styles';
import type { Vendor } from '../../types';

export function ClientHomeScreen({
  savedCount,
  leadCount,
  savedVendorIds,
  categories,
  vendors,
  onCategoryPick,
  onOpenCatalog,
  onOpenRequests,
  onOpenVendor,
  onToggleSaved,
}: {
  savedCount: number;
  leadCount: number;
  savedVendorIds: string[];
  categories: string[];
  vendors: Vendor[];
  onCategoryPick: (category: string) => void;
  onOpenCatalog: () => void;
  onOpenRequests: () => void;
  onOpenVendor: (vendor: Vendor) => void;
  onToggleSaved: (vendorId: string) => void;
}) {
  return (
    <View style={styles.screenStack}>
      <View style={styles.heroPanel}>
        <Text style={styles.eyebrow}>Свадьба в Алматы</Text>
        <Text style={styles.heroTitle}>Найдите подрядчика без длинных переписок</Text>
        <Text style={styles.heroText}>
          Каталог, заявки, бронирование даты и избранное в одном мобильном
          сценарии.
        </Text>
        <View style={styles.buttonRow}>
          <ActionButton
            label="Искать подрядчиков"
            icon={Search}
            onPress={onOpenCatalog}
          />
          <GhostButton
            label="Мои заявки"
            icon={ClipboardList}
            onPress={onOpenRequests}
          />
        </View>
      </View>

      <View style={styles.metricGrid}>
        <MetricCard label="Заявки" value={String(leadCount)} tone="teal" />
        <MetricCard label="Избранное" value={String(savedCount)} tone="coral" />
        <MetricCard label="Бюджет" value="3.8 млн" tone="gold" />
      </View>

      <Section title="Быстрые категории" action="Все" onAction={onOpenCatalog} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {categories.map((category) => {
          const CategoryIcon = getCategoryIcon(category);

          return (
            <Pressable
              key={category}
              style={({ pressed }) => [
                styles.categoryTile,
                pressed && styles.pressed,
              ]}
              onPress={() => onCategoryPick(category)}
            >
              <View style={styles.categoryIcon}>
                <CategoryIcon color={colors.coral} size={23} strokeWidth={2.3} />
              </View>
              <Text style={styles.categoryTitle}>{category}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Section title="Рекомендуемые" action="Каталог" onAction={onOpenCatalog} />
      {vendors.map((vendor) => (
        <VendorCard
          key={vendor.id}
          vendor={vendor}
          isSaved={savedVendorIds.includes(vendor.id)}
          onOpen={() => onOpenVendor(vendor)}
          onToggleSaved={() => onToggleSaved(vendor.id)}
        />
      ))}

      <View style={styles.toolGrid}>
        <ToolCard
          title="Калькулятор"
          text="Город, гости, стиль и бюджет."
          icon={Calculator}
        />
        <ToolCard
          title="Чек-лист"
          text="Задачи от даты свадьбы."
          icon={ListChecks}
        />
      </View>
    </View>
  );
}

function getCategoryIcon(category: string): LucideIcon {
  if (category.includes('Фото')) return Camera;
  if (category.includes('Видео')) return Video;
  if (category.includes('Декор')) return Palette;
  if (category.includes('зал')) return Building2;
  if (category.includes('Ведущ')) return Mic2;
  if (category.includes('Организ')) return UserRoundCheck;
  if (category.includes('Артист') || category.includes('DJ')) return Music2;
  if (category.includes('Плать') || category.includes('Костюм')) return Shirt;
  if (category.includes('Авто')) return CarFront;
  if (category.includes('Торт')) return CakeSlice;
  if (category.includes('Флорист')) return Flower2;
  if (category.includes('Свет') || category.includes('звук')) return Volume2;
  if (category.includes('Ювел')) return Gem;
  return Sparkles;
}
