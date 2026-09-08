const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 4000);
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const LEGAL_DIR = path.join(__dirname, 'legal');

loadEnvFile();

const initialDb = {
  users: [],
  emailVerifications: {},
  bookings: [],
  accountDeletionRequests: [],
  contentReports: [],
  instagramConnections: {},
  instagramOAuthStates: {},
  vendorCalendars: {},
  categories: [
    'Ведущие',
    'Организаторы',
    'Декор',
    'Банкетные залы',
    'Фото',
    'Видео',
    'Артисты',
    'DJ',
    'Платья',
    'Костюмы',
    'Авто',
    'Флористика',
    'Торты',
    'Полиграфия',
    'Свет и звук',
    'Шоу',
    'Ювелирные изделия',
  ],
  vendors: createSeedVendors(),
  vendorSettings: [
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
  ],
  instagramMedia: [
    { id: 'ig1', type: 'video', title: 'Ведущий на банкете', imageKey: 'host' },
    { id: 'ig2', type: 'video', title: 'Танцевальный блок', imageKey: 'dj' },
    { id: 'ig3', type: 'image', title: 'Оформление сцены', imageKey: 'decor' },
    { id: 'ig4', type: 'image', title: 'Отзывы гостей', imageKey: 'photo' },
  ],
};

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2));
  }
}

function readDb() {
  ensureDb();
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  if (!db.emailVerifications) db.emailVerifications = {};
  if (!Array.isArray(db.bookings)) db.bookings = [];
  if (!Array.isArray(db.accountDeletionRequests)) db.accountDeletionRequests = [];
  if (!Array.isArray(db.contentReports)) db.contentReports = [];
  if (!db.instagramConnections || typeof db.instagramConnections !== 'object') {
    db.instagramConnections = {};
  }
  if (!db.instagramOAuthStates || typeof db.instagramOAuthStates !== 'object') {
    db.instagramOAuthStates = {};
  }
  if (!db.vendorCalendars || typeof db.vendorCalendars !== 'object') {
    db.vendorCalendars = {};
  }
  if (!Array.isArray(db.categories) || db.categories.length < initialDb.categories.length) {
    db.categories = initialDb.categories;
  }
  if (!Array.isArray(db.vendorSettings) || db.vendorSettings.length === 0) {
    db.vendorSettings = initialDb.vendorSettings;
  }
  if (!Array.isArray(db.instagramMedia) || db.instagramMedia.length === 0) {
    db.instagramMedia = initialDb.instagramMedia;
  }
  if (!Array.isArray(db.vendors) || db.vendors.length === 0) {
    db.vendors = createSeedVendors();
  }
  db.vendors = db.vendors.map((vendor) => {
    const defaultFeatured = getDefaultVendorFeatured(vendor.id);
    return {
      ...vendor,
      ...(vendor.featured || !defaultFeatured ? {} : { featured: defaultFeatured }),
    };
  });
  ensureReviewUsers(db);
  return db;
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
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

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(payload));
}

function getPublicOrigin(req) {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  }

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || (req.socket.encrypted ? 'https' : 'http');
  return `${proto}://${req.headers.host}`;
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
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
    });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function readInstagramConnectionForPublic(userId) {
  try {
    if (!fs.existsSync(DB_PATH)) return null;
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    return db.instagramConnections?.[userId] || null;
  } catch {
    return null;
  }
}

function publicUser(user) {
  if (!user) return null;
  const instagramConnection = readInstagramConnectionForPublic(user.id);
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    authToken: user.authToken || null,
    profileCreated: user.profileCreated,
    vendorId: user.vendorId || null,
    vendorDraft: user.vendorDraft,
    selectedImportIds: user.selectedImportIds,
    instagramHandle: user.instagramHandle,
    instagramConnected: Boolean(instagramConnection),
    instagramProfile: instagramConnection
      ? {
          username: instagramConnection.username,
          accountType: instagramConnection.accountType,
          mediaCount: instagramConnection.mediaCount,
          mode: instagramConnection.mode,
          connectedAt: instagramConnection.connectedAt,
        }
      : null,
    eventDraft: user.eventDraft || createDefaultEventDraft(),
    bookings: user.bookings || [],
    blockedVendorIds: user.blockedVendorIds || [],
    savedVendorIds: user.savedVendorIds || [],
    uploadedMedia: user.uploadedMedia || [],
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
  };
}

