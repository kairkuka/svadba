import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Camera,
  EyeOff,
  Flag,
  Heart,
  PhoneCall,
  Play,
  Star,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  getVendorImageSource,
  getVendorPortfolioSources,
} from '../data/vendorImages';
import { colors, styles } from '../theme/styles';
import type { Vendor } from '../types';
import { getFeaturedVisualStyle } from '../utils/featured';
import { formatMoney } from '../utils/format';

export function VendorDetailScreen({
  vendor,
  isSaved,
  onBack,
  onBlock,
  onBook,
  onReport,
  onToggleSaved,
}: {
  vendor: Vendor;
  isSaved: boolean;
  onBack: () => void;
  onBlock: () => void;
  onBook: (date: string, timeFrom: string, timeTo: string) => boolean | Promise<boolean>;
  onReport: () => void;
  onToggleSaved: () => void;
}) {
  const { width } = useWindowDimensions();
  const [profileTab, setProfileTab] = useState<'media' | 'reviews'>('media');
  const [bookingCalendarOpen, setBookingCalendarOpen] = useState(false);
  const [bookingCreated, setBookingCreated] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');
  const [moderationMessage, setModerationMessage] = useState('');
  const [selectedBookingDate, setSelectedBookingDate] = useState(() =>
    getDefaultBookingDate(vendor.availability),
  );
  const [selectedTimeFrom, setSelectedTimeFrom] = useState('18:00');
  const [selectedTimeTo, setSelectedTimeTo] = useState('23:00');
  const [visibleBookingMonth, setVisibleBookingMonth] = useState(() =>
    getDefaultBookingMonth(vendor.availability),
  );
  const portfolioSources = getVendorPortfolioSources(vendor);
  const mediaSources = [...portfolioSources, ...portfolioSources].slice(0, 6);
  const compactLayout = width <= 430;
  const backIconSize = compactLayout ? 26 : 30;
  const verifiedIconSize = compactLayout ? 24 : 30;
  const calendarIconSize = compactLayout ? 17 : 20;
  const actionIconSize = compactLayout ? 21 : 25;
  const saveIconSize = compactLayout ? 25 : 30;
  const featuredVisual = getFeaturedVisualStyle(vendor.featured);
  const bookingCalendar = getBookingCalendarRows(visibleBookingMonth);
  const visibleMonthTitle = getMonthTitle(visibleBookingMonth);
  const changeBookingMonth = (delta: number) => {
    setVisibleBookingMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  };

  const openWhatsApp = () => {
    const phone = vendor.contactPhone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Здравствуйте! Нашли вас на SVADBA.kz. Хотим уточнить дату и условия: ${vendor.name}`,
    );

    void Linking.openURL(`https://wa.me/${phone}?text=${message}`).catch(
      () => undefined,
    );
  };

  return (
    <View style={styles.vendorDetailStack}>
      <View
        style={[
          styles.detailHeader,
          compactLayout && styles.detailHeaderCompact,
        ]}
      >
        <Pressable
          onPress={onBack}
          style={[
            styles.detailHeaderBackButton,
            compactLayout && styles.detailHeaderBackButtonCompact,
          ]}
        >
          <ArrowLeft
            color={colors.surface}
            size={backIconSize}
            strokeWidth={2.5}
          />
        </Pressable>
        <View
          style={[
            styles.detailProfileTop,
            compactLayout && styles.detailProfileTopCompact,
          ]}
        >
          <View
            style={[
              styles.detailAvatarRing,
              compactLayout && styles.detailAvatarRingCompact,
              featuredVisual && [
                styles.detailAvatarFeatured,
                {
                  backgroundColor: featuredVisual.ringInner,
                  borderColor: featuredVisual.ringOuter,
                  shadowColor: featuredVisual.ringOuter,
                },
              ],
            ]}
          >
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="cover"
              source={getVendorImageSource(vendor)}
              style={[
                styles.detailAvatarImage,
                compactLayout && styles.detailAvatarImageCompact,
              ]}
            />
          </View>
          <View
            style={[
              styles.detailProfileMain,
              compactLayout && styles.detailProfileMainCompact,
            ]}
          >
            <View
              style={[
                styles.detailNameLine,
                compactLayout && styles.detailNameLineCompact,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.detailTitle,
                  compactLayout && styles.detailTitleCompact,
                ]}
              >
                {vendor.name}
              </Text>
              {vendor.verified ? (
                <BadgeCheck
                  accessibilityLabel="Проверенный подрядчик"
                  color={colors.green}
                  fill={colors.greenSoft}
                  size={verifiedIconSize}
                  strokeWidth={2.5}
                />
              ) : null}
            </View>
            {vendor.featured?.enabled && featuredVisual ? (
              <View
                style={[
                  styles.detailFeaturedBadge,
                  compactLayout && styles.detailFeaturedBadgeCompact,
                  {
                    backgroundColor: featuredVisual.badgeBackground,
                    borderColor: featuredVisual.badgeBorder,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.detailFeaturedBadgeText,
                    compactLayout && styles.detailFeaturedBadgeTextCompact,
                    { color: featuredVisual.badgeText },
                  ]}
                >
                  {vendor.featured.badgeText}
                </Text>
              </View>
            ) : null}
            <View
              style={[
                styles.detailProfileStats,
                compactLayout && styles.detailProfileStatsCompact,
              ]}
            >
              <View
                style={[
                  styles.detailProfileStat,
                  compactLayout && styles.detailProfileStatCompact,
                ]}
              >
                <Text
                  style={[
                    styles.detailProfileStatValue,
                    compactLayout && styles.detailProfileStatValueCompact,
                  ]}
                >
                  {vendor.portfolioCount}
                </Text>
                <Text
                  style={[
                    styles.detailProfileStatLabel,
                    compactLayout && styles.detailProfileStatLabelCompact,
                  ]}
                >
                  работ
                </Text>
              </View>
              <View
                style={[
                  styles.detailProfileStat,
                  compactLayout && styles.detailProfileStatCompact,
                ]}
              >
                <Text
                  style={[
                    styles.detailProfileStatValue,
                    compactLayout && styles.detailProfileStatValueCompact,
                  ]}
                >
                  {vendor.reviewCount}
                </Text>
                <Text
                  style={[
                    styles.detailProfileStatLabel,
                    compactLayout && styles.detailProfileStatLabelCompact,
                  ]}
                >
                  отзывов
                </Text>
              </View>
              <View
                style={[
                  styles.detailProfileStat,
                  compactLayout && styles.detailProfileStatCompact,
                ]}
              >
                <Text
                  style={[
                    styles.detailProfileStatValue,
                    compactLayout && styles.detailProfileStatValueCompact,
                  ]}
                >
                  {vendor.weddings}
                </Text>
                <Text
                  style={[
                    styles.detailProfileStatLabel,
                    compactLayout && styles.detailProfileStatLabelCompact,
                  ]}
                >
                  событий
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View
          style={[
            styles.detailBioBlock,
            compactLayout && styles.detailBioBlockCompact,
          ]}
        >
          <Text
            style={[
              styles.detailCategoryText,
              compactLayout && styles.detailCategoryTextCompact,
            ]}
          >
            {vendor.category} · {vendor.city}
          </Text>
          <Text
            style={[
              styles.detailPriceLine,
              compactLayout && styles.detailPriceLineCompact,
            ]}
          >
            от {formatMoney(vendor.priceFrom)} · {vendor.rating} рейтинг ·{' '}
            {vendor.experience} лет
          </Text>
          <Text
            numberOfLines={3}
            style={[
              styles.detailDescriptionText,
              compactLayout && styles.detailDescriptionTextCompact,
            ]}
          >
            {vendor.description}
          </Text>
          <View
            style={[
              styles.detailAvailabilityPill,
              compactLayout && styles.detailAvailabilityPillCompact,
            ]}
          >
            <CalendarDays
              color={colors.gold}
              size={calendarIconSize}
              strokeWidth={2.5}
            />
            <Text
              style={[
                styles.detailAvailabilityText,
                compactLayout && styles.detailAvailabilityTextCompact,
              ]}
            >
              {vendor.availability}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.detailProfileActions,
            compactLayout && styles.detailProfileActionsCompact,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={openWhatsApp}
            style={({ pressed }) => [
              styles.detailPrimaryAction,
              compactLayout && styles.detailPrimaryActionCompact,
              pressed && styles.pressed,
            ]}
          >
            <PhoneCall
              color={colors.surface}
              size={actionIconSize}
              strokeWidth={2.5}
            />
            <Text
              style={[
                styles.detailPrimaryActionText,
                compactLayout && styles.detailPrimaryActionTextCompact,
              ]}
            >
              Связаться
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={isSaved ? 'Убрать из сохраненного' : 'Сохранить'}
            accessibilityRole="button"
            onPress={onToggleSaved}
            style={({ pressed }) => [
              styles.detailSecondaryAction,
              compactLayout && styles.detailSecondaryActionCompact,
              pressed && styles.pressed,
            ]}
          >
            <Heart
              color={colors.surface}
              fill={isSaved ? colors.surface : 'transparent'}
              size={saveIconSize}
              strokeWidth={2.25}
            />
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setBookingCalendarOpen(true);
          }}
          style={({ pressed }) => [
            styles.detailBookingAction,
            bookingCreated && styles.detailBookingActionDone,
            compactLayout && styles.detailBookingActionCompact,
            pressed && styles.pressed,
          ]}
        >
          <CalendarDays
            color={colors.surface}
            size={actionIconSize}
            strokeWidth={2.4}
          />
          <Text
            style={[
              styles.detailPrimaryActionText,
              compactLayout && styles.detailPrimaryActionTextCompact,
            ]}
          >
            {bookingCreated ? 'Заявка отправлена' : 'Отправить заявку на дату'}
          </Text>
        </Pressable>
        <View style={styles.detailModerationRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onReport();
              setModerationMessage('Жалоба отправлена на модерацию');
            }}
            style={({ pressed }) => [
              styles.detailModerationButton,
              pressed && styles.pressed,
            ]}
          >
            <Flag color="#F0B7B2" size={18} strokeWidth={2.1} />
            <Text style={styles.detailModerationText}>Пожаловаться</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onBlock}
            style={({ pressed }) => [
              styles.detailModerationButton,
              pressed && styles.pressed,
            ]}
          >
            <EyeOff color="#A7B0BA" size={18} strokeWidth={2.1} />
            <Text style={styles.detailModerationText}>Скрыть</Text>
          </Pressable>
        </View>
        {moderationMessage ? (
          <Text style={styles.detailModerationMessage}>{moderationMessage}</Text>
        ) : null}
        {bookingCalendarOpen ? (
          <View style={styles.detailBookingCalendar}>
            <View style={styles.detailBookingCalendarHeader}>
              <View>
                <Text style={styles.detailBookingCalendarTitle}>Выберите дату</Text>
                <Text style={styles.detailBookingCalendarMeta}>
                  Подрядчик подтвердит бронь после заявки
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setBookingCalendarOpen(false)}
                style={styles.detailBookingCalendarClose}
              >
                <Text style={styles.detailBookingCalendarCloseText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.calendarMonthNav}>
              <Pressable
                accessibilityRole="button"
                onPress={() => changeBookingMonth(-1)}
                style={({ pressed }) => [
                  styles.calendarNavButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.calendarNavText}>‹</Text>
              </Pressable>
              <Text style={styles.calendarMonth}>{visibleMonthTitle}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => changeBookingMonth(1)}
                style={({ pressed }) => [
                  styles.calendarNavButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.calendarNavText}>›</Text>
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
                    const dateLabel = formatBookingDate(date);
                    const selected = selectedBookingDate === dateLabel;
                    const isSunday = date.getDay() === 0;
                    return (
                      <Pressable
                        key={dateLabel}
                        accessibilityRole="button"
                        onPress={() => setSelectedBookingDate(dateLabel)}
                        style={({ pressed }) => [
                          styles.calendarMonthDay,
                          isSunday && styles.calendarMonthDaySunday,
                          selected && styles.calendarMonthDaySelected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.calendarMonthDayText,
                            isSunday && styles.calendarMonthDayTextSunday,
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
                  keyboardType="numbers-and-punctuation"
                  placeholder="18:00"
                  placeholderTextColor="#6F7A83"
                  style={styles.detailBookingTimeInput}
                  value={selectedTimeFrom}
                  onChangeText={setSelectedTimeFrom}
                />
              </View>
              <View style={styles.detailBookingTimeField}>
                <Text style={styles.detailBookingTimeLabel}>До</Text>
                <TextInput
                  keyboardType="numbers-and-punctuation"
                  placeholder="23:00"
                  placeholderTextColor="#6F7A83"
                  style={styles.detailBookingTimeInput}
                  value={selectedTimeTo}
                  onChangeText={setSelectedTimeTo}
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
                onPress={async () => {
                  const created = await onBook(
                    selectedBookingDate,
                    selectedTimeFrom,
                    selectedTimeTo,
                  );
                  if (!created) {
                    setBookingMessage('Не удалось отправить заявку. Проверьте сеть.');
                    return;
                  }

                  setBookingCreated(true);
                  setBookingMessage('');
                  setBookingCalendarOpen(false);
                }}
                style={styles.detailBookingConfirmButton}
              >
                <Text style={styles.detailBookingConfirmText}>
                  Отправить {selectedBookingDate}
                </Text>
              </Pressable>
            </View>
            {bookingMessage ? (
              <Text style={styles.detailModerationMessage}>{bookingMessage}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
      <View
        style={[styles.profileTabs, compactLayout && styles.profileTabsCompact]}
      >
        <ProfileTabButton
          label="Медиа"
          icon={Camera}
          active={profileTab === 'media'}
          compactLayout={compactLayout}
          onPress={() => setProfileTab('media')}
        />
        <ProfileTabButton
          label="Отзывы"
          icon={Star}
          active={profileTab === 'reviews'}
          compactLayout={compactLayout}
          onPress={() => setProfileTab('reviews')}
        />
      </View>
      {profileTab === 'media' ? (
        <View style={styles.profileMediaGrid}>
          {mediaSources.map((source, index) => (
            <View key={`${vendor.id}-media-${index}`} style={styles.profileMediaTile}>
              <Image
                accessibilityIgnoresInvertColors
                resizeMode="cover"
                source={source}
                style={styles.profileMediaImage}
              />
              {index % 3 === 0 ? (
                <View style={styles.profileMediaPlayBadge}>
                  <Play
                    color={colors.surface}
                    fill={colors.surface}
                    size={15}
                    strokeWidth={2.4}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.reviewList}>
          {vendor.reviews.map((review) => (
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
          ))}
        </View>
      )}
    </View>
  );
}

function getDefaultBookingDate(availability: string) {
  const cleaned = availability
    .replace('Свободен ', '')
    .replace('Свободна ', '')
    .replace('Свободны ', '')
    .trim();
  return cleaned || '7 сентября';
}

function getDefaultBookingMonth(availability: string) {
  const parsed = parseBookingLabel(getDefaultBookingDate(availability));
  return new Date(2026, parsed.month, 1);
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
  const day = Number(dayRaw) || 7;
  const monthIndex = monthNames.indexOf(monthRaw);
  return { day, month: monthIndex >= 0 ? monthIndex : 8 };
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
  compactLayout,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  compactLayout: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.profileTabButton,
        compactLayout && styles.profileTabButtonCompact,
        active && styles.profileTabButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <Icon
        color={active ? colors.surface : colors.muted}
        size={compactLayout ? 22 : 24}
        strokeWidth={2.45}
      />
      <Text
        style={[
          styles.profileTabText,
          compactLayout && styles.profileTabTextCompact,
          active && styles.profileTabTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
