export type ReviewScreenGroup =
  | 'Entry & access'
  | 'Client onboarding'
  | 'Vendor onboarding'
  | 'Vendor setup'
  | 'Client app'
  | 'Client cabinet'
  | 'Vendor app'
  | 'Vendor settings';

export type ReviewScreenConfig = {
  phase: 'auth' | 'onboarding' | 'vendorImport' | 'app';
  role: 'client' | 'vendor';
  authMode?: 'login' | 'register' | 'verify';
  authMessage?: string;
  storyIndex?: number;
  vendorImportMethod?: 'instagram' | 'manual' | null;
  instagramImportStarted?: boolean;
  clientMainTab?: 'feed' | 'requests' | 'categories' | 'event' | 'profile';
  clientData?: 'empty' | 'populated' | 'offline';
  clientEventEditing?: boolean;
  clientSettingsOpen?: boolean;
  clientSettingLabel?: string;
  vendorId?: string;
  vendorDetailTab?: 'media' | 'reviews';
  vendorBookingOpen?: boolean;
  vendorBookingCreated?: boolean;
  vendorDashboardSection?: 'home' | 'requests' | 'calendar' | 'stats';
  vendorData?: 'empty' | 'populated';
  vendorProfilePreviewOpen?: boolean;
  vendorSettingsOpen?: boolean;
  vendorSettingLabel?: string;
  vendorMediaState?: 'empty' | 'uploading' | 'failed' | 'uploaded';
};

export type ReviewScreen = {
  id: string;
  title: string;
  group: ReviewScreenGroup;
  description: string;
  state: 'Primary' | 'Alternative' | 'Populated' | 'Empty' | 'Overlay';
  config: ReviewScreenConfig;
};

const clientOnboardingTitles = [
  'Choose event',
  'Browse feed',
  'Open vendor profile',
  'Save vendors',
  'Contact directly',
  'Book a date',
  'Manage event',
];

const vendorOnboardingTitles = [
  'Create profile',
  'Add media',
  'Choose highlights',
  'Publish availability',
  'Receive requests',
  'Review statistics',
  'Manage workspace',
];

const clientSettings = [
  'Мероприятие',
  'Бронирования',
  'Избранное',
  'Календарь',
  'Бюджет',
  'Документы',
  'Уведомления',
  'Профиль',
  'Настройки',
];

const vendorSettings = [
  'Профиль',
  'Медиа',
  'Instagram',
  'Услуги и цены',
  'Даты',
  'Статистика',
  'Уведомления',
  'Документы',
  'Настройки',
];

