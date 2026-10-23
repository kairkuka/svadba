import type { LucideIcon } from 'lucide-react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import {
  ArrowDownUp,
  Banknote,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Eye,
  Grid2X2,
  Heart,
  List,
  MapPin,
  MessageCircle,
  PhoneCall,
  Play,
  RotateCcw,
  Search,
  Share2,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Linking,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DataState } from '../../components/DataState';
import { EmptyState } from '../../components/EmptyState';
import { VendorCard } from '../../components/VendorCard';
import { getVendorImageSource } from '../../data/vendorImages';
import { colors, styles } from '../../theme/styles';
import type { Vendor } from '../../types';
import { formatMoney } from '../../utils/format';

export type CatalogSort = 'recommended' | 'rating' | 'price';
type CatalogViewMode = 'list' | 'choice';
type SwipeDirection = 'left' | 'right';

const SWIPE_THRESHOLD = 72;
const SWIPE_EXIT_DISTANCE = 520;
const SHORTS_SWIPE_THRESHOLD = 64;
const SHORTS_VERTICAL_EXIT = 760;
const SHORTS_HORIZONTAL_EXIT = 620;

const priceOptions: Array<{ label: string; value: number | null }> = [
  { label: 'Любая', value: null },
  { label: 'до 250 000', value: 250000 },
  { label: 'до 500 000', value: 500000 },
  { label: 'до 1 млн', value: 1000000 },
];

const ratingOptions = [
  { label: 'Любой', value: 0 },
  { label: '4.5+', value: 4.5 },
  { label: '4.8+', value: 4.8 },
];

const sortOptions: Array<{ label: string; value: CatalogSort }> = [
  { label: 'Рекомендуемые', value: 'recommended' },
  { label: 'По рейтингу', value: 'rating' },
  { label: 'Сначала дешевле', value: 'price' },
];

