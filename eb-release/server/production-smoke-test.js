const fs = require('fs');
const path = require('path');

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
);

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

function requiredEnv(name) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Set ${name} before running production smoke test`);
  }
  return value;
}

function getApiBaseUrl() {
  const explicit = getEnv('SMOKE_API_BASE_URL') || getEnv('EXPO_PUBLIC_API_BASE_URL');
  if (explicit) return explicit.replace(/\/+$/g, '');

  const publicBaseUrl = getEnv('PUBLIC_BASE_URL');
  if (!publicBaseUrl) {
    throw new Error('Set SMOKE_API_BASE_URL or PUBLIC_BASE_URL before running production smoke test');
  }
  return `${publicBaseUrl.replace(/\/+$/g, '')}/api`;
}

function getPublicBaseUrl(apiBaseUrl) {
  return apiBaseUrl.replace(/\/api\/?$/g, '');
}

async function apiRequest(apiBaseUrl, pathName, { body, method = 'GET', token } = {}) {
  const response = await fetch(`${apiBaseUrl}${pathName}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { text };
  }

  if (!response.ok) {
    throw new Error(
      `${method} ${pathName} failed ${response.status}: ${payload.error || payload.message || text}`,
    );
  }

  return payload;
}

async function login(apiBaseUrl, email, password) {
  const { user } = await apiRequest(apiBaseUrl, '/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (!user?.id || !user?.authToken) {
    throw new Error(`Login returned invalid user payload for ${email}`);
  }
  return user;
}

async function registerSmokePushToken(apiBaseUrl, user, role, smokeStamp) {
  const token = `ExponentPushToken[svadba-smoke-${role}-${smokeStamp}]`;
  const result = await apiRequest(apiBaseUrl, `/users/${user.id}/push-tokens`, {
    method: 'POST',
    token: user.authToken,
    body: {
      platform: 'smoke',
      role,
      token,
    },
  });
  if (!result.pushNotifications || result.pushNotifications.registeredTokens < 1) {
    throw new Error(`Push token registration did not update ${role} user`);
  }
  return token;
}

async function unregisterSmokePushToken(apiBaseUrl, user, token) {
  await apiRequest(apiBaseUrl, `/users/${user.id}/push-tokens`, {
    method: 'DELETE',
    token: user.authToken,
    body: { token },
  });
}

function getSmokeDate() {
  const now = new Date();
  const day = String((now.getUTCDate() % 25) + 1).padStart(2, '0');
  const month = String((now.getUTCMonth() % 12) + 1).padStart(2, '0');
  return `2040-${month}-${day}`;
}

async function uploadSmokeMediaDirect(apiBaseUrl, user) {
  const fileName = `smoke-${Date.now()}.png`;
  const contentType = 'image/png';
  const upload = await apiRequest(apiBaseUrl, `/users/${user.id}/media/uploads/presign`, {
    method: 'POST',
    token: user.authToken,
    body: {
      contentType,
      fileName,
      role: 'profile',
      size: ONE_PIXEL_PNG.length,
      type: 'image',
    },
  });
  let uploadResponse;
  if (upload.uploadMethod === 'POST' && upload.uploadFields) {
    const formData = new FormData();
    Object.entries(upload.uploadFields).forEach(([field, value]) => {
      formData.append(field, value);
    });
    formData.append('file', new Blob([ONE_PIXEL_PNG], { type: contentType }), fileName);
    uploadResponse = await fetch(upload.uploadUrl, {
      method: 'POST',
      body: formData,
    });
  } else {
    uploadResponse = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: ONE_PIXEL_PNG,
    });
  }
  if (!uploadResponse.ok) {
    const details = await uploadResponse.text();
    const code =
      details.match(/<Code>([^<]+)<\/Code>/i)?.[1] || `HTTP ${uploadResponse.status}`;
    const message = details.match(/<Message>([^<]+)<\/Message>/i)?.[1] || '';
    throw new Error(
      `Direct S3 ${upload.uploadMethod || 'PUT'} upload failed: ${code}${
        message ? ` (${message})` : ''
      }`,
    );
  }

  const completed = await apiRequest(apiBaseUrl, `/users/${user.id}/media/uploads/complete`, {
    method: 'POST',
    token: user.authToken,
    body: {
      contentType,
      fileName: upload.fileName || fileName,
      key: upload.key,
      role: 'profile',
      type: 'image',
    },
  });
  return { ...completed, uploadMethod: upload.uploadMethod || 'PUT' };
}