function createDefaultVendorDraft() {
  return {
    name: 'kairkuka',
    city: 'Алматы',
    category: 'Ведущие',
    priceFrom: '320000',
    phone: '+77015550101',
  };
}

function createDefaultEventDraft() {
  return {
    type: 'Кыз узату',
    date: '7 сентября',
    city: 'Алматы',
    guests: '120',
    budget: '3 500 000 тг',
    place: 'Пока выбираем',
    comment: 'Нужны ведущий, декор и фото.',
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

function sortVendorsForClients(vendors) {
  return [...vendors].sort((a, b) => {
    const priorityDelta = getVendorFeaturedPriority(b) - getVendorFeaturedPriority(a);
    if (priorityDelta !== 0) return priorityDelta;

    const ratingDelta = Number(b.rating || 0) - Number(a.rating || 0);
    if (ratingDelta !== 0) return ratingDelta;

    return Number(b.reviewCount || 0) - Number(a.reviewCount || 0);
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
    ['v1', 'Aigerim Decor Studio', 'Декор', 'Алматы', 4.9, 280000, 6, 184, 'Свободна 24 августа', 42, 'decor', videos.decor],
    ['v2', 'Timur Photo', 'Фото', 'Алматы', 4.8, 180000, 8, 260, 'Свободен 7 сентября', 58, 'photo', videos.photo],
    ['v3', 'Royal Band', 'Артисты', 'Астана', 4.7, 420000, 5, 140, 'Свободны 31 августа', 37, 'band', videos.band],
    ['v4', 'Grand Hall Almaty', 'Банкетные залы', 'Алматы', 4.9, 950000, 11, 620, 'Свободен 18 сентября', 76, 'hall', videos.hall],
    ['v5', 'Qazaq Film', 'Видео', 'Шымкент', 4.8, 240000, 7, 210, 'Свободен 12 сентября', 44, 'film', videos.film],
    ['v6', 'Arman Event', 'Ведущие', 'Алматы', 4.9, 320000, 9, 265, 'Свободен 7 сентября', 46, 'host', videos.host],
    ['v7', 'Sweet Art Cake', 'Торты', 'Алматы', 4.7, 95000, 5, 133, 'Свободна 3 сентября', 29, 'cake', videos.cake],
    ['v8', 'Maison Flora', 'Флористика', 'Астана', 4.9, 145000, 6, 176, 'Свободна 10 сентября', 33, 'florist', videos.florist],
    ['v9', 'DJ Sultan', 'DJ', 'Алматы', 4.6, 160000, 8, 310, 'Свободен 28 августа', 52, 'dj', videos.dj],
    ['v10', 'Premium Auto KZ', 'Авто', 'Алматы', 4.8, 120000, 4, 118, 'Свободны 2 сентября', 24, 'car', videos.car],
  ];

  return base.map(([id, name, category, city, rating, priceFrom, experience, weddings, availability, portfolioCount, imageKey, shortVideoUrl], index) => {
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
      reviewCount: index === 5 ? 38 : 12 + index * 3,
      shortVideoUrl,
      imageKey,
      portfolioImageKeys: [imageKey, index % 2 === 0 ? 'hall' : 'decor', index % 3 === 0 ? 'photo' : 'florist'],
      description:
        'Проверенный подрядчик для мероприятий: понятные условия, живые медиа, быстрый ответ и аккуратная работа с датой.',
      packages: [
        {
          name: 'Базовый',
          price: priceFrom,
          details: 'Основная услуга, консультация и подготовка.',
        },
        {
          name: 'Расширенный',
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
  if (!token || user.authToken !== token) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return null;
  }

  return user;
}

function createVerificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

async function sendVerificationEmail({ code, email }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName = process.env.SENDGRID_FROM_NAME || 'SVADBA.kz';
  const sendgridBaseUrl =
    process.env.SENDGRID_BASE_URL || 'https://api.sendgrid.com';

  if (!apiKey || !fromEmail) {
    return { sent: false, reason: 'missing_sendgrid_config' };
  }

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
      subject: 'Код подтверждения SVADBA.kz',
      content: [
        {
          type: 'text/plain',
          value: `Ваш код подтверждения SVADBA.kz: ${code}. Код действует 10 минут.`,
        },
        {
          type: 'text/html',
          value: `
            <div style="font-family:Arial,sans-serif;background:#0A1114;color:#ffffff;padding:24px;border-radius:16px">
              <h1 style="margin:0 0 12px;font-size:24px">SVADBA.kz</h1>
              <p style="margin:0 0 16px;color:#c7d0d9">Ваш код подтверждения:</p>
              <div style="font-size:36px;font-weight:700;letter-spacing:6px">${code}</div>
              <p style="margin:18px 0 0;color:#8f9aa5">Код действует 10 минут.</p>
            </div>
          `,
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`SendGrid ${response.status}: ${details}`);
  }

  return { sent: true };
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
    selectedImportIds: ['ig1', 'ig2'],
    instagramHandle: '@kairkuka',
    eventDraft: createDefaultEventDraft(),
    bookings: [],
    blockedVendorIds: [],
    savedVendorIds: [],
    uploadedMedia: [],
  };
}

function normalizeInstagramHandle(handle) {
  return String(handle || '@kairkuka').trim().replace(/^@/, '') || 'kairkuka';
}

function getInstagramRedirectUri(req) {
  return (
    process.env.INSTAGRAM_REDIRECT_URI ||
    `${process.env.PUBLIC_BASE_URL || getPublicOrigin(req)}/api/instagram/callback`
  );
}

function getInstagramConfig(req) {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  return {
    clientId,
    clientSecret,
    enabled: Boolean(clientId && clientSecret),
    redirectUri: getInstagramRedirectUri(req),
    scope:
      process.env.INSTAGRAM_SCOPE ||
      'instagram_business_basic,instagram_business_manage_insights',
  };
}

function createInstagramAuthUrl({ req, state }) {
  const config = getInstagramConfig(req);
  const authUrl = new URL('https://api.instagram.com/oauth/authorize');
  authUrl.searchParams.set('enable_fb_login', '0');
  authUrl.searchParams.set('force_authentication', '1');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', config.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', config.scope);
  authUrl.searchParams.set('state', state);
  return authUrl.toString();
}

function buildDemoInstagramMedia(handle, mediaSeed = initialDb.instagramMedia) {
  const cleanHandle = normalizeInstagramHandle(handle);
  const extra = [
    { id: 'ig5', type: 'video', title: 'Reels: живой фрагмент', imageKey: 'host' },
    { id: 'ig6', type: 'image', title: 'Фото с мероприятия', imageKey: 'hall' },
    { id: 'ig7', type: 'video', title: 'Backstage подготовки', imageKey: 'dj' },
    { id: 'ig8', type: 'image', title: 'Команда и детали', imageKey: 'decor' },
  ];
  return [...mediaSeed, ...extra].map((item, index) => ({
    ...item,
    id: `${cleanHandle}_${item.id}`,
    providerMediaId: `${cleanHandle}_${item.id}`,
    caption: `${item.title}. Импортировано из Instagram @${cleanHandle}.`,
    mediaUrl: '',
    thumbnailUrl: '',
    sourceUrl: `https://www.instagram.com/${cleanHandle}/demo-${index + 1}`,
    permalink: `https://www.instagram.com/${cleanHandle}/demo-${index + 1}`,
    timestamp: new Date(Date.now() - index * 86400000).toISOString(),
    source: 'demo',
  }));
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
  const title =
    caption.split(/\r?\n/)[0]?.slice(0, 70) ||
    (type === 'video' ? 'Instagram Reels' : 'Instagram post');
  const sourceUrl =
    item.permalink ||
    item.sourceUrl ||
    `https://www.instagram.com/${normalizeInstagramHandle(handle)}/media-${index + 1}`;

  return {
    id: String(item.id || item.providerMediaId || `ig_${Date.now()}_${index}`),
    providerMediaId: String(item.id || item.providerMediaId || `ig_${index}`),
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
  };
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

async function fetchInstagramProfile(accessToken) {
  const profileUrl = new URL('https://graph.instagram.com/me');
  profileUrl.searchParams.set('fields', 'id,username,account_type,media_count');
  profileUrl.searchParams.set('access_token', accessToken);
  const response = await fetch(profileUrl);
  if (!response.ok) {
    throw new Error(`Instagram profile ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function fetchInstagramMedia(accessToken, handle) {
  const mediaUrl = new URL('https://graph.instagram.com/me/media');
  mediaUrl.searchParams.set(
    'fields',
    'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
  );
  mediaUrl.searchParams.set('limit', '50');
  mediaUrl.searchParams.set('access_token', accessToken);
  const response = await fetch(mediaUrl);
  if (!response.ok) {
    throw new Error(`Instagram media ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  return (payload.data || []).map((item, index) =>
    normalizeInstagramMediaItem(item, index, handle),
  );
}

function createUploadedMediaFromInstagram(item, index, currentMediaCount) {
  const type = item.type === 'video' ? 'video' : 'image';
  return {
    id: `instagram_${Date.now()}_${index}`,
    uri: item.mediaUrl || item.thumbnailUrl || item.sourceUrl,
    type,
    fileName: `${type}-${item.providerMediaId || item.id}`,
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
    status: item.mediaUrl ? 'uploaded' : 'ready',
  };
}

function ensureReviewUsers(db) {
  const reviewUsers = [
    ['test-auth-1785128770383@svadba.kz', 'vendor'],
    ['review-client@svadba.kz', 'client'],
    ['review-vendor@svadba.kz', 'vendor'],
  ];

  for (const [email, role] of reviewUsers) {
    const existingUser = db.users.find((item) => item.email === email);
    if (existingUser) {
      if (!existingUser.passwordHash) {
        existingUser.passwordHash = hashPassword('123456');
      }
      existingUser.emailVerified = true;
      existingUser.profileCreated = true;
      continue;
    }

    const user = createBaseUser(email, role, hashPassword('123456'));
    user.profileCreated = true;
    db.users.push(user);
  }
}

async function handleApi(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const db = readDb();

  if (req.method === 'GET' && url.pathname === '/health') {
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

      db.instagramConnections[user.id] = {
        mode: 'oauth',
        accessToken: token.accessToken,
        expiresIn: token.expiresIn,
        instagramUserId: String(profile.id || token.instagramUserId || ''),
        username: profile.username || stateRecord.handle || 'instagram',
        accountType: profile.account_type || 'UNKNOWN',
        mediaCount: profile.media_count || 0,
        connectedAt: new Date().toISOString(),
        cachedMedia: [],
      };
      user.instagramHandle = `@${db.instagramConnections[user.id].username}`;
      delete db.instagramOAuthStates[state];
      writeDb(db);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html>
          <body style="background:#0A1114;color:#fff;font-family:Arial,sans-serif;padding:32px">
            <h1>Instagram подключен</h1>
            <p>Можно вернуться в SVADBA.kz и нажать “Обновить медиа”.</p>
          </body>
        </html>
      `);
    } catch (error) {
      res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>Ошибка Instagram</h1><p>${String(error.message || error)}</p>`);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/bootstrap') {
    sendJson(res, 200, {
      categories: db.categories,
      vendors: sortVendorsForClients(db.vendors),
      vendorSettings: db.vendorSettings,
      instagramMedia: db.instagramMedia,
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/vendors') {
    sendJson(res, 200, { vendors: sortVendorsForClients(db.vendors) });
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
    writeDb(db);
    sendJson(res, 200, { ok: true, request });
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
    if (!config.enabled || body.demo === true) {
      const demoMedia = buildDemoInstagramMedia(handle, db.instagramMedia);
      db.instagramConnections[user.id] = {
        mode: 'demo',
        username: handle,
        accountType: 'BUSINESS',
        mediaCount: demoMedia.length,
        connectedAt: new Date().toISOString(),
        cachedMedia: demoMedia,
      };
      user.instagramHandle = `@${handle}`;
      writeDb(db);
      sendJson(res, 200, {
        mode: 'demo',
        authUrl: null,
        message: 'Instagram demo подключен. Добавьте INSTAGRAM_CLIENT_ID/SECRET для OAuth.',
        user: publicUser(user),
      });
      return;
    }

    const state = `ig_${Date.now()}_${crypto.randomBytes(12).toString('hex')}`;
    db.instagramOAuthStates[state] = {
      userId: user.id,
      handle,
      createdAt: new Date().toISOString(),
    };
    writeDb(db);
    sendJson(res, 200, {
      mode: 'oauth',
      authUrl: createInstagramAuthUrl({ req, state }),
      message: 'Откройте Instagram Login и подтвердите доступ.',
    });
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
    let connection = db.instagramConnections[user.id];
    if (!connection) {
      const demoMedia = buildDemoInstagramMedia(handle, db.instagramMedia);
      connection = {
        mode: 'demo',
        username: handle,
        accountType: 'BUSINESS',
        mediaCount: demoMedia.length,
        connectedAt: new Date().toISOString(),
        cachedMedia: demoMedia,
      };
      db.instagramConnections[user.id] = connection;
      user.instagramHandle = `@${handle}`;
    }

    let items = connection.cachedMedia || [];
    let status = connection.mode || 'demo';
    if (connection.mode === 'oauth' && connection.accessToken) {
      try {
        items = await fetchInstagramMedia(connection.accessToken, connection.username || handle);
        connection.cachedMedia = items;
        connection.mediaCount = items.length;
        connection.lastSyncedAt = new Date().toISOString();
      } catch (error) {
        status = 'oauth_error_demo_fallback';
        items = items.length ? items : buildDemoInstagramMedia(handle, db.instagramMedia);
        connection.cachedMedia = items;
        connection.lastError = String(error.message || error);
      }
    }

    writeDb(db);
    sendJson(res, 200, {
      status,
      profile: {
        username: connection.username || handle,
        accountType: connection.accountType || 'BUSINESS',
        mediaCount: connection.mediaCount || items.length,
        mode: connection.mode || 'demo',
      },
      items,
    });
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
    const cachedMedia = connection?.cachedMedia || buildDemoInstagramMedia(user.instagramHandle, db.instagramMedia);
    const requestedIds = Array.isArray(body.itemIds)
      ? body.itemIds.map((item) => String(item))
      : [];
    const selectedItems = cachedMedia.filter(
      (item) => requestedIds.includes(String(item.id)) || requestedIds.includes(String(item.providerMediaId)),
    );
    const itemsToImport = selectedItems.length ? selectedItems : cachedMedia.slice(0, 4);
    const existingMedia = user.uploadedMedia || [];
    const existingSources = new Set(existingMedia.map((item) => item.sourceUrl || item.uri));
    const importedMedia = itemsToImport
      .map((item, index) =>
        createUploadedMediaFromInstagram(item, index, existingMedia.length),
      )
      .filter((item) => !existingSources.has(item.sourceUrl || item.uri));

    user.uploadedMedia = [...existingMedia, ...importedMedia];
    user.selectedImportIds = itemsToImport.map((item) => String(item.id));
    user.instagramHandle = `@${normalizeInstagramHandle(connection?.username || user.instagramHandle)}`;
    writeDb(db);
    sendJson(res, 200, {
      user: publicUser(user),
      importedMedia,
      importedCount: importedMedia.length,
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/instagram/import-preview') {
    const body = await readBody(req);
    const handle = String(body.handle || '@kairkuka').trim() || '@kairkuka';
    const urls = Array.isArray(body.urls)
      ? body.urls.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const cleanHandle = handle.replace(/^@/, '') || 'kairkuka';
    const mediaSeed = db.instagramMedia.length ? db.instagramMedia : initialDb.instagramMedia;
    const items = mediaSeed.map((item, index) => ({
      ...item,
      sourceUrl: urls[index] || `https://www.instagram.com/${cleanHandle}/import-${index + 1}`,
    }));

    sendJson(res, 200, {
      jobId: `ig_job_${Date.now()}`,
      status: 'ready',
      items,
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
        selectedImportIds: ['ig1', 'ig2'],
        instagramHandle: '@kairkuka',
        eventDraft: createDefaultEventDraft(),
        bookings: [],
        blockedVendorIds: [],
        savedVendorIds: [],
        uploadedMedia: [],
      };
      db.users.push(user);
    } else {
      user.role = role;
    }
    issueSession(user);

    writeDb(db);
    sendJson(res, 200, { user: publicUser(user) });
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

    const code = createVerificationCode();
    db.emailVerifications[email] = {
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
      sendJson(res, 502, {
        error: 'Email delivery failed',
        details: error.message,
      });
      return;
    }
    writeDb(db);

    sendJson(res, 200, {
      ok: true,
      emailSent: emailResult.sent,
      message: emailResult.sent
        ? 'Verification code sent'
        : 'Verification code generated in test mode',
      verificationCode: emailResult.sent ? undefined : code,
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
      sendJson(res, 400, { error: 'Invalid code' });
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
    writeDb(db);
    sendJson(res, 200, { user: publicUser(user) });
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
    writeDb(db);
    sendJson(res, 200, { user: publicUser(user) });
    return;
  }

  const adminVendorFeaturedMatch = url.pathname.match(
    /^\/api\/admin\/vendors\/([^/]+)\/featured$/,
  );
  if (adminVendorFeaturedMatch && req.method === 'PATCH') {
    const adminToken = process.env.MODERATION_ADMIN_TOKEN;
    if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

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

    writeDb(db);
    sendJson(res, 200, { vendor });
    return;
  }

  const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch && req.method === 'GET') {
    const user = requireUser(req, res, db, userMatch[1]);
    if (!user) return;
    sendJson(res, 200, { user: publicUser(user) });
    return;
  }

  if (userMatch && req.method === 'PATCH') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userMatch[1]);
    if (!user) return;

    if (body.role === 'client' || body.role === 'vendor') user.role = body.role;
    if (typeof body.profileCreated === 'boolean') {
      user.profileCreated = body.profileCreated;
    }
    if (body.vendorDraft && typeof body.vendorDraft === 'object') {
      user.vendorDraft = { ...user.vendorDraft, ...body.vendorDraft };
    }
    if (Array.isArray(body.selectedImportIds)) {
      user.selectedImportIds = body.selectedImportIds;
    }
    if (typeof body.instagramHandle === 'string') {
      user.instagramHandle = body.instagramHandle;
    }
    if (body.eventDraft && typeof body.eventDraft === 'object') {
      user.eventDraft = {
        ...(user.eventDraft || createDefaultEventDraft()),
        ...body.eventDraft,
      };
    }
    if (Array.isArray(body.bookings)) {
      user.bookings = body.bookings;
    }
    if (Array.isArray(body.savedVendorIds)) {
      user.savedVendorIds = body.savedVendorIds;
    }
    if (Array.isArray(body.blockedVendorIds)) {
      user.blockedVendorIds = body.blockedVendorIds;
    }
    if (Array.isArray(body.uploadedMedia)) {
      user.uploadedMedia = body.uploadedMedia;
    }

    writeDb(db);
    sendJson(res, 200, { user: publicUser(user) });
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
    writeDb(db);
    sendJson(res, 200, { user: publicUser(user) });
    return;
  }

  const userReportsMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/content-reports$/);
  if (userReportsMatch && req.method === 'POST') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userReportsMatch[1]);
    if (!user) return;
    const vendorId = String(body.vendorId || '');
    if (!db.vendors.some((item) => item.id === vendorId)) {
      sendJson(res, 404, { error: 'Vendor not found' });
      return;
    }
    const report = {
      id: `report_${Date.now()}`,
      reporterId: user.id,
      reporterEmail: user.email,
      vendorId,
      reason: String(body.reason || 'Неподходящий контент').trim(),
      details: String(body.details || '').trim(),
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    db.contentReports.unshift(report);
    writeDb(db);
    sendJson(res, 200, { ok: true, report });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/content-reports') {
    const adminToken = process.env.MODERATION_ADMIN_TOKEN;
    if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }
    sendJson(res, 200, {
      reports: db.contentReports || [],
      deletionRequests: db.accountDeletionRequests || [],
    });
    return;
  }

  if (userMatch && req.method === 'DELETE') {
    const user = requireUser(req, res, db, userMatch[1]);
    if (!user) return;
    db.users = db.users.filter((item) => item.id !== user.id);
    db.bookings = db.bookings.filter((item) => item.clientId !== user.id);
    if (user.vendorId) {
      db.vendors = db.vendors.filter((item) => item.id !== user.vendorId);
      delete db.vendorCalendars[user.vendorId];
      db.bookings = db.bookings.filter((item) => item.vendorId !== user.vendorId);
    }
    writeDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  const userSavedMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/saved-vendors$/);
  if (userSavedMatch && req.method === 'POST') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userSavedMatch[1]);
    const vendorId = String(body.vendorId || '');
    if (!user) return;
    const savedVendorIds = user.savedVendorIds || [];
    user.savedVendorIds = savedVendorIds.includes(vendorId)
      ? savedVendorIds.filter((id) => id !== vendorId)
      : [...savedVendorIds, vendorId];
    writeDb(db);
    sendJson(res, 200, { user: publicUser(user) });
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
    const vendor = db.vendors.find((item) => item.id === body.vendorId);
    if (!user) return;
    if (!vendor) {
      sendJson(res, 404, { error: 'Vendor not found' });
      return;
    }
    const booking = {
      id: `booking_${Date.now()}`,
      date: String(body.date || vendor.availability || 'Дата не выбрана'),
      timeFrom: String(body.timeFrom || '18:00'),
      timeTo: String(body.timeTo || '23:00'),
      status: 'Ожидает подтверждения',
      vendorId: vendor.id,
      vendorName: vendor.name,
      clientId: user.id,
      clientEmail: user.email,
      clientName: user.eventDraft?.type || 'Клиент',
      amount: `от ${Number(vendor.priceFrom).toLocaleString('ru-RU')} тг`,
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
    writeDb(db);
    sendJson(res, 200, { user: publicUser(user), booking: publicBooking(booking) });
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

  const bookingStatusMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/vendor-requests\/([^/]+)$/);
  if (bookingStatusMatch && req.method === 'PATCH') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, bookingStatusMatch[1]);
    if (!user) return;
    const vendorId = user.vendorId || `vendor_${user.id}`;
    const booking = db.bookings.find(
      (item) => item.id === bookingStatusMatch[2] && item.vendorId === vendorId,
    );
    if (!booking) {
      sendJson(res, 404, { error: 'Booking not found' });
      return;
    }
    const nextStatus = String(body.status || booking.status);
    booking.status = nextStatus;
    const client = db.users.find((item) => item.id === booking.clientId);
    if (client) {
      client.bookings = (client.bookings || []).map((item) =>
        item.id === booking.id ? { ...item, status: nextStatus } : item,
      );
    }
    writeDb(db);
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
    const vendorId = user.vendorId || `vendor_${user.id}`;
    const existingIndex = db.vendors.findIndex((item) => item.id === vendorId);
    const vendor = {
      ...(existingIndex >= 0 ? db.vendors[existingIndex] : createSeedVendors()[5]),
      id: vendorId,
      name: String(draft.name || 'Новый поставщик'),
      category: String(draft.category || 'Ведущие'),
      city: String(draft.city || 'Алматы'),
      priceFrom: Number(draft.priceFrom) || 0,
      contactPhone: String(draft.phone || '+77015550101'),
      verified: true,
      availability: 'Свободен 7 сентября',
    };
    if (existingIndex >= 0) {
      db.vendors[existingIndex] = vendor;
    } else {
      db.vendors.unshift(vendor);
    }
    user.vendorId = vendorId;
    user.vendorDraft = draft;
    user.profileCreated = true;
    writeDb(db);
    sendJson(res, 200, {
      user: publicUser(user),
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
      calendar: db.vendorCalendars[vendorId] || { busyDates: [] },
    });
    return;
  }

  if (userVendorCalendarMatch && req.method === 'PATCH') {
    const body = await readBody(req);
    const user = requireUser(req, res, db, userVendorCalendarMatch[1]);
    if (!user) return;
    const vendorId = user.vendorId || `vendor_${user.id}`;
    const busyDates = Array.isArray(body.busyDates)
      ? body.busyDates.map((item) => String(item)).filter(Boolean)
      : [];
    db.vendorCalendars[vendorId] = { busyDates };
    writeDb(db);
    sendJson(res, 200, { calendar: db.vendorCalendars[vendorId] });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api') || url.pathname === '/health') {
    handleApi(req, res).catch((error) => {
      sendJson(res, 500, { error: error.message || 'Server error' });
    });
    return;
  }

  const legalPages = {
    '/account-deletion': 'account-deletion.html',
    '/privacy': 'privacy.html',
    '/privacy-policy': 'privacy.html',
    '/support': 'support.html',
    '/terms': 'terms.html',
  };
  if (legalPages[url.pathname]) {
    sendFile(res, path.join(LEGAL_DIR, legalPages[url.pathname]));
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

server.listen(PORT, () => {
  console.log(`SVADBA app running on http://localhost:${PORT}`);
});
