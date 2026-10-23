/*!
THESIS: SVADBA.kz becomes a content-first social marketplace; vendor work leads and decorative card chrome recedes.
OWN-WORLD: Instagram Prism neutrals, #4A5DF9 actions, flat 1px separators, 12–16px surfaces, circular identity, 24px outline/filled icons.
STORY: Clients scan real work, open profiles, contact and book; vendors publish, manage demand, dates, and performance without learning new flows.
FIRST VIEWPORT: stable top identity, edge-to-edge content, restrained controls, flat bottom navigation, one unmistakable primary action.
FORM: user-pinned Instagram design system; position 1; seed user-pinned-instagram-2026.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
*/

import { StatusBar } from 'expo-status-bar';
import { fetch as expoFetch } from 'expo/fetch';
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile, UploadType } from 'expo-file-system';
import { ResponseType } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  ArrowRight,
  ArrowLeft,
  AtSign,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Camera,
  Grid2X2,
  House,
  ImagePlus,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  MessageCircle,
  Plus,
  Play,
  Repeat2,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Animated,
  Image,
  type ImageSourcePropType,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  CatalogScreen,
} from './src/screens/client/CatalogScreen';
import { VendorDetailScreen } from './src/screens/VendorDetailScreen';
import { KeyboardSafeScrollView as ScrollView } from './src/components/KeyboardSafeScrollView';
import {
  categories as mockCategories,
  vendors as mockVendors,
} from './src/data/mock';
import { getVendorImageSource } from './src/data/vendorImages';
import { ScreenGallery } from './src/review/ScreenGallery';
import {
  getReviewRoute,
  type ReviewScreen,
} from './src/review/screenReview';
import { styles } from './src/theme/styles';
import { colors } from './src/theme/styles';
import type { MediaLikeUser, Role, Vendor, VendorImageKey } from './src/types';
import { formatMoney } from './src/utils/format';
import {
  getInitialNotificationTarget,
  registerForPushNotifications,
  subscribeToNotificationTargets,
  type NotificationTarget,
} from './src/notifications/pushNotifications';

WebBrowser.maybeCompleteAuthSession();

type DemoRoute =
  | { name: 'catalog' }
  | { name: 'vendor'; initialProfileTab?: 'media' | 'reviews'; vendorId: string };

type AppPhase = 'auth' | 'onboarding' | 'vendorImport' | 'app';
type AuthMode = 'login' | 'register' | 'verify' | 'reset';
type VendorImportMethod = 'instagram' | 'manual' | null;
type VendorDashboardSection = 'reels' | 'requests' | 'calendar' | 'stats';
type ClientMainTab = 'feed' | 'requests' | 'categories' | 'event' | 'profile';
type VendorDraft = {
  name: string;
  city: string;
  category: string;
  priceFrom: string;
  phone: string;
  languages?: string;
  description?: string;
  experience?: string;
  basePackage?: string;
  standardPackage?: string;
  premiumPackage?: string;
  basePackagePrice?: string;
  standardPackagePrice?: string;
  premiumPackagePrice?: string;
  basePackageDetails?: string;
  standardPackageDetails?: string;
  premiumPackageDetails?: string;
  included?: string;
  extraServices?: string;
  prepayment?: string;
};
type ClientProfileDraft = {
  name: string;
  phone: string;
  city: string;
  language: string;
  notifications: string;
};
type SettingsValueMap = Record<string, Record<string, string>>;
type VendorCalendarState = {
  busyDates: string[];
  freeDates: string[];
};
type VendorStatsSnapshot = {
  profileViews: number;
  mediaViews: number;
  saves: number;
  whatsappClicks: number;
  requests: number;
  newRequests: number;
  inWorkRequests: number;
  doneRequests: number;
  mediaCount: number;
  reelCount: number;
  photoCount: number;
  busyDateCount: number;
  activityBars: number[];
};
type VendorAnalyticsSnapshot = {
  profileViews: number;
  mediaViews: number;
  saves: number;
  whatsappClicks: number;
  events: Array<{ type: string; createdAt: string }>;
};
type EventDraft = {
  type: string;
  date: string;
  city: string;
  guests: string;
  budget: string;
  place: string;
  comment: string;
};
type ClientEvent = EventDraft & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
type ClientBooking = {
  id: string;
  clientEmail?: string;
  clientId?: string;
  clientName?: string;
  createdAt?: string;
  updatedAt?: string;
  date: string;
  timeFrom?: string;
  timeTo?: string;
  status: string;
  vendorId: string;
  vendorName: string;
  amount: string;
};
type UploadedMediaItem = {
  id: string;
  uri: string;
  type: 'image' | 'video';
  fileName: string;
  caption?: string;
  imageKey?: VendorImageKey;
  sourceUrl?: string;
  selected: boolean;
  role: 'main' | 'cover' | 'reels' | 'profile' | 'story';
  status: 'ready' | 'uploaded' | 'uploading' | 'processing' | 'failed';
  uploadProgress?: number;
  uploadError?: string;
};
type UserDocument = {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
};
type InstagramDraftMediaItem = {
  id: string;
  providerMediaId?: string;
  type: 'video' | 'image';
  title: string;
  caption?: string;
  imageKey: VendorImageKey;
  mediaUrl?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  permalink?: string;
  timestamp?: string;
  source?: 'instagram' | 'instagram_collaborative';
  ownerUsername?: string;
  isCollaborative?: boolean;
};
type InstagramImportPreviewItem = InstagramDraftMediaItem & {
  sourceUrl: string;
};
type InstagramMediaNotice = {
  code: string;
  message: string;
  severity?: 'info' | 'warning';
};
type InstagramImportJob = {
  id: string;
  status: 'queued' | 'running' | 'complete' | 'failed';
  totalCount: number;
  processedCount: number;
  downloadedCount: number;
  skippedCount: number;
  failedCount: number;
  error?: string;
  errors?: { id?: string; permalink?: string; message: string }[];
  user?: ApiUser;
};
type ApiUser = {
  id: string;
  email: string;
  role: Role;
  authToken?: string | null;
  vendorId?: string | null;
  profileCreated: boolean;
  vendorDraft: VendorDraft;
  vendorSettingsValues?: SettingsValueMap;
  clientProfile?: ClientProfileDraft;
  clientSettingsValues?: SettingsValueMap;
  selectedImportIds: string[];
  instagramHandle: string;
  eventDraft?: EventDraft;
  eventHistory?: ClientEvent[];
  bookings?: ClientBooking[];
  blockedVendorIds?: string[];
  blockedUserIds?: string[];
  likedVendorIds?: string[];
  likedMediaIds?: string[];
  savedMediaIds?: string[];
  savedVendorIds?: string[];
  uploadedMedia?: UploadedMediaItem[];
  documents?: UserDocument[];
  vendorVerification?: {
    status: string;
    moderatorComment: string;
    updatedAt?: string | null;
  };
  pushNotifications?: {
    enabled: boolean;
    registeredTokens: number;
  };
  instagramConnected?: boolean;
  instagramProfile?: {
    username?: string;
    accountType?: string;
    profilePictureUrl?: string;
    mediaCount?: number;
    mode?: string;
    connectedAt?: string;
  } | null;
};
type OAuthProvider = 'google' | 'apple';

const GUEST_CATALOG_SEEN_KEY = 'svadba_guest_catalog_seen';
const APP_ROLE_KEY = 'svadba_active_role';
const APP_PROFILE_CREATED_KEY = 'svadba_profile_created';
const APP_USER_ID_KEY = 'svadba_user_id';
const APP_AUTH_TOKEN_KEY = 'svadba_auth_token';
const envApiBaseUrl =
  typeof process !== 'undefined'
    ? process.env.EXPO_PUBLIC_API_BASE_URL
    : undefined;
const isWebRuntime = Platform.OS === 'web';
const isDevRuntime =
  typeof __DEV__ !== 'undefined'
    ? __DEV__
    : typeof process !== 'undefined'
      ? process.env.NODE_ENV !== 'production'
      : false;
const LOCALHOST_NAME = ['local', 'host'].join('');
const LOCAL_API_URL = `http://${LOCALHOST_NAME}:4000/api`;
const API_URL =
  envApiBaseUrl ??
  (isWebRuntime &&
  typeof window !== 'undefined' &&
  window.location?.port === '8083'
    ? LOCAL_API_URL
    : isDevRuntime
      ? LOCAL_API_URL
      : isWebRuntime
        ? '/api'
      : 'https://d2ne1y5a2elsg5.cloudfront.net/api');
const SHOW_TEST_LOGIN =
  typeof process !== 'undefined' && process.env.EXPO_PUBLIC_SHOW_TEST_LOGIN === '1';
const ALLOW_OFFLINE_AUTH =
  typeof process !== 'undefined' && process.env.EXPO_PUBLIC_ALLOW_OFFLINE_AUTH === '1';
const REVIEW_SCREENS_ENABLED =
  typeof process !== 'undefined' && process.env.EXPO_PUBLIC_ENABLE_REVIEW_SCREENS === '1';
const LOCAL_AUTH_BYPASS_ENABLED = isLocalAuthBypassEnabled();
const SENTRY_DSN =
  typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_SENTRY_DSN || '' : '';
const SENTRY_ENVIRONMENT =
  typeof process !== 'undefined'
    ? process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || (isDevRuntime ? 'development' : 'production')
    : 'production';
const SENTRY_TRACES_SAMPLE_RATE = Number(
  typeof process !== 'undefined'
    ? process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || (isDevRuntime ? '0' : '0.1')
    : '0.1',
);
const SENTRY_TEST_ENABLED =
  typeof process !== 'undefined' && process.env.EXPO_PUBLIC_SENTRY_TEST_ENABLED === '1';
const APPLE_SIGN_IN_ENABLED =
  typeof process === 'undefined' || process.env.EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED !== '0';
const GOOGLE_WEB_CLIENT_ID =
  typeof process !== 'undefined'
    ? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || ''
    : '';
const GOOGLE_IOS_CLIENT_ID =
  typeof process !== 'undefined'
    ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || ''
    : '';
function getGoogleReversedClientId(clientId: string) {
  const cleanClientId = clientId.trim();
  return cleanClientId.endsWith('.apps.googleusercontent.com')
    ? `com.googleusercontent.apps.${cleanClientId.replace('.apps.googleusercontent.com', '')}`
    : '';
}
const GOOGLE_IOS_REVERSED_CLIENT_ID =
  typeof process !== 'undefined'
    ? process.env.EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID ||
      getGoogleReversedClientId(GOOGLE_IOS_CLIENT_ID)
    : getGoogleReversedClientId(GOOGLE_IOS_CLIENT_ID);
const GOOGLE_IOS_REDIRECT_URI =
  Platform.OS === 'ios' && GOOGLE_IOS_REVERSED_CLIENT_ID
    ? `${GOOGLE_IOS_REVERSED_CLIENT_ID}:/oauthredirect`
    : '';
const GOOGLE_ANDROID_CLIENT_ID =
  typeof process !== 'undefined'
    ? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || ''
    : '';
const GOOGLE_CLIENT_ID =
  Platform.OS === 'ios'
    ? GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID
    : Platform.OS === 'android'
      ? GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID
      : GOOGLE_WEB_CLIENT_ID;

if (Platform.OS !== 'web' && GOOGLE_WEB_CLIENT_ID) {
  GoogleSignin.configure({
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });
}
const INTERNAL_EMAIL_DOMAIN = ['svadba', 'kz'].join('.');
const OFFLINE_TEST_EMAIL_DOMAIN =
  typeof process !== 'undefined'
    ? process.env.EXPO_PUBLIC_OFFLINE_TEST_EMAIL_DOMAIN || INTERNAL_EMAIL_DOMAIN
    : INTERNAL_EMAIL_DOMAIN;
const OFFLINE_TEST_CODE =
  ALLOW_OFFLINE_AUTH && typeof process !== 'undefined'
    ? process.env.EXPO_PUBLIC_OFFLINE_TEST_CODE || ''
    : '';
const OFFLINE_TEST_PASSWORD =
  ALLOW_OFFLINE_AUTH && typeof process !== 'undefined'
    ? process.env.EXPO_PUBLIC_OFFLINE_TEST_PASSWORD || ''
    : '';
let activeAuthToken: string | null = getStoredAuthTokenSync();

function makeInternalEmail(name: string, domain = INTERNAL_EMAIL_DOMAIN) {
  return `${name}@${domain}`;
}

function isLocalAuthBypassEnabled() {
  if (!isDevRuntime || !isWebRuntime || typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location?.hostname;
  const params = new URLSearchParams(window.location?.search ?? '');
  if (params.get('auth') === '1') {
    return false;
  }

  return hostname === LOCALHOST_NAME || hostname === '127.0.0.1' || hostname === '[::1]';
}

function getLocalAuthBypassRole(): Role {
  if (!LOCAL_AUTH_BYPASS_ENABLED || typeof window === 'undefined') {
    return 'client';
  }

  const roleParam = new URLSearchParams(window.location?.search ?? '').get('localRole');
  return roleParam === 'vendor' ? 'vendor' : 'client';
}

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    enableAutoSessionTracking: true,
    environment: SENTRY_ENVIRONMENT,
    tracesSampleRate: Number.isFinite(SENTRY_TRACES_SAMPLE_RATE)
      ? SENTRY_TRACES_SAMPLE_RATE
      : 0.1,
  });
}

type ClientErrorContext = {
  fatal?: boolean;
  method?: string;
  path?: string;
  status?: number;
};

async function reportClientError(
  error: unknown,
  source: string,
  context: ClientErrorContext = {},
) {
  if (SENTRY_DSN) return;
  const normalized = error instanceof Error ? error : new Error(String(error || 'Unknown error'));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    await fetch(`${API_URL}/client-errors`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: context.fatal ? 'fatal' : 'error',
        source,
        message: normalized.message,
        stack: normalized.stack || '',
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version || '',
        buildNumber:
          Constants.expoConfig?.ios?.buildNumber ||
          String(Constants.expoConfig?.android?.versionCode || ''),
        fatal: context.fatal === true,
        method: context.method,
        path: context.path,
        status: context.status,
      }),
    });
  } catch {
    // Error reporting must never interrupt the user flow.
  } finally {
    clearTimeout(timeout);
  }
}

class ProductionErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void reportClientError(
      new Error(`${error.message}\n${info.componentStack || ''}`),
      'react_error_boundary',
      { fatal: true },
    );
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.darkBackground }}>
        <View
          style={{
            flex: 1,
            padding: 24,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          <Text style={styles.authTitle}>Не удалось открыть экран</Text>
          <Text style={styles.authText}>Ошибка отправлена. Попробуйте открыть приложение снова.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => this.setState({ hasError: false })}
            style={styles.authPrimaryButton}
          >
            <Text style={styles.authPrimaryText}>Повторить</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

if (!SENTRY_DSN) {
  const runtime = globalThis as typeof globalThis & {
    ErrorUtils?: {
      getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
      setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
    };
  };
  const previousHandler = runtime.ErrorUtils?.getGlobalHandler?.();
  runtime.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
    void reportClientError(error, 'global_error_handler', { fatal: isFatal === true });
    previousHandler?.(error, isFatal);
  });
}

function openExternalUrl(url: string) {
  if (isWebRuntime && typeof window !== 'undefined') {
    window.location.href = url;
    return Promise.resolve(true);
  }

  return Linking.openURL(url);
}

function getAppReturnUrl() {
  if (isWebRuntime && typeof window !== 'undefined') {
    return `${window.location.origin}/`;
  }

  return '';
}

function parseInstagramUrls(value: string) {
  const urls = value
    .split(/[\s,]+/)
    .map((part) => part.trim().replace(/[)\].,;]+$/, ''))
    .map((part) => {
      const candidate = part.startsWith('instagram.com') || part.startsWith('www.instagram.com')
        ? `https://${part}`
        : part;
      try {
        const url = new URL(candidate);
        const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
        if (host !== 'instagram.com' || url.pathname === '/') {
          return null;
        }
        return `https://www.instagram.com${url.pathname}`;
      } catch {
        return null;
      }
    })
    .filter((url): url is string => Boolean(url));

  return Array.from(new Set(urls));
}

function getInstagramOAuthFallbackNotice(error: string) {
  if (!error) return '';
  if (error.includes('Instagram Professional account')) {
    return 'Meta не нашла Instagram Professional account на ваших Facebook Pages. Обычные посты подключаются через Instagram Login; совместные посты можно добавить через ссылку и файл ниже.';
  }
  return `Meta не подключила совместные публикации: ${error}`;
}

const DEFAULT_SHORTS_CATEGORY = 'Ведущие';
const DEFAULT_EVENT_DRAFT: EventDraft = {
  type: '',
  date: '',
  city: '',
  guests: '',
  budget: '',
  place: '',
  comment: '',
};
const CLIENT_EVENT_TYPES = [
  'Свадьба',
  'Қыз ұзату',
  'Құдалық',
  'Юбилей',
  'Корпоратив',
  'День рождения',
  'Той',
  'Другое',
];
const KAZAKHSTAN_MAJOR_CITIES = [
  'Алматы',
  'Астана',
  'Шымкент',
  'Караганда',
  'Актобе',
  'Тараз',
  'Павлодар',
  'Усть-Каменогорск',
  'Семей',
  'Кызылорда',
  'Костанай',
  'Уральск',
  'Атырау',
  'Актау',
  'Петропавловск',
  'Туркестан',
  'Кокшетау',
  'Талдыкорган',
];
const INTERFACE_LANGUAGES = ['Русский', 'Қазақша', 'English'];
const WORK_LANGUAGES = [
  'Русский',
  'Қазақша',
  'English',
  'Русский, Қазақша',
  'Русский, Қазақша, English',
];

