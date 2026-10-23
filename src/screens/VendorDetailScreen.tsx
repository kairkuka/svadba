import {
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Clapperboard,
  ChevronLeft,
  ChevronRight,
  Flag,
  Grid2X2,
  Heart,
  MapPin,
  MessageCircle,
  Play,
  Repeat2,
  Send,
  ShieldCheck,
  Star,
  UserRound,
  Volume2,
  VolumeX,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useEventListener } from 'expo';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  type ImageSourcePropType,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

import {
  getVendorImageSource,
  getVendorPortfolioSources,
} from '../data/vendorImages';
import { MediaCommentRow } from '../components/MediaCommentRow';
import { colors, styles } from '../theme/styles';
import type {
  MediaComment,
  MediaLikeUser,
  Vendor,
  VendorMediaItem,
} from '../types';
import { formatMoney } from '../utils/format';

type ProfileMediaEntry = {
  id: string;
  uri: string;
  source: ImageSourcePropType;
  type: 'image' | 'video';
  caption: string;
  likeCount: number;
  likedByPreview: MediaLikeUser[];
  saveCount: number;
  commentCount: number;
  comments: MediaComment[];
  index: number;
};

function pluralizeRu(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function VendorDetailScreen({
  vendor,
  initialBookingCalendarOpen = false,
  initialBookingCreated = false,
  initialProfileTab = 'media',
  isSaved,
  isSelfPreview = false,
  likedMediaIds = [],
  savedMediaIds = [],
  media,
  onBack,
  onBlock,
  onBook,
  onMediaView,
  onFetchMediaLikes,
  onReport,
  onReportComment,
  onReportMedia,
  onSubmitMediaComment,
  onToggleMediaLiked,
  onToggleMediaSaved,
  onToggleSaved,
}: {
  vendor: Vendor;
  initialBookingCalendarOpen?: boolean;
  initialBookingCreated?: boolean;
  initialProfileTab?: 'media' | 'reviews';
  isSaved: boolean;
  isSelfPreview?: boolean;
  likedMediaIds?: string[];
  savedMediaIds?: string[];
  media?: VendorMediaItem[];
  onBack: () => void;
  onBlock: () => void;
  onBook: (date: string, timeFrom: string, timeTo: string) => boolean | string | Promise<boolean | string>;
  onMediaView?: () => void;
  onFetchMediaLikes?: (mediaId: string) => Promise<MediaLikeUser[]>;
  onReport: () => void;
  onReportComment?: (mediaId: string, commentId: string) => Promise<boolean>;
  onReportMedia?: (mediaId: string) => Promise<boolean>;
  onSubmitMediaComment?: (mediaId: string, text: string) => Promise<boolean>;
  onToggleMediaLiked?: (mediaId: string) => void;
  onToggleMediaSaved?: (mediaId: string) => void;
  onToggleSaved: () => void;
}) {
  const { height, width } = useWindowDimensions();
  const [profileTab, setProfileTab] = useState<
    'grid' | 'reels' | 'reviews' | 'tagged'
  >(
    initialProfileTab === 'reviews' ? 'reviews' : 'grid',
  );
  const [bookingCalendarOpen, setBookingCalendarOpen] = useState(
    initialBookingCalendarOpen,
  );
  const [bookingCreated, setBookingCreated] = useState(initialBookingCreated);
  const [bookingMessage, setBookingMessage] = useState('');
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [commentsMediaIndex, setCommentsMediaIndex] = useState<number | null>(null);
  const [likesMediaIndex, setLikesMediaIndex] = useState<number | null>(null);
  const [mediaLikers, setMediaLikers] = useState<MediaLikeUser[]>([]);
  const [mediaLikersLoading, setMediaLikersLoading] = useState(false);
  const closeProfileMediaViewer = () => {
    setCommentsMediaIndex(null);
    setLikesMediaIndex(null);
    setSelectedMediaIndex(null);
  };
  const profileMediaEdgeSwipe = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) => event.nativeEvent.pageX <= 32,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          gesture.x0 <= 32 &&
          gesture.dx > 10 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dx >= 60 && Math.abs(gesture.dy) <= 90) {
            closeProfileMediaViewer();
          }
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [],
  );
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [mediaCommentDraft, setMediaCommentDraft] = useState('');
  const [mediaCommentStatus, setMediaCommentStatus] = useState('');
  const [selectedBookingDate, setSelectedBookingDate] = useState(() =>
    getDefaultBookingDate(vendor.availability),
  );
  const [selectedTimeFrom, setSelectedTimeFrom] = useState('18:00');
  const [selectedTimeTo, setSelectedTimeTo] = useState('23:00');
  const [visibleBookingMonth, setVisibleBookingMonth] = useState(() =>
    getDefaultBookingMonth(vendor.availability),
  );
  const uploadedMedia = media?.length ? media : vendor.media ?? [];
  const uploadedSources: ImageSourcePropType[] =
    uploadedMedia.map((item) => ({ uri: item.uri }));
  const portfolioSources = uploadedSources.length
    ? uploadedSources
    : getVendorPortfolioSources(vendor);
  const mediaItems: ProfileMediaEntry[] = uploadedSources.length
    ? uploadedMedia.slice(0, 18).map((item, index) => ({
        id: item.id,
        uri: item.uri,
        source: { uri: item.uri } as ImageSourcePropType,
        type: item.type,
        caption: item.caption || vendor.description,
        likeCount: Number(item.likeCount || vendor.mediaStats?.[item.id]?.likeCount || 0),
        likedByPreview:
          item.likedByPreview || vendor.mediaStats?.[item.id]?.likedByPreview || [],
        saveCount: Number(item.saveCount ?? vendor.mediaStats?.[item.id]?.saveCount ?? 0),
        commentCount: Number(
          item.commentCount ?? vendor.mediaStats?.[item.id]?.commentCount ?? 0,
        ),
        comments: item.comments || vendor.mediaStats?.[item.id]?.comments || [],
        index,
      }))
    : [...portfolioSources, ...portfolioSources].slice(0, 6).map((source, index) => {
        const id = `${vendor.id}:profile:${index}`;
        const stats = vendor.mediaStats?.[id];
        return {
          id,
          uri: '',
          source,
          type: 'image' as const,
          caption: vendor.description,
          likeCount: Number(stats?.likeCount || 0),
          likedByPreview: stats?.likedByPreview || [],
          saveCount: Number(stats?.saveCount || 0),
          commentCount: Number(stats?.commentCount || 0),
          comments: stats?.comments || [],
          index,
        };
      });
  const mediaSources = mediaItems.map((item) => item.source);
  const storyItems = [
    ...mediaItems.filter((item) => uploadedMedia[item.index]?.role === 'story'),
    ...mediaItems.filter((item) => uploadedMedia[item.index]?.role !== 'story'),
  ];
  const highlights = mediaSources.length ? [
    { label: vendor.category, source: storyItems[0]?.source },
    { label: 'Свадьбы', source: storyItems[1]?.source },
    { label: 'Команда', source: storyItems[2]?.source },
    { label: 'Отзывы', source: storyItems[3]?.source },
    { label: 'За кадром', source: storyItems[4]?.source },
  ].filter((item) => item.source) : [];
  const mediaEntries = mediaItems.map((item, index) => ({ ...item, index }));
  const visibleMediaEntries =
    profileTab === 'tagged'
      ? mediaEntries.slice(3)
      : profileTab === 'reels'
        ? mediaEntries.filter((item) => item.type === 'video')
        : mediaEntries;
  const viewerMediaItems = visibleMediaEntries;
  const compactLayout = width <= 430;
  const calendarIconSize = 20;
  const bookingCalendar = getBookingCalendarRows(visibleBookingMonth);
  const visibleMonthTitle = getMonthTitle(visibleBookingMonth);
  const previousMonthDisabled = isPastBookingMonth(visibleBookingMonth);
  const bookingTimeError = getBookingTimeError(selectedTimeFrom, selectedTimeTo);
  const availabilityLabel = getDisplayAvailability(vendor.availability);
  const commentsMedia =
    commentsMediaIndex === null ? null : viewerMediaItems[commentsMediaIndex] ?? null;
  useEffect(() => {
    setMediaCommentDraft('');
    setMediaCommentStatus('');
  }, [commentsMedia?.id]);
  const changeBookingMonth = (delta: number) => {
    setVisibleBookingMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  };
  const submitSelectedMediaComment = async () => {
    if (!commentsMedia || !onSubmitMediaComment) return;
    const text = mediaCommentDraft.trim();
    if (!text) {
      setMediaCommentStatus('Напишите комментарий');
      return;
    }
    setMediaCommentStatus('Отправляем...');
    const saved = await onSubmitMediaComment(commentsMedia.id, text);
    setMediaCommentStatus(saved ? 'Комментарий добавлен' : 'Не удалось отправить');
    if (saved) {
      setMediaCommentDraft('');
    }
  };
  const reportSelectedMedia = async () => {
    if (!commentsMedia || !onReportMedia) return;
    setMediaCommentStatus('Отправляем жалобу...');
    const saved = await onReportMedia(commentsMedia.id);
    setMediaCommentStatus(saved ? 'Жалоба отправлена' : 'Не удалось отправить жалобу');
  };
  const reportSelectedComment = async (commentId: string) => {
    if (!commentsMedia || !onReportComment) return;
    setMediaCommentStatus('Отправляем жалобу...');
    const saved = await onReportComment(commentsMedia.id, commentId);
    setMediaCommentStatus(saved ? 'Жалоба отправлена' : 'Не удалось отправить жалобу');
  };
  const openMediaLikes = async (index: number) => {
    const item = viewerMediaItems[index];
    if (!item) return;
    setLikesMediaIndex(index);
    setMediaLikers(item.likedByPreview || []);
    if (!onFetchMediaLikes) return;
    setMediaLikersLoading(true);
    try {
      setMediaLikers(await onFetchMediaLikes(item.id));
    } catch {
      setMediaLikers(item.likedByPreview || []);
    } finally {
      setMediaLikersLoading(false);
    }
  };

  return (
    <View style={styles.vendorDetailStack}>
      <View
        style={[
          styles.detailHeader,
          compactLayout && styles.detailHeaderCompact,
          styles.detailReferenceHeader,
        ]}
      >
        <View style={styles.detailReferenceIdentity}>
          <View style={styles.detailReferenceAvatarRing}>
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="cover"
              source={getVendorImageSource(vendor)}
              style={styles.detailReferenceAvatarImage}
            />
          </View>
          <View style={styles.detailReferenceIdentityCopy}>
            <View style={styles.detailReferenceNameRow}>
              <Text
                numberOfLines={1}
                style={styles.detailReferenceName}
              >
                {vendor.name}
              </Text>
              {vendor.verified ? (
                <BadgeCheck
                  accessibilityLabel="Проверенный подрядчик"
                  color="#4A8BFF"
                  fill="#102A5C"
                  size={15}
                  strokeWidth={2.5}
                />
              ) : null}
            </View>
            <Text style={styles.detailReferenceCategory}>{vendor.category}</Text>
            <View style={styles.detailReferenceLocation}>
              <MapPin color="#98A1AA" size={12} strokeWidth={2.2} />
              <Text style={styles.detailReferenceLocationText}>{vendor.city}</Text>
            </View>
          </View>
          {isSelfPreview ? null : (
            <Pressable
              accessibilityLabel={isSaved ? 'Отписаться' : 'Подписаться'}
              accessibilityRole="button"
              onPress={onToggleSaved}
              style={({ pressed }) => [
                styles.detailReferenceFollow,
                isSaved && styles.detailReferenceFollowActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.detailReferenceFollowText}>
                {isSaved ? 'Вы подписаны' : 'Подписаться'}
              </Text>
            </Pressable>
          )}
        </View>
        <View style={styles.detailReferenceBio}>
          <Text numberOfLines={3} style={styles.detailReferenceDescription}>
            {vendor.description}
          </Text>
          <View style={styles.detailReferenceCommerce}>
            <Text
              style={styles.detailReferencePrice}
            >
              от {formatMoney(vendor.priceFrom)}
            </Text>
            {vendor.reviewCount > 0 ? (
              <View style={styles.detailRatingPill}>
                <Star
                  color={colors.gold}
                  fill={colors.gold}
                  size={13}
                  strokeWidth={2}
                />
                <Text style={styles.detailRatingPillText}>{vendor.rating}</Text>
                <Text style={styles.detailRatingCount}>({vendor.reviewCount})</Text>
              </View>
            ) : (
              <Text style={styles.detailExperienceText}>Нет отзывов</Text>
            )}
            {vendor.experience > 0 ? (
              <Text style={styles.detailExperienceText}>{vendor.experience} лет опыта</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.detailReferenceStats}>
          {[
            [vendor.portfolioCount, 'Работ'],
            [vendor.reviewCount, 'Отзывов'],
            [vendor.weddings, 'Событий'],
          ].map(([value, label], index) => (
            <View key={label} style={styles.detailReferenceStatSlot}>
              {index > 0 ? <View style={styles.detailReferenceStatDivider} /> : null}
              <View style={styles.detailReferenceStat}>
                <Text style={styles.detailReferenceStatValue}>{value}</Text>
                <Text style={styles.detailReferenceStatLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>
        {highlights.length ? (
          <ScrollView
            contentContainerStyle={styles.detailReferenceHighlights}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {highlights.map((highlight, index) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Открыть историю ${highlight.label}`}
                key={`${highlight.label}-${index}`}
                onPress={() => setSelectedStoryIndex(index)}
                style={({ pressed }) => [
                  styles.detailReferenceHighlight,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.detailReferenceHighlightRing}>
                  <Image
                    accessibilityIgnoresInvertColors
                    resizeMode="cover"
                    source={highlight.source}
                    style={styles.detailReferenceHighlightImage}
                  />
                </View>
                <Text numberOfLines={1} style={styles.detailReferenceHighlightLabel}>
                  {highlight.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <View style={styles.detailReferenceTrustRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setBookingCalendarOpen(true)}
              style={[
                styles.detailAvailabilityPill,
                compactLayout && styles.detailAvailabilityPillCompact,
                styles.detailReferenceAvailabilityPill,
              ]}
            >
              <CalendarDays
                color={colors.green}
                size={calendarIconSize}
                strokeWidth={2.5}
              />
              <Text
                style={[
                  styles.detailAvailabilityText,
                  compactLayout && styles.detailAvailabilityTextCompact,
                  styles.detailReferenceAvailabilityText,
                ]}
              >
                {availabilityLabel}
              </Text>
            </Pressable>
            {vendor.verified ? (
              <View style={styles.detailVerifiedPill}>
                <ShieldCheck color="#8FA0FF" size={15} strokeWidth={2.2} />
                <Text style={styles.detailVerifiedText}>Проверен</Text>
              </View>
            ) : null}
        </View>
      </View>
      {bookingCreated && !isSelfPreview ? (
        <View style={styles.detailBookingSuccess}>
          <View style={styles.detailBookingSuccessIcon}>
            <CalendarDays color="#BFE8D1" size={20} strokeWidth={2.4} />
          </View>
          <View style={styles.detailBookingSuccessCopy}>
            <Text style={styles.detailBookingSuccessTitle}>Заявка отправлена</Text>
            <Text style={styles.detailBookingSuccessText}>
              {formatBookingDateValue(selectedBookingDate)} · {selectedTimeFrom}-{selectedTimeTo}. Поставщик подтвердит дату.
            </Text>
          </View>
        </View>
      ) : null}
      <View style={styles.profileIconTabs}>
        <ProfileTabButton
          label="Все работы"
          icon={Grid2X2}
          active={profileTab === 'grid'}
          onPress={() => setProfileTab('grid')}
        />
        <ProfileTabButton
          label="Reels"
          icon={Clapperboard}
          active={profileTab === 'reels'}
          onPress={() => setProfileTab('reels')}
        />
        <ProfileTabButton
          label={`Отзывы: ${vendor.reviewCount}`}
          icon={Repeat2}
          active={profileTab === 'reviews'}
          onPress={() => setProfileTab('reviews')}
        />
        <ProfileTabButton
          label="Отмеченные работы"
          icon={UserRound}
          active={profileTab === 'tagged'}
          onPress={() => setProfileTab('tagged')}
        />
      </View>
      {profileTab !== 'reviews' ? (
        <View style={styles.profileMediaGrid}>
          {vendor.portfolioCount > visibleMediaEntries.length ? (
            <Text style={styles.profileResultCount}>
              Показано {visibleMediaEntries.length} из {vendor.portfolioCount} работ
            </Text>
          ) : null}
          {visibleMediaEntries.length ? (
            visibleMediaEntries.map(({ index, source }) => (
              <Pressable
                accessibilityLabel={`Работа ${index + 1}`}
                accessibilityRole="button"
                key={`${vendor.id}-media-${index}`}
                onPress={() => {
                  onMediaView?.();
                  setSelectedMediaIndex(
                    Math.max(
                      0,
                      viewerMediaItems.findIndex((item) => item.index === index),
                    ),
                  );
                }}
                style={({ pressed }) => [
                  styles.profileMediaTile,
                  styles.profileMediaTileReel,
                  pressed && styles.profileMediaTilePressed,
                ]}
              >
                <Image
                  accessibilityIgnoresInvertColors
                  resizeMode="cover"
                  source={source}
                  style={styles.profileMediaImage}
                />
                {profileTab === 'reels' ? (
                  <>
                    <View style={styles.profileMediaPlayBadge}>
                      <Play
                        color={colors.surface}
                        fill={colors.surface}
                        size={13}
                        strokeWidth={2.4}
                      />
                    </View>
                    <View style={styles.profileMediaViewCount}>
                      <Play
                        color={colors.surface}
                        fill={colors.surface}
                        size={10}
                        strokeWidth={2}
                      />
                      <Text style={styles.profileMediaViewCountText}>Reels</Text>
                    </View>
                  </>
                ) : null}
              </Pressable>
            ))
          ) : (
            <View style={styles.clientEmptyCard}>
              <Text style={styles.clientEmptyTitle}>Медиа пока нет</Text>
              <Text style={styles.clientEmptyText}>
                Поставщик еще не загрузил фото или видео.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.reviewList}>
          <View style={styles.reviewSummary}>
            <Text style={styles.reviewSummaryScore}>{vendor.rating}</Text>
            <View style={styles.reviewSummaryCopy}>
              <View style={styles.reviewSummaryStars}>
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={`summary-star-${index}`}
                    color={colors.gold}
                    fill={colors.gold}
                    size={15}
                    strokeWidth={2}
                  />
                ))}
              </View>
              <Text style={styles.reviewSummaryText}>
                {vendor.reviewCount}{' '}
                {pluralizeRu(vendor.reviewCount, 'отзыв', 'отзыва', 'отзывов')} от реальных клиентов
              </Text>
            </View>
          </View>
          {vendor.reviewCount > vendor.reviews.length ? (
            <Text style={styles.profileResultCount}>
              Показано {vendor.reviews.length} из {vendor.reviewCount} отзывов
            </Text>
          ) : null}
          {vendor.reviews.length ? vendor.reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAvatar}>
                  <Text style={styles.reviewAvatarText}>
                    {review.author.slice(0, 1)}
                  </Text>
                </View>
                <View style={styles.reviewAuthorBlock}>
                  <Text style={styles.reviewAuthorName}>{review.author}</Text>
                  <Text style={styles.reviewDateText}>{review.date}</Text>
                </View>
                <View style={styles.reviewRating}>
                  <Star
                    color={colors.gold}
                    fill={colors.gold}
                    size={15}
                    strokeWidth={2}
                  />
                  <Text style={styles.reviewRatingText}>{review.rating}</Text>
                </View>
              </View>
              <Text style={styles.reviewText}>{review.text}</Text>
            </View>
          )) : (
            <View style={styles.clientEmptyCard}>
              <Text style={styles.clientEmptyTitle}>Отзывов пока нет</Text>
              <Text style={styles.clientEmptyText}>
                Здесь появятся отзывы после подтвержденных броней.
              </Text>
            </View>
          )}
        </View>
      )}
      <Modal
        animationType="slide"
        onRequestClose={() => setBookingCalendarOpen(false)}
        transparent
        visible={bookingCalendarOpen}
      >
        <View style={styles.detailBookingModal}>
          <Pressable
            accessibilityLabel="Закрыть выбор даты"
            accessibilityRole="button"
            onPress={() => setBookingCalendarOpen(false)}
            style={styles.detailBookingBackdrop}
          />
          <View style={styles.detailBookingSheet}>
            <View style={styles.detailBookingSheetHandle} />
            <ScrollView
              bounces={false}
              contentContainerStyle={styles.detailBookingScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.detailBookingCalendar,
                  styles.detailBookingCalendarInSheet,
                ]}
              >
            <View style={styles.detailBookingCalendarHeader}>
              <View>
                <Text style={styles.detailBookingCalendarTitle}>Выберите дату</Text>
                <Text style={styles.detailBookingCalendarMeta}>
                  Подрядчик подтвердит бронь после заявки
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Закрыть календарь"
                accessibilityRole="button"
                onPress={() => setBookingCalendarOpen(false)}
                style={styles.detailBookingCalendarClose}
              >
                <X color={colors.surface} size={20} strokeWidth={2.1} />
              </Pressable>
            </View>
            <View style={styles.calendarMonthNav}>
              <Pressable
                accessibilityLabel="Предыдущий месяц"
                accessibilityRole="button"
                accessibilityState={{ disabled: previousMonthDisabled }}
                disabled={previousMonthDisabled}
                onPress={() => changeBookingMonth(-1)}
                style={({ pressed }) => [
                  styles.calendarNavButton,
                  previousMonthDisabled && styles.calendarMonthDayPast,
                  pressed && styles.pressed,
                ]}
              >
                <ChevronLeft color={colors.surface} size={20} strokeWidth={2.1} />
              </Pressable>
              <Text style={styles.calendarMonth}>{visibleMonthTitle}</Text>
              <Pressable
                accessibilityLabel="Следующий месяц"
                accessibilityRole="button"
                onPress={() => changeBookingMonth(1)}
                style={({ pressed }) => [
                  styles.calendarNavButton,
                  pressed && styles.pressed,
                ]}
              >
                <ChevronRight color={colors.surface} size={20} strokeWidth={2.1} />
              </Pressable>
            </View>
            <View style={styles.weekGrid}>
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
                <Text key={day} style={styles.weekDayText}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.calendarMonthGrid}>
              {bookingCalendar.map((row, rowIndex) => (
                <View key={`booking-row-${rowIndex}`} style={styles.calendarWeekRow}>
                  {row.map((day, dayIndex) => {
                    if (!day) {
                      return (
                        <View
                          key={`booking-empty-${rowIndex}-${dayIndex}`}
                          style={styles.calendarMonthDayEmpty}
                        />
                      );
                    }

                    const date = new Date(
                      visibleBookingMonth.getFullYear(),
                      visibleBookingMonth.getMonth(),
                      day,
                    );
                    const dateValue = formatIsoDateValue(date);
                    const selected = selectedBookingDate === dateValue;
                    const isSunday = date.getDay() === 0;
                    const past = isPastBookingDate(date);
                    return (
                      <Pressable
                        key={dateValue}
                        accessibilityLabel={formatBookingDate(date)}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: past, selected }}
                        disabled={past}
                        onPress={() => {
                          setSelectedBookingDate(dateValue);
                          setBookingMessage('');
                        }}
                        style={({ pressed }) => [
                          styles.calendarMonthDay,
                          isSunday && styles.calendarMonthDaySunday,
                          past && styles.calendarMonthDayPast,
                          selected && styles.calendarMonthDaySelected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.calendarMonthDayText,
                            isSunday && styles.calendarMonthDayTextSunday,
                            past && styles.calendarMonthDayTextPast,
                            selected && styles.calendarMonthDayTextSelected,
                          ]}
                        >
                          {day}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
            <View style={styles.detailBookingConfirmRow}>
              <View style={styles.detailBookingTimeField}>
                <Text style={styles.detailBookingTimeLabel}>С</Text>
                <TextInput
                  accessibilityLabel="Время начала бронирования"
                  keyboardType="numbers-and-punctuation"
                  placeholder="18:00"
                  placeholderTextColor="#A8A8A8"
                  style={styles.detailBookingTimeInput}
                  value={selectedTimeFrom}
                  onChangeText={(value) => setSelectedTimeFrom(formatBookingTimeInput(value))}
                />
              </View>
              <View style={styles.detailBookingTimeField}>
                <Text style={styles.detailBookingTimeLabel}>До</Text>
                <TextInput
                  accessibilityLabel="Время окончания бронирования"
                  keyboardType="numbers-and-punctuation"
                  placeholder="23:00"
                  placeholderTextColor="#A8A8A8"
                  style={styles.detailBookingTimeInput}
                  value={selectedTimeTo}
                  onChangeText={(value) => setSelectedTimeTo(formatBookingTimeInput(value))}
                />
              </View>
            </View>
            <View style={styles.detailBookingConfirmRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setBookingCalendarOpen(false)}
                style={styles.detailBookingCancelButton}
              >
                <Text style={styles.detailBookingCancelText}>Отмена</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: Boolean(bookingTimeError) }}
                disabled={Boolean(bookingTimeError)}
                onPress={async () => {
                  const created = await onBook(
                    selectedBookingDate,
                    selectedTimeFrom,
                    selectedTimeTo,
                  );
                  if (created !== true) {
                    setBookingMessage(
                      typeof created === 'string'
                        ? created
                        : 'Не удалось отправить заявку. Проверьте сеть.',
                    );
                    return;
                  }

                  setBookingCreated(true);
                  setBookingMessage('');
                  setBookingCalendarOpen(false);
                }}
                style={[
                  styles.detailBookingConfirmButton,
                  bookingTimeError ? styles.calendarMonthDayPast : null,
                ]}
              >
                <Text style={styles.detailBookingConfirmText}>
                  Отправить {formatBookingDateValue(selectedBookingDate)}
                </Text>
              </Pressable>
            </View>
            {bookingTimeError ? (
              <Text accessibilityLiveRegion="polite" style={styles.detailModerationMessage}>
                {bookingTimeError}
              </Text>
            ) : null}
            {bookingMessage ? (
              <Text style={styles.detailModerationMessage}>{bookingMessage}</Text>
            ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedStoryIndex(null)}
        transparent
        visible={selectedStoryIndex !== null}
      >
        <View style={styles.profileMediaViewer}>
          {selectedStoryIndex !== null ? (
            <>
              <Image
                accessibilityIgnoresInvertColors
                resizeMode="cover"
                source={highlights[selectedStoryIndex]?.source}
                style={styles.profileMediaViewerImage}
              />
              <View style={styles.storyProgressRow}>
                {highlights.map((highlight, index) => (
                  <View key={highlight.label} style={styles.storyProgressItem}>
                    <View
                      style={[
                        styles.storyProgressFill,
                        { width: index <= selectedStoryIndex ? '100%' : '0%' },
                      ]}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.profileMediaViewerTopBar}>
                <View style={styles.profileMediaViewerIdentity}>
                  <Image
                    accessibilityIgnoresInvertColors
                    resizeMode="cover"
                    source={getVendorImageSource(vendor)}
                    style={styles.profileMediaViewerAvatar}
                  />
                  <Text numberOfLines={1} style={styles.profileMediaViewerName}>
                    {vendor.name} · {highlights[selectedStoryIndex]?.label}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Закрыть историю"
                  accessibilityRole="button"
                  onPress={() => setSelectedStoryIndex(null)}
                  style={styles.profileMediaViewerClose}
                >
                  <X color={colors.surface} size={23} strokeWidth={2.3} />
                </Pressable>
              </View>
              <Pressable
                accessibilityLabel="Предыдущая история"
                accessibilityRole="button"
                onPress={() =>
                  setSelectedStoryIndex((current) =>
                    current === null ? null : Math.max(0, current - 1),
                  )
                }
                style={[styles.profileMediaViewerNav, styles.profileMediaViewerNavLeft]}
              >
                <ChevronLeft color={colors.surface} size={28} strokeWidth={2.2} />
              </Pressable>
              <Pressable
                accessibilityLabel="Следующая история"
                accessibilityRole="button"
                onPress={() =>
                  setSelectedStoryIndex((current) =>
                    current === null
                      ? null
                      : current >= highlights.length - 1
                        ? null
                        : current + 1,
                  )
                }
                style={[styles.profileMediaViewerNav, styles.profileMediaViewerNavRight]}
              >
                <ChevronRight color={colors.surface} size={28} strokeWidth={2.2} />
              </Pressable>
            </>
          ) : null}
        </View>
      </Modal>
      <Modal
        animationType="slide"
        onRequestClose={closeProfileMediaViewer}
        presentationStyle="fullScreen"
        visible={selectedMediaIndex !== null}
      >
        <View style={styles.profileMediaFeed} {...profileMediaEdgeSwipe.panHandlers}>
          {selectedMediaIndex !== null ? (
            <FlatList
              data={viewerMediaItems}
              decelerationRate="fast"
              getItemLayout={(_data, index) => ({
                index,
                length: height,
                offset: height * index,
              })}
              initialScrollIndex={selectedMediaIndex}
              keyExtractor={(item) => item.id}
              maxToRenderPerBatch={3}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.max(
                  0,
                  Math.min(
                    viewerMediaItems.length - 1,
                    Math.round(event.nativeEvent.contentOffset.y / height),
                  ),
                );
                setSelectedMediaIndex(nextIndex);
                onMediaView?.();
              }}
              pagingEnabled
              renderItem={({ item, index }) => (
                <ProfileMediaFeedItem
                  active={index === selectedMediaIndex}
                  height={height}
                  isLiked={likedMediaIds.includes(item.id)}
                  isSaved={savedMediaIds.includes(item.id)}
                  item={item}
                  onOpenComments={() => setCommentsMediaIndex(index)}
                  onOpenLikes={() => void openMediaLikes(index)}
                  onShare={() =>
                    void Share.share({
                      message: `${vendor.name} на SVADBA.kz: ${item.caption || vendor.description}${
                        item.uri ? `\n${item.uri}` : ''
                      }`,
                      title: vendor.name,
                    }).catch(() => undefined)
                  }
                  onToggleLiked={() => onToggleMediaLiked?.(item.id)}
                  onToggleSaved={() => onToggleMediaSaved?.(item.id)}
                  vendor={vendor}
                />
              )}
              showsVerticalScrollIndicator={false}
              windowSize={3}
            />
          ) : null}
          <Pressable
            accessibilityLabel="Закрыть публикации"
            accessibilityRole="button"
            onPress={closeProfileMediaViewer}
            style={styles.profileMediaFeedClose}
          >
            <X color={colors.surface} size={23} strokeWidth={2.3} />
          </Pressable>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        onRequestClose={() => setCommentsMediaIndex(null)}
        transparent
        visible={commentsMediaIndex !== null}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
          style={styles.mediaCommentsSheet}
        >
          <View style={styles.mediaCommentsPanel}>
            <View style={styles.mediaCommentsHeader}>
              <Text style={styles.mediaCommentsTitle}>
                Комментарии {commentsMedia?.commentCount ?? 0}
              </Text>
              <View style={styles.mediaCommentsHeaderActions}>
                {onReportMedia ? (
                  <Pressable
                    accessibilityLabel="Пожаловаться на публикацию"
                    accessibilityRole="button"
                    onPress={() => void reportSelectedMedia()}
                    style={styles.mediaCommentsClose}
                  >
                    <Flag color={colors.surface} size={20} strokeWidth={2.2} />
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityLabel="Закрыть комментарии"
                  accessibilityRole="button"
                  onPress={() => setCommentsMediaIndex(null)}
                  style={styles.mediaCommentsClose}
                >
                  <X color={colors.surface} size={22} strokeWidth={2.2} />
                </Pressable>
              </View>
            </View>
            <ScrollView
              contentContainerStyle={styles.mediaCommentsList}
              keyboardShouldPersistTaps="handled"
            >
              {commentsMedia?.comments.length ? (
                commentsMedia.comments.map((comment) => (
                  <MediaCommentRow
                    comment={comment}
                    key={comment.id}
                    onReport={
                      onReportComment
                        ? () => void reportSelectedComment(comment.id)
                        : undefined
                    }
                  />
                ))
              ) : (
                <Text style={styles.profileMediaViewerMeta}>Комментариев пока нет.</Text>
              )}
            </ScrollView>
            <View style={styles.mediaCommentComposer}>
              <TextInput
                blurOnSubmit={false}
                onChangeText={setMediaCommentDraft}
                onSubmitEditing={submitSelectedMediaComment}
                placeholder="Написать комментарий"
                placeholderTextColor="#7E8790"
                returnKeyType="send"
                style={styles.mediaCommentInput}
                value={mediaCommentDraft}
              />
              <Pressable
                accessibilityLabel="Отправить комментарий"
                accessibilityRole="button"
                onPress={submitSelectedMediaComment}
                style={styles.mediaCommentSend}
              >
                <Send color={colors.surface} size={19} strokeWidth={2.3} />
              </Pressable>
            </View>
            {mediaCommentStatus ? (
              <Text style={styles.mediaUploadStatus}>{mediaCommentStatus}</Text>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        animationType="slide"
        onRequestClose={() => setLikesMediaIndex(null)}
        transparent
        visible={likesMediaIndex !== null}
      >
        <View style={styles.mediaCommentsSheet}>
          <View style={styles.mediaCommentsPanel}>
            <View style={styles.mediaCommentsHeader}>
              <Text style={styles.mediaCommentsTitle}>Отметки «Нравится»</Text>
              <Pressable
                accessibilityLabel="Закрыть список лайков"
                accessibilityRole="button"
                onPress={() => setLikesMediaIndex(null)}
                style={styles.mediaCommentsClose}
              >
                <X color={colors.surface} size={22} strokeWidth={2.2} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.profileMediaLikersList}>
              {mediaLikersLoading ? (
                <Text style={styles.profileMediaViewerMeta}>Загрузка...</Text>
              ) : mediaLikers.length ? (
                mediaLikers.map((user) => <MediaLikeUserRow key={user.id} user={user} />)
              ) : (
                <Text style={styles.profileMediaViewerMeta}>Пока никто не отметил.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ProfileMediaFeedItem({
  active,
  height,
  isLiked,
  isSaved,
  item,
  onOpenComments,
  onOpenLikes,
  onShare,
  onToggleLiked,
  onToggleSaved,
  vendor,
}: {
  active: boolean;
  height: number;
  isLiked: boolean;
  isSaved: boolean;
  item: ProfileMediaEntry;
  onOpenComments: () => void;
  onOpenLikes: () => void;
  onShare: () => void;
  onToggleLiked: () => void;
  onToggleSaved: () => void;
  vendor: Vendor;
}) {
  const [muted, setMuted] = useState(true);
  const [videoStatus, setVideoStatus] = useState<'idle' | 'loading' | 'readyToPlay' | 'error'>(
    'idle',
  );
  const [videoPlaying, setVideoPlaying] = useState(false);
  const player = useVideoPlayer(item.type === 'video' ? item.uri : null, (nextPlayer) => {
    nextPlayer.loop = true;
    nextPlayer.muted = true;
  });
  const mediaHeight = Math.max(270, Math.min(510, Math.round(height * 0.52)));
  const firstLiker = item.likedByPreview[0];
  const previewComments = item.comments.slice(0, 3);

  useEventListener(player, 'statusChange', ({ status }) => {
    setVideoStatus(status);
    if (active && item.type === 'video' && status === 'readyToPlay') {
      player.play();
    }
  });
  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    setVideoPlaying(isPlaying);
  });

  useEffect(() => {
    setVideoStatus(player.status);
    setVideoPlaying(player.playing);
  }, [item.id, player]);

  useEffect(() => {
    player.muted = muted;
    if (item.type !== 'video') return;
    if (active) {
      if (player.status === 'readyToPlay') {
        player.play();
      }
    } else {
      player.pause();
    }
  }, [active, item.type, muted, player]);

  const toggleVideoPlayback = () => {
    if (videoStatus === 'error') {
      setVideoStatus('loading');
      void player
        .replaceAsync(item.uri)
        .then(() => player.play())
        .catch(() => setVideoStatus('error'));
      return;
    }
    if (videoPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <View style={[styles.profileMediaFeedPage, { height }]}>
      <View style={[styles.profileMediaFeedMedia, { height: mediaHeight }]}>
        {item.type === 'video' ? (
          <Pressable
            accessibilityLabel={videoPlaying ? 'Поставить видео на паузу' : 'Воспроизвести видео'}
            accessibilityRole="button"
            onPress={toggleVideoPlayback}
            style={styles.profileMediaFeedMediaContent}
          >
            <VideoView
              contentFit="cover"
              nativeControls={false}
              player={player}
              playsInline
              style={styles.profileMediaFeedMediaContent}
              surfaceType="textureView"
            />
            {videoStatus === 'loading' || videoStatus === 'idle' ? (
              <View pointerEvents="none" style={styles.profileMediaFeedVideoState}>
                <ActivityIndicator color={colors.surface} size="large" />
              </View>
            ) : null}
            {videoStatus === 'readyToPlay' && !videoPlaying ? (
              <View pointerEvents="none" style={styles.profileMediaFeedVideoState}>
                <View style={styles.profileMediaFeedPlayButton}>
                  <Play color={colors.surface} fill={colors.surface} size={28} strokeWidth={2} />
                </View>
              </View>
            ) : null}
            {videoStatus === 'error' ? (
              <View pointerEvents="none" style={styles.profileMediaFeedVideoState}>
                <View style={styles.profileMediaFeedVideoError}>
                  <Play color={colors.surface} size={25} strokeWidth={2} />
                  <Text style={styles.profileMediaFeedVideoErrorText}>
                    Не удалось запустить. Нажмите, чтобы повторить.
                  </Text>
                </View>
              </View>
            ) : null}
          </Pressable>
        ) : (
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={item.source}
            style={styles.profileMediaFeedMediaContent}
          />
        )}
        {item.type === 'video' ? (
          <Pressable
            accessibilityLabel={muted ? 'Включить звук' : 'Выключить звук'}
            accessibilityRole="button"
            onPress={() => setMuted((value) => !value)}
            style={styles.profileMediaFeedMute}
          >
            {muted ? (
              <VolumeX color={colors.surface} size={20} strokeWidth={2.2} />
            ) : (
              <Volume2 color={colors.surface} size={20} strokeWidth={2.2} />
            )}
          </Pressable>
        ) : null}
      </View>
      <View style={styles.profileMediaFeedBody}>
        <View style={styles.profileMediaFeedAuthorRow}>
          <Image
            accessibilityIgnoresInvertColors
            source={getVendorImageSource(vendor)}
            style={styles.profileMediaFeedAuthorAvatar}
          />
          <View style={styles.profileMediaFeedAuthorCopy}>
            <View style={styles.profileMediaFeedAuthorNameRow}>
              <Text numberOfLines={1} style={styles.profileMediaFeedAuthorName}>
                {vendor.name}
              </Text>
              {vendor.verified ? (
                <BadgeCheck color="#4A8BFF" fill="#102A5C" size={15} strokeWidth={2.5} />
              ) : null}
            </View>
            <Text numberOfLines={1} style={styles.profileMediaFeedAuthorMeta}>
              {vendor.category} · {vendor.city}
            </Text>
          </View>
        </View>
        <View style={styles.profileMediaFeedActions}>
          <Pressable
            accessibilityLabel={isLiked ? 'Убрать лайк' : 'Поставить лайк'}
            accessibilityRole="button"
            onPress={onToggleLiked}
            style={styles.profileMediaFeedAction}
          >
            <Heart
              color={isLiked ? '#FF4D67' : colors.surface}
              fill={isLiked ? '#FF4D67' : 'transparent'}
              size={27}
              strokeWidth={2.1}
            />
            <Text style={styles.profileMediaFeedActionText}>{item.likeCount}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Открыть комментарии"
            accessibilityRole="button"
            onPress={onOpenComments}
            style={styles.profileMediaFeedAction}
          >
            <MessageCircle color={colors.surface} size={27} strokeWidth={2.1} />
            <Text style={styles.profileMediaFeedActionText}>{item.commentCount}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Поделиться публикацией"
            accessibilityRole="button"
            onPress={onShare}
            style={styles.profileMediaFeedAction}
          >
            <Send color={colors.surface} size={27} strokeWidth={2.1} />
          </Pressable>
          <View style={styles.profileMediaFeedActionSpacer} />
          <Pressable
            accessibilityLabel={isSaved ? 'Убрать публикацию из сохранённых' : 'Сохранить публикацию'}
            accessibilityRole="button"
            onPress={onToggleSaved}
            style={styles.profileMediaFeedAction}
          >
            <Bookmark
              color={colors.surface}
              fill={isSaved ? colors.surface : 'transparent'}
              size={27}
              strokeWidth={2.1}
            />
          </Pressable>
        </View>
        {item.likeCount > 0 ? (
          <Pressable
            accessibilityLabel="Показать всех, кому понравилась публикация"
            accessibilityRole="button"
            onPress={onOpenLikes}
            style={styles.profileMediaLikedByRow}
          >
            {firstLiker?.avatarUri ? (
              <Image source={{ uri: firstLiker.avatarUri }} style={styles.profileMediaLikedByAvatar} />
            ) : (
              <View style={styles.profileMediaLikedByAvatarFallback}>
                <UserRound color={colors.surface} size={15} strokeWidth={2} />
              </View>
            )}
            <Text numberOfLines={1} style={styles.profileMediaLikedByText}>
              {firstLiker ? `Нравится ${firstLiker.name}` : `${item.likeCount} отметок «Нравится»`}
              {firstLiker && item.likeCount > 1 ? ' и другим' : ''}
            </Text>
          </Pressable>
        ) : null}
        <Text numberOfLines={2} style={styles.profileMediaFeedCaption}>
          <Text style={styles.profileMediaFeedCaptionAuthor}>{vendor.name} </Text>
          {item.caption || vendor.description}
        </Text>
        <View style={styles.profileMediaPreviewComments}>
          {previewComments.map((comment) => (
            <MediaCommentRow comment={comment} compact key={comment.id} />
          ))}
          {item.commentCount > 3 ? (
            <Pressable onPress={onOpenComments} style={styles.profileMediaMoreComments}>
              <Text style={styles.profileMediaMoreCommentsText}>
                Посмотреть все комментарии ({item.commentCount})
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function MediaLikeUserRow({ user }: { user: MediaLikeUser }) {
  const initial = Array.from(user.name || 'П')[0]?.toLocaleUpperCase('ru-RU') || 'П';
  return (
    <View style={styles.profileMediaLikerRow}>
      {user.avatarUri ? (
        <Image source={{ uri: user.avatarUri }} style={styles.profileMediaLikerAvatar} />
      ) : (
        <View style={styles.profileMediaLikerAvatarFallback}>
          <Text style={styles.profileMediaLikerInitial}>{initial}</Text>
        </View>
      )}
      <Text numberOfLines={1} style={styles.profileMediaLikerName}>
        {user.name}
      </Text>
    </View>
  );
}

function getDefaultBookingDate(availability: string) {
  const cleaned = availability
    .replace('Свободен ', '')
    .replace('Свободна ', '')
    .replace('Свободны ', '')
    .trim();
  const parsed = /\d/.test(cleaned) ? getFutureDateFromBookingLabel(cleaned) : null;
  return formatIsoDateValue(parsed ?? new Date());
}

function getDefaultBookingMonth(availability: string) {
  const parsed = parseIsoDateValue(getDefaultBookingDate(availability)) ?? new Date();
  return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
}

function parseBookingLabel(label: string) {
  const monthNames = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ];
  const [dayRaw, monthRaw = 'сентября'] = label.toLowerCase().split(/\s+/);
  const day = Number(dayRaw) || new Date().getDate();
  const monthIndex = monthNames.indexOf(monthRaw);
  const month = monthIndex >= 0 ? monthIndex : new Date().getMonth();
  const futureDate = getFutureDateFromBookingParts(day, month);
  return { day: futureDate.getDate(), month: futureDate.getMonth(), year: futureDate.getFullYear() };
}

function getFutureDateFromBookingLabel(label: string) {
  const parsed = parseBookingParts(label);
  if (!parsed) return null;
  return getFutureDateFromBookingParts(parsed.day, parsed.month);
}

function parseBookingParts(label: string) {
  const monthNames = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ];
  const [dayRaw, monthRaw = ''] = label.toLowerCase().split(/\s+/);
  const day = Number(dayRaw);
  const month = monthNames.indexOf(monthRaw);
  if (!day || month < 0) return null;
  return { day, month };
}

function getFutureDateFromBookingParts(day: number, month: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let date = new Date(today.getFullYear(), month, day);
  date.setHours(0, 0, 0, 0);
  if (date < today) {
    date = new Date(today);
    date.setDate(today.getDate() + 8);
  }
  return date;
}

function getDisplayAvailability(availability: string) {
  const cleaned = availability
    .replace('Свободен ', '')
    .replace('Свободна ', '')
    .replace('Свободны ', '')
    .trim();
  const date = /\d/.test(cleaned) ? getFutureDateFromBookingLabel(cleaned) : null;
  if (!date) return 'Проверить даты';
  return `Свободен ${formatBookingDate(date)}`;
}

function getMonthTitle(date: Date) {
  const monthTitles = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ];
  return `${monthTitles[date.getMonth()]} ${date.getFullYear()}`;
}

function formatBookingDate(date: Date) {
  const monthNames = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ];
  return `${date.getDate()} ${monthNames[date.getMonth()]}`;
}

function formatIsoDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseIsoDateValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatBookingDateValue(value: string) {
  const date = parseIsoDateValue(value);
  return date ? formatBookingDate(date) : value;
}

function isPastBookingDate(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const candidate = new Date(date);
  candidate.setHours(0, 0, 0, 0);
  return candidate < today;
}

function isPastBookingMonth(date: Date) {
  const today = new Date();
  return (
    date.getFullYear() < today.getFullYear() ||
    (date.getFullYear() === today.getFullYear() && date.getMonth() <= today.getMonth())
  );
}

function formatBookingTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

function getBookingTimeError(timeFrom: string, timeTo: string) {
  const parse = (value: string) => {
    const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const from = parse(timeFrom);
  const to = parse(timeTo);
  if (from === null || to === null) return 'Укажите время в формате ЧЧ:ММ.';
  if (from >= to) return 'Время начала должно быть раньше окончания.';
  return '';
}

function getBookingCalendarRows(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmptyDays = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells = [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const trailingEmptyDays = (7 - (cells.length % 7)) % 7;
  const fullCells = [
    ...cells,
    ...Array.from({ length: trailingEmptyDays }, () => null),
  ];
  return Array.from(
    { length: Math.ceil(fullCells.length / 7) },
    (_, index) => fullCells.slice(index * 7, index * 7 + 7),
  );
}

function ProfileTabButton({
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
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.profileIconTabButton,
        active && styles.profileIconTabButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <Icon
        color={active ? colors.surface : colors.muted}
        size={24}
        strokeWidth={2.25}
      />
    </Pressable>
  );
}
