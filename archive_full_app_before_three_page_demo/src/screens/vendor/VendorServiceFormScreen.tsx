import { FilePenLine, Save, Send } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import {
  createVendorService,
  updateVendorService,
} from '../../api/services';
import { Badge } from '../../components/Badge';
import { ActionButton, GhostButton } from '../../components/Buttons';
import { categories } from '../../data/mock';
import {
  clearServiceDraft,
  loadServiceDraft,
  saveServiceDraft,
} from '../../storage/draftStorage';
import { colors, styles } from '../../theme/styles';
import type {
  CreateVendorServicePayload,
  VendorService,
} from '../../types';

const priceTypes: VendorService['priceType'][] = [
  'От',
  'Фиксированная',
  'По запросу',
];

const newServiceDefaults: CreateVendorServicePayload = {
  title: 'Оформление банкетного зала',
  category: 'Декор',
  priceType: 'От',
  price: '450 000 тг',
  packageDetails:
    'Президиум, фотозона, гостевые столы, базовая флористика и монтаж.',
  conditions:
    'Предоплата 30%, выезд по Алматы включен, демонтаж после банкета.',
};

export function VendorServiceFormScreen({
  service,
  accessToken,
  onBack,
  onSaved,
}: {
  service?: VendorService;
  accessToken?: string;
  onBack: () => void;
  onSaved: (service: VendorService) => void;
}) {
  const initialPayload = service ? serviceToPayload(service) : newServiceDefaults;
  const [title, setTitle] = useState(initialPayload.title);
  const [category, setCategory] = useState(initialPayload.category);
  const [priceType, setPriceType] = useState<VendorService['priceType']>(
    initialPayload.priceType,
  );
  const [price, setPrice] = useState(initialPayload.price);
  const [packageDetails, setPackageDetails] = useState(
    initialPayload.packageDetails,
  );
  const [conditions, setConditions] = useState(initialPayload.conditions);
  const [error, setError] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState('');
  const [isHydrated, setHydrated] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);

  const currentPayload: CreateVendorServicePayload = {
    title,
    category,
    price,
    priceType,
    packageDetails,
    conditions,
  };

  useEffect(() => {
    let isMounted = true;

    void loadServiceDraft(service?.id).then((draft) => {
      if (!isMounted) {
        return;
      }

      if (draft) {
        applyPayload(draft.payload, {
          setTitle,
          setCategory,
          setPrice,
          setPriceType,
          setPackageDetails,
          setConditions,
        });
        setDraftStatus('Черновик восстановлен');
      }

      setHydrated(true);
    });

    return () => {
      isMounted = false;
    };
  }, [service?.id]);

  useEffect(() => {
    if (!isHydrated || isSubmitting) {
      return;
    }

    setDraftStatus('Сохраняем черновик...');
    const timeout = setTimeout(() => {
      void saveServiceDraft(currentPayload, service?.id).then(() => {
        setDraftStatus('Черновик сохранён');
      }).catch(() => {
        setDraftStatus('Не удалось сохранить черновик');
      });
    }, 700);

    return () => clearTimeout(timeout);
  }, [
    category,
    conditions,
    isHydrated,
    isSubmitting,
    packageDetails,
    price,
    priceType,
    service?.id,
    title,
  ]);

  const saveDraft = async () => {
    try {
      await saveServiceDraft(currentPayload, service?.id);
      setDraftStatus('Черновик сохранён');
    } catch {
      setDraftStatus('Не удалось сохранить черновик');
    }
  };

  const submit = async () => {
    if (!title.trim() || !category.trim() || !packageDetails.trim()) {
      setError('Заполните название, категорию и состав пакета.');
      return;
    }

    if (priceType !== 'По запросу' && !price.trim()) {
      setError('Укажите цену или выберите тип цены "По запросу".');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const payload: CreateVendorServicePayload = {
        ...currentPayload,
        title: title.trim(),
        packageDetails: packageDetails.trim(),
        conditions: conditions.trim(),
      };
      const savedService = service
        ? await updateVendorService(service, payload, accessToken)
        : await createVendorService(payload, accessToken);

      await clearServiceDraft(service?.id);
      onSaved(savedService);
    } catch {
      setError(
        service
          ? 'Не удалось обновить услугу. Попробуйте ещё раз.'
          : 'Не удалось создать услугу. Попробуйте ещё раз.',
      );
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screenStack}>
      <GhostButton
        label="Сохранить и закрыть"
        icon={Save}
        onPress={() => {
          void saveDraft().then(onBack);
        }}
      />

      <View>
        <Text style={styles.screenTitle}>
          {service ? 'Редактирование услуги' : 'Новая услуга'}
        </Text>
        <Text style={styles.screenSubtitle}>
          После публикации изменения снова пройдут модерацию.
        </Text>
      </View>

      {service?.moderationStatus === 'Отклонено' && service.moderationNote ? (
        <View style={styles.moderationNote}>
          <Text style={styles.fieldLabel}>Что нужно исправить</Text>
          <Text style={styles.cardText}>{service.moderationNote}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Название услуги</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Например, оформление зала"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />

        <Text style={styles.fieldLabel}>Категория</Text>
        <View style={styles.buttonRow}>
          {categories.slice(0, 6).map((item) => (
            <Pressable
              key={item}
              onPress={() => setCategory(item)}
              style={({ pressed }) => [
                styles.filterChip,
                category === item && styles.filterChipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  category === item && styles.filterChipTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Тип цены</Text>
        <View style={styles.buttonRow}>
          {priceTypes.map((item) => (
            <Pressable
              key={item}
              onPress={() => setPriceType(item)}
              style={({ pressed }) => [
                styles.filterChip,
                priceType === item && styles.filterChipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  priceType === item && styles.filterChipTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        {priceType !== 'По запросу' ? (
          <>
            <Text style={styles.fieldLabel}>Цена</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="Например, 450 000 тг"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
            />
          </>
        ) : null}

        <Text style={styles.fieldLabel}>Состав пакета</Text>
        <TextInput
          value={packageDetails}
          onChangeText={setPackageDetails}
          multiline
          placeholder="Что входит в услугу"
          placeholderTextColor={colors.muted}
          style={[styles.searchInput, styles.textareaInput]}
        />

        <Text style={styles.fieldLabel}>Условия</Text>
        <TextInput
          value={conditions}
          onChangeText={setConditions}
          multiline
          placeholder="Предоплата, выезд, сроки, ограничения"
          placeholderTextColor={colors.muted}
          style={[styles.searchInput, styles.textareaInput]}
        />

        <View style={styles.buttonRow}>
          <ActionButton
            label={
              isSubmitting
                ? 'Сохраняем...'
                : service
                  ? 'Опубликовать изменения'
                  : 'Опубликовать услугу'
            }
            disabled={isSubmitting}
            icon={Send}
            onPress={submit}
          />
          <GhostButton
            label="Сохранить черновик"
            disabled={isSubmitting}
            icon={FilePenLine}
            onPress={saveDraft}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {draftStatus ? <Text style={styles.mutedSmall}>{draftStatus}</Text> : null}
        <Badge label="После публикации: На модерации" tone="gold" />
      </View>
    </View>
  );
}

function serviceToPayload(service: VendorService): CreateVendorServicePayload {
  return {
    title: service.title,
    category: service.category,
    price: service.priceType === 'По запросу' ? '' : service.price,
    priceType: service.priceType,
    packageDetails: service.packageDetails,
    conditions: service.conditions,
  };
}

function applyPayload(
  payload: CreateVendorServicePayload,
  setters: {
    setTitle: (value: string) => void;
    setCategory: (value: string) => void;
    setPrice: (value: string) => void;
    setPriceType: (value: VendorService['priceType']) => void;
    setPackageDetails: (value: string) => void;
    setConditions: (value: string) => void;
  },
) {
  setters.setTitle(payload.title);
  setters.setCategory(payload.category);
  setters.setPrice(payload.price);
  setters.setPriceType(payload.priceType);
  setters.setPackageDetails(payload.packageDetails);
  setters.setConditions(payload.conditions);
}
