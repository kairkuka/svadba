const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} = require('@aws-sdk/client-s3');
const { createPresignedPost } = require('@aws-sdk/s3-presigned-post');
const { Pool } = require('pg');
const {
  getTodayIso,
  isCancelledBookingStatus,
  isConfirmedBookingStatus,
  isVendorBookingStatus,
  normalizeIsoDate,
  parseMoney,
  sanitizeClientSettingsValues,
  sanitizeVendorSettingsValues,
  validateBookingInput,
  validateEventDraft,
} = require('./domain');

loadEnvFile();

const PORT = Number(process.env.PORT || 4000);
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const DB_BACKUP_DIR = process.env.DB_BACKUP_DIR
  ? path.resolve(process.env.DB_BACKUP_DIR)
  : path.join(DATA_DIR, 'backups');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const LEGAL_DIR = path.join(__dirname, 'legal');
const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(DATA_DIR, 'uploads');
const MAX_INSTAGRAM_DOWNLOAD_BYTES = Number(
  process.env.MAX_INSTAGRAM_DOWNLOAD_BYTES || 150 * 1024 * 1024,
);
const MAX_USER_UPLOAD_BYTES = Number(
  process.env.MAX_USER_UPLOAD_BYTES || MAX_INSTAGRAM_DOWNLOAD_BYTES,
);
const MAX_DOCUMENT_UPLOAD_BYTES = Number(
  process.env.MAX_DOCUMENT_UPLOAD_BYTES || 15 * 1024 * 1024,
);
const MAX_JSON_BODY_BYTES = Number(process.env.MAX_JSON_BODY_BYTES || 1024 * 1024);
const MAX_INSTAGRAM_MEDIA_ITEMS = Number(process.env.MAX_INSTAGRAM_MEDIA_ITEMS || 500);
const UPLOADS_STORAGE = process.env.UPLOADS_STORAGE || 'local';
const S3_UPLOAD_BUCKET = process.env.S3_UPLOAD_BUCKET || '';
const S3_UPLOAD_PREFIX = (process.env.S3_UPLOAD_PREFIX || 'uploads')
  .replace(/^\/+|\/+$/g, '');
const UPLOADS_PUBLIC_BASE_URL = (process.env.UPLOADS_PUBLIC_BASE_URL || '')
  .replace(/\/$/, '');
const DB_LOCAL_BACKUPS = process.env.DB_LOCAL_BACKUPS !== '0';
const DB_LOCAL_BACKUP_LIMIT = Number(process.env.DB_LOCAL_BACKUP_LIMIT || 25);
const DB_BACKUP_INTERVAL_MS = Number(process.env.DB_BACKUP_INTERVAL_MS || 60000);
const DB_BACKUP_STORAGE = process.env.DB_BACKUP_STORAGE || '';
const DB_BACKUP_BUCKET = process.env.DB_BACKUP_BUCKET || '';
const DB_BACKUP_PREFIX = (process.env.DB_BACKUP_PREFIX || 'db-backups')
  .replace(/^\/+|\/+$/g, '');
const DATABASE_URL = process.env.DATABASE_URL || '';
const DATABASE_SSL = process.env.DATABASE_SSL === '1';
const DATABASE_STATE_KEY = process.env.DATABASE_STATE_KEY || 'svadba-main';
const DATABASE_LOCK_KEY = process.env.DATABASE_LOCK_KEY || `svadba-state:${DATABASE_STATE_KEY}`;
const EXPO_PUSH_URL =
  process.env.EXPO_PUSH_URL || 'https://exp.host/--/api/v2/push/send';
const FALLBACK_PUBLIC_BASE_URL = 'https://d2ne1y5a2elsg5.cloudfront.net';
const CORS_ALLOWED_ORIGIN =
  process.env.CORS_ALLOWED_ORIGIN ||
  (process.env.NODE_ENV === 'production'
    ? process.env.PUBLIC_BASE_URL || FALLBACK_PUBLIC_BASE_URL
    : '*');
const EXPO_PUSH_ACCESS_TOKEN = process.env.EXPO_PUSH_ACCESS_TOKEN || '';
const MAX_PUSH_TOKENS_PER_USER = Number(process.env.MAX_PUSH_TOKENS_PER_USER || 20);
const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = Number(
  process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_MS || 60000,
);
const AUTH_RATE_LIMIT_WINDOW_MS = Number(
  process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
);
const AUTH_RATE_LIMIT_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX || 30);
const UGC_RATE_LIMIT_WINDOW_MS = Number(
  process.env.UGC_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000,
);
const UGC_RATE_LIMIT_MAX = Number(process.env.UGC_RATE_LIMIT_MAX || 120);
const UPLOAD_RATE_LIMIT_WINDOW_MS = Number(
  process.env.UPLOAD_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
);
const UPLOAD_RATE_LIMIT_MAX = Number(process.env.UPLOAD_RATE_LIMIT_MAX || 120);
const BOOKING_RATE_LIMIT_WINDOW_MS = Number(
  process.env.BOOKING_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000,
);
const BOOKING_RATE_LIMIT_MAX = Number(process.env.BOOKING_RATE_LIMIT_MAX || 60);
const CLIENT_ERROR_RATE_LIMIT_WINDOW_MS = Number(
  process.env.CLIENT_ERROR_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
);
const CLIENT_ERROR_RATE_LIMIT_MAX = Number(process.env.CLIENT_ERROR_RATE_LIMIT_MAX || 60);
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 30 * 24 * 60 * 60 * 1000);
const requestRateLimits = new Map();
let s3Client = null;
let pgPool = null;
let pgReadyPromise = null;
let lastDbBackupAt = 0;
let pendingDbBackupJson = null;
let dbBackupTimer = null;
let dbBackupInFlight = false;

const RU_MONTHS = [
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

const initialDb = {
  users: [],
  emailVerifications: {},
  passwordResetRequests: {},
  bookings: [],
  accountDeletionRequests: [],
  contentReports: [],
  metaCallbacks: [],
  instagramConnections: {},
  instagramOAuthStates: {},
  instagramImportJobs: {},
  vendorAnalytics: {},
  vendorCalendars: {},
  vendorLikes: {},
  mediaLikes: {},
  mediaSaves: {},
  mediaComments: {},
  reviewComments: {},
  reviewSessions: {},
  categories: [
    'Ведущие',
    'Банкетные залы',
    'Декор и флористика',
    'Фотографы',
    'Видеографы',
    'Мобилографы',
    'Артисты',
    'Лайв-бэнды',
    'Свадебные образы',
    'Қыз ұзату',
    'Құдалық',
    'Организаторы',
    'Кондитеры',
    'Стилисты',
    'Шоу-программы',
    'Техника и спецэффекты',
  ],
  vendors: createSeedVendors(),
  vendorSettings: [
    { label: 'Профиль', meta: 'Имя, категория, город, описание' },
    { label: 'Медиа', meta: 'Фото, видео, обложки, порядок' },
    { label: 'Instagram', meta: 'Импорт, обновление, отключение' },
    { label: 'Услуги и цены', meta: 'Пакеты, доп. услуги, цена от' },
    { label: 'Даты', meta: 'Календарь, занято, свободно' },
    { label: 'Статистика', meta: 'Просмотры, лайки, WhatsApp-клики' },
    { label: 'Уведомления', meta: 'Заявки, сообщения, напоминания' },
    { label: 'Документы', meta: 'Верификация, реквизиты, договор' },
    { label: 'Настройки', meta: 'Язык, почта, смена пароля, удаление' },
  ],
  instagramMedia: [
    { id: 'ig1', type: 'video', title: 'Ведущий на банкете', imageKey: 'host' },
    { id: 'ig2', type: 'video', title: 'Танцевальный блок', imageKey: 'dj' },
    { id: 'ig3', type: 'image', title: 'Оформление сцены', imageKey: 'decor' },
    { id: 'ig4', type: 'image', title: 'Отзывы гостей', imageKey: 'photo' },
  ],
};

const CATEGORY_ALIASES = {
  Декор: 'Декор и флористика',
  Флористика: 'Декор и флористика',
  Фото: 'Фотографы',
  Видео: 'Видеографы',
  Торты: 'Кондитеры',
  DJ: 'Техника и спецэффекты',
  Авто: 'Техника и спецэффекты',
  Шоу: 'Шоу-программы',
  'Свет и звук': 'Техника и спецэффекты',
  Платья: 'Свадебные образы',
  Костюмы: 'Свадебные образы',
};

function normalizeVendorCategory(category) {
  const value = String(category || '').trim();
  return CATEGORY_ALIASES[value] || value || 'Ведущие';
}

function getFutureCalendarDate(day, month) {
  const today = getAlmatyTodayDate();
  let date = new Date(today.getFullYear(), month, day);
  date.setHours(0, 0, 0, 0);
  if (date < today) {
    date = new Date(today);
    date.setDate(today.getDate() + 8);
  }
  return date;
}

function getAlmatyTodayDate() {
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

function formatRussianDate(date) {
  return `${date.getDate()} ${RU_MONTHS[date.getMonth()]}`;
}

function formatIsoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function parseIsoDate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number);
  return new Date(year, month - 1, day);
}

function normalizeIsoDateList(value) {
  return Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((item) => String(item || '').trim())
        .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item)),
    ),
  );
}

function normalizeVendorCalendar(calendar = {}) {
  const source = calendar || {};
  const busyDates = normalizeIsoDateList(source.busyDates);
  const busy = new Set(busyDates);
  const freeDates = normalizeIsoDateList(source.freeDates).filter((date) => !busy.has(date));
  return { busyDates, freeDates };
}

function getNearestFreeAvailability(busyDates = [], freeDates = []) {
  const busy = new Set(
    (Array.isArray(busyDates) ? busyDates : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean),
  );
  const today = getAlmatyTodayDate();
  const markedFreeDates = normalizeIsoDateList(freeDates)
    .filter((date) => date >= formatIsoDate(today) && !busy.has(date))
    .sort();
  if (markedFreeDates.length) {
    return `Свободен ${formatRussianDate(parseIsoDate(markedFreeDates[0]))}`;
  }
  for (let offset = 0; offset < 370; offset += 1) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + offset);
    if (!busy.has(formatIsoDate(candidate))) {
      return `Свободен ${formatRussianDate(candidate)}`;
    }
  }
  return `Свободен ${formatRussianDate(today)}`;
}

function normalizeVendorAvailability(availability) {
  const normalized = String(availability || '')
    .replace('Свободна 24 августа', 'Свободна 24 октября')
    .replace('Свободен 7 сентября', 'Свободен 7 октября')
    .replace('Свободны 31 августа', 'Свободны 31 октября')
    .replace('Свободен 18 сентября', 'Свободен 18 октября')
    .replace('Свободен 12 сентября', 'Свободен 12 октября')
    .replace('Свободна 3 сентября', 'Свободна 3 ноября')
    .replace('Свободна 10 сентября', 'Свободна 10 ноября')
    .replace('Свободен 28 августа', 'Свободен 28 октября')
    .replace('Свободны 2 сентября', 'Свободны 2 ноября')
    .replace('Есть окна в сентябре', 'Есть окна в октябре')
    .replace('Принимает заказы на август', 'Принимает заказы на октябрь')
    .replace('Есть окна в августе', 'Есть окна в ноябре');
  const dateMatch = normalized.match(/(\d{1,2})\s+([а-яё]+)/i);
  if (!dateMatch) return normalized;
  const day = Number(dateMatch[1]);
  const month = RU_MONTHS.indexOf(dateMatch[2].toLowerCase());
  if (!day || month < 0) return normalized;
  return normalized.replace(dateMatch[0], formatRussianDate(getFutureCalendarDate(day, month)));
}

function shouldUsePostgresDb() {
  return Boolean(DATABASE_URL);
}

function getPgPool() {
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pgPool;
}

async function ensurePostgresDb() {
  if (!pgReadyPromise) {
    pgReadyPromise = (async () => {
      await getPgPool().query(`
        CREATE TABLE IF NOT EXISTS app_state (
          key text PRIMARY KEY,
          data jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
    })();
  }

  await pgReadyPromise;
}

async function withPostgresStateLock(fn) {
  if (!shouldUsePostgresDb()) {
    return fn();
  }

  const client = await getPgPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [
      DATABASE_LOCK_KEY,
    ]);
    const result = await fn();
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Connection rollback failure is reported through the original error.
    }
    throw error;
  } finally {
    client.release();
  }
}

function ensureFileDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2));
  }
}

function normalizeDb(db) {
  if (!db.emailVerifications) db.emailVerifications = {};
  if (!db.passwordResetRequests) db.passwordResetRequests = {};
  if (!Array.isArray(db.bookings)) db.bookings = [];
  if (!Array.isArray(db.accountDeletionRequests)) db.accountDeletionRequests = [];
  if (!Array.isArray(db.contentReports)) db.contentReports = [];
  if (!Array.isArray(db.metaCallbacks)) db.metaCallbacks = [];
  if (!db.instagramConnections || typeof db.instagramConnections !== 'object') {
    db.instagramConnections = {};
  }
  let migratedInstagramTokens = false;
  for (const connection of Object.values(db.instagramConnections)) {
    if (connection?.accessToken && getInstagramTokenEncryptionKey()) {
      setInstagramAccessToken(connection, connection.accessToken);
      migratedInstagramTokens = true;
    }
  }
  if (!db.instagramOAuthStates || typeof db.instagramOAuthStates !== 'object') {
    db.instagramOAuthStates = {};
  }
  if (!db.instagramImportJobs || typeof db.instagramImportJobs !== 'object') {
    db.instagramImportJobs = {};
  }
  if (!db.vendorAnalytics || typeof db.vendorAnalytics !== 'object') {
    db.vendorAnalytics = {};
  }
  if (!db.vendorCalendars || typeof db.vendorCalendars !== 'object') {
    db.vendorCalendars = {};
  }
  if (!db.vendorLikes || typeof db.vendorLikes !== 'object') {
    db.vendorLikes = {};
  }
  if (!db.mediaLikes || typeof db.mediaLikes !== 'object') {
    db.mediaLikes = {};
  }
  if (!db.mediaSaves || typeof db.mediaSaves !== 'object') {
    db.mediaSaves = {};
  }
  if (!db.mediaComments || typeof db.mediaComments !== 'object') {
    db.mediaComments = {};
  }
  if (!db.reviewComments || typeof db.reviewComments !== 'object') {
    db.reviewComments = {};
  }
  if (!db.reviewSessions || typeof db.reviewSessions !== 'object') {
    db.reviewSessions = {};
  }
  if (
    !Array.isArray(db.categories) ||
    db.categories.join('\n') !== initialDb.categories.join('\n')
  ) {
    db.categories = initialDb.categories;
  }
  if (Array.isArray(db.vendors)) {
    db.vendors = db.vendors.map((vendor) => ({
      ...vendor,
      category: normalizeVendorCategory(vendor.category),
      availability: normalizeVendorAvailability(vendor.availability),
      likeCount: Number.isFinite(Number(vendor.likeCount))
        ? Number(vendor.likeCount)
        : Number(vendor.reviewCount || 0),
    }));
  }
  if (Array.isArray(db.users)) {
    db.users = db.users.map((user) => ({
      ...user,
      vendorDraft: user.vendorDraft
        ? {
            ...user.vendorDraft,
            category: normalizeVendorCategory(user.vendorDraft.category),
          }
        : user.vendorDraft,
      eventHistory: normalizeEventHistory(user.eventHistory),
    }));
  }
  if (
    !Array.isArray(db.vendorSettings) ||
    db.vendorSettings.length === 0 ||
    db.vendorSettings.some((item) => item?.label === 'Заявки')
  ) {
    db.vendorSettings = initialDb.vendorSettings;
  }
  if (!Array.isArray(db.instagramMedia) || db.instagramMedia.length === 0) {
    db.instagramMedia = initialDb.instagramMedia;
  }
  if (!Array.isArray(db.vendors) || db.vendors.length === 0) {
    db.vendors = createSeedVendors();
  } else {
    const seedVendors = createSeedVendors();
    const existingIds = new Set(db.vendors.map((vendor) => vendor.id));
    for (const seedVendor of seedVendors) {
      if (!existingIds.has(seedVendor.id)) {
        db.vendors.push(seedVendor);
        existingIds.add(seedVendor.id);
      }
    }
  }
  db.users = (Array.isArray(db.users) ? db.users : []).map((user) => ({
    ...user,
    likedVendorIds: normalizeIdList(user.likedVendorIds),
    likedMediaIds: normalizeIdList(user.likedMediaIds),
    savedMediaIds: normalizeIdList(user.savedMediaIds),
    pushTokens: normalizeUserPushTokens(user.pushTokens),
  }));
  db.vendors = db.vendors.map((vendor) => {
    const defaultFeatured = getDefaultVendorFeatured(vendor.id);
    return {
      ...vendor,
      ...(vendor.featured || !defaultFeatured ? {} : { featured: defaultFeatured }),
    };
  });
  if (shouldSeedReviewUsers()) {
    ensureReviewUsers(db);
  }
  return { db, migratedInstagramTokens };
}

async function readDb() {
  let db;
  if (shouldUsePostgresDb()) {
    await ensurePostgresDb();
    const result = await getPgPool().query(
      'SELECT data FROM app_state WHERE key = $1',
      [DATABASE_STATE_KEY],
    );
    if (result.rows[0]?.data) {
      db = result.rows[0].data;
    } else {
      db = structuredClone(initialDb);
      await writeDb(db);
    }
  } else {
    ensureFileDb();
    db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  }

  const normalized = normalizeDb(db);
  if (normalized.migratedInstagramTokens) {
    await writeDb(normalized.db);
  }
  return normalized.db;
}

async function writeDb(db) {
  const json = JSON.stringify(db, null, 2);
  if (shouldUsePostgresDb()) {
    await ensurePostgresDb();
    await getPgPool().query(
      `
        INSERT INTO app_state (key, data, updated_at)
        VALUES ($1, $2::jsonb, now())
        ON CONFLICT (key)
        DO UPDATE SET data = EXCLUDED.data, updated_at = now()
      `,
      [DATABASE_STATE_KEY, json],
    );
  } else {
    ensureFileDb();
    const tempPath = `${DB_PATH}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, json);
    fs.renameSync(tempPath, DB_PATH);
  }
  scheduleDbBackup(json);
}

function createDbBackupFileName() {
  return `db-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
}

function pruneLocalDbBackups() {
  if (!fs.existsSync(DB_BACKUP_DIR)) return;

  const backups = fs
    .readdirSync(DB_BACKUP_DIR)
    .filter((fileName) => /^db-.*\.json$/.test(fileName))
    .map((fileName) => ({
      fileName,
      path: path.join(DB_BACKUP_DIR, fileName),
      mtimeMs: fs.statSync(path.join(DB_BACKUP_DIR, fileName)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const backup of backups.slice(Math.max(0, DB_LOCAL_BACKUP_LIMIT))) {
    fs.unlinkSync(backup.path);
  }
}

function shouldUseS3DbBackups() {
  return DB_BACKUP_STORAGE === 's3' || Boolean(DB_BACKUP_BUCKET);
}

async function writeDbBackup(json) {
  const backupFileName = createDbBackupFileName();

  if (DB_LOCAL_BACKUPS) {
    fs.mkdirSync(DB_BACKUP_DIR, { recursive: true });
    fs.writeFileSync(path.join(DB_BACKUP_DIR, backupFileName), json);
    pruneLocalDbBackups();
  }

  if (shouldUseS3DbBackups()) {
    if (!DB_BACKUP_BUCKET) {
      throw new Error('DB_BACKUP_BUCKET is required when DB_BACKUP_STORAGE=s3');
    }

    const key = DB_BACKUP_PREFIX
      ? `${DB_BACKUP_PREFIX}/${backupFileName}`
      : backupFileName;
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: DB_BACKUP_BUCKET,
        Key: key,
        Body: Buffer.from(json),
        ContentType: 'application/json; charset=utf-8',
        CacheControl: 'private, max-age=0, no-store',
      }),
    );
  }
}

function scheduleDbBackup(json) {
  pendingDbBackupJson = json;
  if (dbBackupTimer || dbBackupInFlight) return;

  const waitMs = Math.max(0, DB_BACKUP_INTERVAL_MS - (Date.now() - lastDbBackupAt));
  dbBackupTimer = setTimeout(() => {
    dbBackupTimer = null;
    flushDbBackup().catch((error) => {
      console.warn('DB backup failed:', error.message || error);
    });
  }, waitMs);
}

async function flushDbBackup() {
  if (dbBackupInFlight || !pendingDbBackupJson) return;

  dbBackupInFlight = true;
  const json = pendingDbBackupJson;
  pendingDbBackupJson = null;
  lastDbBackupAt = Date.now();
  try {
    await writeDbBackup(json);
  } finally {
    dbBackupInFlight = false;
  }

  if (pendingDbBackupJson) {
    scheduleDbBackup(pendingDbBackupJson);
  }
}

function loadEnvFile() {
  const envPaths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '.env'),
  ];

  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;

    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, '');
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function getSecurityHeaders() {
  return {
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Referrer-Policy': 'no-referrer',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
  };
}

function getPublicErrorPayload(error, message) {
  return {
    error: message,
    ...(process.env.NODE_ENV === 'production'
      ? {}
      : { details: String(error?.message || error || '') }),
  };
}

function getPublicUploadError(error) {
  const message = String(error?.message || error || '');
  if (/15 МБ|too large/i.test(message)) {
    return { status: 413, error: 'Файл слишком большой.' };
  }
  if (/Разрешены|Only image and video|not a supported|не является поддерживаемым/i.test(message)) {
    return { status: 400, error: 'Выберите поддерживаемый тип файла.' };
  }
  if (/Тип файла не совпадает|content type/i.test(message)) {
    return { status: 400, error: 'Тип файла не совпадает с его содержимым.' };
  }
  if (/empty|пустой/i.test(message)) {
    return { status: 400, error: 'Файл пустой.' };
  }
  if (/Invalid upload key/i.test(message)) {
    return { status: 400, error: 'Срок загрузки истёк. Выберите файл повторно.' };
  }
  return { status: 502, error: 'Не удалось сохранить файл. Повторите позже.' };
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    ...getSecurityHeaders(),
    'Access-Control-Allow-Origin': CORS_ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(payload));
}

function getClientAddress(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function enforceRateLimit(req, res, scope, max, windowMs) {
  const now = Date.now();
  const key = `${scope}:${getClientAddress(req)}`;
  const existing = requestRateLimits.get(key);
  const entry = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : existing;
  entry.count += 1;
  requestRateLimits.set(key, entry);

  if (requestRateLimits.size > 10000) {
    for (const [storedKey, storedEntry] of requestRateLimits) {
      if (storedEntry.resetAt <= now) requestRateLimits.delete(storedKey);
    }
  }

  if (entry.count <= max) return true;
  sendJson(res, 429, {
    error: 'Too many requests',
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  });
  return false;
}

function getPublicOrigin(req) {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  }

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || (req.socket.encrypted ? 'https' : 'http');
  return `${proto}://${req.headers.host}`;
}

function isLocalRequest(req) {
  const host = String(req?.headers?.host || '').toLowerCase();
  return host.startsWith('localhost:') || host.startsWith('127.0.0.1:');
}

function normalizeHttpsOrigin(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:') return '';
    return url.origin.replace(/\/$/, '');
  } catch {
    return '';
  }
}

function isTemporaryTunnelOrigin(origin) {
  return /(^https:\/\/localhost|127\.0\.0\.1|\.ngrok-free\.dev|\.ngrok\.io)/i.test(
    String(origin || ''),
  );
}

function getOAuthPublicBase(req) {
  const configured = normalizeHttpsOrigin(process.env.PUBLIC_BASE_URL);
  if (configured && !isTemporaryTunnelOrigin(configured)) {
    return configured;
  }

  const origin = normalizeHttpsOrigin(getPublicOrigin(req));
  if (origin && !isTemporaryTunnelOrigin(origin)) {
    return origin;
  }

  return FALLBACK_PUBLIC_BASE_URL;
}

function getSafeOAuthRedirectUri(value, pathName) {
  const safeUrl = getSafeHttpUrl(value);
  if (!safeUrl) return '';
  const url = new URL(safeUrl);
  if (url.protocol !== 'https:' || isTemporaryTunnelOrigin(url.origin)) return '';
  return url.pathname === pathName ? url.toString() : '';
}

function getSafeHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function getAppReturnUrl(req, value) {
  const requestedUrl = getSafeHttpUrl(value);
  if (requestedUrl) return requestedUrl;

  const originUrl = getSafeHttpUrl(req.headers.origin);
  if (originUrl) return originUrl;

  const refererUrl = getSafeHttpUrl(req.headers.referer);
  if (refererUrl) {
    const referer = new URL(refererUrl);
    return referer.origin;
  }

  return getPublicOrigin(req);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpg': 'image/jpeg',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mov': 'video/quicktime',
    '.mp4': 'video/mp4',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  };

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(res, 404, { error: 'File not found' });
      return;
    }

    res.writeHead(200, {
      ...getSecurityHeaders(),
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
    });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    req.on('data', (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_JSON_BODY_BYTES) {
        settled = true;
        const error = new Error(`JSON body too large: ${size} bytes`);
        error.statusCode = 413;
        reject(error);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      const body = Buffer.concat(chunks).toString('utf8');
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        error.statusCode = 400;
        reject(error);
      }
    });
    req.on('error', (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}

function readRawBody(req, maxBytes = MAX_USER_UPLOAD_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error(`Upload too large: ${size} bytes`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function splitBuffer(buffer, delimiter) {
  const parts = [];
  let start = 0;
  let index = buffer.indexOf(delimiter, start);
  while (index !== -1) {
    parts.push(buffer.subarray(start, index));
    start = index + delimiter.length;
    index = buffer.indexOf(delimiter, start);
  }
  parts.push(buffer.subarray(start));
  return parts;
}

function parseContentDisposition(value) {
  const result = {};
  String(value || '')
    .split(';')
    .map((part) => part.trim())
    .forEach((part) => {
      const match = part.match(/^([^=]+)="?([^"]*)"?$/);
      if (match) {
        result[match[1].toLowerCase()] = match[2];
      }
    });
  return result;
}

async function readMultipartForm(req) {
  const contentType = String(req.headers['content-type'] || '');
  const boundary = contentType.match(/boundary=([^;]+)/i)?.[1]?.replace(/^"|"$/g, '');
  if (!boundary) {
    throw new Error('Multipart boundary missing');
  }

  const body = await readRawBody(req);
  const delimiter = Buffer.from(`--${boundary}`);
  const fields = {};
  const files = [];
  for (let part of splitBuffer(body, delimiter)) {
    if (!part.length) continue;
    if (part.subarray(0, 2).toString() === '\r\n') {
      part = part.subarray(2);
    }
    if (part.subarray(0, 2).toString() === '--') {
      continue;
    }

    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd < 0) continue;
    const headerText = part.subarray(0, headerEnd).toString('utf8');
    let content = part.subarray(headerEnd + 4);
    if (content.subarray(-2).toString() === '\r\n') {
      content = content.subarray(0, -2);
    }

    const headers = {};
    headerText.split('\r\n').forEach((line) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        headers[line.slice(0, colonIndex).trim().toLowerCase()] = line
          .slice(colonIndex + 1)
          .trim();
      }
    });
    const disposition = parseContentDisposition(headers['content-disposition']);
    if (!disposition.name) continue;

    if (disposition.filename) {
      files.push({
        fieldName: disposition.name,
        originalFilename: path.basename(disposition.filename),
        contentType: headers['content-type'] || 'application/octet-stream',
        buffer: content,
      });
    } else {
      fields[disposition.name] = content.toString('utf8');
    }
  }

  return { fields, files };
}

