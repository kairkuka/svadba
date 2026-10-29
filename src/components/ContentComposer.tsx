import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
  type CameraMode,
  type CameraType,
} from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Grid2X2,
  ImagePlus,
  Repeat2,
  Settings,
  X,
} from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  Image,
  type ImageSourcePropType,
  Linking,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { KeyboardSafeScrollView as ScrollView } from './KeyboardSafeScrollView';
import { colors, styles } from '../theme/styles';

type ComposerMode = 'publication' | 'story' | 'reels';
type ComposerStage =
  | 'camera'
  | 'publication-selection'
  | 'story-preview'
  | 'description'
  | 'reels-confirm'
  | 'reels-preview';
type PublicationKind = 'photo' | 'video' | 'story';
type MediaRole = 'main' | 'cover' | 'reels' | 'profile' | 'story';

export type ContentComposerUploadOptions = {
  caption?: string;
  index?: number;
  publicationCount?: number;
  publicationId?: string;
  publicationIndex?: number;
  publicationKind?: PublicationKind;
  role?: MediaRole;
};

type ComposerMediaItem = {
  id: string;
  uri: string;
  type: 'image' | 'video';
  fileName: string;
  caption?: string;
  selected: boolean;
  role: MediaRole;
  status: 'ready' | 'uploaded' | 'uploading' | 'processing' | 'failed';
  publicationId?: string;
  publicationKind?: PublicationKind;
  publicationIndex?: number;
  publicationCount?: number;
};

type RetryDraft = {
  assets: { asset: ImagePicker.ImagePickerAsset; index: number }[];
  caption: string;
  count: number;
  kind: PublicationKind;
  publicationId: string;
};

type ContentComposerProps = {
  isReviewMode: boolean;
  media: ComposerMediaItem[];
  onClose: () => void;
  onCommitReview: (items: ComposerMediaItem[]) => boolean | Promise<boolean>;
  onOpenSettings: () => void;
  onUpload: (
    asset: ImagePicker.ImagePickerAsset,
    options: ContentComposerUploadOptions,
  ) => Promise<ComposerMediaItem>;
  reviewCameraSource: ImageSourcePropType;
  userId: string | null;
};

const MODES: { id: ComposerMode; label: string }[] = [
  { id: 'publication', label: 'Публикация' },
  { id: 'story', label: 'История' },
  { id: 'reels', label: 'Reels' },
];

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const assetType = (asset: ImagePicker.ImagePickerAsset) =>
  asset.type === 'video' ? 'video' : 'image';

const assetName = (asset: ImagePicker.ImagePickerAsset, index: number) =>
  asset.fileName ||
  `media-${Date.now()}-${index}.${assetType(asset) === 'video' ? 'mp4' : 'jpg'}`;

function ComposerVideo({
  posterSource,
  reviewMode,
  uri,
}: {
  posterSource: ImageSourcePropType;
  reviewMode: boolean;
  uri: string;
}) {
  const player = useVideoPlayer(reviewMode ? null : uri, (nextPlayer) => {
    nextPlayer.loop = true;
    nextPlayer.muted = false;
    nextPlayer.play();
  });

  if (reviewMode) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={posterSource}
        style={styles.mediaCameraPreview}
      />
    );
  }

  return (
    <VideoView
      contentFit="cover"
      nativeControls
      player={player}
      style={styles.mediaCameraPreview}
    />
  );
}

