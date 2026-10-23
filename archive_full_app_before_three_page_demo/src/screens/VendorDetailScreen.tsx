import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Camera,
  ChevronUp,
  Heart,
  MessageCircle,
  PhoneCall,
  Play,
  Send,
  Star,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Image, Linking, Pressable, Text, TextInput, View } from 'react-native';

import { createLead } from '../api/leads';
import { Badge } from '../components/Badge';
import { ActionButton, GhostButton } from '../components/Buttons';
import {
  getVendorImageSource,
  getVendorPortfolioSources,
} from '../data/vendorImages';
import { colors, styles } from '../theme/styles';
import type { Lead, Vendor } from '../types';
import { formatMoney } from '../utils/format';

export function VendorDetailScreen({
  vendor,
  isSaved,
  onBack,
  onToggleSaved,
  onLeadCreated,
  onOpenChat,
  accessToken,
  initialContactName,
  initialContactPhone,
}: {
  vendor: Vendor;
  isSaved: boolean;
  onBack: () => void;
  onToggleSaved: () => void;
  onLeadCreated: (lead: Lead) => void;
  onOpenChat: (leadId: string) => void;
  accessToken?: string;
  initialContactName: string;
  initialContactPhone: string;
}) {
  const [isRequestFormOpen, setRequestFormOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'media' | 'reviews'>('media');
  const [date, setDate] = useState('24 августа');
  const [guests, setGuests] = useState('120');
  const [budget, setBudget] = useState('до 700 000 тг');
  const [contactName, setContactName] = useState(initialContactName);
  const [contactPhone, setContactPhone] = useState(initialContactPhone || '+7');
  const [comment, setComment] = useState(
    'Здравствуйте! Хотим узнать свободна ли дата и какие пакеты подходят.',
  );
  const [submittedLead, setSubmittedLead] = useState<Lead | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const portfolioSources = getVendorPortfolioSources(vendor);
  const mediaSources = [...portfolioSources, ...portfolioSources].slice(0, 6);

  const openWhatsApp = () => {
    const phone = vendor.contactPhone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Здравствуйте! Нашли вас на SVADBA.kz. Хотим уточнить дату и условия: ${vendor.name}`,
    );

    void Linking.openURL(`https://wa.me/${phone}?text=${message}`);
  };

  const openRequestForm = () => {
    setRequestFormOpen(true);
  };

  const openChat = () => {
    if (submittedLead) {
      onOpenChat(submittedLead.id);
      return;
    }

    setRequestFormOpen(true);
  };

  const submitRequest = async () => {
    if (!date.trim() || !contactName.trim() || !contactPhone.trim()) {
      setFormError('Заполните дату, имя и телефон.');
      return;
    }

    setFormError(null);
    setSubmitting(true);

    try {
      const lead = await createLead(
        {
          vendorId: vendor.id,
          vendorName: vendor.name,
          date,
          guests,
          budget,
          comment,
          contactName,
          contactPhone,
        },
        accessToken,
      );

      setSubmittedLead(lead);
      setRequestFormOpen(false);
      onLeadCreated(lead);
    } catch {
      setFormError('Не удалось отправить заявку. Попробуйте еще раз.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.vendorDetailStack}>
      <View style={styles.detailHeader}>
        <Pressable onPress={onBack} style={styles.detailHeaderBackButton}>
          <ArrowLeft color={colors.surface} size={30} strokeWidth={2.8} />
        </Pressable>
        <View style={styles.detailProfileTop}>
          <View style={styles.detailAvatarRing}>
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="cover"
              source={getVendorImageSource(vendor)}
              style={styles.detailAvatarImage}
            />
          </View>
          <View style={styles.detailProfileMain}>
            <View style={styles.detailNameLine}>
              <Text numberOfLines={1} style={styles.detailTitle}>
                {vendor.name}
              </Text>
              {vendor.verified ? (
                <BadgeCheck
                  accessibilityLabel="Проверенный подрядчик"
                  color={colors.green}
                  fill={colors.greenSoft}
                  size={30}
                  strokeWidth={2.8}
                />
              ) : null}
            </View>
            <View style={styles.detailProfileStats}>
              <View style={styles.detailProfileStat}>
                <Text style={styles.detailProfileStatValue}>
                  {vendor.portfolioCount}
                </Text>
                <Text style={styles.detailProfileStatLabel}>работ</Text>
              </View>
              <View style={styles.detailProfileStat}>
                <Text style={styles.detailProfileStatValue}>
                  {vendor.reviewCount}
                </Text>
                <Text style={styles.detailProfileStatLabel}>отзывов</Text>
              </View>
              <View style={styles.detailProfileStat}>
                <Text style={styles.detailProfileStatValue}>
                  {vendor.weddings}
                </Text>
                <Text style={styles.detailProfileStatLabel}>свадеб</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.detailBioBlock}>
          <Text style={styles.detailCategoryText}>
            {vendor.category} · {vendor.city}
          </Text>
          <Text style={styles.detailPriceLine}>
            от {formatMoney(vendor.priceFrom)} · {vendor.rating} рейтинг ·{' '}
            {vendor.experience} лет
          </Text>
          <Text numberOfLines={3} style={styles.detailDescriptionText}>
            {vendor.description}
          </Text>
          <View style={styles.detailAvailabilityPill}>
            <CalendarDays color={colors.gold} size={20} strokeWidth={2.7} />
            <Text style={styles.detailAvailabilityText}>{vendor.availability}</Text>
          </View>
        </View>
        <View style={styles.detailProfileActions}>
          <Pressable
            accessibilityRole="button"
            onPress={openWhatsApp}
            style={({ pressed }) => [
              styles.detailPrimaryAction,
              pressed && styles.pressed,
            ]}
          >
            <PhoneCall color={colors.surface} size={25} strokeWidth={2.6} />
            <Text style={styles.detailPrimaryActionText}>Связаться</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onToggleSaved}
            style={({ pressed }) => [
              styles.detailSecondaryAction,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.detailSecondaryActionText}>
              {isSaved ? 'Сохранено' : 'Сохранить'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={openChat}
            style={({ pressed }) => [
              styles.detailSmallAction,
              pressed && styles.pressed,
            ]}
          >
            <MessageCircle color={colors.surface} size={30} strokeWidth={2.8} />
          </Pressable>
        </View>
      </View>
      {submittedLead ? (
        <View style={styles.successCard}>
          <View style={styles.leadCardHeader}>
            <View>
              <Text style={styles.cardTitle}>Заявка отправлена</Text>
              <Text style={styles.cardText}>
                {submittedLead.date} · {submittedLead.guests} гостей ·{' '}
                {submittedLead.budget}
              </Text>
            </View>
            <Badge label={submittedLead.status} tone="green" />
          </View>
          <View style={styles.buttonRow}>
            <ActionButton
              label="Открыть чат"
              icon={MessageCircle}
              onPress={() => onOpenChat(submittedLead.id)}
            />
            <GhostButton
              label="Изменить"
              icon={ChevronUp}
              onPress={() => setRequestFormOpen(true)}
            />
          </View>
        </View>
      ) : null}
      {isRequestFormOpen ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Заявка подрядчику</Text>
          <Text style={styles.cardText}>
            Данные уйдут подрядчику в кабинет и станут основой для диалога.
          </Text>

          <Text style={styles.fieldLabel}>Дата свадьбы</Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="Например, 24 августа"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />

          <Text style={styles.fieldLabel}>Количество гостей</Text>
          <TextInput
            value={guests}
            onChangeText={setGuests}
            keyboardType="number-pad"
            placeholder="Например, 120"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />

          <Text style={styles.fieldLabel}>Бюджет</Text>
          <TextInput
            value={budget}
            onChangeText={setBudget}
            placeholder="Например, до 700 000 тг"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />

          <Text style={styles.fieldLabel}>Имя</Text>
          <TextInput
            value={contactName}
            onChangeText={setContactName}
            placeholder="Ваше имя"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />

          <Text style={styles.fieldLabel}>Телефон</Text>
          <TextInput
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
            placeholder="+7"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />

          <Text style={styles.fieldLabel}>Комментарий</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            multiline
            placeholder="Коротко опишите, что нужно"
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, styles.textareaInput]}
          />

          <View style={styles.buttonRow}>
            <ActionButton
              label={isSubmitting ? 'Отправляем...' : 'Отправить заявку'}
              icon={Send}
              disabled={isSubmitting}
              onPress={submitRequest}
            />
            <GhostButton
              label="Свернуть"
              icon={ChevronUp}
              onPress={() => setRequestFormOpen(false)}
            />
          </View>

          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

        </View>
      ) : null}
      <View style={styles.profileTabs}>
        <ProfileTabButton
          label="Медиа"
          icon={Camera}
          active={profileTab === 'media'}
          onPress={() => setProfileTab('media')}
        />
        <ProfileTabButton
          label="Отзывы"
          icon={Star}
          active={profileTab === 'reviews'}
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
              <View style={styles.leadCardHeader}>
                <View style={styles.reviewAuthorBlock}>
                  <Text style={styles.cardTitle}>{review.author}</Text>
                  <Text style={styles.resultSort}>{review.date}</Text>
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
              <Text style={styles.cardText}>{review.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
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
        styles.profileTabButton,
        active && styles.profileTabButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <Icon
        color={active ? colors.surface : colors.muted}
        size={24}
        strokeWidth={2.7}
      />
      <Text
        style={[
          styles.profileTabText,
          active && styles.profileTabTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