export const reviewScreens: ReviewScreen[] = [
  {
    id: 'auth-login',
    title: 'Login',
    group: 'Entry & access',
    description: 'Existing-account entry state.',
    state: 'Primary',
    config: { phase: 'auth', role: 'client', authMode: 'login' },
  },
  {
    id: 'auth-register-client',
    title: 'Register · client',
    group: 'Entry & access',
    description: 'Client account registration.',
    state: 'Alternative',
    config: { phase: 'auth', role: 'client', authMode: 'register' },
  },
  {
    id: 'auth-register-vendor',
    title: 'Register · vendor',
    group: 'Entry & access',
    description: 'Vendor account registration.',
    state: 'Alternative',
    config: { phase: 'auth', role: 'vendor', authMode: 'register' },
  },
  {
    id: 'auth-verify',
    title: 'Email verification',
    group: 'Entry & access',
    description: 'Six-digit verification-code state.',
    state: 'Alternative',
    config: { phase: 'auth', role: 'client', authMode: 'verify' },
  },
  {
    id: 'auth-validation-error',
    title: 'Login · validation error',
    group: 'Entry & access',
    description: 'Recoverable invalid-credentials state.',
    state: 'Overlay',
    config: {
      phase: 'auth',
      role: 'client',
      authMode: 'login',
      authMessage: 'Почта или пароль указаны неверно. Проверьте данные и повторите.',
    },
  },
  ...clientOnboardingTitles.map<ReviewScreen>((title, storyIndex) => ({
    id: `client-onboarding-${storyIndex + 1}`,
    title: `${storyIndex + 1}. ${title}`,
    group: 'Client onboarding',
    description: `Client onboarding story ${storyIndex + 1} of ${clientOnboardingTitles.length}.`,
    state: storyIndex === 0 ? 'Primary' : 'Alternative',
    config: { phase: 'onboarding', role: 'client', storyIndex },
  })),
  ...vendorOnboardingTitles.map<ReviewScreen>((title, storyIndex) => ({
    id: `vendor-onboarding-${storyIndex + 1}`,
    title: `${storyIndex + 1}. ${title}`,
    group: 'Vendor onboarding',
    description: `Vendor onboarding story ${storyIndex + 1} of ${vendorOnboardingTitles.length}.`,
    state: storyIndex === 0 ? 'Primary' : 'Alternative',
    config: { phase: 'onboarding', role: 'vendor', storyIndex },
  })),
  {
    id: 'vendor-setup-method',
    title: 'Import method',
    group: 'Vendor setup',
    description: 'Choose Instagram or manual upload.',
    state: 'Primary',
    config: { phase: 'vendorImport', role: 'vendor', vendorImportMethod: null },
  },
  {
    id: 'vendor-setup-instagram',
    title: 'Instagram import',
    group: 'Vendor setup',
    description: 'Connected Instagram selection and profile completion.',
    state: 'Populated',
    config: {
      phase: 'vendorImport',
      role: 'vendor',
      vendorImportMethod: 'instagram',
      instagramImportStarted: true,
    },
  },
  {
    id: 'vendor-setup-manual',
    title: 'Manual upload',
    group: 'Vendor setup',
    description: 'Manual media selection and profile completion.',
    state: 'Alternative',
    config: {
      phase: 'vendorImport',
      role: 'vendor',
      vendorImportMethod: 'manual',
    },
  },
  {
    id: 'client-categories',
    title: 'Category chooser',
    group: 'Client app',
    description: 'Category-based entry to vendor shorts.',
    state: 'Primary',
    config: { phase: 'app', role: 'client', clientMainTab: 'categories' },
  },
  {
    id: 'client-feed',
    title: 'Vendor shorts',
    group: 'Client app',
    description: 'Immersive short-form vendor discovery.',
    state: 'Primary',
    config: { phase: 'app', role: 'client', clientMainTab: 'feed' },
  },
  {
    id: 'client-requests',
    title: 'Requests',
    group: 'Client app',
    description: 'Requests with active booking data.',
    state: 'Populated',
    config: {
      phase: 'app',
      role: 'client',
      clientMainTab: 'requests',
      clientData: 'populated',
    },
  },
  {
    id: 'client-requests-empty',
    title: 'Requests · empty',
    group: 'Client app',
    description: 'No requests or saved-vendor drafts.',
    state: 'Empty',
    config: {
      phase: 'app',
      role: 'client',
      clientMainTab: 'requests',
      clientData: 'empty',
    },
  },
  {
    id: 'client-event',
    title: 'My event',
    group: 'Client app',
    description: 'Event summary with booking data.',
    state: 'Populated',
    config: {
      phase: 'app',
      role: 'client',
      clientMainTab: 'event',
      clientData: 'populated',
    },
  },
  {
    id: 'client-event-edit',
    title: 'My event · edit',
    group: 'Client app',
    description: 'Editable event details form.',
    state: 'Alternative',
    config: {
      phase: 'app',
      role: 'client',
      clientMainTab: 'event',
      clientEventEditing: true,
    },
  },
  {
    id: 'client-profile',
    title: 'Client profile',
    group: 'Client app',
    description: 'Client summary and role/account actions.',
    state: 'Primary',
    config: {
      phase: 'app',
      role: 'client',
      clientMainTab: 'profile',
      clientData: 'populated',
    },
  },
  {
    id: 'client-vendor-detail',
    title: 'Vendor profile · media',
    group: 'Client app',
    description: 'Vendor details with media grid.',
    state: 'Primary',
    config: {
      phase: 'app',
      role: 'client',
      clientMainTab: 'categories',
      vendorId: 'v1',
      vendorDetailTab: 'media',
    },
  },
  {
    id: 'client-vendor-reviews',
    title: 'Vendor profile · reviews',
    group: 'Client app',
    description: 'Vendor details with review list.',
    state: 'Alternative',
    config: {
      phase: 'app',
      role: 'client',
      clientMainTab: 'categories',
      vendorId: 'v1',
      vendorDetailTab: 'reviews',
    },
  },
  {
    id: 'client-vendor-booking',
    title: 'Vendor profile · booking',
    group: 'Client app',
    description: 'Expanded date and time booking controls.',
    state: 'Overlay',
    config: {
      phase: 'app',
      role: 'client',
      clientMainTab: 'categories',
      vendorId: 'v1',
      vendorBookingOpen: true,
    },
  },
  {
    id: 'client-vendor-booking-success',
    title: 'Booking · success',
    group: 'Client app',
    description: 'Confirmed request after the user selects a date and time.',
    state: 'Populated',
    config: {
      phase: 'app',
      role: 'client',
      clientMainTab: 'categories',
      vendorId: 'v1',
      vendorBookingCreated: true,
    },
  },
  {
    id: 'client-offline',
    title: 'Client · offline',
    group: 'Client app',
    description: 'Connection-loss indicator over main navigation.',
    state: 'Overlay',
    config: {
      phase: 'app',
      role: 'client',
      clientMainTab: 'categories',
      clientData: 'offline',
    },
  },
  {
    id: 'client-cabinet',
    title: 'Cabinet index',
    group: 'Client cabinet',
    description: 'Client settings and account-action index.',
    state: 'Overlay',
    config: {
      phase: 'app',
      role: 'client',
      clientMainTab: 'profile',
      clientSettingsOpen: true,
      clientData: 'populated',
    },
  },
  ...clientSettings.map<ReviewScreen>((clientSettingLabel) => ({
    id: `client-setting-${slugify(clientSettingLabel)}`,
    title: clientSettingLabel,
    group: 'Client cabinet',
    description: `Client cabinet detail: ${clientSettingLabel}.`,
    state: 'Overlay',
    config: {
      phase: 'app',
      role: 'client',
      clientMainTab: 'profile',
      clientSettingsOpen: true,
      clientSettingLabel,
      clientData: 'populated',
    },
  })),
  {
    id: 'vendor-home',
    title: 'Dashboard home',
    group: 'Vendor app',
    description: 'Vendor profile and daily summary.',
    state: 'Primary',
    config: {
      phase: 'app',
      role: 'vendor',
      vendorDashboardSection: 'home',
      vendorData: 'populated',
    },
  },
  {
    id: 'vendor-requests',
    title: 'Requests',
    group: 'Vendor app',
    description: 'Vendor booking requests with actions.',
    state: 'Populated',
    config: {
      phase: 'app',
      role: 'vendor',
      vendorDashboardSection: 'requests',
      vendorData: 'populated',
    },
  },
  {
    id: 'vendor-requests-empty',
    title: 'Requests · empty',
    group: 'Vendor app',
    description: 'Vendor request inbox before first booking.',
    state: 'Empty',
    config: {
      phase: 'app',
      role: 'vendor',
      vendorDashboardSection: 'requests',
      vendorData: 'empty',
    },
  },
  {
    id: 'vendor-calendar',
    title: 'Availability calendar',
    group: 'Vendor app',
    description: 'Busy/free dates and selected-day controls.',
    state: 'Primary',
    config: {
      phase: 'app',
      role: 'vendor',
      vendorDashboardSection: 'calendar',
      vendorData: 'populated',
    },
  },
  {
    id: 'vendor-stats',
    title: 'Statistics',
    group: 'Vendor app',
    description: 'Activity, conversion, and media performance.',
    state: 'Populated',
    config: {
      phase: 'app',
      role: 'vendor',
      vendorDashboardSection: 'stats',
      vendorData: 'populated',
    },
  },
  {
    id: 'vendor-profile-preview',
    title: 'Public profile preview',
    group: 'Vendor app',
    description: 'Vendor view of public profile presentation.',
    state: 'Overlay',
    config: {
      phase: 'app',
      role: 'vendor',
      vendorProfilePreviewOpen: true,
      vendorData: 'populated',
    },
  },
  {
    id: 'vendor-settings',
    title: 'Settings index',
    group: 'Vendor settings',
    description: 'Vendor settings and account-action index.',
    state: 'Overlay',
    config: {
      phase: 'app',
      role: 'vendor',
      vendorSettingsOpen: true,
      vendorData: 'populated',
    },
  },
  ...vendorSettings.map<ReviewScreen>((vendorSettingLabel) => ({
    id: `vendor-setting-${slugify(vendorSettingLabel)}`,
    title: vendorSettingLabel,
    group: 'Vendor settings',
    description: `Vendor settings detail: ${vendorSettingLabel}.`,
    state: 'Overlay',
    config: {
      phase: 'app',
      role: 'vendor',
      vendorSettingsOpen: true,
      vendorSettingLabel,
      vendorData: 'populated',
    },
  })),
  {
    id: 'vendor-media-empty',
    title: 'Media · empty',
    group: 'Vendor settings',
    description: 'First upload state before media exists.',
    state: 'Empty',
    config: {
      phase: 'app',
      role: 'vendor',
      vendorSettingsOpen: true,
      vendorSettingLabel: 'Медиа',
      vendorData: 'empty',
      vendorMediaState: 'empty',
    },
  },
  {
    id: 'vendor-media-uploading',
    title: 'Media · uploading',
    group: 'Vendor settings',
    description: 'Visible progress while a file uploads.',
    state: 'Overlay',
    config: {
      phase: 'app',
      role: 'vendor',
      vendorSettingsOpen: true,
      vendorSettingLabel: 'Медиа',
      vendorData: 'populated',
      vendorMediaState: 'uploading',
    },
  },
  {
    id: 'vendor-media-failed',
    title: 'Media · retry',
    group: 'Vendor settings',
    description: 'Upload error with a clear retry action.',
    state: 'Overlay',
    config: {
      phase: 'app',
      role: 'vendor',
      vendorSettingsOpen: true,
      vendorSettingLabel: 'Медиа',
      vendorData: 'populated',
      vendorMediaState: 'failed',
    },
  },
  {
    id: 'vendor-media-success',
    title: 'Media · published',
    group: 'Vendor settings',
    description: 'Uploaded media visible and ready for profile placement.',
    state: 'Populated',
    config: {
      phase: 'app',
      role: 'vendor',
      vendorSettingsOpen: true,
      vendorSettingLabel: 'Медиа',
      vendorData: 'populated',
      vendorMediaState: 'uploaded',
    },
  },
];

