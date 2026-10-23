const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function loadEnvFile() {
  for (const envPath of [path.join(__dirname, '.env'), path.join(__dirname, '..', '.env')]) {
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function requiredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`Set ${name} before creating smoke accounts`);
  }
  return value;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(String(password), salt, 120000, 32, 'sha256')
    .toString('hex');
  return `pbkdf2$120000$${salt}$${hash}`;
}

function makeEventDraft() {
  return {
    eventType: '',
    eventDate: '',
    guests: '',
    budget: '',
  };
}

function makeClientProfile(email) {
  return {
    name: email.split('@')[0],
    phone: '',
    city: 'Алматы',
  };
}

function makeVendorDraft() {
  return {
    name: 'SVADBA Smoke Vendor',
    category: 'Ведущие',
    city: 'Алматы',
    priceFrom: '100000',
    phone: '+77015550101',
    description: 'Production smoke test vendor profile.',
  };
}

function makeSmokeUser({ email, id, password, role }) {
  return {
    id,
    email,
    role,
    passwordHash: hashPassword(password),
    emailVerified: true,
    profileCreated: role === 'vendor',
    vendorDraft: makeVendorDraft(),
    vendorSettingsValues: {},
    clientProfile: makeClientProfile(email),
    clientSettingsValues: {},
    selectedImportIds: [],
    instagramHandle: '',
    eventDraft: makeEventDraft(),
    bookings: [],
    blockedVendorIds: [],
    savedVendorIds: [],
    uploadedMedia: [],
    pushTokens: [],
  };
}

function ensureShape(data) {
  return {
    users: [],
    emailVerifications: {},
    bookings: [],
    accountDeletionRequests: [],
    contentReports: [],
    metaCallbacks: [],
    instagramConnections: {},
    instagramOAuthStates: {},
    instagramImportJobs: {},
    vendorAnalytics: {},
    vendorCalendars: {},
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
    vendors: [],
    ...data,
  };
}

async function main() {
  loadEnvFile();
  const databaseUrl = requiredEnv('DATABASE_URL');
  const stateKey = process.env.DATABASE_STATE_KEY || 'svadba-main';
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === '1' ? { rejectUnauthorized: false } : undefined,
  });

  const smokeUsers = [
    {
      email: requiredEnv('SMOKE_CLIENT_EMAIL').toLowerCase(),
      id: 'user_smoke_client',
      password: requiredEnv('SMOKE_CLIENT_PASSWORD'),
      role: 'client',
    },
    {
      email: requiredEnv('SMOKE_VENDOR_EMAIL').toLowerCase(),
      id: 'user_smoke_vendor',
      password: requiredEnv('SMOKE_VENDOR_PASSWORD'),
      role: 'vendor',
    },
  ];

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        key text PRIMARY KEY,
        data jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await pool.query('BEGIN');
    const result = await pool.query('SELECT data FROM app_state WHERE key = $1 FOR UPDATE', [
      stateKey,
    ]);
    const data = ensureShape(result.rows[0]?.data || {});

    for (const smokeUser of smokeUsers) {
      const user = makeSmokeUser(smokeUser);
      const index = data.users.findIndex(
        (item) => item.email === user.email || item.id === user.id,
      );
      if (index === -1) {
        data.users.push(user);
      } else {
        data.users[index] = {
          ...data.users[index],
          ...user,
          authToken: undefined,
          authTokenCreatedAt: undefined,
        };
      }
    }

    await pool.query(
      `INSERT INTO app_state (key, data, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key)
       DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [stateKey, JSON.stringify(data)],
    );
    await pool.query('COMMIT');
    console.log(
      JSON.stringify(
        {
          ok: true,
          stateKey,
          users: smokeUsers.map((user) => ({ email: user.email, role: user.role })),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await pool.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