function GoogleMark() {
  return (
    <Svg width={22} height={22} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59A14.5 14.5 0 0 1 9.77 24c0-1.6.27-3.14.76-4.59l-7.98-6.19A24.03 24.03 0 0 0 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

function getRemoteImageSource(uri?: string) {
  const cleanUri = String(uri || '').trim();
  return cleanUri ? ({ uri: cleanUri } satisfies ImageSourcePropType) : null;
}

function getInstagramMediaImageSource(item: InstagramDraftMediaItem) {
  return (
    getRemoteImageSource(item.thumbnailUrl || item.mediaUrl) ??
    getVendorImageSource({
      category: 'Ведущие',
      imageKey: item.imageKey,
    })
  );
}

function getUploadedMediaImageSource(
  item: UploadedMediaItem,
  category = 'Ведущие',
) {
  return (
    getRemoteImageSource(item.uri) ??
    getVendorImageSource({
      category,
      imageKey: item.imageKey ?? 'host',
    })
  );
}

const clientStories = [
  {
    title: 'Начните с вашего события',
    text: 'Выберите формат мероприятия и нужные услуги.',
    image: require('./assets/onboarding/client/1.png'),
  },
  {
    title: 'Находите подрядчиков в ленте',
    text: 'Смотрите реальные фото и видео их работы.',
    image: require('./assets/onboarding/client/2.png'),
  },
  {
    title: 'Сравнивайте профили',
    text: 'Портфолио, цены, отзывы и свободные даты собраны вместе.',
    image: require('./assets/onboarding/client/3.png'),
  },
  {
    title: 'Сохраняйте лучших',
    text: 'Соберите понравившихся подрядчиков в одном списке.',
    image: require('./assets/onboarding/client/4.png'),
  },
  {
    title: 'Обсуждайте напрямую',
    text: 'Свяжитесь с подрядчиком и уточните детали события.',
    image: require('./assets/onboarding/client/5.png'),
  },
  {
    title: 'Бронируйте дату',
    text: 'Выберите свободный день и отправьте заявку.',
    image: require('./assets/onboarding/client/6.png'),
  },
  {
    title: 'Всё событие под контролем',
    text: 'Следите за бюджетом, бронями и подготовкой в одном месте.',
    image: require('./assets/onboarding/client/7.png'),
  },
];

const vendorStories = [
  {
    title: 'Создайте сильный профиль',
    text: 'Расскажите о себе, услугах, городе и ценах.',
    image: require('./assets/onboarding/vendor/1.png'),
  },
  {
    title: 'Покажите лучшие работы',
    text: 'Добавьте фотографии и видео своего портфолио.',
    image: require('./assets/onboarding/vendor/2.png'),
  },
  {
    title: 'Выберите главное',
    text: 'Назначьте обложку профиля и основное видео для ленты.',
    image: require('./assets/onboarding/vendor/3.png'),
  },
  {
    title: 'Управляйте датами',
    text: 'Отмечайте свободные и занятые дни в календаре.',
    image: require('./assets/onboarding/vendor/4.png'),
  },
  {
    title: 'Получайте заявки',
    text: 'Клиенты отправляют дату, формат события и запрос на бронь.',
    image: require('./assets/onboarding/vendor/5.png'),
  },
  {
    title: 'Следите за результатом',
    text: 'Просмотры, сохранения и обращения показывают интерес клиентов.',
    image: require('./assets/onboarding/vendor/6.png'),
  },
  {
    title: 'Вся работа в одном кабинете',
    text: 'Управляйте медиа, ценами, документами и уведомлениями.',
    image: require('./assets/onboarding/vendor/7.png'),
  },
];

const instagramPermissions = ['Профиль', 'Фото', 'Видео', 'Reels'];

const vendorSettings = [
  { label: 'Профиль', meta: 'Имя, категория, город, описание' },
  { label: 'Медиа', meta: 'Фото, видео, обложки, порядок' },
  { label: 'Instagram', meta: 'Импорт, обновление, отключение' },
  { label: 'Услуги и цены', meta: 'Пакеты, доп. услуги, цена от' },
  { label: 'Даты', meta: 'Календарь, занято, свободно' },
  { label: 'Статистика', meta: 'Просмотры, лайки, WhatsApp-клики' },
  { label: 'Уведомления', meta: 'Заявки, сообщения, напоминания' },
  { label: 'Документы', meta: 'Верификация, реквизиты, договор' },
  { label: 'Настройки', meta: 'Язык, почта, смена пароля, удаление' },
];

const clientSettings = [
  { label: 'Мероприятие', meta: 'Тип, дата, город, гости, бюджет' },
  { label: 'Бронирования', meta: 'Подрядчики, даты, статусы, сумма' },
  { label: 'Избранное', meta: 'Сохраненные подрядчики и сравнение' },
  { label: 'Календарь', meta: 'Дата мероприятия, дедлайны, встречи' },
  { label: 'Бюджет', meta: 'План, траты, остаток' },
  { label: 'Документы', meta: 'Договоры, чеки, подтверждения' },
  { label: 'Уведомления', meta: 'Ответы, бронь, оплата' },
  { label: 'Профиль', meta: 'Имя, телефон, почта, город' },
  { label: 'Настройки', meta: 'Язык, почта, смена пароля, удаление' },
];

const DEFAULT_CLIENT_PROFILE: ClientProfileDraft = {
  name: '',
  phone: '',
  city: 'Алматы',
  language: 'Русский',
  notifications: 'Включено',
};
const DEFAULT_VENDOR_ANALYTICS: VendorAnalyticsSnapshot = {
  profileViews: 0,
  mediaViews: 0,
  saves: 0,
  whatsappClicks: 0,
  events: [],
};
const REVIEW_EVENT_DRAFT: EventDraft = {
  type: 'Свадьба',
  date: '2026-12-12',
  city: 'Алматы',
  guests: '120',
  budget: '6500000',
  place: 'Royal Tulip\nул. Марата Оспанова, 401',
  comment: 'Камерная церемония и ужин для семьи и друзей.',
};
const REVIEW_BOOKINGS: ClientBooking[] = [
  {
    id: 'review-booking-1',
    clientId: 'review-client',
    clientName: 'Алия Садыкова',
    createdAt: '2026-10-13T08:30:00.000Z',
    date: '2026-12-12',
    timeFrom: '17:00',
    timeTo: '23:00',
    status: 'Ожидает подтверждения',
    vendorId: 'v1',
    vendorName: 'Aigerim Decor Studio',
    amount: '280.000 ₸',
  },
];
const REVIEW_EVENT_HISTORY: ClientEvent[] = [
  {
    ...REVIEW_EVENT_DRAFT,
    id: 'review-event-1',
    createdAt: '2026-10-12T10:00:00.000Z',
    updatedAt: '2026-10-13T08:30:00.000Z',
  },
  {
    type: 'День рождения',
    date: '2026-05-18',
    city: 'Алматы',
    guests: '35',
    budget: '900000',
    place: 'Villa Dei Fiori\nул. Навои, 310Б',
    comment: 'Семейный ужин.',
    id: 'review-event-archive',
    createdAt: '2026-04-01T09:00:00.000Z',
    updatedAt: '2026-05-19T09:00:00.000Z',
  },
];
const REVIEW_UPLOADED_MEDIA: UploadedMediaItem[] = [
  {
    id: 'review-media-video',
    uri: '',
    type: 'video',
    fileName: 'showreel.mp4',
    caption: 'Фрагмент свадебной программы',
    imageKey: 'host',
    selected: true,
    role: 'main',
    status: 'uploaded',
  },
  {
    id: 'review-media-photo',
    uri: '',
    type: 'image',
    fileName: 'portfolio.jpg',
    caption: 'Вечерняя церемония в Алматы',
    imageKey: 'hall',
    selected: true,
    role: 'cover',
    status: 'uploaded',
  },
];
const REVIEW_INSTAGRAM_MEDIA: InstagramDraftMediaItem[] = [
  {
    id: 'review-instagram-1',
    providerMediaId: 'ig-review-1',
    type: 'image',
    title: 'Церемония в Алматы',
    caption: 'Новая работа',
    imageKey: 'hall',
    source: 'instagram',
    ownerUsername: 'svadba.review',
  },
  {
    id: 'review-instagram-2',
    providerMediaId: 'ig-review-2',
    type: 'video',
    title: 'Showreel',
    caption: 'Лучшие моменты',
    imageKey: 'host',
    source: 'instagram',
    ownerUsername: 'svadba.review',
  },
];
const REVIEW_VENDOR_ANALYTICS: VendorAnalyticsSnapshot = {
  profileViews: 1248,
  mediaViews: 8930,
  saves: 184,
  whatsappClicks: 73,
  events: [
    { type: 'profile_view', createdAt: '2026-10-13T08:30:00.000Z' },
    { type: 'save', createdAt: '2026-10-13T08:32:00.000Z' },
  ],
};

function getReviewUploadedMedia(
  config?: ReviewScreen['config'],
): UploadedMediaItem[] {
  if (!config || config.vendorMediaState === 'empty') {
    return [];
  }
  if (config.vendorData !== 'populated' && !config.vendorMediaState) {
    return [];
  }

  return REVIEW_UPLOADED_MEDIA.map((item, index) => {
    if (config.vendorMediaState === 'uploading' && index === 0) {
      return { ...item, status: 'uploading', uploadProgress: 56 };
    }
    if (config.vendorMediaState === 'failed' && index === 0) {
      return {
        ...item,
        status: 'failed',
        uploadProgress: 0,
        uploadError: 'Не удалось загрузить файл. Проверьте соединение и повторите.',
      };
    }
    return { ...item, status: 'uploaded' };
  });
}

function createClientProfile(email = ''): ClientProfileDraft {
  return {
    ...DEFAULT_CLIENT_PROFILE,
    name: email ? email.split('@')[0] : '',
  };
}

function App(): ReactElement {
  const sentryTestRequested =
    isWebRuntime &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('sentry-test') === '1';

  if (sentryTestRequested) {
    return <SentrySmokeScreen />;
  }

  const reviewRoute = getReviewRoute(
    isWebRuntime && (isDevRuntime || REVIEW_SCREENS_ENABLED),
  );
  if (reviewRoute?.kind === 'gallery') {
    return <ScreenGallery />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled={Platform.OS !== 'web'}
      style={{ flex: 1 }}
    >
      <ProductApp reviewScreen={reviewRoute?.kind === 'screen' ? reviewRoute.screen : undefined} />
    </KeyboardAvoidingView>
  );
}

function SentrySmokeScreen() {
  const [status, setStatus] = useState('Готовим тест Sentry...');

  useEffect(() => {
    if (!SENTRY_TEST_ENABLED) {
      setStatus('Sentry smoke отключен. Соберите internal build с EXPO_PUBLIC_SENTRY_TEST_ENABLED=1.');
      return;
    }
    if (!SENTRY_DSN) {
      setStatus('Sentry DSN не настроен в этом build.');
      return;
    }

    const eventId = Sentry.withScope((scope) => {
      scope.setTag('svadba.smoke', 'sentry');
      scope.setLevel('error');
      return Sentry.captureException(
        new Error(`SVADBA.kz Sentry smoke ${new Date().toISOString()}`),
      );
    });
    setStatus(`Sentry test event отправлен: ${eventId || 'queued'}`);
  }, []);

  return (
    <SafeAreaView style={styles.authScreen}>
      <View style={styles.authHero}>
        <View style={styles.authTopPill}>
          <Text style={styles.authTopPillText}>SVADBA.kz</Text>
        </View>
        <Text style={styles.authTitle}>Sentry smoke</Text>
        <Text style={styles.authText}>{status}</Text>
      </View>
    </SafeAreaView>
  );
}

function ProductApp({ reviewScreen }: { reviewScreen?: ReviewScreen }): ReactElement {
  const reviewConfig = reviewScreen?.config;
  const urlParams =
    isWebRuntime && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
  const openedFromInstagramCallback =
    urlParams?.get('settings') === 'instagram' || urlParams?.get('instagram') === 'select';
  const [startInShorts] = useState(() => getGuestStartInShorts());
  const [localAuthBypassUser] = useState<ApiUser | null>(() => {
    if (reviewConfig) {
      return null;
    }
    if (!LOCAL_AUTH_BYPASS_ENABLED) {
      return null;
    }

    const bypassRole = getLocalAuthBypassRole();
    return createOfflineUser(
      makeInternalEmail(bypassRole === 'vendor' ? 'local-vendor' : 'local-client'),
      bypassRole,
      true,
    );
  });
  const [phase, setPhase] = useState<AppPhase>(() =>
    reviewConfig?.phase ??
    (localAuthBypassUser || openedFromInstagramCallback ? 'app' : getInitialPhase()),
  );
  const [userId, setUserId] = useState(() =>
    reviewConfig ? `review-${reviewConfig.role}` : localAuthBypassUser?.id ?? getStoredUserId(),
  );
  const [currentVendorId, setCurrentVendorId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState(() => localAuthBypassUser?.authToken ?? activeAuthToken);
  const [email, setEmail] = useState(() =>
    reviewConfig ? makeInternalEmail(`review-${reviewConfig.role}`) : localAuthBypassUser?.email ?? '',
  );
  const [password, setPassword] = useState(() => (reviewConfig ? 'prototype' : ''));
  const [passwordConfirm, setPasswordConfirm] = useState(() => (reviewConfig ? 'prototype' : ''));
  const [verificationCode, setVerificationCode] = useState(() => (reviewConfig ? '123456' : ''));
  const [passwordResetCode, setPasswordResetCode] = useState('');
  const [passwordResetRequested, setPasswordResetRequested] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>(() => reviewConfig?.authMode ?? 'register');
  const [authMessage, setAuthMessage] = useState(reviewConfig?.authMessage ?? '');
  const [authDevCode, setAuthDevCode] = useState('');
  const [role, setRole] = useState<Role>(() =>
    reviewConfig?.role ??
    localAuthBypassUser?.role ??
    (openedFromInstagramCallback ? 'vendor' : getStoredRole() ?? 'client'),
  );
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [vendorSettingsOpen, setVendorSettingsOpen] = useState(
    reviewConfig?.vendorSettingsOpen ?? openedFromInstagramCallback,
  );
  const [clientSettingsOpen, setClientSettingsOpen] = useState(
    reviewConfig?.clientSettingsOpen ?? false,
  );
  const [clientInitialSettingLabel, setClientInitialSettingLabel] =
    useState<string | undefined>(reviewConfig?.clientSettingLabel);
  const [clientMainTab, setClientMainTab] = useState<ClientMainTab>(() =>
    reviewConfig?.clientMainTab ?? (startInShorts ? 'feed' : 'categories'),
  );
  const [clientBookings, setClientBookings] = useState<ClientBooking[]>(() =>
    reviewConfig?.clientData === 'populated' ? REVIEW_BOOKINGS : [],
  );
  const [bookingToEditId, setBookingToEditId] = useState<string | null>(null);
  const [vendorRequests, setVendorRequests] = useState<ClientBooking[]>(() =>
    reviewConfig?.vendorData === 'populated' ? REVIEW_BOOKINGS : [],
  );
  const [vendorBusyDates, setVendorBusyDates] = useState<string[]>(() =>
    reviewConfig?.vendorData === 'populated' ? ['2026-10-18', '2026-10-24'] : [],
  );
  const [vendorFreeDates, setVendorFreeDates] = useState<string[]>(() =>
    reviewConfig?.vendorData === 'populated' ? ['2026-10-16', '2026-10-20'] : [],
  );
  const [eventDraft, setEventDraft] = useState<EventDraft>(() =>
    reviewConfig?.clientData === 'populated' || reviewConfig?.clientEventEditing
      ? toDisplayEventDraft(REVIEW_EVENT_DRAFT)
      : DEFAULT_EVENT_DRAFT,
  );
  const [eventHistory, setEventHistory] = useState<ClientEvent[]>(() =>
    reviewConfig?.clientData === 'populated'
      ? REVIEW_EVENT_HISTORY.map((event) => ({
          ...event,
          date: formatStoredDate(event.date),
        }))
      : [],
  );
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMediaItem[]>(() =>
    getReviewUploadedMedia(reviewConfig),
  );
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [storyIndex, setStoryIndex] = useState(reviewConfig?.storyIndex ?? 0);
  const [storyProgress, setStoryProgress] = useState(0);
  const storyTranslateX = useRef(new Animated.Value(0)).current;
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>(() =>
    reviewConfig?.instagramImportStarted ? REVIEW_INSTAGRAM_MEDIA.map((item) => item.id) : [],
  );
  const [instagramHandle, setInstagramHandle] = useState(() =>
    reviewConfig?.instagramImportStarted ? '@svadba.review' : '',
  );
  const [instagramConnected, setInstagramConnected] = useState(
    reviewConfig?.instagramImportStarted ?? false,
  );
  const [instagramProfile, setInstagramProfile] =
    useState<ApiUser['instagramProfile']>(() =>
      reviewConfig?.instagramImportStarted
        ? {
            username: 'svadba.review',
            accountType: 'BUSINESS',
            mediaCount: REVIEW_INSTAGRAM_MEDIA.length,
            mode: 'review',
            connectedAt: '2026-10-13T08:00:00.000Z',
          }
        : null,
    );
  const [instagramImportStarted, setInstagramImportStarted] = useState(
    reviewConfig?.instagramImportStarted ?? false,
  );
  const [vendorImportMethod, setVendorImportMethod] =
    useState<VendorImportMethod>(reviewConfig?.vendorImportMethod ?? null);
  const [vendorDraft, setVendorDraft] = useState<VendorDraft>({
    name: 'kairkuka',
    city: 'Алматы',
    category: 'Ведущие',
    priceFrom: '320000',
    phone: '+77015550101',
  });
  const [vendorSettingsValues, setVendorSettingsValues] =
    useState<SettingsValueMap>({});
  const [clientProfile, setClientProfile] =
    useState<ClientProfileDraft>(() =>
      reviewConfig
        ? {
            name: 'Алия Садыкова',
            phone: '+7 701 555 01 01',
            city: 'Алматы',
            language: 'Русский',
            notifications: 'Включено',
          }
        : createClientProfile(email),
    );
  const [clientSettingsValues, setClientSettingsValues] =
    useState<SettingsValueMap>({});
  const [vendorAnalytics, setVendorAnalytics] =
    useState<VendorAnalyticsSnapshot>(() =>
      reviewConfig?.vendorData === 'populated'
        ? REVIEW_VENDOR_ANALYTICS
        : DEFAULT_VENDOR_ANALYTICS,
    );
  const [pushRegistrationMessage, setPushRegistrationMessage] = useState('');
  const lastRegisteredPushToken = useRef('');
  const lastRegisteredPushUserId = useRef('');
  const lastRegisteredPushRole = useRef<Role | null>(null);
  const [vendorDashboardTarget, setVendorDashboardTarget] =
    useState<{ section: VendorDashboardSection | 'home'; nonce: number } | null>(null);
  const [route, setRoute] = useState<DemoRoute>(() =>
    reviewConfig?.vendorId
      ? {
          name: 'vendor',
          vendorId: reviewConfig.vendorId,
          initialProfileTab: reviewConfig.vendorDetailTab,
        }
      : { name: 'catalog' },
  );
  const [likedVendorIds, setLikedVendorIds] = useState<string[]>([]);
  const [likedMediaIds, setLikedMediaIds] = useState<string[]>([]);
  const [savedMediaIds, setSavedMediaIds] = useState<string[]>([]);
  const [savedVendorIds, setSavedVendorIds] = useState<string[]>(() =>
    reviewConfig?.clientData === 'populated' ? ['v1', 'v2'] : [],
  );
  const [blockedVendorIds, setBlockedVendorIds] = useState<string[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'ok' | 'offline'>(
    reviewConfig?.clientData === 'offline' ? 'offline' : reviewConfig ? 'ok' : 'checking',
  );
  const [apiCategories, setApiCategories] = useState<string[]>(mockCategories);
  const [apiVendors, setApiVendors] = useState<Vendor[]>(mockVendors);
  const [apiVendorSettings, setApiVendorSettings] = useState(vendorSettings);
  const [apiInstagramMedia, setApiInstagramMedia] =
    useState<InstagramDraftMediaItem[]>(() =>
      reviewConfig?.instagramImportStarted ? REVIEW_INSTAGRAM_MEDIA : [],
    );
  const [authBusyProvider, setAuthBusyProvider] =
    useState<OAuthProvider | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const lastRegistrationRequest = useRef<{ email: string; requestedAt: number } | null>(
    null,
  );
  const [googleRequest, googleResponse, promptGoogleAsync] =
    Google.useAuthRequest(
      {
        androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
        iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
        redirectUri: GOOGLE_IOS_REDIRECT_URI || undefined,
        webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
        extraParams: {
          access_type: 'offline',
        },
        responseType: ResponseType.Code,
        scopes: ['openid', 'profile', 'email'],
        selectAccount: true,
        shouldAutoExchangeCode: false,
        usePKCE: true,
      },
    );

  const applyApiUser = (user: ApiUser): void => {
    setUserId(user.id);
    setCurrentVendorId(user.role === 'vendor' ? user.vendorId || `vendor_${user.id}` : null);
    saveUserId(user.id);
    void saveUserIdAsync(user.id);
    setEmail(user.email);
    setRole(user.role);
    if (user.authToken) {
      setAuthToken(user.authToken);
      setApiAuthToken(user.authToken);
      void persistAuthToken(user.authToken);
    }
    setVendorDraft(user.vendorDraft);
    setVendorSettingsValues({
      ...(user.vendorSettingsValues ?? {}),
      Документы: {
        ...(user.vendorSettingsValues?.Документы ?? {}),
        'Статус верификации': user.vendorVerification?.status ?? 'Не отправлено',
        'Комментарий модератора': user.vendorVerification?.moderatorComment ?? '',
      },
    });
    setClientProfile(user.clientProfile ?? createClientProfile(user.email));
    setClientSettingsValues(user.clientSettingsValues ?? {});
    setSelectedImportIds(user.selectedImportIds);
    setInstagramHandle(user.instagramHandle);
    setInstagramConnected(Boolean(user.instagramConnected));
    setInstagramProfile(user.instagramProfile ?? null);
    setEventDraft(toDisplayEventDraft(user.eventDraft ?? DEFAULT_EVENT_DRAFT));
    setEventHistory((user.eventHistory ?? []).map((event) => ({
      ...event,
      date: formatStoredDate(event.date),
    })));
    setClientBookings((user.bookings ?? []).map((booking) => ({
      ...booking,
      date: formatStoredDate(booking.date),
    })));
    setLikedVendorIds(user.likedVendorIds ?? []);
    setLikedMediaIds(user.likedMediaIds ?? []);
    setSavedMediaIds(user.savedMediaIds ?? []);
    setSavedVendorIds(user.savedVendorIds ?? []);
    setBlockedVendorIds(user.blockedVendorIds ?? []);
    setBlockedUserIds(user.blockedUserIds ?? []);
    setUploadedMedia(user.uploadedMedia ?? []);
    setDocuments(user.documents ?? []);
    saveUserId(user.id);
    void saveUserIdAsync(user.id);
    void persistSession(user.role, user.profileCreated);
    if (user.role === 'vendor') {
      fetchVendorRequests(user.id, user.authToken ?? activeAuthToken)
        .then((requests) => {
          setVendorRequests(requests);
          setBackendStatus('ok');
        })
        .catch(() => setBackendStatus('offline'));
      fetchVendorCalendar(user.id, user.authToken ?? activeAuthToken)
        .then((calendar) => {
          setVendorBusyDates(calendar.busyDates);
          setVendorFreeDates(calendar.freeDates);
        })
        .catch(() => undefined);
      fetchVendorAnalytics(user.id, user.authToken ?? activeAuthToken)
        .then(setVendorAnalytics)
        .catch(() => setVendorAnalytics(DEFAULT_VENDOR_ANALYTICS));
    }
    if (user.profileCreated) {
      setPhase('app');
    }
    void registerPushForUser(user);
  };

  const resetSessionState = () => {
    setAuthToken(null);
    setApiAuthToken(null);
    setUserId(null);
    setCurrentVendorId(null);
    setEmail('');
    setPhase('auth');
    setRole('client');
    setRoute({ name: 'catalog' });
    setClientBookings([]);
    setVendorRequests([]);
    setVendorBusyDates([]);
    setVendorFreeDates([]);
    setEventDraft(DEFAULT_EVENT_DRAFT);
    setEventHistory([]);
    setLikedVendorIds([]);
    setLikedMediaIds([]);
    setSavedVendorIds([]);
    setBlockedVendorIds([]);
    setBlockedUserIds([]);
    setUploadedMedia([]);
    setDocuments([]);
    setVendorSettingsOpen(false);
    setClientSettingsOpen(false);
  };

  const openNotificationTarget = (target: NotificationTarget) => {
    setPhase('app');
    setRole(target.role);
    setRoute({ name: 'catalog' });

    if (target.role === 'vendor') {
      setVendorSettingsOpen(false);
      setClientSettingsOpen(false);
      setVendorDashboardTarget({ section: 'requests', nonce: Date.now() });
      if (userId) {
        fetchVendorRequests(userId).then(setVendorRequests).catch(() => undefined);
      }
      return;
    }

    setVendorSettingsOpen(false);
    setClientSettingsOpen(false);
    setClientMainTab('requests');
  };

  async function registerPushForUser(user: ApiUser) {
    if (user.id.startsWith('offline_')) {
      return;
    }

    try {
      const result = await registerForPushNotifications();
      setPushRegistrationMessage(result.message);
      if (!result.token) {
        return;
      }

      if (
        lastRegisteredPushUserId.current === user.id &&
        lastRegisteredPushToken.current === result.token &&
        lastRegisteredPushRole.current === user.role
      ) {
        return;
      }

      await registerPushTokenRemote(user.id, result.token, user.role);
      lastRegisteredPushToken.current = result.token;
      lastRegisteredPushUserId.current = user.id;
      lastRegisteredPushRole.current = user.role;
      setBackendStatus('ok');
    } catch {
      setPushRegistrationMessage('Push-уведомления не подключились. Проверьте build и разрешения.');
    }
  }

  async function signInWithOAuth(
    provider: OAuthProvider,
    payload:
      | {
          clientId: string;
          code?: string;
          codeVerifier?: string;
          redirectUri?: string;
          idToken?: string;
        }
      | {
          authorizationCode?: string | null;
          email?: string | null;
          fullName?: string;
          identityToken: string;
          user?: string;
        },
  ) {
    setAuthBusyProvider(provider);
    setAuthMessage('');
    try {
      const user =
        provider === 'google'
          ? await loginWithGoogle({ ...payload, role } as {
              clientId: string;
              code?: string;
              codeVerifier?: string;
              redirectUri?: string;
              idToken?: string;
              role: Role;
            })
          : await loginWithAppleIdentityToken({ ...payload, role } as {
              email?: string | null;
              fullName?: string;
              authorizationCode?: string | null;
              identityToken: string;
              role: Role;
              user?: string;
            });
      applyApiUser(user);
      setBackendStatus('ok');
      setAuthMessage('');
      if (!user.profileCreated) {
        setStoryIndex(0);
        setPhase('onboarding');
      }
    } catch (error) {
      setBackendStatus('offline');
      const detail = getReadableAuthError(error);
      setAuthMessage(
        provider === 'google'
          ? `Google вход не прошел${detail ? `: ${detail}` : ''}`
          : `Apple ID вход не прошел${detail ? `: ${detail}` : ''}`,
      );
    } finally {
      setAuthBusyProvider(null);
    }
  }

  useEffect(() => {
    let mounted = true;
    if (reviewScreen) {
      setApiCategories(mockCategories);
      setApiVendors(mockVendors);
      setApiVendorSettings(vendorSettings);
      return () => {
        mounted = false;
      };
    }
    if (authToken) {
      setApiAuthToken(authToken);
    }

    fetchBootstrap()
      .then((bootstrap) => {
        if (!mounted) return;
        setBackendStatus('ok');
        setApiCategories(bootstrap.categories);
        setApiVendors(bootstrap.vendors);
        setApiVendorSettings(
          bootstrap.vendorSettings.filter((item) => item.label !== 'Заявки'),
        );
      })
      .catch(() => {
        if (mounted) setBackendStatus('offline');
      });

    if (localAuthBypassUser) {
      applyApiUser(localAuthBypassUser);
      setPhase('app');
      return () => {
        mounted = false;
      };
    }

    restoreStoredSession()
      .then(async (session) => {
        if (!mounted || !session.userId || !session.authToken) return;
        if (session.authToken.startsWith('offline_') || session.userId.startsWith('offline_')) {
          await clearSession();
          setAuthToken(null);
          setApiAuthToken(null);
          setUserId(null);
          return undefined;
        }
        setAuthToken(session.authToken);
        setApiAuthToken(session.authToken);
        try {
          return await fetchUser(session.userId, session.authToken);
        } catch (error) {
          const status =
            typeof error === 'object' && error && 'status' in error
              ? Number((error as { status?: number }).status)
              : 0;
          if (status === 401 || status === 404) {
            await clearSession();
            resetSessionState();
            return undefined;
          }
          if (!ALLOW_OFFLINE_AUTH) {
            setBackendStatus('offline');
          }
          return undefined;
        }
      })
      .then((user) => {
        if (!mounted || !user) return;
        applyApiUser(user);
      })
      .catch(() => {
        if (mounted) setBackendStatus('offline');
      });

    return () => {
      mounted = false;
    };
  }, [reviewScreen?.id]);

  useEffect(() => {
    if (reviewScreen) {
      return undefined;
    }
    const subscription = subscribeToNotificationTargets(openNotificationTarget);
    getInitialNotificationTarget()
      .then((target) => {
        if (target) openNotificationTarget(target);
      })
      .catch(() => undefined);

    return () => {
      subscription.remove();
    };
  }, [reviewScreen?.id, userId]);

  useEffect(() => {
    if (googleResponse?.type !== 'success') {
      if (googleResponse?.type === 'error') {
        const errorDescription =
          googleResponse.params?.error_description || googleResponse.params?.error;
        setAuthMessage(
          errorDescription
            ? `Google OAuth: ${errorDescription}`
            : 'Google вход отменен или отклонен.',
        );
      }
      return;
    }
    const code = googleResponse.params.code;
    if (!code) {
      setAuthMessage('Google не вернул код авторизации.');
      return;
    }
    if (!googleRequest) {
      setAuthMessage('Google вход еще загружается. Повторите через секунду.');
      return;
    }
    void signInWithOAuth('google', {
      clientId: googleRequest.clientId,
      code,
      codeVerifier: googleRequest?.codeVerifier,
      redirectUri: googleRequest.redirectUri,
    });
  }, [googleResponse, googleRequest]);

  const clientVendors = useMemo(
    () => apiVendors.map((vendor) => hideBlockedCommentAuthors(vendor, blockedUserIds)),
    [apiVendors, blockedUserIds],
  );
  const selectedVendor =
    route.name === 'vendor'
      ? clientVendors.find((vendor) => vendor.id === route.vendorId) ?? clientVendors[0]
      : null;
  const visibleClientVendors = clientVendors.filter(
    (vendor) => !blockedVendorIds.includes(vendor.id),
  );
  const trackVendorEvent = (
    vendorId: string,
    type: 'profile_view' | 'media_view' | 'save' | 'whatsapp_click',
  ) => {
    trackVendorAnalytics(vendorId, type)
      .then((analytics) => {
        if (role === 'vendor') {
          setVendorAnalytics(analytics);
        }
      })
      .catch(() => undefined);
  };

  const updateVendorLikeCount = (vendorId: string, delta: number) => {
    setApiVendors((current) =>
      current.map((vendor) =>
        vendor.id === vendorId
          ? {
              ...vendor,
              likeCount: Math.max(
                0,
                Number(vendor.likeCount ?? vendor.reviewCount ?? 0) + delta,
              ),
            }
          : vendor,
      ),
    );
  };

  const replaceVendor = (nextVendor: Vendor) => {
    setApiVendors((current) =>
      current.map((vendor) => (vendor.id === nextVendor.id ? nextVendor : vendor)),
    );
  };

  const updateVendorMediaStats = (
    vendorId: string,
    mediaId: string,
    patch: { commentDelta?: number; likeDelta?: number },
  ) => {
    setApiVendors((current) =>
      current.map((vendor) => {
        if (vendor.id !== vendorId) return vendor;
        const currentStats = vendor.mediaStats?.[mediaId] ?? {
          commentCount: 0,
          comments: [],
          likeCount: 0,
        };
        return {
          ...vendor,
          mediaStats: {
            ...(vendor.mediaStats || {}),
            [mediaId]: {
              ...currentStats,
              commentCount: Math.max(
                0,
                Number(currentStats.commentCount || 0) + (patch.commentDelta || 0),
              ),
              likeCount: Math.max(
                0,
                Number(currentStats.likeCount || 0) + (patch.likeDelta || 0),
              ),
            },
          },
          media: vendor.media?.map((item) =>
            item.id === mediaId
              ? {
                  ...item,
                  commentCount: Math.max(
                    0,
                    Number(item.commentCount || 0) + (patch.commentDelta || 0),
                  ),
                  likeCount: Math.max(
                    0,
                    Number(item.likeCount || 0) + (patch.likeDelta || 0),
                  ),
                }
              : item,
          ),
        };
      }),
    );
  };

  const toggleLiked = (vendorId: string) => {
    if (!userId) {
      setAuthMessage('Войдите, чтобы лайки сохранялись.');
      setPhase('auth');
      return;
    }

    const alreadyLiked = likedVendorIds.includes(vendorId);
    const nextLikedVendorIds = alreadyLiked
      ? likedVendorIds.filter((id) => id !== vendorId)
      : [...likedVendorIds, vendorId];

    setLikedVendorIds(nextLikedVendorIds);
    updateVendorLikeCount(vendorId, alreadyLiked ? -1 : 1);

    if (reviewConfig) {
      return;
    }

    toggleLikedVendorRemote(userId, vendorId, !alreadyLiked)
      .then((result) => {
        setLikedVendorIds(result.user.likedVendorIds ?? nextLikedVendorIds);
        replaceVendor(result.vendor);
        setBackendStatus('ok');
      })
      .catch(() => {
        // Keep the user's tap visible; the next successful sync will reconcile.
        setBackendStatus('offline');
      });
  };

  const toggleMediaLiked = (vendorId: string, mediaId: string) => {
    if (!userId) {
      setAuthMessage('Войдите, чтобы лайки сохранялись.');
      setPhase('auth');
      return;
    }

    const alreadyLiked = likedMediaIds.includes(mediaId);
    const nextLikedMediaIds = alreadyLiked
      ? likedMediaIds.filter((id) => id !== mediaId)
      : [...likedMediaIds, mediaId];

    setLikedMediaIds(nextLikedMediaIds);
    updateVendorMediaStats(vendorId, mediaId, {
      likeDelta: alreadyLiked ? -1 : 1,
    });

    if (reviewConfig) {
      return;
    }

    toggleLikedMediaRemote(userId, vendorId, mediaId, !alreadyLiked)
      .then((result) => {
        setLikedMediaIds(result.user.likedMediaIds ?? nextLikedMediaIds);
        replaceVendor(result.vendor);
        setBackendStatus('ok');
      })
      .catch(() => setBackendStatus('offline'));
  };

  const submitMediaComment = async (
    vendorId: string,
    mediaId: string,
    text: string,
  ) => {
    if (!userId) {
      setAuthMessage('Войдите, чтобы оставить комментарий.');
      setPhase('auth');
      return false;
    }

    if (reviewConfig) {
      const comment = {
        id: `review-comment-${Date.now()}`,
        authorId: userId,
        author: role === 'vendor' ? 'kairkuka' : 'Алия',
        text,
        createdAt: new Date().toISOString(),
      };
      setApiVendors((current) =>
        current.map((vendor) => {
          if (vendor.id !== vendorId) return vendor;
          const currentStats = vendor.mediaStats?.[mediaId] ?? {
            likeCount: 0,
            commentCount: 0,
            comments: [],
          };
          return {
            ...vendor,
            mediaStats: {
              ...vendor.mediaStats,
              [mediaId]: {
                ...currentStats,
                commentCount: currentStats.commentCount + 1,
                comments: [...currentStats.comments, comment],
              },
            },
            media: vendor.media?.map((item) =>
              item.id === mediaId
                ? {
                    ...item,
                    commentCount: Number(item.commentCount || 0) + 1,
                    comments: [...(item.comments || []), comment],
                  }
                : item,
            ),
          };
        }),
      );
      return true;
    }

    try {
      const result = await addMediaCommentRemote(userId, vendorId, mediaId, text);
      replaceVendor(result.vendor);
      applyApiUser(result.user);
      setBackendStatus('ok');
      return true;
    } catch {
      setBackendStatus('offline');
      return false;
    }
  };

  const toggleMediaSaved = (vendorId: string, mediaId: string) => {
    if (!userId) {
      setAuthMessage('Войдите, чтобы сохранять публикации.');
      setPhase('auth');
      return;
    }

    const alreadySaved = savedMediaIds.includes(mediaId);
    const nextSavedMediaIds = alreadySaved
      ? savedMediaIds.filter((id) => id !== mediaId)
      : [...savedMediaIds, mediaId];
    setSavedMediaIds(nextSavedMediaIds);

    if (reviewConfig) {
      return;
    }

    toggleSavedMediaRemote(userId, vendorId, mediaId, !alreadySaved)
      .then((result) => {
        setSavedMediaIds(result.user.savedMediaIds ?? nextSavedMediaIds);
        replaceVendor(result.vendor);
        setBackendStatus('ok');
      })
      .catch(() => setBackendStatus('offline'));
  };

  const toggleSaved = (vendorId: string) => {
    if (!userId) {
      setAuthMessage('Войдите, чтобы избранное сохранялось.');
      setPhase('auth');
      return;
    }

    setSavedVendorIds((current) => {
      const alreadySaved = current.includes(vendorId);
      const next = current.includes(vendorId)
        ? current.filter((id) => id !== vendorId)
        : [...current, vendorId];
      if (!alreadySaved) {
        trackVendorEvent(vendorId, 'save');
      }
      if (reviewConfig) {
        return next;
      }
      toggleSavedVendorRemote(userId, vendorId, !alreadySaved)
        .then((user) => {
          setSavedVendorIds(user.savedVendorIds ?? next);
          setBackendStatus('ok');
        })
        .catch(() => setBackendStatus('offline'));
      return next;
    });
  };

  const openVendor = (vendor: Vendor, initialProfileTab: 'media' | 'reviews' = 'media') => {
    trackVendorEvent(vendor.id, 'profile_view');
    setRoute({ name: 'vendor', initialProfileTab, vendorId: vendor.id });
  };

  const openVendorReviews = (vendor: Vendor) => {
    openVendor(vendor, 'reviews');
  };

  const reportVendor = (vendorId: string) => {
    if (!userId) {
      setBackendStatus('offline');
      return;
    }
    reportContentRemote(userId, vendorId, {
      reason: 'Жалоба из профиля подрядчика',
      targetType: 'vendor',
    })
      .then(() => setBackendStatus('ok'))
      .catch(() => setBackendStatus('offline'));
  };

  const reportContent = async (
    vendorId: string,
    target: {
      targetType: 'media' | 'comment';
      mediaId: string;
      commentId?: string;
    },
  ) => {
    if (!userId) {
      setBackendStatus('offline');
      return false;
    }
    try {
      const result = await reportContentRemote(userId, vendorId, {
        ...target,
        reason:
          target.targetType === 'comment'
            ? 'Жалоба на комментарий'
            : 'Жалоба на публикацию',
      });
      setBlockedUserIds(result.user?.blockedUserIds ?? blockedUserIds);
      setBackendStatus('ok');
      return true;
    } catch {
      setBackendStatus('offline');
      return false;
    }
  };

  const blockVendor = (vendorId: string) => {
    setBlockedVendorIds((current) =>
      current.includes(vendorId) ? current : [...current, vendorId],
    );
    setRoute({ name: 'catalog' });
    if (userId) {
      blockVendorRemote(userId, vendorId)
        .then((user) => {
          setBlockedVendorIds(user.blockedVendorIds ?? []);
          setBackendStatus('ok');
        })
        .catch(() => setBackendStatus('offline'));
    }
  };

  const startRegistration = async () => {
    if (authSubmitting) {
      return;
    }
    const normalizedEmail = email.trim() || (ALLOW_OFFLINE_AUTH ? makeInternalEmail('demo') : '');
    if (!normalizedEmail) {
      setAuthMessage('Введите почту');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setAuthMessage('Введите корректную почту');
      return;
    }
    if (password.length < 6) {
      setAuthMessage('Пароль минимум 6 символов');
      return;
    }
    if (password !== passwordConfirm) {
      setAuthMessage('Пароли не совпадают');
      return;
    }

    const lastRequest = lastRegistrationRequest.current;
    if (
      lastRequest?.email === normalizedEmail &&
      Date.now() - lastRequest.requestedAt < 60_000
    ) {
      setAuthMessage('Код уже отправлен. Проверьте почту.');
      setAuthMode('verify');
      return;
    }

    setAuthSubmitting(true);
    try {
      const result = await startEmailRegistration(normalizedEmail, password, role);
      setEmail(normalizedEmail);
      lastRegistrationRequest.current = {
        email: normalizedEmail,
        requestedAt: Date.now(),
      };
      if (result.emailSent) {
        setAuthDevCode('');
        setAuthMessage(
          result.reused ? 'Код уже отправлен. Проверьте почту.' : 'Код отправлен на почту',
        );
      } else if (ALLOW_OFFLINE_AUTH && result.verificationCode) {
        setAuthDevCode(result.verificationCode);
        setAuthMessage('Письмо не отправлено. Используйте тестовый код.');
      } else {
        setAuthDevCode('');
        setAuthMessage('Письмо не отправлено. Проверьте email-сервис.');
        return;
      }
      setBackendStatus('ok');
      setAuthMode('verify');
    } catch (error) {
      if (!ALLOW_OFFLINE_AUTH) {
        setBackendStatus('offline');
        setAuthDevCode('');
        setAuthMessage(
          getReadableAuthError(error) || 'Сервис временно недоступен. Попробуйте позже.',
        );
        return;
      }
      setBackendStatus('offline');
      setEmail(normalizedEmail);
      setAuthDevCode(OFFLINE_TEST_CODE);
      setVerificationCode('');
      setAuthMessage(`Сервер недоступен. Тестовый код: ${OFFLINE_TEST_CODE}`);
      setAuthMode('verify');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const verifyRegistration = async () => {
    if (authSubmitting) {
      return;
    }
    setAuthSubmitting(true);
    try {
      const user = await verifyEmailRegistration(email, verificationCode);
      applyApiUser(user);
      setBackendStatus('ok');
      setAuthMessage('');
      setStoryIndex(0);
      setPhase('onboarding');
    } catch {
      if (ALLOW_OFFLINE_AUTH && OFFLINE_TEST_CODE && verificationCode.trim() === OFFLINE_TEST_CODE) {
        const user = createOfflineUser(email || makeInternalEmail('offline-client'), role, false);
        applyApiUser(user);
        setBackendStatus('offline');
        setAuthMessage('');
        setStoryIndex(0);
        setPhase('onboarding');
        return;
      }

      setBackendStatus('offline');
      setAuthMessage(
        ALLOW_OFFLINE_AUTH
          ? `Неверный код. Для теста: ${OFFLINE_TEST_CODE}`
          : 'Неверный код или сервис временно недоступен.',
      );
    } finally {
      setAuthSubmitting(false);
    }
  };

  const loginWithPassword = async () => {
    if (authSubmitting) {
      return;
    }
    const normalizedEmail = email.trim() || (ALLOW_OFFLINE_AUTH ? makeInternalEmail('demo') : '');
    if (!normalizedEmail) {
      setAuthMessage('Введите почту');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setAuthMessage('Введите корректную почту');
      return;
    }
    if (!password) {
      setAuthMessage('Введите пароль');
      return;
    }
    setAuthSubmitting(true);
    try {
      const user = await loginUser(normalizedEmail, password);
      applyApiUser(user);
      setBackendStatus('ok');
      setAuthMessage('');
      if (!user.profileCreated) {
        setStoryIndex(0);
        setPhase('onboarding');
      }
    } catch {
      if (ALLOW_OFFLINE_AUTH && OFFLINE_TEST_PASSWORD && password === OFFLINE_TEST_PASSWORD) {
        const fallbackRole =
          normalizedEmail.includes('vendor')
            ? 'vendor'
            : 'client';
        const user = createOfflineUser(normalizedEmail, fallbackRole, true);
        applyApiUser(user);
        setBackendStatus('offline');
        setAuthMessage('');
        setPhase('app');
        return;
      }

      setBackendStatus('offline');
      setAuthMessage(
        ALLOW_OFFLINE_AUTH
          ? `Почта или пароль неверные. Для теста пароль: ${OFFLINE_TEST_PASSWORD}`
          : 'Почта или пароль неверные.',
      );
    } finally {
      setAuthSubmitting(false);
    }
  };

  const startPasswordReset = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setAuthMessage('Введите корректную почту');
      return;
    }
    setAuthSubmitting(true);
    const sent = await requestPasswordResetEmail(normalizedEmail);
    setAuthSubmitting(false);
    setPasswordResetRequested(sent);
    setAuthMessage(
      sent
        ? 'Если аккаунт существует, код отправлен на почту.'
        : 'Не удалось отправить код. Повторите позже.',
    );
  };

  const finishPasswordReset = async () => {
    if (passwordResetCode.trim().length !== 6) {
      setAuthMessage('Введите шестизначный код');
      return;
    }
    if (password.length < 6) {
      setAuthMessage('Новый пароль минимум 6 символов');
      return;
    }
    setAuthSubmitting(true);
    const confirmed = await confirmPasswordReset(email.trim(), passwordResetCode, password);
    setAuthSubmitting(false);
    if (!confirmed) {
      setAuthMessage('Код неверный или истёк. Запросите новый.');
      return;
    }
    setPasswordResetRequested(false);
    setPasswordResetCode('');
    setAuthMode('login');
    setAuthMessage('Пароль изменён. Теперь войдите.');
  };

  const loginAsDemo = async (demoRole: Role) => {
    if (!SHOW_TEST_LOGIN || !ALLOW_OFFLINE_AUTH) {
      return;
    }

    const demoEmail = makeInternalEmail(
      demoRole === 'vendor' ? 'vendor' : 'client',
      OFFLINE_TEST_EMAIL_DOMAIN,
    );
    try {
      const user = await registerUser(demoEmail, demoRole);
      applyApiUser({ ...user, profileCreated: true, role: demoRole });
      persistSession(demoRole, true);
      setBackendStatus('ok');
      setAuthMessage('');
      setPhase('app');
    } catch {
      const user = createOfflineUser(demoEmail, demoRole, true);
      applyApiUser(user);
      persistSession(demoRole, true);
      setBackendStatus('offline');
      setAuthMessage('');
      setPhase('app');
    }
  };

  const startGoogleSignIn = async () => {
    if (!GOOGLE_CLIENT_ID) {
      setAuthMessage('Добавьте Google OAuth Client ID в env.');
      return;
    }
    setAuthBusyProvider('google');
    setAuthMessage('');

    if (Platform.OS !== 'web') {
      try {
        if (Platform.OS === 'android') {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        }
        const response = await GoogleSignin.signIn();
        if (response.type !== 'success') {
          setAuthBusyProvider(null);
          return;
        }
        if (!response.data.idToken) {
          setAuthBusyProvider(null);
          setAuthMessage('Google не вернул подтверждение аккаунта.');
          return;
        }
        await signInWithOAuth('google', {
          clientId: GOOGLE_WEB_CLIENT_ID,
          idToken: response.data.idToken,
        });
      } catch (error) {
        setAuthBusyProvider(null);
        const detail = error instanceof Error ? error.message : '';
        setAuthMessage(
          detail ? `Google вход не открылся: ${detail}` : 'Google вход не открылся.',
        );
      }
      return;
    }

    if (!googleRequest) {
      setAuthBusyProvider(null);
      setAuthMessage('Google вход еще загружается. Повторите через секунду.');
      return;
    }
    try {
      await promptGoogleAsync();
    } catch {
      setAuthBusyProvider(null);
      setAuthMessage('Google вход не открылся.');
    }
  };

  const startAppleSignIn = async () => {
    if (Platform.OS !== 'ios') {
      setAuthMessage('Apple ID доступен только в приложении на iPhone.');
      return;
    }

    setAuthBusyProvider('apple');
    setAuthMessage('');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        setAuthMessage('Apple не вернул подтверждение аккаунта.');
        return;
      }

      const fullName = [
        credential.fullName?.givenName,
        credential.fullName?.middleName,
        credential.fullName?.familyName,
      ]
        .filter(Boolean)
        .join(' ');
      await signInWithOAuth('apple', {
        authorizationCode: credential.authorizationCode,
        email: credential.email,
        fullName,
        identityToken: credential.identityToken,
        user: credential.user,
      });
    } catch (error) {
      const code =
        typeof error === 'object' && error && 'code' in error
          ? String((error as { code?: string }).code || '')
          : '';
      if (code !== 'ERR_REQUEST_CANCELED') {
        const detail = getReadableAuthError(error);
        setAuthMessage(`Apple ID вход не открылся${detail ? `: ${detail}` : ''}`);
      }
    } finally {
      setAuthBusyProvider(null);
    }
  };

  const completeOnboarding = () => {
    if (role === 'vendor') {
      setPhase('vendorImport');
      return;
    }

    persistSession(role, true);
    if (userId) {
      updateUser(userId, { role, profileCreated: true }).catch(() =>
        setBackendStatus('offline'),
      );
    }
    setPhase('app');
  };

  const connectInstagramForImport = async () => {
    setVendorImportMethod('instagram');
    setInstagramImportStarted(true);

    if (!userId) {
      return;
    }

    try {
      const connection = await connectInstagramRemote(userId, instagramHandle);
      if (connection.authUrl) {
        void openExternalUrl(connection.authUrl).catch(() => undefined);
      }
      setBackendStatus('ok');
    } catch {
      setBackendStatus('offline');
      setApiInstagramMedia([]);
      setSelectedImportIds([]);
    }
  };

  const finishVendorImport = async () => {
    persistSession(role, true);
    if (vendorImportMethod === 'instagram' && selectedImportIds.length > 0) {
      if (userId) {
        try {
          const result = await importInstagramMediaRemote(userId, selectedImportIds);
          applyApiUser(result.user);
          setBackendStatus('ok');
        } catch {
          setBackendStatus('offline');
        }
      }
    }

    if (userId) {
      publishVendorProfile(userId, vendorDraft)
        .then((result) => {
          applyApiUser(result.user);
          setApiVendors(result.vendors);
          setBackendStatus('ok');
        })
        .catch(() => {
          updateUser(userId, {
            role,
            profileCreated: true,
            vendorDraft,
            selectedImportIds,
            instagramHandle,
            uploadedMedia,
          }).catch(() => setBackendStatus('offline'));
        });
    }
    setPhase('app');
  };

  const switchRole = (nextRole: Role) => {
    setRole(nextRole);
    persistSession(nextRole, true);
    if (userId) {
      updateUser(userId, { role: nextRole, profileCreated: true }).catch(() =>
        setBackendStatus('offline'),
      );
    }
    setRoute({ name: 'catalog' });
    setClientMainTab('categories');
    setVendorSettingsOpen(false);
    setClientSettingsOpen(false);
    setVendorAnalytics(DEFAULT_VENDOR_ANALYTICS);
  };

  const signOut = () => {
    const pushToken = lastRegisteredPushToken.current;
    const pushUserId = lastRegisteredPushUserId.current || userId;
    if (pushUserId && pushToken) {
      unregisterPushTokenRemote(pushUserId, pushToken).catch(() => undefined);
    }
    lastRegisteredPushToken.current = '';
    lastRegisteredPushUserId.current = '';
    lastRegisteredPushRole.current = null;
    setPushRegistrationMessage('');
    void clearSession();
    resetSessionState();
    setStoryIndex(0);
    setClientMainTab('categories');
  };

  const deleteAccountNow = async () => {
    if (!userId) {
      signOut();
      return;
    }

    try {
      await deleteAccountRemote(userId);
      setBackendStatus('ok');
    } catch {
      setBackendStatus('offline');
      return;
    }

    signOut();
  };

  const deleteAccount = () => {
    const message =
      'Аккаунт, профиль, заявки и медиа будут удалены. Действие нельзя отменить.';
    if (Platform.OS === 'web') {
      const confirmed =
        typeof window === 'undefined' ? false : window.confirm(message);
      if (confirmed) {
        void deleteAccountNow();
      }
      return;
    }

    Alert.alert('Удалить аккаунт?', message, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => void deleteAccountNow(),
      },
    ]);
  };

  const retryBackend = async () => {
    setBackendStatus('checking');
    try {
      const bootstrap = await fetchBootstrap();
      setApiCategories(bootstrap.categories);
      setApiVendors(bootstrap.vendors);
      setApiVendorSettings(bootstrap.vendorSettings.filter((item) => item.label !== 'Заявки'));
      if (userId && authToken) {
        applyApiUser(await fetchUser(userId, authToken));
      }
      setBackendStatus('ok');
    } catch {
      setBackendStatus('offline');
    }
  };

  const bookVendor = async (
    vendor: Vendor,
    selectedDate: string,
    timeFrom = '18:00',
    timeTo = '23:00',
  ) => {
    const booking: ClientBooking = {
      id: `booking_${Date.now()}`,
      date: selectedDate,
      timeFrom,
      timeTo,
      status: 'Ожидает подтверждения',
      vendorId: vendor.id,
      vendorName: vendor.name,
      amount: `от ${formatMoneyInput(vendor.priceFrom)} ₸`,
    };
    if (reviewConfig) {
      setClientBookings((current) => bookingToEditId
        ? current.map((item) => item.id === bookingToEditId
          ? { ...item, date: selectedDate, timeFrom, timeTo, status: 'Ожидает подтверждения' }
          : item)
        : [booking, ...current.filter((item) => item.vendorId !== vendor.id)]);
      setBookingToEditId(null);
      setEventDraft((current) => ({
        ...current,
        date: selectedDate,
        city: vendor.city,
      }));
      return true;
    }
    if (userId) {
      try {
        const user = bookingToEditId
          ? await updateClientBookingRemote(userId, bookingToEditId, {
              date: selectedDate,
              timeFrom,
              timeTo,
            })
          : await createBooking(userId, vendor.id, selectedDate, timeFrom, timeTo);
        setClientBookings((user.bookings ?? [booking]).map((item) => ({
          ...item,
          date: formatStoredDate(item.date),
        })));
        setEventDraft(toDisplayEventDraft(user.eventDraft ?? {
          ...eventDraft,
          date: selectedDate,
          city: vendor.city,
        }));
        setBackendStatus('ok');
        setBookingToEditId(null);
        if (role === 'vendor' && userId) {
          fetchVendorRequests(userId).then(setVendorRequests).catch(() => undefined);
        }
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const status =
          typeof error === 'object' && error && 'status' in error
            ? Number((error as { status?: number }).status)
            : 0;
        if (status >= 400 && status < 500 && message) {
          setBackendStatus('ok');
          return message;
        }
        setBackendStatus('offline');
        return false;
      }
    }
    setClientBookings((current) => {
      const next = [booking, ...current.filter((item) => item.vendorId !== vendor.id)];
      if (userId) {
        updateUser(userId, { bookings: next }).catch(() =>
          setBackendStatus('offline'),
        );
      }
      return next;
    });
    setEventDraft((current) => {
      const next = { ...current, date: selectedDate, city: vendor.city };
      if (userId) {
        updateUser(userId, { eventDraft: next }).catch(() =>
          setBackendStatus('offline'),
        );
      }
      return next;
    });
    return true;
  };

  const openBookingDateChange = (booking: ClientBooking) => {
    const vendor = visibleClientVendors.find((item) => item.id === booking.vendorId);
    if (!vendor) return;
    setBookingToEditId(booking.id);
    openVendor(vendor);
  };

  const cancelClientBooking = async (booking: ClientBooking) => {
    const run = async () => {
      if (reviewConfig) {
        setClientBookings((current) => current.map((item) =>
          item.id === booking.id ? { ...item, status: 'Отменена' } : item));
        return;
      }
      if (!userId) return;
      try {
        const user = await updateClientBookingRemote(userId, booking.id, {
          status: 'Отменена',
        });
        setClientBookings((user.bookings ?? []).map((item) => ({
          ...item,
          date: formatStoredDate(item.date),
        })));
        setBackendStatus('ok');
      } catch {
        setBackendStatus('offline');
      }
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Отменить эту бронь?')) await run();
      return;
    }
    Alert.alert('Отменить бронь?', 'Поставщик увидит отмену заявки.', [
      { text: 'Назад', style: 'cancel' },
      { text: 'Отменить бронь', style: 'destructive', onPress: () => void run() },
    ]);
  };

  const updateVendorRequestStatus = (bookingId: string, status: string) => {
    setVendorRequests((current) =>
      current.map((booking) =>
        booking.id === bookingId ? { ...booking, status } : booking,
      ),
    );
    if (reviewConfig) {
      return;
    }
    if (userId) {
      updateVendorRequestStatusRemote(userId, bookingId, status)
        .then((booking) => {
          setVendorRequests((current) =>
            current.map((item) => (item.id === booking.id ? booking : item)),
          );
          setBackendStatus('ok');
        })
        .catch(() => setBackendStatus('offline'));
    }
  };

  const changeVendorCalendar = ({ busyDates, freeDates }: VendorCalendarState) => {
    setVendorBusyDates(busyDates);
    setVendorFreeDates(freeDates);
    const availability = `Свободен ${formatRussianDayMonth(
      parseIsoDate(getNearestFreeIsoDate(new Set(busyDates), undefined, new Set(freeDates))),
    )}`;
    const vendorId = currentVendorId ?? (userId ? `vendor_${userId}` : '');
    setApiVendors((current) =>
      current.map((vendor) =>
        vendor.id === vendorId ? { ...vendor, availability } : vendor,
      ),
    );
    if (reviewConfig) {
      return;
    }
    if (userId) {
      updateVendorCalendar(userId, { busyDates, freeDates })
        .then((result) => {
          setVendorBusyDates(result.busyDates);
          setVendorFreeDates(result.freeDates);
          if (result.vendors?.length) {
            setApiVendors(result.vendors);
          }
          setBackendStatus('ok');
        })
        .catch(() => setBackendStatus('offline'));
    }
  };

  const saveVendorSettings = async (
    label: string,
    values: Record<string, string>,
    nextDraft?: VendorDraft,
  ) => {
    const nextSettingsValues = {
      ...vendorSettingsValues,
      [label]: values,
    };
    setVendorSettingsValues(nextSettingsValues);
    if (nextDraft) {
      setVendorDraft(nextDraft);
    }

    if (reviewConfig) {
      return true;
    }

    if (!userId) {
      return true;
    }

    if (userId.startsWith('offline_')) return true;

    try {
      const user = await updateUser(userId, {
        vendorSettingsValues: nextSettingsValues,
        ...(nextDraft ? { vendorDraft: nextDraft } : {}),
      } as Partial<ApiUser>);
      applyApiUser(user);
      if (nextDraft) {
        const result = await publishVendorProfile(userId, nextDraft);
        applyApiUser(result.user);
        setApiVendors(result.vendors);
      }
      setBackendStatus('ok');
      return true;
    } catch {
      setBackendStatus('offline');
      return false;
    }
  };

  const saveClientSettings = async (
    label: string,
    values: Record<string, string>,
    nextProfile?: ClientProfileDraft,
  ) => {
    const nextSettingsValues = {
      ...clientSettingsValues,
      [label]: values,
    };
    setClientSettingsValues(nextSettingsValues);
    if (nextProfile) {
      setClientProfile(nextProfile);
    }

    if (reviewConfig) {
      return true;
    }

    if (!userId) {
      return true;
    }

    try {
      const user = await updateUser(userId, {
        clientSettingsValues: nextSettingsValues,
        ...(nextProfile ? { clientProfile: nextProfile } : {}),
      } as Partial<ApiUser>);
      applyApiUser(user);
      setBackendStatus('ok');
      return true;
    } catch {
      setBackendStatus('offline');
      return false;
    }
  };

  const saveClientEvent = async (nextDraft: EventDraft, eventId?: string) => {
    const now = new Date().toISOString();
    const nextEvent: ClientEvent = {
      ...nextDraft,
      id: eventId || `event_${Date.now()}`,
      createdAt:
        eventHistory.find((item) => item.id === eventId)?.createdAt || now,
      updatedAt: now,
    };
    const nextHistory = [
      nextEvent,
      ...eventHistory.filter((item) => item.id !== nextEvent.id),
    ].slice(0, 30);

    setEventDraft(nextDraft);
    setEventHistory(nextHistory);

    if (reviewConfig) {
      return true;
    }

    if (!userId) {
      return true;
    }

    try {
      const user = await updateUser(userId, {
        eventDraft: nextDraft,
        eventHistory: nextHistory,
      } as Partial<ApiUser>);
      applyApiUser(user);
      setBackendStatus('ok');
      return true;
    } catch {
      setBackendStatus('offline');
      return true;
    }
  };

  const openClientSetting = (label: string) => {
    setClientInitialSettingLabel(label);
    setClientSettingsOpen(true);
  };

  const pickUploadedMedia = async (mediaTypes: ImagePicker.MediaType[]) => {
    if (!userId) {
      setBackendStatus('offline');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes,
      quality: 0.82,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (result.canceled) {
      return;
    }

    const nextItems: UploadedMediaItem[] = [];
    for (const [index, asset] of result.assets.entries()) {
      const type = getPickedAssetType(asset);
      const role: UploadedMediaItem['role'] =
        uploadedMedia.length + nextItems.length === 0 && index === 0
          ? 'main'
          : type === 'video'
            ? 'reels'
            : 'profile';
      try {
        const response = await uploadUserMediaRemote(userId, asset, {
          index,
          role,
        });
        nextItems.push(response.media);
        applyApiUser(response.user);
        setBackendStatus('ok');
      } catch {
        setBackendStatus('offline');
      }
    }
  };

  const changeUploadedMedia = async (nextMedia: UploadedMediaItem[]) => {
    setUploadedMedia(nextMedia);
    if (reviewConfig) {
      return true;
    }
    if (userId) {
      try {
        const user = await updateUser(userId, { uploadedMedia: nextMedia });
        applyApiUser(user);
        setBackendStatus('ok');
        return true;
      } catch {
        setBackendStatus('offline');
        return false;
      }
    }
    return false;
  };

  const runStoryTransition = (direction: 'next' | 'previous') => {
    const stories = role === 'client' ? clientStories : vendorStories;
    const isLast = storyIndex >= stories.length - 1;
    const isFirst = storyIndex <= 0;

    if (direction === 'next' && isLast) {
      completeOnboarding();
      return;
    }

    if (direction === 'previous' && isFirst) {
      return;
    }

    const exitX = direction === 'next' ? -460 : 460;
    const enterX = -exitX;
    Animated.timing(storyTranslateX, {
      toValue: exitX,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;

      setStoryIndex((index) =>
        direction === 'next'
          ? Math.min(index + 1, stories.length - 1)
          : Math.max(index - 1, 0),
      );
      storyTranslateX.setValue(enterX);
      Animated.timing(storyTranslateX, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  };

  useEffect(() => {
    if (phase !== 'onboarding') {
      return undefined;
    }

    setStoryProgress(0);
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const progress = Math.min((Date.now() - startedAt) / 15000, 1);
      setStoryProgress(progress);
      if (progress >= 1) {
        clearInterval(timer);
        runStoryTransition('next');
      }
    }, 100);

    return () => clearInterval(timer);
  }, [phase, role, storyIndex]);

  if (phase === 'auth') {
    const isRegister = authMode === 'register';
    const isVerify = authMode === 'verify';
    const isReset = authMode === 'reset';
    return (
      <SafeAreaView style={[styles.safeArea, styles.safeAreaDark]}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.authScreen}>
          <View style={styles.authHero}>
            <View style={styles.authTopPill}>
              <Text style={styles.authTopPillText}>SVADBA.kz</Text>
            </View>
            <View style={styles.authLogoMark}>
              <Sparkles color={colors.surface} size={32} strokeWidth={2.2} />
            </View>
            <Text style={styles.authTitle}>
              {isVerify
                ? 'Подтвердите почту'
                : isReset
                  ? 'Восстановить пароль'
                  : isRegister
                    ? 'Создать аккаунт'
                    : 'Войти'}
            </Text>
            <Text style={styles.authText}>
              {isReset
                ? passwordResetRequested
                  ? `Код отправлен на ${email || 'почту'}`
                  : 'Укажите почту аккаунта. Мы отправим код.'
                : isVerify
                ? authDevCode
                  ? `Введите тестовый код для ${email || 'почты'}`
                  : `Мы отправили код на ${email || 'почту'}`
                : 'Клиенты ищут подрядчиков, поставщики получают заявки и брони.'}
            </Text>
          </View>

          <View style={styles.authForm}>
            {!isVerify && !isReset ? (
              <View style={styles.authModeSwitch}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setAuthMode('login');
                    setAuthMessage('');
                  }}
                  style={[
                    styles.authModeButton,
                    authMode === 'login' && styles.authModeButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.authModeText,
                      authMode === 'login' && styles.authModeTextActive,
                    ]}
                  >
                    Вход
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setAuthMode('register');
                    setAuthMessage('');
                  }}
                  style={[
                    styles.authModeButton,
                    authMode === 'register' && styles.authModeButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.authModeText,
                      authMode === 'register' && styles.authModeTextActive,
                    ]}
                  >
                    Регистрация
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.authGlassCard}>
              {isVerify ? (
                <>
                  <View style={styles.inputShell}>
                    <KeyRound color="#A7B0BA" size={20} strokeWidth={2.1} />
                    <TextInput
                      accessibilityLabel="Код подтверждения почты"
                      keyboardType="number-pad"
                      maxLength={6}
                      onChangeText={setVerificationCode}
                      placeholder="Код из письма"
                      placeholderTextColor="#A8A8A8"
                      style={styles.authInput}
                      value={verificationCode}
                    />
                  </View>
                  {authDevCode ? (
                    <Text style={styles.authHintText}>
                      Тестовый код: {authDevCode}
                    </Text>
                  ) : null}
                  <View style={styles.requestActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={startRegistration}
                      style={styles.requestActionGhost}
                    >
                      <Text style={styles.requestActionGhostText}>Отправить ещё раз</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setAuthMode('register');
                        setVerificationCode('');
                        setAuthMessage('Введите другую почту');
                      }}
                      style={styles.requestActionGhost}
                    >
                      <Text style={styles.requestActionGhostText}>Изменить почту</Text>
                    </Pressable>
                  </View>
                </>
              ) : isReset ? (
                <>
                  <View style={styles.inputShell}>
                    <Mail color="#A7B0BA" size={20} strokeWidth={2.2} />
                    <TextInput
                      accessibilityLabel="Почта для восстановления пароля"
                      autoCapitalize="none"
                      editable={!passwordResetRequested}
                      keyboardType="email-address"
                      onChangeText={setEmail}
                      placeholder="Почта"
                      placeholderTextColor="#A8A8A8"
                      style={styles.authInput}
                      value={email}
                    />
                  </View>
                  {passwordResetRequested ? (
                    <>
                      <View style={styles.inputShell}>
                        <KeyRound color="#A7B0BA" size={20} strokeWidth={2.1} />
                        <TextInput
                          accessibilityLabel="Код восстановления пароля"
                          keyboardType="number-pad"
                          maxLength={6}
                          onChangeText={setPasswordResetCode}
                          placeholder="Код из письма"
                          placeholderTextColor="#A8A8A8"
                          style={styles.authInput}
                          value={passwordResetCode}
                        />
                      </View>
                      <View style={styles.inputShell}>
                        <LockKeyhole color="#A7B0BA" size={20} strokeWidth={2.1} />
                        <TextInput
                          accessibilityLabel="Новый пароль"
                          autoCapitalize="none"
                          onChangeText={setPassword}
                          placeholder="Новый пароль"
                          placeholderTextColor="#A8A8A8"
                          secureTextEntry
                          style={styles.authInput}
                          value={password}
                        />
                      </View>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <View style={styles.inputShell}>
                    <Mail color="#A7B0BA" size={20} strokeWidth={2.2} />
                    <TextInput
                      accessibilityLabel="Почта"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      onChangeText={setEmail}
                      placeholder="Почта"
                      placeholderTextColor="#A8A8A8"
                      style={styles.authInput}
                      value={email}
                    />
                  </View>
                  <View style={styles.inputShell}>
                    <LockKeyhole color="#A7B0BA" size={20} strokeWidth={2.1} />
                    <TextInput
                      accessibilityLabel="Пароль"
                      autoCapitalize="none"
                      onChangeText={setPassword}
                      placeholder="Пароль"
                      placeholderTextColor="#A8A8A8"
                      secureTextEntry
                      style={styles.authInput}
                      value={password}
                    />
                  </View>
                  {isRegister ? (
                    <>
                      <View style={styles.inputShell}>
                        <LockKeyhole color="#A7B0BA" size={20} strokeWidth={2.1} />
                        <TextInput
                          accessibilityLabel="Повтор пароля"
                          autoCapitalize="none"
                          onChangeText={setPasswordConfirm}
                          placeholder="Повторите пароль"
                          placeholderTextColor="#A8A8A8"
                          secureTextEntry
                          style={styles.authInput}
                          value={passwordConfirm}
                        />
                      </View>
                      <Text style={styles.authSectionLabel}>Кто вы?</Text>
                      <View style={styles.authRoleSegment}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setRole('client')}
                          style={[
                            styles.authRoleButton,
                            role === 'client' && styles.authRoleButtonActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.authRoleText,
                              role === 'client' && styles.authRoleTextActive,
                            ]}
                          >
                            Клиент
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setRole('vendor')}
                          style={[
                            styles.authRoleButton,
                            role === 'vendor' && styles.authRoleButtonActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.authRoleText,
                              role === 'vendor' && styles.authRoleTextActive,
                            ]}
                          >
                            Поставщик
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  ) : null}
                </>
              )}

              {!isVerify && !isReset ? (
                <View style={styles.authSocialGroup}>
                  <View style={styles.authDividerRow}>
                    <View style={styles.authDividerLine} />
                    <Text style={styles.authDividerText}>или</Text>
                    <View style={styles.authDividerLine} />
                  </View>
                  {APPLE_SIGN_IN_ENABLED && Platform.OS === 'ios' ? (
                    <AppleAuthentication.AppleAuthenticationButton
                      accessibilityLabel="Продолжить с Apple"
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                      cornerRadius={29}
                      onPress={startAppleSignIn}
                      style={styles.authAppleNativeButton}
                    />
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    onPress={startGoogleSignIn}
                    disabled={authBusyProvider !== null}
                    style={({ pressed }) => [
                      styles.authSocialButton,
                      styles.authGoogleButton,
                      authBusyProvider === 'google' && styles.authSocialButtonBusy,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.authGoogleIcon}>
                      <GoogleMark />
                    </View>
                    <Text
                      adjustsFontSizeToFit
                      minimumFontScale={0.86}
                      numberOfLines={1}
                      style={[styles.authSocialText, styles.authGoogleText]}
                    >
                      {authBusyProvider === 'google'
                        ? 'Открываем Google...'
                        : 'Продолжить с Google'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {!isRegister && !isVerify && !isReset ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setAuthMode('reset');
                    setPasswordResetRequested(false);
                    setAuthMessage('');
                  }}
                  style={styles.authSecondaryButton}
                >
                  <Text style={styles.authSecondaryText}>Забыли пароль?</Text>
                </Pressable>
              ) : null}

              {authMessage ? (
                <Text style={styles.authMessageText}>{authMessage}</Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={authSubmitting || authBusyProvider !== null}
                onPress={
                  isVerify
                    ? verifyRegistration
                    : isReset
                      ? passwordResetRequested
                        ? finishPasswordReset
                        : startPasswordReset
                    : isRegister
                      ? startRegistration
                      : loginWithPassword
                }
                style={({ pressed }) => [
                  styles.authPrimaryButton,
                  (authSubmitting || authBusyProvider !== null) && styles.buttonDisabled,
                  pressed && !authSubmitting && authBusyProvider === null && styles.pressed,
                ]}
              >
                <Text style={styles.authPrimaryText}>
                  {authSubmitting
                    ? 'Подождите...'
                    : isVerify
                      ? 'Подтвердить'
                      : isReset
                        ? passwordResetRequested
                          ? 'Изменить пароль'
                          : 'Получить код'
                      : isRegister
                        ? 'Получить код'
                        : 'Войти'}
                </Text>
                <ArrowRight color={colors.surface} size={22} strokeWidth={2.4} />
              </Pressable>
            </View>

            <Pressable
              accessibilityLabel={
                isRegister || isVerify || isReset
                  ? 'Перейти ко входу'
                  : 'Перейти к регистрации'
              }
              accessibilityRole="button"
              onPress={() => {
                setAuthMode(isRegister || isVerify || isReset ? 'login' : 'register');
                setAuthMessage('');
              }}
              style={styles.authSecondaryButton}
            >
              <Text style={styles.authSecondaryText}>
                {isRegister || isVerify || isReset
                  ? 'Уже есть аккаунт? Войти'
                  : 'Нет аккаунта? Зарегистрироваться'}
              </Text>
            </Pressable>

            {SHOW_TEST_LOGIN ? (
              <View style={styles.authDemoCard}>
                <Text style={styles.authDemoTitle}>Быстрый вход для теста</Text>
                <View style={styles.authDemoRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => loginAsDemo('client')}
                    style={({ pressed }) => [
                      styles.authDemoButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.authDemoButtonText}>Клиент</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => loginAsDemo('vendor')}
                    style={({ pressed }) => [
                      styles.authDemoButton,
                      styles.authDemoButtonActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.authDemoButtonText}>Поставщик</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (phase === 'onboarding') {
    const stories = role === 'client' ? clientStories : vendorStories;
    const story = stories[storyIndex];
    const storyPanResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gestureState) =>
        Math.abs(gestureState.dx) > 18 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderRelease: (_event, gestureState) => {
        if (gestureState.dx < -52) {
          runStoryTransition('next');
          return;
        }

        if (gestureState.dx > 52) {
          runStoryTransition('previous');
        }
      },
    });

    return (
      <SafeAreaView style={[styles.safeArea, styles.safeAreaDark]}>
        <StatusBar style="light" />
        <View style={styles.storyScreen}>
          <View style={styles.storyProgressRow}>
            {stories.map((item, index) => (
              <View
                key={item.title}
                style={styles.storyProgressItem}
              >
                <View
                  style={[
                    styles.storyProgressFill,
                    {
                      width:
                        index < storyIndex
                          ? '100%'
                          : index === storyIndex
                            ? `${Math.round(storyProgress * 100)}%`
                            : '0%',
                    },
                  ]}
                />
              </View>
            ))}
          </View>
          <Animated.View
            {...storyPanResponder.panHandlers}
            style={[
              styles.storyCard,
              { transform: [{ translateX: storyTranslateX }] },
            ]}
          >
            <View style={styles.storyVisual}>
              <Image
                accessibilityIgnoresInvertColors
                resizeMode="contain"
                source={story.image}
                style={styles.storyImage}
              />
            </View>
            <View pointerEvents="none" style={styles.storyCopy}>
              <Text style={styles.storyTitle}>{story.title}</Text>
              <Text style={styles.storyText}>{story.text}</Text>
            </View>
          </Animated.View>
          <View style={styles.storyRoundNavRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => runStoryTransition('previous')}
              style={({ pressed }) => [
                styles.storyRoundNavButton,
                storyIndex === 0 && styles.storyRoundNavButtonDisabled,
                pressed && styles.pressed,
              ]}
            >
              <ChevronLeft color={colors.surface} size={24} strokeWidth={2.2} />
            </Pressable>
            <Pressable
              accessibilityLabel="Следующий экран"
              accessibilityRole="button"
              onPress={() => runStoryTransition('next')}
              style={({ pressed }) => [
                styles.storyRoundNavButton,
                pressed && styles.pressed,
              ]}
            >
              <ChevronRight color={colors.surface} size={24} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'vendorImport') {
    const contentReady = instagramImportStarted || vendorImportMethod === 'manual';
    const toggleImportItem = (id: string) => {
      setSelectedImportIds((current) =>
        current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id],
      );
    };
    const updateVendorDraft = (
      field: keyof typeof vendorDraft,
      value: string,
    ) => {
      setVendorDraft((current) => ({ ...current, [field]: value }));
    };

    return (
      <SafeAreaView style={[styles.safeArea, styles.safeAreaDark]}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.vendorImportScreen}>
          <View style={styles.vendorImportHeader}>
            <View style={styles.vendorImportBot}>
              <Camera color={colors.surface} size={32} strokeWidth={2.2} />
            </View>
            <Text style={styles.vendorImportTitle}>Добавление портфолио</Text>
            <Text style={styles.vendorImportText}>
              Подключите аккаунт официальным входом Instagram или загрузите фото и видео вручную.
            </Text>
          </View>

          <View style={styles.botStatusCard}>
            <View style={styles.botStatusRow}>
              <View style={styles.vendorImportBot}>
                <ShieldCheck color={colors.surface} size={24} strokeWidth={2.1} />
              </View>
              <View style={styles.botStatusCopy}>
                <Text style={styles.botStatusTitle}>Официальное подключение</Text>
                <Text style={styles.botStatusText}>
                  Поставщик входит через окно Instagram/Meta, дает доступ к медиа и сам выбирает, что перенести.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.importMethodGrid}>
            <Pressable
              accessibilityRole="button"
              onPress={connectInstagramForImport}
              style={({ pressed }) => [
                styles.importMethodCard,
                vendorImportMethod === 'instagram' && styles.importMethodCardActive,
                pressed && styles.pressed,
              ]}
            >
              <Camera
                color={
                  vendorImportMethod === 'instagram' ? colors.surface : '#DDE3E8'
                }
                size={24}
                strokeWidth={2.1}
              />
              <Text style={styles.importMethodTitle}>Войти через Instagram</Text>
              <Text style={styles.importMethodText}>
                Официальный вход, разрешение на медиа и выбор постов.
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setVendorImportMethod('manual');
                setInstagramImportStarted(false);
              }}
              style={({ pressed }) => [
                styles.importMethodCard,
                vendorImportMethod === 'manual' && styles.importMethodCardActive,
                pressed && styles.pressed,
              ]}
            >
              <ImagePlus
                color={vendorImportMethod === 'manual' ? colors.surface : '#DDE3E8'}
                size={24}
                strokeWidth={2.1}
              />
              <Text style={styles.importMethodTitle}>Загрузить вручную</Text>
              <Text style={styles.importMethodText}>
                Если поставщик не хочет подключать Instagram.
              </Text>
            </Pressable>
          </View>

          {vendorImportMethod === 'instagram' ? (
            <View style={styles.instagramConnectCard}>
              <View style={styles.instagramProfileRow}>
                <Image
                  accessibilityIgnoresInvertColors
                  resizeMode="cover"
                  source={getVendorImageSource({
                    category: 'Ведущие',
                    imageKey: 'host',
                  })}
                  style={styles.instagramAvatar}
                />
                <View style={styles.instagramProfileCopy}>
                  <Text style={styles.instagramConnectedLabel}>
                    {instagramConnected ? 'Профиль найден' : 'Официальный вход'}
                  </Text>
                  <Text style={styles.instagramSourceText}>
                    {instagramConnected
                      ? `instagram.com/${instagramProfile?.username || instagramHandle.replace('@', '')}`
                      : 'Откроется официальный вход Instagram'}
                  </Text>
                  <View style={styles.instagramHandleRow}>
                    <AtSign color="#A7B0BA" size={17} strokeWidth={2.1} />
                    <TextInput
                      autoCapitalize="none"
                      onChangeText={setInstagramHandle}
                      placeholder="Instagram аккаунт"
                      placeholderTextColor="#A8A8A8"
                      style={styles.instagramHandleInput}
                      value={instagramHandle}
                    />
                  </View>
                </View>
                <View style={[styles.oauthBadge, !instagramConnected && styles.oauthBadgePending]}>
                  {instagramConnected ? (
                    <Check color={colors.surface} size={16} strokeWidth={3} />
                  ) : (
                    <AtSign color="#A7B0BA" size={16} strokeWidth={2.2} />
                  )}
                </View>
              </View>

              <View style={styles.permissionRow}>
                {instagramPermissions.map((permission) => (
                  <View key={permission} style={styles.permissionPill}>
                    <Check color={colors.green} size={14} strokeWidth={2.6} />
                    <Text style={styles.permissionText}>{permission}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.syncSummaryRow}>
                <View style={styles.syncSummaryItem}>
                  <Text style={styles.syncSummaryValue}>
                    {apiInstagramMedia.filter((item) => item.type === 'image').length}
                  </Text>
                  <Text style={styles.syncSummaryLabel}>постов</Text>
                </View>
                <View style={styles.syncSummaryItem}>
                  <Text style={styles.syncSummaryValue}>
                    {apiInstagramMedia.filter((item) => item.type === 'video').length}
                  </Text>
                  <Text style={styles.syncSummaryLabel}>reels</Text>
                </View>
                <View style={styles.syncSummaryItem}>
                  <Text style={styles.syncSummaryValue}>
                    {selectedImportIds.length}
                  </Text>
                  <Text style={styles.syncSummaryLabel}>выбрано</Text>
                </View>
              </View>
            </View>
          ) : null}

          {vendorImportMethod === 'manual' ? (
            <View style={styles.manualUploadCard}>
              <ImagePlus color={colors.surface} size={24} strokeWidth={2.1} />
              <View style={styles.botStatusCopy}>
                <Text style={styles.botStatusTitle}>Ручная загрузка</Text>
                <Text style={styles.botStatusText}>
                  Поставщик добавляет фото и видео сам, затем выбирает лучшие материалы для профиля.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => pickUploadedMedia(['images', 'videos'])}
                style={({ pressed }) => [
                  styles.manualUploadButton,
                  pressed && styles.pressed,
                ]}
              >
                <Upload color={colors.surface} size={18} strokeWidth={2.3} />
                <Text style={styles.manualUploadText}>
                  {uploadedMedia.length
                    ? `Выбрано файлов: ${uploadedMedia.length}`
                    : 'Выбрать файлы'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {contentReady ? (
            <>
              <Text style={styles.importSectionTitle}>
                {vendorImportMethod === 'instagram'
                  ? `Выберите посты из ${instagramHandle}`
                  : 'Выберите файлы для профиля'}
              </Text>
              <View style={styles.importGrid}>
                {apiInstagramMedia.map((item) => {
                  const selected = selectedImportIds.includes(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      onPress={() => toggleImportItem(item.id)}
                      style={({ pressed }) => [
                        styles.importTile,
                        selected && styles.importTileSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Image
                        accessibilityIgnoresInvertColors
                        resizeMode="cover"
                        source={getInstagramMediaImageSource(item)}
                        style={styles.importTileImage}
                      />
                      <View style={styles.importTileShade} />
                      <View
                        style={[
                          styles.importCheck,
                          selected && styles.importCheckSelected,
                        ]}
                      >
                        {selected ? (
                          <Check color={colors.surface} size={18} strokeWidth={3} />
                        ) : null}
                      </View>
                      <Text style={styles.importType}>
                        {vendorImportMethod === 'manual'
                          ? item.type === 'video'
                            ? 'Загруженное видео'
                            : 'Загруженное фото'
                          : item.type === 'video'
                            ? 'Instagram видео'
                            : 'Instagram фото'}
                      </Text>
                      <Text numberOfLines={2} style={styles.importTitle}>
                        {item.title}
                      </Text>
                    </Pressable>
                  );
                })}
                {vendorImportMethod === 'instagram' && apiInstagramMedia.length === 0 ? (
                  <View style={[styles.clientEmptyCard, styles.importEmptyCard]}>
                    <Text style={styles.clientEmptyTitle}>Медиа появятся после OAuth</Text>
                    <Text style={styles.clientEmptyText}>
                      Подключите Instagram через официальный вход, затем обновите медиа.
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.missingInfoCard}>
                <View style={styles.missingInfoHeader}>
                  <BadgeCheck color={colors.green} size={22} strokeWidth={2.4} />
                  <Text style={styles.missingInfoTitle}>Дозаполните профиль</Text>
                </View>
                <DraftInput
                  label="Название"
                  onChangeText={(value) => updateVendorDraft('name', value)}
                  value={vendorDraft.name}
                />
                <DraftInput
                  label="Город"
                  onChangeText={(value) => updateVendorDraft('city', value)}
                  value={vendorDraft.city}
                />
                <CategorySelect
                  categories={apiCategories}
                  onSelect={(category) => {
                    updateVendorDraft('category', category);
                    setCategoryMenuOpen(false);
                  }}
                  onToggle={() => setCategoryMenuOpen((open) => !open)}
                  open={categoryMenuOpen}
                  selectedCategory={vendorDraft.category}
                />
                <DraftInput
                  keyboardType="numeric"
                  label="Цена от"
                  onChangeText={(value) => updateVendorDraft('priceFrom', formatMoneyInput(value))}
                  value={formatMoneyInput(vendorDraft.priceFrom)}
                />
                <DraftInput
                  keyboardType="phone-pad"
                  label="WhatsApp"
                  onChangeText={(value) => updateVendorDraft('phone', value)}
                  value={vendorDraft.phone}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={finishVendorImport}
                style={({ pressed }) => [
                  styles.authPrimaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.authPrimaryText}>Создать профиль</Text>
                <Upload color={colors.surface} size={22} strokeWidth={2.4} />
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (role === 'vendor') {
    return (
      <SafeAreaView style={[styles.safeArea, styles.safeAreaDark]}>
        <StatusBar style="light" />
          <VendorDashboard
            bookings={vendorRequests}
            documents={documents}
          busyDates={vendorBusyDates}
          freeDates={vendorFreeDates}
          initialDashboardSection={reviewConfig?.vendorDashboardSection}
          initialProfilePreviewOpen={reviewConfig?.vendorProfilePreviewOpen ?? false}
          initialSettingLabel={
            reviewConfig?.vendorSettingLabel ??
            (openedFromInstagramCallback ? 'Instagram' : undefined)
          }
          onApplyUser={applyApiUser}
          onChangeUploadedMedia={changeUploadedMedia}
          onChangeCalendar={changeVendorCalendar}
          onDeleteAccount={deleteAccount}
          onSaveVendorSettings={saveVendorSettings}
          settingsOpen={vendorSettingsOpen}
          email={email || makeInternalEmail('demo')}
          onCloseSettings={() => setVendorSettingsOpen(false)}
          onOpenSettings={() => setVendorSettingsOpen(true)}
          onSignOut={signOut}
          onSwitchRole={switchRole}
          onUpdateRequestStatus={updateVendorRequestStatus}
          pushRegistrationMessage={pushRegistrationMessage}
          settings={apiVendorSettings}
          uploadedMedia={uploadedMedia}
          userId={userId}
          vendorDashboardTarget={vendorDashboardTarget}
          vendorAnalytics={vendorAnalytics}
          vendorDraft={vendorDraft}
          vendorSettingsValues={vendorSettingsValues}
          vendors={apiVendors}
        />
      </SafeAreaView>
    );
  }

  const savedVendors = visibleClientVendors.filter((vendor) =>
    savedVendorIds.includes(vendor.id),
  );
  const changeClientMainTab = (tab: ClientMainTab) => {
    setRoute({ name: 'catalog' });
    setClientSettingsOpen(false);
    setClientInitialSettingLabel(undefined);
    setClientMainTab(tab);
  };

  return (
    <SafeAreaView style={[styles.safeArea, styles.safeAreaDark]}>
      <StatusBar style="light" />
      <View style={styles.catalogFullscreenHost}>
        {route.name === 'vendor' && selectedVendor ? (
          <ScrollView contentContainerStyle={styles.vendorDetailContent}>
            <VendorDetailScreen
              vendor={selectedVendor}
              initialBookingCalendarOpen={
                Boolean(bookingToEditId) || (reviewConfig?.vendorBookingOpen ?? false)
              }
              initialBookingCreated={reviewConfig?.vendorBookingCreated ?? false}
              initialProfileTab={route.initialProfileTab}
              isSaved={savedVendorIds.includes(selectedVendor.id)}
              likedMediaIds={likedMediaIds}
              savedMediaIds={savedMediaIds}
              media={selectedVendor.media}
              onBack={() => {
                setBookingToEditId(null);
                setRoute({ name: 'catalog' });
              }}
              onBlock={() => blockVendor(selectedVendor.id)}
              onBook={(date, timeFrom, timeTo) =>
                bookVendor(selectedVendor, date, timeFrom, timeTo)
              }
              onMediaView={() => trackVendorEvent(selectedVendor.id, 'media_view')}
              onReport={() => reportVendor(selectedVendor.id)}
              onReportComment={(mediaId, commentId) =>
                reportContent(selectedVendor.id, {
                  targetType: 'comment',
                  mediaId,
                  commentId,
                })
              }
              onReportMedia={(mediaId) =>
                reportContent(selectedVendor.id, { targetType: 'media', mediaId })
              }
              onSubmitMediaComment={(mediaId, text) =>
                submitMediaComment(selectedVendor.id, mediaId, text)
              }
              onFetchMediaLikes={(mediaId) =>
                fetchMediaLikesRemote(selectedVendor.id, mediaId).then(
                  (result) => result.likes,
                )
              }
              onToggleMediaLiked={(mediaId) =>
                toggleMediaLiked(selectedVendor.id, mediaId)
              }
              onToggleMediaSaved={(mediaId) =>
                toggleMediaSaved(selectedVendor.id, mediaId)
              }
              onToggleSaved={() => toggleSaved(selectedVendor.id)}
            />
          </ScrollView>
        ) : clientMainTab === 'feed' || clientMainTab === 'categories' ? (
          <CatalogScreen
            vendors={visibleClientVendors}
            categories={apiCategories}
            mode={clientMainTab === 'feed' ? 'feed' : 'categories'}
            initialShortsCategories={[DEFAULT_SHORTS_CATEGORY]}
            initialShortsOpen={clientMainTab === 'feed'}
            likedMediaIds={likedMediaIds}
            savedVendorIds={savedVendorIds}
            onSubmitMediaComment={submitMediaComment}
            onReportComment={(vendorId, mediaId, commentId) =>
              reportContent(vendorId, { targetType: 'comment', mediaId, commentId })
            }
            onReportMedia={(vendorId, mediaId) =>
              reportContent(vendorId, { targetType: 'media', mediaId })
            }
            onToggleMediaLiked={toggleMediaLiked}
            onOpenVendor={openVendor}
            onOpenReviews={openVendorReviews}
            onToggleSaved={toggleSaved}
          />
        ) : clientMainTab === 'requests' ? (
          <ClientRequestsScreen
            bookings={clientBookings}
            onCancelBooking={cancelClientBooking}
            onChangeBookingDate={openBookingDateChange}
            onTrackVendorEvent={trackVendorEvent}
            vendors={visibleClientVendors}
            onOpenVendor={openVendor}
          />
        ) : clientMainTab === 'event' ? (
          <ClientEventScreen
            bookings={clientBookings}
            eventDraft={eventDraft}
            eventHistory={eventHistory}
            initialEditing={reviewConfig?.clientEventEditing ?? false}
            onChangeEventDraft={(nextDraft) => {
              setEventDraft(nextDraft);
              if (userId) {
                updateUser(userId, { eventDraft: nextDraft }).catch(() =>
                  setBackendStatus('offline'),
                );
              }
            }}
            onSaveEvent={saveClientEvent}
          />
        ) : (
          <ClientProfileScreen
            bookingsCount={clientBookings.filter((booking) =>
              isConfirmedBookingStatus(booking.status)).length}
            clientProfile={clientProfile}
            email={email || makeInternalEmail('demo')}
            eventDraft={eventDraft}
            onOpenCabinet={() => openClientSetting('')}
            onOpenSaved={() => openClientSetting('Избранное')}
            onSignOut={signOut}
            onSwitchRole={() => switchRole('vendor')}
            savedCount={savedVendors.length}
          />
        )}
        {backendStatus === 'offline' ? (
          <Pressable
            accessibilityLabel="Нет соединения. Повторить подключение"
            accessibilityLiveRegion="polite"
            accessibilityRole="button"
            onPress={() => void retryBackend()}
            style={styles.backendStatusPill}
          >
            <Text style={styles.backendStatusText}>Нет соединения · Повторить</Text>
          </Pressable>
        ) : null}
        <ClientBottomBar
          activeTab={clientMainTab}
          onChangeTab={changeClientMainTab}
          requestsCount={clientBookings.length}
        />
        {clientSettingsOpen ? (
          <ClientSettingsPanel
            bookings={clientBookings}
            clientProfile={clientProfile}
            clientSettingsValues={clientSettingsValues}
            documents={documents}
            email={email || makeInternalEmail('demo')}
            eventDraft={eventDraft}
            initialSettingLabel={clientInitialSettingLabel}
            onChangeEventDraft={(nextDraft) => {
              setEventDraft(nextDraft);
              if (userId) {
                updateUser(userId, { eventDraft: nextDraft }).catch(() =>
                  setBackendStatus('offline'),
                );
              }
            }}
            onClose={() => {
              setClientSettingsOpen(false);
              setClientInitialSettingLabel(undefined);
            }}
            onDeleteAccount={deleteAccount}
            onCancelBooking={cancelClientBooking}
            onChangeBookingDate={openBookingDateChange}
            onApplyUser={applyApiUser}
            onSaveClientEvent={saveClientEvent}
            onSaveClientSettings={saveClientSettings}
            onOpenSavedVendor={(vendor) => {
              setClientSettingsOpen(false);
              setClientInitialSettingLabel(undefined);
              openVendor(vendor);
            }}
            onSignOut={signOut}
            onSwitchRole={switchRole}
            pushRegistrationMessage={pushRegistrationMessage}
            savedVendors={savedVendors}
            settings={clientSettings}
            userId={userId}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function ClientBottomBar({
  activeTab,
  onChangeTab,
  requestsCount,
}: {
  activeTab: ClientMainTab;
  onChangeTab: (tab: ClientMainTab) => void;
  requestsCount: number;
}) {
  const changeTab = (tab: ClientMainTab) => {
    onChangeTab(tab);
  };

  return (
    <View style={styles.clientBottomBar}>
      <ClientBottomNavItem
        active={activeTab === 'feed'}
        icon={Grid2X2}
        label="Главная"
        onPress={() => changeTab('feed')}
      />
      <ClientBottomNavItem
        active={activeTab === 'requests'}
        badge={requestsCount ? String(requestsCount) : undefined}
        icon={MessageCircle}
        label="Заявки"
        onPress={() => changeTab('requests')}
      />
      <View style={styles.clientBottomCenterSlot}>
        <Pressable
          accessibilityLabel="Категории"
          accessibilityRole="button"
          onPress={() => changeTab('categories')}
          style={styles.vendorBottomAddButton}
        >
          <Plus color={colors.surface} size={24} strokeWidth={2.1} />
        </Pressable>
      </View>
      <ClientBottomNavItem
        active={activeTab === 'event'}
        icon={CalendarDays}
        label="Мое мероприятие"
        onPress={() => changeTab('event')}
      />
      <ClientBottomNavItem
        active={activeTab === 'profile'}
        icon={UserRound}
        label="Профиль"
        onPress={() => changeTab('profile')}
      />
    </View>
  );
}

function ClientBottomNavItem({
  active = false,
  badge,
  icon: Icon,
  label,
  onPress,
}: {
  active?: boolean;
  badge?: string;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.vendorBottomNavItem,
        pressed && styles.pressed,
      ]}
    >
      <View>
        <Icon
          color={active ? '#F5F5F5' : '#A8A8A8'}
          fill={active ? '#F5F5F5' : 'transparent'}
          size={24}
          strokeWidth={1.9}
        />
        {badge ? (
          <View style={styles.vendorBottomBadge}>
            <Text style={styles.vendorBottomBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text
        numberOfLines={2}
        style={[
          styles.vendorBottomNavText,
          active && styles.vendorBottomNavTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function OldClientBottomBarUnused({
  activeTab,
  onChangeTab,
}: {
  activeTab: ClientMainTab;
  onChangeTab: (tab: ClientMainTab) => void;
}) {
  const tabs = [
    { id: 'feed', label: 'Лента', icon: Clapperboard },
    { id: 'requests', label: 'Заявки', icon: MessageCircle },
    { id: 'categories', label: 'Категории', icon: Grid2X2 },
    { id: 'event', label: 'Мероприятие', icon: CalendarDays },
    { id: 'profile', label: 'Профиль', icon: UserRound },
  ] satisfies Array<{ id: ClientMainTab; label: string; icon: LucideIcon }>;

  return (
    <View style={styles.clientBottomBar}>
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="button"
            onPress={() => onChangeTab(tab.id)}
            style={({ pressed }) => [
              styles.clientBottomItem,
              active && styles.clientBottomItemActive,
              pressed && styles.pressed,
            ]}
          >
            <Icon
              color={active ? colors.surface : '#9CA4AE'}
              size={21}
              strokeWidth={2.15}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.clientBottomLabel,
                active && styles.clientBottomLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ClientSavedScreen({
  onOpenVendor,
  vendors,
}: {
  onOpenVendor: (vendor: Vendor) => void;
  vendors: Vendor[];
}) {
  return (
    <ScrollView contentContainerStyle={styles.clientTabScreenContent}>
      <Text style={styles.clientTabTitle}>Избранное</Text>
      <Text style={styles.clientTabMeta}>Сохраненные подрядчики для сравнения</Text>
      {vendors.length ? (
        <View style={styles.clientSavedGrid}>
          {vendors.map((vendor) => (
            <Pressable
              key={vendor.id}
              accessibilityRole="button"
              onPress={() => onOpenVendor(vendor)}
              style={({ pressed }) => [
                styles.clientSavedTile,
                pressed && styles.pressed,
              ]}
            >
              <Image
                accessibilityIgnoresInvertColors
                resizeMode="cover"
                source={getVendorImageSource(vendor)}
                style={styles.clientSavedTileImage}
              />
              <View style={styles.clientSavedTileShade} />
              <View style={styles.clientSavedTileRating}>
                <Text style={styles.clientSavedTileRatingText}>{vendor.rating}</Text>
              </View>
              <View style={styles.clientSavedTileMeta}>
                <Text numberOfLines={1} style={styles.clientSavedTileName}>
                  {vendor.name}
                </Text>
                <Text numberOfLines={1} style={styles.clientSavedTileCategory}>
                  {vendor.category} · от {formatMoney(vendor.priceFrom)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.clientEmptyCard}>
          <Text style={styles.clientEmptyTitle}>Пока пусто</Text>
          <Text style={styles.clientEmptyText}>
            Сохраняйте подрядчиков в ленте или на странице профиля.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function ClientRequestsScreen({
  bookings,
  onCancelBooking,
  onChangeBookingDate,
  onOpenVendor,
  onTrackVendorEvent,
  vendors,
}: {
  bookings: ClientBooking[];
  onCancelBooking: (booking: ClientBooking) => void;
  onChangeBookingDate: (booking: ClientBooking) => void;
  onOpenVendor: (vendor: Vendor) => void;
  onTrackVendorEvent: (
    vendorId: string,
    type: 'profile_view' | 'media_view' | 'save' | 'whatsapp_click',
  ) => void;
  vendors: Vendor[];
}) {
  const requests = bookings.map((booking) => ({
        id: booking.id,
        name: booking.vendorName,
        vendorId: booking.vendorId,
        meta: `${formatStoredDate(booking.date)}${
          booking.timeFrom && booking.timeTo ? ` · ${booking.timeFrom}-${booking.timeTo}` : ''
        } · ${formatMoneyText(booking.amount)}`,
        status: getCompactBookingStatus(booking.status),
        message: 'Ожидаем подтверждение даты от поставщика.',
      }));
  const openRequestChat = (vendorId: string) => {
    const vendor = vendors.find((item) => item.id === vendorId);
    if (!vendor) return;
    const phone = vendor.contactPhone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Здравствуйте! Нашли вас на SVADBA.kz. Хотим обсудить дату и условия: ${vendor.name}`,
    );
    onTrackVendorEvent(vendorId, 'whatsapp_click');
    void Linking.openURL(`https://wa.me/${phone}?text=${message}`).catch(
      () => undefined,
    );
  };
  return (
    <ScrollView contentContainerStyle={styles.clientTabScreenContent}>
      <Text style={styles.clientTabTitle}>Заявки</Text>
      <Text style={styles.clientTabMeta}>Переписки, брони и ответы поставщиков</Text>
      {requests.length ? (
        requests.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.requestHeaderCopy}>
                <Text style={styles.requestName}>{request.name}</Text>
                <Text style={styles.requestMeta}>{request.meta}</Text>
              </View>
              <View style={styles.requestStatusBadge}>
                <Text numberOfLines={1} style={styles.requestStatusText}>{request.status}</Text>
              </View>
            </View>
            <Text style={styles.requestMessage}>{request.message}</Text>
            <View style={styles.requestActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => openRequestChat(request.vendorId)}
                style={({ pressed }) => [
                  styles.requestActionPrimary,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.requestActionPrimaryText}>Написать</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const booking = bookings.find((item) => item.id === request.id);
                  if (booking) onChangeBookingDate(booking);
                }}
                style={({ pressed }) => [
                  styles.requestActionGhost,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.requestActionGhostText}>Изменить дату</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const booking = bookings.find((item) => item.id === request.id);
                  if (booking) onCancelBooking(booking);
                }}
                style={({ pressed }) => [styles.requestActionGhost, pressed && styles.pressed]}
              >
                <Text style={styles.requestActionGhostText}>Отменить</Text>
              </Pressable>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.clientEmptyCard}>
          <Text style={styles.clientEmptyTitle}>Заявок пока нет</Text>
          <Text style={styles.clientEmptyText}>
            Выберите подрядчика в ленте и отправьте заявку.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function ClientEventScreen({
  bookings,
  eventDraft,
  eventHistory,
  initialEditing = false,
  onChangeEventDraft,
  onSaveEvent,
}: {
  bookings: ClientBooking[];
  eventDraft: EventDraft;
  eventHistory: ClientEvent[];
  initialEditing?: boolean;
  onChangeEventDraft: (draft: EventDraft) => void;
  onSaveEvent: (draft: EventDraft, eventId?: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(initialEditing);
  const [draft, setDraft] = useState(eventDraft);
  const [editingEventId, setEditingEventId] = useState<string | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState('');
  useEffect(() => {
    if (!editing) {
      setDraft(eventDraft);
    }
  }, [editing, eventDraft]);
  const updateDraftField = (field: keyof EventDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };
  const saveDraft = async () => {
    const saved = await onSaveEvent(draft, editingEventId);
    setSaveStatus(saved ? 'Сохранено' : 'Сохранено локально. Проверьте сеть.');
    if (saved) {
      setEditing(false);
      setEditingEventId(undefined);
    }
  };
  const createNewEvent = () => {
    const nextDraft: EventDraft = {
      type: '',
      date: '',
      city: '',
      guests: '',
      budget: '',
      place: '',
      comment: '',
    };
    setDraft(nextDraft);
    onChangeEventDraft(nextDraft);
    setEditingEventId(undefined);
    setSaveStatus('');
    setEditing(true);
  };
  const sortedHistory = [...eventHistory].sort((a, b) =>
    String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)),
  );
  const activeEvents = sortedHistory.filter((event) => !isClientEventPast(event.date));
  const pastEvents = sortedHistory.filter((event) => isClientEventPast(event.date));
  const startEditEvent = (event: ClientEvent) => {
    if (isClientEventPast(event.date)) return;
    const nextDraft = getEventDraftFromHistory(event);
    onChangeEventDraft(nextDraft);
    setDraft(nextDraft);
    setEditingEventId(event.id);
    setSaveStatus('');
    setEditing(true);
  };
  const renderEventCard = (event: ClientEvent) => {
    const past = isClientEventPast(event.date);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: past }}
        disabled={past}
        key={event.id}
        onPress={() => startEditEvent(event)}
        style={({ pressed }) => [
          styles.clientBookingCard,
          past && styles.clientBookingCardMuted,
          pressed && !past && styles.pressed,
        ]}
      >
        <View style={styles.clientSavedInfo}>
          <Text style={styles.clientSavedName}>{event.type || 'Мероприятие'}</Text>
          <Text style={styles.clientSavedMeta}>
            {[formatStoredDate(event.date), event.city, event.guests
              ? `${event.guests} ${pluralizeRu(Number(event.guests), 'гость', 'гостя', 'гостей')}`
              : '']
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <View style={styles.requestStatusBadge}>
          <Text style={styles.requestStatusText}>{past ? 'Прошло' : 'Активно'}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.clientTabScreenContent}>
      <Text style={styles.clientTabTitle}>Мое мероприятие</Text>
      <Text style={styles.clientTabMeta}>Несколько событий, брони и история</Text>
      {editing ? (
        <View style={styles.clientEventCard}>
          <EventDropdownField
            label="Тип мероприятия"
            options={CLIENT_EVENT_TYPES}
            placeholder="Выберите тип"
            value={draft.type}
            onChange={(value) => updateDraftField('type', value)}
          />
          <EventDateField
            value={draft.date}
            onChange={(value) => updateDraftField('date', value)}
          />
          <EventDropdownField
            label="Город"
            options={KAZAKHSTAN_MAJOR_CITIES}
            placeholder="Выберите город"
            value={draft.city}
            onChange={(value) => updateDraftField('city', value)}
          />
          <View style={styles.draftInputRow}>
            <Text style={styles.draftInputLabel}>Гости</Text>
            <TextInput
              keyboardType="number-pad"
              placeholder="Количество гостей"
              placeholderTextColor="#A8A8A8"
              style={styles.draftInput}
              value={draft.guests}
              onChangeText={(value) => updateDraftField('guests', digitsOnly(value))}
            />
          </View>
          <View style={styles.draftInputRow}>
            <Text style={styles.draftInputLabel}>Бюджет</Text>
            <TextInput
              keyboardType="number-pad"
              placeholder="Плановый бюджет"
              placeholderTextColor="#A8A8A8"
              style={styles.draftInput}
              value={formatMoneyInput(draft.budget)}
              onChangeText={(value) => updateDraftField('budget', formatMoneyInput(value))}
            />
          </View>
          <VenueDraftInput
            onChange={(value) => updateDraftField('place', value)}
            value={draft.place}
          />
          <View style={styles.draftInputRow}>
            <Text style={styles.draftInputLabel}>Комментарий</Text>
            <TextInput
              placeholder="Что важно учесть"
              placeholderTextColor="#A8A8A8"
              style={styles.draftInput}
              value={draft.comment}
              onChangeText={(value) => updateDraftField('comment', value)}
            />
          </View>
          <View style={styles.requestActions}>
            <Pressable
              accessibilityRole="button"
              onPress={saveDraft}
              style={({ pressed }) => [
                styles.requestActionPrimary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.requestActionPrimaryText}>Сохранить</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setDraft(eventDraft);
                setEditing(false);
              }}
              style={({ pressed }) => [
                styles.requestActionGhost,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.requestActionGhostText}>Отмена</Text>
            </Pressable>
          </View>
          {saveStatus ? <Text style={styles.mediaUploadStatus}>{saveStatus}</Text> : null}
        </View>
      ) : (
        <View style={styles.clientEventCard}>
          <View style={styles.requestActions}>
            <Pressable
              accessibilityRole="button"
              onPress={createNewEvent}
              style={({ pressed }) => [
                styles.requestActionPrimary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.requestActionPrimaryText}>Новое мероприятие</Text>
            </Pressable>
          </View>
          {saveStatus ? <Text style={styles.mediaUploadStatus}>{saveStatus}</Text> : null}
        </View>
      )}
      <Text style={styles.clientSectionTitle}>Текущие мероприятия</Text>
      {activeEvents.length ? (
        activeEvents.map(renderEventCard)
      ) : (
        <View style={styles.clientEmptyCard}>
          <Text style={styles.clientEmptyTitle}>Текущих событий нет</Text>
          <Text style={styles.clientEmptyText}>Сохраните мероприятие, и оно появится тут.</Text>
        </View>
      )}
      <Text style={styles.clientSectionTitle}>История мероприятий</Text>
      {pastEvents.length ? (
        pastEvents.map(renderEventCard)
      ) : (
        <View style={styles.clientEmptyCard}>
          <Text style={styles.clientEmptyTitle}>Прошедших событий нет</Text>
          <Text style={styles.clientEmptyText}>Когда дата пройдет, событие останется здесь без редактирования.</Text>
        </View>
      )}
      <Text style={styles.clientSectionTitle}>Брони</Text>
      {bookings.length ? (
        bookings.map((booking) => (
          <View key={booking.id} style={styles.clientBookingCard}>
            <View style={styles.requestHeaderCopy}>
              <Text style={styles.clientSavedName}>{booking.vendorName}</Text>
              <Text style={styles.clientSavedMeta}>
                {formatStoredDate(booking.date)}
                {booking.timeFrom && booking.timeTo
                  ? ` · ${booking.timeFrom}-${booking.timeTo}`
                  : ''}
                {' · '}
                {formatMoneyText(booking.amount)}
              </Text>
            </View>
            <View style={styles.requestStatusBadge}>
              <Text numberOfLines={1} style={styles.requestStatusText}>
                {getCompactBookingStatus(booking.status)}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.clientEmptyCard}>
          <Text style={styles.clientEmptyTitle}>Брони пока нет</Text>
          <Text style={styles.clientEmptyText}>
            Выберите подрядчика и забронируйте дату.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function ClientProfileScreen({
  bookingsCount,
  clientProfile,
  email,
  eventDraft,
  onOpenCabinet,
  onOpenSaved,
  onSignOut,
  onSwitchRole,
  savedCount,
}: {
  bookingsCount: number;
  clientProfile: ClientProfileDraft;
  email: string;
  eventDraft: EventDraft;
  onOpenCabinet: () => void;
  onOpenSaved: () => void;
  onSignOut: () => void;
  onSwitchRole: () => void;
  savedCount: number;
}) {
  const eventFilled = Object.values(eventDraft).some((value) => String(value || '').trim());
  return (
    <ScrollView contentContainerStyle={styles.clientTabScreenContent}>
      <Text style={styles.clientTabTitle}>Профиль</Text>
      <Text style={styles.clientTabMeta}>
        {clientProfile.name ? `${clientProfile.name} · ${email}` : email}
      </Text>
      <View style={styles.clientEventCard}>
        <View style={styles.vendorDashboardStats}>
          <Pressable
            accessibilityRole="button"
            onPress={onOpenSaved}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <VendorStat
              value={String(savedCount)}
              label={pluralizeRu(savedCount, 'избранный', 'избранных', 'избранных')}
            />
          </Pressable>
          <VendorStat
            value={String(bookingsCount)}
            label={pluralizeRu(bookingsCount, 'бронь', 'брони', 'броней')}
          />
          <VendorStat
            value={eventFilled ? '1' : '0'}
            label={eventFilled ? 'событие' : 'событий'}
          />
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onOpenCabinet}
        style={({ pressed }) => [
          styles.clientProfileAction,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.clientProfileActionText}>Открыть кабинет</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onSwitchRole}
        style={({ pressed }) => [
          styles.clientProfileAction,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.clientProfileActionText}>Режим поставщика</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onSignOut}
        style={({ pressed }) => [
          styles.clientProfileLogout,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.clientProfileLogoutText}>Выйти</Text>
      </Pressable>
    </ScrollView>
  );
}

function EventDropdownField({
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.draftInputRow}>
      <Text style={styles.draftInputLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [
          styles.eventDropdownButton,
          open && styles.eventDropdownButtonActive,
          pressed && styles.pressed,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.eventDropdownText,
            !value && styles.eventDropdownPlaceholder,
          ]}
        >
          {value || placeholder}
        </Text>
        <ChevronDown color="#A7B0BA" size={18} strokeWidth={2.2} />
      </Pressable>
      {open ? (
        <View style={styles.eventDropdownMenu}>
          {options.map((option) => {
            const active = value === option;
            return (
              <Pressable
                accessibilityRole="button"
                key={option}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.eventDropdownOption,
                  active && styles.eventDropdownOptionActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.eventDropdownOptionText,
                    active && styles.eventDropdownOptionTextActive,
                  ]}
                >
                  {option}
                </Text>
                {active ? <Check color={colors.surface} size={16} strokeWidth={2.8} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function EventDateField({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const selected = parseClientEventDate(value);
    const initial = selected && selected >= getAppTodayDate() ? selected : getAppTodayDate();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const today = getAppTodayDate();
  const todayIso = formatIsoDate(today);
  const selected = parseClientEventDate(value);
  const selectedIso = selected ? formatIsoDate(selected) : '';
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const monthNames = [
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
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmptyDays = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells: Array<number | null> = [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7) cells.push(null);
  const rows = Array.from(
    { length: Math.ceil(cells.length / 7) },
    (_, index) => cells.slice(index * 7, index * 7 + 7),
  );
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoBack = visibleMonth > currentMonth;
  const openCalendar = () => {
    const initial = selected && selected >= today ? selected : today;
    setVisibleMonth(new Date(initial.getFullYear(), initial.getMonth(), 1));
    setOpen(true);
  };
  const selectDate = (day: number) => {
    const date = new Date(year, month, day);
    if (formatIsoDate(date) < todayIso) return;
    onChange(formatClientEventDate(date));
    setOpen(false);
  };

  return (
    <View style={styles.draftInputRow}>
      <Text style={styles.draftInputLabel}>Дата</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Выбрать дату мероприятия"
        onPress={openCalendar}
        style={({ pressed }) => [
          styles.eventDropdownButton,
          open && styles.eventDropdownButtonActive,
          pressed && styles.pressed,
        ]}
      >
        <Text
          style={[
            styles.eventDropdownText,
            !value && styles.eventDropdownPlaceholder,
          ]}
        >
          {value || 'Выберите дату'}
        </Text>
        <CalendarDays color="#A7B0BA" size={19} strokeWidth={2.1} />
      </Pressable>
      <Modal
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        transparent
        visible={open}
      >
        <View style={styles.detailBookingModal}>
          <Pressable
            accessibilityLabel="Закрыть календарь"
            accessibilityRole="button"
            onPress={() => setOpen(false)}
            style={styles.detailBookingBackdrop}
          />
          <View style={styles.detailBookingSheet}>
            <View style={styles.detailBookingSheetHandle} />
            <View style={[styles.detailBookingCalendar, styles.detailBookingCalendarInSheet]}>
              <View style={styles.detailBookingCalendarHeader}>
                <View>
                  <Text style={styles.detailBookingCalendarTitle}>Дата мероприятия</Text>
                  <Text style={styles.detailBookingCalendarMeta}>Выберите день в календаре</Text>
                </View>
                <Pressable
                  accessibilityLabel="Закрыть календарь"
                  accessibilityRole="button"
                  onPress={() => setOpen(false)}
                  style={styles.detailBookingCalendarClose}
                >
                  <X color={colors.surface} size={20} strokeWidth={2.1} />
                </Pressable>
              </View>
              <View style={styles.calendarMonthNav}>
                <Pressable
                  accessibilityLabel="Предыдущий месяц"
                  accessibilityRole="button"
                  disabled={!canGoBack}
                  onPress={() =>
                    setVisibleMonth((current) =>
                      new Date(current.getFullYear(), current.getMonth() - 1, 1),
                    )
                  }
                  style={({ pressed }) => [
                    styles.calendarNavButton,
                    !canGoBack && styles.calendarMonthDayPast,
                    pressed && styles.pressed,
                  ]}
                >
                  <ChevronLeft color={colors.surface} size={20} strokeWidth={2.1} />
                </Pressable>
                <Text style={styles.calendarMonth}>{monthNames[month]} {year}</Text>
                <Pressable
                  accessibilityLabel="Следующий месяц"
                  accessibilityRole="button"
                  onPress={() =>
                    setVisibleMonth((current) =>
                      new Date(current.getFullYear(), current.getMonth() + 1, 1),
                    )
                  }
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
                  <Text key={day} style={styles.weekDayText}>{day}</Text>
                ))}
              </View>
              <View style={styles.calendarMonthGrid}>
                {rows.map((row, rowIndex) => (
                  <View key={`event-row-${rowIndex}`} style={styles.calendarWeekRow}>
                    {row.map((day, dayIndex) => {
                      if (!day) {
                        return <View key={`empty-${rowIndex}-${dayIndex}`} style={styles.calendarMonthDayEmpty} />;
                      }
                      const date = new Date(year, month, day);
                      const iso = formatIsoDate(date);
                      const past = iso < todayIso;
                      const active = iso === selectedIso;
                      const sunday = date.getDay() === 0;
                      return (
                        <Pressable
                          accessibilityRole="button"
                          disabled={past}
                          key={iso}
                          onPress={() => selectDate(day)}
                          style={({ pressed }) => [
                            styles.calendarMonthDay,
                            sunday && styles.calendarMonthDaySunday,
                            past && styles.calendarMonthDayPast,
                            active && styles.calendarMonthDaySelected,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={[
                            styles.calendarMonthDayText,
                            sunday && styles.calendarMonthDayTextSunday,
                            past && styles.calendarMonthDayTextPast,
                            active && styles.calendarMonthDayTextSelected,
                          ]}>{day}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ClientSettingsPanel({
  bookings,
  clientProfile,
  clientSettingsValues,
  documents,
  email,
  eventDraft,
  initialSettingLabel,
  onChangeEventDraft,
  onClose,
  onDeleteAccount,
  onCancelBooking,
  onChangeBookingDate,
  onApplyUser,
  onOpenSavedVendor,
  onSaveClientEvent,
  onSaveClientSettings,
  onSignOut,
  onSwitchRole,
  pushRegistrationMessage,
  savedVendors,
  settings,
  userId,
}: {
  bookings: ClientBooking[];
  clientProfile: ClientProfileDraft;
  clientSettingsValues: SettingsValueMap;
  documents: UserDocument[];
  email: string;
  eventDraft: EventDraft;
  initialSettingLabel?: string;
  onChangeEventDraft: (draft: EventDraft) => void;
  onClose: () => void;
  onDeleteAccount: () => void;
  onCancelBooking: (booking: ClientBooking) => void;
  onChangeBookingDate: (booking: ClientBooking) => void;
  onApplyUser: (user: ApiUser) => void;
  onOpenSavedVendor: (vendor: Vendor) => void;
  onSaveClientEvent: (draft: EventDraft, eventId?: string) => Promise<boolean>;
  onSaveClientSettings: (
    label: string,
    values: Record<string, string>,
    nextProfile?: ClientProfileDraft,
  ) => Promise<boolean>;
  onSignOut: () => void;
  onSwitchRole: (role: Role) => void;
  pushRegistrationMessage: string;
  savedVendors: Vendor[];
  settings: typeof clientSettings;
  userId: string | null;
}): ReactElement {
  const [activeSetting, setActiveSetting] = useState<
    (typeof clientSettings)[number] | null
  >(() =>
    initialSettingLabel
      ? settings.find((item) => item.label === initialSettingLabel) ?? null
      : null,
  );

  return (
    <View style={styles.vendorSettingsOverlay}>
      <View style={styles.vendorSettingsPanel}>
        <View style={styles.vendorSettingsHeader}>
          <View>
            <Text style={styles.vendorSettingsTitle}>Кабинет</Text>
            <Text style={styles.vendorSettingsMeta}>Клиент</Text>
          </View>
          <Pressable
            accessibilityLabel="Закрыть кабинет"
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.vendorSettingsClose,
              pressed && styles.pressed,
            ]}
          >
            <X color={colors.surface} size={22} strokeWidth={2.1} />
          </Pressable>
        </View>

        {activeSetting ? (
          <ClientSettingDetail
            bookings={bookings}
            clientProfile={clientProfile}
            clientSettingsValues={clientSettingsValues}
            documents={documents}
            email={email}
            eventDraft={eventDraft}
            onChangeEventDraft={onChangeEventDraft}
            onSaveClientSettings={onSaveClientSettings}
            onOpenSavedVendor={onOpenSavedVendor}
            onSaveClientEvent={onSaveClientEvent}
            pushRegistrationMessage={pushRegistrationMessage}
            onDeleteAccount={onDeleteAccount}
            onCancelBooking={onCancelBooking}
            onChangeBookingDate={onChangeBookingDate}
            onApplyUser={onApplyUser}
            savedVendors={savedVendors}
            setting={activeSetting}
            userId={userId}
            onBack={() => setActiveSetting(null)}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.vendorSettingsList}>
            {bookings[0] ? (
              <View style={styles.clientBookingBanner}>
                <Text style={styles.clientBookingTitle}>Бронь создана</Text>
                <Text style={styles.clientBookingText}>
                  {bookings[0].vendorName} · {bookings[0].date} · {bookings[0].status}
                </Text>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => onSwitchRole('vendor')}
              style={({ pressed }) => [
                styles.clientSettingsRoleButton,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.vendorSettingsDot} />
              <View style={styles.vendorSettingsCopy}>
                <Text style={styles.vendorSettingsItemTitle}>
                  Перейти в режим поставщика
                </Text>
                <Text style={styles.vendorSettingsItemMeta}>
                  Профиль, медиа, даты, заявки и статистика
                </Text>
              </View>
              <ChevronRight color={colors.muted} size={18} strokeWidth={2.1} />
            </Pressable>
            {settings.map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                onPress={() => setActiveSetting(item)}
                style={({ pressed }) => [
                  styles.vendorSettingsItem,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.vendorSettingsDot} />
                <View style={styles.vendorSettingsCopy}>
                  <Text style={styles.vendorSettingsItemTitle}>{item.label}</Text>
                  <Text style={styles.vendorSettingsItemMeta}>{item.meta}</Text>
                </View>
                <ChevronRight color={colors.muted} size={18} strokeWidth={2.1} />
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={onSignOut}
              style={({ pressed }) => [
                styles.vendorSettingsLogout,
                pressed && styles.pressed,
              ]}
            >
              <LogOut color={colors.coral} size={20} strokeWidth={2.2} />
              <Text style={styles.vendorSettingsLogoutText}>Выйти</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function VendorDashboard({
  bookings,
  busyDates,
  documents,
  email,
  freeDates,
  vendorDashboardTarget,
  initialDashboardSection,
  initialProfilePreviewOpen = false,
  initialSettingLabel,
  onApplyUser,
  onChangeCalendar,
  onChangeUploadedMedia,
  onCloseSettings,
  onDeleteAccount,
  onOpenSettings,
  onSaveVendorSettings,
  onSignOut,
  onSwitchRole,
  onUpdateRequestStatus,
  pushRegistrationMessage,
  settingsOpen,
  settings,
  uploadedMedia,
  userId,
  vendorAnalytics,
  vendorDraft,
  vendorSettingsValues,
  vendors,
}: {
  bookings: ClientBooking[];
  busyDates: string[];
  documents: UserDocument[];
  email: string;
  freeDates: string[];
  vendorDashboardTarget?: { section: VendorDashboardSection | 'home'; nonce: number } | null;
  initialDashboardSection?: VendorDashboardSection | 'home';
  initialProfilePreviewOpen?: boolean;
  initialSettingLabel?: string;
  onApplyUser: (user: ApiUser) => void;
  onChangeCalendar: (calendar: VendorCalendarState) => void;
  onChangeUploadedMedia: (media: UploadedMediaItem[]) => boolean | Promise<boolean>;
  onCloseSettings: () => void;
  onDeleteAccount: () => void;
  onOpenSettings: () => void;
  onSaveVendorSettings: (
    label: string,
    values: Record<string, string>,
    nextDraft?: VendorDraft,
  ) => Promise<boolean>;
  onSignOut: () => void;
  onSwitchRole: (role: Role) => void;
  onUpdateRequestStatus: (bookingId: string, status: string) => void;
  pushRegistrationMessage: string;
  settingsOpen: boolean;
  settings: typeof vendorSettings;
  uploadedMedia: UploadedMediaItem[];
  userId: string | null;
  vendorAnalytics: VendorAnalyticsSnapshot;
  vendorDraft: VendorDraft;
  vendorSettingsValues: SettingsValueMap;
  vendors: Vendor[];
}): ReactElement {
  const [activeSetting, setActiveSetting] = useState<
    (typeof vendorSettings)[number] | null
  >(() =>
    initialSettingLabel
      ? settings.find((item) => item.label === initialSettingLabel) ?? null
      : null,
  );
  const [profilePreviewOpen, setProfilePreviewOpen] = useState(
    initialProfilePreviewOpen,
  );
  const [activeDashboardSection, setActiveDashboardSection] =
    useState<VendorDashboardSection | 'home'>(initialDashboardSection ?? 'home');
  useEffect(() => {
    if (!vendorDashboardTarget) {
      return;
    }
    setProfilePreviewOpen(false);
    setActiveSetting(null);
    onCloseSettings();
    setActiveDashboardSection(vendorDashboardTarget.section);
  }, [vendorDashboardTarget?.nonce]);
  const visibleSettings = settings;
  const bookingRequests = bookings.map((booking) => ({
    id: booking.id,
    name: booking.clientName || booking.clientEmail || 'Клиент',
    date: `${formatStoredDate(booking.date)}${
      booking.timeFrom && booking.timeTo ? ` · ${booking.timeFrom}-${booking.timeTo}` : ''
    }`,
    amount: formatMoneyText(booking.amount),
    status: getCompactBookingStatus(booking.status),
    time: booking.createdAt ? 'Новая' : 'Сейчас',
  }));
  const visibleDashboardRequests = bookingRequests;
  const newRequestsCount = bookings.filter((booking) =>
    ['Ожидает подтверждения', 'Новая'].includes(booking.status),
  ).length;
  const inWorkRequestsCount = bookings.filter((booking) =>
    ['В работе'].includes(booking.status),
  ).length;
  const doneRequestsCount = bookings.filter((booking) =>
    ['Подтверждена', 'Закрыто'].includes(booking.status),
  ).length;
  const vendorPreview =
    vendors.find((vendor) => vendor.category === vendorDraft.category) ??
    vendors[0];
  const ownVendorPreview = mergeVendorDraftIntoVendor(
    vendorPreview,
    vendorDraft,
    uploadedMedia,
    busyDates,
    freeDates,
  );
  const mediaSetting =
    settings.find((item) => item.label === 'Медиа') ?? {
      label: 'Медиа',
      meta: 'Фото, видео, посты и подписи',
    };
  const profileSetting =
    settings.find((item) => item.label === 'Профиль') ?? settings[0];
  const profileHandle =
    vendorDraft.name.trim().toLowerCase().replace(/\s+/g, '.') || 'svadba.vendor';
  const reelMedia = uploadedMedia.filter((item) => item.type === 'video');
  const visibleReels = reelMedia.slice(0, 9);
  const vendorStats = getVendorStatsSnapshot({
    analytics: vendorAnalytics,
    bookings,
    busyDates,
    uploadedMedia,
  });
  const dateSettingsValues = vendorSettingsValues.Даты ?? {};
  const autoReplyText =
    dateSettingsValues['Автоответ если дата занята'] ||
    'Эта дата уже занята. Могу предложить ближайшие свободные даты.';
  const selectDashboardSection = (section: VendorDashboardSection | 'home') => {
    setProfilePreviewOpen(false);
    setActiveSetting(null);
    onCloseSettings();
    setActiveDashboardSection(section);
  };
  const openProfilePreviewFromTab = () => {
    setActiveSetting(null);
    onCloseSettings();
    setProfilePreviewOpen(true);
  };

  return (
    <View style={styles.vendorDashboard}>
      {profilePreviewOpen ? (
        <View style={styles.vendorProfilePreviewOverlay}>
          <ScrollView contentContainerStyle={styles.vendorDetailContent}>
            <VendorDetailScreen
              vendor={ownVendorPreview}
              isSaved={false}
              isSelfPreview
              media={uploadedMedia}
              onBack={() => setProfilePreviewOpen(false)}
              onBlock={() => undefined}
              onBook={() => false}
              onReport={() => undefined}
              onToggleSaved={() => undefined}
            />
          </ScrollView>
          <Pressable
            accessibilityLabel="Закрыть публичный профиль"
            accessibilityRole="button"
            onPress={() => setProfilePreviewOpen(false)}
            style={({ pressed }) => [
              styles.vendorProfilePreviewClose,
              pressed && styles.pressed,
            ]}
          >
            <ArrowLeft color={colors.surface} size={24} strokeWidth={2.2} />
          </Pressable>
        </View>
      ) : null}
      {!profilePreviewOpen ? (
        <>
      <View style={styles.instagramProfileHeader}>
        <Pressable
          accessibilityLabel="Добавить медиа"
          accessibilityRole="button"
          onPress={() => {
            setActiveSetting(mediaSetting);
            onOpenSettings();
          }}
          style={({ pressed }) => [
            styles.instagramProfileHeaderButton,
            pressed && styles.pressed,
          ]}
        >
          <Plus color={colors.surface} size={30} strokeWidth={1.8} />
        </Pressable>
        <Pressable
          accessibilityLabel="Открыть публичный профиль"
          accessibilityRole="button"
          onPress={() => setProfilePreviewOpen(true)}
          style={({ pressed }) => [styles.instagramProfileHandleButton, pressed && styles.pressed]}
        >
          <Text style={styles.instagramProfileHandle} numberOfLines={1}>
            {profileHandle}
          </Text>
          <ChevronDown color={colors.surface} size={20} strokeWidth={2.4} />
        </Pressable>
        <View style={styles.instagramProfileHeaderActions}>
          <Pressable
            accessibilityLabel="Сообщения"
            accessibilityRole="button"
            onPress={() => setActiveDashboardSection('requests')}
            style={({ pressed }) => [
              styles.instagramProfileHeaderButton,
              pressed && styles.pressed,
            ]}
          >
            <AtSign color={colors.surface} size={28} strokeWidth={2.1} />
            {newRequestsCount ? (
              <View style={styles.instagramProfileNotificationBadge}>
                <Text style={styles.instagramProfileNotificationText}>
                  {Math.min(newRequestsCount, 9)}
                </Text>
              </View>
            ) : null}
        </Pressable>
        <Pressable
          accessibilityLabel={settingsOpen ? 'Закрыть настройки сверху' : 'Открыть настройки'}
          accessibilityRole="button"
          onPress={settingsOpen ? onCloseSettings : onOpenSettings}
          style={({ pressed }) => [
            styles.instagramProfileHeaderButton,
            pressed && styles.pressed,
          ]}
        >
          {settingsOpen ? (
            <X color={colors.surface} size={28} strokeWidth={2} />
          ) : (
            <Settings color={colors.surface} size={28} strokeWidth={1.9} />
          )}
        </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.vendorDashboardContent}>
        {activeDashboardSection === 'home' ? (
          <>
            <View style={styles.instagramProfileIdentityRow}>
              <Pressable
                accessibilityLabel="Изменить фото профиля"
                accessibilityRole="button"
                onPress={() => {
                  setActiveSetting(profileSetting);
                  onOpenSettings();
                }}
                style={({ pressed }) => [styles.instagramProfileAvatarWrap, pressed && styles.pressed]}
              >
                <Image
                  accessibilityIgnoresInvertColors
                  resizeMode="cover"
                  source={getVendorImageSource({
                    category: vendorDraft.category,
                  })}
                  style={styles.instagramProfileAvatar}
                />
                <View style={styles.instagramProfileAvatarAdd}>
                  <Plus color="#05080B" size={18} strokeWidth={2.6} />
                </View>
              </Pressable>
              <View style={styles.instagramProfileIdentityBody}>
                <View style={styles.instagramProfileNameRow}>
                  <Text style={styles.instagramProfileName} numberOfLines={1}>
                    {vendorDraft.name}
                  </Text>
                  <BadgeCheck color="#A8A8A8" size={19} strokeWidth={2.1} />
                </View>
                <View style={styles.instagramProfileStatsRow}>
                  <InstagramProfileStat value={String(vendorStats.mediaCount)} label="медиа" />
                  <InstagramProfileStat value={String(vendorStats.reelCount)} label="reels" />
                  <InstagramProfileStat value={String(vendorStats.requests)} label="заявок" />
                </View>
              </View>
            </View>

            <View style={styles.instagramProfileBioBlock}>
              <Text style={styles.instagramProfileBio}>
                {vendorDraft.category} · {vendorDraft.city}{' '}
                <Text style={styles.instagramProfileBioLink}>@svadba.kz</Text>
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setActiveDashboardSection('stats')}
              style={({ pressed }) => [styles.instagramProfileDashboardCard, pressed && styles.pressed]}
            >
              <Text style={styles.instagramProfileDashboardTitle}>Ваша панель</Text>
              <Text style={styles.instagramProfileDashboardText}>
                <Text style={styles.instagramProfileDashboardGrowth}>↗ </Text>
                {formatCompactNumber(vendorStats.profileViews)} просмотров за последние 30 дней.
              </Text>
            </Pressable>

            <View style={styles.instagramProfileActionRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setActiveSetting(profileSetting);
                  onOpenSettings();
                }}
                style={({ pressed }) => [styles.instagramProfileAction, pressed && styles.pressed]}
              >
                <Text style={styles.instagramProfileActionText}>Редактировать</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setProfilePreviewOpen(true)}
                style={({ pressed }) => [styles.instagramProfileAction, pressed && styles.pressed]}
              >
                <Text style={styles.instagramProfileActionText}>Поделиться</Text>
              </Pressable>
            </View>

            <View style={styles.instagramProfileTabs}>
              <Pressable
                accessibilityLabel="Медиа профиля"
                accessibilityRole="button"
                style={styles.instagramProfileTabActive}
              >
                <Grid2X2 color={colors.surface} size={25} strokeWidth={2.4} />
              </Pressable>
              <Pressable
                accessibilityLabel="Открыть настройку медиа"
                accessibilityRole="button"
                onPress={() => {
                  setActiveSetting(mediaSetting);
                  onOpenSettings();
                }}
                style={({ pressed }) => [styles.instagramProfileTab, pressed && styles.pressed]}
              >
                <Clapperboard color="#A8A8A8" size={25} strokeWidth={2.1} />
              </Pressable>
              <Pressable
                accessibilityLabel="Открыть заявки"
                accessibilityRole="button"
                onPress={() => setActiveDashboardSection('requests')}
                style={({ pressed }) => [styles.instagramProfileTab, pressed && styles.pressed]}
              >
                <Repeat2 color="#A8A8A8" size={26} strokeWidth={2.1} />
              </Pressable>
              <Pressable
                accessibilityLabel="Открыть публичный профиль"
                accessibilityRole="button"
                onPress={() => setProfilePreviewOpen(true)}
                style={({ pressed }) => [styles.instagramProfileTab, pressed && styles.pressed]}
              >
                <UserRound color="#A8A8A8" size={25} strokeWidth={2.1} />
              </Pressable>
            </View>

            <View style={styles.instagramProfileMediaGrid}>
              {uploadedMedia.length ? (
                uploadedMedia.slice(0, 9).map((item, index) => {
                  const isVideo = item.type === 'video';
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityLabel={`Открыть медиа ${index + 1}`}
                      accessibilityRole="button"
                      onPress={() => {
                        setActiveSetting(mediaSetting);
                        onOpenSettings();
                      }}
                      style={({ pressed }) => [styles.instagramProfileMediaTile, pressed && styles.pressed]}
                    >
                      <Image
                        accessibilityIgnoresInvertColors
                        resizeMode="cover"
                        source={getUploadedMediaImageSource(item, vendorDraft.category)}
                        style={styles.instagramProfileMediaImage}
                      />
                      {isVideo ? (
                        <View style={styles.instagramProfileReelMark}>
                          <Play color="#FFFFFF" fill="#FFFFFF" size={14} strokeWidth={2} />
                        </View>
                      ) : null}
                      <View style={styles.instagramProfileViewCount}>
                        <Text style={styles.instagramProfileViewCountText}>
                          {item.status === 'uploaded' ? 'Опубликовано' : 'Черновик'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setActiveSetting(mediaSetting);
                    onOpenSettings();
                  }}
                  style={({ pressed }) => [
                    styles.requestsTemplateCard,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.requestsTemplateTitle}>Медиа пока нет</Text>
                  <Text style={styles.requestsTemplateText}>
                    Загрузите фото и видео, они появятся здесь и в публичном профиле.
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        ) : activeDashboardSection === 'reels' ? (
          <>
            <View style={styles.vendorDashboardCard}>
              <View style={styles.vendorDashboardCardHeader}>
                <Text style={styles.vendorDashboardCardTitle}>Reels</Text>
                <Text style={styles.vendorDashboardLink}>
                  {reelMedia.length ? `${reelMedia.length} видео` : 'нет видео'}
                </Text>
              </View>
              <View style={styles.vendorRequestStatsRow}>
                <VendorMiniStat
                  color="#C4935F"
                  label="в профиле"
                  value={String(reelMedia.length)}
                />
                <VendorMiniStat
                  color="#8B6A50"
                  label="просмотры"
                  value={formatCompactNumber(vendorStats.mediaViews)}
                />
                <VendorMiniStat color={colors.green} label="заявки" value={String(newRequestsCount)} />
              </View>
            </View>
            <View style={styles.instagramProfileMediaGrid}>
              {visibleReels.length ? visibleReels.map((item, index) => {
                return (
                  <Pressable
                    key={item.id}
                    accessibilityLabel={`Открыть Reels ${index + 1}`}
                    accessibilityRole="button"
                    onPress={() => {
                      setActiveSetting(mediaSetting);
                      onOpenSettings();
                    }}
                    style={({ pressed }) => [styles.instagramProfileMediaTile, pressed && styles.pressed]}
                  >
                    <Image
                      accessibilityIgnoresInvertColors
                      resizeMode="cover"
                      source={getUploadedMediaImageSource(item, vendorDraft.category)}
                      style={styles.instagramProfileMediaImage}
                    />
                    <View style={styles.instagramProfileReelMark}>
                      <Play color="#FFFFFF" fill="#FFFFFF" size={14} strokeWidth={2} />
                    </View>
                    <View style={styles.instagramProfileViewCount}>
                      <Text style={styles.instagramProfileViewCountText}>
                        {item.status === 'uploaded' ? 'Опубликовано' : 'Черновик'}
                      </Text>
                    </View>
                  </Pressable>
                );
              }) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setActiveSetting(mediaSetting);
                    onOpenSettings();
                  }}
                  style={({ pressed }) => [
                    styles.requestsTemplateCard,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.requestsTemplateTitle}>Reels пока нет</Text>
                  <Text style={styles.requestsTemplateText}>
                    Добавьте видео вручную или импортируйте из Instagram.
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        ) : activeDashboardSection === 'requests' ? (
          <>
            <View style={styles.vendorDashboardCard}>
              <View style={styles.vendorDashboardCardHeader}>
                <Text style={styles.vendorDashboardCardTitle}>Заявки</Text>
                <Text style={styles.vendorDashboardLink}>Смотреть все</Text>
              </View>
              <View style={styles.vendorRequestStatsRow}>
                <VendorMiniStat color="#C4935F" label="новые" value={String(newRequestsCount)} />
                <VendorMiniStat color="#8B6A50" label="в работе" value={String(inWorkRequestsCount)} />
                <VendorMiniStat color={colors.green} label="закрыто" value={String(doneRequestsCount)} />
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setActiveSetting(settings.find((item) => item.label === 'Даты') ?? null);
                onOpenSettings();
              }}
              style={({ pressed }) => [
                styles.vendorAutoReplyCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.vendorAutoReplyCopy}>
                <Text style={styles.vendorDashboardCardTitle}>Автоответ клиенту</Text>
                <Text style={styles.vendorDashboardCardText}>
                  {autoReplyText}
                </Text>
              </View>
              <View style={styles.vendorAutoReplyToggle}>
                <View style={styles.vendorAutoReplyKnob} />
              </View>
              <ChevronRight color={colors.muted} size={18} strokeWidth={2.1} />
            </Pressable>

            {visibleDashboardRequests.length ? (
              visibleDashboardRequests.map((request) => (
                <VendorDashboardRequestCard
                  key={request.id}
                  request={request}
                  onUpdateStatus={onUpdateRequestStatus}
                />
              ))
            ) : (
              <View style={styles.requestsTemplateCard}>
                <Text style={styles.requestsTemplateTitle}>Заявок пока нет</Text>
                <Text style={styles.requestsTemplateText}>
                  Новые брони клиентов появятся здесь после выбора даты.
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.vendorDashboardInlinePanel}>
          {activeDashboardSection === 'calendar' ? (
            <DatesSettingsEditor
              busyDates={busyDates}
              freeDates={freeDates}
              autoReply={autoReplyText}
              onChangeCalendar={onChangeCalendar}
              onSaveAutoReply={async (text) => {
                await onSaveVendorSettings('Даты', {
                  ...dateSettingsValues,
                  'Автоответ если дата занята': text,
                });
              }}
            />
          ) : (
            <StatsSettingsEditor
              stats={vendorStats}
              uploadedMedia={uploadedMedia}
              vendorDraft={vendorDraft}
            />
          )}
          </View>
        )}
      </ScrollView>
        </>
      ) : null}

      <View style={styles.vendorBottomBar}>
        <VendorBottomNavItem
          active={activeDashboardSection === 'home'}
          icon={House}
          label="Главная"
          onPress={() => selectDashboardSection('home')}
        />
        <VendorBottomNavItem
          active={activeDashboardSection === 'reels'}
          icon={Clapperboard}
          label="Reels"
          onPress={() => selectDashboardSection('reels')}
        />
        <VendorBottomNavItem
          active={activeDashboardSection === 'requests'}
          badge={newRequestsCount ? String(newRequestsCount) : undefined}
          icon={Send}
          label="Заявки"
          onPress={() => selectDashboardSection('requests')}
        />
        <VendorBottomNavItem
          active={activeDashboardSection === 'calendar'}
          icon={Search}
          label="Календарь"
          onPress={() => selectDashboardSection('calendar')}
        />
        <VendorBottomNavItem
          active={profilePreviewOpen}
          icon={UserRound}
          label="Профиль"
          onPress={openProfilePreviewFromTab}
        />
      </View>

      {settingsOpen ? (
        <View style={styles.vendorSettingsOverlay}>
          <Pressable
            accessible={false}
            onPress={onCloseSettings}
            style={styles.vendorSettingsBackdrop}
          />
          <View style={styles.vendorSettingsPanel}>
            <View style={styles.vendorSettingsHeader}>
              <View>
                <Text style={styles.vendorSettingsTitle}>Настройки</Text>
                <Text style={styles.vendorSettingsMeta}>Поставщик</Text>
              </View>
              <Pressable
                accessibilityLabel="Закрыть настройки"
                accessibilityRole="button"
                onPress={onCloseSettings}
                style={({ pressed }) => [
                  styles.vendorSettingsClose,
                  pressed && styles.pressed,
                ]}
              >
                <X color={colors.surface} size={22} strokeWidth={2.1} />
              </Pressable>
            </View>

            {activeSetting ? (
              <VendorSettingForm
                bookings={bookings}
                busyDates={busyDates}
                documents={documents}
                freeDates={freeDates}
                onApplyUser={onApplyUser}
                onChangeCalendar={onChangeCalendar}
                onChangeUploadedMedia={onChangeUploadedMedia}
                onSaveVendorSettings={onSaveVendorSettings}
                onUpdateRequestStatus={onUpdateRequestStatus}
                onDeleteAccount={onDeleteAccount}
                pushRegistrationMessage={pushRegistrationMessage}
                setting={activeSetting}
                stats={vendorStats}
                email={email}
                uploadedMedia={uploadedMedia}
                userId={userId}
                vendorDraft={vendorDraft}
                vendorSettingsValues={vendorSettingsValues}
                onBack={() => setActiveSetting(null)}
              />
            ) : (
              <ScrollView contentContainerStyle={styles.vendorSettingsList}>
                {visibleSettings.map((item) => (
                  <Pressable
                    key={item.label}
                    accessibilityRole="button"
                    onPress={() => setActiveSetting(item)}
                    style={({ pressed }) => [
                      styles.vendorSettingsItem,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.vendorSettingsDot} />
                    <View style={styles.vendorSettingsCopy}>
                      <Text style={styles.vendorSettingsItemTitle}>{item.label}</Text>
                      <Text style={styles.vendorSettingsItemMeta}>{item.meta}</Text>
                    </View>
                    <ChevronRight color={colors.muted} size={18} strokeWidth={2.1} />
                  </Pressable>
                ))}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onSwitchRole('client')}
                  style={({ pressed }) => [
                    styles.vendorSettingsItem,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.vendorSettingsDot} />
                  <View style={styles.vendorSettingsCopy}>
                    <Text style={styles.vendorSettingsItemTitle}>Перейти в режим клиента</Text>
                    <Text style={styles.vendorSettingsItemMeta}>Поиск и бронирование поставщиков</Text>
                  </View>
                  <ChevronRight color={colors.muted} size={18} strokeWidth={2.1} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={onSignOut}
                  style={({ pressed }) => [
                    styles.vendorSettingsLogout,
                    pressed && styles.pressed,
                  ]}
                >
                  <LogOut color={colors.coral} size={20} strokeWidth={2.2} />
                  <Text style={styles.vendorSettingsLogoutText}>Выйти</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function VendorMiniStat({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.vendorMiniStatCard}>
      <Text style={styles.vendorMiniStatValue}>{value}</Text>
      <Text style={styles.vendorMiniStatLabel}>{label}</Text>
      <View style={styles.vendorMiniStatTrack}>
        <View style={[styles.vendorMiniStatFill, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

function InstagramProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.instagramProfileStat}>
      <Text style={styles.instagramProfileStatValue}>{value}</Text>
      <Text style={styles.instagramProfileStatLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function VendorDashboardRequestCard({
  onUpdateStatus,
  request,
}: {
  onUpdateStatus: (bookingId: string, status: string) => void;
  request: {
    amount: string;
    date: string;
    id: string;
    name: string;
    status: string;
    time: string;
  };
}) {
  const initial = request.name.trim().charAt(0).toUpperCase() || 'З';
  return (
    <View style={styles.vendorRequestCard}>
      <View style={styles.vendorRequestHeader}>
        <View style={styles.vendorRequestAvatar}>
          <Text style={styles.vendorRequestAvatarText}>{initial}</Text>
        </View>
        <View style={styles.vendorRequestBody}>
          <View style={styles.vendorRequestTopRow}>
            <Text style={styles.vendorRequestName} numberOfLines={2}>
              {request.name}
            </Text>
            <Text style={styles.vendorRequestTime}>{request.time}</Text>
          </View>
          <View
            style={[
              styles.vendorRequestStatus,
              request.status === 'В работе' && styles.vendorRequestStatusBlue,
              request.status === 'Ожидает' && styles.vendorRequestStatusMuted,
            ]}
          >
            <Text numberOfLines={1} style={styles.vendorRequestStatusText}>
              {request.status}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.vendorRequestMeta} numberOfLines={2}>
        {request.date} · {request.amount}
      </Text>
      <Text style={styles.vendorRequestMessage} numberOfLines={3}>
        Клиент хочет закрепить дату после договоренности.
      </Text>
      <View style={styles.vendorRequestFooter}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onUpdateStatus(request.id, 'В работе')}
          style={styles.vendorRequestPrimaryAction}
        >
          <Text style={styles.vendorRequestPrimaryActionText}>Ответить</Text>
        </Pressable>
        <View style={styles.vendorRequestSecondaryActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onUpdateStatus(request.id, 'Подтверждена')}
            style={styles.vendorRequestGhostAction}
          >
            <Text style={styles.vendorRequestGhostActionText}>Подтвердить</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onUpdateStatus(request.id, 'Отказано')}
            style={styles.vendorRequestGhostAction}
          >
            <Text style={styles.vendorRequestGhostActionText}>Отказать</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function VendorBottomNavItem({
  active = false,
  badge,
  icon: Icon,
  label,
  onPress,
}: {
  active?: boolean;
  badge?: string;
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.vendorBottomNavItem,
        pressed && styles.pressed,
      ]}
    >
      <View>
        <Icon
          color={active ? '#F5F5F5' : '#A8A8A8'}
          fill={active ? '#F5F5F5' : 'transparent'}
          size={24}
          strokeWidth={1.9}
        />
        {badge ? (
          <View style={styles.vendorBottomBadge}>
            <Text style={styles.vendorBottomBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[
          styles.vendorBottomNavText,
          active && styles.vendorBottomNavTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ClientSettingDetail({
  bookings,
  clientProfile,
  clientSettingsValues,
  documents,
  email,
  eventDraft,
  onChangeEventDraft,
  onDeleteAccount,
  onCancelBooking,
  onChangeBookingDate,
  onApplyUser,
  onOpenSavedVendor,
  onSaveClientEvent,
  onSaveClientSettings,
  pushRegistrationMessage,
  onBack,
  savedVendors,
  setting,
  userId,
}: {
  bookings: ClientBooking[];
  clientProfile: ClientProfileDraft;
  clientSettingsValues: SettingsValueMap;
  documents: UserDocument[];
  email: string;
  eventDraft: EventDraft;
  onChangeEventDraft: (draft: EventDraft) => void;
  onDeleteAccount: () => void;
  onCancelBooking: (booking: ClientBooking) => void;
  onChangeBookingDate: (booking: ClientBooking) => void;
  onApplyUser: (user: ApiUser) => void;
  onOpenSavedVendor: (vendor: Vendor) => void;
  onSaveClientEvent: (draft: EventDraft, eventId?: string) => Promise<boolean>;
  onSaveClientSettings: (
    label: string,
    values: Record<string, string>,
    nextProfile?: ClientProfileDraft,
  ) => Promise<boolean>;
  pushRegistrationMessage: string;
  onBack: () => void;
  savedVendors: Vendor[];
  setting: (typeof clientSettings)[number];
  userId: string | null;
}): ReactElement {
  const fields = getClientSettingFields(setting.label);
  const [values, setValues] = useState(() =>
    getClientSettingDefaults({
      bookings,
      clientProfile,
      email,
      eventDraft,
      label: setting.label,
      savedValues: clientSettingsValues[setting.label],
    }),
  );
  const [saveStatus, setSaveStatus] = useState('');
  const savesInsideEditor = ['Бронирования', 'Избранное', 'Календарь', 'Документы'].includes(
    setting.label,
  );

  useEffect(() => {
    setValues(
      getClientSettingDefaults({
        bookings,
        clientProfile,
        email,
        eventDraft,
        label: setting.label,
        savedValues: clientSettingsValues[setting.label],
      }),
    );
    setSaveStatus('');
  }, [bookings, clientProfile, clientSettingsValues, email, eventDraft, setting.label]);

  const updateEventField = (field: string, value: string) => {
    const fieldMap: Record<string, keyof EventDraft> = {
      'Тип мероприятия': 'type',
      'Дата мероприятия': 'date',
      Город: 'city',
      'Количество гостей': 'guests',
      Бюджет: 'budget',
      Площадка: 'place',
      Комментарий: 'comment',
    };
    const key = fieldMap[field];
    if (!key) return;
    onChangeEventDraft({ ...eventDraft, [key]: value });
  };
  const updateValue = (field: string, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (setting.label === 'Мероприятие') {
      updateEventField(field, value);
    }
  };
  const saveValues = async () => {
    setSaveStatus('Сохраняем...');
    const nextProfile = getClientProfileFromSettings(
      setting.label,
      values,
      clientProfile,
    );
    const saved =
      setting.label === 'Мероприятие'
        ? await onSaveClientEvent({
            type: values['Тип мероприятия'] || eventDraft.type,
            date: values['Дата мероприятия'] || eventDraft.date,
            city: values.Город || eventDraft.city,
            guests: values['Количество гостей'] || eventDraft.guests,
            budget: values.Бюджет || eventDraft.budget,
            place: values.Площадка || eventDraft.place,
            comment: values.Комментарий || eventDraft.comment,
          })
        : await onSaveClientSettings(setting.label, values, nextProfile);
    setSaveStatus(saved ? 'Сохранено' : 'Не удалось сохранить. Проверьте сеть.');
  };

  return (
    <ScrollView contentContainerStyle={styles.vendorSettingForm}>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [
          styles.vendorSettingBack,
          pressed && styles.pressed,
        ]}
      >
        <ArrowLeft color={colors.surface} size={20} strokeWidth={2.1} />
        <Text style={styles.vendorSettingBackText}>Назад</Text>
      </Pressable>
      <View style={styles.vendorSettingFormHero}>
        <Text style={styles.vendorSettingFormTitle}>{setting.label}</Text>
        <Text style={styles.vendorSettingFormMeta}>{setting.meta}</Text>
      </View>

      {setting.label === 'Бронирования' ? (
        <View style={styles.requestsSettingsWrap}>
          {bookings.length ? (
            bookings.map((booking) => (
              <View key={booking.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.requestHeaderCopy}>
                    <Text style={styles.requestName}>{booking.vendorName}</Text>
                    <Text style={styles.requestMeta}>
                      {formatStoredDate(booking.date)} · {formatMoneyText(booking.amount)}
                    </Text>
                  </View>
                  <View style={styles.requestStatusBadge}>
                    <Text numberOfLines={1} style={styles.requestStatusText}>
                      {getCompactBookingStatus(booking.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.requestMessage}>
                  Дата забронирована после договоренности. Поставщик должен подтвердить.
                </Text>
                <View style={styles.requestActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => onChangeBookingDate(booking)}
                    style={styles.requestActionPrimary}
                  >
                    <Text style={styles.requestActionPrimaryText}>Изменить дату</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => onCancelBooking(booking)}
                    style={styles.requestActionGhost}
                  >
                    <Text style={styles.requestActionGhostText}>Отменить</Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.requestsTemplateCard}>
              <Text style={styles.requestsTemplateTitle}>Брони пока нет</Text>
              <Text style={styles.requestsTemplateText}>
                Откройте подрядчика, договоритесь и нажмите “Забронировать дату”.
              </Text>
            </View>
          )}
        </View>
      ) : setting.label === 'Избранное' ? (
        <View style={styles.requestsSettingsWrap}>
          {savedVendors.length ? (
            <View style={styles.clientSavedGrid}>
              {savedVendors.map((vendor) => (
                <Pressable
                  key={vendor.id}
                  accessibilityRole="button"
                  onPress={() => onOpenSavedVendor(vendor)}
                  style={({ pressed }) => [
                    styles.clientSavedTile,
                    pressed && styles.pressed,
                  ]}
                >
                  <Image
                    accessibilityIgnoresInvertColors
                    resizeMode="cover"
                    source={getVendorImageSource(vendor)}
                    style={styles.clientSavedTileImage}
                  />
                  <View style={styles.clientSavedTileShade} />
                  <View style={styles.clientSavedTileRating}>
                    <Text style={styles.clientSavedTileRatingText}>
                      {vendor.rating}
                    </Text>
                  </View>
                  <View style={styles.clientSavedTileMeta}>
                    <Text numberOfLines={1} style={styles.clientSavedTileName}>
                      {vendor.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.clientSavedTileCategory}>
                      {vendor.category} · от {formatMoney(vendor.priceFrom)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.requestsTemplateCard}>
              <Text style={styles.requestsTemplateTitle}>Избранное пустое</Text>
              <Text style={styles.requestsTemplateText}>
                Сохраняйте подрядчиков в рилсах или профиле.
              </Text>
            </View>
          )}
        </View>
      ) : setting.label === 'Календарь' ? (
        <View style={styles.datesSettingsWrap}>
          <View style={styles.calendarSummaryCard}>
            <Text style={styles.requestsSummaryTitle}>Дата мероприятия</Text>
            <Text style={styles.calendarBigDate}>
              {eventDraft.date || 'Не выбрана'}
            </Text>
            <Text style={styles.requestsSummaryText}>
              {bookings.filter((booking) => isConfirmedBookingStatus(booking.status)).length
                ? `Подтверждено подрядчиков: ${bookings.filter((booking) => isConfirmedBookingStatus(booking.status)).length}.`
                : 'Тут будут брони, дедлайны предоплаты и встречи.'}
            </Text>
          </View>
          {bookings.map((booking) => (
            <View key={booking.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.requestHeaderCopy}>
                  <Text style={styles.requestName}>{booking.vendorName}</Text>
                  <Text style={styles.requestMeta}>{formatStoredDate(booking.date)}</Text>
                </View>
                <View style={styles.requestStatusBadge}>
                  <Text numberOfLines={1} style={styles.requestStatusText}>
                    {getCompactBookingStatus(booking.status)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <>
          {setting.label === 'Документы' ? (
            <DocumentSettingsEditor
              documents={documents}
              onApplyUser={onApplyUser}
              userId={userId}
            />
          ) : null}
          {setting.label === 'Уведомления' ? (
            <View style={styles.requestsTemplateCard}>
              <Text style={styles.requestsTemplateTitle}>Push-статус</Text>
              <Text style={styles.requestsTemplateText}>
                {pushRegistrationMessage || 'Устройство подключится после входа в приложение.'}
              </Text>
            </View>
          ) : null}
          {fields.map((field) => (
            <SettingsFieldControl
              key={field}
              label={field}
              onChange={(value) => updateValue(field, value)}
              settingLabel={setting.label}
              value={
                setting.label === 'Мероприятие'
                  ? getEventSettingValue(eventDraft, field)
                  : field === 'Почта'
                    ? email
                    : values[field] ?? ''
              }
            />
          ))}
          {setting.label === 'Настройки' ? (
            <AccountSettingsActions email={email} />
          ) : null}
          {savesInsideEditor ? null : (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={saveValues}
                style={({ pressed }) => [
                  styles.vendorSettingSaveButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.vendorSettingSaveText}>Сохранить</Text>
              </Pressable>
              {saveStatus ? (
                <Text style={styles.mediaUploadStatus}>{saveStatus}</Text>
              ) : null}
              {setting.label === 'Настройки' ? (
                <DeleteAccountButton onPress={onDeleteAccount} />
              ) : null}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function getClientSettingFields(label: string) {
  const map: Record<string, string[]> = {
    Мероприятие: [
      'Тип мероприятия',
      'Дата мероприятия',
      'Город',
      'Количество гостей',
      'Бюджет',
      'Площадка',
      'Комментарий',
    ],
    Избранное: ['Сохраненные подрядчики', 'Сравнение', 'Комментарий'],
    Бюджет: ['Общий бюджет', 'Забронировано', 'Осталось', 'Категории расходов'],
    Документы: [],
    Уведомления: ['Ответ подрядчика', 'Подтверждение брони', 'Напоминание об оплате'],
    Профиль: ['Имя', 'Телефон', 'Почта', 'Город'],
    Настройки: ['Язык', 'Почта'],
  };
  return map[label] ?? ['Поле 1', 'Поле 2'];
}

function getEventSettingValue(eventDraft: EventDraft, field: string) {
  const values: Record<string, string> = {
    'Тип мероприятия': eventDraft.type,
    'Дата мероприятия': eventDraft.date,
    Город: eventDraft.city,
    'Количество гостей': eventDraft.guests,
    Бюджет: eventDraft.budget,
    Площадка: eventDraft.place,
    Комментарий: eventDraft.comment,
  };
  return values[field] ?? '';
}

function getClientSettingDefaults({
  bookings,
  clientProfile,
  email,
  eventDraft,
  label,
  savedValues,
}: {
  bookings: ClientBooking[];
  clientProfile: ClientProfileDraft;
  email: string;
  eventDraft: EventDraft;
  label: string;
  savedValues?: Record<string, string>;
}) {
  const confirmedBookings = bookings.filter((booking) =>
    isConfirmedBookingStatus(booking.status));
  const bookedAmount = confirmedBookings.reduce(
    (sum, booking) => sum + parseMoneyValue(booking.amount),
    0,
  );
  const budgetAmount = parseMoneyValue(eventDraft.budget);
  const remainingAmount =
    budgetAmount > 0 ? Math.max(0, budgetAmount - bookedAmount) : 0;
  const defaults: Record<string, Record<string, string>> = {
    Мероприятие: {
      'Тип мероприятия': eventDraft.type,
      'Дата мероприятия': eventDraft.date,
      Город: eventDraft.city,
      'Количество гостей': eventDraft.guests,
      Бюджет: eventDraft.budget,
      Площадка: eventDraft.place,
      Комментарий: eventDraft.comment,
    },
    Бюджет: {
      'Общий бюджет': eventDraft.budget,
      Забронировано: formatMoneyValue(bookedAmount),
      Осталось: budgetAmount ? formatMoneyValue(remainingAmount) : '',
      'Категории расходов': confirmedBookings.map((booking) => booking.vendorName).join(', '),
    },
    Документы: {},
    Уведомления: {
      'Ответ подрядчика': clientProfile.notifications,
      'Подтверждение брони': clientProfile.notifications,
      'Напоминание об оплате': clientProfile.notifications,
    },
    Профиль: {
      Имя: clientProfile.name,
      Телефон: clientProfile.phone,
      Почта: email,
      Город: clientProfile.city,
    },
    Настройки: {
      Язык: clientProfile.language,
      Почта: email,
    },
  };
  const merged = {
    ...(defaults[label] ?? {}),
    ...(savedValues ?? {}),
  };
  if (label === 'Бюджет') {
    merged.Забронировано = defaults.Бюджет.Забронировано;
    merged.Осталось = defaults.Бюджет.Осталось;
    merged['Категории расходов'] = defaults.Бюджет['Категории расходов'];
  }
  return merged;
}

function VendorSettingForm({
  bookings,
  busyDates,
  documents,
  email,
  freeDates,
  onApplyUser,
  onChangeCalendar,
  onChangeUploadedMedia,
  onBack,
  onDeleteAccount,
  onSaveVendorSettings,
  onUpdateRequestStatus,
  pushRegistrationMessage,
  setting,
  stats,
  uploadedMedia,
  userId,
  vendorDraft,
  vendorSettingsValues,
}: {
  bookings: ClientBooking[];
  busyDates: string[];
  documents: UserDocument[];
  email: string;
  freeDates: string[];
  onApplyUser: (user: ApiUser) => void;
  onChangeCalendar: (calendar: VendorCalendarState) => void;
  onChangeUploadedMedia: (media: UploadedMediaItem[]) => boolean | Promise<boolean>;
  onBack: () => void;
  onDeleteAccount: () => void;
  onSaveVendorSettings: (
    label: string,
    values: Record<string, string>,
    nextDraft?: VendorDraft,
  ) => Promise<boolean>;
  onUpdateRequestStatus: (bookingId: string, status: string) => void;
  pushRegistrationMessage: string;
  setting: (typeof vendorSettings)[number];
  stats: VendorStatsSnapshot;
  uploadedMedia: UploadedMediaItem[];
  userId: string | null;
  vendorDraft: VendorDraft;
  vendorSettingsValues: SettingsValueMap;
}): ReactElement {
  const [values, setValues] = useState(() =>
    getSettingFormDefaults(
      setting.label,
      vendorDraft,
      vendorSettingsValues[setting.label],
    ),
  );
  const [saveStatus, setSaveStatus] = useState('');
  const fields = getSettingFields(setting.label);
  const savesInsideEditor = ['Медиа', 'Instagram', 'Даты', 'Статистика'].includes(
    setting.label,
  );
  const dateSettingsValues = vendorSettingsValues.Даты ?? {};
  const autoReplyText =
    dateSettingsValues['Автоответ если дата занята'] ||
    'Эта дата уже занята. Могу предложить ближайшие свободные даты.';

  useEffect(() => {
    setValues(
      getSettingFormDefaults(
        setting.label,
        vendorDraft,
        vendorSettingsValues[setting.label],
      ),
    );
    setSaveStatus('');
  }, [setting.label, vendorDraft, vendorSettingsValues]);

  const updateValue = (label: string, value: string) => {
    setValues((current) => ({ ...current, [label]: value }));
  };
  const saveValues = async () => {
    setSaveStatus('Сохраняем...');
    const nextDraft = getVendorDraftFromSettings(setting.label, values, vendorDraft);
    const saved = await onSaveVendorSettings(setting.label, values, nextDraft);
    setSaveStatus(saved ? 'Сохранено и синхронизировано' : 'Не удалось сохранить. Проверьте сеть.');
  };

  return (
    <ScrollView contentContainerStyle={styles.vendorSettingForm}>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [
          styles.vendorSettingBack,
          pressed && styles.pressed,
        ]}
      >
        <ArrowLeft color={colors.surface} size={20} strokeWidth={2.1} />
        <Text style={styles.vendorSettingBackText}>Назад</Text>
      </Pressable>
      <View style={styles.vendorSettingFormHero}>
        <Text style={styles.vendorSettingFormTitle}>{setting.label}</Text>
        <Text style={styles.vendorSettingFormMeta}>{setting.meta}</Text>
      </View>

      {setting.label === 'Медиа' ? (
        <MediaSettingsEditor
          media={uploadedMedia}
          onApplyUser={onApplyUser}
          onChangeMedia={onChangeUploadedMedia}
          userId={userId}
        />
      ) : setting.label === 'Instagram' ? (
        <InstagramSettingsEditor
          onApplyUser={onApplyUser}
          uploadedMedia={uploadedMedia}
          userId={userId}
        />
      ) : setting.label === 'Заявки' ? (
        <RequestsSettingsEditor
          bookings={bookings}
          onUpdateStatus={onUpdateRequestStatus}
        />
      ) : setting.label === 'Даты' ? (
        <DatesSettingsEditor
          busyDates={busyDates}
          freeDates={freeDates}
          autoReply={autoReplyText}
          onChangeCalendar={onChangeCalendar}
          onSaveAutoReply={async (text) => {
            await onSaveVendorSettings('Даты', {
              ...dateSettingsValues,
              'Автоответ если дата занята': text,
            });
          }}
        />
      ) : setting.label === 'Статистика' ? (
        <StatsSettingsEditor
          stats={stats}
          uploadedMedia={uploadedMedia}
          vendorDraft={vendorDraft}
        />
      ) : (
        <>
          {setting.label === 'Документы' ? (
            <DocumentSettingsEditor
              documents={documents}
              onApplyUser={onApplyUser}
              userId={userId}
            />
          ) : null}
          {setting.label === 'Уведомления' ? (
            <View style={styles.requestsTemplateCard}>
              <Text style={styles.requestsTemplateTitle}>Push-статус</Text>
              <Text style={styles.requestsTemplateText}>
                {pushRegistrationMessage || 'Устройство подключится после входа в приложение.'}
              </Text>
            </View>
          ) : null}
          {setting.label === 'Профиль' ? (
            <VendorProfilePhotoPicker
              media={uploadedMedia}
              onApplyUser={onApplyUser}
              userId={userId}
              vendorDraft={vendorDraft}
            />
          ) : null}
          {fields.map((field) => (
            <SettingsFieldControl
              key={field}
              label={field}
              onChange={(value) => updateValue(field, value)}
              settingLabel={setting.label}
              value={field === 'Почта' ? email : values[field] ?? ''}
            />
          ))}
          {setting.label === 'Настройки' ? (
            <AccountSettingsActions email={email} />
          ) : null}
        </>
      )}

      {savesInsideEditor ? null : (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={saveValues}
            style={({ pressed }) => [
              styles.vendorSettingSaveButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.vendorSettingSaveText}>Сохранить</Text>
          </Pressable>
          {saveStatus ? (
            <Text style={styles.mediaUploadStatus}>{saveStatus}</Text>
          ) : null}
          {setting.label === 'Настройки' ? (
            <DeleteAccountButton onPress={onDeleteAccount} />
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function DocumentSettingsEditor({
  documents,
  onApplyUser,
  userId,
}: {
  documents: UserDocument[];
  onApplyUser: (user: ApiUser) => void;
  userId: string | null;
}) {
  const [status, setStatus] = useState('');
  const pickDocument = async () => {
    if (!userId) {
      setStatus('Сначала войдите в аккаунт');
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/webp',
      ],
    });
    if (result.canceled || !result.assets[0]) return;
    setStatus('Загружаем документ...');
    try {
      const user = await uploadUserDocumentRemote(userId, result.assets[0]);
      onApplyUser(user);
      setStatus('Документ загружен');
    } catch (error) {
      setStatus(getReadableUploadError(error));
    }
  };
  const removeDocument = async (documentId: string) => {
    if (!userId) return;
    setStatus('Удаляем документ...');
    try {
      const user = await deleteUserDocumentRemote(userId, documentId);
      onApplyUser(user);
      setStatus('Документ удалён');
    } catch (error) {
      setStatus('Не удалось удалить документ. Повторите ещё раз.');
    }
  };
  return (
    <View style={styles.requestsSettingsWrap}>
      <View style={styles.requestsTemplateCard}>
        <Text style={styles.requestsTemplateTitle}>Файлы для проверки</Text>
        <Text style={styles.requestsTemplateText}>
          PDF, DOC, DOCX или изображение. Максимум 15 МБ. Файлы доступны только владельцу и серверу.
        </Text>
      </View>
      {documents.map((document) => (
        <View key={document.id} style={styles.requestCard}>
          <View style={styles.requestHeader}>
            <View style={styles.requestHeaderCopy}>
              <Text numberOfLines={1} style={styles.requestName}>{document.fileName}</Text>
              <Text style={styles.requestMeta}>
                {Math.max(1, Math.round(document.size / 1024))} КБ
              </Text>
            </View>
            <Pressable
              accessibilityLabel={`Удалить ${document.fileName}`}
              accessibilityRole="button"
              onPress={() => void removeDocument(document.id)}
              style={styles.requestActionGhost}
            >
              <X color={colors.coral} size={18} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => void pickDocument()}
        style={styles.mediaPublishButton}
      >
        <Upload color={colors.surface} size={20} strokeWidth={2.2} />
        <Text style={styles.mediaActionText}>Загрузить документ</Text>
      </Pressable>
      {status ? <Text accessibilityLiveRegion="polite" style={styles.mediaUploadStatus}>{status}</Text> : null}
    </View>
  );
}

function StatsSettingsEditor({
  stats,
  uploadedMedia,
  vendorDraft,
}: {
  stats: VendorStatsSnapshot;
  uploadedMedia: UploadedMediaItem[];
  vendorDraft: VendorDraft;
}) {
  const maxActivity = Math.max(...stats.activityBars, 1);
  const topMedia = uploadedMedia
    .filter((item) => item.status === 'uploaded')
    .slice(0, 3);

  return (
    <View style={styles.statsSettingsWrap}>
      <View style={styles.requestsTemplateCard}>
        <Text style={styles.requestsTemplateTitle}>Период: всё время</Text>
        <Text style={styles.requestsTemplateText}>
          Активность ниже отдельно показывает последние 7 дней.
        </Text>
      </View>
      <View style={styles.statsMetricGrid}>
        <VendorStat value={formatCompactNumber(stats.profileViews)} label="просмотры" />
        <VendorStat value={String(stats.mediaCount)} label="медиа" />
        <VendorStat
          value={String(stats.requests)}
          label={pluralizeRu(stats.requests, 'заявка', 'заявки', 'заявок')}
        />
        <VendorStat value={String(stats.busyDateCount)} label="занятые даты" />
      </View>

      <View style={styles.statsChartCard}>
        <View style={styles.requestHeader}>
          <View>
            <Text style={styles.requestsSummaryTitle}>Активность</Text>
            <Text style={styles.requestsSummaryText}>Заявки за последние 7 дней</Text>
          </View>
          <Text style={styles.statsGrowth}>{stats.activityBars.reduce((sum, value) => sum + value, 0)}</Text>
        </View>
        <View style={styles.statsBarChart}>
          {stats.activityBars.map((value, index) => (
            <View key={`${value}-${index}`} style={styles.statsBarSlot}>
              <View
                style={[
                  styles.statsBar,
                  { height: value ? Math.max(10, Math.round((value / maxActivity) * 92)) : 2 },
                ]}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.statsConversionCard}>
        <Text style={styles.requestsSummaryTitle}>Конверсия</Text>
        <Text style={styles.requestsSummaryText}>За всё время</Text>
        <View style={styles.statsFunnel}>
          <StatsFunnelRow label="Просмотры профиля" value={String(stats.profileViews)} width="100%" />
          <StatsFunnelRow
            label="Просмотры медиа"
            value={String(stats.mediaViews)}
            width={getFunnelWidth(stats.mediaViews, stats.profileViews)}
          />
          <StatsFunnelRow
            label="Клики WhatsApp"
            value={String(stats.whatsappClicks)}
            width={getFunnelWidth(stats.whatsappClicks, stats.profileViews)}
          />
          <StatsFunnelRow
            label="Заявки"
            value={String(stats.requests)}
            width={getFunnelWidth(stats.requests, stats.profileViews)}
          />
        </View>
      </View>

      <View style={styles.statsConversionCard}>
        <Text style={styles.requestsSummaryTitle}>Популярные медиа</Text>
        {topMedia.length ? topMedia.map((item) => (
          <View key={item.id} style={styles.statsMediaRow}>
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="cover"
              source={getUploadedMediaImageSource(item, vendorDraft.category)}
              style={styles.statsMediaThumb}
            />
            <View style={styles.vendorSettingsCopy}>
              <Text style={styles.vendorSettingsItemTitle}>{item.fileName}</Text>
              <Text style={styles.vendorSettingsItemMeta}>
                {item.type === 'video' ? 'Видео' : 'Фото'} · опубликовано
              </Text>
            </View>
          </View>
        )) : (
          <View style={styles.requestsTemplateCard}>
            <Text style={styles.requestsTemplateTitle}>Нет опубликованных медиа</Text>
            <Text style={styles.requestsTemplateText}>
              Опубликуйте фото или видео, и они появятся в этом блоке.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function StatsFunnelRow({
  label,
  value,
  width,
}: {
  label: string;
  value: string;
  width: `${number}%`;
}) {
  return (
    <View style={styles.statsFunnelRow}>
      <View style={styles.statsFunnelLabelRow}>
        <Text style={styles.statsFunnelLabel}>{label}</Text>
        <Text style={styles.statsFunnelValue}>{value}</Text>
      </View>
      <View style={styles.statsFunnelTrack}>
        <View style={[styles.statsFunnelFill, { width }]} />
      </View>
    </View>
  );
}

function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function normalizeDateList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item || '').trim())
        .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item)),
    ),
  );
}

function normalizeCalendarState(calendar?: Partial<VendorCalendarState> | null): VendorCalendarState {
  const busyDates = normalizeDateList(calendar?.busyDates);
  const busySet = new Set(busyDates);
  const freeDates = normalizeDateList(calendar?.freeDates).filter((date) => !busySet.has(date));
  return { busyDates, freeDates };
}

function DatesSettingsEditor({
  autoReply,
  busyDates,
  freeDates,
  onChangeCalendar,
  onSaveAutoReply,
}: {
  autoReply?: string;
  busyDates: string[];
  freeDates: string[];
  onChangeCalendar: (calendar: VendorCalendarState) => void;
  onSaveAutoReply?: (text: string) => Promise<void> | void;
}) {
  const monthNames = [
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
  const monthNamesGenitive = [
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
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedIso, setSelectedIso] = useState(() => formatIsoDate(getAppTodayDate()));
  const [busyDateList, setBusyDateList] = useState(busyDates);
  const [freeDateList, setFreeDateList] = useState(freeDates);
  const [autoReplyDraft, setAutoReplyDraft] = useState(
    autoReply || 'Эта дата уже занята. Могу предложить ближайшие свободные даты.',
  );
  const [autoReplyStatus, setAutoReplyStatus] = useState('');
  const [autoReplyEditing, setAutoReplyEditing] = useState(false);
  const [calendarFeedback, setCalendarFeedback] = useState<'free' | 'busy' | null>(null);
  const calendarFeedbackScale = useRef(new Animated.Value(1)).current;
  const [todayIso, setTodayIso] = useState(() => formatIsoDate(getAppTodayDate()));
  useEffect(() => {
    setBusyDateList(busyDates);
  }, [busyDates]);
  useEffect(() => {
    setFreeDateList(freeDates);
  }, [freeDates]);
  useEffect(() => {
    if (autoReply) {
      setAutoReplyDraft(autoReply);
      setAutoReplyEditing(false);
    }
  }, [autoReply]);
  useEffect(() => {
    const syncToday = () => setTodayIso(formatIsoDate(getAppTodayDate()));
    syncToday();
    const interval = setInterval(syncToday, 60_000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (selectedIso < todayIso) {
      setSelectedIso(todayIso);
    }
  }, [selectedIso, todayIso]);
  const busyDateSet = new Set(busyDateList);
  const freeDateSet = new Set(freeDateList);
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmptyDays = (new Date(year, month, 1).getDay() + 6) % 7;
  const calendarCells = [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const trailingEmptyDays = (7 - (calendarCells.length % 7)) % 7;
  const fullCalendarCells = [
    ...calendarCells,
    ...Array.from({ length: trailingEmptyDays }, () => null),
  ];
  const calendarRows = Array.from(
    { length: Math.ceil(fullCalendarCells.length / 7) },
    (_, index) => fullCalendarCells.slice(index * 7, index * 7 + 7),
  );
  const nearestFreeIso = getNearestFreeIsoDate(busyDateSet, todayIso, freeDateSet);
  const nearestFreeDate = parseIsoDate(nearestFreeIso);
  const nearestFreeLabel = `${nearestFreeDate.getDate()} ${monthNamesGenitive[nearestFreeDate.getMonth()]}`;
  const selectedDate = parseIsoDate(selectedIso < todayIso ? todayIso : selectedIso);
  const selectedLabel = `${selectedDate.getDate()} ${monthNamesGenitive[selectedDate.getMonth()]}`;
  const visibleMonthTitle = `${monthNames[month]} ${year}`;
  const changeMonth = (delta: number) => {
    setVisibleMonth((current) => {
      return new Date(current.getFullYear(), current.getMonth() + delta, 1);
    });
  };
  const toIso = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const showCalendarFeedback = (status: 'free' | 'busy') => {
    setCalendarFeedback(status);
    calendarFeedbackScale.setValue(0.94);
    Animated.spring(calendarFeedbackScale, {
      toValue: 1,
      damping: 11,
      stiffness: 260,
      mass: 0.65,
      useNativeDriver: true,
    }).start();
  };
  const markSelectedFree = () => {
    if (selectedIso < todayIso) return;
    const nextBusyDates = busyDateList.filter((date) => date !== selectedIso);
    const nextFreeDates = freeDateSet.has(selectedIso)
      ? freeDateList
      : [...freeDateList, selectedIso];
    setBusyDateList(nextBusyDates);
    setFreeDateList(nextFreeDates);
    showCalendarFeedback('free');
    onChangeCalendar({ busyDates: nextBusyDates, freeDates: nextFreeDates });
  };
  const markSelectedBusy = () => {
    if (selectedIso < todayIso) return;
    const nextBusyDates = busyDateSet.has(selectedIso)
      ? busyDateList
      : [...busyDateList, selectedIso];
    const nextFreeDates = freeDateList.filter((date) => date !== selectedIso);
    setBusyDateList(nextBusyDates);
    setFreeDateList(nextFreeDates);
    showCalendarFeedback('busy');
    onChangeCalendar({ busyDates: nextBusyDates, freeDates: nextFreeDates });
  };
  const saveAutoReply = async () => {
    if (!onSaveAutoReply) return;
    setAutoReplyStatus('Сохраняем...');
    try {
      await onSaveAutoReply(autoReplyDraft.trim() || 'Эта дата уже занята. Могу предложить ближайшие свободные даты.');
      setAutoReplyStatus('Автоответ сохранен');
      setAutoReplyEditing(false);
    } catch {
      setAutoReplyStatus('Не удалось сохранить');
    }
  };

  return (
    <View style={styles.datesSettingsWrap}>
      <View style={styles.calendarSummaryCard}>
        <Text style={styles.requestsSummaryTitle}>Ближайшая свободная дата</Text>
        <Text style={styles.calendarBigDate}>{nearestFreeLabel}</Text>
        <Text style={styles.requestsSummaryText}>
          Клиенты увидят эту дату в профиле и в ленте.
        </Text>
        <Text style={styles.calendarWeekendText}>
          Сегодня: {formatRussianDayMonth(getAppTodayDate())}. Выбрано: {selectedLabel}.
        </Text>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <View style={styles.calendarMonthNav}>
            <Pressable
              accessibilityLabel="Предыдущий месяц"
              accessibilityRole="button"
              onPress={() => changeMonth(-1)}
              style={({ pressed }) => [
                styles.calendarNavButton,
                pressed && styles.pressed,
              ]}
            >
              <ChevronLeft color={colors.surface} size={20} strokeWidth={2.1} />
            </Pressable>
            <Text style={styles.calendarMonth}>{visibleMonthTitle}</Text>
            <Pressable
              accessibilityLabel="Следующий месяц"
              accessibilityRole="button"
              onPress={() => changeMonth(1)}
              style={({ pressed }) => [
                styles.calendarNavButton,
                pressed && styles.pressed,
              ]}
            >
              <ChevronRight color={colors.surface} size={20} strokeWidth={2.1} />
            </Pressable>
          </View>
          <View style={styles.calendarLegend}>
            <View style={styles.calendarLegendItem}>
              <View style={[styles.calendarLegendDot, styles.calendarLegendDotFree]} />
              <Text style={styles.calendarLegendText}>свободно</Text>
            </View>
            <View style={styles.calendarLegendItem}>
              <View style={[styles.calendarLegendDot, styles.calendarLegendDotBusy]} />
              <Text style={styles.calendarLegendText}>занято</Text>
            </View>
          </View>
        </View>

        <View style={styles.weekGrid}>
          {weekDays.map((day) => (
            <Text key={day} style={styles.weekDayText}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.calendarMonthGrid}>
          {calendarRows.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.calendarWeekRow}>
              {row.map((day, dayIndex) => {
                if (!day) {
                  return (
                    <View
                      key={`empty-${rowIndex}-${dayIndex}`}
                      style={styles.calendarMonthDayEmpty}
                    />
                  );
                }

                const iso = toIso(day);
                const isSunday = new Date(year, month, day).getDay() === 0;
                const isPast = iso < todayIso;
                const free = freeDateSet.has(iso);
                const busy = busyDateSet.has(iso);
                const selected = iso === selectedIso;
                return (
                  <Pressable
                    key={day}
                    accessibilityRole="button"
                    disabled={isPast}
                    onPress={() => setSelectedIso(iso)}
                    style={({ pressed }) => [
                      styles.calendarMonthDay,
                      isSunday && styles.calendarMonthDaySunday,
                      selected && styles.calendarMonthDaySelected,
                      free && styles.calendarMonthDayFree,
                      busy && styles.calendarMonthDayBusy,
                      isPast && styles.calendarMonthDayPast,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarMonthDayText,
                        isSunday && styles.calendarMonthDayTextSunday,
                        selected && styles.calendarMonthDayTextSelected,
                        free && styles.calendarMonthDayTextFree,
                        busy && styles.calendarMonthDayTextBusy,
                        isPast && styles.calendarMonthDayTextPast,
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
      </View>

      <View style={styles.mediaActionRow}>
        <Pressable
          accessibilityRole="button"
          onPress={markSelectedFree}
          style={({ pressed }) => [
            styles.mediaActionButton,
            styles.calendarFreeActionButton,
            pressed && styles.pressed,
          ]}
        >
          <Check color={colors.surface} size={19} strokeWidth={2.2} />
          <Text style={styles.mediaActionText}>Свободно</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={markSelectedBusy}
          style={({ pressed }) => [
            styles.mediaActionButton,
            styles.calendarBusyActionButton,
            pressed && styles.pressed,
          ]}
        >
          <X color={colors.surface} size={19} strokeWidth={2.2} />
          <Text style={styles.mediaActionText}>Занято</Text>
        </Pressable>
      </View>

      {calendarFeedback ? (
        <Animated.View
          accessibilityLiveRegion="polite"
          style={[
            styles.calendarFeedback,
            calendarFeedback === 'free'
              ? styles.calendarFeedbackFree
              : styles.calendarFeedbackBusy,
            { transform: [{ scale: calendarFeedbackScale }] },
          ]}
        >
          {calendarFeedback === 'free' ? (
            <Check color={colors.surface} size={18} strokeWidth={2.5} />
          ) : (
            <X color={colors.surface} size={18} strokeWidth={2.5} />
          )}
          <Text style={styles.calendarFeedbackText}>
            {selectedLabel}: {calendarFeedback === 'free' ? 'свободно' : 'занято'}
          </Text>
        </Animated.View>
      ) : null}

      <View style={styles.requestsTemplateCard}>
        <Text style={styles.requestsTemplateTitle}>Автоответ если дата занята</Text>
        {autoReplyEditing ? (
          <TextInput
            multiline
            onChangeText={setAutoReplyDraft}
            placeholder="Текст автоответа"
            placeholderTextColor="#A8A8A8"
            style={[styles.draftInput, styles.settingsTextArea]}
            value={autoReplyDraft}
          />
        ) : (
          <Text style={styles.requestsTemplateText}>{autoReplyDraft}</Text>
        )}
        {onSaveAutoReply ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (!autoReplyEditing) {
                setAutoReplyEditing(true);
                setAutoReplyStatus('');
                return;
              }
              saveAutoReply();
            }}
            style={({ pressed }) => [
              styles.vendorSettingSaveButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.vendorSettingSaveText}>
              {autoReplyEditing ? 'Сохранить' : 'Изменить'}
            </Text>
          </Pressable>
        ) : null}
        {autoReplyStatus ? (
          <Text style={styles.mediaUploadStatus}>{autoReplyStatus}</Text>
        ) : null}
      </View>
    </View>
  );
}

function RequestsSettingsEditor({
  bookings,
  onUpdateStatus,
}: {
  bookings: ClientBooking[];
  onUpdateStatus: (bookingId: string, status: string) => void;
}) {
  const bookingRequests = bookings.map((booking) => ({
    id: booking.id,
    name: booking.clientName || booking.clientEmail || 'Клиент',
    date: formatStoredDate(booking.date),
    budget: formatMoneyText(booking.amount),
    status: getCompactBookingStatus(booking.status),
    message: `${formatStoredDate(booking.date)}${
      booking.timeFrom && booking.timeTo ? ` · ${booking.timeFrom}-${booking.timeTo}` : ''
    }. Клиент хочет закрепить дату после договоренности.`,
  }));
  const newCount = bookings.filter((booking) =>
    ['Ожидает подтверждения', 'Новая'].includes(booking.status),
  ).length;
  const inWorkCount = bookings.filter((booking) => booking.status === 'В работе').length;
  const doneCount = bookings.filter((booking) =>
    ['Подтверждена', 'Закрыто'].includes(booking.status),
  ).length;

  return (
    <View style={styles.requestsSettingsWrap}>
      <View style={styles.requestsSummaryCard}>
        <Text style={styles.requestsSummaryTitle}>Заявки</Text>
        <Text style={styles.requestsSummaryText}>
          Новые обращения, статусы и быстрые ответы клиентам.
        </Text>
        <View style={styles.instagramSyncStats}>
          <VendorStat value={String(newCount)} label="новые" />
          <VendorStat value={String(inWorkCount)} label="в работе" />
          <VendorStat value={String(doneCount)} label="закрыто" />
        </View>
      </View>

      <View style={styles.requestsTemplateCard}>
        <Text style={styles.requestsTemplateTitle}>Автоответ клиенту</Text>
        <Text style={styles.requestsTemplateText}>
          Спасибо за заявку. Напишите дату, город и формат мероприятия — я быстро отвечу по стоимости.
        </Text>
      </View>

      {bookingRequests.length ? bookingRequests.map((request) => (
        <View key={request.id} style={styles.requestCard}>
          <View style={styles.requestHeader}>
            <View style={styles.requestHeaderCopy}>
              <Text style={styles.requestName}>{request.name}</Text>
              <Text style={styles.requestMeta}>
                {request.date} · {request.budget}
              </Text>
            </View>
            <View
              style={[
                styles.requestStatusBadge,
                request.status === 'Подтверждена' && styles.requestStatusBadgeDone,
              ]}
            >
              <Text numberOfLines={1} style={styles.requestStatusText}>{request.status}</Text>
            </View>
          </View>
          <Text style={styles.requestMessage}>{request.message}</Text>
          <View style={styles.requestActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onUpdateStatus(request.id, 'В работе')}
              style={styles.requestActionPrimary}
            >
              <Text style={styles.requestActionPrimaryText}>Ответить</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => onUpdateStatus(request.id, 'Подтверждена')}
              style={styles.requestActionGhost}
            >
              <Text style={styles.requestActionGhostText}>Подтвердить</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => onUpdateStatus(request.id, 'Отклонена')}
              style={styles.requestActionGhost}
            >
              <Text style={styles.requestActionGhostText}>Отказать</Text>
            </Pressable>
          </View>
        </View>
      )) : (
        <View style={styles.requestsTemplateCard}>
          <Text style={styles.requestsTemplateTitle}>Заявок пока нет</Text>
          <Text style={styles.requestsTemplateText}>
            Когда клиент отправит бронь, она появится здесь и во вкладке “Заявки”.
          </Text>
        </View>
      )}

      <View style={styles.requestsTemplateCard}>
        <Text style={styles.requestsTemplateTitle}>Поля для клиента</Text>
        <View style={styles.requestFieldPills}>
          {['Дата', 'Город', 'Бюджет', 'Количество гостей', 'WhatsApp'].map(
            (field) => (
              <Text key={field} style={styles.requestFieldPill}>
                {field}
              </Text>
            ),
          )}
        </View>
      </View>
    </View>
  );
}

function VendorProfilePhotoPicker({
  media,
  onApplyUser,
  userId,
  vendorDraft,
}: {
  media: UploadedMediaItem[];
  onApplyUser: (user: ApiUser) => void;
  userId: string | null;
  vendorDraft: VendorDraft;
}) {
  const [status, setStatus] = useState('');
  const [demoPhoto, setDemoPhoto] = useState<UploadedMediaItem | null>(null);
  const profilePhoto =
    demoPhoto ??
    media.find((item) => item.role === 'profile' && item.type === 'image') ??
    media.find((item) => item.role === 'cover' && item.type === 'image') ??
    media.find((item) => item.type === 'image');
  const pickProfilePhoto = async () => {
    if (!userId) {
      setStatus('Сначала войдите в аккаунт поставщика');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatus('Дайте доступ к фото');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: false,
      mediaTypes: ['images'],
      quality: 0.82,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setStatus('Загружаем фото профиля...');
    if (userId.startsWith('review-')) {
      const asset = result.assets[0];
      setDemoPhoto({
        id: `review-profile-${Date.now()}`,
        uri: asset.uri,
        type: 'image',
        fileName: asset.fileName || 'profile-photo.jpg',
        selected: true,
        role: 'profile',
        status: 'uploaded',
        uploadProgress: 100,
      });
      setStatus('Фото профиля обновлено в демо');
      return;
    }
    try {
      const response = await uploadUserMediaRemote(userId, result.assets[0], {
        index: 0,
        role: 'profile',
      });
      onApplyUser(response.user);
      setStatus('Фото профиля загружено');
    } catch (error) {
      setStatus(getReadableUploadError(error));
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={pickProfilePhoto}
      style={({ pressed }) => [
        styles.settingsProfilePhotoCard,
        pressed && styles.pressed,
      ]}
    >
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={
          profilePhoto
            ? getUploadedMediaImageSource(profilePhoto, vendorDraft.category)
            : getVendorImageSource({ category: vendorDraft.category })
        }
        style={styles.settingsProfilePhotoImage}
      />
      <View style={styles.settingsProfilePhotoShade} />
      <View style={styles.settingsProfilePhotoCopy}>
        <Text style={styles.mediaMainLabel}>Фото профиля</Text>
        <Text style={styles.mediaMainTitle}>
          {profilePhoto ? profilePhoto.fileName : 'Загрузить фото'}
        </Text>
        <Text style={styles.mediaMainStatus}>
          Будет использоваться в профиле и сторис.
        </Text>
      </View>
      <View style={styles.mediaUploadBadge}>
        <Upload color={colors.surface} size={22} strokeWidth={2.3} />
      </View>
      {status ? <Text style={styles.mediaUploadStatus}>{status}</Text> : null}
    </Pressable>
  );
}

function InstagramSettingsEditor({
  onApplyUser,
  uploadedMedia,
  userId,
}: {
  onApplyUser: (user: ApiUser) => void;
  uploadedMedia: UploadedMediaItem[];
  userId: string | null;
}) {
  const callbackParams =
    isWebRuntime && typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
  const callbackError = callbackParams?.get('instagramError') || '';
  const oauthFallbackNotice = getInstagramOAuthFallbackNotice(callbackError);
  const [handle, setHandle] = useState('');
  const [previewItems, setPreviewItems] = useState<InstagramImportPreviewItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState(
    oauthFallbackNotice
      ? 'Meta не подключила совместные публикации. Откройте Instagram Login или загрузите совместные посты через файл.'
      : 'Подключите Instagram для постов, Reels и совместных публикаций',
  );
  const [preferDirectInstagramLogin, setPreferDirectInstagramLogin] =
    useState(Boolean(callbackError));
  const [mediaNotices, setMediaNotices] = useState<InstagramMediaNotice[]>([]);
  const [linkImportUrls, setLinkImportUrls] = useState('');
  const [linkImportFiles, setLinkImportFiles] = useState<UploadedMediaItem[]>([]);
  const [connectionMode, setConnectionMode] =
    useState<'oauth' | 'facebook_oauth' | null>(null);
  const [connectedProfile, setConnectedProfile] =
    useState<ApiUser['instagramProfile']>(null);

  useEffect(() => {
    if (!userId) return;
    fetchInstagramStatusRemote(userId)
      .then(async (result) => {
        if (result.profile) {
          const nextHandle = `@${result.profile.username || handle.replace('@', '')}`;
          setConnectedProfile(result.profile);
          setConnectionMode(
            result.profile.mode === 'facebook_oauth' ? 'facebook_oauth' : 'oauth',
          );
          setHandle(nextHandle);
          setImportStatus('Instagram подключен, загружаем реальные медиа...');
          try {
            const mediaResult = await fetchInstagramMediaRemote(userId, nextHandle);
            setConnectedProfile(mediaResult.profile);
            setPreviewItems(mediaResult.items);
            setMediaNotices(mediaResult.notices || []);
            setSelectedIds(mediaResult.items.map((item) => item.id));
            setImportStatus(`Найдено ${mediaResult.items.length} медиа из Instagram`);
          } catch (error) {
            setImportStatus('Instagram подключен, но медиа не загрузились. Повторите позже.');
          }
        }
      })
      .catch(() => undefined);
  }, [userId]);

  const connectInstagram = async () => {
    if (!userId) {
      setImportStatus('Сначала войдите в аккаунт поставщика');
      return;
    }

    setImportStatus(
      preferDirectInstagramLogin
        ? 'Открываем официальный Instagram Login...'
        : 'Открываем официальный вход Meta/Instagram для совместных публикаций...',
    );
    try {
      let result: {
        mode: 'oauth' | 'facebook_oauth';
        authUrl: string | null;
        message: string;
      };
      if (preferDirectInstagramLogin) {
        result = await connectInstagramRemote(userId, handle);
      } else {
        try {
          result = await connectInstagramFacebookRemote(userId, handle);
        } catch (facebookError) {
          const message =
            facebookError instanceof Error ? facebookError.message : String(facebookError);
          if (!/Facebook Login is not configured|FACEBOOK_CLIENT/i.test(message)) {
            throw facebookError;
          }
          setPreferDirectInstagramLogin(true);
          result = await connectInstagramRemote(userId, handle);
        }
      }
      setConnectionMode(result.mode);
      if (result.authUrl) {
        void openExternalUrl(result.authUrl).catch(() => undefined);
        setImportStatus('После входа вернитесь сюда и нажмите “Обновить медиа”');
        return;
      }

      const mediaResult = await fetchInstagramMediaRemote(userId, handle);
      setConnectedProfile(mediaResult.profile);
      setPreviewItems(mediaResult.items);
      setMediaNotices(mediaResult.notices || []);
      setSelectedIds(mediaResult.items.map((item) => item.id));
      setImportStatus(`Найдено ${mediaResult.items.length} медиа`);
    } catch {
      setConnectionMode(null);
      setPreviewItems([]);
      setMediaNotices([]);
      setSelectedIds([]);
      setImportStatus('Instagram не подключен. Повторите позже.');
    }
  };

  const refreshInstagramMedia = async () => {
    if (!userId) {
      setImportStatus('Сначала войдите в аккаунт поставщика');
      return;
    }

    setImportStatus('Обновляем медиа из Instagram...');
    try {
      const result = await fetchInstagramMediaRemote(userId, handle);
      setConnectedProfile(result.profile);
      setPreviewItems(result.items);
      setMediaNotices(result.notices || []);
      setSelectedIds((current) =>
        current.length ? current : result.items.map((item) => item.id),
      );
      setConnectionMode(
        result.profile.mode === 'facebook_oauth' ? 'facebook_oauth' : 'oauth',
      );
      setImportStatus(`Найдено ${result.items.length} медиа`);
    } catch {
      setPreviewItems([]);
      setMediaNotices([]);
      setSelectedIds([]);
      setImportStatus('Не удалось обновить Instagram. Подключите аккаунт заново.');
    }
  };

  const refreshInstagramToken = async () => {
    if (!userId) {
      setImportStatus('Сначала войдите в аккаунт поставщика');
      return;
    }

    setImportStatus('Обновляем доступ Instagram...');
    try {
      const result = await refreshInstagramTokenRemote(userId);
      setConnectedProfile(result.profile);
      setConnectionMode(
        result.profile.mode === 'facebook_oauth' ? 'facebook_oauth' : 'oauth',
      );
      setImportStatus('Доступ Instagram обновлен');
    } catch {
      setImportStatus('Не удалось обновить доступ, подключите Instagram заново');
    }
  };

  const disconnectInstagram = async () => {
    if (!userId) {
      setImportStatus('Сначала войдите в аккаунт поставщика');
      return;
    }

    setImportStatus('Отключаем Instagram...');
    try {
      const result = await disconnectInstagramRemote(userId);
      onApplyUser(result.user);
      setConnectedProfile(null);
      setConnectionMode(null);
      setPreviewItems([]);
      setMediaNotices([]);
      setSelectedIds([]);
      setImportStatus('Instagram отключен');
    } catch {
      setImportStatus('Не удалось отключить Instagram');
    }
  };

  const selectedItems = previewItems.filter((item) => selectedIds.includes(item.id));
  const displayHandle =
    connectedProfile?.username || handle.replace('@', '') || 'Instagram';
  const toggleSelected = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };
  const parsedLinkImportUrls = parseInstagramUrls(linkImportUrls);

  const pickLinkImportFiles = async () => {
    if (!userId) {
      setImportStatus('Сначала войдите в аккаунт поставщика');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setImportStatus('Дайте доступ к фото/видео, чтобы загрузить скачанные Instagram файлы');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images', 'videos'],
      quality: 0.82,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (result.canceled) {
      return;
    }

    const existingSources = new Set(
      uploadedMedia.map((item) => item.sourceUrl || item.uri),
    );
    const uploadedFiles: UploadedMediaItem[] = [];
    const uploadErrors: string[] = [];
    setImportStatus(`Загружаем медиа: 0/${result.assets.length}`);

    for (const [index, asset] of result.assets.entries()) {
      const type = getPickedAssetType(asset);
      const sourceUrl =
        parsedLinkImportUrls[index] ||
        (parsedLinkImportUrls.length === 1 ? parsedLinkImportUrls[0] : undefined);
      if (sourceUrl && existingSources.has(sourceUrl)) {
        continue;
      }
      const currentCount = uploadedMedia.length + uploadedFiles.length;
      const role: UploadedMediaItem['role'] =
        currentCount === 0 && index === 0
          ? 'main'
          : type === 'video'
            ? 'reels'
            : 'profile';

      try {
        const response = await uploadUserMediaRemote(userId, asset, {
          caption: sourceUrl ? 'Instagram import' : undefined,
          instagramHandle: handle || undefined,
          index,
          role,
          sourceUrl,
        });
        uploadedFiles.push(response.media);
        if (sourceUrl) existingSources.add(sourceUrl);
        onApplyUser(response.user);
      } catch (error) {
        uploadErrors.push(
          getReadableUploadError(error),
        );
      }

      setImportStatus(`Загружаем медиа: ${index + 1}/${result.assets.length}`);
    }

    setLinkImportFiles(uploadedFiles);
    if (uploadErrors.length) {
      setImportStatus(
        `Загружено ${uploadedFiles.length}/${result.assets.length}. Ошибки: ${uploadErrors
          .slice(0, 2)
          .join('; ')}`,
      );
      return;
    }
    setLinkImportUrls('');
    setImportStatus(`${uploadedFiles.length} медиа загружено в профиль`);
  };

  return (
    <View style={styles.instagramSettingsWrap}>
      <View style={styles.instagramAccountCard}>
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="cover"
          source={getVendorImageSource({ category: 'Ведущие', imageKey: 'host' })}
          style={styles.instagramSettingsAvatar}
        />
        <View style={styles.instagramSettingsAccountCopy}>
        <Text style={styles.instagramSettingsAccountTitle}>
          {displayHandle === 'Instagram' ? displayHandle : `@${displayHandle}`}
        </Text>
          <Text style={styles.instagramSettingsAccountMeta}>
            {connectionMode === 'facebook_oauth'
              ? 'Instagram + совместные публикации подключены'
              : connectionMode === 'oauth'
                ? 'Официальный Instagram подключен'
                : 'Готов к официальному подключению'}
          </Text>
        </View>
        <View style={[styles.oauthBadge, !connectionMode && styles.oauthBadgePending]}>
          {connectionMode ? (
            <Check color={colors.surface} size={16} strokeWidth={3} />
          ) : (
            <AtSign color="#A7B0BA" size={16} strokeWidth={2.2} />
          )}
        </View>
      </View>

      <View style={styles.instagramBotCard}>
        <DraftInput
          label="Instagram аккаунт"
          onChangeText={setHandle}
          value={handle}
        />
        <Text style={styles.instagramBotLabel}>
          Нажмите «Подключить Instagram». SVADBA.kz сначала попробует Meta-вход
          для постов, Reels и совместных публикаций, потом загрузит реальные медиа.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={connectInstagram}
          style={({ pressed }) => [
            styles.instagramImportButton,
            pressed && styles.pressed,
          ]}
        >
          <Camera color={colors.surface} size={20} strokeWidth={2.2} />
          <Text style={styles.instagramImportButtonText}>Подключить Instagram</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={refreshInstagramMedia}
          style={({ pressed }) => [
            styles.manualUploadButton,
            pressed && styles.pressed,
          ]}
        >
          <Upload color={colors.surface} size={20} strokeWidth={2.2} />
          <Text style={styles.instagramImportButtonText}>Обновить медиа</Text>
        </Pressable>
        <Text style={styles.instagramBotStatus}>{importStatus}</Text>
        {mediaNotices.map((notice) => (
          <Text key={notice.code} style={styles.instagramBotNotice}>
            {notice.message}
          </Text>
        ))}
        {oauthFallbackNotice ? (
          <Text style={styles.instagramBotNotice}>{oauthFallbackNotice}</Text>
        ) : null}
        {connectionMode ? (
          <View style={styles.mediaActionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={refreshInstagramToken}
              style={({ pressed }) => [
                styles.mediaActionButton,
                pressed && styles.pressed,
              ]}
            >
              <Repeat2 color={colors.surface} size={18} strokeWidth={2.1} />
              <Text style={styles.mediaActionText}>Обновить доступ</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={disconnectInstagram}
              style={({ pressed }) => [
                styles.mediaActionButton,
                pressed && styles.pressed,
              ]}
            >
              <X color={colors.surface} size={18} strokeWidth={2.1} />
              <Text style={styles.mediaActionText}>Отключить</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.instagramPermissionGrid}>
        {['Аккаунт', 'Посты', 'Reels', 'Совместные'].map((permission) => (
          <View key={permission} style={styles.permissionPill}>
            <Check color={colors.green} size={14} strokeWidth={2.6} />
            <Text style={styles.permissionText}>{permission}</Text>
          </View>
        ))}
      </View>

      <View style={styles.instagramSyncCard}>
        <Text style={styles.instagramSyncTitle}>Как работает сейчас</Text>
        <Text style={styles.instagramSyncText}>
          Поставщик проходит официальный вход Meta/Instagram. API отдает свои и
          доступные совместные публикации. Если конкретный совместный пост не пришел,
          его можно добавить ниже через ссылку и файл.
        </Text>
        <View style={styles.instagramSyncStats}>
          <VendorStat value={String(previewItems.length)} label="найдено" />
          <VendorStat value={String(selectedItems.length)} label="выбрано" />
          <VendorStat value="0" label="ошибок" />
        </View>
      </View>

      <View style={styles.instagramBotCard}>
        <Text style={styles.instagramSyncTitle}>Импорт по ссылкам и файлам</Text>
        <Text style={styles.instagramBotLabel}>
          Для совместных постов, которые Meta не отдаст через API: вставьте ссылки
          как источник и выберите скачанные файлы. SVADBA.kz добавит их в профиль.
        </Text>
        <TextInput
          multiline
          onChangeText={setLinkImportUrls}
          placeholder="https://www.instagram.com/reel/..."
          placeholderTextColor="#7E8791"
          style={styles.instagramBotTextarea}
          value={linkImportUrls}
        />
        <View style={styles.instagramSyncStats}>
          <VendorStat value={String(parsedLinkImportUrls.length)} label="ссылок" />
          <VendorStat value={String(linkImportFiles.length)} label="файлов" />
          <VendorStat value={String(uploadedMedia.length)} label="в профиле" />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={pickLinkImportFiles}
          style={({ pressed }) => [
            styles.manualUploadButton,
            pressed && styles.pressed,
          ]}
        >
          <ImagePlus color={colors.surface} size={20} strokeWidth={2.2} />
          <Text style={styles.instagramImportButtonText}>Выбрать и загрузить медиа</Text>
        </Pressable>
      </View>

      <Text style={styles.instagramSectionTitle}>Найденные медиа</Text>
      <View style={styles.mediaGrid}>
        {previewItems.map((post) => {
          const selected = selectedIds.includes(post.id);
          return (
          <Pressable
            key={post.id}
            accessibilityRole="button"
            onPress={() => toggleSelected(post.id)}
            style={({ pressed }) => [
              styles.instagramPostTile,
              selected && styles.instagramPostTileSelected,
              pressed && styles.pressed,
            ]}
          >
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="cover"
              source={getInstagramMediaImageSource(post)}
              style={styles.mediaTileImage}
            />
            <View style={styles.mediaTileShade} />
            <Text style={styles.mediaTileType}>
              {post.isCollaborative
                ? post.type === 'video'
                  ? 'Совместное видео'
                  : 'Совместное фото'
                : post.type === 'video'
                  ? 'Видео'
                  : 'Фото'}
            </Text>
            <View
              style={[
                styles.importCheck,
                selected && styles.importCheckSelected,
              ]}
            >
              {selected ? (
                <Check color={colors.surface} size={18} strokeWidth={3} />
              ) : null}
            </View>
            <Text style={styles.instagramPostTitle}>{post.title}</Text>
          </Pressable>
          );
        })}
        {previewItems.length === 0 ? (
          <View style={[styles.clientEmptyCard, styles.importEmptyCard]}>
            <Text style={styles.clientEmptyTitle}>Пока нет медиа</Text>
            <Text style={styles.clientEmptyText}>
              Сначала подключите Instagram через официальный Meta/Instagram вход,
              потом нажмите “Обновить медиа”.
            </Text>
          </View>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={selectedItems.length === 0}
        onPress={async () => {
          if (!userId) {
            setImportStatus('Сначала войдите в аккаунт поставщика');
            return;
          }

          try {
            const result = await importInstagramMediaRemote(
              userId,
              selectedItems.map((item) => item.id),
              (job) => {
                setImportStatus(
                  `Скачиваем медиа: ${job.processedCount}/${job.totalCount}`,
                );
              },
            );
            onApplyUser(result.user);
            setImportStatus(
              result.downloadedCount > 0 && result.failedCount > 0
                ? `${result.downloadedCount} медиа скачано, ${result.failedCount} не скачалось`
                : result.downloadedCount > 0
                  ? `${result.downloadedCount} медиа скачано и загружено в профиль`
                  : result.skippedCount > 0
                    ? 'Выбранные медиа уже загружены в профиль'
                    : result.failedCount > 0
                      ? `${result.failedCount} медиа не скачалось`
                      : 'Нет новых медиа для загрузки',
            );
          } catch (error) {
            setImportStatus(
              'Не удалось перенести медиа из Instagram. Повторите позже.',
            );
          }
        }}
        style={({ pressed }) => [
          styles.mediaPublishButton,
          selectedItems.length === 0 && styles.disabledButton,
          pressed && styles.pressed,
        ]}
      >
        <Upload color={colors.surface} size={20} strokeWidth={2.2} />
        <Text style={styles.mediaActionText}>Скачать и загрузить в профиль</Text>
      </Pressable>
    </View>
  );
}

function MediaSettingsEditor({
  media,
  onApplyUser,
  onChangeMedia,
  userId,
}: {
  media: UploadedMediaItem[];
  onApplyUser: (user: ApiUser) => void;
  onChangeMedia: (media: UploadedMediaItem[]) => boolean | Promise<boolean>;
  userId: string | null;
}): ReactElement {
  const [uploadStatus, setUploadStatus] = useState('');
  const [captionDrafts, setCaptionDrafts] = useState<Record<string, string>>({});
  const [pendingMedia, setPendingMedia] = useState<UploadedMediaItem[]>([]);
  const lastUploadError = useRef('');
  const retryUploads = useRef<
    Map<
      string,
      {
        asset: ImagePicker.ImagePickerAsset;
        index: number;
        role: UploadedMediaItem['role'];
      }
    >
  >(new Map());
  const visibleMedia = [
    ...media,
    ...pendingMedia.filter((pendingItem) =>
      !media.some((item) => item.id === pendingItem.id),
    ),
  ];
  const mainMedia = visibleMedia.find((item) => item.role === 'main') ?? visibleMedia[0];
  const uploadedCount = visibleMedia.filter((item) => item.status === 'uploaded').length;
  const publishableSelected = media.filter(
    (item) => item.selected && item.status === 'ready',
  );

  useEffect(() => {
    setCaptionDrafts((current) => {
      const nextDrafts: Record<string, string> = {};
      for (const item of [...media, ...pendingMedia]) {
        nextDrafts[item.id] = current[item.id] ?? item.caption ?? '';
      }
      return nextDrafts;
    });
  }, [media, pendingMedia]);

  const updatePendingMedia = (id: string, patch: Partial<UploadedMediaItem>) => {
    setPendingMedia((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const getMediaStatusLabel = (item: UploadedMediaItem) => {
    if (item.status === 'uploading') {
      return `Загрузка ${Math.max(1, item.uploadProgress ?? 1)}%`;
    }
    if (item.status === 'processing') return 'Обработка видео';
    if (item.status === 'failed') return 'Ошибка загрузки';
    return item.status === 'uploaded' ? 'Опубликовано' : 'Черновик';
  };

  const uploadPickedAsset = async (
    asset: ImagePicker.ImagePickerAsset,
    index: number,
    role: UploadedMediaItem['role'],
    existingId?: string,
  ) => {
    const type = getPickedAssetType(asset);
    const fileName = getPickedAssetFileName(asset, index, type);
    const pendingId =
      existingId ??
      `pending_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`;
    const draft: UploadedMediaItem = {
      id: pendingId,
      uri: asset.uri,
      type,
      fileName,
      selected: true,
      role,
      status: 'uploading',
      uploadProgress: 1,
    };
    retryUploads.current.set(pendingId, { asset, index, role });
    if (existingId) {
      updatePendingMedia(existingId, {
        uri: asset.uri,
        type,
        fileName,
        selected: true,
        role,
        status: 'uploading',
        uploadError: undefined,
        uploadProgress: 1,
      });
    } else {
      setPendingMedia((current) => [...current, draft]);
    }

    if (userId?.startsWith('review-')) {
      updatePendingMedia(pendingId, { uploadProgress: 55 });
      await delay(350);
      const uploaded: UploadedMediaItem = {
        ...draft,
        status: 'uploaded',
        uploadProgress: 100,
      };
      await onChangeMedia([
        ...media.filter((item) => item.id !== pendingId),
        uploaded,
      ]);
      setPendingMedia((current) => current.filter((item) => item.id !== pendingId));
      retryUploads.current.delete(pendingId);
      return uploaded;
    }

    try {
      lastUploadError.current = '';
      updatePendingMedia(pendingId, { uploadProgress: 35 });
      const response = await uploadUserMediaRemote(userId as string, asset, {
        index,
        role,
      });
      updatePendingMedia(pendingId, {
        status: type === 'video' ? 'processing' : 'uploading',
        uploadProgress: type === 'video' ? 92 : 100,
      });
      onApplyUser(response.user);
      await delay(type === 'video' ? 650 : 250);
      setPendingMedia((current) => current.filter((item) => item.id !== pendingId));
      retryUploads.current.delete(pendingId);
      return response.media;
    } catch (error) {
      const uploadError = getReadableUploadError(error);
      lastUploadError.current = uploadError;
      updatePendingMedia(pendingId, {
        status: 'failed',
        uploadError,
        uploadProgress: 0,
      });
      return null;
    }
  };

  const retryUpload = async (id: string) => {
    if (userId?.startsWith('review-')) {
      setUploadStatus('Повторяем загрузку...');
      await delay(350);
      const saved = await onChangeMedia(
        media.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'uploaded',
                uploadError: undefined,
                uploadProgress: 100,
              }
            : item,
        ),
      );
      setUploadStatus(saved ? 'Медиа загружено' : 'Загрузка снова не прошла');
      return;
    }
    const retry = retryUploads.current.get(id);
    if (!retry || !userId) {
      setUploadStatus('Не удалось повторить. Выберите файл заново.');
      return;
    }
    setUploadStatus('Повторяем загрузку...');
    const uploaded = await uploadPickedAsset(retry.asset, retry.index, retry.role, id);
    setUploadStatus(uploaded ? 'Медиа загружено' : 'Загрузка снова не прошла');
  };

  const pickMedia = async (
    mediaTypes: ImagePicker.MediaType[],
    forcedRole?: UploadedMediaItem['role'],
  ) => {
    if (!userId) {
      setUploadStatus('Сначала войдите в аккаунт поставщика');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setUploadStatus('Дайте доступ к фото/видео');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes,
      quality: 0.82,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (result.canceled) {
      return;
    }

    const uploadedItems: UploadedMediaItem[] = [];
    const uploadErrors: string[] = [];
    setUploadStatus(`Загружаем медиа: 0/${result.assets.length}`);

    for (const [index, asset] of result.assets.entries()) {
      const type = getPickedAssetType(asset);
      const role: UploadedMediaItem['role'] =
        forcedRole ??
        (visibleMedia.length + uploadedItems.length === 0 && index === 0
          ? 'main'
          : type === 'video'
            ? 'reels'
            : 'profile');
      const uploaded = await uploadPickedAsset(asset, index, role);
      if (uploaded) {
        uploadedItems.push(uploaded);
      } else {
        uploadErrors.push(
          `${getPickedAssetFileName(asset, index, type)}: ${
            lastUploadError.current || 'backend не принял файл'
          }`,
        );
      }
      setUploadStatus(`Загружаем медиа: ${index + 1}/${result.assets.length}`);
    }

    setUploadStatus(
      uploadErrors.length
        ? `Загружено ${uploadedItems.length}/${result.assets.length}. Ошибки: ${uploadErrors
          .slice(0, 2)
          .join('; ')}`
        : `${uploadedItems.length} медиа загружено`,
    );
  };

  const persistMedia = async (nextMedia: UploadedMediaItem[], successMessage: string) => {
    setUploadStatus('Сохраняем медиа...');
    const saved = await onChangeMedia(nextMedia);
    setUploadStatus(saved ? successMessage : 'Не удалось сохранить медиа. Проверьте сеть.');
    return saved;
  };

  const getRoleLabel = (item: UploadedMediaItem) => {
    if (item.role === 'main') return 'Главное';
    if (item.role === 'cover') return 'Обложка';
    if (item.role === 'story') return 'Stories';
    return item.type === 'video' ? 'Reels' : 'Фото';
  };

  const updateItem = async (
    id: string,
    patch: Partial<UploadedMediaItem>,
    successMessage = 'Медиа сохранены',
  ) => {
    const nextMedia: UploadedMediaItem[] = media.map((item) => {
      if (item.id === id) {
        return { ...item, ...patch };
      }
      if (patch.role === 'main' && item.role === 'main') {
        const role: UploadedMediaItem['role'] = item.type === 'video' ? 'reels' : 'profile';
        return { ...item, role };
      }
      if (patch.role === 'cover' && item.role === 'cover') {
        const role: UploadedMediaItem['role'] = item.type === 'video' ? 'reels' : 'profile';
        return { ...item, role };
      }
      return item;
    });
    await persistMedia(nextMedia, successMessage);
  };

  const moveItem = (id: string, direction: -1 | 1) => {
    const index = media.findIndex((item) => item.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= media.length) {
      return;
    }
    const nextMedia = [...media];
    const [item] = nextMedia.splice(index, 1);
    nextMedia.splice(targetIndex, 0, item);
    void persistMedia(nextMedia, 'Порядок медиа сохранен');
  };

  const removeItem = (id: string) => {
    if (pendingMedia.some((item) => item.id === id)) {
      retryUploads.current.delete(id);
      setPendingMedia((current) => current.filter((item) => item.id !== id));
      setUploadStatus('Локальная загрузка убрана');
      return;
    }
    void persistMedia(media.filter((item) => item.id !== id), 'Медиа удалено');
  };

  const publishSelected = () => {
    if (!publishableSelected.length) {
      setUploadStatus(
        media.some((item) => item.selected && item.status === 'failed')
          ? 'Сначала повторите неудачную загрузку'
          : 'Выберите загруженное медиа для публикации',
      );
      return;
    }
    void persistMedia(
      media.map((item) =>
        item.selected && item.status === 'ready'
          ? { ...item, status: 'uploaded' as const }
          : item,
      ),
      'Выбранные медиа опубликованы',
    );
  };

  const unpublishSelected = () => {
    if (!media.some((item) => item.selected)) {
      setUploadStatus('Выберите медиа для снятия с публикации');
      return;
    }
    void persistMedia(
      media.map((item) =>
        item.selected ? { ...item, status: 'ready' as const } : item,
      ),
      'Выбранные медиа сняты с публикации',
    );
  };

  const saveCaptions = () => {
    void persistMedia(
      media.map((item) => ({
        ...item,
        caption: captionDrafts[item.id]?.trim() || undefined,
      })),
      'Подписи сохранены',
    );
  };

  return (
    <View style={styles.mediaSettingsWrap}>
      <Pressable
        accessibilityRole="button"
        onPress={() => pickMedia(['videos'])}
        style={({ pressed }) => [
          styles.mediaMainTile,
          pressed && styles.pressed,
        ]}
      >
        {mainMedia?.type === 'image' ? (
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={getUploadedMediaImageSource(mainMedia)}
            style={styles.mediaMainImage}
          />
        ) : mainMedia ? (
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={getUploadedMediaImageSource(mainMedia)}
            style={styles.mediaMainImage}
          />
        ) : (
          <View style={[styles.mediaMainImage, styles.mediaTileMuted]} />
        )}
        <View style={styles.mediaTileShade} />
        <View style={styles.mediaMainCopy}>
          <Text style={styles.mediaMainLabel}>Главное видео</Text>
          <Text style={styles.mediaMainTitle}>
            {mainMedia ? mainMedia.fileName : 'Загрузить первое видео'}
          </Text>
          <Text style={styles.mediaMainStatus}>
            {media.length ? `${uploadedCount}/${media.length} опубликовано` : 'Фото и видео добавляются вручную'}
          </Text>
        </View>
        <View style={styles.mediaUploadBadge}>
          <Upload color={colors.surface} size={18} strokeWidth={2.2} />
        </View>
      </Pressable>

      <View style={styles.mediaActionRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => pickMedia(['images'])}
          style={[styles.mediaActionButton, styles.mediaPickerActionButton]}
        >
          <ImagePlus color={colors.surface} size={18} strokeWidth={2.2} />
          <Text numberOfLines={2} style={[styles.mediaActionText, styles.mediaPickerActionText]}>Добавить фото</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => pickMedia(['videos'])}
          style={[styles.mediaActionButton, styles.mediaPickerActionButton]}
        >
          <Camera color={colors.surface} size={18} strokeWidth={2.2} />
          <Text numberOfLines={2} style={[styles.mediaActionText, styles.mediaPickerActionText]}>Добавить видео</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => pickMedia(['images', 'videos'], 'story')}
          style={[styles.mediaActionButton, styles.mediaPickerActionButton]}
        >
          <Sparkles color={colors.surface} size={18} strokeWidth={2.2} />
          <Text numberOfLines={2} style={[styles.mediaActionText, styles.mediaPickerActionText]}>Добавить сторис</Text>
        </Pressable>
      </View>
      {uploadStatus ? (
        <Text style={styles.mediaUploadStatus}>{uploadStatus}</Text>
      ) : null}

      {media.length ? (
        <View style={styles.mediaActionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: publishableSelected.length === 0 }}
            disabled={publishableSelected.length === 0}
            onPress={publishSelected}
            style={[
              styles.mediaPublishButton,
              publishableSelected.length === 0 && styles.disabledButton,
            ]}
          >
            <Check color={colors.surface} size={19} strokeWidth={2.3} />
            <Text style={styles.mediaActionText}>Опубликовать выбранное</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={unpublishSelected}
            style={styles.mediaActionButton}
          >
            <X color={colors.surface} size={19} strokeWidth={2.3} />
            <Text style={styles.mediaActionText}>В черновики</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.mediaGrid}>
        {visibleMedia.map((item) => {
          const persistedIndex = media.findIndex((mediaItem) => mediaItem.id === item.id);
          const isPersisted = persistedIndex >= 0;
          const isTransient =
            item.status === 'uploading' ||
            item.status === 'processing' ||
            item.status === 'failed';
          const canMoveUp = isPersisted && persistedIndex > 0;
          const canMoveDown = isPersisted && persistedIndex < media.length - 1;
          return (
            <View
              key={item.id}
              style={[
                styles.mediaTile,
                item.selected && styles.mediaTileSelected,
              ]}
            >
              {item.type === 'image' ? (
                <Image
                  accessibilityIgnoresInvertColors
                  resizeMode="cover"
                  source={getUploadedMediaImageSource(item)}
                  style={styles.mediaTileImage}
                />
              ) : (
                <>
                  <Image
                    accessibilityIgnoresInvertColors
                    resizeMode="cover"
                    source={getUploadedMediaImageSource(item)}
                    style={styles.mediaTileImage}
                  />
                  <View style={styles.mediaVideoPlayMark}>
                    <Play color={colors.surface} fill={colors.surface} size={24} />
                  </View>
                </>
              )}
              <View style={styles.mediaTileShade} />
              <Text style={styles.mediaTileType}>
                {getRoleLabel(item)}
              </Text>
              {isPersisted ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.selected ? 'Снять выбор' : 'Выбрать'} ${item.fileName}`}
                  onPress={() =>
                    void updateItem(
                      item.id,
                      { selected: !item.selected },
                      item.selected ? 'Медиа снято с выбора' : 'Медиа выбрано',
                    )
                  }
                  style={[
                    styles.importCheck,
                    item.selected && styles.importCheckSelected,
                  ]}
                >
                  {item.selected ? (
                    <Check color={colors.surface} size={18} strokeWidth={3} />
                  ) : null}
                </Pressable>
              ) : null}
              {!isTransient ? (
                <View style={styles.mediaTileActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Сделать ${item.fileName} главным медиа`}
                    onPress={() => void updateItem(item.id, { role: 'main', selected: true })}
                    style={styles.mediaTileActionButton}
                  >
                    <Text style={styles.mediaTileActionText}>Главное</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Сделать ${item.fileName} обложкой`}
                    onPress={() => void updateItem(item.id, { role: 'cover', selected: true })}
                    style={styles.mediaTileActionButton}
                  >
                    <Text style={styles.mediaTileActionText}>Обложка</Text>
                  </Pressable>
                </View>
              ) : item.status === 'failed' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Повторить загрузку ${item.fileName}`}
                  onPress={() => retryUpload(item.id)}
                  style={styles.mediaRetryButton}
                >
                  <Text style={styles.mediaRetryText}>Повторить</Text>
                </Pressable>
              ) : null}
              {isPersisted ? (
                <View style={styles.mediaTileOrderActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Поднять ${item.fileName} выше`}
                    disabled={!canMoveUp}
                    onPress={() => moveItem(item.id, -1)}
                    style={[
                      styles.mediaTileOrderButton,
                      !canMoveUp && styles.disabledButton,
                    ]}
                  >
                    <ChevronLeft color={colors.surface} size={14} strokeWidth={2.4} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Опустить ${item.fileName} ниже`}
                    disabled={!canMoveDown}
                    onPress={() => moveItem(item.id, 1)}
                    style={[
                      styles.mediaTileOrderButton,
                      !canMoveDown && styles.disabledButton,
                    ]}
                  >
                    <ChevronRight color={colors.surface} size={14} strokeWidth={2.4} />
                  </Pressable>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Удалить ${item.fileName}`}
                onPress={() => removeItem(item.id)}
                style={styles.mediaRemoveButton}
              >
                <Text style={styles.mediaRemoveText}>Убрать</Text>
              </Pressable>
              {(item.status === 'uploading' || item.status === 'processing') ? (
                <View style={styles.mediaProgressTrack}>
                  <View
                    style={[
                      styles.mediaProgressFill,
                      { width: `${Math.min(100, Math.max(1, item.uploadProgress ?? 1))}%` },
                    ]}
                  />
                </View>
              ) : null}
              <Text style={styles.mediaTileStatus}>
                {getMediaStatusLabel(item)}
              </Text>
            </View>
          );
        })}
        {visibleMedia.length === 0 ? (
          <View style={styles.requestsTemplateCard}>
            <Text style={styles.requestsTemplateTitle}>Медиа пока нет</Text>
            <Text style={styles.requestsTemplateText}>
              Добавьте фото или видео. После загрузки они появятся в профиле, Reels и статистике.
            </Text>
          </View>
        ) : null}
      </View>

      {media.length ? (
        <View style={styles.mediaSettingsWrap}>
          <Text style={styles.vendorDashboardCardTitle}>Подписи к постам</Text>
          {media.map((item) => (
            <View key={`${item.id}-caption`} style={styles.draftInputRow}>
              <Text style={styles.draftInputLabel}>
                {item.type === 'video' ? 'Видео' : 'Фото'} · {item.fileName}
              </Text>
              <TextInput
                placeholder="Описание под постом или видео"
                placeholderTextColor="#A8A8A8"
                style={styles.draftInput}
                value={captionDrafts[item.id] ?? ''}
                onChangeText={(caption) =>
                  setCaptionDrafts((current) => ({
                    ...current,
                    [item.id]: caption,
                  }))
                }
              />
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={saveCaptions}
            style={styles.mediaPublishButton}
          >
            <Check color={colors.surface} size={19} strokeWidth={2.3} />
            <Text style={styles.mediaActionText}>Сохранить подписи</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => pickMedia(['images', 'videos'])}
        style={styles.instagramImportButton}
      >
        <Upload color={colors.surface} size={20} strokeWidth={2.2} />
        <Text style={styles.instagramImportButtonText}>
          Загрузить фото и видео вручную
        </Text>
      </Pressable>
    </View>
  );
}

function getReadableUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  if (/SignatureDoesNotMatch|S3 upload|AccessDenied|InvalidAccessKey/i.test(message)) {
    return 'Сервис загрузки не подтвердил файл. Повторите через минуту.';
  }
  if (/too large|больше 15 МБ|Upload too large/i.test(message)) {
    return 'Файл слишком большой.';
  }
  if (/network|fetch|abort|timeout/i.test(message)) {
    return 'Нет соединения с сервером. Проверьте сеть и повторите.';
  }
  return message.slice(0, 180) || 'Ошибка загрузки';
}

function hideBlockedCommentAuthors(vendor: Vendor, blockedUserIds: string[]): Vendor {
  if (!blockedUserIds.length) return vendor;
  const blocked = new Set(blockedUserIds);
  const filterComments = <T extends { authorId?: string }>(comments: T[] = []) =>
    comments.filter((comment) => !comment.authorId || !blocked.has(comment.authorId));
  const media = vendor.media?.map((item) => {
    const comments = filterComments(item.comments);
    return { ...item, comments, commentCount: comments.length };
  });
  const mediaStats = Object.fromEntries(
    Object.entries(vendor.mediaStats ?? {}).map(([mediaId, stats]) => {
      const comments = filterComments(stats.comments);
      return [mediaId, { ...stats, comments, commentCount: comments.length }];
    }),
  );
  return { ...vendor, media, mediaStats };
}

function getSettingFields(label: string) {
  const map: Record<string, string[]> = {
    Профиль: [
      'Название',
      'Категория',
      'Город',
      'Языки работы',
      'Короткое описание',
      'Опыт, лет',
      'WhatsApp',
    ],
    Медиа: [
      'Главное видео',
      'Обложка профиля',
      'Фото портфолио',
      'Видео / Reels',
      'Скрыть / показать медиа',
      'Импортировать из Instagram',
    ],
    Instagram: [
      'Instagram аккаунт',
      'Статус подключения',
      'Последняя синхронизация',
      'Что импортировать',
      'Автообновление',
      'Выбранные посты',
      'Отключить Instagram',
      'Повторить синхронизацию',
    ],
    'Услуги и цены': [
      'Основная услуга',
      'Цена от',
      'Пакет базовый, цена',
      'Состав базового',
      'Пакет стандарт, цена',
      'Состав стандартного',
      'Пакет премиум, цена',
      'Состав премиального',
      'Доп. услуги',
      'Предоплата, %',
    ],
    Даты: [
      'Календарь занятости',
      'Ближайшая свободная дата',
      'Автоответ если дата занята',
    ],
    Статистика: [
      'Просмотры профиля',
      'Просмотры видео',
      'Лайки',
      'Сохранения',
      'Клики WhatsApp',
      'Конверсия в заявку',
      'Популярные медиа',
      'Период отчета',
      'Цель',
    ],
    Уведомления: [
      'Новая заявка',
      'Сообщение клиента',
      'Напоминание о дате',
      'Отзыв оставлен',
    ],
    Документы: [
      'Тип аккаунта',
      'ИИН / БИН',
      'Название юрлица',
      'Реквизиты',
      'Статус верификации',
      'Комментарий модератора',
    ],
    Настройки: [
      'Язык',
      'Почта',
      'Телефон',
    ],
  };
  return map[label] ?? ['Поле 1', 'Поле 2', 'Комментарий'];
}

function getSettingFormDefaults(
  label: string,
  vendorDraft: VendorDraft,
  savedValues?: Record<string, string>,
) {
  const defaults: Record<string, Record<string, string>> = {
    Профиль: {
      Название: vendorDraft.name,
      Категория: vendorDraft.category,
      Город: vendorDraft.city,
      'Языки работы': vendorDraft.languages ?? '',
      'Короткое описание': vendorDraft.description ?? '',
      'Опыт, лет': vendorDraft.experience ?? '',
      WhatsApp: vendorDraft.phone,
    },
    Медиа: {
      'Главное видео': 'Видео с банкета',
      'Обложка профиля': 'Кадр с микрофоном',
      'Фото портфолио': '12 фото',
      'Видео / Reels': '7 видео',
      'Скрыть / показать медиа': 'Показывать',
      'Импортировать из Instagram': 'Включено',
    },
    Instagram: {
      'Instagram аккаунт': '',
      'Статус подключения': '',
      'Последняя синхронизация': '',
      'Что импортировать': 'Посты, Reels, фото',
      Автообновление: '',
      'Выбранные посты': '',
      'Отключить Instagram': 'Нет',
      'Повторить синхронизацию': '',
    },
    'Услуги и цены': {
      'Основная услуга': vendorDraft.category,
      'Цена от': vendorDraft.priceFrom,
      'Пакет базовый, цена': vendorDraft.basePackagePrice ?? vendorDraft.priceFrom,
      'Состав базового': vendorDraft.basePackageDetails ?? vendorDraft.basePackage ?? vendorDraft.included ?? '',
      'Пакет стандарт, цена': vendorDraft.standardPackagePrice ?? '',
      'Состав стандартного': vendorDraft.standardPackageDetails ?? vendorDraft.standardPackage ?? '',
      'Пакет премиум, цена': vendorDraft.premiumPackagePrice ?? '',
      'Состав премиального': vendorDraft.premiumPackageDetails ?? vendorDraft.premiumPackage ?? '',
      'Доп. услуги': vendorDraft.extraServices ?? '',
      'Предоплата, %': vendorDraft.prepayment ?? '',
    },
    Даты: {
      'Календарь занятости': 'Подключен',
      'Ближайшая свободная дата': getFutureRussianDate(8),
      'Автоответ если дата занята': 'Предложить ближайшие даты',
    },
    Уведомления: {
      'Новая заявка': 'Включено',
      'Сообщение клиента': 'Включено',
      'Напоминание о дате': 'Включено',
      'Отзыв оставлен': 'Включено',
    },
    Настройки: {
      Язык: 'Русский',
      Почта: '',
      Телефон: vendorDraft.phone,
    },
    Документы: {
      'Тип аккаунта': '',
      'ИИН / БИН': '',
      'Название юрлица': '',
      Реквизиты: '',
      'Статус верификации': 'Не отправлено',
      'Комментарий модератора': '',
    },
  };
  return {
    ...(defaults[label] ?? {}),
    ...(savedValues ?? {}),
  };
}

function getVendorDraftFromSettings(
  label: string,
  values: Record<string, string>,
  current: VendorDraft,
) {
  if (label === 'Профиль') {
    return {
      ...current,
      name: values['Название'] ?? current.name,
      category: values['Категория'] ?? current.category,
      city: values['Город'] ?? current.city,
      languages: values['Языки работы'] ?? current.languages,
      description: values['Короткое описание'] ?? current.description,
      experience: values['Опыт, лет'] ?? current.experience,
      phone: values['WhatsApp'] ?? current.phone,
    };
  }

  if (label === 'Услуги и цены') {
    return {
      ...current,
      category: values['Основная услуга'] || current.category,
      priceFrom: values['Цена от'] ?? current.priceFrom,
      basePackagePrice: values['Пакет базовый, цена'] ?? current.basePackagePrice,
      basePackageDetails: values['Состав базового'] ?? current.basePackageDetails,
      standardPackagePrice: values['Пакет стандарт, цена'] ?? current.standardPackagePrice,
      standardPackageDetails: values['Состав стандартного'] ?? current.standardPackageDetails,
      premiumPackagePrice: values['Пакет премиум, цена'] ?? current.premiumPackagePrice,
      premiumPackageDetails: values['Состав премиального'] ?? current.premiumPackageDetails,
      extraServices: values['Доп. услуги'] ?? current.extraServices,
      prepayment: values['Предоплата, %'] ?? current.prepayment,
    };
  }

  if (label === 'Настройки') {
    return {
      ...current,
      phone: values.Телефон ?? current.phone,
    };
  }

  return undefined;
}

function getClientProfileFromSettings(
  label: string,
  values: Record<string, string>,
  current: ClientProfileDraft,
) {
  if (label === 'Профиль') {
    return {
      ...current,
      name: values['Имя'] ?? current.name,
      phone: values['Телефон'] ?? current.phone,
      city: values['Город'] ?? current.city,
    };
  }

  if (label === 'Уведомления') {
    return {
      ...current,
      notifications:
        values['Ответ подрядчика'] ||
        values['Подтверждение брони'] ||
        values['Напоминание об оплате'] ||
        current.notifications,
    };
  }

  if (label === 'Настройки') {
    return {
      ...current,
      language: values['Язык'] ?? current.language,
    };
  }

  return undefined;
}

function getVendorStatsSnapshot({
  analytics,
  bookings,
  busyDates,
  uploadedMedia,
}: {
  analytics: VendorAnalyticsSnapshot;
  bookings: ClientBooking[];
  busyDates: string[];
  uploadedMedia: UploadedMediaItem[];
}): VendorStatsSnapshot {
  const now = new Date();
  const activityBars = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (6 - index));
    const iso = formatIsoDate(day);
    return bookings.filter((booking) =>
      String(booking.createdAt || booking.date).startsWith(iso),
    ).length;
  });
  const reelCount = uploadedMedia.filter((item) => item.type === 'video').length;
  return {
    profileViews: analytics.profileViews,
    mediaViews: analytics.mediaViews,
    saves: analytics.saves,
    whatsappClicks: analytics.whatsappClicks,
    requests: bookings.length,
    newRequests: bookings.filter((booking) =>
      ['Ожидает подтверждения', 'Новая'].includes(booking.status),
    ).length,
    inWorkRequests: bookings.filter((booking) => booking.status === 'В работе').length,
    doneRequests: bookings.filter((booking) =>
      ['Подтверждена', 'Закрыто', 'Закрыта'].includes(booking.status),
    ).length,
    mediaCount: uploadedMedia.length,
    reelCount,
    photoCount: uploadedMedia.length - reelCount,
    busyDateCount: busyDates.length,
    activityBars,
  };
}

function mergeVendorDraftIntoVendor(
  baseVendor: Vendor,
  draft: VendorDraft,
  media: UploadedMediaItem[],
  busyDates: string[] = [],
  freeDates: string[] = [],
): Vendor {
  const priceFrom = parseMoneyValue(draft.priceFrom) || baseVendor.priceFrom || 0;
  const experience = Number(draft.experience) || 0;
  const packageBasePrice = priceFrom || 0;
  const packages = [
    draft.basePackageDetails || draft.basePackage
      ? {
          name: 'Базовый',
          price: parseMoneyValue(draft.basePackagePrice) || packageBasePrice,
          details: draft.basePackageDetails || draft.basePackage || '',
        }
      : null,
    draft.standardPackageDetails || draft.standardPackage
      ? {
          name: 'Стандарт',
          price: parseMoneyValue(draft.standardPackagePrice) || Math.round(packageBasePrice * 1.5),
          details: draft.standardPackageDetails || draft.standardPackage || '',
        }
      : null,
    draft.premiumPackageDetails || draft.premiumPackage
      ? {
          name: 'Премиум',
          price: parseMoneyValue(draft.premiumPackagePrice) || Math.round(packageBasePrice * 2),
          details: draft.premiumPackageDetails || draft.premiumPackage || '',
        }
      : null,
  ].filter(Boolean) as Vendor['packages'];

  return {
    ...baseVendor,
    name: draft.name || baseVendor.name,
    category: draft.category || baseVendor.category,
    city: draft.city || baseVendor.city,
    priceFrom,
    contactPhone: draft.phone || baseVendor.contactPhone,
    rating: 0,
    experience,
    weddings: 0,
    availability: `Свободен ${formatRussianDayMonth(
      parseIsoDate(
        [...freeDates].sort()[0] || getNearestFreeIsoDate(new Set(busyDates)),
      ),
    )}`,
    portfolioCount: media.length,
    reviewCount: 0,
    reviews: [],
    description:
      draft.description ||
      draft.included ||
      'Описание появится после заполнения профиля поставщика.',
    portfolioImageKeys: media.length ? baseVendor.portfolioImageKeys : [],
    packages,
  };
}

function getFunnelWidth(value: number, total: number): `${number}%` {
  if (!total || !value) return '0%';
  return `${Math.max(4, Math.min(100, Math.round((value / total) * 100)))}%`;
}

function formatCompactNumber(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace('.', ',')} тыс.`;
  }
  return String(value);
}

function parseMoneyValue(value: string | number | undefined | null) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value || '').replace(/[^\d]/g, '');
  return Number(normalized) || 0;
}

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, '');
}

function formatMoneyInput(value: string | number | undefined | null) {
  const digits = digitsOnly(String(value ?? ''));
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatMoneyText(value: string | number | undefined | null) {
  const raw = String(value ?? '').trim();
  const amount = parseMoneyValue(raw);
  if (!amount) return raw;
  const prefix = /^от\b/i.test(raw) ? 'от ' : '';
  return `${prefix}${formatMoneyInput(amount)} ₸`;
}

function isConfirmedBookingStatus(status: string) {
  return ['Подтверждена', 'В работе', 'Закрыта', 'Закрыто'].includes(status);
}

function pluralizeRu(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function getCompactBookingStatus(status: string) {
  return status === 'Ожидает подтверждения' ? 'Ожидает' : status;
}

function formatDateInput(value: string) {
  const digits = digitsOnly(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

function formatClientEventDate(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

function formatStoredDate(value: string) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
}

function toDisplayEventDraft(draft: EventDraft): EventDraft {
  return { ...draft, date: formatStoredDate(draft.date) };
}

function parseClientEventDate(value: string) {
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const match = isoMatch
    ? [isoMatch[0], isoMatch[3], isoMatch[2], isoMatch[1]]
    : value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function isClientEventPast(value: string) {
  const date = parseClientEventDate(value);
  if (!date) return false;
  const today = getAppTodayDate();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
}

function eventHasContent(eventDraft: EventDraft) {
  return Object.values(eventDraft).some((value) => String(value || '').trim());
}

function getEventDraftFromHistory(event: ClientEvent): EventDraft {
  return {
    type: event.type,
    date: event.date,
    city: event.city,
    guests: event.guests,
    budget: event.budget,
    place: event.place,
    comment: event.comment,
  };
}

function formatMoneyValue(value: number) {
  return value ? `${formatMoneyInput(value)} ₸` : '0 ₸';
}

function getAppTodayDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Almaty',
    year: 'numeric',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const today = new Date(Number(values.year), Number(values.month) - 1, Number(values.day));
  today.setHours(0, 0, 0, 0);
  return today;
}

function formatIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function formatRussianDayMonth(date: Date) {
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

function getNearestFreeIsoDate(
  busyDateSet: Set<string>,
  todayIso = formatIsoDate(getAppTodayDate()),
  freeDateSet: Set<string> = new Set(),
) {
  const markedFreeDates = Array.from(freeDateSet)
    .filter((date) => date >= todayIso && !busyDateSet.has(date))
    .sort();
  if (markedFreeDates.length) {
    return markedFreeDates[0];
  }
  const date = parseIsoDate(todayIso);
  date.setHours(0, 0, 0, 0);
  for (let offset = 0; offset < 370; offset += 1) {
    const candidate = new Date(date);
    candidate.setDate(date.getDate() + offset);
    const iso = formatIsoDate(candidate);
    if (!busyDateSet.has(iso)) {
      return iso;
    }
  }
  return formatIsoDate(date);
}

function getFutureRussianDate(daysAhead: number) {
  const date = getAppTodayDate();
  date.setDate(date.getDate() + daysAhead);
  return formatRussianDayMonth(date);
}

function VendorStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.vendorStatItem}>
      <Text style={styles.vendorStatValue}>{value}</Text>
      <Text style={styles.vendorStatLabel}>{label}</Text>
    </View>
  );
}

function CategorySelect({
  categories,
  onSelect,
  onToggle,
  open,
  selectedCategory,
}: {
  categories: string[];
  onSelect: (category: string) => void;
  onToggle: () => void;
  open: boolean;
  selectedCategory: string;
}) {
  return (
    <View style={styles.draftInputRow}>
      <Text style={styles.draftInputLabel}>Категория</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        style={({ pressed }) => [
          styles.categorySelectButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.categorySelectText}>{selectedCategory}</Text>
        <ChevronDown color="#DDE3E8" size={20} strokeWidth={2.2} />
      </Pressable>
      {open ? (
        <View style={styles.categorySelectMenu}>
          {categories.map((category) => {
            const active = category === selectedCategory;
            return (
              <Pressable
                key={category}
                accessibilityRole="button"
                onPress={() => onSelect(category)}
                style={({ pressed }) => [
                  styles.categorySelectOption,
                  active && styles.categorySelectOptionActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.categorySelectOptionText,
                    active && styles.categorySelectOptionTextActive,
                  ]}
                >
                  {category}
                </Text>
                {active ? (
                  <Check color={colors.surface} size={16} strokeWidth={3} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function DraftInput({
  keyboardType = 'default',
  label,
  maxLength,
  multiline = false,
  numberOfLines,
  onChangeText,
  placeholder,
  value,
}: {
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  label: string;
  maxLength?: number;
  multiline?: boolean;
  numberOfLines?: number;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <View style={styles.draftInputRow}>
      <Text style={styles.draftInputLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={numberOfLines}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A8A8A8"
        style={[styles.draftInput, multiline && styles.draftVenueInput]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
    </View>
  );
}

function VenueDraftInput({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [name = '', ...addressParts] = String(value || '').split(/\r?\n/);
  const address = addressParts.join(' ');
  const update = (nextName: string, nextAddress: string) => {
    onChange(`${nextName.replace(/[\r\n]+/g, ' ')}\n${nextAddress.replace(/[\r\n]+/g, ' ')}`);
  };

  return (
    <View style={styles.draftInputRow}>
      <Text style={styles.draftInputLabel}>Площадка</Text>
      <View style={styles.draftVenueFields}>
        <TextInput
          accessibilityLabel="Название площадки"
          maxLength={70}
          numberOfLines={1}
          onChangeText={(nextName) => update(nextName, address)}
          placeholder="Название площадки"
          placeholderTextColor="#A8A8A8"
          style={styles.draftInput}
          value={name}
        />
        <TextInput
          accessibilityLabel="Полный адрес площадки"
          maxLength={120}
          numberOfLines={1}
          onChangeText={(nextAddress) => update(name, nextAddress)}
          placeholder="Полный адрес"
          placeholderTextColor="#A8A8A8"
          style={styles.draftInput}
          value={address}
        />
      </View>
    </View>
  );
}

function SettingsFieldControl({
  label,
  onChange,
  settingLabel,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  settingLabel: string;
  value: string;
}) {
  const serverOwnedField =
    (settingLabel === 'Бюджет' && ['Забронировано', 'Осталось'].includes(label)) ||
    (settingLabel === 'Документы' &&
      ['Статус верификации', 'Комментарий модератора'].includes(label));
  if (label === 'Почта' || serverOwnedField) {
    return <ReadOnlySettingsField label={label} value={value} />;
  }

  if (settingLabel === 'Уведомления') {
    return (
      <ToggleSettingsField
        label={label}
        onChange={onChange}
        value={value || 'Включено'}
      />
    );
  }

  const dropdownOptions =
    label === 'Тип мероприятия'
      ? CLIENT_EVENT_TYPES
      : label === 'Категория'
        ? mockCategories
        : label === 'Город'
          ? KAZAKHSTAN_MAJOR_CITIES
          : label === 'Языки работы'
            ? WORK_LANGUAGES
            : label === 'Язык'
              ? INTERFACE_LANGUAGES
              : null;

  if (dropdownOptions) {
    return (
      <EventDropdownField
        label={label}
        options={dropdownOptions}
        placeholder="Выберите"
        value={value}
        onChange={onChange}
      />
    );
  }

  if (label === 'Площадка') {
    return <VenueDraftInput onChange={onChange} value={value} />;
  }

  const moneyLabels = new Set([
    'Бюджет',
    'Цена от',
    'Пакет базовый, цена',
    'Пакет стандарт, цена',
    'Пакет премиум, цена',
    'Общий бюджет',
    'Забронировано',
    'Осталось',
  ]);
  const numericLabels = new Set(['Количество гостей', 'Опыт, лет', 'Предоплата, %']);
  const phoneLabels = new Set(['Телефон', 'WhatsApp']);
  const isDate = label === 'Дата мероприятия';
  const isMoney = moneyLabels.has(label);

  return (
    <DraftInput
      keyboardType={isDate || isMoney || numericLabels.has(label) ? 'numeric' : phoneLabels.has(label) ? 'phone-pad' : 'default'}
      label={label}
      onChangeText={(nextValue) => {
        if (isDate) {
          onChange(formatDateInput(nextValue));
          return;
        }
        if (isMoney) {
          onChange(formatMoneyInput(nextValue));
          return;
        }
        if (numericLabels.has(label)) {
          const digits = digitsOnly(nextValue);
          onChange(label === 'Предоплата, %' ? String(Math.min(100, Number(digits || 0))) : digits);
          return;
        }
        onChange(nextValue);
      }}
      value={isMoney ? formatMoneyInput(value) : value}
    />
  );
}

function ToggleSettingsField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const enabled = !/(отключ|выкл|off|disabled|нет)/i.test(value || '');
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      onPress={() => onChange(enabled ? 'Отключено' : 'Включено')}
      style={({ pressed }) => [
        styles.settingsToggleRow,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.settingsToggleLabel}>{label}</Text>
      <View
        style={[
          styles.settingsSwitchTrack,
          enabled && styles.settingsSwitchTrackActive,
        ]}
      >
        <View
          style={[
            styles.settingsSwitchKnob,
            enabled && styles.settingsSwitchKnobActive,
          ]}
        />
      </View>
    </Pressable>
  );
}

function ReadOnlySettingsField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.settingsReadOnlyRow}>
      <Text style={styles.draftInputLabel}>{label}</Text>
      <Text style={styles.settingsReadOnlyValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function AccountSettingsActions({
  email,
}: {
  email: string;
}) {
  const [resetOpen, setResetOpen] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState('');
  const requestReset = async () => {
    setStatus('Отправляем код...');
    const sent = await requestPasswordResetEmail(email);
    if (sent) {
      setResetOpen(true);
      setStatus('Код отправлен на почту');
    } else {
      setStatus('Не удалось отправить код. Проверьте сеть.');
    }
  };
  const confirmReset = async () => {
    if (newPassword.length < 6) {
      setStatus('Пароль минимум 6 символов');
      return;
    }
    setStatus('Меняем пароль...');
    const saved = await confirmPasswordReset(email, resetCode, newPassword);
    if (saved) {
      setResetCode('');
      setNewPassword('');
      setResetOpen(false);
      setStatus('Пароль изменен');
      return;
    }
    setStatus('Код неверный или устарел');
  };

  return (
    <View style={styles.settingsAccountActions}>
      <Pressable
        accessibilityRole="button"
        onPress={requestReset}
        style={({ pressed }) => [
          styles.settingsSecondaryAction,
          pressed && styles.pressed,
        ]}
      >
        <KeyRound color={colors.surface} size={19} strokeWidth={2.2} />
        <Text style={styles.settingsSecondaryActionText}>Сменить пароль</Text>
      </Pressable>
      {resetOpen ? (
        <View style={styles.settingsPasswordPanel}>
          <DraftInput
            keyboardType="numeric"
            label="Код из письма"
            onChangeText={(value) => setResetCode(digitsOnly(value).slice(0, 6))}
            value={resetCode}
          />
          <View style={styles.draftInputRow}>
            <Text style={styles.draftInputLabel}>Новый пароль</Text>
            <TextInput
              secureTextEntry
              onChangeText={setNewPassword}
              placeholderTextColor="#A8A8A8"
              style={styles.draftInput}
              value={newPassword}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={confirmReset}
            style={({ pressed }) => [
              styles.vendorSettingSaveButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.vendorSettingSaveText}>Сохранить пароль</Text>
          </Pressable>
        </View>
      ) : null}
      {status ? <Text style={styles.mediaUploadStatus}>{status}</Text> : null}
    </View>
  );
}

function DeleteAccountButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.vendorSettingsLogout,
        pressed && styles.pressed,
      ]}
    >
      <X color={colors.coral} size={20} strokeWidth={2.2} />
      <Text style={styles.vendorSettingsLogoutText}>Удалить аккаунт</Text>
    </Pressable>
  );
}

function RoleOption({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleOption,
        active && styles.roleOptionActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.roleOptionText, active && styles.roleOptionTextActive]}>
        {label}
      </Text>
      {active ? <Check color={colors.surface} size={18} strokeWidth={3} /> : null}
    </Pressable>
  );
}

function getInitialPhase(): AppPhase {
  if (shouldResetFirstRun()) {
    clearSession();
    clearGuestCatalogSeenCookie();
    return 'auth';
  }

  try {
    const storage =
      globalThis.localStorage ??
      (typeof window !== 'undefined' ? window.localStorage : undefined);
    return storage?.getItem(APP_PROFILE_CREATED_KEY) === '1' ? 'app' : 'auth';
  } catch {
    return 'auth';
  }
}

function shouldResetFirstRun() {
  if (!isWebRuntime || typeof window === 'undefined' || !window.location) {
    return false;
  }

  return new URLSearchParams(window.location.search).has('first');
}

function getStoredRole(): Role | null {
  try {
    const storage =
      globalThis.localStorage ??
      (typeof window !== 'undefined' ? window.localStorage : undefined);
    const storedRole = storage?.getItem(APP_ROLE_KEY);
    return storedRole === 'client' || storedRole === 'vendor' ? storedRole : null;
  } catch {
    return null;
  }
}

function getStoredUserId() {
  try {
    const storage =
      globalThis.localStorage ??
      (typeof window !== 'undefined' ? window.localStorage : undefined);
    return storage?.getItem(APP_USER_ID_KEY) ?? null;
  } catch {
    return null;
  }
}

function getStoredAuthTokenSync() {
  try {
    const storage =
      globalThis.localStorage ??
      (typeof window !== 'undefined' ? window.localStorage : undefined);
    return storage?.getItem(APP_AUTH_TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

function saveUserId(userId: string) {
  try {
    const storage =
      globalThis.localStorage ??
      (typeof window !== 'undefined' ? window.localStorage : undefined);
    storage?.setItem(APP_USER_ID_KEY, userId);
  } catch {
    // Preview storage can be unavailable.
  }
}

async function saveUserIdAsync(userId: string) {
  try {
    await AsyncStorage.setItem(APP_USER_ID_KEY, userId);
  } catch {
    // Native preview storage can be unavailable.
  }
}

async function persistAuthToken(token: string) {
  activeAuthToken = token;
  try {
    const storage =
      globalThis.localStorage ??
      (typeof window !== 'undefined' ? window.localStorage : undefined);
    storage?.setItem(APP_AUTH_TOKEN_KEY, token);
  } catch {
    // Web preview storage can be unavailable.
  }

  try {
    await SecureStore.setItemAsync(APP_AUTH_TOKEN_KEY, token);
  } catch {
    try {
      await AsyncStorage.setItem(APP_AUTH_TOKEN_KEY, token);
    } catch {
      // Native preview storage can be unavailable.
    }
  }
}

async function restoreStoredSession() {
  const syncUserId = getStoredUserId();
  const syncToken = getStoredAuthTokenSync();
  let asyncUserId: string | null = null;
  let asyncToken: string | null = null;

  try {
    asyncUserId = await AsyncStorage.getItem(APP_USER_ID_KEY);
  } catch {
    asyncUserId = null;
  }

  try {
    asyncToken = await SecureStore.getItemAsync(APP_AUTH_TOKEN_KEY);
  } catch {
    try {
      asyncToken = await AsyncStorage.getItem(APP_AUTH_TOKEN_KEY);
    } catch {
      asyncToken = null;
    }
  }

  return {
    authToken: asyncToken ?? syncToken,
    userId: asyncUserId ?? syncUserId,
  };
}

async function persistSession(role: Role, profileCreated = true) {
  try {
    const storage =
      globalThis.localStorage ??
      (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (profileCreated) {
      storage?.setItem(APP_PROFILE_CREATED_KEY, '1');
    } else {
      storage?.removeItem(APP_PROFILE_CREATED_KEY);
    }
    storage?.setItem(APP_ROLE_KEY, role);
  } catch {
    // Preview storage can be unavailable.
  }

  try {
    if (profileCreated) {
      await AsyncStorage.setItem(APP_PROFILE_CREATED_KEY, '1');
    } else {
      await AsyncStorage.removeItem(APP_PROFILE_CREATED_KEY);
    }
    await AsyncStorage.setItem(APP_ROLE_KEY, role);
  } catch {
    // Native preview storage can be unavailable.
  }
}

async function clearSession() {
  try {
    const storage =
      globalThis.localStorage ??
      (typeof window !== 'undefined' ? window.localStorage : undefined);
    storage?.removeItem(APP_PROFILE_CREATED_KEY);
    storage?.removeItem(APP_ROLE_KEY);
    storage?.removeItem(APP_USER_ID_KEY);
    storage?.removeItem(APP_AUTH_TOKEN_KEY);
    storage?.removeItem(GUEST_CATALOG_SEEN_KEY);
  } catch {
    // Preview storage can be unavailable.
  }

  activeAuthToken = null;
  try {
    await AsyncStorage.multiRemove([
      APP_PROFILE_CREATED_KEY,
      APP_ROLE_KEY,
      APP_USER_ID_KEY,
      APP_AUTH_TOKEN_KEY,
      GUEST_CATALOG_SEEN_KEY,
    ]);
  } catch {
    // Native preview storage can be unavailable.
  }

  try {
    await SecureStore.deleteItemAsync(APP_AUTH_TOKEN_KEY);
  } catch {
    // Native preview storage can be unavailable.
  }
}

function clearGuestCatalogSeenCookie() {
  if (typeof document === 'undefined') {
    return;
  }

  try {
    document.cookie = `${GUEST_CATALOG_SEEN_KEY}=; max-age=0; path=/; SameSite=Lax`;
  } catch {
    // Preview storage can be unavailable.
  }
}

async function apiRequest<T>(
  path: string,
  options: { body?: unknown; method?: string; token?: string | null } = {},
) {
  const token = options.token ?? activeAuthToken;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const method = options.method ?? 'GET';
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    void reportClientError(error, 'api_network', { method, path });
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let details = '';
    try {
      const payload = await response.json();
      details = String(payload.message || payload.error || payload.details || '');
    } catch {
      try {
        details = await response.text();
      } catch {
        details = '';
      }
    }
    const error = new Error(details || `API ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    if (response.status >= 500) {
      void reportClientError(error, 'api_response', {
        method,
        path,
        status: response.status,
      });
    }
    throw error;
  }

  return (await response.json()) as T;
}

async function apiFormRequest<T>(
  path: string,
  formData: FormData,
  options: { method?: string; token?: string | null } = {},
) {
  const token = options.token ?? activeAuthToken;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  const response = await expoFetch(`${API_URL}${path}`, {
    method: options.method ?? 'POST',
    signal: controller.signal,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    let details = '';
    try {
      const payload = await response.json();
      details = String(payload.message || payload.error || payload.details || '');
    } catch {
      try {
        details = await response.text();
      } catch {
        details = '';
      }
    }
    const error = new Error(details || `API ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}

async function uploadUserDocumentRemote(
  userId: string,
  asset: DocumentPicker.DocumentPickerAsset,
) {
  const mimeType = asset.mimeType || 'application/octet-stream';
  if (!isWebRuntime) {
    const nativeFile = new ExpoFile(asset.uri);
    const upload = nativeFile.createUploadTask(`${API_URL}/users/${userId}/documents`, {
      fieldName: 'file',
      headers: activeAuthToken ? { Authorization: `Bearer ${activeAuthToken}` } : {},
      httpMethod: 'POST',
      mimeType,
      parameters: { fileName: asset.name },
      uploadType: UploadType.MULTIPART,
    });
    const result = await upload.uploadAsync();
    if (result.status < 200 || result.status >= 300) {
      let message = result.body;
      try {
        const payload = JSON.parse(result.body);
        message = payload.error || payload.message || result.body;
      } catch {
        // Keep raw server response.
      }
      throw new Error(message || `API ${result.status}`);
    }
    return (JSON.parse(result.body) as { user: ApiUser }).user;
  }
  const formData = new FormData();
  const webFile = (asset as DocumentPicker.DocumentPickerAsset & { file?: File }).file;
  if (webFile) {
    formData.append('file', webFile, asset.name);
  } else {
    const response = await fetch(asset.uri);
    formData.append('file', await response.blob(), asset.name);
  }
  const result = await apiFormRequest<{ user: ApiUser }>(`/users/${userId}/documents`, formData);
  return result.user;
}

async function deleteUserDocumentRemote(userId: string, documentId: string) {
  const result = await apiRequest<{ user: ApiUser }>(
    `/users/${userId}/documents/${documentId}`,
    { method: 'DELETE' },
  );
  return result.user;
}

function setApiAuthToken(token: string | null) {
  activeAuthToken = token;
}

async function fetchBootstrap() {
  return apiRequest<{
    categories: string[];
    vendors: Vendor[];
    vendorSettings: typeof vendorSettings;
    instagramMedia: InstagramDraftMediaItem[];
  }>('/bootstrap');
}

function getPickedAssetType(asset: ImagePicker.ImagePickerAsset) {
  return asset.type === 'video' ? 'video' : 'image';
}

function getPickedAssetFileName(
  asset: ImagePicker.ImagePickerAsset,
  index: number,
  type: 'image' | 'video',
) {
  const fallbackExt = type === 'video' ? 'mp4' : 'jpg';
  return asset.fileName || `media-${Date.now()}-${index}.${fallbackExt}`;
}

function getPickedAssetMimeType(
  asset: ImagePicker.ImagePickerAsset,
  type: 'image' | 'video',
) {
  return asset.mimeType || (type === 'video' ? 'video/mp4' : 'image/jpeg');
}

async function appendPickedAssetToFormData(
  formData: FormData,
  asset: ImagePicker.ImagePickerAsset,
  fileName: string,
  mimeType: string,
) {
  const webFile = (asset as ImagePicker.ImagePickerAsset & { file?: File }).file;
  if (webFile) {
    formData.append('file', webFile, fileName);
    return;
  }

  if (isWebRuntime) {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    formData.append('file', blob as Blob, fileName);
    return;
  }

  const nativeFile = new ExpoFile(asset.uri);
  formData.append('file', nativeFile as unknown as Blob, fileName);
}

function buildNativeUploadParameters(options: {
  caption?: string;
  fileName: string;
  instagramHandle?: string;
  role?: UploadedMediaItem['role'];
  sourceUrl?: string;
  type: 'image' | 'video';
}) {
  const parameters: Record<string, string> = {
    fileName: options.fileName,
    type: options.type,
  };
  if (options.role) parameters.role = options.role;
  if (options.caption) parameters.caption = options.caption;
  if (options.sourceUrl) parameters.sourceUrl = options.sourceUrl;
  if (options.instagramHandle) parameters.instagramHandle = options.instagramHandle;
  return parameters;
}

async function uploadNativePickedAsset<T>(
  path: string,
  asset: ImagePicker.ImagePickerAsset,
  fileName: string,
  mimeType: string,
  parameters: Record<string, string>,
  token?: string | null,
) {
  const nativeFile = new ExpoFile(asset.uri);
  const upload = nativeFile.createUploadTask(`${API_URL}${path}`, {
    fieldName: 'file',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    httpMethod: 'POST',
    mimeType,
    parameters: {
      ...parameters,
      fileName,
    },
    uploadType: UploadType.MULTIPART,
  });
  const result = await upload.uploadAsync();
  if (result.status < 200 || result.status >= 300) {
    let details = '';
    try {
      const payload = JSON.parse(result.body);
      details = String(payload.message || payload.error || payload.details || '');
    } catch {
      details = result.body || '';
    }
    const error = new Error(details || `API ${result.status}`) as Error & { status?: number };
    error.status = result.status;
    throw error;
  }
  return JSON.parse(result.body) as T;
}

async function uploadNativePickedAssetToS3(
  userId: string,
  asset: ImagePicker.ImagePickerAsset,
  fileName: string,
  mimeType: string,
  parameters: Record<string, string>,
) {
  const upload = await apiRequest<{
    uploadMethod?: 'POST' | 'PUT';
    uploadUrl: string;
    uploadFields?: Record<string, string>;
    key: string;
    uri: string;
    fileName: string;
    type: 'image' | 'video';
    contentType: string;
    maxBytes: number;
    expiresIn: number;
  }>(`/users/${userId}/media/uploads/presign`, {
    method: 'POST',
    body: {
      ...parameters,
      contentType: mimeType,
      fileName,
      size: asset.fileSize ?? 0,
    },
  });

  const nativeFile = new ExpoFile(asset.uri);
  let uploadStatus = 0;
  let uploadSucceeded = false;
  if (upload.uploadMethod === 'POST' && upload.uploadFields) {
    const formData = new FormData();
    Object.entries(upload.uploadFields).forEach(([field, value]) => {
      formData.append(field, value);
    });
    formData.append('file', nativeFile as unknown as Blob, upload.fileName || fileName);
    const response = await expoFetch(upload.uploadUrl, {
      method: 'POST',
      body: formData,
    });
    uploadStatus = response.status;
    uploadSucceeded = response.ok;
  } else {
    const response = await expoFetch(upload.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': upload.contentType || mimeType,
      },
      body: nativeFile as unknown as BodyInit,
    });
    uploadStatus = response.status;
    uploadSucceeded = response.ok;
  }
  if (!uploadSucceeded) {
    const error = new Error(
      'Не удалось загрузить файл. Проверьте сеть и повторите.',
    ) as Error & {
      status?: number;
    };
    error.status = uploadStatus;
    throw error;
  }

  return apiRequest<{
    media: UploadedMediaItem;
    user: ApiUser;
  }>(`/users/${userId}/media/uploads/complete`, {
    method: 'POST',
    body: {
      ...parameters,
      contentType: upload.contentType || mimeType,
      fileName: upload.fileName || fileName,
      key: upload.key,
      uri: upload.uri,
    },
  });
}

async function uploadUserMediaRemote(
  userId: string,
  asset: ImagePicker.ImagePickerAsset,
  options: {
    caption?: string;
    instagramHandle?: string;
    index?: number;
    role?: UploadedMediaItem['role'];
    sourceUrl?: string;
  } = {},
) {
  const index = options.index ?? 0;
  const type = getPickedAssetType(asset);
  const fileName = getPickedAssetFileName(asset, index, type);
  const mimeType = getPickedAssetMimeType(asset, type);
  const parameters = buildNativeUploadParameters({
    caption: options.caption,
    fileName,
    instagramHandle: options.instagramHandle,
    role: options.role,
    sourceUrl: options.sourceUrl,
    type,
  });
  if (!isWebRuntime) {
    try {
      return await uploadNativePickedAssetToS3(
        userId,
        asset,
        fileName,
        mimeType,
        parameters,
      );
    } catch (error) {
      const status = (error as { status?: number } | null)?.status;
      if (status === 413) {
        throw error;
      }
      return uploadNativePickedAsset<{
        media: UploadedMediaItem;
        user: ApiUser;
      }>(
        `/users/${userId}/media/uploads`,
        asset,
        fileName,
        mimeType,
        parameters,
        activeAuthToken,
      );
    }
  }
  const formData = new FormData();
  await appendPickedAssetToFormData(formData, asset, fileName, mimeType);
  formData.append('type', type);
  formData.append('fileName', fileName);
  if (options.role) formData.append('role', options.role);
  if (options.caption) formData.append('caption', options.caption);
  if (options.sourceUrl) formData.append('sourceUrl', options.sourceUrl);
  if (options.instagramHandle) formData.append('instagramHandle', options.instagramHandle);

  return apiFormRequest<{
    media: UploadedMediaItem;
    user: ApiUser;
  }>(`/users/${userId}/media/uploads`, formData);
}

async function connectInstagramFacebookRemote(
  userId: string,
  handle: string,
) {
  return apiRequest<{
    mode: 'facebook_oauth';
    authUrl: string | null;
    message: string;
  }>(`/users/${userId}/instagram/facebook-connect`, {
    method: 'POST',
    body: { handle, returnUrl: getAppReturnUrl() },
  });
}

async function connectInstagramRemote(
  userId: string,
  handle: string,
) {
  return apiRequest<{
    mode: 'oauth';
    authUrl: string | null;
    message: string;
  }>(`/users/${userId}/instagram/connect`, {
    method: 'POST',
    body: { handle, returnUrl: getAppReturnUrl() },
  });
}

async function fetchInstagramStatusRemote(userId: string) {
  return apiRequest<{
    connected: boolean;
    profile: ApiUser['instagramProfile'];
  }>(`/users/${userId}/instagram/status`);
}

async function refreshInstagramTokenRemote(userId: string) {
  return apiRequest<{
    ok: boolean;
    profile: NonNullable<ApiUser['instagramProfile']>;
  }>(`/users/${userId}/instagram/refresh-token`, {
    method: 'POST',
  });
}

async function disconnectInstagramRemote(userId: string) {
  return apiRequest<{
    ok: boolean;
    user: ApiUser;
  }>(`/users/${userId}/instagram/disconnect`, {
    method: 'POST',
  });
}

async function fetchInstagramMediaRemote(userId: string, handle: string) {
  return apiRequest<{
    status: string;
    profile: NonNullable<ApiUser['instagramProfile']>;
    items: InstagramImportPreviewItem[];
    notices?: InstagramMediaNotice[];
  }>(`/users/${userId}/instagram/media`, {
    method: 'POST',
    body: { handle },
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function importInstagramMediaRemote(
  userId: string,
  itemIds: string[],
  onProgress?: (job: InstagramImportJob) => void,
) {
  const { job: startedJob } = await apiRequest<{ job: InstagramImportJob }>(
    `/users/${userId}/instagram/import-jobs`,
    {
      method: 'POST',
      body: { itemIds },
    },
  );
  onProgress?.(startedJob);

  let job = startedJob;
  for (let attempt = 0; attempt < 600; attempt += 1) {
    await delay(1000);
    ({ job } = await apiRequest<{ job: InstagramImportJob }>(
      `/users/${userId}/instagram/import-jobs/${job.id}`,
    ));
    onProgress?.(job);

    if (job.status === 'complete') {
      if (!job.user) {
        throw new Error('Instagram import completed without user payload');
      }
      return {
        user: job.user,
        importedMedia: [],
        importedCount: job.downloadedCount,
        downloadedCount: job.downloadedCount,
        skippedCount: job.skippedCount,
        failedCount: job.failedCount,
        errors: job.errors,
      };
    }

    if (job.status === 'failed') {
      throw new Error(job.error || 'Instagram import failed');
    }
  }

  throw new Error('Instagram import timed out');
}

async function importInstagramMediaSyncRemote(userId: string, itemIds: string[]) {
  return apiRequest<{
    user: ApiUser;
    importedMedia: UploadedMediaItem[];
    importedCount: number;
    downloadedCount: number;
    skippedCount: number;
    failedCount: number;
    errors?: { id?: string; permalink?: string; message: string }[];
  }>(`/users/${userId}/instagram/import`, {
    method: 'POST',
    body: { itemIds },
  });
}

async function startEmailRegistration(email: string, password: string, role: Role) {
  return apiRequest<{
    emailSent?: boolean;
    message: string;
    ok: boolean;
    reused?: boolean;
    verificationCode?: string;
  }>('/auth/start-registration', {
    method: 'POST',
    body: { email, password, role },
  });
}

async function verifyEmailRegistration(email: string, code: string) {
  const result = await apiRequest<{ user: ApiUser }>('/auth/verify-registration', {
    method: 'POST',
    body: { email, code },
  });
  return result.user;
}

async function loginUser(email: string, password: string) {
  const result = await apiRequest<{ user: ApiUser }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  return result.user;
}

async function requestPasswordResetEmail(email: string) {
  try {
    await apiRequest<{ ok: boolean }>('/auth/password-reset/start', {
      method: 'POST',
      body: { email },
    });
    return true;
  } catch {
    return false;
  }
}

async function confirmPasswordReset(email: string, code: string, password: string) {
  try {
    await apiRequest<{ ok: boolean }>('/auth/password-reset/confirm', {
      method: 'POST',
      body: { code, email, password },
    });
    return true;
  } catch {
    return false;
  }
}

async function loginWithGoogle(payload: {
  clientId: string;
  code?: string;
  codeVerifier?: string;
  redirectUri?: string;
  idToken?: string;
  role: Role;
}) {
  const result = await apiRequest<{ user: ApiUser }>('/auth/oauth/google', {
    method: 'POST',
    body: payload,
  });
  return result.user;
}

async function loginWithAppleIdentityToken(payload: {
  authorizationCode?: string | null;
  email?: string | null;
  fullName?: string;
  identityToken: string;
  role: Role;
  user?: string;
}) {
  const result = await apiRequest<{ user: ApiUser }>('/auth/oauth/apple', {
    method: 'POST',
    body: payload,
  });
  return result.user;
}

function getReadableAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (!message) return '';
  if (message.includes('User already exists')) {
    return 'аккаунт уже есть, войдите через вкладку “Вход”';
  }
  if (message.includes('OAuth is not configured')) {
    return 'OAuth не настроен для этой сборки';
  }
  if (message.includes('Google token exchange failed')) {
    return 'Google не подтвердил вход. Повторите позже.';
  }
  if (message.includes('Apple OAuth failed')) {
    return 'Apple не подтвердил вход. Повторите позже.';
  }
  if (message.includes('Email delivery')) {
    return 'email-сервис не отправил письмо';
  }
  if (/network|fetch|timeout|abort/i.test(message)) {
    return 'нет соединения с сервером';
  }
  if (/redirect_uri_mismatch|developer_error|configuration/i.test(message)) {
    return 'вход временно недоступен';
  }
  return 'вход временно недоступен';
}

function createOfflineUser(email: string, role: Role, profileCreated: boolean): ApiUser {
  const safeEmail = email.trim().toLowerCase() || makeInternalEmail('offline-client');
  const safeRole = role === 'vendor' ? 'vendor' : 'client';
  return {
    id: `offline_${safeEmail.replace(/[^a-z0-9]+/g, '_')}`,
    email: safeEmail,
    role: safeRole,
    authToken: `offline_${safeRole}_${Date.now()}`,
    profileCreated,
    vendorDraft: {
      name: safeRole === 'vendor' ? 'kairkuka' : 'Клиент',
      city: 'Алматы',
      category: 'Ведущие',
      priceFrom: '320000',
      phone: '+77015550101',
    },
    vendorSettingsValues: {},
    clientProfile: createClientProfile(safeEmail),
    clientSettingsValues: {},
    selectedImportIds: [],
    instagramHandle: '',
    eventDraft: DEFAULT_EVENT_DRAFT,
    eventHistory: [],
    bookings: [],
    blockedVendorIds: [],
    blockedUserIds: [],
    likedVendorIds: [],
    likedMediaIds: [],
    savedMediaIds: [],
    savedVendorIds: [],
    uploadedMedia: [],
  };
}

async function registerUser(email: string, role: Role) {
  const result = await apiRequest<{ user: ApiUser }>('/auth/register', {
    method: 'POST',
    body: { email, role },
  });
  return result.user;
}

async function fetchUser(userId: string, token?: string | null) {
  const result = await apiRequest<{ user: ApiUser }>(`/users/${userId}`, {
    token,
  });
  return result.user;
}

async function updateUser(userId: string, body: Partial<ApiUser>) {
  const result = await apiRequest<{ user: ApiUser }>(`/users/${userId}`, {
    method: 'PATCH',
    body,
  });
  return result.user;
}

async function toggleSavedVendorRemote(userId: string, vendorId: string, saved: boolean) {
  const result = await apiRequest<{ user: ApiUser }>(
    `/users/${userId}/saved-vendors`,
    {
      method: 'POST',
      body: { saved, vendorId },
    },
  );
  return result.user;
}

async function toggleLikedVendorRemote(userId: string, vendorId: string, liked: boolean) {
  return apiRequest<{ liked: boolean; user: ApiUser; vendor: Vendor }>(
    `/users/${userId}/liked-vendors`,
    {
      method: 'POST',
      body: { liked, vendorId },
    },
  );
}

async function toggleLikedMediaRemote(
  userId: string,
  vendorId: string,
  mediaId: string,
  liked: boolean,
) {
  return apiRequest<{ liked: boolean; user: ApiUser; vendor: Vendor }>(
    `/users/${userId}/media-likes`,
    {
      method: 'POST',
      body: { liked, mediaId, vendorId },
    },
  );
}

async function toggleSavedMediaRemote(
  userId: string,
  vendorId: string,
  mediaId: string,
  saved: boolean,
) {
  return apiRequest<{ saved: boolean; user: ApiUser; vendor: Vendor }>(
    `/users/${userId}/media-saves`,
    {
      method: 'POST',
      body: { mediaId, saved, vendorId },
    },
  );
}

async function fetchMediaLikesRemote(vendorId: string, mediaId: string) {
  return apiRequest<{ likes: MediaLikeUser[]; total: number }>(
    `/vendors/${encodeURIComponent(vendorId)}/media/${encodeURIComponent(mediaId)}/likes`,
  );
}

async function addMediaCommentRemote(
  userId: string,
  vendorId: string,
  mediaId: string,
  text: string,
) {
  return apiRequest<{ user: ApiUser; vendor: Vendor }>(
    `/users/${userId}/media-comments`,
    {
      method: 'POST',
      body: { mediaId, text, vendorId },
    },
  );
}

async function blockVendorRemote(userId: string, vendorId: string) {
  const result = await apiRequest<{ user: ApiUser }>(
    `/users/${userId}/blocked-vendors`,
    {
      method: 'POST',
      body: { blocked: true, vendorId },
    },
  );
  return result.user;
}

async function reportContentRemote(
  userId: string,
  vendorId: string,
  report: {
    targetType: 'vendor' | 'media' | 'comment';
    reason: string;
    mediaId?: string;
    commentId?: string;
  },
) {
  return apiRequest<{ ok: boolean; user?: ApiUser }>(`/users/${userId}/content-reports`, {
    method: 'POST',
    body: { ...report, vendorId },
  });
}

async function createBooking(
  userId: string,
  vendorId: string,
  date: string,
  timeFrom: string,
  timeTo: string,
) {
  const result = await apiRequest<{ booking: ClientBooking; user: ApiUser }>(
    `/users/${userId}/bookings`,
    {
      method: 'POST',
      body: { vendorId, date, timeFrom, timeTo },
    },
  );
  return result.user;
}

async function updateClientBookingRemote(
  userId: string,
  bookingId: string,
  body: {
    date?: string;
    status?: 'Отменена';
    timeFrom?: string;
    timeTo?: string;
  },
) {
  const result = await apiRequest<{ booking: ClientBooking; user: ApiUser }>(
    `/users/${userId}/bookings/${bookingId}`,
    { method: 'PATCH', body },
  );
  return result.user;
}

async function fetchVendorRequests(userId: string, token?: string | null) {
  const result = await apiRequest<{ bookings: ClientBooking[] }>(
    `/users/${userId}/vendor-requests`,
    { token },
  );
  return result.bookings;
}

async function updateVendorRequestStatusRemote(
  userId: string,
  bookingId: string,
  status: string,
) {
  const result = await apiRequest<{ booking: ClientBooking }>(
    `/users/${userId}/vendor-requests/${bookingId}`,
    {
      method: 'PATCH',
      body: { status },
    },
  );
  return result.booking;
}

async function registerPushTokenRemote(userId: string, token: string, role: Role) {
  return apiRequest<{
    ok: boolean;
    pushNotifications: { enabled: boolean; registeredTokens: number };
  }>(`/users/${userId}/push-tokens`, {
    method: 'POST',
    body: {
      platform: Platform.OS,
      role,
      token,
    },
  });
}

async function unregisterPushTokenRemote(userId: string, token: string) {
  return apiRequest<{
    ok: boolean;
    pushNotifications: { enabled: boolean; registeredTokens: number };
  }>(`/users/${userId}/push-tokens`, {
    method: 'DELETE',
    body: { token },
  });
}

async function fetchVendorCalendar(userId: string, token?: string | null) {
  const result = await apiRequest<{ calendar: Partial<VendorCalendarState> }>(
    `/users/${userId}/vendor-calendar`,
    { token },
  );
  return normalizeCalendarState(result.calendar);
}

async function fetchVendorAnalytics(userId: string, token?: string | null) {
  const result = await apiRequest<{ analytics: VendorAnalyticsSnapshot }>(
    `/users/${userId}/vendor-analytics`,
    { token },
  );
  return result.analytics;
}

async function trackVendorAnalytics(
  vendorId: string,
  type: 'profile_view' | 'media_view' | 'save' | 'whatsapp_click',
) {
  const result = await apiRequest<{ analytics: VendorAnalyticsSnapshot }>(
    `/vendors/${vendorId}/analytics`,
    {
      method: 'POST',
      body: { type },
    },
  );
  return result.analytics;
}

async function updateVendorCalendar(userId: string, calendar: VendorCalendarState) {
  const result = await apiRequest<{
    calendar: Partial<VendorCalendarState>;
    vendors?: Vendor[];
  }>(
    `/users/${userId}/vendor-calendar`,
    {
      method: 'PATCH',
      body: calendar,
    },
  );
  const nextCalendar = normalizeCalendarState(result.calendar);
  return {
    ...nextCalendar,
    vendors: result.vendors ?? [],
  };
}

async function deleteAccountRemote(userId: string) {
  return apiRequest<{ ok: boolean }>(`/users/${userId}`, {
    method: 'DELETE',
  });
}

async function publishVendorProfile(userId: string, vendorDraft: VendorDraft) {
  return apiRequest<{ user: ApiUser; vendor: Vendor; vendors: Vendor[] }>(
    `/users/${userId}/vendor-profile`,
    {
      method: 'POST',
      body: { vendorDraft },
    },
  );
}

function getGuestStartInShorts() {
  try {
    const storage =
      globalThis.localStorage ??
      (typeof window !== 'undefined' ? window.localStorage : undefined);
    const hasSeenCatalog = storage?.getItem(GUEST_CATALOG_SEEN_KEY) === '1';

    if (hasSeenCatalog || hasSeenCatalogCookie()) {
      return true;
    }

    storage?.setItem(GUEST_CATALOG_SEEN_KEY, '1');
    setGuestCatalogSeenCookie();

    return false;
  } catch {
    if (hasSeenCatalogCookie()) {
      return true;
    }

    setGuestCatalogSeenCookie();
    return false;
  }
}

function hasSeenCatalogCookie() {
  if (typeof document === 'undefined') {
    return false;
  }

  return document.cookie
    .split(';')
    .some((part) => part.trim() === `${GUEST_CATALOG_SEEN_KEY}=1`);
}

function setGuestCatalogSeenCookie() {
  if (typeof document === 'undefined') {
    return;
  }

  try {
    document.cookie = `${GUEST_CATALOG_SEEN_KEY}=1; max-age=31536000; path=/; SameSite=Lax`;
  } catch {
    // Some embedded preview browsers expose cookies as read-only.
  }
}

const MonitoredApp = SENTRY_DSN ? Sentry.wrap(App) : App;

export default function AppWithMonitoring() {
  return (
    <ProductionErrorBoundary>
      <MonitoredApp />
    </ProductionErrorBoundary>
  );
}