export const reviewScreenGroups = Array.from(
  new Set(reviewScreens.map((screen) => screen.group)),
);

export type ReviewJourney = {
  id: 'client' | 'vendor';
  label: string;
  description: string;
  screenIds: string[];
};

const clientSettingIds = clientSettings.map(
  (label) => `client-setting-${slugify(label)}`,
);
const vendorSettingIds = vendorSettings.map(
  (label) => `vendor-setting-${slugify(label)}`,
);

export const reviewJourneys: ReviewJourney[] = [
  {
    id: 'client',
    label: 'Путь клиента',
    description: 'Регистрация, знакомство, поиск, выбор поставщика, бронь и кабинет.',
    screenIds: [
      'auth-login',
      'auth-validation-error',
      'auth-register-client',
      'auth-verify',
      ...clientOnboardingTitles.map((_, index) => `client-onboarding-${index + 1}`),
      'client-categories',
      'client-feed',
      'client-offline',
      'client-vendor-detail',
      'client-vendor-reviews',
      'client-vendor-booking',
      'client-vendor-booking-success',
      'client-requests',
      'client-requests-empty',
      'client-event-edit',
      'client-event',
      'client-profile',
      'client-cabinet',
      ...clientSettingIds,
    ],
  },
  {
    id: 'vendor',
    label: 'Путь поставщика',
    description: 'Регистрация, настройка профиля, медиа, заявки, календарь и аналитика.',
    screenIds: [
      'auth-login',
      'auth-register-vendor',
      'auth-verify',
      ...vendorOnboardingTitles.map((_, index) => `vendor-onboarding-${index + 1}`),
      'vendor-setup-method',
      'vendor-setup-instagram',
      'vendor-setup-manual',
      'vendor-home',
      'vendor-requests',
      'vendor-requests-empty',
      'vendor-calendar',
      'vendor-stats',
      'vendor-profile-preview',
      'vendor-settings',
      ...vendorSettingIds.slice(0, 2),
      'vendor-media-empty',
      'vendor-media-uploading',
      'vendor-media-failed',
      'vendor-media-success',
      ...vendorSettingIds.slice(2),
    ],
  },
];