function decodeBase64Url(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, 'base64');
}

function parseMetaSignedRequest(signedRequest) {
  const secret = process.env.INSTAGRAM_CLIENT_SECRET;
  if (!secret || !signedRequest || !String(signedRequest).includes('.')) {
    return null;
  }

  const [encodedSignature, encodedPayload] = String(signedRequest).split('.');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest();
  const actual = decodeBase64Url(encodedSignature);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(encodedPayload).toString('utf8'));
  } catch {
    return null;
  }
}

function removeInstagramConnectionByMetaUser(db, metaUserId) {
  if (!metaUserId) return null;
  for (const [userId, connection] of Object.entries(db.instagramConnections || {})) {
    if (
      String(connection.instagramUserId || '') === String(metaUserId) ||
      String(connection.instagramBusinessUserId || '') === String(metaUserId)
    ) {
      delete db.instagramConnections[userId];
      return userId;
    }
  }
  return null;
}

function isInstagramOAuthConnection(connection) {
  return connection?.mode === 'oauth' || connection?.mode === 'facebook_oauth';
}

function publicUser(user, db = null) {
  if (!user) return null;
  const instagramConnection = db?.instagramConnections?.[user.id] || null;
  const oauthInstagramConnection = isInstagramOAuthConnection(instagramConnection)
    ? instagramConnection
    : null;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    authToken: user.authToken || null,
    profileCreated: user.profileCreated,
    vendorId: user.vendorId || null,
    vendorDraft: user.vendorDraft,
    vendorSettingsValues: user.vendorSettingsValues || {},
    clientProfile: user.clientProfile || createDefaultClientProfile(user.email),
    clientSettingsValues: user.clientSettingsValues || {},
    selectedImportIds: user.selectedImportIds,
    instagramHandle: user.instagramHandle,
    instagramConnected: Boolean(oauthInstagramConnection),
    instagramProfile: oauthInstagramConnection
      ? {
          username: oauthInstagramConnection.username,
          accountType: oauthInstagramConnection.accountType,
          profilePictureUrl: oauthInstagramConnection.profilePictureUrl || '',
          mediaCount: oauthInstagramConnection.mediaCount,
          mode: oauthInstagramConnection.mode,
          connectedAt: oauthInstagramConnection.connectedAt,
        }
      : null,
    eventDraft: user.eventDraft || createDefaultEventDraft(),
    eventHistory: normalizeEventHistory(user.eventHistory),
    bookings: user.bookings || [],
    blockedVendorIds: user.blockedVendorIds || [],
    blockedUserIds: user.blockedUserIds || [],
    likedVendorIds: user.likedVendorIds || [],
    likedMediaIds: user.likedMediaIds || [],
    savedMediaIds: user.savedMediaIds || [],
    savedVendorIds: user.savedVendorIds || [],
    uploadedMedia: user.uploadedMedia || [],
    documents: (Array.isArray(user.documents) ? user.documents : []).map((document) => ({
      id: document.id,
      fileName: document.fileName,
      contentType: document.contentType,
      size: document.size,
      createdAt: document.createdAt,
    })),
    vendorVerification: {
      status: user.vendorVerification?.status || 'Не отправлено',
      moderatorComment: user.vendorVerification?.moderatorComment || '',
      updatedAt: user.vendorVerification?.updatedAt || null,
    },
    pushNotifications: publicPushRegistration(user),
  };
}

function publicBooking(booking) {
  return {
    id: booking.id,
    date: booking.date,
    timeFrom: booking.timeFrom,
    timeTo: booking.timeTo,
    status: booking.status,
    vendorId: booking.vendorId,
    vendorName: booking.vendorName,
    clientId: booking.clientId,
    clientEmail: booking.clientEmail,
    clientName: booking.clientName || 'Клиент',
    amount: booking.amount,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

function normalizeBookingDate(value) {
  return String(value || '').trim();
}

function parseBookingTime(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function bookingTimeRangesOverlap(leftFrom, leftTo, rightFrom, rightTo) {
  const aStart = parseBookingTime(leftFrom);
  const aEnd = parseBookingTime(leftTo);
  const bStart = parseBookingTime(rightFrom);
  const bEnd = parseBookingTime(rightTo);
  if ([aStart, aEnd, bStart, bEnd].some((value) => value === null)) {
    return true;
  }
  return aStart < bEnd && bStart < aEnd;
}

function isBlockingBookingStatus(status) {
  return !['Отклонена', 'Отменена', 'Закрыта', 'Закрыто', 'cancelled', 'canceled', 'rejected']
    .includes(String(status || '').trim());
}

function findBookingConflict(db, { vendorId, clientId, date, timeFrom, timeTo }) {
  const bookingDate = normalizeBookingDate(date);
  if (!bookingDate) return null;

  return (
    (db.bookings || []).find((booking) => {
      if (booking.vendorId !== vendorId) return false;
      if (booking.clientId === clientId) return false;
      if (normalizeBookingDate(booking.date) !== bookingDate) return false;
      if (!isBlockingBookingStatus(booking.status)) return false;
      return bookingTimeRangesOverlap(
        timeFrom,
        timeTo,
        booking.timeFrom || '00:00',
        booking.timeTo || '23:59',
      );
    }) || null
  );
}

function syncBookingToClient(db, booking) {
  const client = db.users.find((item) => item.id === booking.clientId);
  if (!client) return;
  const existing = Array.isArray(client.bookings) ? client.bookings : [];
  client.bookings = [
    booking,
    ...existing.filter((item) => item.id !== booking.id),
  ];
}

function setBookingCalendarState(db, booking, busy) {
  const vendorId = booking.vendorId;
  const date = normalizeIsoDate(booking.date);
  if (!vendorId || !date) return;
  const calendar = normalizeVendorCalendar(db.vendorCalendars?.[vendorId] || {});
  if (busy) {
    calendar.busyDates = Array.from(new Set([...calendar.busyDates, date]));
    calendar.freeDates = calendar.freeDates.filter((item) => item !== date);
    booking.calendarManaged = true;
  } else if (booking.calendarManaged) {
    const stillBusy = (db.bookings || []).some(
      (item) =>
        item.id !== booking.id &&
        item.vendorId === vendorId &&
        normalizeIsoDate(item.date) === date &&
        isConfirmedBookingStatus(item.status),
    );
    if (!stillBusy) {
      calendar.busyDates = calendar.busyDates.filter((item) => item !== date);
      calendar.freeDates = Array.from(new Set([...calendar.freeDates, date]));
    }
    booking.calendarManaged = false;
  }
  db.vendorCalendars[vendorId] = calendar;
}

function mergeUploadedMediaUpdates(existingMedia, incomingMedia) {
  const existingById = new Map(
    (Array.isArray(existingMedia) ? existingMedia : []).map((item) => [item.id, item]),
  );
  return (Array.isArray(incomingMedia) ? incomingMedia : [])
    .map((incoming) => {
      const existing = existingById.get(incoming?.id);
      if (!existing) return null;
      const canChangePublication = ['ready', 'uploaded'].includes(existing.status);
      const nextStatus =
        canChangePublication && ['ready', 'uploaded'].includes(incoming.status)
          ? incoming.status
          : existing.status;
      return {
        ...existing,
        caption: String(incoming.caption || '').trim().slice(0, 1200),
        role: ['main', 'cover', 'reels', 'profile', 'story'].includes(incoming.role)
          ? incoming.role
          : existing.role,
        selected: Boolean(incoming.selected),
        status: nextStatus,
      };
    })
    .filter(Boolean);
}

function isVendorCalendarDateBusy(db, vendorId, clientId, date) {
  const bookingDate = normalizeBookingDate(date);
  if (!bookingDate) return false;
  const busyDates = db.vendorCalendars?.[vendorId]?.busyDates || [];
  if (!busyDates.map((item) => normalizeBookingDate(item)).includes(bookingDate)) {
    return false;
  }

  return !(db.bookings || []).some(
    (booking) =>
      booking.vendorId === vendorId &&
      booking.clientId === clientId &&
      normalizeBookingDate(booking.date) === bookingDate &&
      isBlockingBookingStatus(booking.status),
  );
}

function syncVendorMediaFromUser(db, user) {
  if (!user?.vendorId && !user?.id) return;
  const vendorId = user.vendorId || `vendor_${user.id}`;
  const vendor = db.vendors.find((item) => item.id === vendorId);
  if (!vendor) return;
  const uploadedMedia = Array.isArray(user.uploadedMedia) ? user.uploadedMedia : [];
  const publishedMedia = uploadedMedia.filter((item) => item?.uri && item.status === 'uploaded');
  vendor.portfolioCount = publishedMedia.length;
  const publishedVideos = publishedMedia.filter((item) => item.type === 'video');
  const mainVideo = publishedVideos.find(
    (item) => item.type === 'video' && (item.role === 'main' || item.role === 'reels'),
  );
  if (mainVideo?.uri) {
    vendor.shortVideoUrl = mainVideo.uri;
  }
  if (publishedVideos.length) {
    vendor.shortVideoUrls = publishedVideos.map((item) => item.uri).slice(0, 12);
  }
}

function getVendorAnalytics(db, vendorId) {
  if (!db.vendorAnalytics[vendorId]) {
    db.vendorAnalytics[vendorId] = {
      profileViews: 0,
      mediaViews: 0,
      saves: 0,
      whatsappClicks: 0,
      events: [],
    };
  }
  return db.vendorAnalytics[vendorId];
}

function recordVendorAnalyticsEvent(db, vendorId, type) {
  const eventTypes = {
    profile_view: 'profileViews',
    media_view: 'mediaViews',
    save: 'saves',
    whatsapp_click: 'whatsappClicks',
  };
  const counter = eventTypes[type];
  if (!counter) return null;
  const analytics = getVendorAnalytics(db, vendorId);
  analytics[counter] = Number(analytics[counter] || 0) + 1;
  analytics.events = [
    { type, createdAt: new Date().toISOString() },
    ...(Array.isArray(analytics.events) ? analytics.events : []),
  ].slice(0, 5000);
  return analytics;
}

function publicVendorAnalytics(analytics) {
  return {
    profileViews: Number(analytics?.profileViews || 0),
    mediaViews: Number(analytics?.mediaViews || 0),
    saves: Number(analytics?.saves || 0),
    whatsappClicks: Number(analytics?.whatsappClicks || 0),
    events: Array.isArray(analytics?.events) ? analytics.events : [],
  };
}

function normalizeUserPushTokens(pushTokens) {
  if (!Array.isArray(pushTokens)) return [];
  const seen = new Set();
  return pushTokens
    .map((item) => ({
      token: String(item?.token || '').trim(),
      platform: String(item?.platform || '').trim(),
      role: item?.role === 'vendor' ? 'vendor' : item?.role === 'client' ? 'client' : '',
      createdAt: item?.createdAt || new Date().toISOString(),
      updatedAt: item?.updatedAt || item?.createdAt || new Date().toISOString(),
    }))
    .filter((item) => {
      if (!isExpoPushToken(item.token) || seen.has(item.token)) return false;
      seen.add(item.token);
      return true;
    })
    .slice(0, MAX_PUSH_TOKENS_PER_USER);
}

function isExpoPushToken(token) {
  return /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(String(token || '').trim());
}

function publicPushRegistration(user) {
  return {
    enabled: notificationsEnabledForUser(user),
    registeredTokens: normalizeUserPushTokens(user?.pushTokens).length,
  };
}

function isNotificationValueEnabled(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return true;
  return !/(отключ|выкл|off|disabled|нет)/i.test(raw);
}

function notificationsEnabledForUser(user, preferenceKey = '') {
  const preferences = user?.role === 'client'
    ? user.clientSettingsValues?.Уведомления || {}
    : user?.vendorSettingsValues?.Уведомления || {};

  if (preferenceKey && preferences[preferenceKey] !== undefined) {
    return isNotificationValueEnabled(preferences[preferenceKey]);
  }

  const values = [];
  if (user?.role === 'client') {
    values.push(user.clientProfile?.notifications);
    values.push(...Object.values(preferences));
  } else {
    values.push(...Object.values(preferences));
  }

  const explicitValues = values.filter((value) => value !== undefined && value !== null);
  if (!explicitValues.length) return true;
  return explicitValues.some(isNotificationValueEnabled);
}

function upsertUserPushToken(user, { platform, role, token }) {
  const now = new Date().toISOString();
  const currentTokens = normalizeUserPushTokens(user.pushTokens);
  const existing = currentTokens.find((item) => item.token === token);
  if (existing) {
    existing.platform = platform || existing.platform;
    existing.role = role || existing.role || user.role;
    existing.updatedAt = now;
  } else {
    currentTokens.unshift({
      token,
      platform: platform || '',
      role: role || user.role,
      createdAt: now,
      updatedAt: now,
    });
  }
  user.pushTokens = currentTokens.slice(0, MAX_PUSH_TOKENS_PER_USER);
}

function removeUserPushToken(user, token) {
  user.pushTokens = normalizeUserPushTokens(user.pushTokens).filter(
    (item) => item.token !== token,
  );
}

async function sendExpoPushMessages(messages) {
  if (!messages.length) {
    return { sent: 0, tickets: [] };
  }

  const headers = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };
  if (EXPO_PUSH_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${EXPO_PUSH_ACCESS_TOKEN}`;
  }

  const tickets = [];
  for (let index = 0; index < messages.length; index += 100) {
    const chunk = messages.slice(index, index + 100);
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk),
    });
    const payload = await response.json().catch(async () => ({
      data: [],
      error: await response.text().catch(() => ''),
    }));
    if (!response.ok) {
      throw new Error(payload.error || payload.message || `Expo push ${response.status}`);
    }
    tickets.push(...(Array.isArray(payload.data) ? payload.data : [payload]));
  }

  return { sent: messages.length, tickets };
}

async function notifyUserPush(user, notification) {
  const tokens = normalizeUserPushTokens(user?.pushTokens);
  if (
    !user ||
    !notificationsEnabledForUser(user, notification.preferenceKey) ||
    tokens.length === 0
  ) {
    return { sent: 0, skipped: true };
  }

  const messages = tokens.map((item) => ({
    to: item.token,
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    sound: 'default',
    channelId: 'default',
  }));

  try {
    return await sendExpoPushMessages(messages);
  } catch (error) {
    console.error('Push notification failed:', error.message);
    return { sent: 0, error: error.message };
  }
}

function findVendorOwnerUser(db, vendorId) {
  return db.users.find(
    (user) => user.vendorId === vendorId || `vendor_${user.id}` === vendorId,
  );
}

function notifyVendorAboutBooking(db, booking) {
  const vendorUser = findVendorOwnerUser(db, booking.vendorId);
  if (!vendorUser) return Promise.resolve({ sent: 0, skipped: true });

  return notifyUserPush(vendorUser, {
    title: 'Новая заявка',
    body: `${booking.clientName || 'Клиент'} хочет забронировать ${booking.date}.`,
    preferenceKey: 'Новая заявка',
    data: {
      bookingId: booking.id,
      role: 'vendor',
      screen: 'requests',
    },
  });
}

function notifyClientAboutBookingStatus(db, booking) {
  const client = db.users.find((user) => user.id === booking.clientId);
  if (!client) return Promise.resolve({ sent: 0, skipped: true });

  return notifyUserPush(client, {
    title: 'Статус заявки обновлен',
    body: `${booking.vendorName}: ${booking.status}.`,
    preferenceKey: 'Ответ подрядчика',
    data: {
      bookingId: booking.id,
      role: 'client',
      screen: 'requests',
    },
  });
}

function createDefaultVendorDraft() {
  return {
    name: 'kairkuka',
    city: 'Алматы',
    category: 'Ведущие',
    priceFrom: '320000',
    phone: '+77015550101',
    languages: '',
    description: '',
    experience: '',
    basePackage: '',
    standardPackage: '',
    premiumPackage: '',
    basePackagePrice: '',
    standardPackagePrice: '',
    premiumPackagePrice: '',
    basePackageDetails: '',
    standardPackageDetails: '',
    premiumPackageDetails: '',
    included: '',
    extraServices: '',
    prepayment: '',
  };
}

function createDefaultClientProfile(email = '') {
  const safeEmail = String(email || '').trim();
  return {
    name: safeEmail ? safeEmail.split('@')[0] : '',
    phone: '',
    city: 'Алматы',
    language: 'Русский',
    notifications: 'Включено',
  };
}

function createDefaultEventDraft() {
  return {
    type: '',
    date: '',
    city: '',
    guests: '',
    budget: '',
    place: '',
    comment: '',
  };
}

function normalizeEventHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .map((item) => ({
      ...createDefaultEventDraft(),
      ...item,
      id: String(item?.id || `event_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`),
      createdAt: item?.createdAt || new Date().toISOString(),
      updatedAt: item?.updatedAt || item?.createdAt || new Date().toISOString(),
    }))
    .filter((item) =>
      ['type', 'date', 'city', 'guests', 'budget', 'place', 'comment'].some((key) =>
        String(item[key] || '').trim(),
      ),
    )
    .slice(0, 30);
}

function comparableEvent(event) {
  return {
    type: String(event?.type || '').trim(),
    date: normalizeIsoDate(event?.date),
    city: String(event?.city || '').trim(),
    guests: String(event?.guests || '').replace(/[^\d]/g, ''),
    budget: parseMoney(event?.budget),
    place: String(event?.place || '').trim(),
    comment: String(event?.comment || '').trim(),
  };
}

function getDefaultVendorFeatured(id) {
  const featured = {
    v1: {
      enabled: true,
      style: 'rose',
      badgeText: 'Выбор SVADBA.kz',
      priority: 80,
    },
    v4: {
      enabled: true,
      style: 'royal',
      badgeText: 'Premium зал',
      priority: 90,
    },
    v6: {
      enabled: true,
      style: 'gold',
      badgeText: 'Выбор владельца',
      priority: 100,
    },
    v11: {
      enabled: true,
      style: 'neon',
      badgeText: 'Top host',
      priority: 70,
    },
  };

  return featured[id];
}

function getVendorFeaturedPriority(vendor) {
  return vendor.featured?.enabled ? Number(vendor.featured.priority || 0) : 0;
}

function normalizeIdList(list) {
  if (!Array.isArray(list)) return [];
  return Array.from(
    new Set(
      list
        .map((item) => String(item || '').trim())
        .filter(Boolean),
    ),
  );
}

function getVendorBaseLikeCount(vendor) {
  return Math.max(0, Number(vendor.likeCount ?? vendor.reviewCount ?? 0));
}

function getVendorLikeUserIds(db, vendorId) {
  if (!db.vendorLikes || typeof db.vendorLikes !== 'object') {
    db.vendorLikes = {};
  }
  const normalized = normalizeIdList(db.vendorLikes[vendorId]);
  db.vendorLikes[vendorId] = normalized;
  return normalized;
}

function getVendorOwner(db, vendorId) {
  return (db.users || []).find((user) => user.vendorId === vendorId) || null;
}

function normalizeMediaId(value) {
  return String(value || '').trim().slice(0, 160);
}

const OBJECTIONABLE_TEXT_PATTERNS = [
  /(?:^|[^\p{L}\p{N}_])(?:хуй|хуе|хуё|пизд|еба|ёба|ебл|бля|сука)[\p{L}\p{N}_]*/iu,
  /\b(?:fuck|shit|bitch|cunt)\w*/iu,
];

function validatePublicText(value, { allowEmpty = false, maxLength = 600 } = {}) {
  const text = String(value || '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, maxLength);
  if (!allowEmpty && !text) throw new Error('Введите текст.');
  if (OBJECTIONABLE_TEXT_PATTERNS.some((pattern) => pattern.test(text))) {
    throw new Error('Текст содержит недопустимые выражения.');
  }
  const urlCount = (text.match(/https?:\/\//gi) || []).length;
  if (urlCount > 2) throw new Error('Слишком много ссылок.');
  return text;
}

function sanitizeDiagnosticText(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeClientErrorPayload(body = {}) {
  const allowedLevels = new Set(['fatal', 'error', 'warning']);
  const level = allowedLevels.has(body.level) ? body.level : 'error';
  return {
    event: 'client_error',
    level,
    source: sanitizeDiagnosticText(body.source, 80) || 'unknown',
    message: sanitizeDiagnosticText(body.message, 500) || 'Unknown client error',
    stack: sanitizeDiagnosticText(body.stack, 4000),
    platform: sanitizeDiagnosticText(body.platform, 40),
    appVersion: sanitizeDiagnosticText(body.appVersion, 40),
    buildNumber: sanitizeDiagnosticText(body.buildNumber, 40),
    path: sanitizeDiagnosticText(body.path, 160),
    method: sanitizeDiagnosticText(body.method, 12).toUpperCase(),
    status: Number.isFinite(Number(body.status)) ? Number(body.status) : undefined,
    fatal: body.fatal === true,
    receivedAt: new Date().toISOString(),
  };
}

function validateVendorDraftPublicText(draft) {
  const fields = [
    'name',
    'description',
    'basePackage',
    'standardPackage',
    'premiumPackage',
    'basePackageDetails',
    'standardPackageDetails',
    'premiumPackageDetails',
    'included',
    'extraServices',
  ];
  for (const field of fields) {
    if (draft?.[field]) validatePublicText(draft[field], { maxLength: 2000 });
  }
}

function getMediaLikeUserIds(db, mediaId) {
  if (!db.mediaLikes || typeof db.mediaLikes !== 'object') {
    db.mediaLikes = {};
  }
  const id = normalizeMediaId(mediaId);
  const normalized = normalizeIdList(db.mediaLikes[id]);
  db.mediaLikes[id] = normalized;
  return normalized;
}

function getMediaSaveUserIds(db, mediaId) {
  if (!db.mediaSaves || typeof db.mediaSaves !== 'object') {
    db.mediaSaves = {};
  }
  const id = normalizeMediaId(mediaId);
  const normalized = normalizeIdList(db.mediaSaves[id]);
  db.mediaSaves[id] = normalized;
  return normalized;
}

function getUserDisplayName(user) {
  return String(
    user?.clientProfile?.name ||
      user?.vendorDraft?.name ||
      String(user?.email || '').split('@')[0] ||
      'Пользователь',
  ).slice(0, 80);
}

function getPublicMediaLikeUsers(db, mediaId) {
  return getMediaLikeUserIds(db, mediaId)
    .map((userId) => (db.users || []).find((user) => user.id === userId))
    .filter(Boolean)
    .map((user) => ({
      id: user.id,
      name: getUserDisplayName(user),
      avatarUri: getUserAvatarUri(user),
    }));
}

function vendorOwnsMedia(db, vendorId, mediaId) {
  const normalizedMediaId = normalizeMediaId(mediaId);
  if (!normalizedMediaId) return false;
  if (normalizedMediaId.startsWith(`${vendorId}:`)) return true;
  const owner = getVendorOwner(db, vendorId);
  return (Array.isArray(owner?.uploadedMedia) ? owner.uploadedMedia : []).some(
    (item) => item?.id === normalizedMediaId && item?.status === 'uploaded',
  );
}

function getUserAvatarUri(user) {
  if (!user) return '';
  const profileAvatar = String(user.clientProfile?.avatarUri || '').trim();
  if (profileAvatar) return profileAvatar;

  const uploadedMedia = Array.isArray(user.uploadedMedia) ? user.uploadedMedia : [];
  const avatar =
    uploadedMedia.find(
      (item) => item?.status === 'uploaded' && item?.type === 'image' && item?.role === 'profile',
    ) ||
    uploadedMedia.find(
      (item) => item?.status === 'uploaded' && item?.type === 'image' && item?.role === 'cover',
    ) ||
    uploadedMedia.find((item) => item?.status === 'uploaded' && item?.type === 'image');
  return String(avatar?.uri || '').trim();
}

function getMediaComments(db, mediaId) {
  if (!db.mediaComments || typeof db.mediaComments !== 'object') {
    db.mediaComments = {};
  }
  const id = normalizeMediaId(mediaId);
  const comments = Array.isArray(db.mediaComments[id]) ? db.mediaComments[id] : [];
  db.mediaComments[id] = comments
    .filter((comment) => comment && typeof comment === 'object')
    .map((comment) => {
      const authorId = String(comment.authorId || '').trim();
      const authorUser = authorId
        ? (db.users || []).find((user) => user.id === authorId)
        : null;
      return {
        id: String(comment.id || `comment_${Date.now()}`),
        ...(authorId ? { authorId } : {}),
        author: String(comment.author || 'Гость').slice(0, 80),
        authorAvatarUri: String(
          getUserAvatarUri(authorUser) || comment.authorAvatarUri || '',
        ).slice(0, 2048),
        text: String(comment.text || '').slice(0, 600),
        createdAt: String(comment.createdAt || new Date().toISOString()),
      };
    })
    .filter((comment) => comment.text);
  return db.mediaComments[id];
}

function getPublicMediaStats(db, mediaId) {
  const comments = getMediaComments(db, mediaId);
  const likedBy = getPublicMediaLikeUsers(db, mediaId);
  return {
    likeCount: getMediaLikeUserIds(db, mediaId).length,
    likedByPreview: likedBy.slice(0, 1),
    saveCount: getMediaSaveUserIds(db, mediaId).length,
    commentCount: comments.length,
    comments,
  };
}

function getPublicVendorMedia(db, vendor) {
  const owner = getVendorOwner(db, vendor.id);
  const media = Array.isArray(owner?.uploadedMedia) ? owner.uploadedMedia : [];
  return media
    .filter((item) => item?.uri && item.status === 'uploaded')
    .map((item) => {
      const stats = getPublicMediaStats(db, item.id);
      return {
        id: item.id,
        uri: item.uri,
        type: item.type === 'video' ? 'video' : 'image',
        fileName: item.fileName || '',
        caption: item.caption || '',
        role: item.role || 'profile',
        likeCount: Number(item.likeCount || 0) + stats.likeCount,
        likedByPreview: stats.likedByPreview,
        saveCount: stats.saveCount,
        commentCount: stats.commentCount,
        comments: stats.comments,
      };
    });
}

function getPublicVendorMediaStats(db, vendor) {
  const stats = {};
  const media = getPublicVendorMedia(db, vendor);
  media.forEach((item) => {
    stats[item.id] = {
      likeCount: item.likeCount || 0,
      likedByPreview: item.likedByPreview || [],
      saveCount: item.saveCount || 0,
      commentCount: item.commentCount || 0,
      comments: item.comments || [],
    };
  });
  const prefix = `${vendor.id}:`;
  Object.keys(db.mediaLikes || {})
    .filter((mediaId) => mediaId.startsWith(prefix))
    .forEach((mediaId) => {
      stats[mediaId] = getPublicMediaStats(db, mediaId);
    });
  Object.keys(db.mediaComments || {})
    .filter((mediaId) => mediaId.startsWith(prefix))
    .forEach((mediaId) => {
      stats[mediaId] = getPublicMediaStats(db, mediaId);
    });
  Object.keys(db.mediaSaves || {})
    .filter((mediaId) => mediaId.startsWith(prefix))
    .forEach((mediaId) => {
      stats[mediaId] = getPublicMediaStats(db, mediaId);
    });
  return stats;
}

function publicVendor(vendor, db) {
  const likedUserIds = normalizeIdList(db?.vendorLikes?.[vendor.id]);
  const media = getPublicVendorMedia(db, vendor);
  const owner = getVendorOwner(db, vendor.id);
  const calendar = db?.vendorCalendars?.[vendor.id] ||
    (owner ? db?.vendorCalendars?.[owner.vendorId || `vendor_${owner.id}`] : null);
  const normalizedCalendar = normalizeVendorCalendar(calendar);
  const availability =
    calendar
      ? getNearestFreeAvailability(normalizedCalendar.busyDates, normalizedCalendar.freeDates)
      : normalizeVendorAvailability(vendor.availability);
  return {
    ...vendor,
    availability,
    likeCount: getVendorBaseLikeCount(vendor) + likedUserIds.length,
    media,
    mediaStats: getPublicVendorMediaStats(db, vendor),
  };
}

function publicVendors(db) {
  return sortVendorsForClients(db.vendors.map((vendor) => publicVendor(vendor, db)));
}

function sortVendorsForClients(vendors) {
  return [...vendors].filter((vendor) => !vendor.hidden).sort((a, b) => {
    const priorityDelta = getVendorFeaturedPriority(b) - getVendorFeaturedPriority(a);
    if (priorityDelta !== 0) return priorityDelta;

    const ratingDelta = Number(b.rating || 0) - Number(a.rating || 0);
    if (ratingDelta !== 0) return ratingDelta;

    return Number(b.likeCount ?? b.reviewCount ?? 0) - Number(a.likeCount ?? a.reviewCount ?? 0);
  });
}

function createSeedVendors() {
  const videos = {
    decor: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    photo: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    band: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    hall: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    film: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    host: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    cake: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    florist: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    dj: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    car: 'https://storage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
  };
  const base = [
    ['v1', 'Aigerim Decor Studio', 'Декор и флористика', 'Алматы', 4.9, 280000, 6, 184, 'Свободна 24 октября', 42, 'decor', videos.decor],
    ['v2', 'Timur Photo', 'Фотографы', 'Алматы', 4.8, 180000, 8, 260, 'Свободен 7 октября', 58, 'photo', videos.photo],
    ['v3', 'Royal Band', 'Лайв-бэнды', 'Астана', 4.7, 420000, 5, 140, 'Свободны 31 октября', 37, 'band', videos.band],
    ['v4', 'Grand Hall Almaty', 'Банкетные залы', 'Алматы', 4.9, 950000, 11, 620, 'Свободен 18 октября', 76, 'hall', videos.hall],
    ['v5', 'Qazaq Film', 'Видеографы', 'Шымкент', 4.8, 240000, 7, 210, 'Свободен 12 октября', 44, 'film', videos.film],
    ['v6', 'Arman Event', 'Ведущие', 'Алматы', 4.9, 320000, 9, 265, 'Свободен 7 октября', 46, 'host', videos.host],
    ['v7', 'Sweet Art Cake', 'Кондитеры', 'Алматы', 4.7, 95000, 5, 133, 'Свободна 3 ноября', 29, 'cake', videos.cake],
    ['v8', 'Maison Flora', 'Декор и флористика', 'Астана', 4.9, 145000, 6, 176, 'Свободна 10 ноября', 33, 'florist', videos.florist],
    ['v9', 'DJ Sultan', 'Техника и спецэффекты', 'Алматы', 4.6, 160000, 8, 310, 'Свободен 28 октября', 52, 'dj', videos.dj],
    ['v10', 'Premium Auto KZ', 'Техника и спецэффекты', 'Алматы', 4.8, 120000, 4, 118, 'Свободны 2 ноября', 24, 'car', videos.car],
  ];
  const plans = [
    ['Ведущие', 'hosts', ['Aruzhan Toastmaster', 'Sayan Event Voice'], ['Алматы', 'Астана'], [310000, 280000], ['cat-hosts', 'host'], 'band', videos.host, ['Ведущая с мягкой bilingual-подачей, семейными блоками и аккуратным таймингом вечера.', 'Динамичный ведущий для больших банкетов, выездных церемоний и afterparty без затянутых пауз.'], 'Ведение мероприятия'],
    ['Банкетные залы', 'halls', ['Aurora Grand Hall', 'Sulu Palace'], ['Алматы', 'Шымкент'], [1200000, 900000], ['cat-halls', 'hall'], 'decor', videos.hall, ['Зал до 240 гостей с welcome-зоной, сценой, экраном, парковкой и собственной банкетной кухней.', 'Светлый ресторанный зал для құдалық, ұзату и свадеб с отдельной комнатой для сборов.'], 'Банкетная площадка'],
    ['Декор и флористика', 'decor', ['Bloom Atelier KZ', 'Asyl Decor'], ['Астана', 'Алматы'], [260000, 340000], ['cat-decor', 'florist'], 'decor', videos.decor, ['Флористика, президиум, арка и welcome-зона в одном стиле с монтажом под ключ.', 'Декор больших залов: свет, текстиль, композиции на столы и фотозона для гостей.'], 'Оформление зала'],
    ['Фотографы', 'photographers', ['Dias Wedding Photo', 'Amina Frames'], ['Алматы', 'Астана'], [190000, 220000], ['cat-photographers', 'photo'], 'decor', videos.photo, ['Полный свадебный день, репортаж гостей, постановочные кадры и онлайн-галерея за 7 дней.', 'Нежная цветокоррекция, семейные портреты и быстрая preview-серия утром после события.'], 'Фотосъемка'],
    ['Видеографы', 'videographers', ['Nomad Film Crew', 'Qala Wedding Cinema'], ['Астана', 'Алматы'], [270000, 360000], ['cat-videographers', 'film'], 'photo', videos.film, ['Два оператора, тизер, фильм до 35 минут, чистый звук церемонии и аэрокадры.', 'Кинематографичная съемка банкета, love story и reels-нарезки для соцсетей.'], 'Видеосъемка'],
    ['Мобилографы', 'mobilographers', ['Reels Day KZ', 'Aika Mobile Films'], ['Алматы', 'Караганда'], [90000, 120000], ['cat-mobilographers', 'film'], 'photo', videos.film, ['Вертикальные Reels в день мероприятия: сборы, церемония, банкет и эмоции гостей.', 'Мобилография с монтажом коротких роликов за 24 часа и передачей исходников.'], 'Мобильная съемка'],
    ['Артисты', 'artists', ['Samal Live Show', 'Nurai Stage'], ['Шымкент', 'Алматы'], [180000, 230000], ['cat-artists', 'band'], 'dj', videos.band, ['Вокальный номер, интерактив с залом и праздничный выход под сценарий вечера.', 'Эстрадная программа с костюмами, танцевальным блоком и адаптацией под тайминг банкета.'], 'Артистическая программа'],
    ['Лайв-бэнды', 'live-bands', ['Alatau Jazz Band', 'Steppe Soul Live'], ['Алматы', 'Астана'], [420000, 480000], ['cat-live-bands', 'band'], 'dj', videos.band, ['Живая музыка для welcome, первого танца и банкетной программы с саксофоном.', 'Кавер-бэнд с казахским, русским и зарубежным репертуаром для больших залов.'], 'Живая музыка'],
    ['Свадебные образы', 'wedding-looks', ['Bride Look Room', 'Qyz Studio Dress'], ['Алматы', 'Астана'], [150000, 180000], ['cat-wedding-looks', 'photo'], 'florist', videos.photo, ['Подбор образа невесты: платье, аксессуары, примерка и сопровождение в день события.', 'Свадебные комплекты для невесты и ұзату с аккуратной подгонкой по фигуре.'], 'Образ невесты'],
    ['Қыз ұзату', 'kyz-uzatu', ['Aru Uzatu Team', 'Shanyraq Uzatu'], ['Шымкент', 'Алматы'], [300000, 380000], ['cat-kyz-uzatu', 'host'], 'decor', videos.host, ['Ұзату сценарийі, салт-дәстүр, жүргізуші, қыз шығару және отбасылық блоктар.', 'Қыз ұзату под ключ: тайминг, декор ұсыныстары, музыкалық сүйемелдеу және команда.'], 'Қыз ұзату бағдарламасы'],
    ['Құдалық', 'kudalyk', ['Dastur Qudalyq', 'Bereke Ceremony'], ['Тараз', 'Астана'], [220000, 260000], ['cat-kudalyk', 'hall'], 'host', videos.hall, ['Құдалыққа арналған дәстүрлі сценарий, асаба, дастархан таймингі және сыйлық рәсімдері.', 'Камерный құдалық с уважительной подачей традиций, музыкой и координацией гостей.'], 'Құдалық ұйымдастыру'],
    ['Организаторы', 'organizers', ['Toi Project Bureau', 'Alem Wedding Planner'], ['Алматы', 'Астана'], [450000, 520000], ['cat-organizers', 'host'], 'decor', videos.host, ['Полная организация свадьбы: смета, подрядчики, тайминг, логистика и контроль дня.', 'Планирование мероприятия с нуля, подбор команды, договоры и координация на площадке.'], 'Организация под ключ'],
    ['Кондитеры', 'confectioners', ['Tatti Cake House', 'Lumi Dessert'], ['Алматы', 'Костанай'], [95000, 130000], ['cat-confectioners', 'cake'], 'decor', videos.cake, ['Многоярусные торты, дегустация вкусов, доставка и установка перед подачей.', 'Авторские десерты, кенди-бар и торт в стилистике пары с устойчивой конструкцией.'], 'Свадебный торт'],
    ['Стилисты', 'stylists', ['Dana Beauty Bridal', 'Mika Make Up Hair'], ['Алматы', 'Астана'], [85000, 110000], ['cat-stylists', 'photo'], 'florist', videos.photo, ['Макияж и прическа невесты, репетиция образа, выезд утром и фиксация до вечера.', 'Образы для невесты, мамы и подружек с таймингом сборов и набором для коррекции.'], 'Свадебный макияж'],
    ['Шоу-программы', 'show-programs', ['Fire Show Almaty', 'Mirror People KZ'], ['Алматы', 'Шымкент'], [240000, 190000], ['cat-show-programs', 'band'], 'dj', videos.band, ['Яркий шоу-номер для кульминации вечера с безопасной зоной и техническим райдером.', 'Welcome-перформанс, интерактивные артисты и фотомоменты для гостей.'], 'Шоу-номер'],
    ['Техника и спецэффекты', 'effects', ['Light Pro KZ', 'Spark FX Team'], ['Алматы', 'Астана'], [210000, 260000], ['cat-effects', 'dj'], 'hall', videos.dj, ['Свет, звук, дым, холодные фонтаны и технический специалист на весь банкет.', 'Спецэффекты для первого танца, выхода пары, торта и финала вечера.'], 'Техническое сопровождение'],
  ];
  const generated = plans.flatMap(([category, slug, names, cities, prices, imageKeys, portfolioKey, video, descriptions, service], planIndex) =>
    names.map((name, variantIndex) => [
      `seed-${slug}-${variantIndex + 1}`,
      name,
      category,
      cities[variantIndex],
      Number((4.6 + ((planIndex + variantIndex) % 4) * 0.1).toFixed(1)),
      prices[variantIndex],
      3 + ((planIndex + variantIndex) % 8),
      48 + planIndex * 14 + variantIndex * 17,
      formatRussianDate(new Date(getAlmatyTodayDate().getTime() + (6 + planIndex + variantIndex * 3) * 86400000)).replace(/^/, 'Свободен '),
      18 + planIndex * 2 + variantIndex * 5,
      imageKeys[variantIndex],
      video,
      descriptions[variantIndex],
      service,
      imageKeys[variantIndex === 0 ? 1 : 0],
      portfolioKey,
    ]),
  );
  const rows = [...base, ...generated];

  return rows.map(([id, name, category, city, rating, priceFrom, experience, weddings, availability, portfolioCount, imageKey, shortVideoUrl, description, service, portfolioAlt, portfolioThird], index) => {
    const featured = getDefaultVendorFeatured(id);

    return {
      id,
      name,
      category,
      city,
      rating,
      priceFrom,
      verified: true,
      ...(featured ? { featured } : {}),
      experience,
      weddings,
      availability,
      portfolioCount,
      contactPhone: `+770155501${String(index).padStart(2, '0')}`,
      likeCount: index === 5 ? 38 : 12 + index * 3,
      reviewCount: index === 5 ? 38 : 12 + index * 3,
      shortVideoUrl,
      imageKey,
      portfolioImageKeys: [imageKey, portfolioAlt || (index % 2 === 0 ? 'hall' : 'decor'), portfolioThird || (index % 3 === 0 ? 'photo' : 'florist')],
      description:
        description ||
        'Проверенный подрядчик для мероприятий: понятные условия, живые медиа, быстрый ответ и аккуратная работа с датой.',
      packages: [
        {
          name: service || 'Базовый',
          price: priceFrom,
          details: 'Основная услуга, консультация и подготовка.',
        },
        {
          name: service ? `${service} плюс` : 'Расширенный',
          price: Math.round(priceFrom * 1.7),
          details: 'Больше времени, подготовка сценария и сопровождение.',
        },
      ],
      reviews: [
        {
          id: `${id}-review-1`,
          author: 'Алия',
          rating,
          date: '12 июня',
          text: 'Быстро ответили, держали договоренности и помогли спокойно закрыть дату.',
        },
      ],
    };
  });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(String(password), salt, 120000, 32, 'sha256')
    .toString('hex');
  return `pbkdf2$120000$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;

  if (String(storedHash).startsWith('pbkdf2$')) {
    const [, iterationsRaw, salt, expectedHash] = String(storedHash).split('$');
    const iterations = Number(iterationsRaw);
    if (!iterations || !salt || !expectedHash) return false;
    const actualHash = crypto
      .pbkdf2Sync(String(password), salt, iterations, 32, 'sha256')
      .toString('hex');
    if (actualHash.length !== expectedHash.length) return false;
    return crypto.timingSafeEqual(Buffer.from(actualHash), Buffer.from(expectedHash));
  }

  const legacyHash = crypto.createHash('sha256').update(String(password)).digest('hex');
  return legacyHash === storedHash;
}

function createSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function issueSession(user) {
  user.authToken = createSessionToken();
  user.authTokenCreatedAt = new Date().toISOString();
  return user.authToken;
}

function sessionTokenMatches(user, token) {
  const expected = Buffer.from(String(user?.authToken || ''));
  const actual = Buffer.from(String(token || ''));
  if (!expected.length || expected.length !== actual.length) return false;
  if (!crypto.timingSafeEqual(expected, actual)) return false;

  const createdAt = Date.parse(String(user?.authTokenCreatedAt || ''));
  return Number.isFinite(createdAt) && Date.now() - createdAt <= SESSION_TTL_MS;
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

function requireUser(req, res, db, userId) {
  const user = db.users.find((item) => item.id === userId);
  if (!user) {
    sendJson(res, 404, { error: 'User not found' });
    return null;
  }

  const token = getBearerToken(req);
  if (!sessionTokenMatches(user, token)) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return null;
  }

  return user;
}

function getReviewerName(value) {
  const normalized = String(value || '').trim().toLocaleLowerCase('ru-RU');
  return ['Жан', 'Арман', 'Нурислам', 'Админ'].find(
    (name) => name.toLocaleLowerCase('ru-RU') === normalized,
  ) || null;
}

function requireReviewSession(req, res, db) {
  const token = getBearerToken(req);
  const session = token ? db.reviewSessions?.[token] : null;
  if (!session || !getReviewerName(session.reviewer)) {
    sendJson(res, 401, { error: 'Войдите в панель' });
    return null;
  }
  return session;
}

function requireAdmin(req, res) {
  const adminToken = process.env.MODERATION_ADMIN_TOKEN;
  if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return false;
  }
  return true;
}

function publicAdminUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    vendorId: user.vendorId || null,
    profileCreated: Boolean(user.profileCreated),
    createdAt: user.createdAt || null,
  };
}

