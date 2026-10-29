import type { LucideIcon } from 'lucide-react-native';
import { useEventListener } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import {
  BadgeCheck,
  Bookmark,
  Check,
  Flag,
  Grid2X2,
  Heart,
  MessageCircle,
  Send,
  Play,
  Share2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { KeyboardSafeScrollView as ScrollView } from '../../components/KeyboardSafeScrollView';
import { getCategoryImageSource, getVendorImageSource } from '../../data/vendorImages';
import { MediaCommentRow } from '../../components/MediaCommentRow';
import { useBottomNavigationLayout } from '../../components/AppLayout';
import { colors, styles } from '../../theme/styles';
import type { Vendor } from '../../types';
import { getFeaturedVisualStyle, sortFeaturedFirst } from '../../utils/featured';
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
  likedMediaIds,
  savedVendorIds,
  onSubmitMediaComment,
  onReportComment,
  onReportMedia,
  onToggleMediaLiked,
  onOpenVendor,
  onOpenReviews,
  onToggleSaved,
}: {
  vendors: Vendor[];
  categories: string[];
  mode: CatalogMode;
  initialShortsCategories?: string[];
  initialShortsOpen?: boolean;
  likedMediaIds: string[];
  savedVendorIds: string[];
  onSubmitMediaComment: (vendorId: string, mediaId: string, text: string) => Promise<boolean>;
  onReportComment: (vendorId: string, mediaId: string, commentId: string) => Promise<boolean>;
  onReportMedia: (vendorId: string, mediaId: string) => Promise<boolean>;
  onToggleMediaLiked: (vendorId: string, mediaId: string) => void;
  onOpenVendor: (vendor: Vendor) => void;
  onOpenReviews: (vendor: Vendor) => void;
  onToggleSaved: (vendorId: string) => void;
}) {
  const { width } = useWindowDimensions();
  const [shortsOpen, setShortsOpen] = useState(initialShortsOpen);
  const [activeCategories, setActiveCategories] = useState<string[]>(
    initialShortsCategories,
  );
  const [choiceIndex, setChoiceIndex] = useState(0);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const visibleVendors = useMemo(() => {
    const scopedVendors =
      activeCategories.length === 0
        ? vendors
        : vendors.filter((vendor) => activeCategories.includes(vendor.category));

    return sortFeaturedFirst(scopedVendors);
  }, [activeCategories, vendors]);
  const activeVendorIndex = activeVendorId
    ? visibleVendors.findIndex((vendor) => vendor.id === activeVendorId)
    : -1;
  const safeChoiceIndex =
    activeVendorIndex >= 0
      ? activeVendorIndex
      : Math.min(choiceIndex, Math.max(visibleVendors.length - 1, 0));
  const currentVendor = visibleVendors[safeChoiceIndex] ?? null;
  const compactLayout = width <= 430;

  useEffect(() => {
    if (mode === 'feed') {
      setActiveCategories(initialShortsCategories.length ? initialShortsCategories : []);
      setChoiceIndex(0);
      setActiveVendorId(null);
      setShortsOpen(true);
      return;
    }

    setActiveCategories([]);
    setChoiceIndex(0);
    setActiveVendorId(null);
    setShortsOpen(false);
  }, [mode]);

  useEffect(() => {
    setChoiceIndex(0);
    setActiveVendorId(null);
  }, [activeCategories]);

  useEffect(() => {
    if (choiceIndex >= visibleVendors.length) {
      setChoiceIndex(Math.max(visibleVendors.length - 1, 0));
    }
  }, [choiceIndex, visibleVendors.length]);

  useEffect(() => {
    if (shortsOpen && !activeVendorId && currentVendor) {
      setActiveVendorId(currentVendor.id);
    }
  }, [activeVendorId, currentVendor, shortsOpen]);

  const openShortsCategories = (selectedCategories: string[]) => {
    setActiveCategories(selectedCategories);
    setChoiceIndex(0);
    setActiveVendorId(null);
    setShortsOpen(true);
  };

  const backToCategoryChoices = () => {
    setActiveCategories([]);
    setChoiceIndex(0);
    setActiveVendorId(null);
    setShortsOpen(false);
  };

  const showNextVendor = () => {
    const nextIndex =
      visibleVendors.length === 0
        ? 0
        : Math.min(safeChoiceIndex + 1, visibleVendors.length - 1);
    setChoiceIndex(nextIndex);
    setActiveVendorId(visibleVendors[nextIndex]?.id ?? null);
  };

  const showPreviousVendor = () => {
    const nextIndex = Math.max(safeChoiceIndex - 1, 0);
    setChoiceIndex(nextIndex);
    setActiveVendorId(visibleVendors[nextIndex]?.id ?? null);
  };

  const saveVendor = (vendor: Vendor) => {
    onToggleSaved(vendor.id);
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
          likedMediaIds={likedMediaIds}
          isSaved={savedVendorIds.includes(currentVendor.id)}
          currentIndex={safeChoiceIndex + 1}
          totalCount={visibleVendors.length}
          onBackToCategories={backToCategoryChoices}
          onOpenReviews={() => onOpenReviews(currentVendor)}
          compactLayout={compactLayout}
          onNext={showNextVendor}
          onOpen={() => onOpenVendor(currentVendor)}
          onPrevious={showPreviousVendor}
          onMediaLike={(mediaId) => onToggleMediaLiked(currentVendor.id, mediaId)}
          onSubmitMediaComment={(mediaId, text) =>
            onSubmitMediaComment(currentVendor.id, mediaId, text)
          }
          onReportComment={(mediaId, commentId) =>
            onReportComment(currentVendor.id, mediaId, commentId)
          }
          onReportMedia={(mediaId) => onReportMedia(currentVendor.id, mediaId)}
          onSave={() => saveVendor(currentVendor)}
          onShare={() => shareVendor(currentVendor)}
          preloadUrls={[
            ...getVendorVideoUrls(visibleVendors[safeChoiceIndex - 1] ?? currentVendor),
            ...getVendorVideoUrls(visibleVendors[safeChoiceIndex + 1] ?? currentVendor),
          ].filter((url) => url !== getVendorVideoUrls(currentVendor)[0]).slice(0, 2)}
        />
      </View>
    );
  }

  return (
      <CategoryChoiceGrid
        categories={categories}
        compactLayout={compactLayout}
        onStartShorts={openShortsCategories}
      />
  );
}