async function assertUrlReadable(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Uploaded media URL is not readable: ${response.status}`);
  }
}

function getS3KeyFromStoredUri(uri) {
  const bucket = getEnv('S3_UPLOAD_BUCKET');
  const publicBaseUrl = getEnv('UPLOADS_PUBLIC_BASE_URL').replace(/\/+$/g, '');
  if (!bucket || !uri) return '';

  if (publicBaseUrl && uri.startsWith(`${publicBaseUrl}/`)) {
    return uri.slice(publicBaseUrl.length + 1);
  }

  try {
    const parsed = new URL(uri);
    if (parsed.hostname.startsWith(`${bucket}.s3.`)) {
      return parsed.pathname.replace(/^\/+/, '');
    }
  } catch {
    return '';
  }

  return '';
}

async function headS3Object(key) {
  const bucket = getEnv('S3_UPLOAD_BUCKET');
  if (!bucket || !key) return null;
  const { HeadObjectCommand, S3Client } = require('@aws-sdk/client-s3');
  const client = new S3Client({
    region: getEnv('AWS_REGION') || getEnv('AWS_DEFAULT_REGION') || 'us-east-1',
  });
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    const name = error?.name || '';
    const statusCode = error?.$metadata?.httpStatusCode;
    if (name === 'NotFound' || statusCode === 404) {
      return false;
    }
    throw error;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForS3Deletion(key) {
  if (!key) return null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const exists = await headS3Object(key);
    if (exists === false) return true;
    await delay(1000);
  }
  return false;
}

async function assertPostgresContains(ids) {
  const { Pool } = require('pg');
  const databaseUrl = requiredEnv('DATABASE_URL');
  const stateKey = getEnv('DATABASE_STATE_KEY') || 'svadba-main';
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: getEnv('DATABASE_SSL') === '1' ? { rejectUnauthorized: false } : undefined,
  });
  try {
    const result = await pool.query('SELECT data::text AS data FROM app_state WHERE key = $1', [
      stateKey,
    ]);
    const data = result.rows[0]?.data || '';
    for (const id of ids.filter(Boolean)) {
      if (!data.includes(id)) {
        throw new Error(`Postgres app_state does not contain expected id: ${id}`);
      }
    }
  } finally {
    await pool.end().catch(() => {});
  }
}

async function main() {
  loadEnvFile();
  const apiBaseUrl = getApiBaseUrl();
  const clientEmail = requiredEnv('SMOKE_CLIENT_EMAIL');
  const clientPassword = requiredEnv('SMOKE_CLIENT_PASSWORD');
  const vendorEmail = requiredEnv('SMOKE_VENDOR_EMAIL');
  const vendorPassword = requiredEnv('SMOKE_VENDOR_PASSWORD');
  const results = [];
  const runDirectInfrastructureChecks = getEnv('SMOKE_DIRECT_INFRA_CHECKS') === '1';

  const healthResponse = await fetch(`${getPublicBaseUrl(apiBaseUrl)}/health`).catch(() => null);
  const health = healthResponse?.ok ? await healthResponse.json() : null;
  if (health?.dbStorage !== 'postgres' || health?.uploadsStorage !== 's3') {
    throw new Error(
      `Expected health postgres/s3, got ${JSON.stringify(health || { error: 'unavailable' })}`,
    );
  }
  results.push('health postgres/s3');

  const vendorUser = await login(apiBaseUrl, vendorEmail, vendorPassword);
  const clientUser = await login(apiBaseUrl, clientEmail, clientPassword);
  results.push('client/vendor login');

  const smokeStamp = Date.now();
  const published = await apiRequest(apiBaseUrl, `/users/${vendorUser.id}/vendor-profile`, {
    method: 'POST',
    token: vendorUser.authToken,
    body: {
      vendorDraft: {
        ...(vendorUser.vendorDraft || {}),
        name: `SVADBA Smoke Vendor ${smokeStamp}`,
        category: vendorUser.vendorDraft?.category || 'Ведущие',
        city: vendorUser.vendorDraft?.city || 'Алматы',
        priceFrom: vendorUser.vendorDraft?.priceFrom || '100000',
        phone: vendorUser.vendorDraft?.phone || '+77015550101',
      },
    },
  });
  const vendorId = published.vendor?.id || published.user?.vendorId;
  if (!vendorId) throw new Error('Vendor profile publish did not return vendor id');
  results.push('vendor profile save');

  const upload = await uploadSmokeMediaDirect(apiBaseUrl, vendorUser);
  if (upload.uploadMethod !== 'POST') {
    throw new Error(`Expected direct S3 POST contract, got ${upload.uploadMethod}`);
  }
  const media = upload.media;
  if (!media?.id || !media?.uri) {
    throw new Error('Media upload did not return media id and uri');
  }
  await assertUrlReadable(media.uri);
  const s3Key = getS3KeyFromStoredUri(media.uri);
  if (runDirectInfrastructureChecks && s3Key) {
    const s3Exists = await headS3Object(s3Key);
    if (s3Exists !== true) {
      throw new Error(`Uploaded media is not present in S3: ${s3Key}`);
    }
    results.push('direct media POST/read/S3 head');
  } else {
    results.push('direct media POST/read');
  }

  const commentText = `Smoke media comment ${smokeStamp}`;
  const commented = await apiRequest(apiBaseUrl, `/users/${clientUser.id}/media-comments`, {
    method: 'POST',
    token: clientUser.authToken,
    body: {
      mediaId: media.id,
      text: commentText,
      vendorId,
    },
  });
  if (
    commented.comment?.text !== commentText ||
    commented.comment?.authorId !== clientUser.id ||
    typeof commented.comment?.authorAvatarUri !== 'string' ||
    !Number.isFinite(Date.parse(commented.comment?.createdAt || '')) ||
    !commented.stats?.comments?.some((item) => item.id === commented.comment.id)
  ) {
    throw new Error('Media comment did not preserve media, author, avatar, and timestamp');
  }
  results.push('media-specific comment/avatar/time');

  const liked = await apiRequest(apiBaseUrl, `/users/${clientUser.id}/media-likes`, {
    method: 'POST',
    token: clientUser.authToken,
    body: {
      liked: true,
      mediaId: media.id,
      vendorId,
    },
  });
  if (
    liked.liked !== true ||
    !liked.user?.likedMediaIds?.includes(media.id) ||
    liked.stats?.likedByPreview?.[0]?.id !== clientUser.id
  ) {
    throw new Error('Media like did not preserve user state and liker preview');
  }
  const mediaLikes = await apiRequest(
    apiBaseUrl,
    `/vendors/${encodeURIComponent(vendorId)}/media/${encodeURIComponent(media.id)}/likes`,
  );
  if (mediaLikes.total < 1 || !mediaLikes.likes?.some((item) => item.id === clientUser.id)) {
    throw new Error('Media liker list does not include smoke client');
  }
  results.push('media like/preview/liker list');

  const saved = await apiRequest(apiBaseUrl, `/users/${clientUser.id}/media-saves`, {
    method: 'POST',
    token: clientUser.authToken,
    body: {
      mediaId: media.id,
      saved: true,
      vendorId,
    },
  });
  if (
    saved.saved !== true ||
    !saved.user?.savedMediaIds?.includes(media.id) ||
    saved.stats?.saveCount < 1
  ) {
    throw new Error('Media save did not preserve user state and count');
  }
  results.push('media save/count');

  const date = getSmokeDate();
  const bookingPayload = await apiRequest(apiBaseUrl, `/users/${clientUser.id}/bookings`, {
    method: 'POST',
    token: clientUser.authToken,
    body: {
      vendorId,
      date,
      timeFrom: '09:00',
      timeTo: '10:00',
    },
  });
  const booking = bookingPayload.booking;
  if (!booking?.id) throw new Error('Booking did not return id');
  results.push('booking create');

  const requests = await apiRequest(apiBaseUrl, `/users/${vendorUser.id}/vendor-requests`, {
    token: vendorUser.authToken,
  });
  if (!requests.bookings?.some((item) => item.id === booking.id)) {
    throw new Error('Vendor requests do not include smoke booking');
  }
  results.push('vendor request visible');

  if (runDirectInfrastructureChecks) {
    await assertPostgresContains([vendorUser.id, clientUser.id, vendorId, booking.id, media.id]);
    results.push('Postgres contains smoke ids');
  }

  await apiRequest(apiBaseUrl, `/users/${vendorUser.id}/vendor-requests/${booking.id}`, {
    method: 'PATCH',
    token: vendorUser.authToken,
    body: { status: 'Отклонена' },
  });
  results.push('booking cleanup status');

  const vendorPushToken = await registerSmokePushToken(
    apiBaseUrl,
    vendorUser,
    'vendor',
    smokeStamp,
  );
  const clientPushToken = await registerSmokePushToken(
    apiBaseUrl,
    clientUser,
    'client',
    smokeStamp,
  );
  results.push('push token register');
  await unregisterSmokePushToken(apiBaseUrl, vendorUser, vendorPushToken);
  await unregisterSmokePushToken(apiBaseUrl, clientUser, clientPushToken);
  results.push('push token unregister');

  const nextMedia = (upload.user?.uploadedMedia || []).filter((item) => item.id !== media.id);
  await apiRequest(apiBaseUrl, `/users/${vendorUser.id}`, {
    method: 'PATCH',
    token: vendorUser.authToken,
    body: { uploadedMedia: nextMedia },
  });
  if (runDirectInfrastructureChecks && s3Key) {
    const deleted = await waitForS3Deletion(s3Key);
    if (deleted !== true) {
      throw new Error(`Uploaded media was not deleted from S3: ${s3Key}`);
    }
    results.push('media delete/S3 gone');
  } else {
    results.push('media delete requested');
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        apiBaseUrl,
        checks: results,
        sentryTestUrl: `${getPublicBaseUrl(apiBaseUrl)}/?sentry-test=1`,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
