import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { type VideoThumbnail, useVideoPlayer } from 'expo-video';
import {
  ArrowLeft,
  Camera,
  Images,
  Pencil,
  Plus,
  Save,
  Send,
  Trash2,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  type DimensionValue,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  createPortfolioItem,
  deletePortfolioItem,
  updatePortfolioItem,
} from '../../api/portfolio';
import { Badge } from '../../components/Badge';
import {
  ActionButton,
  DangerButton,
  GhostButton,
} from '../../components/Buttons';
import { categories } from '../../data/mock';
import { preparePortfolioMedia } from '../../media/preparePortfolioMedia';
import {
  clearPortfolioDraft,
  loadPortfolioDraft,
  savePortfolioDraft,
} from '../../storage/draftStorage';
import {
  clearPortfolioMedia,
  persistPortfolioMedia,
} from '../../storage/mediaStorage';
import { colors, styles } from '../../theme/styles';
import type {
  CreatePortfolioItemPayload,
  PortfolioItem,
  PortfolioMedia,
} from '../../types';

const MAX_MEDIA_COUNT = 12;
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_VIDEO_DURATION = 60 * 1000;
const defaultTitle = 'Оформление выездной церемонии';
const defaultCategory = 'Декор';
const defaultDescription =
  'Зона церемонии, живые цветы, дорожка, арка и мягкий вечерний свет.';

