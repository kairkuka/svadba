import type { LucideIcon } from 'lucide-react-native';
import {
  BadgeCheck,
  Bookmark,
  Check,
  Grid2X2,
  Heart,
  MessageCircle,
  Play,
  Share2,
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
  Share,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { getVendorImageSource } from '../../data/vendorImages';
import { colors, styles } from '../../theme/styles';
import type { Vendor } from '../../types';
import { formatMoney } from '../../utils/format';

export type CatalogSort = 'recommended' | 'rating' | 'price';
export type CatalogMode = 'feed' | 'categories';

const SHORTS_SWIPE_THRESHOLD = 64;
const SHORTS_VERTICAL_EXIT = 760;
const SHORTS_HORIZONTAL_EXIT = 620;

export function CatalogScreen({
  vendors,
  categories,
  mode,
  initialShortsCategories = [],
  initialShortsOpen = false,
  savedVendorIds,
  onOpenVendor,
  onToggleSaved,
}: {
  vendors: Vendor[];
  categories: string[];
  mode: CatalogMode;
  initialShortsCategories?: string[];
  initialShortsOpen?: boolean;
  savedVendorIds: string[];
  onOpenVendor: (vendor: Vendor) => void;
  onToggleSaved: (vendorId: string) => void;
}) {
  const { width } = useWindowDimensions();
  const [shortsOpen, setShortsOpen] = useState(initialShortsOpen);
  const [activeCategories, setActiveCategories] = useState<string[]>(
    initialShortsCategories,
  );
  const [choiceIndex, setChoiceIndex] = useState(0);
  const [likedVendorIds, setLikedVendorIds] = useState<string[]>([]);
  const visibleVendors = useMemo(
    () =>
      activeCategories.length === 0
        ? vendors
        : vendors.filter((vendor) => activeCategories.includes(vendor.category)),
    [activeCategories, vendors],
  );
  const currentVendor = visibleVendors[choiceIndex] ?? null;
  const compactLayout = width <= 430;

  useEffect(() => {
    if (mode === 'feed') {
      setActiveCategories(initialShortsCategories.length ? initialShortsCategories : []);
      setChoiceIndex(0);
      setShortsOpen(true);
      return;
    }

    setActiveCategories([]);
    setChoiceIndex(0);
    setShortsOpen(false);
  }, [mode]);

  useEffect(() => {
    setChoiceIndex(0);
  }, [activeCategories, vendors]);

  useEffect(() => {
    if (choiceIndex >= visibleVendors.length) {
      setChoiceIndex(Math.max(visibleVendors.length - 1, 0));
    }
  }, [choiceIndex, visibleVendors.length]);

  const openShortsCategories = (selectedCategories: string[]) => {
    setActiveCategories(selectedCategories);
    setChoiceIndex(0);
    setShortsOpen(true);
  };

  const backToCategoryChoices = () => {
    setActiveCategories([]);
    setChoiceIndex(0);
    setShortsOpen(false);
  };

  const showNextVendor = () => {
    setChoiceIndex((current) =>
      visibleVendors.length === 0
        ? 0
        : Math.min(current + 1, visibleVendors.length),
    );
  };

  const showPreviousVendor = () => {
    setChoiceIndex((current) => Math.max(current - 1, 0));
  };

  const saveVendor = (vendor: Vendor) => {
    if (!savedVendorIds.includes(vendor.id)) {
      onToggleSaved(vendor.id);
    }
  };
  const toggleLikeVendor = (vendor: Vendor) => {
    setLikedVendorIds((current) =>
      current.includes(vendor.id)
        ? current.filter((id) => id !== vendor.id)
        : [...current, vendor.id],
    );
  };
  const shareVendor = (vendor: Vendor) => {
    void Share.share({
      message: `${vendor.name} на SVADBA.kz: ${vendor.category}, ${vendor.city}, от ${formatMoney(vendor.priceFrom)}. https://svadba.kz/vendors/${vendor.id}`,
      title: vendor.name,
    }).catch(() => undefined);
  };

  if (shortsOpen && currentVendor) {
    return (
      <View style={styles.catalogFullscreenHost}>
        <ShortsVendorViewer
          vendor={currentVendor}
          isLiked={likedVendorIds.includes(currentVendor.id)}
          isSaved={savedVendorIds.includes(currentVendor.id)}
          currentIndex={choiceIndex + 1}
          totalCount={visibleVendors.length}
          onBackToCategories={backToCategoryChoices}
          onContact={() => openWhatsApp(currentVendor)}
          compactLayout={compactLayout}
          onNext={showNextVendor}
          onOpen={() => onOpenVendor(currentVendor)}
          onPrevious={showPreviousVendor}
          onLike={() => toggleLikeVendor(currentVendor)}
          onSave={() => saveVendor(currentVendor)}
          onShare={() => shareVendor(currentVendor)}
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.minimalCatalogContent}>
      <CategoryChoiceGrid
        categories={categories}
        compactLayout={compactLayout}
        vendors={vendors}
        onStartShorts={openShortsCategories}
      />
    </ScrollView>
  );
}

function CategoryChoiceGrid({
  categories,
  compactLayout,
  vendors,
  onStartShorts,
}: {
  categories: string[];
  compactLayout: boolean;
  vendors: Vendor[];
  onStartShorts: (categories: string[]) => void;
}) {
  const availableCategories = useMemo(
    () =>
      categories.filter((category) =>
        vendors.some(
          (vendor) =>
            vendor.category === category && getVendorVideoUrls(vendor).length > 0,
        ),
      ),
    [categories, vendors],
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  const canStart = selectedCategories.length > 0;

  return (
    <View style={styles.categoryChoiceWrap}>
      <View style={styles.categoryChoiceIntro}>
        <Text style={styles.categoryChoiceHeaderTitle}>Что ищете?</Text>
        <Text style={styles.categoryChoiceHeaderMeta}>
          Выберите одно или несколько направлений
        </Text>
      </View>
      <View style={styles.categoryChoiceGrid}>
        {availableCategories.map((category) => {
          const categoryVendors = vendors.filter(
            (vendor) =>
              vendor.category === category && getVendorVideoUrls(vendor).length > 0,
          );
          const previewVendor = categoryVendors[0];
          const isSelected = selectedCategories.includes(category);

          return (
            <Pressable
              key={category}
              accessibilityRole="button"
              onPress={() => toggleCategory(category)}
              style={({ pressed }) => [
                styles.categoryChoiceCard,
                compactLayout && styles.categoryChoiceCardCompact,
                isSelected && styles.categoryChoiceCardSelected,
                pressed && styles.pressed,
              ]}
            >
              <CategoryVideoCover
                compactLayout={compactLayout}
                vendor={previewVendor}
              />
              <View style={styles.categoryChoiceShade} />
              <View
                style={[
                  styles.categoryChoiceCheck,
                  isSelected && styles.categoryChoiceCheckSelected,
                ]}
              >
                {isSelected ? (
                  <Check color={colors.surface} size={18} strokeWidth={3} />
                ) : null}
              </View>
              <View
                style={[
                  styles.categoryChoiceCopy,
                  compactLayout && styles.categoryChoiceCopyCompact,
                ]}
              >
                <Text
                  numberOfLines={2}
                  style={[
                    styles.categoryChoiceTitle,
                    compactLayout && styles.categoryChoiceTitleCompact,
                  ]}
                >
                  {category}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.categoryChoiceVendor,
                    compactLayout && styles.categoryChoiceVendorCompact,
                  ]}
                >
                  {previewVendor.name}
                </Text>
                <Text
                  style={[
                    styles.categoryChoiceMeta,
                    compactLayout && styles.categoryChoiceMetaCompact,
                  ]}
                >
                  {formatVendorCount(categoryVendors.length)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.categoryChoiceFooter}>
        <Pressable
          accessibilityRole="button"
          disabled={!canStart}
          onPress={() => onStartShorts(selectedCategories)}
          style={({ pressed }) => [
            styles.categoryChoiceNextButton,
            !canStart && styles.categoryChoiceNextButtonDisabled,
            pressed && canStart && styles.pressed,
          ]}
        >
          <Text style={styles.categoryChoiceNextText}>Смотреть</Text>
          <Text style={styles.categoryChoiceNextCount}>
            {canStart ? String(selectedCategories.length) : '0'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function CategoryVideoCover({
  vendor,
}: {
  compactLayout: boolean;
  vendor: Vendor;
}) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      resizeMode="cover"
      source={getVendorImageSource(vendor)}
      style={styles.categoryChoiceImage}
    />
  );
}

function ShortsVendorViewer({
  vendor,
  isLiked,
  isSaved,
  currentIndex,
  totalCount,
  onBackToCategories,
  onContact,
  compactLayout,
  onNext,
  onOpen,
  onPrevious,
  onLike,
  onSave,
  onShare,
}: {
  vendor: Vendor;
  isLiked: boolean;
  isSaved: boolean;
  currentIndex: number;
  totalCount: number;
  onBackToCategories: () => void;
  onContact: () => void;
  compactLayout: boolean;
  onNext: () => void;
  onOpen: () => void;
  onPrevious: () => void;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
}) {
  const isFirst = currentIndex === 1;
  const isLast = currentIndex >= totalCount;
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
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
  const topIconSize = compactLayout ? 24 : 31;
  const actionIconSize = compactLayout ? 34 : 46;
  const verifiedIconSize = compactLayout ? 25 : 36;
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
    setDescriptionExpanded(false);
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
  const safelyBackToCategories = useCallback(() => {
    setTimeout(onBackToCategories, 80);
  }, [onBackToCategories]);

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
        <View style={styles.shortsShade} />
        <View
          {...shortsPanResponder.panHandlers}
          style={[
            styles.shortsSwipeLayer,
            compactLayout && styles.shortsSwipeLayerCompact,
          ]}
        />

        <View
          style={[
            styles.shortsTopBar,
            compactLayout && styles.shortsTopBarCompact,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={safelyBackToCategories}
            style={({ pressed }) => [
              styles.shortsTopButton,
              compactLayout && styles.shortsTopButtonCompact,
              pressed && styles.pressed,
            ]}
          >
            <Grid2X2 color={colors.surface} size={topIconSize} strokeWidth={2.5} />
          </Pressable>
        </View>

        {hasCarousel ? (
          <View
            style={[
              styles.shortsCarouselDots,
              compactLayout && styles.shortsCarouselDotsCompact,
            ]}
          >
            {videoUrls.map((url, index) => (
              <View
                key={url}
                style={[
                  styles.shortsCarouselDot,
                  compactLayout && styles.shortsCarouselDotCompact,
                  index === activeCarouselIndex &&
                    styles.shortsCarouselDotActive,
                  compactLayout &&
                    index === activeCarouselIndex &&
                    styles.shortsCarouselDotActiveCompact,
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

        <View
          style={[
            styles.shortsActionRail,
            compactLayout && styles.shortsActionRailCompact,
          ]}
        >
          <Pressable
            accessibilityLabel="Открыть профиль подрядчика"
            accessibilityRole="button"
            onPress={onOpen}
            style={({ pressed }) => [
              styles.shortsAvatar,
              compactLayout && styles.shortsAvatarCompact,
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
            active={isLiked}
            compactLayout={compactLayout}
            iconSize={actionIconSize}
            onPress={onLike}
          />
          <ShortsAction
            icon={MessageCircle}
            label={String(vendor.reviews.length)}
            compactLayout={compactLayout}
            iconSize={actionIconSize}
            onPress={onContact}
          />
          <ShortsAction
            icon={Bookmark}
            active={isSaved}
            compactLayout={compactLayout}
            iconSize={actionIconSize}
            onPress={onSave}
          />
          <ShortsAction
            icon={Share2}
            compactLayout={compactLayout}
            iconSize={actionIconSize}
            onPress={onShare}
          />
        </View>

        <View
          style={[
            styles.shortsCaption,
            compactLayout && styles.shortsCaptionCompact,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={onOpen}
            style={({ pressed }) => [
              styles.shortsNameRow,
              compactLayout && styles.shortsNameRowCompact,
              pressed && styles.pressed,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.shortsVendorName,
                compactLayout && styles.shortsVendorNameCompact,
              ]}
            >
              {vendor.name}
            </Text>
            {vendor.verified ? (
                <BadgeCheck
                  color={colors.green}
                  fill={colors.greenSoft}
                  size={verifiedIconSize}
                  strokeWidth={2.5}
                />
            ) : null}
          </Pressable>
          <Text
            numberOfLines={1}
            style={[styles.shortsMeta, compactLayout && styles.shortsMetaCompact]}
          >
            {vendor.category} · {vendor.city} · от {formatMoney(vendor.priceFrom)}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setDescriptionExpanded((expanded) => !expanded)}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Text
              numberOfLines={descriptionExpanded ? undefined : 2}
              style={[
                styles.shortsDescription,
                compactLayout && styles.shortsDescriptionCompact,
              ]}
            >
              {vendor.description}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

function ShortsAction({
  icon: Icon,
  label,
  active = false,
  compactLayout,
  iconSize,
  onPress,
}: {
  icon: LucideIcon;
  label?: string;
  active?: boolean;
  compactLayout: boolean;
  iconSize: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.shortsActionButton,
        compactLayout && styles.shortsActionButtonCompact,
        active && styles.shortsActionButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <Icon
        color={colors.surface}
        fill={active ? colors.surface : 'transparent'}
        size={iconSize}
        strokeWidth={2.05}
      />
      {label ? (
        <Text
          style={[
            styles.shortsActionText,
            compactLayout && styles.shortsActionTextCompact,
          ]}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

function openWhatsApp(vendor: Vendor) {
  const phone = vendor.contactPhone.replace(/\D/g, '');
  const message = encodeURIComponent(
    `Здравствуйте! Нашли вас на SVADBA.kz. Хотим уточнить дату и условия: ${vendor.name}`,
  );

  void Linking.openURL(`https://wa.me/${phone}?text=${message}`).catch(() => undefined);
}

function getVendorVideoUrls(vendor: Vendor) {
  if (vendor.shortVideoUrls && vendor.shortVideoUrls.length > 0) {
    return vendor.shortVideoUrls;
  }

  return vendor.shortVideoUrl ? [vendor.shortVideoUrl] : [];
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