export function CatalogScreen({
  vendors,
  categories,
  cities,
  savedVendorIds,
  searchQuery,
  selectedCategory,
  selectedCity,
  maxPrice,
  minRating,
  sort,
  onSearchChange,
  onCategoryChange,
  onCityChange,
  onMaxPriceChange,
  onMinRatingChange,
  onSortChange,
  onOpenVendor,
  onToggleSaved,
  onShortsFullscreenChange,
  minimalMode = false,
  isLoading,
  error,
  onRetry,
}: {
  vendors: Vendor[];
  categories: string[];
  cities: string[];
  savedVendorIds: string[];
  searchQuery: string;
  selectedCategory: string;
  selectedCity: string;
  maxPrice: number | null;
  minRating: number;
  sort: CatalogSort;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onCityChange: (city: string) => void;
  onMaxPriceChange: (price: number | null) => void;
  onMinRatingChange: (rating: number) => void;
  onSortChange: (sort: CatalogSort) => void;
  onOpenVendor: (vendor: Vendor) => void;
  onToggleSaved: (vendorId: string) => void;
  onShortsFullscreenChange?: (isFullscreen: boolean) => void;
  minimalMode?: boolean;
  isLoading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<CatalogViewMode>('choice');
  const [shortsOpen, setShortsOpen] = useState(false);
  const [choiceIndex, setChoiceIndex] = useState(0);
  const activeFilterCount =
    Number(selectedCity !== 'Все города') +
    Number(maxPrice !== null) +
    Number(minRating > 0) +
    Number(sort !== 'recommended');
  const currentVendor = vendors[choiceIndex] ?? null;
  const hasChoiceDeck = currentVendor !== null;

  useEffect(() => {
    setChoiceIndex(0);
  }, [searchQuery, selectedCategory, selectedCity, maxPrice, minRating, sort]);

  useEffect(() => {
    if (choiceIndex >= vendors.length) {
      setChoiceIndex(Math.max(vendors.length - 1, 0));
    }
  }, [choiceIndex, vendors.length]);

  useEffect(() => {
    onShortsFullscreenChange?.(shortsOpen);

    return () => onShortsFullscreenChange?.(false);
  }, [onShortsFullscreenChange, shortsOpen]);

  const resetFilters = () => {
    onSearchChange('');
    onCategoryChange('Все');
    onCityChange('Все города');
    onMaxPriceChange(null);
    onMinRatingChange(0);
    onSortChange('recommended');
    setShortsOpen(false);
  };

  const showNextVendor = () => {
    setChoiceIndex((current) =>
      vendors.length === 0 ? 0 : Math.min(current + 1, vendors.length),
    );
  };

  const saveAndShowNext = (vendor: Vendor) => {
    if (!savedVendorIds.includes(vendor.id)) {
      onToggleSaved(vendor.id);
    }

    showNextVendor();
  };

  const openShortsCategory = (category: string) => {
    onCategoryChange(category);
    setChoiceIndex(0);
    setShortsOpen(true);
  };

  const backToCategoryChoices = () => {
    onCategoryChange('Все');
    setChoiceIndex(0);
    setShortsOpen(false);
  };

  const saveVendor = (vendor: Vendor) => {
    if (!savedVendorIds.includes(vendor.id)) {
      onToggleSaved(vendor.id);
    }
  };

  if (shortsOpen) {
    return (
      <View style={styles.catalogFullscreenHost}>
        {vendors.length === 0 ? (
          <View style={styles.choiceEmptyCard}>
            <Heart color={colors.coral} size={28} strokeWidth={2.4} />
            <Text style={styles.cardTitle}>Все подрядчики просмотрены</Text>
            <Text style={styles.cardText}>
              Можно выбрать другую категорию или открыть список.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={backToCategoryChoices}
              style={({ pressed }) => [
                styles.choiceResetButton,
                pressed && styles.pressed,
              ]}
            >
              <Grid2X2 color={colors.teal} size={17} strokeWidth={2.5} />
              <Text style={styles.linkText}>К категориям</Text>
            </Pressable>
          </View>
        ) : hasChoiceDeck ? (
          <ShortsVendorViewer
            vendor={currentVendor}
            isSaved={savedVendorIds.includes(currentVendor.id)}
            currentIndex={choiceIndex + 1}
            totalCount={vendors.length}
            onBackToCategories={backToCategoryChoices}
            onContact={() => openWhatsApp(currentVendor)}
            onNext={showNextVendor}
            onOpen={() => onOpenVendor(currentVendor)}
            onPrevious={() =>
              setChoiceIndex((current) => Math.max(current - 1, 0))
            }
            onSave={() => saveVendor(currentVendor)}
          />
        ) : (
          <View style={styles.choiceEmptyCard}>
            <Heart color={colors.coral} size={28} strokeWidth={2.4} />
            <Text style={styles.cardTitle}>Все подрядчики просмотрены</Text>
            <Text style={styles.cardText}>
              Можно выбрать другую категорию или открыть список.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={backToCategoryChoices}
              style={({ pressed }) => [
                styles.choiceResetButton,
                pressed && styles.pressed,
              ]}
            >
              <Grid2X2 color={colors.teal} size={17} strokeWidth={2.5} />
              <Text style={styles.linkText}>К категориям</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  if (minimalMode) {
    return (
      <ScrollView contentContainerStyle={styles.minimalCatalogContent}>
        <CategoryChoiceGrid
          categories={categories}
          vendors={vendors}
          onSelectCategory={openShortsCategory}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.screenStack}>
      <View>
        <Text style={styles.screenTitle}>Каталог подрядчиков</Text>
        <Text style={styles.screenSubtitle}>
          Выберите специалиста под дату, город и бюджет свадьбы.
        </Text>
      </View>

      <View style={styles.catalogModeSwitch}>
        <ModeButton
          label="Список"
          icon={List}
          active={viewMode === 'list'}
          onPress={() => setViewMode('list')}
        />
        <ModeButton
          label="Выбор"
          icon={Heart}
          active={viewMode === 'choice'}
          onPress={() => {
            setViewMode('choice');
            if (selectedCategory === 'Все') {
              setShortsOpen(false);
            }
          }}
        />
      </View>

      <View style={styles.searchBox}>
        <Search
          color={colors.muted}
          size={20}
          strokeWidth={2.4}
          style={styles.searchIcon}
        />
        <TextInput
          accessibilityLabel="Поиск подрядчиков"
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Имя, категория или город"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          style={[styles.searchInput, styles.searchField]}
        />
        {searchQuery ? (
          <Pressable
            accessibilityLabel="Очистить поиск"
            accessibilityRole="button"
            onPress={() => onSearchChange('')}
            style={({ pressed }) => [
              styles.searchClearButton,
              pressed && styles.pressed,
            ]}
          >
            <X color={colors.muted} size={18} strokeWidth={2.5} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {['Все', ...categories].map((category) => (
          <FilterChip
            key={category}
            label={category}
            active={selectedCategory === category}
            onPress={() => onCategoryChange(category)}
          />
        ))}
      </ScrollView>

      <View style={styles.filterHeader}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setFiltersOpen((current) => !current)}
          style={({ pressed }) => [
            styles.filterToggle,
            filtersOpen && styles.filterToggleActive,
            pressed && styles.pressed,
          ]}
        >
          <SlidersHorizontal
            color={filtersOpen ? colors.surface : colors.ink}
            size={18}
            strokeWidth={2.5}
          />
          <Text
            style={[
              styles.filterToggleText,
              filtersOpen && styles.filterToggleTextActive,
            ]}
          >
            Фильтры
          </Text>
          {activeFilterCount > 0 ? (
            <View style={styles.activeFilterBadge}>
              <Text style={styles.activeFilterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
          {filtersOpen ? (
            <ChevronUp color={colors.surface} size={17} strokeWidth={2.5} />
          ) : (
            <ChevronDown color={colors.ink} size={17} strokeWidth={2.5} />
          )}
        </Pressable>

        {activeFilterCount > 0 || searchQuery || selectedCategory !== 'Все' ? (
          <Pressable
            accessibilityRole="button"
            onPress={resetFilters}
            style={({ pressed }) => [
              styles.resetFilters,
              pressed && styles.pressed,
            ]}
          >
            <RotateCcw color={colors.teal} size={16} strokeWidth={2.4} />
            <Text style={styles.linkText}>Сбросить</Text>
          </Pressable>
        ) : null}
      </View>

      {filtersOpen ? (
        <View style={styles.filterPanel}>
          <FilterGroup title="Город" icon={MapPin}>
            {['Все города', ...cities].map((city) => (
              <FilterChip
                key={city}
                label={city}
                active={selectedCity === city}
                onPress={() => onCityChange(city)}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Бюджет от" icon={Banknote}>
            {priceOptions.map((option) => (
              <FilterChip
                key={option.label}
                label={option.label}
                active={maxPrice === option.value}
                onPress={() => onMaxPriceChange(option.value)}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Рейтинг" icon={Star}>
            {ratingOptions.map((option) => (
              <FilterChip
                key={option.label}
                label={option.label}
                active={minRating === option.value}
                onPress={() => onMinRatingChange(option.value)}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Сортировка" icon={ArrowDownUp}>
            {sortOptions.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                active={sort === option.value}
                onPress={() => onSortChange(option.value)}
              />
            ))}
          </FilterGroup>
        </View>
      ) : null}

      <View style={styles.resultBar}>
        <Text style={styles.resultText}>{formatVendorCount(vendors.length)}</Text>
        <View style={styles.inlineMeta}>
          <ArrowDownUp color={colors.muted} size={14} strokeWidth={2.4} />
          <Text style={styles.resultSort}>
            {sortOptions.find((option) => option.value === sort)?.label}
          </Text>
        </View>
      </View>

      <DataState isLoading={isLoading} error={error} onRetry={onRetry} />

      {vendors.length === 0 ? (
        <EmptyState
          title="Ничего не найдено"
          text="Попробуйте расширить бюджет или сбросить часть фильтров."
        />
      ) : viewMode === 'choice' ? (
        <CategoryChoiceGrid
          categories={categories}
          vendors={vendors}
          onSelectCategory={openShortsCategory}
        />
      ) : (
        vendors.map((vendor) => (
          <VendorCard
            key={vendor.id}
            vendor={vendor}
            isSaved={savedVendorIds.includes(vendor.id)}
            onOpen={() => onOpenVendor(vendor)}
            onToggleSaved={() => onToggleSaved(vendor.id)}
          />
        ))
      )}
      </View>
    </ScrollView>
  );
}

function openWhatsApp(vendor: Vendor) {
  const phone = vendor.contactPhone.replace(/\D/g, '');
  const message = encodeURIComponent(
    `Здравствуйте! Нашли вас на SVADBA.kz. Хотим уточнить дату и условия: ${vendor.name}`,
  );

  void Linking.openURL(`https://wa.me/${phone}?text=${message}`);
}

function CategoryChoiceGrid({
  categories,
  vendors,
  onSelectCategory,
}: {
  categories: string[];
  vendors: Vendor[];
  onSelectCategory: (category: string) => void;
}) {
  return (
    <View style={styles.categoryChoiceWrap}>
      <View style={styles.categoryChoiceGrid}>
        {categories.map((category) => {
          const categoryVendors = vendors.filter(
            (vendor) => vendor.category === category,
          );
          const previewVendor = categoryVendors[0] ?? ({ category } as Vendor);
          const isAvailable = categoryVendors.length > 0;

          return (
            <Pressable
              key={category}
              accessibilityRole="button"
              disabled={!isAvailable}
              onPress={() => onSelectCategory(category)}
              style={({ pressed }) => [
                styles.categoryChoiceCard,
                !isAvailable && styles.categoryChoiceCardDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Image
                accessibilityIgnoresInvertColors
                resizeMode="cover"
                source={getVendorImageSource(previewVendor)}
                style={styles.categoryChoiceImage}
              />
              <View style={styles.categoryChoiceShade} />
              <View style={styles.categoryChoiceCopy}>
                <Text numberOfLines={2} style={styles.categoryChoiceTitle}>
                  {category}
                </Text>
                <Text style={styles.categoryChoiceMeta}>
                  {formatVendorCount(categoryVendors.length)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ShortsVendorViewer({
  vendor,
  isSaved,
  currentIndex,
  totalCount,
  onBackToCategories,
  onContact,
  onNext,
  onOpen,
  onPrevious,
  onSave,
}: {
  vendor: Vendor;
  isSaved: boolean;
  currentIndex: number;
  totalCount: number;
  onBackToCategories: () => void;
  onContact: () => void;
  onNext: () => void;
  onOpen: () => void;
  onPrevious: () => void;
  onSave: () => void;
}) {
  const isFirst = currentIndex === 1;
  const isLast = currentIndex >= totalCount;
  const [carouselIndex, setCarouselIndex] = useState(0);
  const videoUrls =
    vendor.shortVideoUrls && vendor.shortVideoUrls.length > 0
      ? vendor.shortVideoUrls
      : vendor.shortVideoUrl
        ? [vendor.shortVideoUrl]
        : [];
  const activeCarouselIndex =
    videoUrls.length > 0 ? Math.min(carouselIndex, videoUrls.length - 1) : 0;
  const activeVideoUrl = videoUrls[activeCarouselIndex] ?? null;
  const hasCarousel = videoUrls.length > 1;
  const swipeTranslate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const swipeOpacity = useRef(new Animated.Value(1)).current;
  const shortsSceneAnimatedStyle = useMemo(
    () => ({
      opacity: swipeOpacity,
      transform: [
        { translateX: swipeTranslate.x },
        { translateY: swipeTranslate.y },
        {
          scale: swipeTranslate.y.interpolate({
            inputRange: [-260, 0, 260],
            outputRange: [0.97, 1, 0.97],
            extrapolate: 'clamp',
          }),
        },
      ],
    }),
    [swipeOpacity, swipeTranslate.x, swipeTranslate.y],
  );

  useEffect(() => {
    setCarouselIndex(0);
  }, [vendor.id]);

  const resetSwipePosition = useCallback(() => {
    Animated.parallel([
      Animated.spring(swipeTranslate, {
        toValue: { x: 0, y: 0 },
        damping: 18,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(swipeOpacity, {
        toValue: 1,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [swipeOpacity, swipeTranslate]);

  const animateSwipeTransition = useCallback(
    ({
      onComplete,
      startValue,
      targetValue,
    }: {
      onComplete: () => void;
      startValue: { x: number; y: number };
      targetValue: { x: number; y: number };
    }) => {
      Animated.parallel([
        Animated.timing(swipeTranslate, {
          toValue: targetValue,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(swipeOpacity, {
          toValue: 0.74,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished) {
          return;
        }

        onComplete();
        swipeTranslate.setValue(startValue);
        swipeOpacity.setValue(0.82);
        resetSwipePosition();
      });
    },
    [resetSwipePosition, swipeOpacity, swipeTranslate],
  );

  const runSwipeByDelta = useCallback(
    (deltaY: number) => {
      if (deltaY < -SHORTS_SWIPE_THRESHOLD && !isLast) {
        animateSwipeTransition({
          onComplete: onNext,
          startValue: { x: 0, y: SHORTS_VERTICAL_EXIT },
          targetValue: { x: 0, y: -SHORTS_VERTICAL_EXIT },
        });
        return;
      }

      if (deltaY > SHORTS_SWIPE_THRESHOLD && !isFirst) {
        animateSwipeTransition({
          onComplete: onPrevious,
          startValue: { x: 0, y: -SHORTS_VERTICAL_EXIT },
          targetValue: { x: 0, y: SHORTS_VERTICAL_EXIT },
        });
        return;
      }

      resetSwipePosition();
    },
    [
      animateSwipeTransition,
      isFirst,
      isLast,
      onNext,
      onPrevious,
      resetSwipePosition,
    ],
  );
  const showNextCarouselItem = useCallback(() => {
    setCarouselIndex((current) => (current + 1) % videoUrls.length);
  }, [videoUrls.length]);
  const showPreviousCarouselItem = useCallback(() => {
    setCarouselIndex(
      (current) => (current - 1 + videoUrls.length) % videoUrls.length,
    );
  }, [videoUrls.length]);
  const runHorizontalSwipe = useCallback(
    (deltaX: number, deltaY: number) => {
      if (
        hasCarousel &&
        Math.abs(deltaX) > SHORTS_SWIPE_THRESHOLD &&
        Math.abs(deltaX) > Math.abs(deltaY)
      ) {
        if (deltaX < 0) {
          animateSwipeTransition({
            onComplete: showNextCarouselItem,
            startValue: { x: SHORTS_HORIZONTAL_EXIT, y: 0 },
            targetValue: { x: -SHORTS_HORIZONTAL_EXIT, y: 0 },
          });
          return true;
        }

        animateSwipeTransition({
          onComplete: showPreviousCarouselItem,
          startValue: { x: -SHORTS_HORIZONTAL_EXIT, y: 0 },
          targetValue: { x: SHORTS_HORIZONTAL_EXIT, y: 0 },
        });
        return true;
      }

      return false;
    },
    [
      animateSwipeTransition,
      hasCarousel,
      showNextCarouselItem,
      showPreviousCarouselItem,
    ],
  );
  const shortsPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dx) > 8 || Math.abs(gestureState.dy) > 8,
        onPanResponderGrant: () => {
          swipeTranslate.stopAnimation();
          swipeOpacity.stopAnimation();
          swipeTranslate.setValue({ x: 0, y: 0 });
          swipeOpacity.setValue(1);
        },
        onPanResponderMove: (_event, gestureState) => {
          const isHorizontalIntent =
            hasCarousel &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy);

          swipeTranslate.setValue({
            x: isHorizontalIntent
              ? gestureState.dx * 0.92
              : gestureState.dx * 0.14,
            y: isHorizontalIntent
              ? gestureState.dy * 0.08
              : gestureState.dy * 0.92,
          });
          swipeOpacity.setValue(
            Math.max(
              0.86,
              1 - Math.hypot(gestureState.dx, gestureState.dy) / 1400,
            ),
          );
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (runHorizontalSwipe(gestureState.dx, gestureState.dy)) {
            return;
          }

          runSwipeByDelta(gestureState.dy);
        },
        onPanResponderTerminate: (_event, gestureState) => {
          if (runHorizontalSwipe(gestureState.dx, gestureState.dy)) {
            return;
          }

          runSwipeByDelta(gestureState.dy);
        },
      }),
    [
      hasCarousel,
      runHorizontalSwipe,
      runSwipeByDelta,
      swipeOpacity,
      swipeTranslate,
    ],
  );
  const videoPlayer = useVideoPlayer(
    activeVideoUrl ? { uri: activeVideoUrl } : null,
    (player) => {
      player.loop = true;
      player.muted = true;
      player.play();
    },
  );

  useEffect(() => {
    if (!activeVideoUrl) {
      return undefined;
    }

    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();

    return () => videoPlayer.pause();
  }, [activeVideoUrl, videoPlayer]);

  return (
    <View style={styles.shortsShell}>
      <Animated.View
        style={[styles.shortsAnimatedScene, shortsSceneAnimatedStyle]}
      >
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="cover"
          source={getVendorImageSource(vendor)}
          style={styles.shortsMedia}
        />
        {activeVideoUrl ? (
          <VideoView
            allowsPictureInPicture={false}
            contentFit="cover"
            key={activeVideoUrl}
            nativeControls={false}
            player={videoPlayer}
            style={styles.shortsVideo}
          />
        ) : null}
        <View style={styles.shortsShade} />
        <View {...shortsPanResponder.panHandlers} style={styles.shortsSwipeLayer} />

      <View style={styles.shortsTopBar}>
        <Pressable
          accessibilityRole="button"
          onPress={onBackToCategories}
          style={({ pressed }) => [
            styles.shortsTopButton,
            pressed && styles.pressed,
          ]}
        >
          <Grid2X2 color={colors.surface} size={31} strokeWidth={2.8} />
          <Text style={styles.shortsTopButtonText}>Категории</Text>
        </Pressable>
      </View>

      {hasCarousel ? (
        <View style={styles.shortsCarouselDots}>
          {videoUrls.map((url, index) => (
            <View
              key={url}
              style={[
                styles.shortsCarouselDot,
                index === activeCarouselIndex &&
                  styles.shortsCarouselDotActive,
              ]}
            />
          ))}
        </View>
      ) : null}

      {activeVideoUrl ? null : (
        <View style={styles.shortsPlayBadge}>
          <Play
            color={colors.surface}
            fill={colors.surface}
            size={36}
            strokeWidth={2.8}
          />
        </View>
      )}

      <View style={styles.shortsActionRail}>
        <Pressable
          accessibilityLabel="Открыть профиль подрядчика"
          accessibilityRole="button"
          onPress={onOpen}
          style={({ pressed }) => [
            styles.shortsAvatar,
            pressed && styles.pressed,
          ]}
        >
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={getVendorImageSource(vendor)}
            style={styles.shortsAvatarImage}
          />
        </Pressable>
        <ShortsAction
          icon={Heart}
          label={String(vendor.reviewCount)}
          active={isSaved}
          onPress={onSave}
        />
        <ShortsAction
          icon={MessageCircle}
          label={String(vendor.reviews.length)}
          onPress={onOpen}
        />
        <ShortsAction
          icon={Bookmark}
          active={isSaved}
          onPress={onSave}
        />
        <ShortsAction icon={Share2} onPress={onOpen} />
      </View>

      <View style={styles.shortsCaption}>
        <Pressable
          accessibilityRole="button"
          onPress={onOpen}
          style={({ pressed }) => [
            styles.shortsNameRow,
            pressed && styles.pressed,
          ]}
        >
          <Text numberOfLines={1} style={styles.shortsVendorName}>
            {vendor.name}
          </Text>
          {vendor.verified ? (
              <BadgeCheck
                color={colors.green}
                fill={colors.greenSoft}
                size={36}
                strokeWidth={2.8}
              />
          ) : null}
        </Pressable>
        <Text numberOfLines={1} style={styles.shortsMeta}>
          {vendor.category} · {vendor.city} · от {formatMoney(vendor.priceFrom)}
        </Text>
        <Text numberOfLines={2} style={styles.shortsDescription}>
          {vendor.description}
        </Text>
        <View style={styles.shortsButtonRow}>
          <Pressable
            accessibilityRole="button"
            onPress={onContact}
            style={({ pressed }) => [
              styles.shortsContactButton,
              pressed && styles.pressed,
            ]}
          >
            <PhoneCall color={colors.surface} size={31} strokeWidth={2.8} />
            <Text style={styles.shortsContactText}>Связаться</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onOpen}
            style={({ pressed }) => [
              styles.shortsProfileButton,
              pressed && styles.pressed,
            ]}
          >
            <Eye color={colors.surface} size={31} strokeWidth={2.8} />
            <Text style={styles.shortsProfileText}>Профиль</Text>
          </Pressable>
        </View>
      </View>

      </Animated.View>
    </View>
  );
}

function ShortsAction({
  icon: Icon,
  label,
  active = false,
  onPress,
}: {
  icon: LucideIcon;
  label?: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.shortsActionButton,
        active && styles.shortsActionButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <Icon
        color={colors.surface}
        fill={active ? colors.surface : 'transparent'}
        size={46}
        strokeWidth={2.05}
      />
      {label ? <Text style={styles.shortsActionText}>{label}</Text> : null}
    </Pressable>
  );
}

function ModeButton({
  label,
  icon: Icon,
  active,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.catalogModeButton,
        active && styles.catalogModeButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <Icon
        color={active ? colors.surface : colors.muted}
        size={17}
        strokeWidth={2.5}
      />
      <Text
        style={[
          styles.catalogModeButtonText,
          active && styles.catalogModeButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ChoiceVendorCard({
  vendor,
  isSaved,
  currentIndex,
  totalCount,
  onOpen,
  onSkip,
  onSave,
}: {
  vendor: Vendor;
  isSaved: boolean;
  currentIndex: number;
  totalCount: number;
  onOpen: () => void;
  onSkip: () => void;
  onSave: () => void;
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const yesOpacity = pan.x.interpolate({
    inputRange: [24, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const noOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -24],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const rotate = pan.x.interpolate({
    inputRange: [-180, 0, 180],
    outputRange: ['-9deg', '0deg', '9deg'],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
  }, [pan, vendor.id]);

  const resetSwipe = useCallback(() => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [pan]);

  const runSwipe = useCallback(
    (direction: SwipeDirection) => {
      Animated.timing(pan, {
        toValue: {
          x: direction === 'right' ? SWIPE_EXIT_DISTANCE : -SWIPE_EXIT_DISTANCE,
          y: 18,
        },
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        pan.setValue({ x: 0, y: 0 });

        if (direction === 'right') {
          onSave();
          return;
        }

        onSkip();
      });
    },
    [onSave, onSkip, pan],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          pan.setValue({ x: gesture.dx, y: gesture.dy * 0.2 });
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > SWIPE_THRESHOLD) {
            runSwipe('right');
            return;
          }

          if (gesture.dx < -SWIPE_THRESHOLD) {
            runSwipe('left');
            return;
          }

          resetSwipe();
        },
        onPanResponderTerminate: resetSwipe,
      }),
    [pan, resetSwipe, runSwipe],
  );

  return (
    <View style={styles.choiceDeck}>
      <View style={styles.choiceProgressRow}>
        <Text style={styles.resultText}>
          {currentIndex} из {totalCount}
        </Text>
        <Text style={styles.resultSort}>режим выбора</Text>
      </View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.choiceCard,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { rotate },
            ],
          },
        ]}
      >
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="cover"
          source={getVendorImageSource(vendor)}
          style={styles.choiceCardImage}
        />
        <View style={styles.choiceCardShade} />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.choiceSwipeBadge,
            styles.choiceYesBadge,
            { opacity: yesOpacity },
          ]}
        >
          <Text style={[styles.choiceSwipeText, styles.choiceYesText]}>ДА</Text>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.choiceSwipeBadge,
            styles.choiceNoBadge,
            { opacity: noOpacity },
          ]}
        >
          <Text style={[styles.choiceSwipeText, styles.choiceNoText]}>НЕТ</Text>
        </Animated.View>
        <View style={styles.choiceAvailabilityPill}>
          <CalendarDays color={colors.gold} size={14} strokeWidth={2.5} />
          <Text numberOfLines={2} style={styles.choiceAvailabilityText}>
            {vendor.availability}
          </Text>
        </View>
        <View style={styles.choiceCardBody}>
          <View style={styles.statusRow}>
            <View style={styles.choiceCategoryPill}>
              <Text style={styles.choiceCategoryText}>{vendor.category}</Text>
            </View>
            {vendor.verified ? (
              <BadgeCheck
                accessibilityLabel="Проверенный подрядчик"
                color={colors.green}
                fill={colors.greenSoft}
                size={21}
                strokeWidth={2.6}
              />
            ) : null}
          </View>
          <Text numberOfLines={2} style={styles.choiceTitle}>
            {vendor.name}
          </Text>
          <View style={styles.choiceMetaRow}>
            <View style={styles.choiceMetaItem}>
              <MapPin color={colors.surface} size={15} strokeWidth={2.4} />
              <Text style={styles.choiceMetaText}>{vendor.city}</Text>
            </View>
            <View style={styles.choiceMetaItem}>
              <Star
                color={colors.gold}
                fill={colors.gold}
                size={15}
                strokeWidth={2}
              />
              <Text style={styles.choiceMetaText}>{vendor.rating}</Text>
            </View>
          </View>
          <Text style={styles.choicePrice}>от {formatMoney(vendor.priceFrom)}</Text>
        </View>

        <View style={styles.choiceActionRow}>
          <Pressable
            accessibilityLabel="Пропустить подрядчика"
            accessibilityRole="button"
            onPress={() => runSwipe('left')}
            style={({ pressed }) => [
              styles.choiceRoundButton,
              styles.choiceSkipButton,
              pressed && styles.pressed,
            ]}
          >
            <X color={colors.coral} size={25} strokeWidth={2.7} />
          </Pressable>
          <Pressable
            accessibilityLabel="Открыть подрядчика"
            accessibilityRole="button"
            onPress={onOpen}
            style={({ pressed }) => [
              styles.choiceOpenButton,
              pressed && styles.pressed,
            ]}
          >
            <Eye color={colors.surface} size={22} strokeWidth={2.5} />
            <Text style={styles.choiceOpenButtonText}>Открыть</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={
              isSaved ? 'Подрядчик уже в избранном' : 'Сохранить подрядчика'
            }
            accessibilityRole="button"
            onPress={() => runSwipe('right')}
            style={({ pressed }) => [
              styles.choiceRoundButton,
              styles.choiceSaveButton,
              isSaved && styles.choiceSaveButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Heart
              color={colors.coral}
              fill={isSaved ? colors.coral : 'transparent'}
              size={25}
              strokeWidth={2.5}
            />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

function FilterGroup({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.filterGroup}>
      <View style={styles.filterGroupTitleRow}>
        <Icon color={colors.teal} size={17} strokeWidth={2.4} />
        <Text style={styles.filterGroupTitle}>{title}</Text>
      </View>
      <View style={styles.filterOptions}>{children}</View>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active && styles.filterChipActive,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.filterChipText,
          active && styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function formatVendorCount(count: number) {
  const remainder100 = count % 100;
  const remainder10 = count % 10;

  if (remainder100 >= 11 && remainder100 <= 14) {
    return `${count} подрядчиков`;
  }

  if (remainder10 === 1) {
    return `${count} подрядчик`;
  }

  if (remainder10 >= 2 && remainder10 <= 4) {
    return `${count} подрядчика`;
  }

  return `${count} подрядчиков`;
}