export function VendorPortfolioScreen({
  items,
  onBack,
  onCreated,
  onDeleted,
  onUpdated,
  accessToken,
}: {
  items: PortfolioItem[];
  onBack: () => void;
  onCreated: (item: PortfolioItem) => void;
  onDeleted: (itemId: string) => void;
  onUpdated: (item: PortfolioItem) => void;
  accessToken?: string;
}) {
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | undefined>();
  const [title, setTitle] = useState(defaultTitle);
  const [category, setCategory] = useState(defaultCategory);
  const [description, setDescription] = useState(defaultDescription);
  const [selectedMedia, setSelectedMedia] = useState<PortfolioMedia[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState('');
  const [isHydrated, setHydrated] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStage, setUploadStage] = useState('');
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [listActionError, setListActionError] = useState('');

  const currentPayload: CreatePortfolioItemPayload = {
    title,
    category,
    description,
    media: selectedMedia,
  };
  const activeEditingItem = items.find((item) => item.id === editingItemId);

  useEffect(() => {
    let isMounted = true;

    void loadPortfolioDraft().then((draft) => {
      if (!isMounted) {
        return;
      }

      if (draft) {
        setEditingItemId(
          draft.itemId && items.some((item) => item.id === draft.itemId)
            ? draft.itemId
            : undefined,
        );
        setTitle(draft.payload.title);
        setCategory(draft.payload.category);
        setDescription(draft.payload.description);
        setSelectedMedia(draft.payload.media);
        setFormOpen(true);
        setDraftStatus(
          draft.missingMediaCount
            ? `Черновик восстановлен, недоступных файлов: ${draft.missingMediaCount}`
            : 'Черновик восстановлен',
        );
      }

      setHydrated(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || !isFormOpen || isSubmitting) {
      return;
    }

    setDraftStatus('Сохраняем черновик...');
    const timeout = setTimeout(() => {
      void savePortfolioDraft(currentPayload, editingItemId)
        .then((draft) => {
          setSelectedMedia((current) =>
            hasSameMediaUris(current, draft.payload.media)
              ? current
              : draft.payload.media,
          );
          setDraftStatus('Черновик сохранён');
        })
        .catch(() => {
          setDraftStatus('Не удалось сохранить черновик');
        });
    }, 700);

    return () => clearTimeout(timeout);
  }, [
    category,
    description,
    editingItemId,
    isFormOpen,
    isHydrated,
    isSubmitting,
    selectedMedia,
    title,
  ]);

  const addMedia = (assets: ImagePicker.ImagePickerAsset[]) => {
    const acceptedAssets = assets.filter(isAcceptedAsset);
    const nextMedia = acceptedAssets.map(toPortfolioMedia);

    setSelectedMedia((current) => {
      const existingUris = new Set(current.map((media) => media.uri));
      const uniqueMedia = nextMedia.filter(
        (media) => !existingUris.has(media.uri),
      );

      return [...current, ...uniqueMedia].slice(0, MAX_MEDIA_COUNT);
    });
    setError(
      acceptedAssets.length === assets.length
        ? null
        : 'Некоторые файлы пропущены: видео — до 60 секунд и 100 МБ, фото — до 20 МБ.',
    );
  };

  const pickMedia = async () => {
    const selectionLimit = MAX_MEDIA_COUNT - selectedMedia.length;

    if (selectionLimit <= 0) {
      setError(`Можно добавить не больше ${MAX_MEDIA_COUNT} файлов.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError('Разрешите доступ к медиатеке в настройках телефона.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit,
      quality: 0.85,
      videoMaxDuration: 60,
    });

    if (!result.canceled) {
      addMedia(result.assets);
    }
  };

  const takePhoto = async () => {
    if (selectedMedia.length >= MAX_MEDIA_COUNT) {
      setError(`Можно добавить не больше ${MAX_MEDIA_COUNT} файлов.`);
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setError('Разрешите доступ к камере в настройках телефона.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled) {
      addMedia(result.assets);
    }
  };

  const removeMedia = (mediaId: string) => {
    setSelectedMedia((current) =>
      current.filter((media) => media.id !== mediaId),
    );
  };

  const makeCover = (mediaId: string) => {
    setSelectedMedia((current) => {
      const selected = current.find((media) => media.id === mediaId);

      if (!selected) {
        return current;
      }

      return [selected, ...current.filter((media) => media.id !== mediaId)];
    });
  };

  const resetForm = () => {
    setEditingItemId(undefined);
    setTitle(defaultTitle);
    setCategory(defaultCategory);
    setDescription(defaultDescription);
    setSelectedMedia([]);
    setError(null);
    setDraftStatus('');
    setSubmitting(false);
    setUploadProgress(null);
    setUploadStage('');
  };

  const startNew = async () => {
    await clearPortfolioDraft();
    resetForm();
    setFormOpen(true);
  };

  const startEdit = async (item: PortfolioItem) => {
    await clearPortfolioDraft();
    setEditingItemId(item.id);
    setTitle(item.title);
    setCategory(item.category);
    setDescription(item.description);
    setSelectedMedia(item.media ?? []);
    setError(null);
    setDraftStatus('');
    setFormOpen(true);
  };

  const saveActiveDraft = async () => {
    try {
      const draft = await savePortfolioDraft(currentPayload, editingItemId);
      setSelectedMedia(draft.payload.media);
      setDraftStatus('Черновик сохранён');
    } catch {
      setDraftStatus('Не удалось сохранить черновик');
    }
  };

  const discardDraft = async () => {
    await clearPortfolioDraft();
    setFormOpen(false);
    resetForm();
  };

  const confirmDeleteItem = (item: PortfolioItem) => {
    Alert.alert(
      'Удалить кейс?',
      `«${item.title}» и его медиа исчезнут из профиля.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            void performDeleteItem(item.id);
          },
        },
      ],
    );
  };

  const performDeleteItem = async (itemId: string) => {
    setDeletingItemId(itemId);
    setListActionError('');

    try {
      await deletePortfolioItem(itemId, accessToken);
      await clearPortfolioMedia(itemId).catch(() => undefined);
      if (editingItemId === itemId) {
        await clearPortfolioDraft().catch(() => undefined);
      }
      onDeleted(itemId);
    } catch {
      setListActionError('Не удалось удалить кейс. Попробуйте ещё раз.');
    } finally {
      setDeletingItemId(null);
    }
  };

  const submit = async () => {
    if (!title.trim() || !category.trim() || !description.trim()) {
      setError('Заполните название, категорию и описание кейса.');
      return;
    }

    if (!activeEditingItem && selectedMedia.length === 0) {
      setError('Добавьте хотя бы одно фото или видео.');
      return;
    }

    setError(null);
    setSubmitting(true);
    setUploadProgress(0);
    setUploadStage('Подготавливаем медиа');

    try {
      const preparedMedia = await preparePortfolioMedia(
        selectedMedia,
        (progress) => setUploadProgress(Math.round(progress * 20)),
      );
      setSelectedMedia(preparedMedia);
      setUploadStage('Загружаем кейс');

      const payload: CreatePortfolioItemPayload = {
        title: title.trim(),
        category,
        description: description.trim(),
        media: preparedMedia,
      };
      const handleUploadProgress = (progress: number) =>
        setUploadProgress(20 + Math.round(progress * 80));
      const item = activeEditingItem
        ? await updatePortfolioItem(
            activeEditingItem,
            payload,
            accessToken,
            handleUploadProgress,
          )
        : await createPortfolioItem(
            payload,
            accessToken,
            handleUploadProgress,
          );

      let savedItem: PortfolioItem = {
        ...item,
        media: item.media ?? preparedMedia,
      };

      try {
        const persistentMedia = await persistPortfolioMedia(
          item.id,
          savedItem.media ?? [],
        );
        savedItem = { ...savedItem, media: persistentMedia.media };
      } catch {
        // The server operation succeeded; local persistence is best-effort here.
      }

      await clearPortfolioDraft().catch(() => undefined);
      if (activeEditingItem) {
        onUpdated(savedItem);
      } else {
        onCreated(savedItem);
      }
      setFormOpen(false);
      resetForm();
    } catch {
      setError(
        activeEditingItem
          ? 'Не удалось обновить кейс. Попробуйте ещё раз.'
          : 'Не удалось загрузить кейс. Попробуйте ещё раз.',
      );
      setSubmitting(false);
      setUploadProgress(null);
      setUploadStage('');
    }
  };

  return (
    <View style={styles.screenStack}>
      <GhostButton
        label="Назад в профиль"
        icon={ArrowLeft}
        onPress={() => {
          if (isFormOpen) {
            void saveActiveDraft().then(onBack);
          } else {
            onBack();
          }
        }}
      />

      <View>
        <Text style={styles.screenTitle}>Портфолио</Text>
        <Text style={styles.screenSubtitle}>
          Кейсы и медиа проходят модерацию перед публикацией в карточке.
        </Text>
      </View>

      <View style={styles.metricGrid}>
        <View style={styles.metricCard}>
          <View style={[styles.metricAccent, styles.tealAccent]} />
          <Text style={styles.metricValue}>{items.length}</Text>
          <Text style={styles.metricLabel}>кейса</Text>
        </View>
        <View style={styles.metricCard}>
          <View style={[styles.metricAccent, styles.coralAccent]} />
          <Text style={styles.metricValue}>
            {items.reduce((sum, item) => sum + item.mediaCount, 0)}
          </Text>
          <Text style={styles.metricLabel}>медиа</Text>
        </View>
        <View style={styles.metricCard}>
          <View style={[styles.metricAccent, styles.goldAccent]} />
          <Text style={styles.metricValue}>
            {items.filter((item) => item.moderationStatus === 'На модерации').length}
          </Text>
          <Text style={styles.metricLabel}>на проверке</Text>
        </View>
      </View>

      <ActionButton
        label={isFormOpen ? 'Форма открыта' : 'Добавить кейс'}
        disabled={isFormOpen}
        icon={Plus}
        onPress={startNew}
      />

      {isFormOpen ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {editingItemId ? 'Редактирование кейса' : 'Новый кейс'}
          </Text>

          {activeEditingItem?.moderationStatus === 'Отклонено' &&
          activeEditingItem.moderationNote ? (
            <View style={styles.moderationNote}>
              <Text style={styles.fieldLabel}>Что нужно исправить</Text>
              <Text style={styles.cardText}>
                {activeEditingItem.moderationNote}
              </Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Название кейса</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Например, свадьба в саду"
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

          <Text style={styles.fieldLabel}>Описание</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Коротко опишите работу"
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, styles.textareaInput]}
          />

          <Text style={styles.fieldLabel}>Фото и видео</Text>
          <View style={styles.buttonRow}>
            <ActionButton
              label="Выбрать медиа"
              disabled={isSubmitting}
              icon={Images}
              onPress={pickMedia}
            />
            <GhostButton
              label="Снять фото"
              disabled={isSubmitting}
              icon={Camera}
              onPress={takePhoto}
            />
          </View>
          <Text style={styles.mutedSmall}>
            {selectedMedia.length} из {MAX_MEDIA_COUNT} · первый файл будет обложкой
          </Text>

          {selectedMedia.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mediaSelectionRow}
            >
              {selectedMedia.map((media, index) => (
                <MediaPreview
                  key={media.id}
                  media={media}
                  isCover={index === 0}
                  disabled={isSubmitting}
                  onMakeCover={() => makeCover(media.id)}
                  onRemove={() => removeMedia(media.id)}
                />
              ))}
            </ScrollView>
          ) : null}

          {uploadProgress !== null ? (
            <View style={styles.uploadProgressBlock}>
              <View style={styles.uploadProgressTrack}>
                <View
                  style={[
                    styles.uploadProgressFill,
                    {
                      width: `${uploadProgress}%` as DimensionValue,
                    },
                  ]}
                />
              </View>
              <View style={styles.resultBar}>
                <Text style={styles.mutedSmall}>{uploadStage}</Text>
                <Text style={styles.resultText}>{uploadProgress}%</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.buttonRow}>
            <ActionButton
              label={
                isSubmitting
                  ? 'Сохраняем...'
                  : editingItemId
                    ? 'Опубликовать изменения'
                    : 'Опубликовать кейс'
              }
              disabled={isSubmitting}
              icon={Send}
              onPress={submit}
            />
            <GhostButton
              label="Сохранить и закрыть"
              disabled={isSubmitting}
              icon={Save}
              onPress={() => {
                void saveActiveDraft().then(() => setFormOpen(false));
              }}
            />
            <GhostButton
              label="Удалить черновик"
              disabled={isSubmitting}
              icon={Trash2}
              onPress={discardDraft}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {draftStatus ? <Text style={styles.mutedSmall}>{draftStatus}</Text> : null}
        </View>
      ) : null}

      {listActionError ? (
        <Text style={styles.errorText}>{listActionError}</Text>
      ) : null}

      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <PortfolioCover item={item} />
          <View style={styles.leadCardHeader}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Badge
              label={item.moderationStatus}
              tone={
                item.moderationStatus === 'Опубликовано'
                  ? 'green'
                  : item.moderationStatus === 'Отклонено'
                    ? 'coral'
                    : 'gold'
              }
            />
          </View>
          <Text style={styles.cardText}>{item.description}</Text>
          {item.moderationStatus === 'Отклонено' && item.moderationNote ? (
            <View style={styles.moderationNote}>
              <Text style={styles.fieldLabel}>Комментарий модератора</Text>
              <Text style={styles.cardText}>{item.moderationNote}</Text>
            </View>
          ) : null}
          <View style={styles.statusRow}>
            <Badge label={item.category} tone="teal" />
            <View style={styles.mediaCounter}>
              <Text style={styles.mutedSmall}>{item.mediaCount} медиа</Text>
            </View>
          </View>
          <Text style={styles.mutedSmall}>Обновлено: {item.updatedAt}</Text>
          <View style={styles.buttonRow}>
            <GhostButton
              label={
                item.moderationStatus === 'Отклонено'
                  ? 'Исправить замечания'
                  : 'Редактировать'
              }
              disabled={isFormOpen || deletingItemId === item.id}
              icon={Pencil}
              onPress={() => startEdit(item)}
            />
            <DangerButton
              label={deletingItemId === item.id ? 'Удаляем...' : 'Удалить'}
              disabled={isFormOpen || deletingItemId !== null}
              icon={Trash2}
              onPress={() => confirmDeleteItem(item)}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function MediaPreview({
  media,
  isCover,
  disabled,
  onMakeCover,
  onRemove,
}: {
  media: PortfolioMedia;
  isCover: boolean;
  disabled: boolean;
  onMakeCover: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.mediaPreviewItem}>
      <View>
        {media.type === 'image' ? (
          <Image source={{ uri: media.uri }} style={styles.mediaPreviewImage} />
        ) : (
          <View>
            <VideoThumbnailPreview uri={media.uri} variant="preview" />
            <View style={styles.mediaVideoLabel}>
              <Text style={styles.mediaCoverBadgeText}>Видео</Text>
            </View>
            <View style={styles.mediaDurationLabel}>
              <Text style={styles.mediaCoverBadgeText}>
                {formatDuration(media.duration)}
              </Text>
            </View>
          </View>
        )}
        {isCover ? (
          <View style={styles.mediaCoverBadge}>
            <Text style={styles.mediaCoverBadgeText}>Обложка</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={styles.mediaPreviewName}>
        {media.fileName}
      </Text>
      <View style={styles.mediaPreviewActions}>
        {!isCover ? (
          <Pressable disabled={disabled} onPress={onMakeCover}>
            <Text style={styles.linkText}>На обложку</Text>
          </Pressable>
        ) : null}
        <Pressable disabled={disabled} onPress={onRemove}>
          <Text style={styles.removeText}>Удалить</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PortfolioCover({ item }: { item: PortfolioItem }) {
  const cover = item.media?.[0];

  if (cover?.type === 'image') {
    return <Image source={{ uri: cover.uri }} style={styles.portfolioCoverImage} />;
  }

  if (cover?.type === 'video') {
    return (
      <View>
        <VideoThumbnailPreview uri={cover.uri} variant="cover" />
        <View style={styles.mediaVideoLabel}>
          <Text style={styles.mediaCoverBadgeText}>Видео</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.portfolioCover}>
      <Text style={styles.portfolioCoverText}>
        {item.coverLabel}
      </Text>
    </View>
  );
}

function VideoThumbnailPreview({
  uri,
  variant,
}: {
  uri: string;
  variant: 'preview' | 'cover';
}) {
  const player = useVideoPlayer(uri);
  const [thumbnail, setThumbnail] = useState<VideoThumbnail | null>(null);
  const imageStyle =
    variant === 'preview'
      ? styles.mediaPreviewImage
      : styles.portfolioCoverImage;

  useEffect(() => {
    let isMounted = true;

    void player
      .generateThumbnailsAsync([1], {
        maxWidth: variant === 'preview' ? 320 : 720,
      })
      .then(([generatedThumbnail]) => {
        if (isMounted && generatedThumbnail) {
          setThumbnail(generatedThumbnail);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [player, variant]);

  if (!thumbnail) {
    return (
      <View
        style={
          variant === 'preview'
            ? styles.mediaVideoPreview
            : styles.portfolioVideoCover
        }
      >
        <Text style={styles.mediaVideoTitle}>Видео</Text>
      </View>
    );
  }

  return <ExpoImage source={thumbnail} style={imageStyle} contentFit="cover" />;
}

function toPortfolioMedia(
  asset: ImagePicker.ImagePickerAsset,
  index: number,
): PortfolioMedia {
  const type = asset.type === 'video' ? 'video' : 'image';
  const extension = type === 'video' ? 'mp4' : 'jpg';

  return {
    id: `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
    uri: asset.uri,
    type,
    fileName: asset.fileName || `portfolio-${Date.now()}-${index}.${extension}`,
    mimeType: asset.mimeType || (type === 'video' ? 'video/mp4' : 'image/jpeg'),
    width: asset.width,
    height: asset.height,
    fileSize: asset.fileSize,
    duration: asset.duration ?? undefined,
  };
}

function isAcceptedAsset(asset: ImagePicker.ImagePickerAsset) {
  const isVideo = asset.type === 'video';

  if (isVideo && asset.duration && asset.duration > MAX_VIDEO_DURATION) {
    return false;
  }

  if (!asset.fileSize) {
    return true;
  }

  return isVideo
    ? asset.fileSize <= MAX_VIDEO_SIZE
    : asset.fileSize <= MAX_IMAGE_SIZE;
}

function formatDuration(duration?: number) {
  if (!duration) {
    return 'до 60 секунд';
  }

  const totalSeconds = Math.round(duration / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return `${minutes}:${seconds}`;
}

function hasSameMediaUris(
  current: PortfolioMedia[],
  next: PortfolioMedia[],
) {
  return (
    current.length === next.length &&
    current.every((media, index) => media.uri === next[index]?.uri)
  );
}