function publicAdminVendor(vendor, db) {
  const owner = db.users.find(
    (user) => user.vendorId === vendor.id || `vendor_${user.id}` === vendor.id,
  );
  const reportCount = (db.contentReports || []).filter(
    (report) => report.vendorId === vendor.id && report.status !== 'resolved',
  ).length;

  return {
    ...vendor,
    owner: owner ? publicAdminUser(owner) : null,
    reportCount,
  };
}

function getAdminModerationDashboard(db) {
  const reports = Array.isArray(db.contentReports) ? db.contentReports : [];
  const deletionRequests = Array.isArray(db.accountDeletionRequests)
    ? db.accountDeletionRequests
    : [];
  const vendors = Array.isArray(db.vendors) ? db.vendors : [];
  const users = Array.isArray(db.users) ? db.users : [];

  return {
    stats: {
      users: users.length,
      vendors: vendors.length,
      visibleVendors: vendors.filter((vendor) => !vendor.hidden).length,
      hiddenVendors: vendors.filter((vendor) => vendor.hidden).length,
      openReports: reports.filter((report) => report.status !== 'resolved').length,
      openDeletionRequests: deletionRequests.filter(
        (request) => request.status !== 'completed' && request.status !== 'rejected',
      ).length,
      storage: {
        db: shouldUsePostgresDb() ? 'postgres' : 'file',
        uploads: shouldUseS3Uploads() ? 's3' : 'local',
      },
    },
    reports,
    deletionRequests,
    vendors: vendors.map((vendor) => publicAdminVendor(vendor, db)),
  };
}

function deleteVendorFromDb(db, vendorId) {
  const vendor = db.vendors.find((item) => item.id === vendorId);
  if (!vendor) return null;
  const owner = db.users.find(
    (user) => user.vendorId === vendorId || `vendor_${user.id}` === vendorId,
  );
  const removedMedia = Array.isArray(owner?.uploadedMedia) ? [...owner.uploadedMedia] : [];

  db.vendors = db.vendors.filter((item) => item.id !== vendorId);
  db.bookings = (db.bookings || []).filter((booking) => booking.vendorId !== vendorId);
  delete db.vendorAnalytics[vendorId];
  delete db.vendorCalendars[vendorId];
  delete db.vendorLikes[vendorId];
  db.contentReports = (db.contentReports || []).filter(
    (report) => report.vendorId !== vendorId,
  );

  removedMedia.forEach((media) => {
    if (media?.id) cleanupMediaEngagement(db, media.id);
  });

  for (const user of db.users || []) {
    user.bookings = (user.bookings || []).filter((booking) => booking.vendorId !== vendorId);
    user.likedVendorIds = (user.likedVendorIds || []).filter((id) => id !== vendorId);
    user.savedVendorIds = (user.savedVendorIds || []).filter((id) => id !== vendorId);
    user.blockedVendorIds = (user.blockedVendorIds || []).filter((id) => id !== vendorId);
    if (user.vendorId === vendorId) {
      user.vendorId = null;
      user.profileCreated = false;
      user.uploadedMedia = [];
    }
  }

  return { media: removedMedia, vendor };
}

function removeUserAuthoredContent(db, userId) {
  for (const likes of Object.values(db.vendorLikes || {})) {
    if (Array.isArray(likes)) {
      const next = likes.filter((id) => id !== userId);
      likes.splice(0, likes.length, ...next);
    }
  }
  for (const likes of Object.values(db.mediaLikes || {})) {
    if (Array.isArray(likes)) {
      const next = likes.filter((id) => id !== userId);
      likes.splice(0, likes.length, ...next);
    }
  }
  for (const saves of Object.values(db.mediaSaves || {})) {
    if (Array.isArray(saves)) {
      const next = saves.filter((id) => id !== userId);
      saves.splice(0, saves.length, ...next);
    }
  }
  for (const [mediaId, comments] of Object.entries(db.mediaComments || {})) {
    if (!Array.isArray(comments)) continue;
    db.mediaComments[mediaId] = comments.filter(
      (comment) => String(comment?.authorId || '') !== userId,
    );
  }
  db.contentReports = (db.contentReports || []).filter(
    (report) => String(report?.reporterId || '') !== userId,
  );
  for (const user of db.users || []) {
    user.blockedUserIds = normalizeIdList(user.blockedUserIds).filter(
      (blockedUserId) => blockedUserId !== userId,
    );
  }
}

function deleteUserFromDb(db, user) {
  const media = [];
  const documents = [...(user.documents || [])];
  if (user.vendorId) {
    media.push(...(deleteVendorFromDb(db, user.vendorId)?.media || []));
  } else {
    media.push(...(user.uploadedMedia || []));
    for (const item of user.uploadedMedia || []) {
      if (item?.id) cleanupMediaEngagement(db, item.id);
    }
  }

  removeUserAuthoredContent(db, user.id);
  db.users = (db.users || []).filter((item) => item.id !== user.id);
  db.bookings = (db.bookings || []).filter(
    (booking) => booking.clientId !== user.id && booking.vendorUserId !== user.id,
  );
  for (const otherUser of db.users || []) {
    otherUser.bookings = (otherUser.bookings || []).filter(
      (booking) => booking.clientId !== user.id && booking.vendorUserId !== user.id,
    );
  }
  return { documents, media };
}

async function deleteStoredUserAssets({ documents = [], media = [] }) {
  const mediaDeleted = await deleteStoredMediaObjects(media);
  const documentResults = await Promise.allSettled(
    documents.map((document) => deleteStoredDocument(document)),
  );
  const failedDocuments = documentResults.filter((result) => result.status === 'rejected');
  if (failedDocuments.length) {
    console.warn(`Deleted user document cleanup failed: ${failedDocuments.length}`);
  }
  return {
    documentsDeleted: documentResults.length - failedDocuments.length,
    mediaDeleted,
    storageCleanupComplete: failedDocuments.length === 0 && mediaDeleted === media.length,
  };
}

function getRemovedMediaItems(previousMedia, nextMedia) {
  const nextItems = Array.isArray(nextMedia) ? nextMedia : [];
  return (Array.isArray(previousMedia) ? previousMedia : []).filter((previousItem) => {
    const previousUri = String(previousItem?.uri || '');
    if (!previousUri) return false;
    return !nextItems.some((nextItem) => String(nextItem?.uri || '') === previousUri);
  });
}

function removeVendorMedia(db, vendorId, mediaId) {
  const owner = db.users.find(
    (user) => user.vendorId === vendorId || `vendor_${user.id}` === vendorId,
  );
  if (!owner) return null;
  const media = Array.isArray(owner.uploadedMedia) ? owner.uploadedMedia : [];
  const removed = media.find((item) => item.id === mediaId);
  if (!removed) return null;
  owner.uploadedMedia = media.filter((item) => item.id !== mediaId);
  cleanupMediaEngagement(db, mediaId);
  syncVendorMediaFromUser(db, owner);
  return { media: removed, user: owner };
}

function cleanupMediaEngagement(db, mediaId) {
  const id = normalizeMediaId(mediaId);
  if (!id) return;
  delete db.mediaLikes?.[id];
  delete db.mediaSaves?.[id];
  delete db.mediaComments?.[id];
  for (const user of db.users || []) {
    user.likedMediaIds = normalizeIdList(user.likedMediaIds).filter((item) => item !== id);
    user.savedMediaIds = normalizeIdList(user.savedMediaIds).filter((item) => item !== id);
  }
}

function createVerificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function isTestAuthAllowed() {
  return process.env.ALLOW_TEST_AUTH === '1';
}

function getVerificationEmailContent(code) {
  return {
    subject: 'Код подтверждения SVADBA.kz',
    text: `Ваш код подтверждения SVADBA.kz: ${code}. Код действует 10 минут.`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#0A1114;color:#ffffff;padding:24px;border-radius:16px">
        <h1 style="margin:0 0 12px;font-size:24px">SVADBA.kz</h1>
        <p style="margin:0 0 16px;color:#c7d0d9">Ваш код подтверждения:</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:6px">${code}</div>
        <p style="margin:18px 0 0;color:#8f9aa5">Код действует 10 минут.</p>
      </div>
    `,
  };
}

function createEmailFromAddress({ email, name }) {
  return name ? `"${name.replace(/"/g, '\\"')}" <${email}>` : email;
}

