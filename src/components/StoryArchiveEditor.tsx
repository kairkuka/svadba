import { VideoView, useVideoPlayer } from 'expo-video';
import {
  ArrowLeft,
  Check,
  Images,
  Play,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { KeyboardSafeScrollView as ScrollView } from './KeyboardSafeScrollView';
import { getVendorImageSource } from '../data/vendorImages';
import { colors } from '../theme/styles';
import type { StoryCollection, VendorImageKey, VendorMediaItem } from '../types';

type ArchiveStory = VendorMediaItem & { imageKey?: VendorImageKey };

type CollectionPatch = {
  coverStoryId?: string;
  name?: string;
  storyIds?: string[];
};

type StoryArchiveEditorProps = {
  collections: StoryCollection[];
  onCreateCollection: (
    name: string,
    storyIds: string[],
    coverStoryId?: string,
  ) => Promise<boolean>;
  onDeleteCollection: (collectionId: string) => Promise<boolean>;
  onDeleteStories: (storyIds: string[]) => Promise<boolean>;
  onUpdateCollection: (
    collectionId: string,
    patch: CollectionPatch,
  ) => Promise<boolean>;
  stories: ArchiveStory[];
};

function isActiveStory(story: ArchiveStory) {
  if (!story.expiresAt) return true;
  const expiresAt = Date.parse(story.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function formatStoryDate(value?: string) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Дата неизвестна';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function StoryVideo({ nativeControls = false, uri }: { nativeControls?: boolean; uri: string }) {
  const player = useVideoPlayer(uri, (nextPlayer) => {
    nextPlayer.loop = true;
    nextPlayer.muted = !nativeControls;
    if (nativeControls) nextPlayer.play();
  });
  return (
    <VideoView
      contentFit="cover"
      nativeControls={nativeControls}
      player={player}
      style={nativeControls ? localStyles.previewMedia : localStyles.storyThumbMedia}
    />
  );
}

function StoryThumb({ story }: { story: ArchiveStory }) {
  return (
    <View style={localStyles.storyThumbMediaWrap}>
      {story.type === 'video' ? (
        <>
          <StoryVideo uri={story.uri} />
          <View pointerEvents="none" style={localStyles.videoBadge}>
            <Play color="#FFFFFF" fill="#FFFFFF" size={15} strokeWidth={2} />
          </View>
        </>
      ) : (
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="cover"
          source={
            story.uri
              ? { uri: story.uri }
              : getVendorImageSource({ category: 'Ведущие', imageKey: story.imageKey })
          }
          style={localStyles.storyThumbMedia}
        />
      )}
    </View>
  );
}

export function StoryArchiveEditor({
  collections,
  onCreateCollection,
  onDeleteCollection,
  onDeleteStories,
  onUpdateCollection,
  stories,
}: StoryArchiveEditorProps) {
  const [tab, setTab] = useState<'archive' | 'collections'>('archive');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([]);
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState('');
  const [addStoryIds, setAddStoryIds] = useState<string[]>([]);
  const [previewStory, setPreviewStory] = useState<ArchiveStory | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const sortedStories = useMemo(
    () =>
      [...stories].sort((left, right) =>
        String(right.createdAt || '').localeCompare(String(left.createdAt || '')),
      ),
    [stories],
  );
  const storyById = useMemo(
    () => new Map(sortedStories.map((story) => [story.id, story])),
    [sortedStories],
  );
  const editingCollection = collections.find(
    (collection) => collection.id === editingCollectionId,
  );

  useEffect(() => {
    if (!editingCollection) return;
    setCollectionName(editingCollection.name);
    setAddStoryIds([]);
  }, [editingCollection?.id, editingCollection?.name]);

  useEffect(() => {
    const existingIds = new Set(sortedStories.map((story) => story.id));
    setSelectedStoryIds((current) => current.filter((id) => existingIds.has(id)));
  }, [sortedStories]);

  const runMutation = async (operation: () => Promise<boolean>, success: string) => {
    if (busy) return false;
    setBusy(true);
    setStatus('Сохраняем...');
    try {
      const saved = await operation();
      setStatus(saved ? success : 'Не удалось сохранить. Повторите.');
      return saved;
    } finally {
      setBusy(false);
    }
  };

  const toggleStory = (storyId: string, target: 'archive' | 'collection' = 'archive') => {
    const setter = target === 'archive' ? setSelectedStoryIds : setAddStoryIds;
    setter((current) =>
      current.includes(storyId)
        ? current.filter((id) => id !== storyId)
        : [...current, storyId],
    );
  };

  const addSelectedToCollection = async (collection: StoryCollection) => {
    const storyIds = Array.from(new Set([...collection.storyIds, ...selectedStoryIds]));
    const saved = await runMutation(
      () => onUpdateCollection(collection.id, { storyIds }),
      `Добавлено в «${collection.name}»`,
    );
    if (saved) {
      setSelectedStoryIds([]);
      setSelectionMode(false);
      setCollectionPickerOpen(false);
    }
  };

  const createCollection = async () => {
    const name = newCollectionName.trim();
    if (!name) {
      setStatus('Введите название коллекции.');
      return;
    }
    if (!selectedStoryIds.length) {
      setStatus('Выберите хотя бы одну историю.');
      return;
    }
    const saved = await runMutation(
      () => onCreateCollection(name, selectedStoryIds, selectedStoryIds[0]),
      `Коллекция «${name}» создана`,
    );
    if (saved) {
      setNewCollectionName('');
      setSelectedStoryIds([]);
      setSelectionMode(false);
      setCollectionPickerOpen(false);
      setTab('collections');
    }
  };

  const confirmDeleteStories = () => {
    if (!selectedStoryIds.length || busy) return;
    Alert.alert(
      'Удалить истории из архива?',
      'Они также исчезнут из всех коллекций. Восстановить их нельзя.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            void runMutation(
              () => onDeleteStories(selectedStoryIds),
              'Истории удалены',
            ).then((saved) => {
              if (saved) {
                setSelectedStoryIds([]);
                setSelectionMode(false);
              }
            });
          },
        },
      ],
    );
  };

  const renderArchiveGrid = (
    sourceStories: ArchiveStory[],
    target: 'archive' | 'collection' = 'archive',
  ) => (
    <View style={localStyles.storyGrid}>
      {sourceStories.map((story) => {
        const selected = (target === 'archive' ? selectedStoryIds : addStoryIds).includes(
          story.id,
        );
        return (
          <Pressable
            accessibilityLabel={`${selected ? 'Снять выбор' : 'Выбрать'} историю ${formatStoryDate(story.createdAt)}`}
            accessibilityRole="button"
            key={story.id}
            onLongPress={() => {
              if (target === 'archive') setSelectionMode(true);
              toggleStory(story.id, target);
            }}
            onPress={() => {
              if (target === 'collection' || selectionMode) toggleStory(story.id, target);
              else setPreviewStory(story);
            }}
            style={[localStyles.storyThumb, selected && localStyles.storyThumbSelected]}
          >
            <StoryThumb story={story} />
            {selected ? (
              <View style={localStyles.selectionBadge}>
                <Check color="#FFFFFF" size={15} strokeWidth={3} />
              </View>
            ) : null}
            {target === 'archive' ? (
              <View
                style={[
                  localStyles.expiryBadge,
                  isActiveStory(story) && localStyles.expiryBadgeActive,
                ]}
              >
                <Text style={localStyles.expiryBadgeText}>
                  {isActiveStory(story) ? 'Активна' : 'В архиве'}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );

  if (editingCollection) {
    const collectionStories = editingCollection.storyIds
      .map((id) => storyById.get(id))
      .filter(Boolean) as ArchiveStory[];
    const availableStories = sortedStories.filter(
      (story) => !editingCollection.storyIds.includes(story.id),
    );
    return (
      <ScrollView contentContainerStyle={localStyles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setEditingCollectionId(null)}
          style={localStyles.backButton}
        >
          <ArrowLeft color={colors.surface} size={20} strokeWidth={2.2} />
          <Text style={localStyles.backText}>Коллекции</Text>
        </Pressable>
        <Text style={localStyles.title}>Управление коллекцией</Text>
        <TextInput
          accessibilityLabel="Название коллекции"
          editable={!busy}
          maxLength={40}
          onChangeText={setCollectionName}
          placeholder="Название"
          placeholderTextColor="#777D82"
          style={localStyles.input}
          value={collectionName}
        />
        <Pressable
          accessibilityRole="button"
          disabled={busy || !collectionName.trim()}
          onPress={() =>
            void runMutation(
              () => onUpdateCollection(editingCollection.id, { name: collectionName.trim() }),
              'Название сохранено',
            )
          }
          style={[localStyles.primaryButton, (busy || !collectionName.trim()) && localStyles.disabled]}
        >
          <Text style={localStyles.primaryText}>Сохранить название</Text>
        </Pressable>

        <Text style={localStyles.sectionTitle}>Истории · {collectionStories.length}</Text>
        {collectionStories.length ? (
          <View style={localStyles.collectionStoryList}>
            {collectionStories.map((story) => {
              const isCover = editingCollection.coverStoryId === story.id;
              return (
                <View key={story.id} style={localStyles.collectionStoryRow}>
                  <Pressable onPress={() => setPreviewStory(story)} style={localStyles.rowThumb}>
                    <StoryThumb story={story} />
                  </Pressable>
                  <View style={localStyles.collectionStoryCopy}>
                    <Text style={localStyles.collectionStoryDate}>
                      {formatStoryDate(story.createdAt)}
                    </Text>
                    <Text style={localStyles.collectionStoryMeta}>
                      {isCover ? 'Обложка коллекции' : story.type === 'video' ? 'Видео' : 'Фото'}
                    </Text>
                  </View>
                  <View style={localStyles.rowActions}>
                    {!isCover ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() =>
                          void runMutation(
                            () => onUpdateCollection(editingCollection.id, { coverStoryId: story.id }),
                            'Обложка изменена',
                          )
                        }
                        style={localStyles.smallButton}
                      >
                        <Text style={localStyles.smallButtonText}>Обложка</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      accessibilityLabel="Убрать из коллекции"
                      accessibilityRole="button"
                      onPress={() =>
                        void runMutation(
                          () =>
                            onUpdateCollection(editingCollection.id, {
                              storyIds: editingCollection.storyIds.filter((id) => id !== story.id),
                            }),
                          'Убрано из коллекции',
                        )
                      }
                      style={localStyles.iconButton}
                    >
                      <X color={colors.coral} size={19} strokeWidth={2.3} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={localStyles.emptyText}>Коллекция пустая.</Text>
        )}

        {availableStories.length ? (
          <>
            <Text style={localStyles.sectionTitle}>Добавить из архива</Text>
            <Text style={localStyles.helper}>Выберите одну или несколько историй.</Text>
            {renderArchiveGrid(availableStories, 'collection')}
            <Pressable
              accessibilityRole="button"
              disabled={busy || !addStoryIds.length}
              onPress={() => {
                const storyIds = Array.from(
                  new Set([...editingCollection.storyIds, ...addStoryIds]),
                );
                void runMutation(
                  () => onUpdateCollection(editingCollection.id, { storyIds }),
                  'Истории добавлены',
                ).then((saved) => {
                  if (saved) setAddStoryIds([]);
                });
              }}
              style={[
                localStyles.primaryButton,
                (busy || !addStoryIds.length) && localStyles.disabled,
              ]}
            >
              <Text style={localStyles.primaryText}>Добавить выбранные</Text>
            </Pressable>
          </>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() =>
            Alert.alert(
              'Удалить коллекцию?',
              'Истории останутся в архиве.',
              [
                { text: 'Отмена', style: 'cancel' },
                {
                  text: 'Удалить',
                  style: 'destructive',
                  onPress: () => {
                    void runMutation(
                      () => onDeleteCollection(editingCollection.id),
                      'Коллекция удалена',
                    ).then((saved) => {
                      if (saved) setEditingCollectionId(null);
                    });
                  },
                },
              ],
            )
          }
          style={localStyles.deleteButton}
        >
          <Trash2 color={colors.coral} size={18} strokeWidth={2.2} />
          <Text style={localStyles.deleteText}>Удалить коллекцию</Text>
        </Pressable>
        {status ? <Text style={localStyles.status}>{status}</Text> : null}
        {busy ? <ActivityIndicator color={colors.gold} /> : null}
        <StoryPreviewModal story={previewStory} onClose={() => setPreviewStory(null)} />
      </ScrollView>
    );
  }

  return (
    <View style={localStyles.root}>
      <View style={localStyles.tabs}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setTab('archive')}
          style={[localStyles.tab, tab === 'archive' && localStyles.tabActive]}
        >
          <Text style={[localStyles.tabText, tab === 'archive' && localStyles.tabTextActive]}>
            Архив
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setTab('collections')}
          style={[localStyles.tab, tab === 'collections' && localStyles.tabActive]}
        >
          <Text style={[localStyles.tabText, tab === 'collections' && localStyles.tabTextActive]}>
            Коллекции
          </Text>
        </Pressable>
      </View>

      {tab === 'archive' ? (
        <>
          <View style={localStyles.sectionHeader}>
            <View>
              <Text style={localStyles.title}>Все истории</Text>
              <Text style={localStyles.helper}>Хранятся, пока вы их не удалите.</Text>
            </View>
            {sortedStories.length ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSelectionMode((current) => !current);
                  setSelectedStoryIds([]);
                  setCollectionPickerOpen(false);
                }}
                style={localStyles.selectButton}
              >
                <Text style={localStyles.selectButtonText}>
                  {selectionMode ? 'Готово' : 'Выбрать'}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {sortedStories.length ? (
            renderArchiveGrid(sortedStories)
          ) : (
            <View style={localStyles.emptyCard}>
              <Images color={colors.gold} size={28} strokeWidth={1.9} />
              <Text style={localStyles.emptyTitle}>Архив пока пуст</Text>
              <Text style={localStyles.emptyText}>
                Опубликованные Stories автоматически появятся здесь.
              </Text>
            </View>
          )}

          {selectionMode && selectedStoryIds.length ? (
            <View style={localStyles.selectionPanel}>
              <Text style={localStyles.selectionCount}>
                Выбрано: {selectedStoryIds.length}
              </Text>
              <View style={localStyles.selectionActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setCollectionPickerOpen((current) => !current)}
                  style={localStyles.primaryButton}
                >
                  <Plus color="#FFFFFF" size={18} strokeWidth={2.5} />
                  <Text style={localStyles.primaryText}>В коллекцию</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={confirmDeleteStories}
                  style={localStyles.deleteCompactButton}
                >
                  <Trash2 color={colors.coral} size={18} strokeWidth={2.2} />
                </Pressable>
              </View>
            </View>
          ) : null}

          {collectionPickerOpen ? (
            <View style={localStyles.collectionPicker}>
              <Text style={localStyles.sectionTitle}>Добавить в коллекцию</Text>
              {collections.map((collection) => (
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  key={collection.id}
                  onPress={() => void addSelectedToCollection(collection)}
                  style={localStyles.collectionOption}
                >
                  <Text style={localStyles.collectionOptionName}>{collection.name}</Text>
                  <Text style={localStyles.collectionOptionCount}>
                    {collection.storyIds.length}
                  </Text>
                </Pressable>
              ))}
              <TextInput
                accessibilityLabel="Название новой коллекции"
                editable={!busy}
                maxLength={40}
                onChangeText={setNewCollectionName}
                placeholder="Новая коллекция"
                placeholderTextColor="#777D82"
                style={localStyles.input}
                value={newCollectionName}
              />
              <Pressable
                accessibilityRole="button"
                disabled={busy || !newCollectionName.trim()}
                onPress={() => void createCollection()}
                style={[
                  localStyles.primaryButton,
                  (busy || !newCollectionName.trim()) && localStyles.disabled,
                ]}
              >
                <Text style={localStyles.primaryText}>Создать коллекцию</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : (
        <>
          <Text style={localStyles.title}>Избранные истории</Text>
          <Text style={localStyles.helper}>
            Только созданные вами коллекции видны в профиле.
          </Text>
          {collections.length ? (
            <View style={localStyles.collectionsGrid}>
              {collections.map((collection) => {
                const cover = storyById.get(
                  collection.coverStoryId || collection.storyIds[0] || '',
                );
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={collection.id}
                    onPress={() => setEditingCollectionId(collection.id)}
                    style={localStyles.collectionCard}
                  >
                    <View style={localStyles.collectionCoverRing}>
                      {cover ? (
                        <StoryThumb story={cover} />
                      ) : (
                        <Images color={colors.muted} size={25} strokeWidth={1.8} />
                      )}
                    </View>
                    <Text numberOfLines={1} style={localStyles.collectionName}>
                      {collection.name}
                    </Text>
                    <Text style={localStyles.collectionCount}>
                      {collection.storyIds.length} историй
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={localStyles.emptyCard}>
              <Plus color={colors.gold} size={28} strokeWidth={2} />
              <Text style={localStyles.emptyTitle}>Коллекций пока нет</Text>
              <Text style={localStyles.emptyText}>
                Откройте архив, выберите истории и создайте первую коллекцию.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setTab('archive');
                  setSelectionMode(true);
                }}
                style={localStyles.primaryButton}
              >
                <Text style={localStyles.primaryText}>Открыть архив</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      {status ? <Text style={localStyles.status}>{status}</Text> : null}
      {busy ? <ActivityIndicator color={colors.gold} /> : null}
      <StoryPreviewModal story={previewStory} onClose={() => setPreviewStory(null)} />
    </View>
  );
}

function StoryPreviewModal({
  onClose,
  story,
}: {
  onClose: () => void;
  story: ArchiveStory | null;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={Boolean(story)}>
      <View style={localStyles.previewRoot}>
        {story ? (
          story.type === 'video' ? (
            <StoryVideo nativeControls uri={story.uri} />
          ) : (
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={
                story.uri
                  ? { uri: story.uri }
                  : getVendorImageSource({ category: 'Ведущие', imageKey: story.imageKey })
              }
              style={localStyles.previewMedia}
            />
          )
        ) : null}
        <Pressable
          accessibilityLabel="Закрыть историю"
          accessibilityRole="button"
          onPress={onClose}
          style={localStyles.previewClose}
        >
          <X color="#FFFFFF" size={26} strokeWidth={2.3} />
        </Pressable>
        {story ? (
          <View style={localStyles.previewMeta}>
            <Text style={localStyles.previewDate}>{formatStoryDate(story.createdAt)}</Text>
            <Text style={localStyles.previewState}>
              {isActiveStory(story) ? 'Активная Story' : 'Архивная Story'}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  root: { gap: 16 },
  content: { gap: 16, paddingBottom: 36 },
  tabs: { flexDirection: 'row', backgroundColor: '#0B1114', borderRadius: 14, padding: 4 },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  tabActive: { backgroundColor: '#33271F' },
  tabText: { color: '#8D959C', fontSize: 15, fontWeight: '700' },
  tabTextActive: { color: colors.surface },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: colors.surface, fontSize: 23, lineHeight: 29, fontWeight: '800' },
  sectionTitle: { color: colors.surface, fontSize: 18, lineHeight: 24, fontWeight: '800' },
  helper: { color: '#A7ADB3', fontSize: 14, lineHeight: 20 },
  selectButton: { minHeight: 40, paddingHorizontal: 14, borderWidth: 1, borderColor: '#70543F', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  selectButtonText: { color: colors.surface, fontSize: 14, fontWeight: '700' },
  storyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  storyThumb: { width: '31.5%', aspectRatio: 0.7, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', backgroundColor: '#0B1114' },
  storyThumbSelected: { borderColor: colors.gold },
  storyThumbMediaWrap: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  storyThumbMedia: { width: '100%', height: '100%' },
  videoBadge: { position: 'absolute', right: 7, top: 7, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.58)', alignItems: 'center', justifyContent: 'center' },
  selectionBadge: { position: 'absolute', left: 7, top: 7, width: 25, height: 25, borderRadius: 13, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  expiryBadge: { position: 'absolute', left: 6, right: 6, bottom: 6, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(12,15,18,0.78)' },
  expiryBadgeActive: { backgroundColor: 'rgba(45,122,72,0.84)' },
  expiryBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', textAlign: 'center' },
  emptyCard: { minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 22, borderWidth: 1, borderColor: '#46372E', borderRadius: 18, backgroundColor: '#211A16' },
  emptyTitle: { color: colors.surface, fontSize: 18, fontWeight: '800' },
  emptyText: { color: '#A7ADB3', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  selectionPanel: { gap: 10, padding: 14, borderRadius: 16, backgroundColor: '#2A211B', borderWidth: 1, borderColor: '#5D4534' },
  selectionCount: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  selectionActions: { flexDirection: 'row', gap: 10 },
  primaryButton: { minHeight: 46, paddingHorizontal: 16, borderRadius: 13, backgroundColor: '#AD7544', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  deleteCompactButton: { width: 48, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1, borderColor: '#7E4545' },
  collectionPicker: { gap: 10, padding: 14, borderRadius: 16, backgroundColor: '#211A16', borderWidth: 1, borderColor: '#46372E' },
  collectionOption: { minHeight: 46, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#0B1114', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  collectionOptionName: { color: colors.surface, fontSize: 15, fontWeight: '700' },
  collectionOptionCount: { color: '#A7ADB3', fontSize: 13 },
  input: { minHeight: 50, borderWidth: 1, borderColor: '#42515A', borderRadius: 13, backgroundColor: '#071014', color: colors.surface, paddingHorizontal: 14, fontSize: 16 },
  collectionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  collectionCard: { width: 92, alignItems: 'center', gap: 6 },
  collectionCoverRing: { width: 78, height: 78, borderRadius: 39, borderWidth: 2, borderColor: colors.gold, padding: 3, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10171A' },
  collectionName: { color: colors.surface, fontSize: 13, lineHeight: 17, fontWeight: '700', maxWidth: 92 },
  collectionCount: { color: '#8D959C', fontSize: 11 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', minHeight: 42 },
  backText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  collectionStoryList: { gap: 10 },
  collectionStoryRow: { minHeight: 84, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: '#211A16', borderWidth: 1, borderColor: '#46372E' },
  rowThumb: { width: 54, height: 68, borderRadius: 9, overflow: 'hidden', backgroundColor: '#0B1114' },
  collectionStoryCopy: { flex: 1, minWidth: 0 },
  collectionStoryDate: { color: colors.surface, fontSize: 13, fontWeight: '700' },
  collectionStoryMeta: { color: '#969EA5', fontSize: 12, marginTop: 4 },
  rowActions: { alignItems: 'flex-end', gap: 7 },
  smallButton: { minHeight: 32, paddingHorizontal: 9, borderRadius: 9, backgroundColor: '#3A2D24', alignItems: 'center', justifyContent: 'center' },
  smallButtonText: { color: colors.surface, fontSize: 11, fontWeight: '700' },
  iconButton: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#704141' },
  deleteButton: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: '#7E4545', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  deleteText: { color: colors.coral, fontSize: 15, fontWeight: '800' },
  status: { color: '#C6CCD1', fontSize: 13, lineHeight: 18, textAlign: 'center' },
  previewRoot: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  previewMedia: { width: '100%', height: '100%' },
  previewClose: { position: 'absolute', right: 18, top: 48, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  previewMeta: { position: 'absolute', left: 18, right: 74, top: 52 },
  previewDate: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  previewState: { color: '#CFD5DA', fontSize: 12, marginTop: 3 },
});
