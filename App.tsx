import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  ArrowRight,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  Clapperboard,
  AtSign,
  Camera,
  Grid2X2,
  ImagePlus,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Plus,
  Play,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  CatalogScreen,
} from './src/screens/client/CatalogScreen';
import { VendorDetailScreen } from './src/screens/VendorDetailScreen';
import {
  categories as mockCategories,
  vendors as mockVendors,
} from './src/data/mock';
import { getVendorImageSource } from './src/data/vendorImages';
import { styles } from './src/theme/styles';
import { colors } from './src/theme/styles';
import type { Role, Vendor, VendorImageKey } from './src/types';
import { formatMoney } from './src/utils/format';

type DemoRoute =
  | { name: 'catalog' }
  | { name: 'vendor'; vendorId: string };

type AppPhase = 'auth' | 'onboarding' | 'vendorImport' | 'app';
type AuthMode = 'login' | 'register' | 'verify';
type VendorImportMethod = 'instagram' | 'manual' | null;
type VendorDashboardSection = 'requests' | 'calendar' | 'stats';
type ClientMainTab = 'feed' | 'requests' | 'categories' | 'event' | 'profile';
type VendorDraft = {
  name: string;
  city: string;
  category: string;
  priceFrom: string;
  phone: string;
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
type ClientBooking = {
  id: string;
  clientEmail?: string;
  clientId?: string;
  clientName?: string;
  createdAt?: string;
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
  role: 'main' | 'cover' | 'reels' | 'profile';
  status: 'ready' | 'uploaded';
};
type InstagramDraftMediaItem = {
  id: string;
  type: 'video' | 'image';
  title: string;
  imageKey: VendorImageKey;
};
type InstagramImportPreviewItem = InstagramDraftMediaItem & {
  sourceUrl: string;
};
type ApiUser = {
  id: string;
  email: string;
  role: Role;
  authToken?: string | null;
  vendorId?: string | null;
  profileCreated: boolean;
  vendorDraft: VendorDraft;
  selectedImportIds: string[];
  instagramHandle: string;
  eventDraft?: EventDraft;
  bookings?: ClientBooking[];
  blockedVendorIds?: string[];
  savedVendorIds?: string[];
  uploadedMedia?: UploadedMediaItem[];
};

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
  typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : true;
const API_URL =
  envApiBaseUrl ??
  (isWebRuntime &&
  typeof window !== 'undefined' &&
  window.location?.port === '8083'
    ? 'http://localhost:4000/api'
    : isWebRuntime
      ? '/api'
      : isDevRuntime
        ? 'http://localhost:4000/api'
        : 'https://d2ne1y5a2elsg5.cloudfront.net/api');
const SHOW_TEST_LOGIN =
  (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_SHOW_TEST_LOGIN === '1') ||
  isDevRuntime;
const OFFLINE_TEST_CODE = '123456';
const OFFLINE_TEST_PASSWORD = '123456';
let activeAuthToken: string | null = getStoredAuthTokenSync();
const DEFAULT_SHORTS_CATEGORY = 'Ведущие';
const DEFAULT_EVENT_DRAFT: EventDraft = {
  type: 'Кыз узату',
  date: '7 сентября',
  city: 'Алматы',
  guests: '120',
  budget: '3 500 000 тг',
  place: 'Пока выбираем',
  comment: 'Нужны ведущий, декор и фото.',
};

const clientStories = [
  {
    title: 'Выберите событие',
    text: 'Отметьте формат мероприятия и нужные направления.',
    image: require('./assets/onboarding/client/1.png'),
  },
  {
    title: 'Смотрите ленту',
    text: 'Подрядчики показываются живыми видео, как рилсы.',
    image: require('./assets/onboarding/client/2.png'),
  },
  {
    title: 'Открывайте профиль',
    text: 'Смотрите медиа, отзывы, цену и свободные даты.',
    image: require('./assets/onboarding/client/3.png'),
  },
  {
    title: 'Сохраняйте лучших',
    text: 'Добавляйте понравившихся подрядчиков в избранное.',
    image: require('./assets/onboarding/client/4.png'),
  },
  {
    title: 'Свяжитесь напрямую',
    text: 'Переходите в WhatsApp и обсуждайте детали.',
    image: require('./assets/onboarding/client/5.png'),
  },
  {
    title: 'Бронируйте дату',
    text: 'Выберите день в календаре и отправьте заявку.',
    image: require('./assets/onboarding/client/6.png'),
  },
  {
    title: 'Соберите событие',
    text: 'Брони, бюджет, избранное и детали будут в одном месте.',
    image: require('./assets/onboarding/client/7.png'),
  },
];

const vendorStories = [
  {
    title: 'Создайте профиль',
    text: 'Укажите название, город, категорию, цену и WhatsApp.',
    image: require('./assets/onboarding/vendor/1.png'),
  },
  {
    title: 'Добавьте медиа',
    text: 'Загрузите фото и видео вручную или через импорт.',
    image: require('./assets/onboarding/vendor/2.png'),
  },
  {
    title: 'Выберите главное',
    text: 'Главное видео попадет в ленту, обложка — в профиль.',
    image: require('./assets/onboarding/vendor/3.png'),
  },
  {
    title: 'Покажите даты',
    text: 'Отмечайте свободные и занятые дни в календаре.',
    image: require('./assets/onboarding/vendor/4.png'),
  },
  {
    title: 'Получайте заявки',
    text: 'Клиенты выбирают дату и отправляют запрос на бронь.',
    image: require('./assets/onboarding/vendor/5.png'),
  },
  {
    title: 'Смотрите статистику',
    text: 'Просмотры, сохранения и клики помогают понимать спрос.',
    image: require('./assets/onboarding/vendor/6.png'),
  },
  {
    title: 'Управляйте кабинетом',
    text: 'Медиа, цены, документы и уведомления доступны в настройках.',
    image: require('./assets/onboarding/vendor/7.png'),
  },
];

const instagramDraftMedia = [
  { id: 'ig1', type: 'video', title: 'Ведущий на банкете', imageKey: 'host' },
  { id: 'ig2', type: 'video', title: 'Танцевальный блок', imageKey: 'dj' },
  { id: 'ig3', type: 'image', title: 'Оформление сцены', imageKey: 'decor' },
  { id: 'ig4', type: 'image', title: 'Отзывы гостей', imageKey: 'photo' },
] satisfies InstagramDraftMediaItem[];

const instagramPermissions = ['Профиль', 'Фото', 'Видео', 'Reels'];

const vendorSettings = [
  { label: 'Профиль', meta: 'Имя, категория, город, описание' },
  { label: 'Медиа', meta: 'Фото, видео, обложки, порядок' },
  { label: 'Instagram', meta: 'Импорт, обновление, отключение' },
  { label: 'Услуги и цены', meta: 'Пакеты, доп. услуги, цена от' },
  { label: 'Даты', meta: 'Календарь, занято, свободно' },
  { label: 'Заявки', meta: 'Входящие, статусы, история' },
  { label: 'Статистика', meta: 'Просмотры, лайки, WhatsApp-клики' },
  { label: 'Уведомления', meta: 'Заявки, сообщения, напоминания' },
  { label: 'Документы', meta: 'Верификация, реквизиты, договор' },
  { label: 'Настройки', meta: 'Язык, безопасность, поддержка' },
];

const clientSettings = [
  { label: 'Мероприятие', meta: 'Тип, дата, город, гости, бюджет' },
  { label: 'Бронирования', meta: 'Подрядчики, даты, статусы, сумма' },
  { label: 'Избранное', meta: 'Сохраненные подрядчики и сравнение' },
  { label: 'Заявки', meta: 'Ответы, статусы, история обращений' },
  { label: 'Календарь', meta: 'Дата мероприятия, дедлайны, встречи' },
  { label: 'Бюджет', meta: 'План, траты, остаток' },
  { label: 'Документы', meta: 'Договоры, чеки, подтверждения' },
  { label: 'Уведомления', meta: 'Ответы, бронь, оплата' },
  { label: 'Профиль', meta: 'Имя, телефон, почта, город' },
  { label: 'Настройки', meta: 'Язык, безопасность, поддержка' },
];

export default function App() {
  const [startInShorts] = useState(() => getGuestStartInShorts());
  const [phase, setPhase] = useState<AppPhase>(() => getInitialPhase());
  const [userId, setUserId] = useState(() => getStoredUserId());
  const [authToken, setAuthToken] = useState(() => activeAuthToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('register');
  const [authMessage, setAuthMessage] = useState('');
  const [authDevCode, setAuthDevCode] = useState('');
  const [role, setRole] = useState<Role>(() => getStoredRole() ?? 'client');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [vendorSettingsOpen, setVendorSettingsOpen] = useState(false);
  const [clientSettingsOpen, setClientSettingsOpen] = useState(false);
  const [clientMainTab, setClientMainTab] = useState<ClientMainTab>(() =>
    startInShorts ? 'feed' : 'categories',
  );
  const [clientBookings, setClientBookings] = useState<ClientBooking[]>([]);
  const [vendorRequests, setVendorRequests] = useState<ClientBooking[]>([]);
  const [vendorBusyDates, setVendorBusyDates] = useState<string[]>([]);
  const [eventDraft, setEventDraft] = useState<EventDraft>(DEFAULT_EVENT_DRAFT);
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMediaItem[]>([]);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const storyTranslateX = useRef(new Animated.Value(0)).current;
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([
    'ig1',
    'ig2',
  ]);
  const [instagramHandle, setInstagramHandle] = useState('@kairkuka');
  const [instagramImportStarted, setInstagramImportStarted] = useState(false);
  const [vendorImportMethod, setVendorImportMethod] =
    useState<VendorImportMethod>(null);
  const [vendorDraft, setVendorDraft] = useState({
    name: 'kairkuka',
    city: 'Алматы',
    category: 'Ведущие',
    priceFrom: '320000',
    phone: '+77015550101',
  });
  const [route, setRoute] = useState<DemoRoute>({ name: 'catalog' });
  const [savedVendorIds, setSavedVendorIds] = useState<string[]>([]);
  const [blockedVendorIds, setBlockedVendorIds] = useState<string[]>([]);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'ok' | 'offline'>(
    'checking',
  );
  const [apiCategories, setApiCategories] = useState<string[]>(mockCategories);
  const [apiVendors, setApiVendors] = useState<Vendor[]>(mockVendors);
  const [apiVendorSettings, setApiVendorSettings] = useState(vendorSettings);
  const [apiInstagramMedia, setApiInstagramMedia] =
    useState<InstagramDraftMediaItem[]>(instagramDraftMedia);

  const applyApiUser = (user: ApiUser) => {
    setUserId(user.id);
    setEmail(user.email);
    setRole(user.role);
    if (user.authToken) {
      setAuthToken(user.authToken);
      setApiAuthToken(user.authToken);
      void persistAuthToken(user.authToken);
    }
    setVendorDraft(user.vendorDraft);
    setSelectedImportIds(user.selectedImportIds);
    setInstagramHandle(user.instagramHandle);
    setEventDraft(user.eventDraft ?? DEFAULT_EVENT_DRAFT);
    setClientBookings(user.bookings ?? []);
    setSavedVendorIds(user.savedVendorIds ?? []);
    setBlockedVendorIds(user.blockedVendorIds ?? []);
    setUploadedMedia(user.uploadedMedia ?? []);
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
        .then((busyDates) => setVendorBusyDates(busyDates))
        .catch(() => undefined);
    }
    if (user.profileCreated) {
      setPhase('app');
    }
  };

  useEffect(() => {
    let mounted = true;
    if (authToken) {
      setApiAuthToken(authToken);
    }

    fetchBootstrap()
      .then((bootstrap) => {
        if (!mounted) return;
        setBackendStatus('ok');
        setApiCategories(bootstrap.categories);
        setApiVendors(bootstrap.vendors);
        setApiVendorSettings(bootstrap.vendorSettings);
        setApiInstagramMedia(bootstrap.instagramMedia);
      })
      .catch(() => {
        if (mounted) setBackendStatus('offline');
      });

    restoreStoredSession()
      .then(async (session) => {
        if (!mounted || !session.userId || !session.authToken) return;
        setAuthToken(session.authToken);
        setApiAuthToken(session.authToken);
        try {
          return await fetchUser(session.userId, session.authToken);
        } catch {
          const storedRole = getStoredRole() ?? 'client';
          setBackendStatus('offline');
          return createOfflineUser(
            email || (storedRole === 'vendor' ? 'review-vendor@svadba.kz' : 'review-client@svadba.kz'),
            storedRole,
            true,
          );
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
  }, []);

  const selectedVendor =
    route.name === 'vendor'
      ? apiVendors.find((vendor) => vendor.id === route.vendorId) ?? apiVendors[0]
      : null;
  const visibleClientVendors = apiVendors.filter(
    (vendor) => !blockedVendorIds.includes(vendor.id),
  );

  const toggleSaved = (vendorId: string) => {
    setSavedVendorIds((current) => {
      const next = current.includes(vendorId)
        ? current.filter((id) => id !== vendorId)
        : [...current, vendorId];
      if (userId) {
        toggleSavedVendorRemote(userId, vendorId)
          .then((user) => {
            setSavedVendorIds(user.savedVendorIds ?? next);
            setBackendStatus('ok');
          })
          .catch(() => setBackendStatus('offline'));
      }
      return next;
    });
  };

  const openVendor = (vendor: Vendor) => {
    setRoute({ name: 'vendor', vendorId: vendor.id });
  };

  const reportVendor = (vendorId: string) => {
    if (!userId) {
      setBackendStatus('offline');
      return;
    }
    reportVendorRemote(userId, vendorId, 'Жалоба из профиля подрядчика')
      .then(() => setBackendStatus('ok'))
      .catch(() => setBackendStatus('offline'));
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
    const normalizedEmail = email.trim() || 'demo@svadba.kz';
    if (password.length < 6) {
      setAuthMessage('Пароль минимум 6 символов');
      return;
    }
    if (password !== passwordConfirm) {
      setAuthMessage('Пароли не совпадают');
      return;
    }

    try {
      const result = await startEmailRegistration(normalizedEmail, password, role);
      setEmail(normalizedEmail);
      setAuthDevCode(result.verificationCode ?? '');
      setAuthMessage('Код отправлен на почту');
      setBackendStatus('ok');
      setAuthMode('verify');
    } catch {
      setBackendStatus('offline');
      setEmail(normalizedEmail);
      setAuthDevCode(OFFLINE_TEST_CODE);
      setVerificationCode('');
      setAuthMessage('Сервер недоступен. Тестовый код: 123456');
      setAuthMode('verify');
    }
  };

  const verifyRegistration = async () => {
    try {
      const user = await verifyEmailRegistration(email, verificationCode);
      applyApiUser(user);
      setBackendStatus('ok');
      setAuthMessage('');
      setStoryIndex(0);
      setPhase('onboarding');
    } catch {
      if (verificationCode.trim() === OFFLINE_TEST_CODE) {
        const user = createOfflineUser(email || 'review-client@svadba.kz', role, false);
        applyApiUser(user);
        setBackendStatus('offline');
        setAuthMessage('');
        setStoryIndex(0);
        setPhase('onboarding');
        return;
      }

      setBackendStatus('offline');
      setAuthMessage('Неверный код. Для теста: 123456');
    }
  };

  const loginWithPassword = async () => {
    const normalizedEmail = email.trim() || 'demo@svadba.kz';
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
      if (password === OFFLINE_TEST_PASSWORD) {
        const fallbackRole =
          normalizedEmail.includes('vendor') ||
          normalizedEmail.includes('test-auth')
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
      setAuthMessage('Почта или пароль неверные. Для теста пароль: 123456');
    }
  };

  const loginAsDemo = async (demoRole: Role) => {
    const demoEmail =
      demoRole === 'vendor' ? 'vendor@svadba.test' : 'client@svadba.test';
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

  const finishVendorImport = () => {
    persistSession(role, true);
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
  };

  const signOut = () => {
    void clearSession();
    setApiAuthToken(null);
    setAuthToken(null);
    setUserId(null);
    setRole('client');
    setStoryIndex(0);
    setRoute({ name: 'catalog' });
    setClientMainTab('categories');
    setVendorSettingsOpen(false);
    setClientSettingsOpen(false);
    setPhase('auth');
  };

  const deleteAccount = async () => {
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
      amount: `от ${vendor.priceFrom.toLocaleString('ru-RU')} тг`,
    };
    if (userId) {
      try {
        const user = await createBooking(userId, vendor.id, selectedDate, timeFrom, timeTo);
        setClientBookings(user.bookings ?? [booking]);
        setEventDraft(user.eventDraft ?? {
          ...eventDraft,
          date: selectedDate,
          city: vendor.city,
        });
        setBackendStatus('ok');
        if (role === 'vendor' && userId) {
          fetchVendorRequests(userId).then(setVendorRequests).catch(() => undefined);
        }
        return true;
      } catch {
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

  const updateVendorRequestStatus = (bookingId: string, status: string) => {
    setVendorRequests((current) =>
      current.map((booking) =>
        booking.id === bookingId ? { ...booking, status } : booking,
      ),
    );
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

  const changeVendorBusyDates = (busyDates: string[]) => {
    setVendorBusyDates(busyDates);
    if (userId) {
      updateVendorCalendar(userId, busyDates).catch(() => setBackendStatus('offline'));
    }
  };

  const pickUploadedMedia = async (mediaTypes: ImagePicker.MediaType[]) => {
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

    const nextItems: UploadedMediaItem[] = result.assets.map((asset, index) => {
      const type = asset.type === 'video' ? 'video' : 'image';
      return {
        id: `${Date.now()}-${index}`,
        uri: asset.uri,
        type,
        fileName: asset.fileName ?? `${type}-${Date.now()}-${index}`,
        caption: '',
        selected: true,
        role:
          uploadedMedia.length === 0 && index === 0
            ? 'main'
            : type === 'video'
              ? 'reels'
              : 'profile',
        status: 'ready',
      };
    });

    setUploadedMedia((current) => [...current, ...nextItems]);
  };

  const changeUploadedMedia = (nextMedia: UploadedMediaItem[]) => {
    setUploadedMedia(nextMedia);
    if (userId) {
      updateUser(userId, { uploadedMedia: nextMedia }).catch(() =>
        setBackendStatus('offline'),
      );
    }
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
    return (
      <SafeAreaView style={[styles.safeArea, styles.safeAreaDark]}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.authScreen}>
          <View style={styles.authHero}>
            <View style={styles.authTopPill}>
              <Text style={styles.authTopPillText}>SVADBA.kz</Text>
            </View>
            <View style={styles.authLogoMark}>
              <Sparkles color={colors.surface} size={34} strokeWidth={2.2} />
            </View>
            <Text style={styles.authTitle}>
              {isVerify ? 'Подтвердите почту' : isRegister ? 'Создать аккаунт' : 'Войти'}
            </Text>
            <Text style={styles.authText}>
              {isVerify
                ? `Мы отправили код на ${email || 'почту'}`
                : 'Клиенты ищут подрядчиков, поставщики получают заявки и брони.'}
            </Text>
          </View>

          <View style={styles.authForm}>
            {!isVerify ? (
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
                      keyboardType="number-pad"
                      maxLength={6}
                      onChangeText={setVerificationCode}
                      placeholder="Код из письма"
                      placeholderTextColor="#7F8A94"
                      style={styles.authInput}
                      value={verificationCode}
                    />
                  </View>
                  {authDevCode ? (
                    <Text style={styles.authHintText}>
                      Тестовый код: {authDevCode}
                    </Text>
                  ) : null}
                </>
              ) : (
                <>
                  <View style={styles.inputShell}>
                    <Mail color="#A7B0BA" size={20} strokeWidth={2.2} />
                    <TextInput
                      autoCapitalize="none"
                      keyboardType="email-address"
                      onChangeText={setEmail}
                      placeholder="Почта"
                      placeholderTextColor="#7F8A94"
                      style={styles.authInput}
                      value={email}
                    />
                  </View>
                  <View style={styles.inputShell}>
                    <LockKeyhole color="#A7B0BA" size={20} strokeWidth={2.1} />
                    <TextInput
                      autoCapitalize="none"
                      onChangeText={setPassword}
                      placeholder="Пароль"
                      placeholderTextColor="#7F8A94"
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
                          autoCapitalize="none"
                          onChangeText={setPasswordConfirm}
                          placeholder="Повторите пароль"
                          placeholderTextColor="#7F8A94"
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

              {authMessage ? (
                <Text style={styles.authMessageText}>{authMessage}</Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={
                  isVerify
                    ? verifyRegistration
                    : isRegister
                      ? startRegistration
                      : loginWithPassword
                }
                style={({ pressed }) => [
                  styles.authPrimaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.authPrimaryText}>
                  {isVerify ? 'Подтвердить' : isRegister ? 'Получить код' : 'Войти'}
                </Text>
                <ArrowRight color={colors.surface} size={22} strokeWidth={2.4} />
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setAuthMode(isRegister || isVerify ? 'login' : 'register');
                setAuthMessage('');
              }}
              style={styles.authSecondaryButton}
            >
              <Text style={styles.authSecondaryText}>
                {isRegister || isVerify
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
                resizeMode="cover"
                source={story.image}
                style={styles.storyImage}
              />
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
              <Text style={styles.storyRoundNavText}>‹</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => runStoryTransition('next')}
              style={({ pressed }) => [
                styles.storyRoundNavButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.storyRoundNavText}>›</Text>
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
            <Text style={styles.vendorImportTitle}>Импорт из Instagram</Text>
            <Text style={styles.vendorImportText}>
              Подключите аккаунт официальным входом Instagram или загрузите фото и видео вручную.
            </Text>
          </View>

          <View style={styles.botStatusCard}>
            <View style={styles.botStatusRow}>
              <View style={styles.vendorImportBot}>
                <ShieldCheck color={colors.surface} size={28} strokeWidth={2.1} />
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
              onPress={() => {
                setVendorImportMethod('instagram');
                setInstagramImportStarted(true);
              }}
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
                size={30}
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
                size={30}
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
                  <Text style={styles.instagramConnectedLabel}>Профиль найден</Text>
                  <Text style={styles.instagramSourceText}>
                    instagram.com/kairkuka
                  </Text>
                  <View style={styles.instagramHandleRow}>
                    <AtSign color="#A7B0BA" size={17} strokeWidth={2.1} />
                    <TextInput
                      autoCapitalize="none"
                      onChangeText={setInstagramHandle}
                      placeholder="Instagram аккаунт"
                      placeholderTextColor="#7F8A94"
                      style={styles.instagramHandleInput}
                      value={instagramHandle}
                    />
                  </View>
                </View>
                <View style={styles.oauthBadge}>
                  <Check color={colors.surface} size={16} strokeWidth={3} />
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
                  <Text style={styles.syncSummaryValue}>12</Text>
                  <Text style={styles.syncSummaryLabel}>постов</Text>
                </View>
                <View style={styles.syncSummaryItem}>
                  <Text style={styles.syncSummaryValue}>7</Text>
                  <Text style={styles.syncSummaryLabel}>reels</Text>
                </View>
                <View style={styles.syncSummaryItem}>
                  <Text style={styles.syncSummaryValue}>4</Text>
                  <Text style={styles.syncSummaryLabel}>выбрано</Text>
                </View>
              </View>
            </View>
          ) : null}

          {vendorImportMethod === 'manual' ? (
            <View style={styles.manualUploadCard}>
              <ImagePlus color={colors.surface} size={30} strokeWidth={2.1} />
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
                        source={getVendorImageSource({
                          category: 'Ведущие',
                          imageKey: item.imageKey,
                        })}
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
                  onChangeText={(value) => updateVendorDraft('priceFrom', value)}
                  value={vendorDraft.priceFrom}
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
          busyDates={vendorBusyDates}
          onChangeUploadedMedia={changeUploadedMedia}
          onChangeBusyDates={changeVendorBusyDates}
          onDeleteAccount={deleteAccount}
          settingsOpen={vendorSettingsOpen}
          onCloseSettings={() => setVendorSettingsOpen(false)}
          onOpenSettings={() => setVendorSettingsOpen(true)}
          onSignOut={signOut}
          onSwitchRole={switchRole}
          onUpdateRequestStatus={updateVendorRequestStatus}
          settings={apiVendorSettings}
          uploadedMedia={uploadedMedia}
          vendorDraft={vendorDraft}
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
              isSaved={savedVendorIds.includes(selectedVendor.id)}
              onBack={() => setRoute({ name: 'catalog' })}
              onBlock={() => blockVendor(selectedVendor.id)}
              onBook={(date, timeFrom, timeTo) =>
                bookVendor(selectedVendor, date, timeFrom, timeTo)
              }
              onReport={() => reportVendor(selectedVendor.id)}
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
            savedVendorIds={savedVendorIds}
            onOpenVendor={openVendor}
            onToggleSaved={toggleSaved}
          />
        ) : clientMainTab === 'requests' ? (
          <ClientRequestsScreen
            bookings={clientBookings}
            savedVendors={savedVendors}
            vendors={visibleClientVendors}
            onOpenVendor={openVendor}
          />
        ) : clientMainTab === 'event' ? (
          <ClientEventScreen
            bookings={clientBookings}
            eventDraft={eventDraft}
            onChangeEventDraft={(nextDraft) => {
              setEventDraft(nextDraft);
              if (userId) {
                updateUser(userId, { eventDraft: nextDraft }).catch(() =>
                  setBackendStatus('offline'),
                );
              }
            }}
          />
        ) : (
          <ClientProfileScreen
            bookingsCount={clientBookings.length}
            email={email || 'demo@svadba.kz'}
            onOpenCabinet={() => setClientSettingsOpen(true)}
            onSignOut={signOut}
            onSwitchRole={() => switchRole('vendor')}
            savedCount={savedVendors.length}
          />
        )}
        {backendStatus === 'offline' ? (
          <View style={styles.backendStatusPill}>
            <Text style={styles.backendStatusText}>Нет соединения</Text>
          </View>
        ) : null}
        <ClientBottomBar
          activeTab={clientMainTab}
          onChangeTab={changeClientMainTab}
          requestsCount={clientBookings.length}
        />
        {clientSettingsOpen ? (
          <ClientSettingsPanel
            bookings={clientBookings}
            eventDraft={eventDraft}
            onChangeEventDraft={(nextDraft) => {
              setEventDraft(nextDraft);
              if (userId) {
                updateUser(userId, { eventDraft: nextDraft }).catch(() =>
                  setBackendStatus('offline'),
                );
              }
            }}
            onClose={() => setClientSettingsOpen(false)}
            onDeleteAccount={deleteAccount}
            onSignOut={signOut}
            onSwitchRole={switchRole}
            savedVendors={savedVendors}
            settings={clientSettings}
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
      <Pressable
        accessibilityRole="button"
        onPress={() => changeTab('categories')}
        style={styles.vendorBottomAddButton}
      >
        <Plus color={colors.surface} size={38} strokeWidth={2.1} />
      </Pressable>
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
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.vendorBottomNavItem,
        pressed && styles.pressed,
      ]}
    >
      <View>
        <Icon
          color={active ? '#6B5CFF' : '#A7B0BA'}
          size={27}
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
        vendors.map((vendor) => (
          <Pressable
            key={vendor.id}
            accessibilityRole="button"
            onPress={() => onOpenVendor(vendor)}
            style={({ pressed }) => [
              styles.clientSavedCard,
              pressed && styles.pressed,
            ]}
          >
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="cover"
              source={getVendorImageSource(vendor)}
              style={styles.clientSavedImage}
            />
            <View style={styles.clientSavedCopy}>
              <Text numberOfLines={1} style={styles.clientSavedName}>
                {vendor.name}
              </Text>
              <Text style={styles.clientSavedMeta}>
                {vendor.category} · {vendor.city}
              </Text>
              <Text style={styles.clientSavedPrice}>
                от {formatMoney(vendor.priceFrom)}
              </Text>
            </View>
            <Text style={styles.clientSavedRating}>{vendor.rating}</Text>
          </Pressable>
        ))
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
  onOpenVendor,
  savedVendors,
  vendors,
}: {
  bookings: ClientBooking[];
  onOpenVendor: (vendor: Vendor) => void;
  savedVendors: Vendor[];
  vendors: Vendor[];
}) {
  const requests = bookings.length
    ? bookings.map((booking) => ({
        id: booking.id,
        name: booking.vendorName,
        vendorId: booking.vendorId,
        meta: `${booking.date}${
          booking.timeFrom && booking.timeTo ? ` · ${booking.timeFrom}-${booking.timeTo}` : ''
        } · ${booking.amount}`,
        status: booking.status,
        message: 'Ожидаем подтверждение даты от поставщика.',
      }))
    : savedVendors.slice(0, 3).map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        vendorId: vendor.id,
        meta: `${vendor.category} · ${vendor.city} · от ${formatMoney(vendor.priceFrom)}`,
        status: 'Черновик',
        message: 'Можно написать поставщику и закрепить дату.',
      }));
  const openRequestChat = (vendorId: string) => {
    const vendor = vendors.find((item) => item.id === vendorId);
    if (!vendor) return;
    const phone = vendor.contactPhone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Здравствуйте! Нашли вас на SVADBA.kz. Хотим обсудить дату и условия: ${vendor.name}`,
    );
    void Linking.openURL(`https://wa.me/${phone}?text=${message}`).catch(
      () => undefined,
    );
  };
  const openRequestDate = (vendorId: string) => {
    const vendor = vendors.find((item) => item.id === vendorId);
    if (vendor) {
      onOpenVendor(vendor);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.clientTabScreenContent}>
      <Text style={styles.clientTabTitle}>Заявки</Text>
      <Text style={styles.clientTabMeta}>Переписки, брони и ответы поставщиков</Text>
      {requests.length ? (
        requests.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View>
                <Text style={styles.requestName}>{request.name}</Text>
                <Text style={styles.requestMeta}>{request.meta}</Text>
              </View>
              <View style={styles.requestStatusBadge}>
                <Text style={styles.requestStatusText}>{request.status}</Text>
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
                onPress={() => openRequestDate(request.vendorId)}
                style={({ pressed }) => [
                  styles.requestActionGhost,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.requestActionGhostText}>Изменить дату</Text>
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
  onChangeEventDraft,
}: {
  bookings: ClientBooking[];
  eventDraft: EventDraft;
  onChangeEventDraft: (draft: EventDraft) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(eventDraft);
  useEffect(() => {
    setDraft(eventDraft);
  }, [eventDraft]);
  const eventRows = [
    ['Тип', eventDraft.type],
    ['Дата', eventDraft.date],
    ['Город', eventDraft.city],
    ['Гости', eventDraft.guests],
    ['Бюджет', eventDraft.budget],
    ['Площадка', eventDraft.place],
  ];
  const updateDraftField = (field: keyof EventDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };
  const saveDraft = () => {
    onChangeEventDraft(draft);
    setEditing(false);
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
    setEditing(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.clientTabScreenContent}>
      <Text style={styles.clientTabTitle}>Мое мероприятие</Text>
      <Text style={styles.clientTabMeta}>Сводка, бронь и основные детали</Text>
      {editing ? (
        <View style={styles.clientEventCard}>
          {[
            ['type', 'Тип мероприятия', 'Кыз узату, годик, 40 дней...'],
            ['date', 'Дата', '7 сентября'],
            ['city', 'Город', 'Алматы'],
            ['guests', 'Гости', '120'],
            ['budget', 'Бюджет', '3 500 000 тг'],
            ['place', 'Площадка', 'Grand Hall'],
            ['comment', 'Комментарий', 'Что важно учесть'],
          ].map(([field, label, placeholder]) => (
            <View key={field} style={styles.draftInputRow}>
              <Text style={styles.draftInputLabel}>{label}</Text>
              <TextInput
                placeholder={placeholder}
                placeholderTextColor="#6F7A83"
                style={styles.draftInput}
                value={draft[field as keyof EventDraft]}
                onChangeText={(value) =>
                  updateDraftField(field as keyof EventDraft, value)
                }
              />
            </View>
          ))}
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
        </View>
      ) : (
        <View style={styles.clientEventCard}>
          {eventRows.map(([label, value]) => (
            <View key={label} style={styles.clientEventRow}>
              <Text style={styles.clientEventLabel}>{label}</Text>
              <Text numberOfLines={2} style={styles.clientEventValue}>
                {value || 'Не указано'}
              </Text>
            </View>
          ))}
          <View style={styles.requestActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setEditing(true)}
              style={({ pressed }) => [
                styles.requestActionPrimary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.requestActionPrimaryText}>Редактировать</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={createNewEvent}
              style={({ pressed }) => [
                styles.requestActionGhost,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.requestActionGhostText}>Новое</Text>
            </Pressable>
          </View>
        </View>
      )}
      <Text style={styles.clientSectionTitle}>Брони</Text>
      {bookings.length ? (
        bookings.map((booking) => (
          <View key={booking.id} style={styles.clientBookingCard}>
            <View>
              <Text style={styles.clientSavedName}>{booking.vendorName}</Text>
              <Text style={styles.clientSavedMeta}>
                {booking.date}
                {booking.timeFrom && booking.timeTo
                  ? ` · ${booking.timeFrom}-${booking.timeTo}`
                  : ''}
                {' · '}
                {booking.amount}
              </Text>
            </View>
            <View style={styles.requestStatusBadge}>
              <Text style={styles.requestStatusText}>{booking.status}</Text>
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
  email,
  onOpenCabinet,
  onSignOut,
  onSwitchRole,
  savedCount,
}: {
  bookingsCount: number;
  email: string;
  onOpenCabinet: () => void;
  onSignOut: () => void;
  onSwitchRole: () => void;
  savedCount: number;
}) {
  return (
    <ScrollView contentContainerStyle={styles.clientTabScreenContent}>
      <Text style={styles.clientTabTitle}>Профиль</Text>
      <Text style={styles.clientTabMeta}>{email}</Text>
      <View style={styles.clientEventCard}>
        <View style={styles.vendorDashboardStats}>
          <VendorStat value={String(savedCount)} label="избранное" />
          <VendorStat value={String(bookingsCount)} label="броней" />
          <VendorStat value="1" label="событие" />
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

function ClientSettingsPanel({
  bookings,
  eventDraft,
  onChangeEventDraft,
  onClose,
  onDeleteAccount,
  onSignOut,
  onSwitchRole,
  savedVendors,
  settings,
}: {
  bookings: ClientBooking[];
  eventDraft: EventDraft;
  onChangeEventDraft: (draft: EventDraft) => void;
  onClose: () => void;
  onDeleteAccount: () => void;
  onSignOut: () => void;
  onSwitchRole: (role: Role) => void;
  savedVendors: Vendor[];
  settings: typeof clientSettings;
}) {
  const [activeSetting, setActiveSetting] = useState<(typeof clientSettings)[number] | null>(
    null,
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
            eventDraft={eventDraft}
            onChangeEventDraft={onChangeEventDraft}
            savedVendors={savedVendors}
            setting={activeSetting}
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
              <Text style={styles.vendorSettingsChevron}>›</Text>
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
                <Text style={styles.vendorSettingsChevron}>›</Text>
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
            <Pressable
              accessibilityRole="button"
              onPress={onDeleteAccount}
              style={({ pressed }) => [
                styles.vendorSettingsLogout,
                pressed && styles.pressed,
              ]}
            >
              <X color={colors.coral} size={20} strokeWidth={2.2} />
              <Text style={styles.vendorSettingsLogoutText}>Удалить аккаунт</Text>
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
  onChangeBusyDates,
  onChangeUploadedMedia,
  onCloseSettings,
  onDeleteAccount,
  onOpenSettings,
  onSignOut,
  onSwitchRole,
  onUpdateRequestStatus,
  settingsOpen,
  settings,
  uploadedMedia,
  vendorDraft,
  vendors,
}: {
  bookings: ClientBooking[];
  busyDates: string[];
  onChangeBusyDates: (busyDates: string[]) => void;
  onChangeUploadedMedia: (media: UploadedMediaItem[]) => void;
  onCloseSettings: () => void;
  onDeleteAccount: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  onSwitchRole: (role: Role) => void;
  onUpdateRequestStatus: (bookingId: string, status: string) => void;
  settingsOpen: boolean;
  settings: typeof vendorSettings;
  uploadedMedia: UploadedMediaItem[];
  vendorDraft: VendorDraft;
  vendors: Vendor[];
}) {
  const [activeSetting, setActiveSetting] = useState<(typeof vendorSettings)[number] | null>(
    null,
  );
  const [profilePreviewOpen, setProfilePreviewOpen] = useState(false);
  const [activeDashboardSection, setActiveDashboardSection] =
    useState<VendorDashboardSection | 'home'>('home');
  const visibleSettings = settings.filter(
    (item) => !['Заявки', 'Даты', 'Статистика'].includes(item.label),
  );
  const bookingRequests = bookings.map((booking) => ({
    id: booking.id,
    name: booking.clientName || booking.clientEmail || 'Клиент',
    date: `${booking.date}${
      booking.timeFrom && booking.timeTo ? ` · ${booking.timeFrom}-${booking.timeTo}` : ''
    }`,
    amount: booking.amount,
    status: booking.status,
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
  const mediaSetting =
    settings.find((item) => item.label === 'Медиа') ?? {
      label: 'Медиа',
      meta: 'Фото, видео, посты и подписи',
    };

  return (
    <View style={styles.vendorDashboard}>
      {profilePreviewOpen ? (
        <ScrollView
          contentContainerStyle={styles.vendorDetailContent}
          style={styles.vendorProfilePreviewOverlay}
        >
          <VendorDetailScreen
            vendor={{
              ...vendorPreview,
              name: vendorDraft.name,
              city: vendorDraft.city,
              category: vendorDraft.category,
              priceFrom: Number(vendorDraft.priceFrom) || vendorPreview.priceFrom,
              contactPhone: vendorDraft.phone,
            }}
            isSaved={false}
            onBack={() => setProfilePreviewOpen(false)}
            onBlock={() => undefined}
            onBook={() => false}
            onReport={() => undefined}
            onToggleSaved={() => undefined}
          />
        </ScrollView>
      ) : null}
      <View style={styles.vendorDashboardHeader}>
        <View>
          <Text style={styles.vendorDashboardEyebrow}>Режим поставщика</Text>
          <Text style={styles.vendorDashboardTitle}>{vendorDraft.name}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={settingsOpen ? onCloseSettings : onOpenSettings}
          style={({ pressed }) => [
            styles.vendorBurgerButton,
            pressed && styles.pressed,
          ]}
        >
          {settingsOpen ? (
            <X color={colors.surface} size={26} strokeWidth={2.1} />
          ) : (
            <Menu color={colors.surface} size={28} strokeWidth={2.1} />
          )}
        </Pressable>
      </View>

      <View style={styles.modeSwitchPanel}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onSwitchRole('client')}
          style={({ pressed }) => [styles.modeSwitchButton, pressed && styles.pressed]}
        >
          <Text style={styles.modeSwitchText}>Клиент</Text>
        </Pressable>
        <View style={[styles.modeSwitchButton, styles.modeSwitchButtonActive]}>
          <Text style={[styles.modeSwitchText, styles.modeSwitchTextActive]}>
            Поставщик
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.vendorDashboardContent}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setProfilePreviewOpen(true)}
          style={({ pressed }) => [
            styles.vendorProfileHeroCard,
            pressed && styles.pressed,
          ]}
        >
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={getVendorImageSource({
              category: vendorDraft.category,
              imageKey: vendorDraft.category === 'Декор' ? 'decor' : 'host',
            })}
            style={styles.vendorProfileHeroLogo}
          />
          <View style={styles.vendorProfileHeroCopy}>
            <View style={styles.vendorActiveBadge}>
              <Text style={styles.vendorActiveBadgeText}>Профиль активен</Text>
            </View>
            <View style={styles.vendorProfileHeroNameRow}>
              <Text style={styles.vendorProfileHeroName} numberOfLines={1}>
                {vendorDraft.name}
              </Text>
              <BadgeCheck color={colors.green} fill={colors.green} size={24} strokeWidth={2.4} />
            </View>
            <Text style={styles.vendorProfileHeroMeta} numberOfLines={2}>
              Категория: {vendorDraft.category} и оформление
            </Text>
            <Text style={styles.vendorProfileHeroMeta}>{vendorDraft.city}, Казахстан</Text>
          </View>
          <Text style={styles.vendorProfileHeroChevron}>›</Text>
          <View style={styles.vendorHeroStatsRow}>
            <VendorStat value={String(Math.max(uploadedMedia.length, 12))} label="медиа" />
            <VendorStat value="38" label="отзывов" />
            <VendorStat value={String(bookings.length)} label="броней" />
          </View>
        </Pressable>

        {activeDashboardSection === 'home' ? (
          <>
            <View style={styles.vendorDashboardCard}>
              <View style={styles.vendorDashboardCardHeader}>
                <Text style={styles.vendorDashboardCardTitle}>Сводка</Text>
                <Text style={styles.vendorDashboardLink}>Сегодня</Text>
              </View>
              <View style={styles.vendorRequestStatsRow}>
                <VendorMiniStat color="#A970FF" label="новые" value={String(newRequestsCount)} />
                <VendorMiniStat color="#4A9BFF" label="в работе" value={String(inWorkRequestsCount)} />
                <VendorMiniStat color={colors.green} label="закрыто" value={String(doneRequestsCount)} />
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.vendorAutoReplyCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.vendorAutoReplyCopy}>
                <Text style={styles.vendorDashboardCardTitle}>Автоответ клиенту</Text>
                <Text style={styles.vendorDashboardCardText}>
                  Спасибо за заявку! Напишите дату, город и формат мероприятия — я быстро отвечу по стоимости.
                </Text>
              </View>
              <View style={styles.vendorAutoReplyToggle}>
                <View style={styles.vendorAutoReplyKnob} />
              </View>
              <Text style={styles.vendorProfileHeroChevron}>›</Text>
            </Pressable>
          </>
        ) : activeDashboardSection === 'requests' ? (
          <>
            <View style={styles.vendorDashboardCard}>
              <View style={styles.vendorDashboardCardHeader}>
                <Text style={styles.vendorDashboardCardTitle}>Заявки</Text>
                <Text style={styles.vendorDashboardLink}>Смотреть все</Text>
              </View>
              <View style={styles.vendorRequestStatsRow}>
                <VendorMiniStat color="#A970FF" label="новые" value={String(newRequestsCount)} />
                <VendorMiniStat color="#4A9BFF" label="в работе" value={String(inWorkRequestsCount)} />
                <VendorMiniStat color={colors.green} label="закрыто" value={String(doneRequestsCount)} />
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.vendorAutoReplyCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.vendorAutoReplyCopy}>
                <Text style={styles.vendorDashboardCardTitle}>Автоответ клиенту</Text>
                <Text style={styles.vendorDashboardCardText}>
                  Спасибо за заявку! Напишите дату, город и формат мероприятия — я быстро отвечу по стоимости.
                </Text>
              </View>
              <View style={styles.vendorAutoReplyToggle}>
                <View style={styles.vendorAutoReplyKnob} />
              </View>
              <Text style={styles.vendorProfileHeroChevron}>›</Text>
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
              onChangeBusyDates={onChangeBusyDates}
            />
          ) : (
            <StatsSettingsEditor />
          )}
          </View>
        )}
      </ScrollView>

      <View style={styles.vendorBottomBar}>
        <VendorBottomNavItem
          active={activeDashboardSection === 'home'}
          icon={Grid2X2}
          label="Главная"
          onPress={() => setActiveDashboardSection('home')}
        />
        <VendorBottomNavItem
          active={activeDashboardSection === 'requests'}
          badge={newRequestsCount ? String(newRequestsCount) : undefined}
          icon={MessageCircle}
          label="Заявки"
          onPress={() => setActiveDashboardSection('requests')}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setActiveSetting(mediaSetting);
            onOpenSettings();
          }}
          style={({ pressed }) => [
            styles.vendorBottomAddButton,
            pressed && styles.pressed,
          ]}
        >
          <Plus color={colors.surface} size={38} strokeWidth={2.1} />
        </Pressable>
        <VendorBottomNavItem
          active={activeDashboardSection === 'calendar'}
          icon={CalendarDays}
          label="Календарь"
          onPress={() => setActiveDashboardSection('calendar')}
        />
        <VendorBottomNavItem
          icon={UserRound}
          label="Профиль"
          onPress={() => setProfilePreviewOpen(true)}
        />
      </View>

      {settingsOpen ? (
        <View style={styles.vendorSettingsOverlay}>
          <Pressable
            accessibilityRole="button"
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
                onChangeUploadedMedia={onChangeUploadedMedia}
                setting={activeSetting}
                uploadedMedia={uploadedMedia}
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
                    <Text style={styles.vendorSettingsChevron}>›</Text>
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
                <Pressable
                  accessibilityRole="button"
                  onPress={onDeleteAccount}
                  style={({ pressed }) => [
                    styles.vendorSettingsLogout,
                    pressed && styles.pressed,
                  ]}
                >
                  <X color={colors.coral} size={20} strokeWidth={2.2} />
                  <Text style={styles.vendorSettingsLogoutText}>Удалить аккаунт</Text>
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
      <View style={styles.vendorRequestAvatar}>
        <Text style={styles.vendorRequestAvatarText}>{initial}</Text>
      </View>
      <View style={styles.vendorRequestBody}>
        <View style={styles.vendorRequestTopRow}>
          <Text style={styles.vendorRequestName} numberOfLines={1}>
            {request.name}
          </Text>
          <View
            style={[
              styles.vendorRequestStatus,
              request.status === 'В работе' && styles.vendorRequestStatusBlue,
              request.status === 'Ожидает' && styles.vendorRequestStatusMuted,
            ]}
          >
            <Text style={styles.vendorRequestStatusText}>{request.status}</Text>
          </View>
        </View>
        <Text style={styles.vendorRequestMeta} numberOfLines={1}>
          {request.date} · {request.amount}
        </Text>
        <Text style={styles.vendorRequestMessage} numberOfLines={2}>
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
      <View style={styles.vendorRequestAside}>
        <Text style={styles.vendorRequestTime}>{request.time}</Text>
        <Text style={styles.vendorProfileHeroChevron}>›</Text>
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
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.vendorBottomNavItem,
        pressed && styles.pressed,
      ]}
    >
      <View>
        <Icon
          color={active ? '#6B5CFF' : '#A7B0BA'}
          size={27}
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
  eventDraft,
  onChangeEventDraft,
  onBack,
  savedVendors,
  setting,
}: {
  bookings: ClientBooking[];
  eventDraft: EventDraft;
  onChangeEventDraft: (draft: EventDraft) => void;
  onBack: () => void;
  savedVendors: Vendor[];
  setting: (typeof clientSettings)[number];
}) {
  const fields = getClientSettingFields(setting.label);
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
        <Text style={styles.vendorSettingBackText}>← Назад</Text>
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
                  <View>
                    <Text style={styles.requestName}>{booking.vendorName}</Text>
                    <Text style={styles.requestMeta}>
                      {booking.date} · {booking.amount}
                    </Text>
                  </View>
                  <View style={styles.requestStatusBadge}>
                    <Text style={styles.requestStatusText}>{booking.status}</Text>
                  </View>
                </View>
                <Text style={styles.requestMessage}>
                  Дата забронирована после договоренности. Поставщик должен подтвердить.
                </Text>
                <View style={styles.requestActions}>
                  <Pressable style={styles.requestActionPrimary}>
                    <Text style={styles.requestActionPrimaryText}>Изменить дату</Text>
                  </Pressable>
                  <Pressable style={styles.requestActionGhost}>
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
            savedVendors.map((vendor) => (
              <View key={vendor.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View>
                    <Text style={styles.requestName}>{vendor.name}</Text>
                    <Text style={styles.requestMeta}>
                      {vendor.category} · {vendor.city} · от {formatMoney(vendor.priceFrom)}
                    </Text>
                  </View>
                  <View style={styles.requestStatusBadge}>
                    <Text style={styles.requestStatusText}>{vendor.rating}</Text>
                  </View>
                </View>
                <Text style={styles.requestMessage} numberOfLines={2}>
                  {vendor.description}
                </Text>
              </View>
            ))
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
              {bookings.length
                ? `Забронировано подрядчиков: ${bookings.length}.`
                : 'Тут будут брони, дедлайны предоплаты и встречи.'}
            </Text>
          </View>
          {bookings.map((booking) => (
            <View key={booking.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View>
                  <Text style={styles.requestName}>{booking.vendorName}</Text>
                  <Text style={styles.requestMeta}>{booking.date}</Text>
                </View>
                <View style={styles.requestStatusBadge}>
                  <Text style={styles.requestStatusText}>{booking.status}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        fields.map((field) => (
          <DraftInput
            key={field}
            label={field}
            onChangeText={(value) => {
              if (setting.label === 'Мероприятие') {
                updateEventField(field, value);
              }
            }}
            value={
              setting.label === 'Мероприятие'
                ? getEventSettingValue(eventDraft, field)
                : getClientSettingDefault(setting.label, field, bookings)
            }
          />
        ))
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
    Заявки: ['Кому написал', 'Ответы подрядчиков', 'Статусы', 'История обращений'],
    Бюджет: ['Общий бюджет', 'Забронировано', 'Осталось', 'Категории расходов'],
    Документы: ['Договоры', 'Чеки / квитанции', 'Подтверждения брони'],
    Уведомления: ['Ответ подрядчика', 'Подтверждение брони', 'Напоминание об оплате'],
    Профиль: ['Имя', 'Телефон', 'Почта', 'Город'],
    Настройки: ['Язык', 'Безопасность', 'Поддержка'],
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

function getClientSettingDefault(
  label: string,
  field: string,
  bookings: ClientBooking[] = [],
) {
  const bookedAmount = bookings[0]?.amount ?? '0 тг';
  const defaults: Record<string, Record<string, string>> = {
    Мероприятие: {
      'Тип мероприятия': 'Кыз узату',
      'Дата мероприятия': '6 сентября',
      Город: 'Алматы',
      'Количество гостей': '120',
      Бюджет: '3 500 000 тг',
      Площадка: 'Пока выбираем',
      Комментарий: 'Нужны ведущий, декор и фото.',
    },
    Бюджет: {
      'Общий бюджет': '3 500 000 тг',
      Забронировано: bookedAmount,
      Осталось: '3 180 000 тг',
      'Категории расходов': 'Ведущий, зал, декор, фото',
    },
    Профиль: {
      Имя: 'Алия',
      Телефон: '+77015550101',
      Почта: 'client@svadba.kz',
      Город: 'Алматы',
    },
  };
  return defaults[label]?.[field] ?? '';
}

function VendorSettingForm({
  bookings,
  onChangeUploadedMedia,
  onBack,
  setting,
  uploadedMedia,
}: {
  bookings: ClientBooking[];
  onChangeUploadedMedia: (media: UploadedMediaItem[]) => void;
  onBack: () => void;
  setting: (typeof vendorSettings)[number];
  uploadedMedia: UploadedMediaItem[];
}) {
  const [values, setValues] = useState(() => getSettingFormDefaults(setting.label));
  const fields = getSettingFields(setting.label);

  const updateValue = (label: string, value: string) => {
    setValues((current) => ({ ...current, [label]: value }));
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
        <Text style={styles.vendorSettingBackText}>← Назад</Text>
      </Pressable>
      <View style={styles.vendorSettingFormHero}>
        <Text style={styles.vendorSettingFormTitle}>{setting.label}</Text>
        <Text style={styles.vendorSettingFormMeta}>{setting.meta}</Text>
      </View>

      {setting.label === 'Медиа' ? (
        <MediaSettingsEditor
          media={uploadedMedia}
          onChangeMedia={onChangeUploadedMedia}
        />
      ) : setting.label === 'Instagram' ? (
        <InstagramSettingsEditor
          onImportToMedia={(items) => {
            const importedItems: UploadedMediaItem[] = items.map((item, index) => ({
              id: `ig-import-${Date.now()}-${index}`,
              uri: item.sourceUrl,
              type: item.type,
              fileName: item.title,
              imageKey: item.imageKey,
              sourceUrl: item.sourceUrl,
              selected: true,
              role:
                uploadedMedia.length === 0 && index === 0
                  ? 'main'
                  : item.type === 'video'
                    ? 'reels'
                    : 'profile',
              status: 'ready',
            }));
            onChangeUploadedMedia([...uploadedMedia, ...importedItems]);
          }}
        />
      ) : setting.label === 'Заявки' ? (
        <RequestsSettingsEditor bookings={bookings} />
      ) : setting.label === 'Даты' ? (
        <DatesSettingsEditor busyDates={[]} onChangeBusyDates={() => undefined} />
      ) : setting.label === 'Статистика' ? (
        <StatsSettingsEditor />
      ) : (
        fields.map((field) => (
          <DraftInput
            key={field}
            label={field}
            onChangeText={(value) => updateValue(field, value)}
            value={values[field] ?? ''}
          />
        ))
      )}

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.vendorSettingSaveButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.vendorSettingSaveText}>Сохранить</Text>
      </Pressable>
    </ScrollView>
  );
}

function StatsSettingsEditor() {
  const bars = [42, 64, 58, 86, 74, 92, 68];
  const topMedia = [
    { title: 'Главное видео', value: '1 240 просмотров', imageKey: 'host' as VendorImageKey },
    { title: 'Reels с банкета', value: '860 просмотров', imageKey: 'dj' as VendorImageKey },
    { title: 'Фото портфолио', value: '430 просмотров', imageKey: 'decor' as VendorImageKey },
  ];

  return (
    <View style={styles.statsSettingsWrap}>
      <View style={styles.statsMetricGrid}>
        <VendorStat value="12.4K" label="просмотры" />
        <VendorStat value="842" label="лайки" />
        <VendorStat value="318" label="сохранения" />
        <VendorStat value="146" label="WhatsApp" />
      </View>

      <View style={styles.statsChartCard}>
        <View style={styles.requestHeader}>
          <View>
            <Text style={styles.requestsSummaryTitle}>Активность</Text>
            <Text style={styles.requestsSummaryText}>Последние 7 дней</Text>
          </View>
          <Text style={styles.statsGrowth}>+24%</Text>
        </View>
        <View style={styles.statsBarChart}>
          {bars.map((height, index) => (
            <View key={`${height}-${index}`} style={styles.statsBarSlot}>
              <View style={[styles.statsBar, { height }]} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.statsConversionCard}>
        <Text style={styles.requestsSummaryTitle}>Конверсия</Text>
        <View style={styles.statsFunnel}>
          <StatsFunnelRow label="Просмотры профиля" value="12 400" width="100%" />
          <StatsFunnelRow label="Сохранения" value="318" width="68%" />
          <StatsFunnelRow label="Клики WhatsApp" value="146" width="42%" />
          <StatsFunnelRow label="Заявки" value="31" width="24%" />
        </View>
      </View>

      <View style={styles.statsConversionCard}>
        <Text style={styles.requestsSummaryTitle}>Популярные медиа</Text>
        {topMedia.map((item) => (
          <View key={item.title} style={styles.statsMediaRow}>
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="cover"
              source={getVendorImageSource({
                category: 'Ведущие',
                imageKey: item.imageKey,
              })}
              style={styles.statsMediaThumb}
            />
            <View style={styles.vendorSettingsCopy}>
              <Text style={styles.vendorSettingsItemTitle}>{item.title}</Text>
              <Text style={styles.vendorSettingsItemMeta}>{item.value}</Text>
            </View>
          </View>
        ))}
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

function DatesSettingsEditor({
  busyDates,
  onChangeBusyDates,
}: {
  busyDates: string[];
  onChangeBusyDates: (busyDates: string[]) => void;
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
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(2026, 8, 1));
  const [selectedIso, setSelectedIso] = useState('2026-09-06');
  const [busyDateList, setBusyDateList] = useState(
    busyDates.length
      ? busyDates
      : ['2026-09-12', '2026-09-19', '2026-09-24'],
  );
  useEffect(() => {
    if (busyDates.length) {
      setBusyDateList(busyDates);
    }
  }, [busyDates]);
  const busyDateSet = new Set(busyDateList);
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
  const selectedDate = parseIsoDate(selectedIso);
  const selectedLabel = `${selectedDate.getDate()} ${monthNames[
    selectedDate.getMonth()
  ].toLowerCase()}`;
  const visibleMonthTitle = `${monthNames[month]} ${year}`;
  const changeMonth = (delta: number) => {
    setVisibleMonth((current) => {
      return new Date(current.getFullYear(), current.getMonth() + delta, 1);
    });
  };
  const toIso = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const markSelectedFree = () => {
    setBusyDateList((current) => {
      const next = current.filter((date) => date !== selectedIso);
      onChangeBusyDates(next);
      return next;
    });
  };
  const markSelectedBusy = () => {
    setBusyDateList((current) => {
      const next = current.includes(selectedIso) ? current : [...current, selectedIso];
      onChangeBusyDates(next);
      return next;
    });
  };

  return (
    <View style={styles.datesSettingsWrap}>
      <View style={styles.calendarSummaryCard}>
        <Text style={styles.requestsSummaryTitle}>Ближайшая свободная дата</Text>
        <Text style={styles.calendarBigDate}>{selectedLabel}</Text>
        <Text style={styles.requestsSummaryText}>
          Клиенты увидят эту дату в профиле и в шортсах.
        </Text>
        <Text style={styles.calendarWeekendText}>
          Воскресенья открыты для бронирования.
        </Text>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <View style={styles.calendarMonthNav}>
            <Pressable
              accessibilityRole="button"
              onPress={() => changeMonth(-1)}
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
              onPress={() => changeMonth(1)}
              style={({ pressed }) => [
                styles.calendarNavButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.calendarNavText}>›</Text>
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
                const busy = busyDateSet.has(iso);
                const selected = iso === selectedIso;
                return (
                  <Pressable
                    key={day}
                    accessibilityRole="button"
                    onPress={() => setSelectedIso(iso)}
                    style={({ pressed }) => [
                      styles.calendarMonthDay,
                      isSunday && styles.calendarMonthDaySunday,
                      busy && styles.calendarMonthDayBusy,
                      selected && styles.calendarMonthDaySelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarMonthDayText,
                        isSunday && styles.calendarMonthDayTextSunday,
                        busy && styles.calendarMonthDayTextBusy,
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
      </View>

      <View style={styles.mediaActionRow}>
        <Pressable
          accessibilityRole="button"
          onPress={markSelectedFree}
          style={({ pressed }) => [
            styles.mediaActionButton,
            pressed && styles.pressed,
          ]}
        >
          <Check color={colors.surface} size={19} strokeWidth={2.2} />
          <Text style={styles.mediaActionText}>Отметить свободно</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={markSelectedBusy}
          style={({ pressed }) => [
            styles.mediaActionButton,
            pressed && styles.pressed,
          ]}
        >
          <X color={colors.surface} size={19} strokeWidth={2.2} />
          <Text style={styles.mediaActionText}>Отметить занято</Text>
        </Pressable>
      </View>

      <View style={styles.requestsTemplateCard}>
        <Text style={styles.requestsTemplateTitle}>Автоответ если дата занята</Text>
        <Text style={styles.requestsTemplateText}>
          Эта дата уже занята. Могу предложить ближайшие свободные даты.
        </Text>
      </View>
    </View>
  );
}

function RequestsSettingsEditor({ bookings }: { bookings: ClientBooking[] }) {
  const requests = [
    {
      id: 'r1',
      name: 'Алия',
      date: '7 сентября',
      budget: '450 000 тг',
      status: 'Новая',
      message: 'Нужен ведущий на мероприятие, 120 гостей.',
    },
    {
      id: 'r2',
      name: 'Дамир',
      date: '14 сентября',
      budget: '350 000 тг',
      status: 'В работе',
      message: 'Хотим программу на русском и казахском.',
    },
    {
      id: 'r3',
      name: 'Мадина',
      date: '21 сентября',
      budget: '520 000 тг',
      status: 'Подтверждена',
      message: 'Нужна церемония и банкет.',
    },
  ];
  const bookingRequests = bookings.map((booking) => ({
    id: booking.id,
    name: 'Клиент',
    date: booking.date,
    budget: booking.amount,
    status: booking.status,
    message: `${booking.vendorName}: клиент хочет закрепить дату после договоренности.`,
  }));
  const visibleRequests = [...bookingRequests, ...requests];

  return (
    <View style={styles.requestsSettingsWrap}>
      <View style={styles.requestsSummaryCard}>
        <Text style={styles.requestsSummaryTitle}>Заявки</Text>
        <Text style={styles.requestsSummaryText}>
          Новые обращения, статусы и быстрые ответы клиентам.
        </Text>
        <View style={styles.instagramSyncStats}>
          <VendorStat value={String(visibleRequests.length)} label="новые" />
          <VendorStat value="8" label="в работе" />
          <VendorStat value="12" label="закрыто" />
        </View>
      </View>

      <View style={styles.requestsTemplateCard}>
        <Text style={styles.requestsTemplateTitle}>Автоответ клиенту</Text>
        <Text style={styles.requestsTemplateText}>
          Спасибо за заявку. Напишите дату, город и формат мероприятия — я быстро отвечу по стоимости.
        </Text>
      </View>

      {visibleRequests.map((request) => (
        <View key={request.id} style={styles.requestCard}>
          <View style={styles.requestHeader}>
            <View>
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
              <Text style={styles.requestStatusText}>{request.status}</Text>
            </View>
          </View>
          <Text style={styles.requestMessage}>{request.message}</Text>
          <View style={styles.requestActions}>
            <Pressable style={styles.requestActionPrimary}>
              <Text style={styles.requestActionPrimaryText}>Ответить</Text>
            </Pressable>
            <Pressable style={styles.requestActionGhost}>
              <Text style={styles.requestActionGhostText}>Подтвердить</Text>
            </Pressable>
            <Pressable style={styles.requestActionGhost}>
              <Text style={styles.requestActionGhostText}>Отказать</Text>
            </Pressable>
          </View>
        </View>
      ))}

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

function InstagramSettingsEditor({
  onImportToMedia,
}: {
  onImportToMedia: (items: InstagramImportPreviewItem[]) => void;
}) {
  const [handle, setHandle] = useState('@kairkuka');
  const [links, setLinks] = useState(
    'https://www.instagram.com/kairkuka/\nhttps://www.instagram.com/reel/demo/',
  );
  const [previewItems, setPreviewItems] = useState<InstagramImportPreviewItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState('Готов к поиску медиа');

  const runImportBot = async () => {
    const urls = links
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);
    setImportStatus('Бот собирает фото и видео...');

    try {
      const result = await requestInstagramImportPreview(handle, urls);
      setPreviewItems(result.items);
      setSelectedIds(result.items.map((item) => item.id));
      setImportStatus(`Найдено ${result.items.length} медиа`);
    } catch {
      const fallbackItems = instagramDraftMedia.map((item, index) => ({
        ...item,
        sourceUrl: urls[index] ?? `https://instagram.com/${handle.replace('@', '')}`,
      }));
      setPreviewItems(fallbackItems);
      setSelectedIds(fallbackItems.map((item) => item.id));
      setImportStatus(`Найдено ${fallbackItems.length} медиа`);
    }
  };

  const selectedItems = previewItems.filter((item) => selectedIds.includes(item.id));
  const toggleSelected = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
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
          <Text style={styles.instagramSettingsAccountTitle}>{handle}</Text>
          <Text style={styles.instagramSettingsAccountMeta}>
            Ручной бот импорта · API подключим позже
          </Text>
        </View>
        <View style={styles.oauthBadge}>
          <Check color={colors.surface} size={16} strokeWidth={3} />
        </View>
      </View>

      <View style={styles.instagramBotCard}>
        <DraftInput
          label="Instagram аккаунт"
          onChangeText={setHandle}
          value={handle}
        />
        <Text style={styles.instagramBotLabel}>Ссылки на профиль, Reels или посты</Text>
        <TextInput
          multiline
          onChangeText={setLinks}
          placeholder="Одна ссылка на строку"
          placeholderTextColor="#7F8A94"
          style={styles.instagramBotTextarea}
          value={links}
        />
        <Pressable
          accessibilityRole="button"
          onPress={runImportBot}
          style={({ pressed }) => [
            styles.instagramImportButton,
            pressed && styles.pressed,
          ]}
        >
          <Camera color={colors.surface} size={20} strokeWidth={2.2} />
          <Text style={styles.instagramImportButtonText}>Запустить бота</Text>
        </Pressable>
        <Text style={styles.instagramBotStatus}>{importStatus}</Text>
      </View>

      <View style={styles.instagramPermissionGrid}>
        {['Аккаунт', 'Посты', 'Reels', 'Фото'].map((permission) => (
          <View key={permission} style={styles.permissionPill}>
            <Check color={colors.green} size={14} strokeWidth={2.6} />
            <Text style={styles.permissionText}>{permission}</Text>
          </View>
        ))}
      </View>

      <View style={styles.instagramSyncCard}>
        <Text style={styles.instagramSyncTitle}>Как работает сейчас</Text>
        <Text style={styles.instagramSyncText}>
          Поставщик вставляет аккаунт или ссылки. Бот показывает найденные медиа.
          В профиль попадут только выбранные фото и видео.
        </Text>
        <View style={styles.instagramSyncStats}>
          <VendorStat value={String(previewItems.length)} label="найдено" />
          <VendorStat value={String(selectedItems.length)} label="выбрано" />
          <VendorStat value="0" label="ошибок" />
        </View>
      </View>

      <Text style={styles.instagramSectionTitle}>Найденные медиа</Text>
      <View style={styles.mediaGrid}>
        {(previewItems.length ? previewItems : instagramDraftMedia.map((item, index) => ({
          ...item,
          sourceUrl: `https://instagram.com/${handle.replace('@', '')}/demo-${index + 1}`,
        }))).map((post) => {
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
              source={getVendorImageSource({
                category: 'Ведущие',
                imageKey: post.imageKey,
              })}
              style={styles.mediaTileImage}
            />
            <View style={styles.mediaTileShade} />
            <Text style={styles.mediaTileType}>
              {post.type === 'video' ? 'Видео' : 'Фото'}
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
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={selectedItems.length === 0}
        onPress={() => {
          onImportToMedia(selectedItems);
          setImportStatus(`${selectedItems.length} медиа перенесено в профиль`);
        }}
        style={({ pressed }) => [
          styles.mediaPublishButton,
          selectedItems.length === 0 && styles.disabledButton,
          pressed && styles.pressed,
        ]}
      >
        <Upload color={colors.surface} size={20} strokeWidth={2.2} />
        <Text style={styles.mediaActionText}>Перенести в медиа профиля</Text>
      </Pressable>
    </View>
  );
}

function MediaSettingsEditor({
  media,
  onChangeMedia,
}: {
  media: UploadedMediaItem[];
  onChangeMedia: (media: UploadedMediaItem[]) => void;
}) {
  const fallbackMedia = [
    { id: 'main', type: 'Главное видео', imageKey: 'host' as VendorImageKey },
    { id: 'cover', type: 'Обложка', imageKey: 'dj' as VendorImageKey },
    { id: 'photo1', type: 'Фото', imageKey: 'decor' as VendorImageKey },
    { id: 'photo2', type: 'Фото', imageKey: 'photo' as VendorImageKey },
  ];
  const mainMedia = media.find((item) => item.role === 'main') ?? media[0];
  const uploadedCount = media.filter((item) => item.status === 'uploaded').length;

  const pickMedia = async (mediaTypes: ImagePicker.MediaType[]) => {
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

    const nextItems: UploadedMediaItem[] = result.assets.map((asset, index) => {
      const type = asset.type === 'video' ? 'video' : 'image';
      return {
        id: `${Date.now()}-${index}`,
        uri: asset.uri,
        type,
        fileName: asset.fileName ?? `${type}-${Date.now()}-${index}`,
        selected: true,
        role: media.length === 0 && index === 0 ? 'main' : type === 'video' ? 'reels' : 'profile',
        status: 'ready',
      };
    });

    onChangeMedia([...media, ...nextItems]);
  };

  const updateItem = (id: string, patch: Partial<UploadedMediaItem>) => {
    onChangeMedia(
      media.map((item) => {
        if (patch.role === 'main' && item.role === 'main') {
          return { ...item, role: item.type === 'video' ? 'reels' : 'profile' };
        }
        if (patch.role === 'cover' && item.role === 'cover') {
          return { ...item, role: item.type === 'video' ? 'reels' : 'profile' };
        }
        return item.id === id ? { ...item, ...patch } : item;
      }),
    );
  };

  const removeItem = (id: string) => {
    onChangeMedia(media.filter((item) => item.id !== id));
  };

  const publishSelected = () => {
    onChangeMedia(
      media.map((item) =>
        item.selected ? { ...item, status: 'uploaded' as const } : item,
      ),
    );
  };
  const importFromInstagram = () => {
    const importedItems: UploadedMediaItem[] = [
      {
        id: `instagram-${Date.now()}-1`,
        uri: 'instagram://reel/1',
        type: 'video',
        fileName: 'instagram-reel-vedushiy.mp4',
        caption: 'Лучшие моменты с мероприятия. Импортировано из Instagram.',
        imageKey: 'host',
        sourceUrl: 'https://instagram.com/kairkuka',
        selected: true,
        role: media.length ? 'reels' : 'main',
        status: 'ready',
      },
      {
        id: `instagram-${Date.now()}-2`,
        uri: 'instagram://post/2',
        type: 'image',
        fileName: 'instagram-post-portfolio.jpg',
        caption: 'Портфолио и атмосфера мероприятия. Импортировано из Instagram.',
        imageKey: 'dj',
        sourceUrl: 'https://instagram.com/kairkuka',
        selected: true,
        role: 'profile',
        status: 'ready',
      },
    ];
    onChangeMedia([...media, ...importedItems]);
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
            source={
              mainMedia.imageKey
                ? getVendorImageSource({
                    category: 'Ведущие',
                    imageKey: mainMedia.imageKey,
                  })
                : { uri: mainMedia.uri }
            }
            style={styles.mediaMainImage}
          />
        ) : (
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={getVendorImageSource({ category: 'Ведущие', imageKey: 'host' })}
            style={styles.mediaMainImage}
          />
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
          onPress={importFromInstagram}
          style={styles.mediaActionButton}
        >
          <AtSign color={colors.surface} size={19} strokeWidth={2.2} />
          <Text style={styles.mediaActionText}>Импорт из Instagram</Text>
        </Pressable>
      </View>

      <View style={styles.mediaActionRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => pickMedia(['images'])}
          style={styles.mediaActionButton}
        >
          <ImagePlus color={colors.surface} size={19} strokeWidth={2.2} />
          <Text style={styles.mediaActionText}>Добавить фото</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => pickMedia(['videos'])}
          style={styles.mediaActionButton}
        >
          <Camera color={colors.surface} size={19} strokeWidth={2.2} />
          <Text style={styles.mediaActionText}>Добавить видео</Text>
        </Pressable>
      </View>

      {media.length ? (
        <View style={styles.mediaActionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={publishSelected}
            style={styles.mediaPublishButton}
          >
            <Check color={colors.surface} size={19} strokeWidth={2.3} />
            <Text style={styles.mediaActionText}>Опубликовать выбранное</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.mediaGrid}>
        {media.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() => updateItem(item.id, { selected: !item.selected })}
            style={({ pressed }) => [
              styles.mediaTile,
              item.selected && styles.mediaTileSelected,
              pressed && styles.pressed,
            ]}
          >
            {item.type === 'image' ? (
              <Image
                accessibilityIgnoresInvertColors
                resizeMode="cover"
                source={
                  item.imageKey
                    ? getVendorImageSource({
                        category: 'Ведущие',
                        imageKey: item.imageKey,
                      })
                    : { uri: item.uri }
                }
                style={styles.mediaTileImage}
              />
            ) : (
              <>
                <Image
                  accessibilityIgnoresInvertColors
                  resizeMode="cover"
                  source={getVendorImageSource({
                    category: 'Ведущие',
                    imageKey: item.imageKey ?? 'host',
                  })}
                  style={styles.mediaTileImage}
                />
                <View style={styles.mediaVideoPlayMark}>
                  <Play color={colors.surface} fill={colors.surface} size={28} />
                </View>
              </>
            )}
            <View style={styles.mediaTileShade} />
            <Text style={styles.mediaTileType}>
              {item.role === 'main'
                ? 'Главное'
                : item.role === 'cover'
                  ? 'Обложка'
                  : item.type === 'video'
                    ? 'Reels'
                    : 'Фото'}
            </Text>
            <View
              style={[
                styles.importCheck,
                item.selected && styles.importCheckSelected,
              ]}
            >
              {item.selected ? (
                <Check color={colors.surface} size={18} strokeWidth={3} />
              ) : null}
            </View>
            <View style={styles.mediaTileActions}>
              <Text
                onPress={() => updateItem(item.id, { role: 'main', selected: true })}
                style={styles.mediaTileActionText}
              >
                Главное
              </Text>
              <Text
                onPress={() => updateItem(item.id, { role: 'cover', selected: true })}
                style={styles.mediaTileActionText}
              >
                Обложка
              </Text>
            </View>
            <Text
              onPress={() => removeItem(item.id)}
              style={styles.mediaRemoveButton}
            >
              Убрать
            </Text>
            <Text style={styles.mediaUploadStatus}>
              {item.status === 'uploaded' ? 'Опубликовано' : 'Черновик'}
            </Text>
          </Pressable>
        ))}
        {media.length === 0
          ? fallbackMedia.map((item) => (
              <View key={item.id} style={[styles.mediaTile, styles.mediaTileMuted]}>
                <Image
                  accessibilityIgnoresInvertColors
                  resizeMode="cover"
                  source={getVendorImageSource({
                    category: 'Ведущие',
                    imageKey: item.imageKey,
                  })}
                  style={styles.mediaTileImage}
                />
                <View style={styles.mediaTileShade} />
                <Text style={styles.mediaTileType}>{item.type}</Text>
              </View>
            ))
          : null}
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
                placeholderTextColor="#6F7A83"
                style={styles.draftInput}
                value={item.caption ?? ''}
                onChangeText={(caption) => updateItem(item.id, { caption })}
              />
            </View>
          ))}
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

function getSettingFields(label: string) {
  const map: Record<string, string[]> = {
    Профиль: [
      'Название',
      'Категория',
      'Город',
      'Языки работы',
      'Короткое описание',
      'Опыт, лет',
      'Средний рейтинг',
      'WhatsApp',
      'Аватар / обложка',
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
      'Пакет базовый',
      'Пакет стандарт',
      'Пакет премиум',
      'Что входит в пакет',
      'Доп. услуги',
      'Предоплата',
    ],
    Даты: [
      'Календарь занятости',
      'Ближайшая свободная дата',
      'Автоответ если дата занята',
    ],
    Заявки: [
      'Новые заявки',
      'Статусы заявок',
      'Автоответ клиенту',
      'Шаблоны ответов',
      'Поля для клиента',
      'Уведомлять в WhatsApp',
      'История заявок',
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
      'Instagram импорт завершен',
      'Каналы уведомлений',
      'Тихие часы',
      'Частота уведомлений',
    ],
    Документы: [
      'Тип аккаунта',
      'ИИН / БИН',
      'Название юрлица',
      'Реквизиты',
      'Договор / оферта',
      'Подтверждающий документ',
      'Статус верификации',
      'Комментарий модератора',
    ],
    Настройки: [
      'Язык',
      'Почта',
      'Пароль',
      'Телефон',
      'Роль аккаунта',
      'Приватность',
      'Поддержка',
      'Удалить аккаунт',
    ],
  };
  return map[label] ?? ['Поле 1', 'Поле 2', 'Комментарий'];
}

function getSettingFormDefaults(label: string) {
  const defaults: Record<string, Record<string, string>> = {
    Профиль: {
      Название: 'kairkuka',
      Категория: 'Ведущие',
      Город: 'Алматы',
      'Языки работы': 'Русский, казахский',
      'Короткое описание': 'Современное ведение мероприятий на русском и казахском языках.',
      'Опыт, лет': '9',
      'Средний рейтинг': '4.9',
      WhatsApp: '+77015550101',
      'Аватар / обложка': 'Instagram обложка',
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
      'Instagram аккаунт': '@kairkuka',
      'Статус подключения': 'Подключен',
      'Последняя синхронизация': 'Сегодня',
      'Что импортировать': 'Посты, Reels, фото',
      Автообновление: 'Включено',
      'Выбранные посты': '4',
      'Отключить Instagram': 'Нет',
      'Повторить синхронизацию': 'Готово',
    },
    'Услуги и цены': {
      'Основная услуга': 'Ведение мероприятия',
      'Цена от': '320000',
      'Пакет базовый': 'Ведение банкета',
      'Пакет стандарт': 'Банкет + сценарий',
      'Пакет премиум': 'Банкет + церемония + сценарий',
      'Что входит в пакет': 'Ведение, сценарий, координация',
      'Доп. услуги': 'Выездная церемония, сценарий',
      Предоплата: '30%',
    },
    Даты: {
      'Календарь занятости': 'Подключен',
      'Ближайшая свободная дата': '7 сентября',
      'Автоответ если дата занята': 'Предложить ближайшие даты',
    },
  };
  return defaults[label] ?? {};
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
  onChangeText,
  value,
}: {
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.draftInputRow}>
      <Text style={styles.draftInputLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholderTextColor="#7F8A94"
        style={styles.draftInput}
        value={value}
      />
    </View>
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
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`API ${response.status}`);
  }

  return (await response.json()) as T;
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

async function requestInstagramImportPreview(handle: string, urls: string[]) {
  return apiRequest<{
    jobId: string;
    status: string;
    items: InstagramImportPreviewItem[];
  }>('/instagram/import-preview', {
    method: 'POST',
    body: { handle, urls },
  });
}

async function startEmailRegistration(email: string, password: string, role: Role) {
  return apiRequest<{
    emailSent?: boolean;
    message: string;
    ok: boolean;
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

function createOfflineUser(email: string, role: Role, profileCreated: boolean): ApiUser {
  const safeEmail = email.trim().toLowerCase() || 'review-client@svadba.kz';
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
    selectedImportIds: ['ig1', 'ig2'],
    instagramHandle: '@kairkuka',
    eventDraft: DEFAULT_EVENT_DRAFT,
    bookings: [],
    blockedVendorIds: [],
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

async function toggleSavedVendorRemote(userId: string, vendorId: string) {
  const result = await apiRequest<{ user: ApiUser }>(
    `/users/${userId}/saved-vendors`,
    {
      method: 'POST',
      body: { vendorId },
    },
  );
  return result.user;
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

async function reportVendorRemote(userId: string, vendorId: string, reason: string) {
  return apiRequest<{ ok: boolean }>(`/users/${userId}/content-reports`, {
    method: 'POST',
    body: { reason, vendorId },
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

async function fetchVendorCalendar(userId: string, token?: string | null) {
  const result = await apiRequest<{ calendar: { busyDates?: string[] } }>(
    `/users/${userId}/vendor-calendar`,
    { token },
  );
  return result.calendar.busyDates ?? [];
}

async function updateVendorCalendar(userId: string, busyDates: string[]) {
  const result = await apiRequest<{ calendar: { busyDates?: string[] } }>(
    `/users/${userId}/vendor-calendar`,
    {
      method: 'PATCH',
      body: { busyDates },
    },
  );
  return result.calendar.busyDates ?? [];
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