async function sendVerificationEmailViaSmtp({ code, email }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail =
    process.env.SMTP_FROM_EMAIL ||
    process.env.SENDGRID_FROM_EMAIL ||
    process.env.SMTP_USER;
  const fromName =
    process.env.SMTP_FROM_NAME ||
    process.env.SENDGRID_FROM_NAME ||
    'SVADBA.kz';

  if (!host || !fromEmail) {
    return { sent: false, reason: 'missing_smtp_config' };
  }

  const secure =
    process.env.SMTP_SECURE === '1' ||
    process.env.SMTP_SECURE === 'true' ||
    port === 465;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    ...(user && pass ? { auth: { user, pass } } : {}),
  });
  const content = getVerificationEmailContent(code);

  await transporter.sendMail({
    from: createEmailFromAddress({ email: fromEmail, name: fromName }),
    to: email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  return { sent: true, provider: 'smtp' };
}

async function sendVerificationEmail({ code, email }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName = process.env.SENDGRID_FROM_NAME || 'SVADBA.kz';
  const sendgridBaseUrl =
    process.env.SENDGRID_BASE_URL || 'https://api.sendgrid.com';
  const content = getVerificationEmailContent(code);
  let sendgridError = null;

  if (apiKey && fromEmail) {
    const response = await fetch(`${sendgridBaseUrl}/v3/mail/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email }],
          },
        ],
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject: content.subject,
        content: [
          {
            type: 'text/plain',
            value: content.text,
          },
          {
            type: 'text/html',
            value: content.html,
          },
        ],
      }),
    });

    if (response.ok) {
      return { sent: true, provider: 'sendgrid' };
    }
    const details = await response.text();
    sendgridError = `SendGrid ${response.status}: ${details}`;
  }

  try {
    const smtpResult = await sendVerificationEmailViaSmtp({ code, email });
    if (smtpResult.sent) return smtpResult;
  } catch (error) {
    return {
      sent: false,
      reason: 'smtp_failed',
      details: error.message,
      fallbackFrom: sendgridError,
    };
  }

  return {
    sent: false,
    reason: apiKey && fromEmail ? 'sendgrid_failed' : 'missing_email_config',
    details: sendgridError,
  };
}

function createBaseUser(email, role, passwordHash) {
  return {
    id: `user_${Date.now()}`,
    email,
    role,
    passwordHash,
    emailVerified: true,
    profileCreated: false,
    vendorDraft: createDefaultVendorDraft(),
    vendorSettingsValues: {},
    clientProfile: createDefaultClientProfile(email),
    clientSettingsValues: {},
    selectedImportIds: [],
    instagramHandle: '',
    eventDraft: createDefaultEventDraft(),
    eventHistory: [],
    bookings: [],
    blockedVendorIds: [],
    blockedUserIds: [],
    likedVendorIds: [],
    likedMediaIds: [],
    savedMediaIds: [],
    savedVendorIds: [],
    uploadedMedia: [],
    documents: [],
    vendorVerification: {
      status: 'Не отправлено',
      moderatorComment: '',
      updatedAt: null,
    },
    pushTokens: [],
  };
}

function getCsvEnv(name) {
  return String(process.env[name] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAllowedGoogleClientIds() {
  return [
    ...getCsvEnv('GOOGLE_CLIENT_IDS'),
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
  ].filter(Boolean);
}

function isGoogleWebClientId(clientId) {
  return Boolean(process.env.GOOGLE_WEB_CLIENT_ID && clientId === process.env.GOOGLE_WEB_CLIENT_ID);
}

function getAllowedAppleAudiences() {
  return [
    ...getCsvEnv('APPLE_CLIENT_IDS'),
    process.env.APPLE_CLIENT_ID,
    process.env.APPLE_BUNDLE_ID,
    'com.svadbakz.app',
  ].filter(Boolean);
}

function getAppleClientId() {
  return String(
    process.env.APPLE_CLIENT_ID ||
      process.env.APPLE_BUNDLE_ID ||
      getAllowedAppleAudiences()[0] ||
      '',
  ).trim();
}

function getApplePrivateKey() {
  return String(process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
}

function getOAuthTokenEncryptionKey() {
  const raw = process.env.OAUTH_TOKEN_ENCRYPTION_KEY || process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY;
  if (!raw) return null;
  return crypto.createHash('sha256').update(String(raw)).digest();
}

function setOAuthRefreshToken(provider, refreshToken) {
  if (!provider || !refreshToken) return;
  const key = getOAuthTokenEncryptionKey();
  if (!key) {
    provider.refreshToken = String(refreshToken);
    delete provider.refreshTokenEncrypted;
    delete provider.refreshTokenIv;
    delete provider.refreshTokenTag;
    return;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(refreshToken), 'utf8'),
    cipher.final(),
  ]);
  provider.refreshTokenEncrypted = encrypted.toString('base64');
  provider.refreshTokenIv = iv.toString('base64');
  provider.refreshTokenTag = cipher.getAuthTag().toString('base64');
  delete provider.refreshToken;
}

function getOAuthRefreshToken(provider) {
  if (!provider) return '';
  if (provider.refreshToken) return String(provider.refreshToken);
  if (!provider.refreshTokenEncrypted || !provider.refreshTokenIv || !provider.refreshTokenTag) {
    return '';
  }
  const key = getOAuthTokenEncryptionKey();
  if (!key) return '';
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(provider.refreshTokenIv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(provider.refreshTokenTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(provider.refreshTokenEncrypted, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function getAppleOAuthConfig() {
  return {
    clientId: getAppleClientId(),
    keyId: String(process.env.APPLE_KEY_ID || '').trim(),
    privateKey: getApplePrivateKey(),
    teamId: String(process.env.APPLE_TEAM_ID || '').trim(),
  };
}

async function createAppleClientSecret(clientId = getAppleClientId()) {
  const config = getAppleOAuthConfig();
  if (!clientId || !config.keyId || !config.privateKey || !config.teamId) {
    throw new Error('Apple OAuth server credentials are not configured');
  }
  const { SignJWT, importPKCS8 } = await import('jose');
  const privateKey = await importPKCS8(config.privateKey, 'ES256');
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: config.keyId })
    .setIssuer(config.teamId)
    .setSubject(clientId)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt(now)
    .setExpirationTime(now + 5 * 60)
    .sign(privateKey);
}

async function requestAppleToken(params, clientId = getAppleClientId()) {
  const response = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: await createAppleClientSecret(clientId),
      ...params,
    }).toString(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Apple token exchange failed: ${payload.error || response.status}`);
  }
  return payload;
}

async function exchangeAppleAuthorizationCode(code, clientId = getAppleClientId()) {
  return requestAppleToken(
    { code: String(code), grant_type: 'authorization_code' },
    clientId,
  );
}

async function revokeAppleRefreshToken(user) {
  const provider = user?.authProviders?.apple;
  const refreshToken = getOAuthRefreshToken(provider);
  if (!refreshToken) return false;
  const clientId = String(provider.clientId || getAppleClientId()).trim();
  const response = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: await createAppleClientSecret(clientId),
      token: refreshToken,
      token_type_hint: 'refresh_token',
    }).toString(),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(`Apple token revocation failed: ${payload.error || response.status}`);
  }
  return true;
}

function findUserByOAuth(db, provider, subject) {
  return db.users.find(
    (user) => user.authProviders?.[provider]?.subject === subject,
  );
}

function upsertOAuthUser(db, { email, fullName, provider, role, subject, providerData }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  let user = findUserByOAuth(db, provider, subject);
  if (!user && normalizedEmail) {
    user = db.users.find((item) => item.email === normalizedEmail);
  }
  if (!user) {
    if (!normalizedEmail) {
      throw new Error('OAuth email unavailable');
    }
    user = createBaseUser(normalizedEmail, role, null);
    db.users.push(user);
  }

  user.email = user.email || normalizedEmail;
  user.emailVerified = true;
  user.role = user.role || role;
  user.displayName = fullName || user.displayName || '';
  const existingProvider = user.authProviders?.[provider] || {};
  const nextProvider = {
    ...existingProvider,
    subject,
    email: normalizedEmail || user.email,
    linkedAt: existingProvider.linkedAt || new Date().toISOString(),
    lastAuthenticatedAt: new Date().toISOString(),
    ...(providerData || {}),
  };
  if (providerData?.refreshToken) {
    setOAuthRefreshToken(nextProvider, providerData.refreshToken);
  }
  user.authProviders = {
    ...(user.authProviders || {}),
    [provider]: nextProvider,
  };
  issueSession(user);
  return user;
}

async function verifyOAuthJwt({ audience, issuer, jwksUrl, token }) {
  const { createRemoteJWKSet, jwtVerify } = await import('jose');
  const jwks = createRemoteJWKSet(new URL(jwksUrl));
  const { payload } = await jwtVerify(token, jwks, {
    audience,
    issuer,
  });
  return payload;
}

async function exchangeGoogleAuthCode({
  clientId,
  code,
  codeVerifier,
  redirectUri,
}) {
  const params = new URLSearchParams({
    client_id: clientId,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
  if (codeVerifier) params.set('code_verifier', codeVerifier);
  if (isGoogleWebClientId(clientId) && process.env.GOOGLE_CLIENT_SECRET) {
    params.set('client_secret', process.env.GOOGLE_CLIENT_SECRET);
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Google token exchange failed: ${details}`);
  }
  return response.json();
}

function normalizeInstagramHandle(handle) {
  return String(handle || '').trim().replace(/^@/, '');
}

function getInstagramRedirectUri(req) {
  return (
    getSafeOAuthRedirectUri(
      process.env.INSTAGRAM_REDIRECT_URI,
      '/api/instagram/callback',
    ) || `${getOAuthPublicBase(req)}/api/instagram/callback`
  );
}

function getInstagramConfig(req) {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  const graphVersion = process.env.INSTAGRAM_GRAPH_VERSION || 'v24.0';
  return {
    clientId,
    clientSecret,
    enabled: Boolean(clientId && clientSecret),
    graphVersion,
    redirectUri: getInstagramRedirectUri(req),
    scope: process.env.INSTAGRAM_SCOPE || 'instagram_business_basic',
  };
}

function getFacebookRedirectUri(req) {
  return (
    getSafeOAuthRedirectUri(
      process.env.FACEBOOK_REDIRECT_URI,
      '/api/instagram/facebook-callback',
    ) || `${getOAuthPublicBase(req)}/api/instagram/facebook-callback`
  );
}

function getFacebookConfig(req) {
  const clientId =
    process.env.FACEBOOK_CLIENT_ID ||
    process.env.FACEBOOK_APP_ID ||
    process.env.META_APP_ID;
  const clientSecret =
    process.env.FACEBOOK_CLIENT_SECRET ||
    process.env.FACEBOOK_APP_SECRET ||
    process.env.META_APP_SECRET;
  const graphVersion =
    process.env.FACEBOOK_GRAPH_VERSION ||
    process.env.INSTAGRAM_GRAPH_VERSION ||
    'v24.0';
  return {
    clientId,
    clientSecret,
    enabled: Boolean(clientId && clientSecret),
    graphVersion,
    redirectUri: getFacebookRedirectUri(req),
    scope:
      process.env.FACEBOOK_INSTAGRAM_SCOPE ||
      'pages_show_list,pages_read_engagement,instagram_basic',
  };
}

function createInstagramAuthUrl({ req, state }) {
  const config = getInstagramConfig(req);
  const authUrl = new URL('https://www.instagram.com/oauth/authorize');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', config.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', config.scope);
  authUrl.searchParams.set('state', state);
  return authUrl.toString();
}

function createFacebookInstagramAuthUrl({ req, state }) {
  const config = getFacebookConfig(req);
  const authUrl = new URL(`https://www.facebook.com/${config.graphVersion}/dialog/oauth`);
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', config.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', config.scope);
  authUrl.searchParams.set('state', state);
  return authUrl.toString();
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function pickInstagramImageKey(index, mediaType) {
  const imageKeys = mediaType === 'video'
    ? ['host', 'dj', 'film', 'band']
    : ['decor', 'photo', 'hall', 'florist'];
  return imageKeys[index % imageKeys.length];
}

function normalizeInstagramMediaItem(item, index, handle) {
  const mediaType = String(item.media_type || item.type || '').toUpperCase();
  const type = mediaType === 'VIDEO' || mediaType === 'REELS' ? 'video' : 'image';
  const caption = String(item.caption || item.title || '').trim();
  const normalizedHandle = normalizeInstagramHandle(handle) || 'instagram';
  const ownerUsername = normalizeInstagramHandle(item.media_owner_username || '');
  const isCollaborative =
    item.source === 'instagram_collaborative' ||
    Boolean(ownerUsername && ownerUsername.toLowerCase() !== normalizedHandle.toLowerCase());
  const title =
    caption.split(/\r?\n/)[0]?.slice(0, 70) ||
    (isCollaborative
      ? type === 'video'
        ? 'Совместный Instagram Reels'
        : 'Совместный Instagram post'
      : type === 'video'
        ? 'Instagram Reels'
        : 'Instagram post');
  const sourceUrl =
    item.permalink ||
    item.sourceUrl ||
    `https://www.instagram.com/${normalizedHandle}/media-${index + 1}`;

  return {
    id: String(item.id || item.media_id || item.providerMediaId || `ig_${Date.now()}_${index}`),
    providerMediaId: String(item.id || item.media_id || item.providerMediaId || `ig_${index}`),
    type,
    title,
    caption,
    imageKey: item.imageKey || pickInstagramImageKey(index, type),
    mediaUrl: item.media_url || item.mediaUrl || '',
    thumbnailUrl: item.thumbnail_url || item.thumbnailUrl || item.media_url || '',
    sourceUrl,
    permalink: sourceUrl,
    timestamp: item.timestamp || new Date().toISOString(),
    source: item.source || 'instagram',
    ownerUsername: ownerUsername || normalizedHandle,
    isCollaborative,
  };
}

async function redirectInstagramOAuthError({ req, res, db, state, stateRecord, error }) {
  if (state && db.instagramOAuthStates?.[state]) {
    delete db.instagramOAuthStates[state];
    await writeDb(db);
  }

  const appUrl = new URL(stateRecord?.returnUrl || '/', getPublicOrigin(req));
  appUrl.searchParams.set('settings', 'instagram');
  appUrl.searchParams.set('instagram', 'select');
  appUrl.searchParams.set('instagramFallback', 'files');
  appUrl.searchParams.set(
    'instagramError',
    String(error?.message || error || 'Instagram connection failed').slice(0, 280),
  );
  res.writeHead(302, { Location: appUrl.toString() });
  res.end();
}

async function exchangeInstagramCode({ code, req }) {
  const config = getInstagramConfig(req);
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
    code,
  });
  const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    body,
  });

  if (!tokenResponse.ok) {
    throw new Error(`Instagram token ${tokenResponse.status}: ${await tokenResponse.text()}`);
  }

  const shortToken = await tokenResponse.json();
  let accessToken = shortToken.access_token;
  let expiresIn = null;

  const longTokenUrl = new URL('https://graph.instagram.com/access_token');
  longTokenUrl.searchParams.set('grant_type', 'ig_exchange_token');
  longTokenUrl.searchParams.set('client_secret', config.clientSecret);
  longTokenUrl.searchParams.set('access_token', accessToken);
  const longTokenResponse = await fetch(longTokenUrl);
  if (longTokenResponse.ok) {
    const longToken = await longTokenResponse.json();
    accessToken = longToken.access_token || accessToken;
    expiresIn = longToken.expires_in || null;
  }

  return {
    accessToken,
    expiresIn,
    instagramUserId: String(shortToken.user_id || ''),
  };
}

async function exchangeFacebookCode({ code, req }) {
  const config = getFacebookConfig(req);
  const tokenUrl = new URL(`https://graph.facebook.com/${config.graphVersion}/oauth/access_token`);
  tokenUrl.searchParams.set('client_id', config.clientId);
  tokenUrl.searchParams.set('client_secret', config.clientSecret);
  tokenUrl.searchParams.set('redirect_uri', config.redirectUri);
  tokenUrl.searchParams.set('code', code);

  const tokenResponse = await fetch(tokenUrl);
  if (!tokenResponse.ok) {
    throw new Error(`Facebook token ${tokenResponse.status}: ${await tokenResponse.text()}`);
  }

  const shortToken = await tokenResponse.json();
  let accessToken = shortToken.access_token;
  let expiresIn = shortToken.expires_in || null;

  const longTokenUrl = new URL(`https://graph.facebook.com/${config.graphVersion}/oauth/access_token`);
  longTokenUrl.searchParams.set('grant_type', 'fb_exchange_token');
  longTokenUrl.searchParams.set('client_id', config.clientId);
  longTokenUrl.searchParams.set('client_secret', config.clientSecret);
  longTokenUrl.searchParams.set('fb_exchange_token', accessToken);
  const longTokenResponse = await fetch(longTokenUrl);
  if (longTokenResponse.ok) {
    const longToken = await longTokenResponse.json();
    accessToken = longToken.access_token || accessToken;
    expiresIn = longToken.expires_in || expiresIn;
  }

  return { accessToken, expiresIn };
}

async function fetchFacebookInstagramAccounts(accessToken) {
  const config = getFacebookConfig();
  const accountsUrl = new URL(`https://graph.facebook.com/${config.graphVersion}/me/accounts`);
  accountsUrl.searchParams.set(
    'fields',
    [
      'id',
      'name',
      'access_token',
      'instagram_business_account{id,username,profile_picture_url,media_count,account_type}',
      'connected_instagram_account{id,username,profile_picture_url,media_count,account_type}',
    ].join(','),
  );
  accountsUrl.searchParams.set('limit', '100');
  accountsUrl.searchParams.set('access_token', accessToken);

  const response = await fetch(accountsUrl);
  if (!response.ok) {
    throw new Error(`Facebook pages ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  return (payload.data || [])
    .map((page) => {
      const instagramAccount =
        page.instagram_business_account || page.connected_instagram_account || null;
      return {
        pageId: String(page.id || ''),
        pageName: page.name || '',
        pageAccessToken: page.access_token || '',
        instagramAccount,
      };
    })
    .filter((account) => account.pageId);
}

function pickFacebookInstagramAccount(accounts, handle) {
  const normalizedHandle = normalizeInstagramHandle(handle).toLowerCase();
  const connectedAccounts = accounts.filter((account) => account.instagramAccount);
  return (
    connectedAccounts.find(
      (account) =>
        normalizeInstagramHandle(account.instagramAccount?.username).toLowerCase() ===
        normalizedHandle,
    ) ||
    connectedAccounts[0] ||
    null
  );
}

function describeFacebookInstagramAccounts(accounts) {
  if (!accounts.length) {
    return 'Facebook не вернул ни одной Page. Проверьте, что ваш Facebook пользователь управляет Page.';
  }

  return accounts
    .map((account) => {
      const instagram = account.instagramAccount;
      const pageName = account.pageName || account.pageId || 'Page';
      return instagram
        ? `${pageName}: Instagram @${instagram.username || instagram.id || 'unknown'}`
        : `${pageName}: Instagram не привязан`;
    })
    .join('; ');
}

function getInstagramTokenExpiresAt(expiresIn) {
  return expiresIn
    ? new Date(Date.now() + Number(expiresIn) * 1000).toISOString()
    : null;
}

function getInstagramTokenEncryptionKey() {
  const raw = process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY;
  if (!raw) return null;
  return crypto.createHash('sha256').update(String(raw)).digest();
}

function setInstagramAccessToken(connection, accessToken) {
  const key = getInstagramTokenEncryptionKey();
  if (!key) {
    connection.accessToken = accessToken;
    delete connection.accessTokenEncrypted;
    delete connection.accessTokenIv;
    delete connection.accessTokenTag;
    return;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(accessToken), 'utf8'),
    cipher.final(),
  ]);
  connection.accessTokenEncrypted = encrypted.toString('base64');
  connection.accessTokenIv = iv.toString('base64');
  connection.accessTokenTag = cipher.getAuthTag().toString('base64');
  delete connection.accessToken;
}

function getInstagramAccessToken(connection) {
  if (!connection) return '';
  if (connection.accessToken) return connection.accessToken;
  if (!connection.accessTokenEncrypted || !connection.accessTokenIv || !connection.accessTokenTag) {
    return '';
  }

  const key = getInstagramTokenEncryptionKey();
  if (!key) return '';

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(connection.accessTokenIv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(connection.accessTokenTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(connection.accessTokenEncrypted, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function shouldRefreshInstagramToken(connection) {
  if (!getInstagramAccessToken(connection) || !connection.expiresAt) return false;
  const expiresAt = new Date(connection.expiresAt).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return Number.isFinite(expiresAt) && expiresAt - Date.now() < sevenDays;
}

async function refreshInstagramAccessToken(connection) {
  const refreshUrl = new URL('https://graph.instagram.com/refresh_access_token');
  refreshUrl.searchParams.set('grant_type', 'ig_refresh_token');
  refreshUrl.searchParams.set('access_token', getInstagramAccessToken(connection));
  const response = await fetch(refreshUrl);
  if (!response.ok) {
    throw new Error(`Instagram refresh ${response.status}: ${await response.text()}`);
  }
  const token = await response.json();
  if (token.access_token) {
    setInstagramAccessToken(connection, token.access_token);
  }
  connection.expiresIn = token.expires_in || connection.expiresIn || null;
  connection.expiresAt = getInstagramTokenExpiresAt(connection.expiresIn);
  connection.refreshedAt = new Date().toISOString();
  return connection;
}

async function fetchInstagramProfile(accessToken) {
  const config = getInstagramConfig();
  const profileUrl = new URL(`https://graph.instagram.com/${config.graphVersion}/me`);
  profileUrl.searchParams.set(
    'fields',
    'id,user_id,username,account_type,profile_picture_url,media_count',
  );
  profileUrl.searchParams.set('access_token', accessToken);
  const response = await fetch(profileUrl);
  if (!response.ok) {
    throw new Error(`Instagram profile ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

function getInstagramMediaFields() {
  return [
    'id',
    'caption',
    'media_type',
    'media_product_type',
    'media_url',
    'thumbnail_url',
    'permalink',
    'timestamp',
  ].join(',');
}

async function fetchGraphCollection(url, dataSelector, nextSelector) {
  const items = [];
  let nextUrl = url.toString();
  const seenPages = new Set();

  while (nextUrl && items.length < MAX_INSTAGRAM_MEDIA_ITEMS) {
    if (seenPages.has(nextUrl)) break;
    seenPages.add(nextUrl);

    const response = await fetch(nextUrl);
    if (!response.ok) {
      throw new Error(`Instagram media ${response.status}: ${await response.text()}`);
    }

    const payload = await response.json();
    const pageItems = dataSelector(payload) || [];
    for (const item of pageItems) {
      if (items.length >= MAX_INSTAGRAM_MEDIA_ITEMS) break;
      items.push(item);
    }
    nextUrl = items.length >= MAX_INSTAGRAM_MEDIA_ITEMS ? '' : nextSelector(payload);
  }

  return items;
}

function mergeInstagramMedia(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.providerMediaId || item.id || item.permalink || item.sourceUrl;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchInstagramOwnedMedia(accessToken, handle) {
  const config = getInstagramConfig();
  const mediaUrl = new URL(`https://graph.instagram.com/${config.graphVersion}/me/media`);
  mediaUrl.searchParams.set('fields', getInstagramMediaFields());
  mediaUrl.searchParams.set('limit', '50');
  mediaUrl.searchParams.set('access_token', accessToken);
  const items = await fetchGraphCollection(
    mediaUrl,
    (payload) => payload.data || [],
    (payload) => payload.paging?.next || '',
  );
  return items.map((item, index) =>
    normalizeInstagramMediaItem(item, index, handle),
  );
}

async function fetchInstagramCollaborativeMedia(accessToken, handle) {
  const config = getInstagramConfig();
  const mediaUrl = new URL(`https://graph.instagram.com/${config.graphVersion}/me`);
  mediaUrl.searchParams.set(
    'fields',
    `collaborative_media.limit(50){media_id,media_owner_username,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp}`,
  );
  mediaUrl.searchParams.set('access_token', accessToken);
  const response = await fetch(mediaUrl);

  if (!response.ok) {
    return {
      items: [],
      notices: [
        {
          code: 'instagram_collaborative_media_unavailable',
          severity: 'info',
          message:
            'Совместные публикации могут не прийти через Instagram Login. SVADBA.kz попробует Meta-вход, а если Meta не отдаст конкретный пост, добавьте его ниже через ссылку и файл.',
        },
      ],
    };
  }

  const payload = await response.json();
  const items = [...(payload.collaborative_media?.data || [])];
  let nextUrl = payload.collaborative_media?.paging?.next || '';
  const seenPages = new Set();
  while (nextUrl && items.length < MAX_INSTAGRAM_MEDIA_ITEMS) {
    if (seenPages.has(nextUrl)) break;
    seenPages.add(nextUrl);
    const nextResponse = await fetch(nextUrl);
    if (!nextResponse.ok) break;
    const nextPayload = await nextResponse.json();
    const nextItems = nextPayload.data || nextPayload.collaborative_media?.data || [];
    for (const item of nextItems) {
      if (items.length >= MAX_INSTAGRAM_MEDIA_ITEMS) break;
      items.push(item);
    }
    nextUrl = nextPayload.paging?.next || nextPayload.collaborative_media?.paging?.next || '';
  }
  return {
    items: items.map((item, index) =>
      normalizeInstagramMediaItem(
        { ...item, source: 'instagram_collaborative' },
        index,
        item.media_owner_username || handle,
      ),
    ),
    notices: [],
  };
}

async function fetchInstagramMedia(accessToken, handle) {
  const ownedItems = await fetchInstagramOwnedMedia(accessToken, handle);
  const collabResult = await fetchInstagramCollaborativeMedia(accessToken, handle);
  return {
    items: mergeInstagramMedia([...ownedItems, ...collabResult.items]),
    notices: collabResult.notices,
  };
}

async function fetchFacebookInstagramEdge({ accessToken, edge, handle, igUserId }) {
  const config = getFacebookConfig();
  const edgeUrl = new URL(`https://graph.facebook.com/${config.graphVersion}/${igUserId}/${edge}`);
  edgeUrl.searchParams.set(
    'fields',
    [
      'id',
      'media_id',
      'media_owner_username',
      'caption',
      'media_type',
      'media_product_type',
      'media_url',
      'thumbnail_url',
      'permalink',
      'timestamp',
    ].join(','),
  );
  edgeUrl.searchParams.set('limit', '50');
  edgeUrl.searchParams.set('access_token', accessToken);

  const items = await fetchGraphCollection(
    edgeUrl,
    (payload) => payload.data || [],
    (payload) => payload.paging?.next || '',
  );
  return items.map((item, index) =>
    normalizeInstagramMediaItem(
      {
        ...item,
        source: edge === 'collaborative_media' ? 'instagram_collaborative' : 'instagram',
      },
      index,
      item.media_owner_username || handle,
    ),
  );
}

async function fetchFacebookInstagramMedia(connection, handle) {
  const accessToken = getInstagramAccessToken(connection);
  const igUserId = connection.instagramBusinessUserId || connection.instagramUserId;
  if (!accessToken || !igUserId) {
    throw new Error('Facebook Instagram connection is incomplete');
  }

  const notices = [];
  const ownedItems = await fetchFacebookInstagramEdge({
    accessToken,
    edge: 'media',
    handle,
    igUserId,
  });
  let collaborativeItems = [];
  try {
    collaborativeItems = await fetchFacebookInstagramEdge({
      accessToken,
      edge: 'collaborative_media',
      handle,
      igUserId,
    });
  } catch (error) {
    notices.push({
      code: 'instagram_collaborative_media_unavailable',
      severity: 'info',
      message:
        'Meta-вход подключен, но совместные публикации пока не отданы API. Добавьте недостающие посты ниже через ссылку и файл.',
    });
  }

  return {
    items: mergeInstagramMedia([...ownedItems, ...collaborativeItems]),
    notices,
  };
}

async function fetchConnectedInstagramMedia(connection, handle) {
  if (connection?.mode === 'facebook_oauth') {
    return fetchFacebookInstagramMedia(connection, handle);
  }

  return fetchInstagramMedia(getInstagramAccessToken(connection), handle);
}

function sanitizeFileSegment(value) {
  return String(value || 'instagram')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'instagram';
}

function isLocalUploadUri(uri) {
  return (
    typeof uri === 'string' &&
    (uri.includes('/uploads/instagram/') ||
      (UPLOADS_PUBLIC_BASE_URL && uri.startsWith(`${UPLOADS_PUBLIC_BASE_URL}/`)))
  );
}

function shouldUseS3Uploads() {
  return UPLOADS_STORAGE === 's3' || Boolean(S3_UPLOAD_BUCKET);
}

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    });
  }
  return s3Client;
}