function CategoryChoiceGrid({
  categories,
  compactLayout,
  onStartShorts,
}: {
  categories: string[];
  compactLayout: boolean;
  onStartShorts: (categories: string[]) => void;
}) {
  const { width } = useWindowDimensions();
  const { bottomBarHeight } = useBottomNavigationLayout();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const categoryCardWidth: `${number}%` =
    width >= 1080 ? '24.2%' : width >= 700 ? '32.45%' : '48.55%';

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
      <ScrollView
        bottomOverlayHeight={64}
        reserveBottomNavigation
        contentContainerStyle={styles.categoryChoiceScrollContent}
      >
        <View style={styles.categoryChoiceIntro}>
          <Text style={styles.categoryChoiceHeaderTitle}>Что ищете?</Text>
          <Text style={styles.categoryChoiceHeaderMeta}>
            Выберите одно или несколько направлений
          </Text>
        </View>
        <View style={styles.categoryChoiceGrid}>
          {categories.map((category) => {
            const isSelected = selectedCategories.includes(category);

            return (
              <Pressable
                key={category}
                accessibilityRole="button"
                accessibilityLabel={category}
                onPress={() => toggleCategory(category)}
                style={({ pressed }) => [
                  styles.categoryChoiceCard,
                  { width: categoryCardWidth },
                  compactLayout && styles.categoryChoiceCardCompact,
                  isSelected && styles.categoryChoiceCardSelected,
                  pressed && styles.pressed,
                ]}
              >
                <CategoryVideoCover category={category} />
                <View style={styles.categoryChoiceLabelPill}>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    numberOfLines={2}
                    style={styles.categoryChoiceLabelText}
                  >
                    {category}
                  </Text>
                </View>
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
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={[styles.categoryChoiceFooter, { bottom: bottomBarHeight }]}>
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
          <View style={styles.categoryChoiceNextCountBadge}>
            <Text style={styles.categoryChoiceNextCountText}>
              {canStart ? String(selectedCategories.length) : '0'}
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function CategoryVideoCover({
  category,
}: {
  category: string;
}) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      resizeMode="cover"
      source={getCategoryImageSource(category)}
      style={styles.categoryChoiceImage}
    />
  );
}

function ShortsVendorViewer({
  vendor,
  likedMediaIds,
  isSaved,
  currentIndex,
  totalCount,
  onBackToCategories,
  onOpenReviews,
  compactLayout,
  onNext,
  onOpen,
  onPrevious,
  onMediaLike,
  onSave,
  onShare,
  onSubmitMediaComment,
  onReportComment,
  onReportMedia,
  preloadUrls,
}: {
  vendor: Vendor;
  likedMediaIds: string[];
  isSaved: boolean;
  currentIndex: number;
  totalCount: number;
  onBackToCategories: () => void;
  onOpenReviews: () => void;
  compactLayout: boolean;
  onNext: () => void;
  onOpen: () => void;
  onPrevious: () => void;
  onMediaLike: (mediaId: string) => void;
  onSave: () => void;
  onShare: () => void;
  onSubmitMediaComment: (mediaId: string, text: string) => Promise<boolean>;
  onReportComment: (mediaId: string, commentId: string) => Promise<boolean>;
  onReportMedia: (mediaId: string) => Promise<boolean>;
  preloadUrls: string[];
}) {
  const { bottomBarHeight } = useBottomNavigationLayout();
  const isFirst = currentIndex === 1;
  const isLast = currentIndex >= totalCount;
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentStatus, setCommentStatus] = useState('');
  const videoUrls = getVendorVideoUrls(vendor);
  const activeCarouselIndex =
    videoUrls.length > 0 ? Math.min(carouselIndex, videoUrls.length - 1) : 0;
  const activeVideoUrl = videoUrls[activeCarouselIndex] ?? null;
  const activeMediaId = getVendorShortMediaId(vendor, activeCarouselIndex);
  const activeMediaItem = vendor.media?.find((item) => item.id === activeMediaId);
  const activeMediaStats =
    vendor.mediaStats?.[activeMediaId] ??
    activeMediaItem ??
    { commentCount: 0, comments: [], likeCount: 0 };
  const activeMediaBaseLikeCount = activeMediaItem ? 0 : getVendorLikeCount(vendor);
  const activeMediaLikeCount = Math.max(
    0,
    activeMediaBaseLikeCount + Number(activeMediaStats.likeCount || 0),
  );
  const activeMediaComments = activeMediaStats.comments || [];
  const activeMediaCommentCount = Number(
    activeMediaStats.commentCount ?? activeMediaComments.length,
  );
  const activeMediaLiked = likedMediaIds.includes(activeMediaId);
  const hasCarousel = videoUrls.length > 1;
  const topIconSize = 24;
  const actionIconSize = 24;
  const verifiedIconSize = compactLayout ? 14 : 16;
  const featuredVisual = getFeaturedVisualStyle(vendor.featured);
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
    setCommentsOpen(false);
    setCommentDraft('');
    setCommentStatus('');
  }, [vendor.id]);

  useEffect(() => {
    setCommentsOpen(false);
    setCommentDraft('');
    setCommentStatus('');
  }, [activeMediaId]);

  const submitComment = async () => {
    const text = commentDraft.trim();
    if (!text) {
      setCommentStatus('Напишите комментарий');
      return;
    }
    setCommentStatus('Отправляем...');
    const saved = await onSubmitMediaComment(activeMediaId, text);
    setCommentStatus(saved ? 'Комментарий добавлен' : 'Не удалось отправить');
    if (saved) {
      setCommentDraft('');
    }
  };

  const reportMedia = async () => {
    setCommentStatus('Отправляем жалобу...');
    const saved = await onReportMedia(activeMediaId);
    setCommentStatus(saved ? 'Жалоба отправлена' : 'Не удалось отправить жалобу');
  };

  const reportComment = async (commentId: string) => {
    setCommentStatus('Отправляем жалобу...');
    const saved = await onReportComment(activeMediaId, commentId);
    setCommentStatus(saved ? 'Жалоба отправлена' : 'Не удалось отправить жалобу');
  };

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
      targetValue,
    }: {
      onComplete: () => void;
      targetValue: { x: number; y: number };
    }) => {
      Animated.parallel([
        Animated.timing(swipeTranslate, {
          toValue: {
            x: targetValue.x * 0.06,
            y: targetValue.y * 0.06,
          },
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(swipeOpacity, {
          toValue: 0.92,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished) {
          return;
        }

        onComplete();
        swipeTranslate.setValue({ x: 0, y: 0 });
        swipeOpacity.setValue(0.94);
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
          targetValue: { x: 0, y: -SHORTS_VERTICAL_EXIT },
        });
        return;
      }

      if (deltaY > SHORTS_SWIPE_THRESHOLD && !isFirst) {
        animateSwipeTransition({
          onComplete: onPrevious,
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
            targetValue: { x: -SHORTS_HORIZONTAL_EXIT, y: 0 },
          });
          return true;
        }

        animateSwipeTransition({
          onComplete: showPreviousCarouselItem,
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
        <ShortsMediaSurface
          bottomInset={bottomBarHeight}
          fallbackSource={getVendorImageSource(vendor)}
          key={`${vendor.id}-${activeVideoUrl || 'image'}`}
          uri={activeVideoUrl}
        />
        {preloadUrls.map((url) => (
          <ShortsVideoPreloader key={url} uri={url} />
        ))}
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
            accessibilityLabel="Вернуться к категориям"
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
              size={32}
              strokeWidth={2.8}
            />
          </View>
        )}

        <View
          style={[
            styles.shortsActionRail,
            compactLayout && styles.shortsActionRailCompact,
            { bottom: bottomBarHeight + 64 },
          ]}
        >
          <Pressable
            accessibilityLabel="Открыть профиль подрядчика"
            accessibilityRole="button"
            onPress={onOpen}
            style={({ pressed }) => [
              styles.shortsAvatar,
              compactLayout && styles.shortsAvatarCompact,
              featuredVisual && [
                styles.shortsAvatarFeatured,
                {
                  backgroundColor: featuredVisual.ringInner,
                  borderColor: featuredVisual.ringOuter,
                  shadowColor: featuredVisual.ringOuter,
                },
              ],
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
            accessibilityLabel={
              activeMediaLiked
                ? `Убрать лайк с видео. Лайков: ${activeMediaLikeCount}`
                : `Поставить лайк видео. Лайков: ${activeMediaLikeCount}`
            }
            icon={Heart}
            label={String(activeMediaLikeCount)}
            active={activeMediaLiked}
            compactLayout={compactLayout}
            iconSize={actionIconSize}
            onPress={() => onMediaLike(activeMediaId)}
          />
          <ShortsAction
            accessibilityLabel={`Открыть комментарии видео. Комментариев: ${activeMediaCommentCount}`}
            icon={MessageCircle}
            label={String(activeMediaCommentCount)}
            compactLayout={compactLayout}
            iconSize={actionIconSize}
            onPress={() => setCommentsOpen(true)}
          />
          <ShortsAction
            accessibilityLabel={
              isSaved ? 'Убрать из избранного' : 'Добавить в избранное'
            }
            icon={Bookmark}
            active={isSaved}
            compactLayout={compactLayout}
            iconSize={actionIconSize}
            onPress={onSave}
          />
          <ShortsAction
            accessibilityLabel="Поделиться подрядчиком"
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
            { bottom: bottomBarHeight + 12 },
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
          {vendor.featured?.enabled && featuredVisual ? (
            <View
              style={[
                styles.shortsFeaturedBadge,
                compactLayout && styles.shortsFeaturedBadgeCompact,
                {
                  backgroundColor: featuredVisual.badgeBackground,
                  borderColor: featuredVisual.badgeBorder,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.shortsFeaturedBadgeText,
                  compactLayout && styles.shortsFeaturedBadgeTextCompact,
                  { color: featuredVisual.badgeText },
                ]}
              >
                {vendor.featured.badgeText}
              </Text>
            </View>
          ) : null}
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
            {vendor.description.length > 80 ? (
              <Text style={styles.shortsDescriptionMore}>
                {descriptionExpanded ? 'Свернуть' : 'Ещё'}
              </Text>
            ) : null}
          </Pressable>
        </View>
      </Animated.View>
      <Modal
        animationType="slide"
        onRequestClose={() => setCommentsOpen(false)}
        transparent
        visible={commentsOpen}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
          style={styles.mediaCommentsSheet}
        >
          <View style={styles.mediaCommentsPanel}>
            <View style={styles.mediaCommentsHeader}>
              <Text style={styles.mediaCommentsTitle}>Комментарии к видео</Text>
              <View style={styles.mediaCommentsHeaderActions}>
                <Pressable
                  accessibilityLabel="Пожаловаться на публикацию"
                  accessibilityRole="button"
                  onPress={reportMedia}
                  style={styles.mediaCommentsClose}
                >
                  <Flag color={colors.surface} size={20} strokeWidth={2.2} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Закрыть комментарии"
                  onPress={() => setCommentsOpen(false)}
                  style={styles.mediaCommentsClose}
                >
                  <X color={colors.surface} size={22} strokeWidth={2.2} />
                </Pressable>
              </View>
            </View>
            <ScrollView
              automaticallyAdjustKeyboardInsets={false}
              contentContainerStyle={styles.mediaCommentsList}
              keyboardShouldPersistTaps="handled"
            >
              {activeMediaComments.length ? (
                activeMediaComments.map((comment) => (
                  <MediaCommentRow
                    comment={comment}
                    key={comment.id}
                    onReport={() => void reportComment(comment.id)}
                  />
                ))
              ) : (
                <View style={styles.clientEmptyCard}>
                  <Text style={styles.clientEmptyTitle}>Комментариев пока нет</Text>
                  <Text style={styles.clientEmptyText}>
                    Здесь будут комментарии именно этого видео.
                  </Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.mediaCommentComposer}>
              <TextInput
                blurOnSubmit={false}
                placeholder="Написать комментарий"
                placeholderTextColor="#7E8790"
                onChangeText={setCommentDraft}
                onSubmitEditing={submitComment}
                returnKeyType="send"
                value={commentDraft}
                style={styles.mediaCommentInput}
              />
              <Pressable
                accessibilityRole="button"
                onPress={submitComment}
                style={styles.mediaCommentSend}
              >
                <Send color={colors.surface} size={19} strokeWidth={2.3} />
              </Pressable>
            </View>
            {commentStatus ? (
              <Text style={styles.mediaUploadStatus}>{commentStatus}</Text>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function ShortsMediaSurface({
  bottomInset,
  fallbackSource,
  uri,
}: {
  bottomInset: number;
  fallbackSource: ReturnType<typeof getVendorImageSource>;
  uri: string | null;
}) {
  const [muted, setMuted] = useState(true);
  const player = useVideoPlayer(uri, (nextPlayer) => {
    nextPlayer.loop = true;
    nextPlayer.muted = true;
  });
  const [status, setStatus] = useState(player.status);

  useEventListener(player, 'statusChange', ({ status: nextStatus }) => {
    setStatus(nextStatus);
    if (nextStatus === 'readyToPlay') player.play();
  });

  useEffect(() => {
    player.muted = muted;
    if (uri && player.status === 'readyToPlay') player.play();
    return () => player.pause();
  }, [muted, player, uri]);

  return (
    <View style={styles.shortsMedia}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={fallbackSource}
        style={styles.shortsMedia}
      />
      {uri ? (
        <VideoView
          contentFit="cover"
          nativeControls={false}
          player={player}
          playsInline
          style={styles.shortsVideo}
          surfaceType="textureView"
        />
      ) : null}
      {uri && status !== 'readyToPlay' && status !== 'error' ? (
        <View pointerEvents="none" style={styles.shortsLoadingState}>
          <ActivityIndicator color={colors.surface} size="large" />
        </View>
      ) : null}
      {uri && status === 'error' ? (
        <View pointerEvents="none" style={styles.shortsLoadingState}>
          <Text style={styles.shortsVideoErrorText}>Видео не загрузилось</Text>
        </View>
      ) : null}
      {uri ? (
        <Pressable
          accessibilityLabel={muted ? 'Включить звук' : 'Выключить звук'}
          accessibilityRole="button"
          onPress={() => setMuted((value) => !value)}
          style={[styles.shortsMuteButton, { bottom: bottomInset + 16 }]}
        >
          {muted ? (
            <VolumeX color={colors.surface} size={20} strokeWidth={2.2} />
          ) : (
            <Volume2 color={colors.surface} size={20} strokeWidth={2.2} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

function ShortsVideoPreloader({ uri }: { uri: string }) {
  useVideoPlayer(uri);
  return null;
}

function ShortsAction({
  accessibilityLabel,
  icon: Icon,
  label,
  active = false,
  compactLayout,
  iconSize,
  onPress,
}: {
  accessibilityLabel: string;
  icon: LucideIcon;
  label?: string;
  active?: boolean;
  compactLayout: boolean;
  iconSize: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
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

function getVendorVideoUrls(vendor: Vendor) {
  if (vendor.shortVideoUrls && vendor.shortVideoUrls.length > 0) {
    return vendor.shortVideoUrls;
  }

  return vendor.shortVideoUrl ? [vendor.shortVideoUrl] : [];
}

function getVendorShortMediaId(vendor: Vendor, index: number) {
  const media = vendor.media?.filter((item) => item.type === 'video');
  return media?.[index]?.id || `${vendor.id}:short:${index}`;
}

function getVendorLikeCount(vendor: Vendor) {
  return Math.max(0, Number(vendor.likeCount ?? vendor.reviewCount ?? 0));
}