export function ContentComposer({
  isReviewMode,
  media,
  onClose,
  onCommitReview,
  onOpenSettings,
  onUpload,
  reviewCameraSource,
  userId,
}: ContentComposerProps): ReactElement {
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] =
    useMicrophonePermissions();
  const [cameraFacing, setCameraFacing] = useState<CameraType>('front');
  const [cameraMode, setCameraMode] = useState<CameraMode>('picture');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [mode, setMode] = useState<ComposerMode>('story');
  const [stage, setStage] = useState<ComposerStage>('camera');
  const [draftAssets, setDraftAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [caption, setCaption] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const initialFailedMedia = isReviewMode
    ? media.find((item) => item.status === 'failed')
    : undefined;
  const initialUploadingMedia = isReviewMode
    ? media.find((item) => item.status === 'uploading' || item.status === 'processing')
    : undefined;
  const [uploadStatus, setUploadStatus] = useState(() =>
    initialFailedMedia
      ? initialFailedMedia.status === 'failed'
        ? 'Не удалось загрузить файл. Повторите отправку.'
        : ''
      : initialUploadingMedia
        ? 'Загрузка медиа...'
        : '',
  );
  const [uploadState, setUploadState] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >(initialFailedMedia ? 'error' : initialUploadingMedia ? 'uploading' : 'idle');
  const [libraryPermission, setLibraryPermission] = useState<{
    canAskAgain: boolean;
    status: 'denied' | 'granted' | 'undetermined';
  }>({ canAskAgain: true, status: 'undetermined' });
  const automaticCameraPermissionRequested = useRef(false);
  const automaticMicrophonePermissionRequested = useRef(false);
  const longPressConsumed = useRef(false);
  const recordingActive = useRef(false);
  const recordingReleaseRequested = useRef(false);
  const recordingTarget = useRef<'story' | 'reels'>('story');
  const modeSwipeStartX = useRef(0);
  const publishingLock = useRef(false);
  const retryDraft = useRef<RetryDraft | null>(null);
  const cameraAccessGranted = isReviewMode || Boolean(cameraPermission?.granted);

  useEffect(() => {
    if (
      isReviewMode ||
      !cameraPermission ||
      cameraPermission.granted ||
      !cameraPermission.canAskAgain ||
      automaticCameraPermissionRequested.current
    ) {
      return;
    }
    automaticCameraPermissionRequested.current = true;
    void requestCameraPermission();
  }, [cameraPermission, isReviewMode, requestCameraPermission]);

  useEffect(() => {
    if (
      isReviewMode ||
      !cameraPermission?.granted ||
      !microphonePermission ||
      microphonePermission.granted ||
      !microphonePermission.canAskAgain ||
      automaticMicrophonePermissionRequested.current
    ) {
      return;
    }
    automaticMicrophonePermissionRequested.current = true;
    void requestMicrophonePermission();
  }, [
    cameraPermission?.granted,
    isReviewMode,
    microphonePermission,
    requestMicrophonePermission,
  ]);

  useEffect(() => {
    let active = true;
    ImagePicker.getMediaLibraryPermissionsAsync()
      .then((permission) => {
        if (!active) return;
        setLibraryPermission({
          canAskAgain: permission.canAskAgain,
          status: permission.granted ? 'granted' : permission.status,
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return undefined;
    }
    const timer = setInterval(() => {
      setRecordingSeconds((current) => Math.min(60, current + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  useEffect(
    () => () => {
      cameraRef.current?.stopRecording();
    },
    [],
  );

  const createReviewAsset = (
    type: 'image' | 'video',
    index = 0,
  ): ImagePicker.ImagePickerAsset => {
    const sourceValue = Array.isArray(reviewCameraSource)
      ? reviewCameraSource[0]
      : reviewCameraSource;
    const source =
      typeof sourceValue === 'object' && sourceValue && 'uri' in sourceValue
        ? sourceValue
        : (
            Image as typeof Image & {
              resolveAssetSource?: (value: ImageSourcePropType) => {
                height?: number;
                uri: string;
                width?: number;
              };
            }
          ).resolveAssetSource?.(reviewCameraSource) ?? {
            height: 1280,
            uri: String(sourceValue || ''),
            width: 720,
          };
    return {
      assetId: `review-${type}-${Date.now()}-${index}`,
      base64: null,
      duration: type === 'video' ? 9000 : null,
      exif: null,
      fileName: type === 'video' ? `review-${index + 1}.mp4` : `review-${index + 1}.jpg`,
      fileSize: 1024,
      height: source.height || 1280,
      mimeType: type === 'video' ? 'video/mp4' : 'image/jpeg',
      type,
      uri: source.uri || '',
      width: source.width || 720,
    };
  };

  const resetToCamera = (nextMode: ComposerMode = mode) => {
    setMode(nextMode);
    setStage('camera');
    setDraftAssets([]);
    setCaption('');
    setCameraMode('picture');
    setIsRecording(false);
    setRecordingSeconds(0);
    setCameraError('');
  };

  const discardDraftAndReturnToCamera = (nextMode: ComposerMode = mode) => {
    retryDraft.current = null;
    setUploadState('idle');
    setUploadStatus('');
    resetToCamera(nextMode);
  };

  const requestCameraAccess = async () => {
    if (isReviewMode || cameraPermission?.granted) return true;
    if (cameraPermission && !cameraPermission.canAskAgain) {
      setCameraError('Доступ к камере выключен в настройках устройства.');
      return false;
    }
    const permission = await requestCameraPermission();
    if (!permission.granted) {
      setCameraError('Разрешите камеру, чтобы сделать фото или видео.');
      return false;
    }
    setCameraError('');
    return true;
  };

  const requestLibraryAccess = async () => {
    if (isReviewMode || libraryPermission.status === 'granted') return true;
    if (!libraryPermission.canAskAgain && Platform.OS !== 'web') {
      setUploadState('error');
      setUploadStatus('Доступ к галерее выключен в настройках устройства.');
      return false;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setLibraryPermission({
      canAskAgain: permission.canAskAgain,
      status: permission.granted ? 'granted' : permission.status,
    });
    if (!permission.granted) {
      setUploadState('error');
      setUploadStatus('Разрешите доступ к галерее, чтобы выбрать медиа.');
      return false;
    }
    return true;
  };

  const publishAssets = async (
    assets: ImagePicker.ImagePickerAsset[],
    kind: PublicationKind,
    nextCaption: string,
    retry?: Pick<RetryDraft, 'assets' | 'count' | 'publicationId'>,
  ) => {
    if (publishingLock.current || isPublishing) return false;
    if (!userId) {
      setUploadState('error');
      setUploadStatus('Сначала войдите в аккаунт поставщика.');
      return false;
    }
    publishingLock.current = true;

    const publicationId =
      retry?.publicationId ??
      `publication_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const count = retry?.count ?? assets.length;
    const tasks = retry?.assets ?? assets.map((asset, index) => ({ asset, index }));
    const uploadedItems: ComposerMediaItem[] = [];
    const failedTasks: RetryDraft['assets'] = [];

    retryDraft.current = null;
    setIsPublishing(true);
    setUploadState('uploading');
    setUploadStatus(`Загрузка 0 из ${tasks.length}`);

    for (const [taskNumber, task] of tasks.entries()) {
      const type = assetType(task.asset);
      const role: MediaRole =
        kind === 'story'
          ? 'story'
          : kind === 'video'
            ? 'reels'
            : media.length === 0 && task.index === 0
              ? 'main'
              : 'profile';
      try {
        if (isReviewMode) {
          uploadedItems.push({
            id: `review-upload-${Date.now()}-${task.index}`,
            uri: task.asset.uri,
            type,
            fileName: assetName(task.asset, task.index),
            caption: nextCaption.trim() || undefined,
            selected: true,
            role,
            status: 'uploaded',
            publicationCount: count,
            publicationId,
            publicationIndex: task.index,
            publicationKind: kind,
          });
          await wait(160);
        } else {
          uploadedItems.push(
            await onUpload(task.asset, {
              caption: nextCaption.trim() || undefined,
              index: task.index,
              publicationCount: count,
              publicationId,
              publicationIndex: task.index,
              publicationKind: kind,
              role,
            }),
          );
        }
      } catch {
        failedTasks.push(task);
      }
      setUploadStatus(`Загрузка ${taskNumber + 1} из ${tasks.length}`);
    }

    if (isReviewMode && uploadedItems.length) {
      await onCommitReview(uploadedItems);
    }
    publishingLock.current = false;
    setIsPublishing(false);

    if (failedTasks.length) {
      retryDraft.current = {
        assets: failedTasks,
        caption: nextCaption,
        count,
        kind,
        publicationId,
      };
      setUploadState('error');
      setUploadStatus(
        uploadedItems.length
          ? `Загружено ${uploadedItems.length} из ${tasks.length}. Остальное можно повторить.`
          : 'Не удалось опубликовать. Проверьте сеть и повторите.',
      );
      return false;
    }

    setUploadState('success');
    setUploadStatus(
      kind === 'story'
        ? 'История опубликована'
        : kind === 'video'
          ? 'Reels опубликован'
          : count > 1
            ? `Карусель из ${count} фото опубликована`
            : 'Публикация готова',
    );
    if (kind === 'story') {
      resetToCamera('story');
      await wait(1100);
      setUploadState('idle');
      setUploadStatus('');
    } else {
      await wait(650);
      onClose();
    }
    return true;
  };

  const retryPublication = async () => {
    const failed = retryDraft.current;
    if (!failed) return;
    await publishAssets(
      failed.assets.map((item) => item.asset),
      failed.kind,
      failed.caption,
      failed,
    );
  };

  const routePickedAssets = async (
    assets: ImagePicker.ImagePickerAsset[],
    nextMode: ComposerMode,
  ) => {
    if (!assets.length) return;
    const selectedAsset = assets[0];
    if (
      nextMode !== 'publication' &&
      selectedAsset.type === 'video' &&
      Number(selectedAsset.duration || 0) > 60_000
    ) {
      setUploadState('error');
      setUploadStatus('Видео должно быть не длиннее 60 секунд.');
      return;
    }
    setMode(nextMode);
    setUploadState('idle');
    setUploadStatus('');
    if (nextMode === 'story') {
      setDraftAssets([assets[0]]);
      setCaption('');
      setStage('story-preview');
      return;
    }
    setDraftAssets(nextMode === 'publication' ? assets.slice(0, 10) : [assets[0]]);
    setCaption('');
    setStage(nextMode === 'publication' ? 'publication-selection' : 'reels-confirm');
  };

  const pickFromLibrary = async (nextMode: ComposerMode, multiple = false) => {
    if (isPublishing || isRecording || recordingActive.current) return;
    if (!(await requestLibraryAccess())) return;

    if (isReviewMode) {
      const reviewAssets =
        nextMode === 'publication'
          ? Array.from({ length: multiple ? 3 : 1 }, (_, index) =>
              createReviewAsset('image', index),
            )
          : [createReviewAsset(nextMode === 'reels' ? 'video' : 'image')];
      await routePickedAssets(reviewAssets, nextMode);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: nextMode === 'publication' && multiple,
      mediaTypes:
        nextMode === 'publication'
          ? ['images']
          : nextMode === 'reels'
            ? ['videos']
            : ['images', 'videos'],
      orderedSelection: nextMode === 'publication' && multiple,
      quality: 0.84,
      selectionLimit: nextMode === 'publication' && multiple ? 10 : 1,
      shouldDownloadFromNetwork: true,
      videoMaxDuration: 60,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (!result.canceled) await routePickedAssets(result.assets, nextMode);
  };

  const selectMode = (nextMode: ComposerMode) => {
    if (
      nextMode === mode ||
      isRecording ||
      recordingActive.current ||
      isPublishing
    ) {
      return;
    }
    resetToCamera(nextMode);
    setUploadState('idle');
    setUploadStatus('');
    if (nextMode === 'publication') void pickFromLibrary('publication', false);
  };

  const capturePhoto = async () => {
    if (isRecording || isPublishing || !userId) return;
    let asset: ImagePicker.ImagePickerAsset | null = null;
    if (isReviewMode) {
      asset = createReviewAsset('image');
    } else {
      const hasAccess = await requestCameraAccess();
      if (!hasAccess || !cameraReady || !cameraRef.current) {
        if (hasAccess) setCameraError('Камера запускается. Повторите через секунду.');
        return;
      }
      try {
        const picture = await cameraRef.current.takePictureAsync({
          quality: 0.84,
          skipProcessing: false,
        });
        if (picture) {
          asset = {
            assetId: null,
            base64: null,
            duration: null,
            exif: null,
            fileName: `camera-${Date.now()}.jpg`,
            fileSize: undefined,
            height: picture.height,
            mimeType: 'image/jpeg',
            type: 'image',
            uri: picture.uri,
            width: picture.width,
          };
        }
      } catch {
        setCameraError('Не удалось сделать фото. Повторите.');
      }
    }
    if (!asset) return;
    if (mode === 'story') {
      setDraftAssets([asset]);
      setCaption('');
      setUploadState('idle');
      setUploadStatus('');
      setStage('story-preview');
    } else {
      setDraftAssets([asset]);
      setCaption('');
      setStage('publication-selection');
    }
  };

  const finishRecordedVideo = async (asset: ImagePicker.ImagePickerAsset) => {
    if (recordingTarget.current === 'story') {
      setMode('story');
      setDraftAssets([asset]);
      setCaption('');
      setUploadState('idle');
      setUploadStatus('');
      setStage('story-preview');
    } else {
      setDraftAssets([asset]);
      setCaption('');
      setStage('reels-confirm');
    }
  };

  const startVideoRecording = async (target: 'story' | 'reels') => {
    if (isRecording || recordingActive.current || isPublishing || !userId) return;
    recordingTarget.current = target;
    recordingReleaseRequested.current = false;
    recordingActive.current = true;
    setRecordingSeconds(0);
    if (isReviewMode) {
      setIsRecording(true);
      return;
    }
    if (!(await requestCameraAccess()) || !cameraReady || !cameraRef.current) {
      recordingActive.current = false;
      return;
    }
    if (!microphonePermission?.granted) {
      if (microphonePermission && !microphonePermission.canAskAgain) {
        setCameraError('Разрешите микрофон в настройках устройства для записи видео.');
        recordingActive.current = false;
        return;
      }
      const permission = await requestMicrophonePermission();
      if (!permission.granted) {
        setCameraError('Разрешите микрофон для записи видео со звуком.');
        recordingActive.current = false;
        return;
      }
    }
    try {
      setCameraError('');
      setCameraMode('video');
      await wait(160);
      if (!cameraRef.current) return;
      setIsRecording(true);
      const recording = cameraRef.current.recordAsync({ maxDuration: 60 });
      if (recordingReleaseRequested.current) cameraRef.current.stopRecording();
      const result = await recording;
      if (result) {
        await finishRecordedVideo({
          assetId: null,
          base64: null,
          duration: null,
          exif: null,
          fileName: `camera-${Date.now()}.mp4`,
          fileSize: undefined,
          height: 1280,
          mimeType: 'video/mp4',
          type: 'video',
          uri: result.uri,
          width: 720,
        });
      }
    } catch {
      setCameraError('Не удалось записать видео. Повторите.');
    } finally {
      recordingActive.current = false;
      setIsRecording(false);
      setCameraMode('picture');
    }
  };

  const stopVideoRecording = () => {
    recordingReleaseRequested.current = true;
    if (isReviewMode) {
      if (!recordingActive.current) return;
      recordingActive.current = false;
      setIsRecording(false);
      void finishRecordedVideo(createReviewAsset('video'));
      return;
    }
    cameraRef.current?.stopRecording();
  };

  useEffect(() => {
    if (isRecording && recordingSeconds >= 60) stopVideoRecording();
  }, [isRecording, recordingSeconds]);

  const handleShutterPress = () => {
    if (mode === 'story') {
      if (longPressConsumed.current) {
        longPressConsumed.current = false;
        return;
      }
      void capturePhoto();
      return;
    }
    if (mode === 'publication') {
      void capturePhoto();
      return;
    }
    if (isRecording || recordingActive.current) stopVideoRecording();
    else void startVideoRecording('reels');
  };

  const previewAsset = draftAssets[0];
  const recordingTime = `00:${String(Math.min(recordingSeconds, 60)).padStart(2, '0')}`;

  if (stage === 'description') {
    const isReels = mode === 'reels';
    return (
      <View style={styles.mediaDetailsScreen}>
        <View style={styles.mediaDetailsTopBar}>
          <Pressable
            accessibilityLabel="Назад"
            accessibilityRole="button"
            disabled={isPublishing}
            onPress={() => setStage(isReels ? 'reels-preview' : 'publication-selection')}
            style={styles.mediaCameraRoundButton}
          >
            <ArrowLeft color={colors.surface} size={24} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.mediaCameraTitle}>
            {isReels ? 'Описание Reels' : 'Новая публикация'}
          </Text>
          <View style={styles.mediaTopBarSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.mediaDetailsContent}>
          {previewAsset ? (
            previewAsset.type === 'video' ? (
              <View style={styles.mediaDetailsPreview}>
                <ComposerVideo
                  posterSource={reviewCameraSource}
                  reviewMode={isReviewMode}
                  uri={previewAsset.uri}
                />
              </View>
            ) : (
              <Image
                accessibilityIgnoresInvertColors
                resizeMode="cover"
                source={{ uri: previewAsset.uri }}
                style={styles.mediaDetailsPreview}
              />
            )
          ) : null}
          {draftAssets.length > 1 ? (
            <SelectionStrip assets={draftAssets} />
          ) : null}
          <View style={styles.mediaDescriptionCard}>
            <Text style={styles.mediaDescriptionLabel}>Описание</Text>
            <TextInput
              editable={!isPublishing}
              maxLength={600}
              multiline
              onChangeText={setCaption}
              placeholder={
                isReels
                  ? 'Расскажите о видео. Можно добавить #хэштеги'
                  : 'Расскажите о работе, событии или услуге'
              }
              placeholderTextColor="#7D858E"
              style={styles.mediaDescriptionInput}
              value={caption}
            />
            <Text style={styles.mediaDescriptionCounter}>{caption.length}/600</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isPublishing || !draftAssets.length}
            onPress={() =>
              void publishAssets(draftAssets, isReels ? 'video' : 'photo', caption)
            }
            style={[
              styles.mediaDetailsPrimaryButton,
              (isPublishing || !draftAssets.length) && styles.disabledButton,
            ]}
          >
            {isPublishing ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
            <Text style={styles.mediaPublishPrimaryText}>
              {isPublishing
                ? 'Публикуем...'
                : isReels
                  ? 'Опубликовать Reels'
                  : 'Опубликовать'}
            </Text>
          </Pressable>
          {uploadState === 'error' && retryDraft.current ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void retryPublication()}
              style={styles.mediaComposerRetryButton}
            >
              <Text style={styles.mediaComposerRetryButtonText}>Повторить отправку</Text>
            </Pressable>
          ) : null}
          {uploadStatus ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[
                styles.mediaDetailsStatus,
                uploadState === 'error' && styles.mediaDetailsStatusError,
              ]}
            >
              {uploadStatus}
            </Text>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  if (stage !== 'camera' && previewAsset) {
    const publicationSelection = stage === 'publication-selection';
    const storyPreview = stage === 'story-preview';
    const reelsConfirm = stage === 'reels-confirm';
    return (
      <View style={styles.mediaCaptureRoot}>
        {previewAsset.type === 'video' ? (
          <ComposerVideo
            posterSource={reviewCameraSource}
            reviewMode={isReviewMode}
            uri={previewAsset.uri}
          />
        ) : (
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={{ uri: previewAsset.uri }}
            style={styles.mediaCameraPreview}
          />
        )}
        <View style={styles.mediaCameraShadeTop} />
        <View style={styles.mediaCameraTopBar}>
          <Pressable
            accessibilityLabel="Отменить"
            accessibilityRole="button"
            disabled={isPublishing}
            onPress={() => discardDraftAndReturnToCamera(mode)}
            style={styles.mediaCameraRoundButton}
          >
            <X color={colors.surface} size={27} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.mediaCameraTitle}>
            {publicationSelection
              ? draftAssets.length > 1
                ? `${draftAssets.length} фото`
                : 'Фото выбрано'
              : storyPreview
                ? previewAsset.type === 'video'
                  ? 'Видео для истории'
                  : 'Фото для истории'
              : reelsConfirm
                ? 'Видео готово'
                : 'Предпросмотр Reels'}
          </Text>
          <View style={styles.mediaTopBarSpacer} />
        </View>
        {publicationSelection && draftAssets.length > 1 ? (
          <View style={styles.mediaSelectionStripFloating}>
            <SelectionStrip assets={draftAssets} />
          </View>
        ) : null}
        <View style={styles.mediaPublishPanel}>
          {storyPreview ? (
            <Text style={styles.mediaCameraHint}>
              Проверьте материал перед публикацией
            </Text>
          ) : null}
          <View style={styles.mediaPublishActions}>
            <Pressable
              accessibilityRole="button"
              disabled={isPublishing}
              onPress={() => discardDraftAndReturnToCamera(mode)}
              style={styles.mediaRetakeButton}
            >
              <Text style={styles.mediaRetakeText}>
                {publicationSelection
                  ? 'Камера'
                  : storyPreview
                    ? 'Переснять'
                    : 'Отменить'}
              </Text>
            </Pressable>
            {publicationSelection ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void pickFromLibrary('publication', true)}
                style={styles.mediaRetakeButton}
              >
                <Text style={styles.mediaRetakeText}>Несколько</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={isPublishing}
              onPress={() => {
                if (storyPreview) {
                  void publishAssets(draftAssets, 'story', '');
                  return;
                }
                setStage(
                  publicationSelection
                    ? 'description'
                    : reelsConfirm
                      ? 'reels-preview'
                      : 'description',
                );
              }}
              style={[
                styles.mediaPublishPrimaryButton,
                isPublishing && styles.disabledButton,
              ]}
            >
              {isPublishing ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
              <Text style={styles.mediaPublishPrimaryText}>
                {isPublishing
                  ? 'Публикуем...'
                  : storyPreview
                    ? 'Опубликовать'
                    : 'Далее'}
              </Text>
              {!storyPreview && !isPublishing ? (
                <ArrowRight color={colors.surface} size={20} strokeWidth={2.3} />
              ) : null}
            </Pressable>
          </View>
          {storyPreview && uploadStatus ? (
            <View style={styles.mediaCameraStatusBubble}>
              {uploadState === 'uploading' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : null}
              <Text
                accessibilityLiveRegion="polite"
                style={styles.mediaCameraStatusTextPlain}
              >
                {uploadStatus}
              </Text>
              {uploadState === 'error' && retryDraft.current ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void retryPublication()}
                  style={styles.mediaCameraRetryInline}
                >
                  <Text style={styles.mediaCameraRetryInlineText}>Повторить</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mediaCaptureRoot}>
      {cameraAccessGranted ? (
        isReviewMode ? (
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={reviewCameraSource}
            style={styles.mediaCameraPreview}
          />
        ) : (
          <CameraView
            active
            facing={cameraFacing}
            mirror={cameraFacing === 'front'}
            mode={cameraMode}
            mute={false}
            onCameraReady={() => {
              setCameraReady(true);
              setCameraError('');
            }}
            onMountError={(event) => setCameraError(event.message)}
            ref={cameraRef}
            style={styles.mediaCameraPreview}
          />
        )
      ) : (
        <View style={styles.mediaCameraPermissionState}>
          <View style={styles.mediaCameraPermissionIcon}>
            <Camera color={colors.surface} size={34} strokeWidth={1.9} />
          </View>
          <Text style={styles.mediaCameraPermissionTitle}>Разрешите камеру</Text>
          <Text style={styles.mediaCameraPermissionText}>
            Камера нужна только для фото и видео, которые вы решите опубликовать.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (cameraPermission && !cameraPermission.canAskAgain) {
                void Linking.openSettings();
              } else {
                void requestCameraAccess();
              }
            }}
            style={styles.mediaCameraPermissionButton}
          >
            <Text style={styles.mediaCameraPermissionButtonText}>
              {cameraPermission && !cameraPermission.canAskAgain
                ? 'Открыть настройки'
                : 'Разрешить камеру'}
            </Text>
          </Pressable>
        </View>
      )}

      <View style={styles.mediaCameraShadeTop} />
      <View style={styles.mediaCameraTopBar}>
        <Pressable
          accessibilityLabel="Закрыть камеру"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.mediaCameraRoundButton}
        >
          <X color={colors.surface} size={28} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.mediaCameraTitleWrap}>
          <Text style={styles.mediaCameraTitle}>Создать</Text>
          {isRecording ? (
            <Text style={styles.mediaRecordingTimer}>{recordingTime} / 01:00</Text>
          ) : null}
        </View>
        <Pressable
          accessibilityLabel="Открыть настройки"
          accessibilityRole="button"
          disabled={isRecording || isPublishing}
          onPress={onOpenSettings}
          style={styles.mediaCameraRoundButton}
        >
          <Settings color={colors.surface} size={26} strokeWidth={2} />
        </Pressable>
      </View>

      {cameraError || uploadStatus ? (
        <View style={styles.mediaCameraStatus}>
          <View style={styles.mediaCameraStatusBubble}>
            {uploadState === 'uploading' ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : null}
            <Text accessibilityLiveRegion="polite" style={styles.mediaCameraStatusTextPlain}>
              {cameraError || uploadStatus}
            </Text>
            {uploadState === 'error' && retryDraft.current ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void retryPublication()}
                style={styles.mediaCameraRetryInline}
              >
                <Text style={styles.mediaCameraRetryInlineText}>Повторить</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.mediaCameraBottomBar}>
        {mode === 'publication' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void pickFromLibrary('publication', true)}
            style={styles.mediaMultiplePickerButton}
          >
            <Grid2X2 color="#FFFFFF" size={16} strokeWidth={2.2} />
            <Text style={styles.mediaMultiplePickerText}>Выбрать несколько</Text>
          </Pressable>
        ) : null}
        <Text style={styles.mediaCameraHint}>
          {mode === 'story'
            ? 'Нажмите — фото · удерживайте — видео'
            : mode === 'reels'
              ? isRecording
                ? 'Нажмите ещё раз, чтобы остановить'
                : 'Нажмите, чтобы начать запись'
              : 'Нажмите, чтобы сделать фото'}
        </Text>
        <View style={styles.mediaCameraControls}>
          <Pressable
            accessibilityLabel="Выбрать из галереи"
            accessibilityRole="button"
            disabled={isRecording || isPublishing}
            onPress={() => void pickFromLibrary(mode, false)}
            style={styles.mediaCameraSideButton}
          >
            {media[0]?.uri ? (
              <Image
                accessibilityIgnoresInvertColors
                resizeMode="cover"
                source={{ uri: media[0].uri }}
                style={styles.mediaCameraLibraryThumb}
              />
            ) : (
              <ImagePlus color={colors.surface} size={25} strokeWidth={2.1} />
            )}
          </Pressable>
          <Pressable
            accessibilityLabel={isRecording ? 'Остановить запись' : 'Кнопка съёмки'}
            accessibilityRole="button"
            delayLongPress={320}
            disabled={isPublishing}
            onLongPress={() => {
              if (mode !== 'story' || isPublishing) return;
              longPressConsumed.current = true;
              void startVideoRecording('story');
            }}
            onPress={handleShutterPress}
            onPressOut={() => {
              if (mode === 'story' && longPressConsumed.current) {
                stopVideoRecording();
                setTimeout(() => {
                  longPressConsumed.current = false;
                }, 0);
              }
            }}
            style={[
              styles.mediaShutterOuter,
              isRecording && styles.mediaShutterOuterRecording,
            ]}
          >
            <View
              style={[
                styles.mediaShutterInner,
                isRecording && styles.mediaShutterInnerRecording,
              ]}
            />
          </Pressable>
          <Pressable
            accessibilityLabel="Переключить фронтальную и основную камеру"
            accessibilityRole="button"
            disabled={isRecording || isPublishing}
            onPress={() =>
              setCameraFacing((current) => (current === 'front' ? 'back' : 'front'))
            }
            style={styles.mediaCameraSideButton}
          >
            <Repeat2 color={colors.surface} size={25} strokeWidth={2.1} />
          </Pressable>
        </View>
        <View
          onTouchEnd={(event) => {
            const delta = event.nativeEvent.pageX - modeSwipeStartX.current;
            if (Math.abs(delta) < 42) return;
            const currentIndex = MODES.findIndex((item) => item.id === mode);
            const nextIndex = Math.max(
              0,
              Math.min(MODES.length - 1, currentIndex + (delta < 0 ? 1 : -1)),
            );
            selectMode(MODES[nextIndex].id);
          }}
          onTouchStart={(event) => {
            modeSwipeStartX.current = event.nativeEvent.pageX;
          }}
          style={styles.mediaModeCarousel}
        >
          {MODES.map((item) => (
            <Pressable
              accessibilityRole="button"
              key={item.id}
              onPress={() => selectMode(item.id)}
              style={styles.mediaModeButton}
            >
              <Text
                style={[
                  styles.mediaModeText,
                  item.id === mode && styles.mediaModeTextActive,
                ]}
              >
                {item.label}
              </Text>
              {item.id === mode ? <View style={styles.mediaModeIndicator} /> : null}
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function SelectionStrip({
  assets,
}: {
  assets: ImagePicker.ImagePickerAsset[];
}) {
  return (
    <ScrollView horizontal contentContainerStyle={styles.mediaSelectionStrip}>
      {assets.map((asset, index) => (
        <View key={`${asset.uri}-${index}`} style={styles.mediaSelectionThumbWrap}>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={{ uri: asset.uri }}
            style={styles.mediaSelectionThumb}
          />
          <View style={styles.mediaSelectionNumber}>
            <Text style={styles.mediaSelectionNumberText}>{index + 1}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