function getAwsRegion() {
  return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
}

function getS3PublicUrl(bucket, key) {
  if (UPLOADS_PUBLIC_BASE_URL) {
    return `${UPLOADS_PUBLIC_BASE_URL}/${key}`;
  }

  const region = getAwsRegion();
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function getS3KeyFromStoredUri(uri) {
  if (!shouldUseS3Uploads() || !S3_UPLOAD_BUCKET || typeof uri !== 'string') {
    return '';
  }

  if (UPLOADS_PUBLIC_BASE_URL) {
    const publicPrefix = `${UPLOADS_PUBLIC_BASE_URL}/`;
    if (uri.startsWith(publicPrefix)) {
      return uri.slice(publicPrefix.length);
    }
  }

  try {
    const parsed = new URL(uri);
    if (parsed.hostname.startsWith(`${S3_UPLOAD_BUCKET}.s3.`)) {
      return parsed.pathname.replace(/^\/+/, '');
    }
  } catch {
    return '';
  }

  return '';
}

async function deleteStoredMediaObject(media) {
  const key = getS3KeyFromStoredUri(media?.uri);
  if (!key) return false;

  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: S3_UPLOAD_BUCKET,
      Key: key,
    }),
  );
  return true;
}

async function deleteStoredMediaObjects(mediaItems = []) {
  let deletedCount = 0;
  for (const media of mediaItems) {
    try {
      deletedCount += (await deleteStoredMediaObject(media)) ? 1 : 0;
    } catch (error) {
      console.warn('Media object delete failed:', error.message || error);
    }
  }
  return deletedCount;
}

const DOCUMENT_CONTENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function getSafeDocumentFileName(fileName, contentType) {
  const extByType = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };
  const expectedExt = extByType[contentType];
  const parsed = path.parse(path.basename(String(fileName || 'document')));
  const safeBase = sanitizeFileSegment(parsed.name || 'document');
  return `${safeBase}${expectedExt || ''}`;
}

async function storeUserDocument(user, file) {
  const contentType = String(file.contentType || '').split(';')[0].toLowerCase();
  if (!DOCUMENT_CONTENT_TYPES.has(contentType)) {
    throw new Error('Разрешены PDF, DOC, DOCX, JPG, PNG и WEBP.');
  }
  if (!file.buffer.length) throw new Error('Файл пустой.');
  if (file.buffer.length > MAX_DOCUMENT_UPLOAD_BYTES) {
    throw new Error('Документ больше 15 МБ.');
  }
  const fileName = getSafeDocumentFileName(file.originalFilename, contentType);
  const relativeKey = `documents/${sanitizeFileSegment(user.id)}/${Date.now()}-${crypto
    .randomBytes(5)
    .toString('hex')}-${fileName}`;
  const storageKey = S3_UPLOAD_PREFIX ? `${S3_UPLOAD_PREFIX}/${relativeKey}` : relativeKey;
  if (shouldUseS3Uploads()) {
    if (!S3_UPLOAD_BUCKET) throw new Error('S3_UPLOAD_BUCKET is required');
    await getS3Client().send(new PutObjectCommand({
      Bucket: S3_UPLOAD_BUCKET,
      Key: storageKey,
      Body: file.buffer,
      ContentType: contentType,
      CacheControl: 'private, max-age=0, no-store',
    }));
  } else {
    const filePath = path.join(DATA_DIR, 'documents', relativeKey);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.buffer);
  }
  const document = {
    id: `document_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    fileName,
    contentType,
    size: file.buffer.length,
    storageKey,
    localKey: relativeKey,
    createdAt: new Date().toISOString(),
  };
  user.documents = [document, ...(Array.isArray(user.documents) ? user.documents : [])];
  if (user.role === 'vendor') {
    user.vendorVerification = {
      status: 'На проверке',
      moderatorComment: '',
      updatedAt: new Date().toISOString(),
    };
  }
  return document;
}

async function readStoredDocument(document) {
  if (shouldUseS3Uploads()) {
    const result = await getS3Client().send(new GetObjectCommand({
      Bucket: S3_UPLOAD_BUCKET,
      Key: document.storageKey,
    }));
    return Buffer.from(await result.Body.transformToByteArray());
  }
  return fs.readFileSync(path.join(DATA_DIR, 'documents', document.localKey));
}

async function deleteStoredDocument(document) {
  if (shouldUseS3Uploads()) {
    await getS3Client().send(new DeleteObjectCommand({
      Bucket: S3_UPLOAD_BUCKET,
      Key: document.storageKey,
    }));
    return;
  }
  const filePath = path.join(DATA_DIR, 'documents', document.localKey);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

async function storeUploadBuffer(req, uploadKey, buffer, contentType) {
  if (shouldUseS3Uploads()) {
    if (!S3_UPLOAD_BUCKET) {
      throw new Error('S3_UPLOAD_BUCKET is required when UPLOADS_STORAGE=s3');
    }

    const s3Key = S3_UPLOAD_PREFIX ? `${S3_UPLOAD_PREFIX}/${uploadKey}` : uploadKey;
    const command = new PutObjectCommand({
      Bucket: S3_UPLOAD_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
      CacheControl: 'public, max-age=31536000, immutable',
    });
    await getS3Client().send(command);
    return getS3PublicUrl(S3_UPLOAD_BUCKET, s3Key);
  }

  const filePath = path.join(UPLOADS_DIR, uploadKey);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return `${getPublicOrigin(req)}/uploads/${uploadKey}`;
}

function buildUploadKeyForUser(user, fileName, contentType, type) {
  const mediaType = getUploadMediaType(contentType, fileName, type);
  if (!mediaType) {
    throw new Error('Only image and video uploads are supported');
  }
  const ext = getExtensionFromContentType(contentType, fileName, mediaType);
  const safeName = getSafeUploadFileName(fileName, mediaType, ext);
  const uploadKey = `media/${sanitizeFileSegment(user.id)}/${Date.now()}-${crypto
    .randomBytes(5)
    .toString('hex')}-${safeName}`;
  return {
    mediaType,
    safeName,
    storageKey: S3_UPLOAD_PREFIX ? `${S3_UPLOAD_PREFIX}/${uploadKey}` : uploadKey,
  };
}

function getUserMediaUploadPrefix(user) {
  const uploadPrefix = `media/${sanitizeFileSegment(user.id)}/`;
  return S3_UPLOAD_PREFIX ? `${S3_UPLOAD_PREFIX}/${uploadPrefix}` : uploadPrefix;
}

function buildUploadedMediaRecord(user, fields, uri, type, safeName) {
  const existingMedia = user.uploadedMedia || [];
  const role = ['main', 'cover', 'reels', 'profile', 'story'].includes(fields.role)
    ? fields.role
    : existingMedia.length === 0
      ? 'main'
      : type === 'video'
        ? 'reels'
        : 'profile';
  const sourceUrl = String(fields.sourceUrl || '').trim();
  return {
    id: `upload_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`,
    uri,
    type,
    fileName: safeName,
    caption: validatePublicText(fields.caption, { allowEmpty: true, maxLength: 600 }) || undefined,
    sourceUrl: sourceUrl || undefined,
    selected: fields.selected !== 'false',
    role,
    status: 'uploaded',
  };
}

const USER_MEDIA_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
]);

function normalizeUserMediaContentType(value) {
  const normalized = String(value || '').split(';')[0].trim().toLowerCase();
  if (!USER_MEDIA_CONTENT_TYPES.has(normalized)) {
    throw new Error('Разрешены JPG, PNG, WEBP, MP4 и MOV.');
  }
  return normalized;
}

function sniffMediaContentType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return '';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    return 'image/png';
  }
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    return buffer.subarray(8, 12).toString('ascii') === 'qt  '
      ? 'video/quicktime'
      : 'video/mp4';
  }
  return '';
}

function validateMediaBytes(buffer, declaredContentType) {
  const declared = normalizeUserMediaContentType(declaredContentType);
  const detected = sniffMediaContentType(buffer);
  if (!detected) throw new Error('Файл не является поддерживаемым фото или видео.');
  const declaredKind = declared.startsWith('video/') ? 'video' : 'image';
  const detectedKind = detected.startsWith('video/') ? 'video' : 'image';
  if (declaredKind !== detectedKind) {
    throw new Error('Тип файла не совпадает с его содержимым.');
  }
  return detected;
}

async function getS3ObjectPrefix(key) {
  const response = await getS3Client().send(
    new GetObjectCommand({
      Bucket: S3_UPLOAD_BUCKET,
      Key: key,
      Range: 'bytes=0-511',
    }),
  );
  if (typeof response.Body?.transformToByteArray === 'function') {
    return Buffer.from(await response.Body.transformToByteArray());
  }
  const chunks = [];
  for await (const chunk of response.Body || []) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function getExtensionFromContentType(contentType, fallbackUrl, type) {
  const normalized = String(contentType || '').split(';')[0].toLowerCase();
  const extFromType = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
  }[normalized];
  if (extFromType) return extFromType;

  try {
    const ext = path.extname(new URL(fallbackUrl).pathname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov'].includes(ext)) {
      return ext === '.jpeg' ? '.jpg' : ext;
    }
  } catch {
    // Fall through to media type fallback.
  }

  return type === 'video' ? '.mp4' : '.jpg';
}

function getUploadMediaType(contentType, fileName, explicitType) {
  const normalized = String(contentType || '').split(';')[0].toLowerCase();
  if (explicitType === 'video' || normalized.startsWith('video/')) return 'video';
  if (explicitType === 'image' || normalized.startsWith('image/')) return 'image';

  const ext = path.extname(String(fileName || '')).toLowerCase();
  if (['.mp4', '.mov', '.m4v', '.webm'].includes(ext)) return 'video';
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return 'image';
  return '';
}

function getSafeUploadFileName(fileName, fallback, ext) {
  const parsed = path.parse(String(fileName || fallback || 'media'));
  const base = sanitizeFileSegment(parsed.name || fallback || 'media') || 'media';
  const currentExt = parsed.ext && ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.m4v', '.webm'].includes(parsed.ext.toLowerCase())
    ? parsed.ext.toLowerCase().replace('.jpeg', '.jpg')
    : ext;
  return `${base}${currentExt || ''}`;
}

async function storeUserUploadedMedia({ req, user, file, fields }) {
  const detectedContentType = validateMediaBytes(file.buffer, file.contentType);
  const type = getUploadMediaType(detectedContentType, file.originalFilename, fields.type);
  if (!type) {
    throw new Error('Only image and video uploads are supported');
  }
  if (!file.buffer.length) {
    throw new Error('Upload file is empty');
  }
  if (file.buffer.length > MAX_USER_UPLOAD_BYTES) {
    throw new Error(`Upload too large: ${file.buffer.length} bytes`);
  }

  const { safeName, storageKey } = buildUploadKeyForUser(
    user,
    fields.fileName || file.originalFilename,
    detectedContentType,
    type,
  );
  const uploadKey = S3_UPLOAD_PREFIX
    ? storageKey.slice(`${S3_UPLOAD_PREFIX}/`.length)
    : storageKey;
  const uri = await storeUploadBuffer(req, uploadKey, file.buffer, detectedContentType);
  const existingMedia = user.uploadedMedia || [];
  const media = buildUploadedMediaRecord(user, fields, uri, type, safeName);

  user.uploadedMedia = [...existingMedia, media];
  if (typeof fields.instagramHandle === 'string' && fields.instagramHandle.trim()) {
    user.instagramHandle = fields.instagramHandle.trim();
  }
  return media;
}

async function createUserMediaUploadUrl(user, fields) {
  if (!shouldUseS3Uploads() || !S3_UPLOAD_BUCKET) {
    throw new Error('Direct uploads require S3 storage');
  }

  const fileName = String(fields.fileName || '').trim();
  const contentType = normalizeUserMediaContentType(fields.contentType);
  const { mediaType, safeName, storageKey } = buildUploadKeyForUser(
    user,
    fileName,
    contentType,
    fields.type,
  );
  const size = Number(fields.size || 0);
  if (size && size > MAX_USER_UPLOAD_BYTES) {
    throw new Error(`Upload too large: ${size} bytes`);
  }

  const directUpload = await createPresignedPost(getS3Client(), {
    Bucket: S3_UPLOAD_BUCKET,
    Key: storageKey,
    Conditions: [['content-length-range', 1, MAX_USER_UPLOAD_BYTES]],
    Fields: {
      'Content-Type': contentType,
      success_action_status: '204',
    },
    Expires: 600,
  });
  return {
    uploadMethod: 'POST',
    uploadUrl: directUpload.url,
    uploadFields: directUpload.fields,
    key: storageKey,
    uri: getS3PublicUrl(S3_UPLOAD_BUCKET, storageKey),
    fileName: safeName,
    type: mediaType,
    contentType,
    maxBytes: MAX_USER_UPLOAD_BYTES,
    expiresIn: 600,
  };
}

async function completeUserDirectMediaUpload(user, fields) {
  if (!shouldUseS3Uploads() || !S3_UPLOAD_BUCKET) {
    throw new Error('Direct uploads require S3 storage');
  }

  const key = String(fields.key || '').trim().replace(/^\/+/, '');
  if (!key || !key.startsWith(getUserMediaUploadPrefix(user))) {
    throw new Error('Invalid upload key');
  }

  const head = await getS3Client().send(
    new HeadObjectCommand({
      Bucket: S3_UPLOAD_BUCKET,
      Key: key,
    }),
  );
  const size = Number(head.ContentLength || 0);
  if (!size) {
    throw new Error('Upload file is empty');
  }
  if (size > MAX_USER_UPLOAD_BYTES) {
    throw new Error(`Upload too large: ${size} bytes`);
  }

  const contentType = normalizeUserMediaContentType(
    head.ContentType || fields.contentType,
  );
  let detectedContentType;
  try {
    detectedContentType = validateMediaBytes(await getS3ObjectPrefix(key), contentType);
  } catch (error) {
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: S3_UPLOAD_BUCKET, Key: key }),
    ).catch(() => undefined);
    throw error;
  }
  const type = getUploadMediaType(detectedContentType, fields.fileName, fields.type);
  if (!type) {
    throw new Error('Only image and video uploads are supported');
  }

  const safeName = getSafeUploadFileName(
    fields.fileName,
    type,
    getExtensionFromContentType(detectedContentType, fields.fileName, type),
  );
  const media = buildUploadedMediaRecord(
    user,
    fields,
    getS3PublicUrl(S3_UPLOAD_BUCKET, key),
    type,
    safeName,
  );
  user.uploadedMedia = [...(user.uploadedMedia || []), media];
  if (typeof fields.instagramHandle === 'string' && fields.instagramHandle.trim()) {
    user.instagramHandle = fields.instagramHandle.trim();
  }
  return media;
}

async function downloadInstagramMediaAsset(req, userId, item, index) {
  const type = item.type === 'video' ? 'video' : 'image';
  const sourceUrl = item.mediaUrl || item.thumbnailUrl;
  if (!sourceUrl) {
    throw new Error('Instagram media_url missing');
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Instagram media download ${response.status}`);
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_INSTAGRAM_DOWNLOAD_BYTES) {
    throw new Error(`Instagram media too large: ${contentLength} bytes`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_INSTAGRAM_DOWNLOAD_BYTES) {
    throw new Error(`Instagram media too large: ${arrayBuffer.byteLength} bytes`);
  }

  const contentType = response.headers.get('content-type') || '';
  const ext = getExtensionFromContentType(
    contentType,
    sourceUrl,
    type,
  );
  const providerId = sanitizeFileSegment(item.providerMediaId || item.id || index);
  const fileName = `${Date.now()}-${index}-${providerId}${ext}`;
  const uploadKey = `instagram/${sanitizeFileSegment(userId)}/${fileName}`;
  const buffer = Buffer.from(arrayBuffer);
  const uri = await storeUploadBuffer(req, uploadKey, buffer, contentType);

  return {
    uri,
    fileName,
    size: arrayBuffer.byteLength,
  };
}

function createUploadedMediaFromInstagram(item, index, currentMediaCount, asset = null) {
  const type = item.type === 'video' ? 'video' : 'image';
  return {
    id: `instagram_${Date.now()}_${index}`,
    uri: asset?.uri || item.thumbnailUrl || item.mediaUrl || item.sourceUrl,
    type,
    fileName: asset?.fileName || `${type}-${item.providerMediaId || item.id}`,
    caption: item.caption || item.title,
    imageKey: item.imageKey,
    sourceUrl: item.permalink || item.sourceUrl,
    selected: true,
    role:
      currentMediaCount === 0 && index === 0
        ? 'main'
        : type === 'video'
          ? 'reels'
          : 'profile',
    status: asset?.uri || item.mediaUrl ? 'uploaded' : 'ready',
  };
}

function createInstagramImportPayload({ user, connection, itemIds = [] }) {
  if (!connection || !isInstagramOAuthConnection(connection)) {
    throw new Error('Instagram OAuth connection required');
  }

  const cachedMedia = connection.cachedMedia || [];
  if (!cachedMedia.length) {
    throw new Error('Refresh Instagram media before import');
  }

  const requestedIds = Array.isArray(itemIds) ? itemIds.map((item) => String(item)) : [];
  const selectedItems = cachedMedia.filter(
    (item) =>
      requestedIds.includes(String(item.id)) ||
      requestedIds.includes(String(item.providerMediaId)),
  );

  return {
    user,
    connection,
    itemsToImport: selectedItems.length ? selectedItems : cachedMedia,
  };
}

async function importInstagramMediaForUser({ req, db, user, connection, itemIds, onProgress }) {
  const { itemsToImport } = createInstagramImportPayload({ user, connection, itemIds });
  const existingMedia = user.uploadedMedia || [];
  const newMedia = [];
  const importedMedia = [];
  const downloadErrors = [];
  let skippedCount = 0;

  for (const [index, item] of itemsToImport.entries()) {
    const sourceKey = item.permalink || item.sourceUrl || item.mediaUrl || item.thumbnailUrl;
    const existingIndex = existingMedia.findIndex(
      (media) => media.sourceUrl === sourceKey || media.uri === sourceKey,
    );
    if (existingIndex >= 0 && isLocalUploadUri(existingMedia[existingIndex].uri)) {
      skippedCount += 1;
      await onProgress?.({
        processedCount: index + 1,
        downloadedCount: importedMedia.length,
        skippedCount,
        failedCount: downloadErrors.length,
      });
      continue;
    }

    try {
      const asset = await downloadInstagramMediaAsset(req, user.id, item, index);
      const uploadedItem = createUploadedMediaFromInstagram(
        item,
        index,
        existingMedia.length + newMedia.length,
        asset,
      );
      if (existingIndex >= 0) {
        const previousItem = existingMedia[existingIndex];
        const upgradedItem = {
          ...previousItem,
          ...uploadedItem,
          id: previousItem.id || uploadedItem.id,
          role: previousItem.role || uploadedItem.role,
          selected: previousItem.selected !== false,
        };
        existingMedia[existingIndex] = upgradedItem;
        importedMedia.push(upgradedItem);
      } else {
        newMedia.push(uploadedItem);
        importedMedia.push(uploadedItem);
      }
    } catch (error) {
      downloadErrors.push({
        id: item.id,
        permalink: item.permalink || item.sourceUrl || '',
        message: error.message || String(error),
      });
    }

    await onProgress?.({
      processedCount: index + 1,
      downloadedCount: importedMedia.length,
      skippedCount,
      failedCount: downloadErrors.length,
    });
  }

  user.uploadedMedia = [...existingMedia, ...newMedia];
  user.selectedImportIds = itemsToImport.map((item) => String(item.id));
  const importedHandle = normalizeInstagramHandle(connection?.username || user.instagramHandle);
  if (importedHandle) {
    user.instagramHandle = `@${importedHandle}`;
  }
  syncVendorMediaFromUser(db, user);
  await writeDb(db);

  return {
    user: publicUser(user, db),
    importedMedia,
    importedCount: importedMedia.length,
    downloadedCount: importedMedia.length,
    skippedCount,
    failedCount: downloadErrors.length,
    errors: downloadErrors,
    totalCount: itemsToImport.length,
  };
}

function ensureReviewUsers(db) {
  const testAuthPassword = process.env.TEST_AUTH_PASSWORD || '';
  const reviewUsers = parseTestAuthUsers();
  if (!testAuthPassword || reviewUsers.length === 0) {
    return;
  }

  for (const [email, role] of reviewUsers) {
    const existingUser = db.users.find((item) => item.email === email);
    if (existingUser) {
      if (!existingUser.passwordHash) {
        existingUser.passwordHash = hashPassword(testAuthPassword);
      }
      existingUser.emailVerified = true;
      existingUser.profileCreated = true;
      continue;
    }

    const user = createBaseUser(email, role, hashPassword(testAuthPassword));
    user.profileCreated = true;
    db.users.push(user);
  }
}

function shouldSeedReviewUsers() {
  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_TEST_AUTH === '1';
}

function parseTestAuthUsers() {
  return String(process.env.TEST_AUTH_USERS || '')
    .split(',')
    .map((entry) => {
      const [email, role = 'client'] = entry.split(':').map((part) => part.trim());
      if (!email || !email.includes('@')) return null;
      return [email.toLowerCase(), role === 'vendor' ? 'vendor' : 'client'];
    })
    .filter(Boolean);
}