export function getReviewJourney(id: string | null | undefined) {
  return reviewJourneys.find((journey) => journey.id === id) ?? reviewJourneys[0];
}

export type ReviewScreenGuidance = {
  purpose: string;
  action: string;
  next: string;
  value: string;
};

const guidanceByGroup: Record<ReviewScreenGroup, Omit<ReviewScreenGuidance, 'next'>> = {
  'Entry & access': {
    purpose: 'Безопасно начать или восстановить вход в продукт.',
    action: 'Пользователь вводит данные, выбирает роль и подтверждает аккаунт.',
    value: 'Получает персональный путь и сохранение своих действий.',
  },
  'Client onboarding': {
    purpose: 'Коротко объяснить клиенту основной способ работы приложения.',
    action: 'Пользователь листает истории и знакомится с ключевыми возможностями.',
    value: 'Понимает, как найти, сравнить и забронировать поставщика.',
  },
  'Vendor onboarding': {
    purpose: 'Подготовить поставщика к публикации профиля и работе с заявками.',
    action: 'Поставщик проходит последовательные подсказки.',
    value: 'Понимает, какие данные нужны для получения заказов.',
  },
  'Vendor setup': {
    purpose: 'Собрать минимально готовый публичный профиль.',
    action: 'Поставщик выбирает импорт или ручную загрузку и заполняет данные.',
    value: 'Получает профиль, который можно показывать клиентам.',
  },
  'Client app': {
    purpose: 'Помочь клиенту найти подходящего поставщика и выполнить целевое действие.',
    action: 'Клиент изучает контент, профиль, отзывы, даты и отправляет заявку.',
    value: 'Сокращает путь от идеи до подтвержденной брони.',
  },
  'Client cabinet': {
    purpose: 'Собрать личные данные, сохранения и управление мероприятием в одном месте.',
    action: 'Клиент просматривает или редактирует выбранный раздел.',
    value: 'Не теряет решения, документы, бюджет и историю события.',
  },
  'Vendor app': {
    purpose: 'Дать поставщику ежедневный рабочий обзор.',
    action: 'Поставщик проверяет профиль, заявки, календарь и статистику.',
    value: 'Быстрее отвечает клиентам и управляет загрузкой.',
  },
  'Vendor settings': {
    purpose: 'Настроить публичный профиль и рабочие правила поставщика.',
    action: 'Поставщик редактирует выбранный раздел и сохраняет изменения.',
    value: 'Поддерживает точные данные и качественную витрину услуг.',
  },
};

