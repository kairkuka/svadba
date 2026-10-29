const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DeleteObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
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

function getEnv(name) {
  return String(process.env[name] || '').trim();
}

function isPlaceholder(value) {
  const normalized = String(value || '').toLowerCase();
  return (
    !normalized ||
    normalized.includes('replace') ||
    normalized.includes('example.com') ||
    normalized.includes('user:password') ||
    normalized.includes('...')
  );
}

function looksLikeHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function addRequired(results, name, description, predicate = (value) => !isPlaceholder(value)) {
  const value = getEnv(name);
  if (predicate(value)) {
    results.ok.push({ name, description });
  } else {
    results.errors.push({ name, description });
  }
}

function addWarning(results, name, description, predicate = (value) => !isPlaceholder(value)) {
  const value = getEnv(name);
  if (predicate(value)) {
    results.ok.push({ name, description });
  } else {
    results.warnings.push({ name, description });
  }
}

function hasSendGridEmail() {
  return !isPlaceholder(getEnv('SENDGRID_API_KEY')) && !isPlaceholder(getEnv('SENDGRID_FROM_EMAIL'));
}

function hasSmtpEmail() {
  return (
    !isPlaceholder(getEnv('SMTP_HOST')) &&
    !isPlaceholder(getEnv('SMTP_USER')) &&
    !isPlaceholder(getEnv('SMTP_PASS')) &&
    !isPlaceholder(getEnv('SMTP_FROM_EMAIL'))
  );
}

function hasAwsCredentialsHint() {
  return Boolean(
    getEnv('AWS_ACCESS_KEY_ID') ||
      getEnv('AWS_PROFILE') ||
      getEnv('AWS_WEB_IDENTITY_TOKEN_FILE') ||
      getEnv('AWS_CONTAINER_CREDENTIALS_RELATIVE_URI') ||
      getEnv('AWS_CONTAINER_CREDENTIALS_FULL_URI'),
  );
}

async function checkPostgresLive(results) {
  const pool = new Pool({
    connectionString: getEnv('DATABASE_URL'),
    ssl: getEnv('DATABASE_SSL') === '1' ? { rejectUnauthorized: false } : undefined,
  });
  try {
    await pool.query('SELECT 1');
    const tableResult = await pool.query("SELECT to_regclass('public.app_state') AS table_name");
    const hasAppState = Boolean(tableResult.rows[0]?.table_name);
    if (!hasAppState) {
      results.errors.push({
        name: 'DATABASE_URL',
        description: 'Postgres доступен, но таблица app_state не создана. Запусти migrate:db:postgres.',
      });
      return;
    }
    const stateKey = getEnv('DATABASE_STATE_KEY') || 'svadba-main';
    const rowResult = await pool.query('SELECT updated_at FROM app_state WHERE key = $1', [
      stateKey,
    ]);
    if (!rowResult.rows.length) {
      results.warnings.push({
        name: 'DATABASE_STATE_KEY',
        description: `Таблица app_state есть, но ключ "${stateKey}" пустой. Нужна миграция данных.`,
      });
    } else {
      results.ok.push({
        name: 'DATABASE_URL',
        description: 'Postgres live-check прошел.',
      });
    }
  } catch (error) {
    results.errors.push({
      name: 'DATABASE_URL',
      description: `Postgres live-check упал: ${error.message || error}`,
    });
  } finally {
    await pool.end().catch(() => {});
  }
}

async function checkS3Live(results) {
  const bucket = getEnv('S3_UPLOAD_BUCKET');
  const prefix = getEnv('S3_UPLOAD_PREFIX') || 'uploads';
  const key = `${prefix.replace(/\/+$/g, '')}/readiness/${Date.now()}-${crypto
    .randomBytes(6)
    .toString('hex')}.txt`;
  const client = new S3Client({
    region: getEnv('AWS_REGION') || getEnv('AWS_DEFAULT_REGION') || 'us-east-1',
  });

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: 'svadba-readiness-check',
        ContentType: 'text/plain; charset=utf-8',
      }),
    );
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    results.ok.push({
      name: 'S3_UPLOAD_BUCKET',
      description: 'S3 live-check write/delete прошел.',
    });
  } catch (error) {
    results.errors.push({
      name: 'S3_UPLOAD_BUCKET',
      description: `S3 live-check упал: ${error.message || error}`,
    });
  }
}