async function handleApi(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const isAuthWrite =
    req.method === 'POST' &&
    /^\/api\/(?:auth\/(?:login|oauth\/google|oauth\/apple|apple\/notifications|start-registration|verify-registration|password-reset\/start|password-reset\/confirm)|review\/login)$/.test(
      url.pathname,
    );
  if (
    isAuthWrite &&
    !enforceRateLimit(req, res, 'auth', AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS)
  ) {
    return;
  }
  const isUgcWrite =
    req.method === 'POST' &&
    /(?:\/content-reports|\/media-comments|\/review\/comments)$/.test(url.pathname);
  if (
    isUgcWrite &&
    !enforceRateLimit(req, res, 'ugc', UGC_RATE_LIMIT_MAX, UGC_RATE_LIMIT_WINDOW_MS)
  ) {
    return;
  }
  const isUploadWrite =
    req.method === 'POST' &&
    /^\/api\/users\/[^/]+\/(?:media\/uploads(?:\/presign|\/complete)?|documents)$/.test(
      url.pathname,
    );
  if (
    isUploadWrite &&
    !enforceRateLimit(
      req,
      res,
      'upload',
      UPLOAD_RATE_LIMIT_MAX,
      UPLOAD_RATE_LIMIT_WINDOW_MS,
    )
  ) {
    return;
  }
  const isBookingWrite =
    (req.method === 'POST' || req.method === 'PATCH') &&
    /^\/api\/users\/[^/]+\/(?:bookings|vendor-requests)(?:\/[^/]+)?$/.test(url.pathname);
  if (
    isBookingWrite &&
    !enforceRateLimit(
      req,
      res,
      'booking',
      BOOKING_RATE_LIMIT_MAX,
      BOOKING_RATE_LIMIT_WINDOW_MS,
    )
  ) {
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/client-errors') {
    if (
      !enforceRateLimit(
        req,
        res,
        'client-error',
        CLIENT_ERROR_RATE_LIMIT_MAX,
        CLIENT_ERROR_RATE_LIMIT_WINDOW_MS,
      )
    ) {
      return;
    }
    const payload = normalizeClientErrorPayload(await readBody(req));
    console.error('CLIENT_ERROR', JSON.stringify(payload));
    sendJson(res, 202, { ok: true });
    return;
  }
  const db = await readDb();

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      dbStorage: shouldUsePostgresDb() ? 'postgres' : 'file',
      uploadsStorage: shouldUseS3Uploads() ? 's3' : 'local',
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/review/login') {
    const body = await readBody(req);
    const reviewer = getReviewerName(body.username);
    if (!reviewer) {
      sendJson(res, 401, { error: 'Логин не найден' });
      return;
    }
    const token = createSessionToken();
    const now = new Date().toISOString();
    const recentSessions = Object.entries(db.reviewSessions || {})
      .filter(([, session]) => (
        Date.now() - new Date(session?.createdAt || 0).getTime() < 180 * 86400000
      ))
      .slice(-99);
    db.reviewSessions = Object.fromEntries(recentSessions);
    db.reviewSessions[token] = { reviewer, createdAt: now };
    await writeDb(db);
    sendJson(res, 201, { reviewer, token });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/review/session') {
    const session = requireReviewSession(req, res, db);
    if (!session) return;
    sendJson(res, 200, { reviewer: session.reviewer });
    return;
  }

  if (req.method === 'DELETE' && url.pathname === '/api/review/session') {
    const token = getBearerToken(req);
    if (token && db.reviewSessions[token]) {
      delete db.reviewSessions[token];
      await writeDb(db);
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/review/comments') {
    const session = requireReviewSession(req, res, db);
    if (!session) return;
    const screenId = String(url.searchParams.get('screenId') || '').trim().slice(0, 180);
    if (!screenId) {
      sendJson(res, 400, { error: 'screenId is required' });
      return;
    }
    const comments = Array.isArray(db.reviewComments[screenId])
      ? db.reviewComments[screenId]
      : [];
    sendJson(res, 200, { comments });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/review/comments') {
    const session = requireReviewSession(req, res, db);
    if (!session) return;
    const body = await readBody(req);
    const screenId = String(body.screenId || '').trim().slice(0, 180);
    const text = String(body.text || '').trim().slice(0, 1000);
    if (!screenId) {
      sendJson(res, 400, { error: 'screenId is required' });
      return;
    }
    if (!text) {
      sendJson(res, 400, { error: 'Введите комментарий' });
      return;
    }
    const comment = {
      id: `review_comment_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      screenId,
      author: session.reviewer,
      text,
      createdAt: new Date().toISOString(),
    };
    const currentComments = Array.isArray(db.reviewComments[screenId])
      ? db.reviewComments[screenId]
      : [];
    db.reviewComments[screenId] = [comment, ...currentComments].slice(0, 200);
    await writeDb(db);
    sendJson(res, 201, { comment, comments: db.reviewComments[screenId] });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/instagram/diagnostics') {
    const config = getInstagramConfig(req);
    const facebookConfig = getFacebookConfig(req);
    const origin = getPublicOrigin(req);
    sendJson(res, 200, {
      ok: true,
      instagram: {
        clientIdConfigured: Boolean(config.clientId),
        clientSecretConfigured: Boolean(config.clientSecret),
        redirectUri: config.redirectUri,
        scope: config.scope,
        graphVersion: config.graphVersion,
        callbackUrl: `${origin}/api/instagram/callback`,
        deauthorizeUrl: `${origin}/api/instagram/deauthorize`,
        dataDeletionUrl: `${origin}/api/meta/data-deletion`,
        webhookUrl: `${origin}/api/instagram/webhook`,
        webhookVerifyTokenConfigured: Boolean(process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN),
        tokenEncryptionConfigured: Boolean(process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY),
      },
      facebook: {
        clientIdConfigured: Boolean(facebookConfig.clientId),
        clientSecretConfigured: Boolean(facebookConfig.clientSecret),
        collabLoginAvailable: facebookConfig.enabled,
        redirectUri: facebookConfig.redirectUri,
        scope: facebookConfig.scope,
        graphVersion: facebookConfig.graphVersion,
        callbackUrl: `${origin}/api/instagram/facebook-callback`,
      },
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/instagram/webhook') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (
      mode === 'subscribe' &&
      token &&
      token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN
    ) {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(challenge || '');
      return;
    }

    sendJson(res, 403, { error: 'Instagram webhook verification failed' });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/instagram/webhook') {
    const body = await readBody(req);
    db.metaCallbacks.unshift({
      id: `ig_webhook_${Date.now()}`,
      type: 'instagram_webhook',
      body,
      createdAt: new Date().toISOString(),
    });
    await writeDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/instagram/callback') {
    const code = String(url.searchParams.get('code') || '');
    const state = String(url.searchParams.get('state') || '');
    const stateRecord = db.instagramOAuthStates?.[state];

    if (!code || !stateRecord) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>Instagram не подключен</h1><p>Нет кода или сессия устарела.</p>');
      return;
    }

    try {
      const token = await exchangeInstagramCode({ code, req });
      const profile = await fetchInstagramProfile(token.accessToken);
      const user = db.users.find((item) => item.id === stateRecord.userId);

      if (!user) {
        sendJson(res, 404, { error: 'User not found' });
        return;
      }

      let cachedMedia = [];
      let mediaNotices = [];
      let mediaFetchError = null;
      try {
        const mediaResult = await fetchInstagramMedia(
          token.accessToken,
          profile.username || stateRecord.handle,
        );
        cachedMedia = mediaResult.items;
        mediaNotices = mediaResult.notices;
      } catch (mediaError) {
        mediaFetchError = String(mediaError.message || mediaError);
      }

      const instagramConnection = {
        mode: 'oauth',
        expiresIn: token.expiresIn,
        expiresAt: getInstagramTokenExpiresAt(token.expiresIn),
        instagramUserId: String(profile.id || token.instagramUserId || ''),
        instagramBusinessUserId: String(profile.user_id || ''),
        username: profile.username || stateRecord.handle || 'instagram',
        accountType: profile.account_type || 'UNKNOWN',
        profilePictureUrl: profile.profile_picture_url || '',
        mediaCount: cachedMedia.length || profile.media_count || 0,
        connectedAt: new Date().toISOString(),
        lastSyncedAt: cachedMedia.length ? new Date().toISOString() : null,
        lastError: mediaFetchError,
        mediaNotices,
        cachedMedia,
      };
      setInstagramAccessToken(instagramConnection, token.accessToken);
      db.instagramConnections[user.id] = instagramConnection;
      user.instagramHandle = `@${db.instagramConnections[user.id].username}`;
      delete db.instagramOAuthStates[state];
      await writeDb(db);

      const appUrl = new URL(stateRecord.returnUrl || '/', getPublicOrigin(req));
      appUrl.searchParams.set('settings', 'instagram');
      appUrl.searchParams.set('instagram', 'select');

      res.writeHead(302, { Location: appUrl.toString() });
      res.end();
    } catch (error) {
      await redirectInstagramOAuthError({ req, res, db, state, stateRecord, error });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/instagram/facebook-callback') {
    const code = String(url.searchParams.get('code') || '');
    const state = String(url.searchParams.get('state') || '');
    const stateRecord = db.instagramOAuthStates?.[state];

    if (!code || !stateRecord || stateRecord.provider !== 'facebook') {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>Facebook не подключен</h1><p>Нет кода или сессия устарела.</p>');
      return;
    }

    try {
      const token = await exchangeFacebookCode({ code, req });
      const accounts = await fetchFacebookInstagramAccounts(token.accessToken);
      const pickedAccount = pickFacebookInstagramAccount(accounts, stateRecord.handle);
      const user = db.users.find((item) => item.id === stateRecord.userId);

      if (!user) {
        sendJson(res, 404, { error: 'User not found' });
        return;
      }

      if (!pickedAccount) {
        const accountsSummary = describeFacebookInstagramAccounts(accounts);
        throw new Error(
          `Facebook не вернул Instagram Professional account. Свяжите Instagram с Facebook Page и повторите вход. Найдено: ${accountsSummary}`,
        );
      }

      const profile = pickedAccount.instagramAccount;
      const instagramConnection = {
        ...(db.instagramConnections[user.id] || {}),
        mode: 'facebook_oauth',
        expiresIn: token.expiresIn,
        expiresAt: getInstagramTokenExpiresAt(token.expiresIn),
        instagramUserId: String(profile.id || ''),
        instagramBusinessUserId: String(profile.id || ''),
        username: profile.username || stateRecord.handle || 'instagram',
        accountType: profile.account_type || 'UNKNOWN',
        profilePictureUrl: profile.profile_picture_url || '',
        facebookPageId: pickedAccount.pageId,
        facebookPageName: pickedAccount.pageName,
        mediaCount: Number(profile.media_count || 0),
        connectedAt: new Date().toISOString(),
        lastSyncedAt: null,
        lastError: null,
        mediaNotices: [],
        cachedMedia: [],
      };
      setInstagramAccessToken(
        instagramConnection,
        pickedAccount.pageAccessToken || token.accessToken,
      );

      try {
        const mediaResult = await fetchFacebookInstagramMedia(
          instagramConnection,
          profile.username || stateRecord.handle,
        );
        instagramConnection.cachedMedia = mediaResult.items;
        instagramConnection.mediaCount = mediaResult.items.length || instagramConnection.mediaCount;
        instagramConnection.mediaNotices = mediaResult.notices;
        instagramConnection.lastSyncedAt = new Date().toISOString();
      } catch (mediaError) {
        instagramConnection.lastError = String(mediaError.message || mediaError);
      }

      db.instagramConnections[user.id] = instagramConnection;
      user.instagramHandle = `@${instagramConnection.username}`;
      delete db.instagramOAuthStates[state];
      await writeDb(db);

      const appUrl = new URL(stateRecord.returnUrl || '/', getPublicOrigin(req));
      appUrl.searchParams.set('settings', 'instagram');
      appUrl.searchParams.set('instagram', 'select');

      res.writeHead(302, { Location: appUrl.toString() });
      res.end();
    } catch (error) {
      await redirectInstagramOAuthError({ req, res, db, state, stateRecord, error });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/bootstrap') {
    sendJson(res, 200, {
      categories: db.categories,
      vendors: publicVendors(db),
      vendorSettings: db.vendorSettings,
      instagramMedia: db.instagramMedia,
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/vendors') {
    sendJson(res, 200, { vendors: publicVendors(db) });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/legal') {
    const origin = getPublicOrigin(req);
    sendJson(res, 200, {
      privacyPolicyUrl: `${origin}/privacy-policy`,
      termsUrl: `${origin}/terms`,
      supportUrl: `${origin}/support`,
      accountDeletionUrl: `${origin}/account-deletion`,
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/account-deletion-requests') {
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      sendJson(res, 400, { error: 'Valid email required' });
      return;
    }
    const request = {
      id: `delete_request_${Date.now()}`,
      email,
      reason: String(body.reason || '').trim(),
      status: 'received',
      createdAt: new Date().toISOString(),
    };
    db.accountDeletionRequests.unshift(request);
    await writeDb(db);
    sendJson(res, 200, { ok: true, request });
    return;
  }

  if (url.pathname === '/api/meta/data-deletion') {
    const body = req.method === 'POST' ? await readBody(req) : {};
    const payload = parseMetaSignedRequest(body.signed_request);
    const removedUserId = removeInstagramConnectionByMetaUser(db, payload?.user_id);
    const request = {
      id: `meta_delete_${Date.now()}`,
      signedRequest: body.signed_request ? 'received' : 'missing',
      verified: Boolean(payload),
      removedUserId,
      status: 'received',
      createdAt: new Date().toISOString(),
    };
    db.accountDeletionRequests.unshift(request);
    await writeDb(db);
    sendJson(res, 200, {
      url: `${getPublicOrigin(req)}/account-deletion`,
      confirmation_code: request.id,
    });
    return;
  }

  if (url.pathname === '/api/instagram/deauthorize') {
    const body = req.method === 'POST' ? await readBody(req) : {};
    const payload = parseMetaSignedRequest(body.signed_request);
    const removedUserId = removeInstagramConnectionByMetaUser(db, payload?.user_id);
    db.metaCallbacks.unshift({
      id: `ig_deauth_${Date.now()}`,
      type: 'instagram_deauthorize',
      received: Boolean(body.signed_request),
      verified: Boolean(payload),
      removedUserId,
      createdAt: new Date().toISOString(),
    });
    await writeDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  const userInstagramConnectMatch = url.pathname.match(
    /^\/api\/users\/([^/]+)\/instagram\/connect$/,
  );
  if (userInstagramConnectMatch && req.method === 'POST') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userInstagramConnectMatch[1]);
    if (!user) return;

    const handle = normalizeInstagramHandle(body.handle || user.instagramHandle);
    const config = getInstagramConfig(req);
    if (!config.enabled) {
      sendJson(res, 503, {
        error: 'Instagram OAuth is not configured',
        message: 'Set INSTAGRAM_CLIENT_ID, INSTAGRAM_CLIENT_SECRET, and INSTAGRAM_REDIRECT_URI.',
      });
      return;
    }

    const state = `ig_${Date.now()}_${crypto.randomBytes(12).toString('hex')}`;
    db.instagramOAuthStates[state] = {
      userId: user.id,
      handle,
      returnUrl: getAppReturnUrl(req, body.returnUrl),
      createdAt: new Date().toISOString(),
    };
    await writeDb(db);
    sendJson(res, 200, {
      mode: 'oauth',
      authUrl: createInstagramAuthUrl({ req, state }),
      message: 'Откройте Instagram Login и подтвердите доступ.',
    });
    return;
  }

  const userInstagramFacebookConnectMatch = url.pathname.match(
    /^\/api\/users\/([^/]+)\/instagram\/facebook-connect$/,
  );
  if (userInstagramFacebookConnectMatch && req.method === 'POST') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userInstagramFacebookConnectMatch[1]);
    if (!user) return;

    const handle = normalizeInstagramHandle(body.handle || user.instagramHandle);
    const config = getFacebookConfig(req);
    if (!config.enabled) {
      sendJson(res, 503, {
        error: 'Facebook Login is not configured',
        message:
          'Set FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET, then add FACEBOOK_REDIRECT_URI to Facebook Login valid OAuth redirect URIs.',
      });
      return;
    }

    const state = `fbig_${Date.now()}_${crypto.randomBytes(12).toString('hex')}`;
    db.instagramOAuthStates[state] = {
      provider: 'facebook',
      userId: user.id,
      handle,
      returnUrl: getAppReturnUrl(req, body.returnUrl),
      createdAt: new Date().toISOString(),
    };
    await writeDb(db);
    sendJson(res, 200, {
      mode: 'facebook_oauth',
      authUrl: createFacebookInstagramAuthUrl({ req, state }),
      message: 'Откройте Facebook Login и подтвердите доступ к Page + Instagram.',
    });
    return;
  }

  const userInstagramStatusMatch = url.pathname.match(
    /^\/api\/users\/([^/]+)\/instagram\/status$/,
  );
  if (userInstagramStatusMatch && req.method === 'GET') {
    const user = requireUser(req, res, db, userInstagramStatusMatch[1]);
    if (!user) return;

    const connection = db.instagramConnections[user.id] || null;
    const oauthConnection = isInstagramOAuthConnection(connection) ? connection : null;
    sendJson(res, 200, {
      connected: Boolean(oauthConnection),
      profile: oauthConnection
        ? {
            username: oauthConnection.username || normalizeInstagramHandle(user.instagramHandle),
            accountType: oauthConnection.accountType || 'BUSINESS',
            profilePictureUrl: oauthConnection.profilePictureUrl || '',
            mediaCount: oauthConnection.mediaCount || 0,
            mode: oauthConnection.mode,
            connectedAt: oauthConnection.connectedAt || null,
            lastSyncedAt: oauthConnection.lastSyncedAt || null,
            expiresAt: oauthConnection.expiresAt || null,
            lastError: oauthConnection.lastError || null,
          }
        : null,
    });
    return;
  }

  const userInstagramRefreshMatch = url.pathname.match(
    /^\/api\/users\/([^/]+)\/instagram\/refresh-token$/,
  );
  if (userInstagramRefreshMatch && req.method === 'POST') {
    const user = requireUser(req, res, db, userInstagramRefreshMatch[1]);
    if (!user) return;

    const connection = db.instagramConnections[user.id];
    if (!getInstagramAccessToken(connection) || !isInstagramOAuthConnection(connection)) {
      sendJson(res, 400, { error: 'Instagram OAuth connection required' });
      return;
    }

    try {
      if (connection.mode === 'oauth') {
        await refreshInstagramAccessToken(connection);
      }
      connection.lastError = null;
      await writeDb(db);
      sendJson(res, 200, {
        ok: true,
        profile: {
          username: connection.username,
          accountType: connection.accountType,
          profilePictureUrl: connection.profilePictureUrl || '',
          mediaCount: connection.mediaCount || 0,
          mode: connection.mode,
          connectedAt: connection.connectedAt || null,
          lastSyncedAt: connection.lastSyncedAt || null,
          expiresAt: connection.expiresAt || null,
        },
      });
    } catch (error) {
      connection.lastError = String(error.message || error);
      await writeDb(db);
      sendJson(res, 502, { error: connection.lastError });
    }
    return;
  }

  const userInstagramDisconnectMatch = url.pathname.match(
    /^\/api\/users\/([^/]+)\/instagram\/disconnect$/,
  );
  if (userInstagramDisconnectMatch && req.method === 'POST') {
    const user = requireUser(req, res, db, userInstagramDisconnectMatch[1]);
    if (!user) return;

    delete db.instagramConnections[user.id];
    user.instagramHandle = '';
    user.selectedImportIds = [];
    await writeDb(db);
    sendJson(res, 200, { ok: true, user: publicUser(user, db) });
    return;
  }

  const userInstagramMediaMatch = url.pathname.match(
    /^\/api\/users\/([^/]+)\/instagram\/media$/,
  );
  if (userInstagramMediaMatch && (req.method === 'GET' || req.method === 'POST')) {
    const body = req.method === 'POST' ? await readBody(req) : {};
    const user = requireUser(req, res, db, userInstagramMediaMatch[1]);
    if (!user) return;

    const handle = normalizeInstagramHandle(body.handle || user.instagramHandle);
    const connection = db.instagramConnections[user.id];
    if (!connection || !isInstagramOAuthConnection(connection) || !getInstagramAccessToken(connection)) {
      sendJson(res, 400, { error: 'Instagram OAuth connection required' });
      return;
    }

    let items = connection.cachedMedia || [];
    let mediaNotices = connection.mediaNotices || [];
    let status = connection.mode;
    try {
      if (connection.mode === 'oauth' && shouldRefreshInstagramToken(connection)) {
        await refreshInstagramAccessToken(connection);
      }
      const mediaResult = await fetchConnectedInstagramMedia(connection, connection.username || handle);
      items = mediaResult.items;
      mediaNotices = mediaResult.notices;
      connection.cachedMedia = items;
      connection.mediaCount = items.length;
      connection.lastSyncedAt = new Date().toISOString();
      connection.lastError = null;
      connection.mediaNotices = mediaNotices;
    } catch (error) {
      connection.lastError = String(error.message || error);
      await writeDb(db);
      sendJson(
        res,
        502,
        getPublicErrorPayload(error, 'Instagram media fetch failed'),
      );
      return;
    }

    await writeDb(db);
    sendJson(res, 200, {
      status,
      profile: {
        username: connection.username || handle,
        accountType: connection.accountType || 'BUSINESS',
        profilePictureUrl: connection.profilePictureUrl || '',
        mediaCount: connection.mediaCount || items.length,
        mode: connection.mode,
      },
      items,
      notices: mediaNotices,
    });
    return;
  }

  const userInstagramImportJobMatch = url.pathname.match(
    /^\/api\/users\/([^/]+)\/instagram\/import-jobs$/,
  );
  if (userInstagramImportJobMatch && req.method === 'POST') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userInstagramImportJobMatch[1]);
    if (!user) return;

    const connection = db.instagramConnections[user.id];
    const itemIds = Array.isArray(body.itemIds) ? body.itemIds.map((item) => String(item)) : [];
    let itemsToImport;
    try {
      ({ itemsToImport } = createInstagramImportPayload({ user, connection, itemIds }));
    } catch (error) {
      sendJson(res, 400, { error: error.message || String(error) });
      return;
    }

    const jobId = `ig_import_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const job = {
      id: jobId,
      userId: user.id,
      status: 'queued',
      totalCount: itemsToImport.length,
      processedCount: 0,
      downloadedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.instagramImportJobs[jobId] = job;
    await writeDb(db);
    sendJson(res, 202, { job });

    setTimeout(async () => {
      job.status = 'running';
      job.startedAt = new Date().toISOString();
      job.updatedAt = job.startedAt;
      await writeDb(db);
      try {
        const result = await importInstagramMediaForUser({
          req,
          db,
          user,
          connection,
          itemIds,
          onProgress: async (progress) => {
            Object.assign(job, progress, { updatedAt: new Date().toISOString() });
            await writeDb(db);
          },
        });
        Object.assign(job, {
          status: 'complete',
          processedCount: result.totalCount,
          downloadedCount: result.downloadedCount,
          skippedCount: result.skippedCount,
          failedCount: result.failedCount,
          errors: result.errors,
          user: result.user,
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        Object.assign(job, {
          status: 'failed',
          error: error.message || String(error),
          updatedAt: new Date().toISOString(),
        });
      }
      await writeDb(db);
    }, 0);

    return;
  }

  const userInstagramImportJobStatusMatch = url.pathname.match(
    /^\/api\/users\/([^/]+)\/instagram\/import-jobs\/([^/]+)$/,
  );
  if (userInstagramImportJobStatusMatch && req.method === 'GET') {
    const user = requireUser(req, res, db, userInstagramImportJobStatusMatch[1]);
    if (!user) return;

    const job = db.instagramImportJobs?.[userInstagramImportJobStatusMatch[2]];
    if (!job || job.userId !== user.id) {
      sendJson(res, 404, { error: 'Instagram import job not found' });
      return;
    }

    sendJson(res, 200, { job });
    return;
  }

  const userInstagramImportMatch = url.pathname.match(
    /^\/api\/users\/([^/]+)\/instagram\/import$/,
  );
  if (userInstagramImportMatch && req.method === 'POST') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userInstagramImportMatch[1]);
    if (!user) return;

    const connection = db.instagramConnections[user.id];
    try {
      const result = await importInstagramMediaForUser({
        req,
        db,
        user,
        connection,
        itemIds: Array.isArray(body.itemIds) ? body.itemIds.map((item) => String(item)) : [],
      });
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 400, { error: error.message || String(error) });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/instagram/import-preview') {
    sendJson(res, 410, {
      error: 'Instagram link preview is disabled',
      message: 'Use official Instagram OAuth and /users/:id/instagram/media for real media import.',
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/register') {
    if (process.env.ALLOW_TEST_AUTH !== '1') {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const role = body.role === 'vendor' ? 'vendor' : 'client';

    if (!email) {
      sendJson(res, 400, { error: 'Email required' });
      return;
    }

    let user = db.users.find((item) => item.email === email);
    if (!user) {
      user = {
        id: `user_${Date.now()}`,
        email,
        role,
        profileCreated: false,
        vendorDraft: createDefaultVendorDraft(),
        vendorSettingsValues: {},
        clientProfile: createDefaultClientProfile(email),
        clientSettingsValues: {},
        selectedImportIds: [],
        instagramHandle: '',
        eventDraft: createDefaultEventDraft(),
        eventHistory: [],
        bookings: [],
        blockedVendorIds: [],
        likedVendorIds: [],
        likedMediaIds: [],
        savedMediaIds: [],
        savedVendorIds: [],
        uploadedMedia: [],
        pushTokens: [],
      };
      db.users.push(user);
    } else {
      user.role = role;
    }
    issueSession(user);

    await writeDb(db);
    sendJson(res, 200, { user: publicUser(user, db) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/start-registration') {
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const role = body.role === 'vendor' ? 'vendor' : 'client';

    if (!email || !email.includes('@')) {
      sendJson(res, 400, { error: 'Email required' });
      return;
    }
    if (password.length < 6) {
      sendJson(res, 400, { error: 'Password too short' });
      return;
    }

    const existingUser = db.users.find((item) => item.email === email);
    if (existingUser?.passwordHash) {
      sendJson(res, 409, { error: 'User already exists' });
      return;
    }

    const existingVerification = db.emailVerifications[email];
    const existingCreatedAt = existingVerification?.createdAt
      ? Date.parse(existingVerification.createdAt)
      : 0;
    if (
      existingVerification &&
      existingVerification.expiresAt > Date.now() &&
      existingCreatedAt &&
      Date.now() - existingCreatedAt < EMAIL_VERIFICATION_RESEND_COOLDOWN_MS
    ) {
      sendJson(res, 200, {
        ok: true,
        emailSent: Boolean(existingVerification.emailSent),
        reused: true,
        message: 'Verification code already sent',
        verificationCode:
          isTestAuthAllowed() ? existingVerification.code : undefined,
      });
      return;
    }

    const code = createVerificationCode();
    db.emailVerifications[email] = {
      attempts: 0,
      code,
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 10 * 60 * 1000,
      passwordHash: hashPassword(password),
      role,
    };
    let emailResult = { sent: false, reason: 'missing_sendgrid_config' };
    try {
      emailResult = await sendVerificationEmail({ code, email });
    } catch (error) {
      sendJson(res, 502, getPublicErrorPayload(error, 'Email delivery failed'));
      return;
    }
    db.emailVerifications[email].emailSent = Boolean(emailResult.sent);
    if (!emailResult.sent && !isTestAuthAllowed()) {
      sendJson(res, 503, {
        error: 'Email delivery is not configured',
        emailSent: false,
        message: 'Verification email was not sent',
      });
      return;
    }
    await writeDb(db);

    sendJson(res, 200, {
      ok: true,
      emailSent: emailResult.sent,
      message: emailResult.sent
        ? 'Verification code sent'
        : 'Verification code generated in test mode',
      verificationCode:
        !emailResult.sent && isTestAuthAllowed() ? code : undefined,
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/verify-registration') {
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').trim();
    const verification = db.emailVerifications[email];

    if (!verification || verification.expiresAt < Date.now()) {
      sendJson(res, 400, { error: 'Code expired' });
      return;
    }
    if (verification.code !== code) {
      verification.attempts = Number(verification.attempts || 0) + 1;
      if (verification.attempts >= 5) {
        delete db.emailVerifications[email];
      }
      await writeDb(db);
      sendJson(res, verification.attempts >= 5 ? 429 : 400, {
        error: verification.attempts >= 5 ? 'Too many attempts' : 'Invalid code',
      });
      return;
    }

    let user = db.users.find((item) => item.email === email);
    if (!user) {
      user = createBaseUser(email, verification.role, verification.passwordHash);
      db.users.push(user);
    } else {
      user.role = verification.role;
      user.passwordHash = verification.passwordHash;
      user.emailVerified = true;
    }
    issueSession(user);
    delete db.emailVerifications[email];
    await writeDb(db);
    sendJson(res, 200, { user: publicUser(user, db) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/password-reset/start') {
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      sendJson(res, 400, { error: 'Email required' });
      return;
    }

    const user = db.users.find((item) => item.email === email);
    if (user?.passwordHash) {
      const existingReset = db.passwordResetRequests[email];
      const existingCreatedAt = Date.parse(existingReset?.createdAt || '');
      if (
        existingReset &&
        existingReset.expiresAt > Date.now() &&
        existingCreatedAt &&
        Date.now() - existingCreatedAt < EMAIL_VERIFICATION_RESEND_COOLDOWN_MS
      ) {
        sendJson(res, 200, { ok: true, emailSent: Boolean(existingReset.emailSent), reused: true });
        return;
      }
      const code = createVerificationCode();
      db.passwordResetRequests[email] = {
        attempts: 0,
        code,
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 10 * 60 * 1000,
      };
      let emailResult = { sent: false, reason: 'missing_sendgrid_config' };
      try {
        emailResult = await sendVerificationEmail({ code, email });
      } catch (error) {
        sendJson(res, 502, getPublicErrorPayload(error, 'Email delivery failed'));
        return;
      }
      db.passwordResetRequests[email].emailSent = Boolean(emailResult.sent);
      if (!emailResult.sent && !isTestAuthAllowed()) {
        sendJson(res, 503, {
          error: 'Email delivery is not configured',
          emailSent: false,
        });
        return;
      }
      await writeDb(db);
      sendJson(res, 200, {
        ok: true,
        emailSent: emailResult.sent,
        verificationCode:
          !emailResult.sent && isTestAuthAllowed() ? code : undefined,
      });
      return;
    }

    sendJson(res, 200, { ok: true, emailSent: false });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/password-reset/confirm') {
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').trim();
    const password = String(body.password || '');
    const resetRequest = db.passwordResetRequests[email];
    if (!resetRequest || resetRequest.expiresAt < Date.now()) {
      sendJson(res, 400, { error: 'Code expired' });
      return;
    }
    if (resetRequest.code !== code) {
      resetRequest.attempts = Number(resetRequest.attempts || 0) + 1;
      if (resetRequest.attempts >= 5) {
        delete db.passwordResetRequests[email];
      }
      await writeDb(db);
      sendJson(res, resetRequest.attempts >= 5 ? 429 : 400, {
        error: resetRequest.attempts >= 5 ? 'Too many attempts' : 'Invalid code',
      });
      return;
    }
    if (password.length < 6) {
      sendJson(res, 400, { error: 'Password too short' });
      return;
    }
    const user = db.users.find((item) => item.email === email);
    if (!user) {
      sendJson(res, 404, { error: 'User not found' });
      return;
    }
    user.passwordHash = hashPassword(password);
    delete db.passwordResetRequests[email];
    await writeDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const user = db.users.find((item) => item.email === email);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      sendJson(res, 401, { error: 'Invalid email or password' });
      return;
    }

    if (!String(user.passwordHash || '').startsWith('pbkdf2$')) {
      user.passwordHash = hashPassword(password);
    }
    issueSession(user);
    await writeDb(db);
    sendJson(res, 200, { user: publicUser(user, db) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/oauth/google') {
    const body = await readBody(req);
    const clientId = String(body.clientId || '').trim();
    const code = String(body.code || '').trim();
    const codeVerifier = String(body.codeVerifier || '').trim();
    const redirectUri = String(body.redirectUri || '').trim();
    const idToken = String(body.idToken || '').trim();
    const role = body.role === 'vendor' ? 'vendor' : 'client';
    const allowedClientIds = getAllowedGoogleClientIds();

    if (!clientId || (!idToken && (!code || !redirectUri))) {
      sendJson(res, 400, { error: 'Google auth payload required' });
      return;
    }
    if (!allowedClientIds.length || !allowedClientIds.includes(clientId)) {
      sendJson(res, 503, { error: 'Google OAuth is not configured' });
      return;
    }

    try {
      const tokenResult = idToken
        ? { id_token: idToken }
        : await exchangeGoogleAuthCode({
            clientId,
            code,
            codeVerifier,
            redirectUri,
          });
      if (!tokenResult.id_token) {
        sendJson(res, 502, { error: 'Google did not return id token' });
        return;
      }
      const payload = await verifyOAuthJwt({
        audience: clientId,
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
        token: tokenResult.id_token,
      });
      if (!payload.email || payload.email_verified === false) {
        sendJson(res, 401, { error: 'Google email is not verified' });
        return;
      }
      const user = upsertOAuthUser(db, {
        email: payload.email,
        fullName: payload.name,
        provider: 'google',
        role,
        subject: payload.sub,
      });
      await writeDb(db);
      sendJson(res, 200, { user: publicUser(user, db) });
    } catch (error) {
      sendJson(res, 502, getPublicErrorPayload(error, 'Google OAuth failed'));
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/oauth/apple') {
    const body = await readBody(req);
    const authorizationCode = String(body.authorizationCode || '').trim();
    const identityToken = String(body.identityToken || '').trim();
    const role = body.role === 'vendor' ? 'vendor' : 'client';
    const allowedAudiences = getAllowedAppleAudiences();

    if (!identityToken) {
      sendJson(res, 400, { error: 'Apple identity token required' });
      return;
    }

    try {
      const payload = await verifyOAuthJwt({
        audience: allowedAudiences,
        issuer: 'https://appleid.apple.com',
        jwksUrl: 'https://appleid.apple.com/auth/keys',
        token: identityToken,
      });
      if (body.user && String(body.user) !== String(payload.sub || '')) {
        sendJson(res, 401, { error: 'Apple user mismatch' });
        return;
      }
      let tokenResult = null;
      if (authorizationCode) {
        tokenResult = await exchangeAppleAuthorizationCode(
          authorizationCode,
          String(payload.aud || getAppleClientId()),
        );
        if (tokenResult.id_token) {
          const exchangedPayload = await verifyOAuthJwt({
            audience: allowedAudiences,
            issuer: 'https://appleid.apple.com',
            jwksUrl: 'https://appleid.apple.com/auth/keys',
            token: tokenResult.id_token,
          });
          if (String(exchangedPayload.sub || '') !== String(payload.sub || '')) {
            throw new Error('Apple token subject mismatch');
          }
        }
      } else if (process.env.NODE_ENV === 'production') {
        sendJson(res, 400, { error: 'Apple authorization code required' });
        return;
      }
      const user = upsertOAuthUser(db, {
        email: payload.email || body.email,
        fullName: String(body.fullName || '').trim(),
        provider: 'apple',
        role,
        subject: payload.sub,
        providerData: {
          clientId: String(payload.aud || getAppleClientId()),
          emailPrivateRelay: String(payload.email || body.email || '').endsWith(
            '@privaterelay.appleid.com',
          ),
          refreshToken: tokenResult?.refresh_token,
        },
      });
      await writeDb(db);
      sendJson(res, 200, { user: publicUser(user, db) });
    } catch (error) {
      sendJson(res, 502, getPublicErrorPayload(error, 'Apple OAuth failed'));
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/apple/notifications') {
    const body = await readBody(req);
    const signedPayload = String(body.payload || '').trim();
    if (!signedPayload) {
      sendJson(res, 400, { error: 'Apple notification payload required' });
      return;
    }
    try {
      const payload = await verifyOAuthJwt({
        audience: getAllowedAppleAudiences(),
        issuer: 'https://appleid.apple.com',
        jwksUrl: 'https://appleid.apple.com/auth/keys',
        token: signedPayload,
      });
      const event = payload.events && typeof payload.events === 'object' ? payload.events : {};
      const subject = String(event.sub || payload.sub || '').trim();
      const type = String(event.type || '').trim();
      const user = subject ? findUserByOAuth(db, 'apple', subject) : null;
      let cleanup = null;

      if (user && type === 'account-delete') {
        const assets = deleteUserFromDb(db, user);
        await writeDb(db);
        cleanup = await deleteStoredUserAssets(assets);
      } else if (user) {
        const provider = user.authProviders?.apple;
        if (provider) {
          provider.lastNotificationAt = new Date().toISOString();
          provider.lastNotificationType = type;
          if (type === 'consent-revoked') {
            provider.revokedAt = new Date().toISOString();
            user.authToken = '';
            user.authTokenCreatedAt = null;
          }
          if (type === 'email-disabled') provider.emailDisabledAt = new Date().toISOString();
          if (type === 'email-enabled') delete provider.emailDisabledAt;
        }
        await writeDb(db);
      }

      sendJson(res, 200, { ok: true, handled: Boolean(user), type, cleanup });
    } catch (error) {
      sendJson(res, 401, getPublicErrorPayload(error, 'Invalid Apple notification'));
    }
    return;
  }

  const userDocumentsMatch = url.pathname.match(
    /^\/api\/users\/([^/]+)\/documents(?:\/([^/]+))?(?:\/download)?$/,
  );
  if (userDocumentsMatch && req.method === 'POST' && !userDocumentsMatch[2]) {
    const user = requireUser(req, res, db, userDocumentsMatch[1]);
    if (!user) return;
    try {
      const form = await readMultipartForm(req);
      const file = form.files.find((item) => item.fieldName === 'file') || form.files[0];
      if (!file) {
        sendJson(res, 400, { error: 'Выберите документ.' });
        return;
      }
      await storeUserDocument(user, file);
      await writeDb(db);
      sendJson(res, 200, { user: publicUser(user, db) });
    } catch (error) {
      const uploadError = getPublicUploadError(error);
      sendJson(res, uploadError.status, { error: uploadError.error });
    }
    return;
  }

  if (userDocumentsMatch && req.method === 'GET' && userDocumentsMatch[2]) {
    const user = requireUser(req, res, db, userDocumentsMatch[1]);
    if (!user) return;
    const document = (user.documents || []).find((item) => item.id === userDocumentsMatch[2]);
    if (!document) {
      sendJson(res, 404, { error: 'Document not found' });
      return;
    }
    try {
      const buffer = await readStoredDocument(document);
      res.writeHead(200, {
        ...getSecurityHeaders(),
        'Cache-Control': 'private, max-age=0, no-store',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
        'Content-Length': buffer.length,
        'Content-Type': document.contentType,
      });
      res.end(buffer);
    } catch {
      sendJson(res, 404, { error: 'Document file not found' });
    }
    return;
  }

  if (userDocumentsMatch && req.method === 'DELETE' && userDocumentsMatch[2]) {
    const user = requireUser(req, res, db, userDocumentsMatch[1]);
    if (!user) return;
    const document = (user.documents || []).find((item) => item.id === userDocumentsMatch[2]);
    if (!document) {
      sendJson(res, 404, { error: 'Document not found' });
      return;
    }
    user.documents = user.documents.filter((item) => item.id !== document.id);
    if (user.role === 'vendor' && user.documents.length === 0) {
      user.vendorVerification = {
        status: 'Не отправлено',
        moderatorComment: '',
        updatedAt: new Date().toISOString(),
      };
    }
    await writeDb(db);
    void deleteStoredDocument(document).catch((error) =>
      console.warn('Document cleanup failed:', error.message || error));
    sendJson(res, 200, { user: publicUser(user, db) });
    return;
  }

  const userMediaUploadMatch = url.pathname.match(
    /^\/api\/users\/([^/]+)\/media\/uploads$/,
  );
  const userMediaUploadPresignMatch = url.pathname.match(
    /^\/api\/users\/([^/]+)\/media\/uploads\/presign$/,
  );
  if (userMediaUploadPresignMatch && req.method === 'POST') {
    const user = requireUser(req, res, db, userMediaUploadPresignMatch[1]);
    if (!user) return;

    try {
      const body = await readBody(req);
      const upload = await createUserMediaUploadUrl(user, body);
      sendJson(res, 200, upload);
    } catch (error) {
      const uploadError = getPublicUploadError(error);
      sendJson(res, uploadError.status, { error: uploadError.error });
    }
    return;
  }

  const userMediaUploadCompleteMatch = url.pathname.match(
    /^\/api\/users\/([^/]+)\/media\/uploads\/complete$/,
  );
  if (userMediaUploadCompleteMatch && req.method === 'POST') {
    const user = requireUser(req, res, db, userMediaUploadCompleteMatch[1]);
    if (!user) return;

    try {
      const body = await readBody(req);
      const media = await completeUserDirectMediaUpload(user, body);
      syncVendorMediaFromUser(db, user);
      await writeDb(db);
      sendJson(res, 200, { media, user: publicUser(user, db) });
    } catch (error) {
      const uploadError = getPublicUploadError(error);
      sendJson(res, uploadError.status, { error: uploadError.error });
    }
    return;
  }

  if (userMediaUploadMatch && req.method === 'POST') {
    const user = requireUser(req, res, db, userMediaUploadMatch[1]);
    if (!user) return;

    try {
      const form = await readMultipartForm(req);
      const file = form.files.find((item) => item.fieldName === 'file') || form.files[0];
      if (!file) {
        sendJson(res, 400, { error: 'Upload file required' });
        return;
      }

      const media = await storeUserUploadedMedia({
        req,
        user,
        file,
        fields: form.fields,
      });
      syncVendorMediaFromUser(db, user);
      await writeDb(db);
      sendJson(res, 200, { media, user: publicUser(user, db) });
    } catch (error) {
      const uploadError = getPublicUploadError(error);
      sendJson(res, uploadError.status, { error: uploadError.error });
    }
    return;
  }

  const adminVendorFeaturedMatch = url.pathname.match(
    /^\/api\/admin\/vendors\/([^/]+)\/featured$/,
  );
  if (adminVendorFeaturedMatch && req.method === 'PATCH') {
    if (!requireAdmin(req, res)) return;

    const body = await readBody(req);
    const vendor = db.vendors.find((item) => item.id === adminVendorFeaturedMatch[1]);
    if (!vendor) {
      sendJson(res, 404, { error: 'Vendor not found' });
      return;
    }

    const allowedStyles = ['gold', 'neon', 'royal', 'rose'];
    const style = allowedStyles.includes(body.style) ? body.style : 'gold';
    vendor.featured = {
      enabled: body.enabled !== false,
      style,
      badgeText: String(body.badgeText || 'Выбор SVADBA.kz').trim(),
      priority: Number.isFinite(Number(body.priority))
        ? Math.max(0, Math.min(999, Number(body.priority)))
        : 50,
      ...(body.expiresAt ? { expiresAt: String(body.expiresAt) } : {}),
    };

    await writeDb(db);
    sendJson(res, 200, { vendor });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/moderation') {
    if (!requireAdmin(req, res)) return;
    sendJson(res, 200, getAdminModerationDashboard(db));
    return;
  }

  const adminReportMatch = url.pathname.match(/^\/api\/admin\/content-reports\/([^/]+)$/);
  if (adminReportMatch && req.method === 'PATCH') {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    const report = (db.contentReports || []).find((item) => item.id === adminReportMatch[1]);
    if (!report) {
      sendJson(res, 404, { error: 'Report not found' });
      return;
    }

    const allowedStatuses = ['new', 'reviewing', 'resolved', 'rejected'];
    const nextStatus = allowedStatuses.includes(body.status) ? body.status : report.status;
    report.status = nextStatus;
    report.adminNote = String(body.adminNote || report.adminNote || '').trim();
    report.resolution = String(body.resolution || report.resolution || '').trim();
    report.updatedAt = new Date().toISOString();

    const action = String(body.action || '').trim();
    const vendor = db.vendors.find((item) => item.id === report.vendorId);
    const mediaToDeleteAfterWrite = [];
    if (vendor && action === 'hide_vendor') {
      vendor.hidden = true;
      vendor.moderationStatus = 'Отклонено';
      vendor.moderationNote = report.adminNote || report.reason || 'Скрыто модератором';
      vendor.moderatedAt = new Date().toISOString();
    }
    if (vendor && action === 'restore_vendor') {
      vendor.hidden = false;
      vendor.moderationStatus = 'Опубликовано';
      vendor.moderationNote = report.adminNote || '';
      vendor.moderatedAt = new Date().toISOString();
    }
    if (vendor && action === 'delete_vendor') {
      mediaToDeleteAfterWrite.push(...(deleteVendorFromDb(db, vendor.id)?.media || []));
      report.status = 'resolved';
      report.resolution = report.resolution || 'Vendor deleted';
    }
    if (vendor && action === 'delete_media' && report.mediaId) {
      const result = removeVendorMedia(db, vendor.id, report.mediaId);
      if (result) mediaToDeleteAfterWrite.push(result.media);
      report.status = 'resolved';
      report.resolution = report.resolution || 'Media deleted';
    }
    if (action === 'delete_comment' && report.mediaId && report.commentId) {
      const comments = getMediaComments(db, report.mediaId);
      db.mediaComments[report.mediaId] = comments.filter(
        (comment) => comment.id !== report.commentId,
      );
      report.status = 'resolved';
      report.resolution = report.resolution || 'Comment deleted';
    }

    await writeDb(db);
    void deleteStoredMediaObjects(mediaToDeleteAfterWrite).catch((error) =>
      console.warn('Vendor media cleanup failed:', error.message || error),
    );
    sendJson(res, 200, { report, dashboard: getAdminModerationDashboard(db) });
    return;
  }

  const adminDeletionRequestMatch = url.pathname.match(
    /^\/api\/admin\/account-deletion-requests\/([^/]+)$/,
  );
  if (adminDeletionRequestMatch && req.method === 'PATCH') {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    const request = (db.accountDeletionRequests || []).find(
      (item) => item.id === adminDeletionRequestMatch[1],
    );
    if (!request) {
      sendJson(res, 404, { error: 'Deletion request not found' });
      return;
    }

    const allowedStatuses = ['received', 'reviewing', 'completed', 'rejected'];
    request.status = allowedStatuses.includes(body.status) ? body.status : request.status;
    request.adminNote = String(body.adminNote || request.adminNote || '').trim();
    request.updatedAt = new Date().toISOString();

    let deletedAssets = null;
    let appleTokenRevoked = true;
    if (body.deleteMatchingUser === true && request.email) {
      const matchingUser = db.users.find((user) => user.email === request.email);
      if (matchingUser) {
        try {
          await revokeAppleRefreshToken(matchingUser);
        } catch (error) {
          appleTokenRevoked = false;
          console.warn('Apple token revocation failed during admin deletion:', error.message || error);
        }
        deletedAssets = deleteUserFromDb(db, matchingUser);
        request.deletedUserId = matchingUser.id;
        request.email = '';
        request.status = 'completed';
      }
    }

    await writeDb(db);
    const cleanup = deletedAssets ? await deleteStoredUserAssets(deletedAssets) : null;
    sendJson(res, 200, {
      request,
      cleanup,
      appleTokenRevoked,
      dashboard: getAdminModerationDashboard(db),
    });
    return;
  }

  const adminVendorModerationMatch = url.pathname.match(/^\/api\/admin\/vendors\/([^/]+)$/);
  if (adminVendorModerationMatch && req.method === 'PATCH') {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    const vendor = db.vendors.find((item) => item.id === adminVendorModerationMatch[1]);
    if (!vendor) {
      sendJson(res, 404, { error: 'Vendor not found' });
      return;
    }

    if (typeof body.hidden === 'boolean') vendor.hidden = body.hidden;
    if (typeof body.verified === 'boolean') vendor.verified = body.verified;
    if (typeof body.moderationStatus === 'string') {
      vendor.moderationStatus = body.moderationStatus;
    }
    if (typeof body.moderationNote === 'string') {
      vendor.moderationNote = body.moderationNote.trim();
    }
    const owner = db.users.find(
      (user) => user.vendorId === vendor.id || `vendor_${user.id}` === vendor.id,
    );
    if (
      owner &&
      (typeof body.verificationStatus === 'string' ||
        typeof body.verificationComment === 'string')
    ) {
      const allowedVerificationStatuses = [
        'Не отправлено',
        'На проверке',
        'Проверен',
        'Отклонен',
      ];
      owner.vendorVerification = {
        status: allowedVerificationStatuses.includes(body.verificationStatus)
          ? body.verificationStatus
          : owner.vendorVerification?.status || 'Не отправлено',
        moderatorComment:
          typeof body.verificationComment === 'string'
            ? body.verificationComment.trim().slice(0, 1000)
            : owner.vendorVerification?.moderatorComment || '',
        updatedAt: new Date().toISOString(),
      };
    }
    vendor.moderatedAt = new Date().toISOString();

    await writeDb(db);
    sendJson(res, 200, { vendor: publicAdminVendor(vendor, db) });
    return;
  }

  if (adminVendorModerationMatch && req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;
    const deleteResult = deleteVendorFromDb(db, adminVendorModerationMatch[1]);
    if (!deleteResult) {
      sendJson(res, 404, { error: 'Vendor not found' });
      return;
    }

    await writeDb(db);
    void deleteStoredMediaObjects(deleteResult.media).catch((error) =>
      console.warn('Vendor media cleanup failed:', error.message || error),
    );
    sendJson(res, 200, { ok: true, vendor: deleteResult.vendor });
    return;
  }

  const adminVendorMediaMatch = url.pathname.match(
    /^\/api\/admin\/vendors\/([^/]+)\/media\/([^/]+)$/,
  );
  if (adminVendorMediaMatch && req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;
    const result = removeVendorMedia(db, adminVendorMediaMatch[1], adminVendorMediaMatch[2]);
    if (!result) {
      sendJson(res, 404, { error: 'Media not found' });
      return;
    }

    await writeDb(db);
    void deleteStoredMediaObject(result.media).catch((error) =>
      console.warn('Media cleanup failed:', error.message || error),
    );
    sendJson(res, 200, {
      ok: true,
      media: result.media,
      user: publicUser(result.user, db),
    });
    return;
  }

  const userPushTokensMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/push-tokens$/);
  if (userPushTokensMatch && req.method === 'POST') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userPushTokensMatch[1]);
    if (!user) return;

    const token = String(body.token || '').trim();
    if (!isExpoPushToken(token)) {
      sendJson(res, 400, { error: 'Valid Expo push token required' });
      return;
    }

    upsertUserPushToken(user, {
      platform: String(body.platform || ''),
      role: body.role === 'vendor' ? 'vendor' : body.role === 'client' ? 'client' : user.role,
      token,
    });
    await writeDb(db);
    sendJson(res, 200, {
      ok: true,
      pushNotifications: publicPushRegistration(user),
    });
    return;
  }

  if (userPushTokensMatch && req.method === 'DELETE') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userPushTokensMatch[1]);
    if (!user) return;

    const token = String(body.token || '').trim();
    if (token) {
      removeUserPushToken(user, token);
      await writeDb(db);
    }
    sendJson(res, 200, {
      ok: true,
      pushNotifications: publicPushRegistration(user),
    });
    return;
  }

  const userPushTestMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/push-test$/);
  if (userPushTestMatch && req.method === 'POST') {
    const user = requireUser(req, res, db, userPushTestMatch[1]);
    if (!user) return;

    const result = await notifyUserPush(user, {
      title: 'SVADBA.kz',
      body: 'Push-уведомления работают.',
      data: {
        role: user.role,
        screen: 'requests',
      },
    });
    sendJson(res, 200, {
      ok: true,
      pushNotifications: publicPushRegistration(user),
      result,
    });
    return;
  }

  const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch && req.method === 'GET') {
    const user = requireUser(req, res, db, userMatch[1]);
    if (!user) return;
    sendJson(res, 200, { user: publicUser(user, db) });
    return;
  }

  if (userMatch && req.method === 'PATCH') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userMatch[1]);
    if (!user) return;
    let mediaToDeleteAfterWrite = [];

    if (body.role === 'client' || body.role === 'vendor') user.role = body.role;
    if (typeof body.profileCreated === 'boolean') {
      user.profileCreated = body.profileCreated;
    }
    if (body.vendorDraft && typeof body.vendorDraft === 'object') {
      const nextDraft = { ...user.vendorDraft, ...body.vendorDraft };
      try {
        validateVendorDraftPublicText(nextDraft);
      } catch (error) {
        sendJson(res, 400, { error: error.message });
        return;
      }
      const prepayment = String(nextDraft.prepayment || '').replace(/[^\d]/g, '');
      if (prepayment && Number(prepayment) > 100) {
        sendJson(res, 400, { error: 'Предоплата должна быть от 0 до 100%.' });
        return;
      }
      for (const field of ['priceFrom', 'basePackagePrice', 'standardPackagePrice', 'premiumPackagePrice']) {
        if (field in nextDraft) nextDraft[field] = String(parseMoney(nextDraft[field]) || '');
      }
      nextDraft.prepayment = prepayment;
      user.vendorDraft = nextDraft;
    }
    if (body.vendorSettingsValues && typeof body.vendorSettingsValues === 'object') {
      user.vendorSettingsValues = {
        ...(user.vendorSettingsValues || {}),
        ...sanitizeVendorSettingsValues(body.vendorSettingsValues),
      };
    }
    if (body.clientProfile && typeof body.clientProfile === 'object') {
      user.clientProfile = {
        ...createDefaultClientProfile(user.email),
        ...(user.clientProfile || {}),
        ...body.clientProfile,
      };
    }
    if (body.clientSettingsValues && typeof body.clientSettingsValues === 'object') {
      user.clientSettingsValues = {
        ...(user.clientSettingsValues || {}),
        ...sanitizeClientSettingsValues(body.clientSettingsValues),
      };
    }
    if (Array.isArray(body.selectedImportIds)) {
      user.selectedImportIds = body.selectedImportIds;
    }
    if (typeof body.instagramHandle === 'string') {
      user.instagramHandle = body.instagramHandle;
    }
    if (body.eventDraft && typeof body.eventDraft === 'object') {
      const validatedEvent = validateEventDraft({
        ...(user.eventDraft || createDefaultEventDraft()),
        ...body.eventDraft,
      });
      if (validatedEvent.error) {
        sendJson(res, 400, { error: validatedEvent.error });
        return;
      }
      user.eventDraft = validatedEvent.draft;
    }
    if (Array.isArray(body.eventHistory)) {
      const existingEvents = normalizeEventHistory(user.eventHistory);
      const existingById = new Map(existingEvents.map((event) => [event.id, event]));
      const nextEvents = [];
      for (const event of normalizeEventHistory(body.eventHistory)) {
        const existing = existingById.get(event.id);
        const existingDate = normalizeIsoDate(existing?.date);
        if (existing && existingDate && existingDate < getTodayIso()) {
          const unchanged = JSON.stringify(comparableEvent(existing)) ===
            JSON.stringify(comparableEvent(event));
          if (!unchanged) {
            sendJson(res, 409, { error: 'Прошедшее мероприятие нельзя редактировать.' });
            return;
          }
          nextEvents.push(existing);
          continue;
        }
        const validatedEvent = validateEventDraft(event);
        if (validatedEvent.error) {
          sendJson(res, 400, { error: validatedEvent.error });
          return;
        }
        nextEvents.push({ ...event, ...validatedEvent.draft });
      }
      user.eventHistory = nextEvents;
    }
    if (Array.isArray(body.savedVendorIds)) {
      user.savedVendorIds = body.savedVendorIds;
    }
    if (Array.isArray(body.likedVendorIds)) {
      user.likedVendorIds = body.likedVendorIds;
    }
    if (Array.isArray(body.likedMediaIds)) {
      user.likedMediaIds = normalizeIdList(body.likedMediaIds);
    }
    if (Array.isArray(body.savedMediaIds)) {
      user.savedMediaIds = normalizeIdList(body.savedMediaIds);
    }
    if (Array.isArray(body.blockedVendorIds)) {
      user.blockedVendorIds = body.blockedVendorIds;
    }
    if (Array.isArray(body.uploadedMedia)) {
      const nextMedia = mergeUploadedMediaUpdates(user.uploadedMedia, body.uploadedMedia);
      mediaToDeleteAfterWrite = getRemovedMediaItems(user.uploadedMedia, nextMedia);
      mediaToDeleteAfterWrite.forEach((media) => {
        if (media?.id) {
          cleanupMediaEngagement(db, media.id);
        }
      });
      user.uploadedMedia = nextMedia;
      syncVendorMediaFromUser(db, user);
    }

    await writeDb(db);
    void deleteStoredMediaObjects(mediaToDeleteAfterWrite).catch((error) =>
      console.warn('User media cleanup failed:', error.message || error),
    );
    sendJson(res, 200, { user: publicUser(user, db) });
    return;
  }

  const userBlockedMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/blocked-vendors$/);
  if (userBlockedMatch && req.method === 'POST') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userBlockedMatch[1]);
    if (!user) return;
    const vendorId = String(body.vendorId || '');
    const shouldBlock = body.blocked !== false;
    if (!db.vendors.some((item) => item.id === vendorId)) {
      sendJson(res, 404, { error: 'Vendor not found' });
      return;
    }
    const blockedVendorIds = user.blockedVendorIds || [];
    user.blockedVendorIds = shouldBlock
      ? Array.from(new Set([...blockedVendorIds, vendorId]))
      : blockedVendorIds.filter((id) => id !== vendorId);
    await writeDb(db);
    sendJson(res, 200, { user: publicUser(user, db) });
    return;
  }

  const userReportsMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/content-reports$/);
  if (userReportsMatch && req.method === 'POST') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userReportsMatch[1]);
    if (!user) return;
    const vendorId = String(body.vendorId || '');
    const vendor = db.vendors.find((item) => item.id === vendorId);
    if (!vendor) {
      sendJson(res, 404, { error: 'Vendor not found' });
      return;
    }
    const targetType = ['vendor', 'media', 'comment'].includes(body.targetType)
      ? body.targetType
      : 'vendor';
    const mediaId = normalizeMediaId(body.mediaId);
    const commentId = String(body.commentId || '').trim().slice(0, 160);
    if (targetType !== 'vendor' && !vendorOwnsMedia(db, vendorId, mediaId)) {
      sendJson(res, 404, { error: 'Media not found' });
      return;
    }
    const targetComment =
      targetType === 'comment'
        ? getMediaComments(db, mediaId).find((comment) => comment.id === commentId)
        : null;
    if (targetType === 'comment' && !targetComment) {
      sendJson(res, 404, { error: 'Comment not found' });
      return;
    }
    const report = {
      id: `report_${Date.now()}`,
      reporterId: user.id,
      reporterEmail: user.email,
      vendorId,
      targetType,
      ...(mediaId ? { mediaId } : {}),
      ...(commentId ? { commentId } : {}),
      reason: String(body.reason || 'Неподходящий контент').trim(),
      details: String(body.details || '').trim(),
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    if (targetComment?.authorId && targetComment.authorId !== user.id) {
      user.blockedUserIds = Array.from(
        new Set([...normalizeIdList(user.blockedUserIds), targetComment.authorId]),
      );
    }
    db.contentReports.unshift(report);
    await writeDb(db);
    sendJson(res, 200, { ok: true, report, user: publicUser(user, db) });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/content-reports') {
    if (!requireAdmin(req, res)) return;
    sendJson(res, 200, {
      reports: db.contentReports || [],
      deletionRequests: db.accountDeletionRequests || [],
    });
    return;
  }

  const vendorAnalyticsMatch = url.pathname.match(/^\/api\/vendors\/([^/]+)\/analytics$/);
  if (vendorAnalyticsMatch && req.method === 'POST') {
    const body = await readBody(req);
    const vendorId = vendorAnalyticsMatch[1];
    if (!db.vendors.some((item) => item.id === vendorId)) {
      sendJson(res, 404, { error: 'Vendor not found' });
      return;
    }
    const analytics = recordVendorAnalyticsEvent(db, vendorId, String(body.type || ''));
    if (!analytics) {
      sendJson(res, 400, { error: 'Unsupported analytics event' });
      return;
    }
    await writeDb(db);
    sendJson(res, 200, { analytics: publicVendorAnalytics(analytics) });
    return;
  }

  if (userMatch && req.method === 'DELETE') {
    const user = requireUser(req, res, db, userMatch[1]);
    if (!user) return;
    try {
      let appleTokenRevoked = true;
      try {
        await revokeAppleRefreshToken(user);
      } catch (error) {
        appleTokenRevoked = false;
        console.warn('Apple token revocation failed during account deletion:', error.message || error);
      }
      const assets = deleteUserFromDb(db, user);
      await writeDb(db);
      const cleanup = await deleteStoredUserAssets(assets);
      sendJson(res, 200, { ok: true, cleanup, appleTokenRevoked });
    } catch (error) {
      sendJson(res, 502, getPublicErrorPayload(error, 'Account deletion failed'));
    }
    return;
  }

  const userSavedMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/saved-vendors$/);
  if (userSavedMatch && req.method === 'POST') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userSavedMatch[1]);
    const vendorId = String(body.vendorId || '');
    if (!user) return;
    const savedVendorIds = normalizeIdList(user.savedVendorIds);
    const desiredSaved =
      typeof body.saved === 'boolean' ? body.saved : !savedVendorIds.includes(vendorId);
    user.savedVendorIds = desiredSaved
      ? Array.from(new Set([...savedVendorIds, vendorId]))
      : savedVendorIds.filter((id) => id !== vendorId);
    await writeDb(db);
    sendJson(res, 200, { user: publicUser(user, db) });
    return;
  }

  const userLikedMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/liked-vendors$/);
  if (userLikedMatch && req.method === 'POST') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userLikedMatch[1]);
    const vendorId = String(body.vendorId || '');
    if (!user) return;
    const vendor = db.vendors.find((item) => item.id === vendorId);
    if (!vendor) {
      sendJson(res, 404, { error: 'Vendor not found' });
      return;
    }

    const likedVendorIds = normalizeIdList(user.likedVendorIds);
    const vendorLikeUserIds = getVendorLikeUserIds(db, vendorId);
    const desiredLiked =
      typeof body.liked === 'boolean' ? body.liked : !likedVendorIds.includes(vendorId);

    user.likedVendorIds = desiredLiked
      ? Array.from(new Set([...likedVendorIds, vendorId]))
      : likedVendorIds.filter((id) => id !== vendorId);
    db.vendorLikes[vendorId] = desiredLiked
      ? Array.from(new Set([...vendorLikeUserIds, user.id]))
      : vendorLikeUserIds.filter((id) => id !== user.id);

    await writeDb(db);
    sendJson(res, 200, {
      liked: desiredLiked,
      user: publicUser(user, db),
      vendor: publicVendor(vendor, db),
    });
    return;
  }

  const userMediaLikedMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/media-likes$/);
  if (userMediaLikedMatch && req.method === 'POST') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userMediaLikedMatch[1]);
    if (!user) return;
    const vendorId = String(body.vendorId || '');
    const mediaId = normalizeMediaId(body.mediaId);
    const vendor = db.vendors.find((item) => item.id === vendorId);
    if (!vendor || !vendorOwnsMedia(db, vendorId, mediaId)) {
      sendJson(res, 404, { error: 'Media not found' });
      return;
    }

    const likedMediaIds = normalizeIdList(user.likedMediaIds);
    const mediaLikeUserIds = getMediaLikeUserIds(db, mediaId);
    const desiredLiked =
      typeof body.liked === 'boolean' ? body.liked : !likedMediaIds.includes(mediaId);

    user.likedMediaIds = desiredLiked
      ? Array.from(new Set([...likedMediaIds, mediaId]))
      : likedMediaIds.filter((id) => id !== mediaId);
    db.mediaLikes[mediaId] = desiredLiked
      ? Array.from(new Set([...mediaLikeUserIds, user.id]))
      : mediaLikeUserIds.filter((id) => id !== user.id);

    await writeDb(db);
    sendJson(res, 200, {
      liked: desiredLiked,
      stats: getPublicMediaStats(db, mediaId),
      user: publicUser(user, db),
      vendor: publicVendor(vendor, db),
    });
    return;
  }

  const mediaLikesListMatch = url.pathname.match(
    /^\/api\/vendors\/([^/]+)\/media\/([^/]+)\/likes$/,
  );
  if (mediaLikesListMatch && req.method === 'GET') {
    const vendorId = decodeURIComponent(mediaLikesListMatch[1]);
    const mediaId = normalizeMediaId(decodeURIComponent(mediaLikesListMatch[2]));
    const vendor = db.vendors.find((item) => item.id === vendorId);
    if (!vendor || !vendorOwnsMedia(db, vendorId, mediaId)) {
      sendJson(res, 404, { error: 'Media not found' });
      return;
    }
    const likes = getPublicMediaLikeUsers(db, mediaId);
    sendJson(res, 200, { likes, total: getMediaLikeUserIds(db, mediaId).length });
    return;
  }

  const userMediaSavedMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/media-saves$/);
  if (userMediaSavedMatch && req.method === 'POST') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userMediaSavedMatch[1]);
    if (!user) return;
    const vendorId = String(body.vendorId || '');
    const mediaId = normalizeMediaId(body.mediaId);
    const vendor = db.vendors.find((item) => item.id === vendorId);
    if (!vendor || !vendorOwnsMedia(db, vendorId, mediaId)) {
      sendJson(res, 404, { error: 'Media not found' });
      return;
    }

    const savedMediaIds = normalizeIdList(user.savedMediaIds);
    const mediaSaveUserIds = getMediaSaveUserIds(db, mediaId);
    const desiredSaved =
      typeof body.saved === 'boolean' ? body.saved : !savedMediaIds.includes(mediaId);

    user.savedMediaIds = desiredSaved
      ? Array.from(new Set([...savedMediaIds, mediaId]))
      : savedMediaIds.filter((id) => id !== mediaId);
    db.mediaSaves[mediaId] = desiredSaved
      ? Array.from(new Set([...mediaSaveUserIds, user.id]))
      : mediaSaveUserIds.filter((id) => id !== user.id);

    await writeDb(db);
    sendJson(res, 200, {
      saved: desiredSaved,
      stats: getPublicMediaStats(db, mediaId),
      user: publicUser(user, db),
      vendor: publicVendor(vendor, db),
    });
    return;
  }

  const userMediaCommentsMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/media-comments$/);
  if (userMediaCommentsMatch && req.method === 'POST') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userMediaCommentsMatch[1]);
    if (!user) return;
    const vendorId = String(body.vendorId || '');
    const mediaId = normalizeMediaId(body.mediaId);
    const vendor = db.vendors.find((item) => item.id === vendorId);
    let text;
    try {
      text = validatePublicText(body.text, { maxLength: 600 });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
      return;
    }
    if (!vendor || !vendorOwnsMedia(db, vendorId, mediaId)) {
      sendJson(res, 404, { error: 'Media not found' });
      return;
    }
    const comments = getMediaComments(db, mediaId);
    const author =
      user.clientProfile?.name ||
      user.vendorDraft?.name ||
      String(user.email || '').split('@')[0] ||
      'Пользователь';
    const comment = {
      id: `comment_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      authorId: user.id,
      author,
      authorAvatarUri: getUserAvatarUri(user),
      text,
      createdAt: new Date().toISOString(),
    };
    db.mediaComments[mediaId] = [comment, ...comments].slice(0, 500);

    await writeDb(db);
    sendJson(res, 200, {
      comment,
      stats: getPublicMediaStats(db, mediaId),
      user: publicUser(user, db),
      vendor: publicVendor(vendor, db),
    });
    return;
  }

  const userBudgetSummaryMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/budget-summary$/);
  if (userBudgetSummaryMatch && req.method === 'GET') {
    const user = requireUser(req, res, db, userBudgetSummaryMatch[1]);
    if (!user) return;
    const confirmedBookings = (db.bookings || []).filter(
      (booking) => booking.clientId === user.id && isConfirmedBookingStatus(booking.status),
    );
    const totalBudget = parseMoney(user.eventDraft?.budget);
    const bookedAmount = confirmedBookings.reduce(
      (sum, booking) => sum + parseMoney(booking.amount),
      0,
    );
    sendJson(res, 200, {
      totalBudget,
      bookedAmount,
      remainingAmount: Math.max(0, totalBudget - bookedAmount),
      confirmedBookings: confirmedBookings.length,
    });
    return;
  }

  const userBookingsMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/bookings$/);
  if (userBookingsMatch && req.method === 'GET') {
    const user = requireUser(req, res, db, userBookingsMatch[1]);
    if (!user) return;
    const userBookings = db.bookings
      .filter((booking) => booking.clientId === user.id)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    sendJson(res, 200, { bookings: userBookings.map(publicBooking) });
    return;
  }

  if (userBookingsMatch && req.method === 'POST') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userBookingsMatch[1]);
    if (!user) return;
    if (user.role !== 'client') {
      sendJson(res, 403, { error: 'Только клиент может создать бронирование.' });
      return;
    }
    const vendor = db.vendors.find((item) => item.id === body.vendorId);
    if (!vendor) {
      sendJson(res, 404, { error: 'Vendor not found' });
      return;
    }
    const validated = validateBookingInput({
      date: body.date,
      timeFrom: body.timeFrom || '18:00',
      timeTo: body.timeTo || '23:00',
    });
    if (validated.error) {
      sendJson(res, 400, { error: validated.error });
      return;
    }
    const { date: bookingDate, timeFrom, timeTo } = validated;
    const conflict = findBookingConflict(db, {
      vendorId: vendor.id,
      clientId: user.id,
      date: bookingDate,
      timeFrom,
      timeTo,
    });
    if (conflict) {
      sendJson(res, 409, {
        error: 'Поставщик уже занят на эту дату и время.',
        booking: publicBooking(conflict),
      });
      return;
    }
    if (isVendorCalendarDateBusy(db, vendor.id, user.id, bookingDate)) {
      sendJson(res, 409, { error: 'Эта дата закрыта в календаре поставщика.' });
      return;
    }
    const booking = {
      id: `booking_${Date.now()}`,
      date: bookingDate,
      timeFrom,
      timeTo,
      status: 'Ожидает подтверждения',
      vendorId: vendor.id,
      vendorName: vendor.name,
      clientId: user.id,
      clientEmail: user.email,
      clientName: user.eventDraft?.type || 'Клиент',
      amount: `от ${Number(vendor.priceFrom).toLocaleString('ru-RU')} ₸`,
      createdAt: new Date().toISOString(),
    };
    db.bookings = [
      booking,
      ...db.bookings.filter(
        (item) => !(item.clientId === user.id && item.vendorId === vendor.id),
      ),
    ];
    user.bookings = [
      booking,
      ...(user.bookings || []).filter((item) => item.vendorId !== vendor.id),
    ];
    user.eventDraft = {
      ...(user.eventDraft || createDefaultEventDraft()),
      date: booking.date,
      city: vendor.city,
    };
    await writeDb(db);
    void notifyVendorAboutBooking(db, booking).catch((error) =>
      console.error('Booking push failed:', error.message),
    );
    sendJson(res, 200, { user: publicUser(user, db), booking: publicBooking(booking) });
    return;
  }

  const clientBookingMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/bookings\/([^/]+)$/);
  if (clientBookingMatch && req.method === 'PATCH') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, clientBookingMatch[1]);
    if (!user) return;
    if (user.role !== 'client') {
      sendJson(res, 403, { error: 'Только клиент может менять свою бронь.' });
      return;
    }
    const booking = db.bookings.find(
      (item) => item.id === clientBookingMatch[2] && item.clientId === user.id,
    );
    if (!booking) {
      sendJson(res, 404, { error: 'Booking not found' });
      return;
    }

    if (body.status === 'Отменена') {
      booking.status = 'Отменена';
      booking.updatedAt = new Date().toISOString();
      setBookingCalendarState(db, booking, false);
    } else {
      if (isCancelledBookingStatus(booking.status)) {
        sendJson(res, 409, { error: 'Отмененную или отклоненную бронь нельзя изменить.' });
        return;
      }
      const validated = validateBookingInput({
        date: body.date ?? booking.date,
        timeFrom: body.timeFrom ?? booking.timeFrom,
        timeTo: body.timeTo ?? booking.timeTo,
      });
      if (validated.error) {
        sendJson(res, 400, { error: validated.error });
        return;
      }
      const conflict = findBookingConflict(db, {
        vendorId: booking.vendorId,
        clientId: user.id,
        date: validated.date,
        timeFrom: validated.timeFrom,
        timeTo: validated.timeTo,
      });
      if (conflict && conflict.id !== booking.id) {
        sendJson(res, 409, { error: 'Поставщик уже занят на эту дату и время.' });
        return;
      }
      if (
        validated.date !== normalizeIsoDate(booking.date) &&
        isVendorCalendarDateBusy(db, booking.vendorId, user.id, validated.date)
      ) {
        sendJson(res, 409, { error: 'Эта дата закрыта в календаре поставщика.' });
        return;
      }
      setBookingCalendarState(db, booking, false);
      booking.date = validated.date;
      booking.timeFrom = validated.timeFrom;
      booking.timeTo = validated.timeTo;
      booking.status = 'Ожидает подтверждения';
      booking.updatedAt = new Date().toISOString();
    }
    syncBookingToClient(db, booking);
    await writeDb(db);
    sendJson(res, 200, { booking: publicBooking(booking), user: publicUser(user, db) });
    return;
  }

  const userVendorRequestsMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/vendor-requests$/);
  if (userVendorRequestsMatch && req.method === 'GET') {
    const user = requireUser(req, res, db, userVendorRequestsMatch[1]);
    if (!user) return;
    const vendorId = user.vendorId || `vendor_${user.id}`;
    const requests = db.bookings
      .filter((booking) => booking.vendorId === vendorId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    sendJson(res, 200, { bookings: requests.map(publicBooking) });
    return;
  }

  const userVendorAnalyticsMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/vendor-analytics$/);
  if (userVendorAnalyticsMatch && req.method === 'GET') {
    const user = requireUser(req, res, db, userVendorAnalyticsMatch[1]);
    if (!user) return;
    const vendorId = user.vendorId || `vendor_${user.id}`;
    sendJson(res, 200, {
      analytics: publicVendorAnalytics(getVendorAnalytics(db, vendorId)),
    });
    return;
  }

  const bookingStatusMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/vendor-requests\/([^/]+)$/);
  if (bookingStatusMatch && req.method === 'PATCH') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, bookingStatusMatch[1]);
    if (!user) return;
    if (user.role !== 'vendor') {
      sendJson(res, 403, { error: 'Только поставщик может менять статус заявки.' });
      return;
    }
    const vendorId = user.vendorId || `vendor_${user.id}`;
    const booking = db.bookings.find(
      (item) => item.id === bookingStatusMatch[2] && item.vendorId === vendorId,
    );
    if (!booking) {
      sendJson(res, 404, { error: 'Booking not found' });
      return;
    }
    const nextStatus = String(body.status || booking.status);
    if (!isVendorBookingStatus(nextStatus)) {
      sendJson(res, 400, { error: 'Недопустимый статус бронирования.' });
      return;
    }
    const wasConfirmed = isConfirmedBookingStatus(booking.status);
    booking.status = nextStatus;
    booking.updatedAt = new Date().toISOString();
    const nowConfirmed = isConfirmedBookingStatus(nextStatus);
    if (!wasConfirmed && nowConfirmed) setBookingCalendarState(db, booking, true);
    if (wasConfirmed && !nowConfirmed) setBookingCalendarState(db, booking, false);
    syncBookingToClient(db, booking);
    await writeDb(db);
    void notifyClientAboutBookingStatus(db, booking).catch((error) =>
      console.error('Booking status push failed:', error.message),
    );
    sendJson(res, 200, { booking: publicBooking(booking) });
    return;
  }

  const userVendorProfileMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/vendor-profile$/);
  if (userVendorProfileMatch && req.method === 'POST') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userVendorProfileMatch[1]);
    if (!user) return;
    const draft = {
      ...createDefaultVendorDraft(),
      ...(body.vendorDraft && typeof body.vendorDraft === 'object' ? body.vendorDraft : {}),
    };
    try {
      validateVendorDraftPublicText(draft);
    } catch (error) {
      sendJson(res, 400, { error: error.message });
      return;
    }
    const vendorId = user.vendorId || `vendor_${user.id}`;
    const existingIndex = db.vendors.findIndex((item) => item.id === vendorId);
    const priceFrom = Number(String(draft.priceFrom || '').replace(/[^\d]/g, '')) || 0;
    const packages = [
      draft.basePackageDetails || draft.basePackage
        ? {
            name: 'Базовый',
            price: parseMoney(draft.basePackagePrice) || priceFrom,
            details: String(draft.basePackageDetails || draft.basePackage),
          }
        : null,
      draft.standardPackageDetails || draft.standardPackage
        ? {
            name: 'Стандарт',
            price: parseMoney(draft.standardPackagePrice) || Math.round(priceFrom * 1.5),
            details: String(draft.standardPackageDetails || draft.standardPackage),
          }
        : null,
      draft.premiumPackageDetails || draft.premiumPackage
        ? {
            name: 'Премиум',
            price: parseMoney(draft.premiumPackagePrice) || Math.round(priceFrom * 2),
            details: String(draft.premiumPackageDetails || draft.premiumPackage),
          }
        : null,
    ].filter(Boolean);
    const vendor = {
      ...(existingIndex >= 0 ? db.vendors[existingIndex] : createSeedVendors()[5]),
      id: vendorId,
      name: String(draft.name || 'Новый поставщик'),
      category: normalizeVendorCategory(draft.category),
      city: String(draft.city || 'Алматы'),
      priceFrom,
      contactPhone: String(draft.phone || '+77015550101'),
      description: String(
        draft.description ||
          draft.included ||
          'Описание появится после заполнения профиля поставщика.',
      ),
      experience: Number(draft.experience) || 0,
      rating: 0,
      reviewCount: 0,
      reviews: [],
      weddings: 0,
      portfolioCount: Array.isArray(user.uploadedMedia) ? user.uploadedMedia.length : 0,
      packages: packages.length
        ? packages
        : [],
      verified: true,
      availability: getNearestFreeAvailability(
        normalizeVendorCalendar(db.vendorCalendars?.[vendorId]).busyDates,
        normalizeVendorCalendar(db.vendorCalendars?.[vendorId]).freeDates,
      ),
    };
    if (existingIndex >= 0) {
      db.vendors[existingIndex] = vendor;
    } else {
      db.vendors.unshift(vendor);
    }
    user.vendorId = vendorId;
    user.vendorDraft = {
      ...draft,
      category: normalizeVendorCategory(draft.category),
    };
    user.profileCreated = true;
    syncVendorMediaFromUser(db, user);
    await writeDb(db);
    sendJson(res, 200, {
      user: publicUser(user, db),
      vendor,
      vendors: db.vendors,
    });
    return;
  }

  const userVendorCalendarMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/vendor-calendar$/);
  if (userVendorCalendarMatch && req.method === 'GET') {
    const user = requireUser(req, res, db, userVendorCalendarMatch[1]);
    if (!user) return;
    const vendorId = user.vendorId || `vendor_${user.id}`;
    sendJson(res, 200, {
      calendar: normalizeVendorCalendar(db.vendorCalendars[vendorId]),
    });
    return;
  }

  if (userVendorCalendarMatch && req.method === 'PATCH') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userVendorCalendarMatch[1]);
    if (!user) return;
    const vendorId = user.vendorId || `vendor_${user.id}`;
    db.vendorCalendars[vendorId] = normalizeVendorCalendar(body);
    await writeDb(db);
    sendJson(res, 200, {
      calendar: db.vendorCalendars[vendorId],
      vendors: publicVendors(db),
    });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
}

function shouldLockStateForRequest(req) {
  return (
    shouldUsePostgresDb() &&
    !['GET', 'HEAD', 'OPTIONS'].includes(String(req.method || '').toUpperCase())
  );
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api') || url.pathname === '/health') {
    const apiTask = shouldLockStateForRequest(req)
      ? withPostgresStateLock(() => handleApi(req, res))
      : handleApi(req, res);
    apiTask.catch((error) => {
      const statusCode = Number(error.statusCode || 0);
      const publicStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
      if (publicStatus >= 500) {
        console.error(
          'SERVER_ERROR',
          JSON.stringify({
            event: 'server_error',
            method: String(req.method || '').slice(0, 12),
            path: url.pathname.slice(0, 200),
            message: sanitizeDiagnosticText(error?.message, 500) || 'Unknown server error',
            receivedAt: new Date().toISOString(),
          }),
        );
      }
      sendJson(
        res,
        publicStatus,
        getPublicErrorPayload(
          error,
          publicStatus >= 500 ? 'Внутренняя ошибка сервера' : error.message || 'Ошибка запроса',
        ),
      );
    });
    return;
  }

  const legalPages = {
    '/account-deletion': 'account-deletion.html',
    '/admin': 'admin.html',
    '/privacy': 'privacy.html',
    '/privacy-policy': 'privacy.html',
    '/support': 'support.html',
    '/terms': 'terms.html',
  };
  if (legalPages[url.pathname]) {
    sendFile(res, path.join(LEGAL_DIR, legalPages[url.pathname]));
    return;
  }

  if (url.pathname.startsWith('/uploads/')) {
    const requestedUploadPath = path
      .normalize(decodeURIComponent(url.pathname.replace(/^\/uploads\/?/, '')))
      .replace(/^(\.\.[/\\])+/, '')
      .replace(/^[/\\]/, '');
    const uploadFilePath = path.join(UPLOADS_DIR, requestedUploadPath);
    if (
      uploadFilePath.startsWith(UPLOADS_DIR) &&
      fs.existsSync(uploadFilePath) &&
      fs.statSync(uploadFilePath).isFile()
    ) {
      sendFile(res, uploadFilePath);
      return;
    }
    sendJson(res, 404, { error: 'Upload not found' });
    return;
  }

  const requestedPath = path
    .normalize(decodeURIComponent(url.pathname))
    .replace(/^(\.\.[/\\])+/, '')
    .replace(/^[/\\]/, '');
  const filePath =
    requestedPath === '/'
      ? path.join(DIST_DIR, 'index.html')
      : path.join(DIST_DIR, requestedPath);

  if (filePath.startsWith(DIST_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    sendFile(res, filePath);
    return;
  }

  sendFile(res, path.join(DIST_DIR, 'index.html'));
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`SVADBA app running on http://localhost:${PORT}`);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      flushDbBackup()
        .catch((error) => {
          console.warn('DB backup flush failed:', error.message || error);
        })
        .finally(() => process.exit(0));
    });
  }
}

module.exports = {
  getPublicUploadError,
  normalizeUserMediaContentType,
  sniffMediaContentType,
  normalizeClientErrorPayload,
  validateMediaBytes,
  validatePublicText,
};