export function getReviewScreenGuidance(
  screen: ReviewScreen,
  journey: ReviewJourney,
): ReviewScreenGuidance {
  const base = guidanceByGroup[screen.group];
  const currentIndex = journey.screenIds.indexOf(screen.id);
  const nextId = currentIndex >= 0 ? journey.screenIds[currentIndex + 1] : undefined;
  const nextScreen = reviewScreens.find((item) => item.id === nextId);
  const branchNote =
    screen.state === 'Empty'
      ? 'Это пустое состояние: пользователь получает понятный следующий шаг.'
      : screen.id.includes('failed') || screen.id.includes('error') || screen.id === 'client-offline'
        ? 'Это восстановление после ошибки: пользователь исправляет причину или повторяет действие.'
        : screen.id.includes('success')
          ? 'Это подтверждение результата: пользователь видит, что действие завершено.'
          : '';

  return {
    ...base,
    action: branchNote || base.action,
    next: nextScreen
      ? `Следующий логичный экран: «${nextScreen.title}».`
      : 'Это последний экран выбранного маршрута. Можно вернуться к началу или выбрать другой путь.',
  };
}

export function getReviewScreen(id: string | null | undefined) {
  return reviewScreens.find((screen) => screen.id === id) ?? null;
}

export function getReviewRoute(enabled = false) {
  if (!enabled || typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  if (params.get('gallery') === '1') {
    return { kind: 'gallery' as const };
  }

  const screen = getReviewScreen(params.get('review'));
  return screen ? { kind: 'screen' as const, screen } : null;
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase('ru')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '');
}