function checkStaticEnv() {
  const results = {
    ok: [],
    warnings: [],
    errors: [],
  };

  addRequired(results, 'PUBLIC_BASE_URL', 'Production backend origin должен быть HTTPS.', looksLikeHttpsUrl);
  addRequired(results, 'DATABASE_URL', 'Postgres обязателен для production.');
  addRequired(results, 'DATABASE_STATE_KEY', 'Ключ app_state фиксирует окружение данных.');
  addRequired(
    results,
    'DATABASE_LOCK_KEY',
    'Advisory lock key фиксирует сериализацию write-запросов.',
    () => true,
  );
  addRequired(results, 'UPLOADS_STORAGE', 'Cloud storage обязателен.', (value) => value === 's3');
  addRequired(results, 'S3_UPLOAD_BUCKET', 'S3 bucket для медиа обязателен.');
  addRequired(results, 'S3_UPLOAD_PREFIX', 'S3 prefix отделяет медиа приложения.');
  addRequired(
    results,
    'UPLOADS_PUBLIC_BASE_URL',
    'Публичный CDN/base URL для медиа должен быть HTTPS.',
    looksLikeHttpsUrl,
  );
  addRequired(results, 'AWS_REGION', 'AWS region нужен для S3.');
  addRequired(
    results,
    'DB_BACKUP_STORAGE',
    'Production DB backups должны идти в S3.',
    (value) => value === 's3',
  );
  addRequired(results, 'DB_BACKUP_BUCKET', 'S3 bucket для backup обязателен.');
  addRequired(
    results,
    'MODERATION_ADMIN_TOKEN',
    'Admin token должен быть длинным секретом.',
    (value) => !isPlaceholder(value) && value.length >= 32,
  );
  addRequired(
    results,
    'INSTAGRAM_TOKEN_ENCRYPTION_KEY',
    'Instagram токены должны храниться шифрованно.',
    (value) => !isPlaceholder(value) && value.length >= 32,
  );
  addRequired(results, 'EXPO_PUSH_URL', 'Expo push endpoint нужен для push-уведомлений.');

  if (hasSendGridEmail() || hasSmtpEmail()) {
    results.ok.push({
      name: 'EMAIL_PROVIDER',
      description: 'Email provider настроен.',
    });
  } else {
    results.errors.push({
      name: 'EMAIL_PROVIDER',
      description: 'Нужен SendGrid или SMTP для реальных кодов email.',
    });
  }

  addRequired(results, 'GOOGLE_WEB_CLIENT_ID', 'Backend должен принимать Google web client id.');
  addRequired(results, 'GOOGLE_IOS_CLIENT_ID', 'Backend должен принимать Google iOS client id.');
  addRequired(results, 'GOOGLE_ANDROID_CLIENT_ID', 'Backend должен принимать Google Android client id.');
  if (
    process.env.EXPO_PUBLIC_SENTRY_DSN ||
    process.env.CLIENT_ERROR_MONITORING === 'cloudwatch'
  ) {
    results.ok.push({
      name: 'ERROR_MONITORING',
      description: process.env.EXPO_PUBLIC_SENTRY_DSN
        ? 'Sentry настроен.'
        : 'Встроенный client/server error monitoring пишет события в CloudWatch.',
    });
  } else {
    results.errors.push({
      name: 'ERROR_MONITORING',
      description: 'Нужен Sentry DSN или CLIENT_ERROR_MONITORING=cloudwatch.',
    });
  }
  addRequired(results, 'APPLE_CLIENT_ID', 'Sign in with Apple service/client id нужен.');
  addRequired(results, 'APPLE_BUNDLE_ID', 'iOS bundle id нужен для Apple auth.');
  addRequired(results, 'APPLE_TEAM_ID', 'Apple Team ID нужен для OAuth code exchange.');
  addRequired(results, 'APPLE_KEY_ID', 'Apple Sign in key id нужен для OAuth code exchange.');
  addRequired(
    results,
    'APPLE_PRIVATE_KEY',
    'Apple .p8 private key нужен для обмена и отзыва токенов.',
    (value) => !isPlaceholder(value) && value.includes('PRIVATE KEY'),
  );
  addRequired(
    results,
    'OAUTH_TOKEN_ENCRYPTION_KEY',
    'OAuth refresh tokens должны храниться шифрованно.',
    (value) => !isPlaceholder(value) && value.length >= 32,
  );
  addRequired(
    results,
    'CORS_ALLOWED_ORIGIN',
    'Production CORS origin должен быть HTTPS и не wildcard.',
    (value) => value !== '*' && looksLikeHttpsUrl(value),
  );
  for (const name of [
    'AUTH_RATE_LIMIT_MAX',
    'UGC_RATE_LIMIT_MAX',
    'UPLOAD_RATE_LIMIT_MAX',
    'BOOKING_RATE_LIMIT_MAX',
    'CLIENT_ERROR_RATE_LIMIT_MAX',
  ]) {
    addRequired(
      results,
      name,
      `${name} должен быть положительным числом.`,
      (value) => Number.isFinite(Number(value)) && Number(value) > 0,
    );
  }
  addRequired(results, 'FACEBOOK_CLIENT_ID', 'Meta/Instagram OAuth client id нужен.');
  addRequired(results, 'FACEBOOK_CLIENT_SECRET', 'Meta/Instagram OAuth secret нужен.');
  addRequired(
    results,
    'FACEBOOK_REDIRECT_URI',
    'Meta redirect URI должен быть HTTPS.',
    looksLikeHttpsUrl,
  );

  addWarning(
    results,
    'EXPO_PUBLIC_API_BASE_URL',
    'Native/web build должен смотреть на production API.',
    looksLikeHttpsUrl,
  );
  addWarning(
    results,
    'EXPO_PUSH_ACCESS_TOKEN',
    'Нужен, если в EAS включена security для push.',
  );
  if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
    addWarning(results, 'SENTRY_ORG', 'Нужен для загрузки sourcemaps в Sentry release builds.');
    addWarning(results, 'SENTRY_PROJECT', 'Нужен для загрузки sourcemaps в Sentry release builds.');
    addWarning(results, 'SENTRY_AUTH_TOKEN', 'Нужен для загрузки sourcemaps в Sentry release builds.');
  }
  addWarning(results, 'SMOKE_CLIENT_EMAIL', 'Нужен для npm run smoke:production.');
  addWarning(results, 'SMOKE_VENDOR_EMAIL', 'Нужен для npm run smoke:production.');
  addWarning(
    results,
    'AWS_CREDENTIALS',
    'AWS credentials не видны в env. Это нормально только если сервер использует IAM role.',
    hasAwsCredentialsHint,
  );

  return results;
}

function printResults(results, asJson) {
  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  console.log('SVADBA.kz production readiness');
  console.log(`OK: ${results.ok.length}`);
  console.log(`WARN: ${results.warnings.length}`);
  console.log(`ERROR: ${results.errors.length}`);

  if (results.errors.length) {
    console.log('\nErrors:');
    for (const item of results.errors) {
      console.log(`- ${item.name}: ${item.description}`);
    }
  }

  if (results.warnings.length) {
    console.log('\nWarnings:');
    for (const item of results.warnings) {
      console.log(`- ${item.name}: ${item.description}`);
    }
  }
}

async function main() {
  loadEnvFile();
  const args = new Set(process.argv.slice(2));
  const live = args.has('--live');
  const asJson = args.has('--json');
  const results = checkStaticEnv();

  if (live && !results.errors.some((item) => item.name === 'DATABASE_URL')) {
    await checkPostgresLive(results);
  }
  if (live && !results.errors.some((item) => item.name === 'S3_UPLOAD_BUCKET')) {
    await checkS3Live(results);
  }

  printResults(results, asJson);
  if (results.errors.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
