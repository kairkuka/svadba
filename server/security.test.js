const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildUploadedMediaRecord,
  createStoryCollection,
  getPublicStoryHighlights,
  getStoryArchive,
  getPublicUploadError,
  normalizeMediaPublication,
  normalizeClientErrorPayload,
  sniffMediaContentType,
  updateStoryCollection,
  upsertOAuthUser,
  validateMediaBytes,
  validateVideoMetadata,
  validatePublicText,
} = require('./index');

test('stories expire after 24 hours and feed publications do not', () => {
  const story = buildUploadedMediaRecord(
    { id: 'vendor-1', uploadedMedia: [] },
    {
      caption: '#свадьба',
      publicationKind: 'story',
      role: 'story',
    },
    'https://media.example/story.mp4',
    'video',
    'story.mp4',
  );
  const photo = buildUploadedMediaRecord(
    { id: 'vendor-1', uploadedMedia: [] },
    { publicationKind: 'photo', role: 'profile' },
    'https://media.example/photo.jpg',
    'image',
    'photo.jpg',
  );

  assert.equal(story.caption, '#свадьба');
  assert.ok(Date.parse(story.expiresAt) - Date.parse(story.createdAt) === 86_400_000);
  assert.equal(photo.expiresAt, undefined);
});

test('expired stories stay in private archive and never become highlights automatically', () => {
  const story = buildUploadedMediaRecord(
    { id: 'vendor-archive', uploadedMedia: [] },
    { publicationKind: 'story', role: 'story' },
    'https://media.example/archive.jpg',
    'image',
    'archive.jpg',
  );
  story.expiresAt = '2020-01-01T00:00:00.000Z';
  const user = { id: 'vendor-archive', uploadedMedia: [story], storyCollections: [] };

  assert.equal(getStoryArchive(user).length, 1);
  assert.deepEqual(getPublicStoryHighlights(user), []);
});

test('story can belong to several manually managed collections', () => {
  const story = buildUploadedMediaRecord(
    { id: 'vendor-collections', uploadedMedia: [] },
    { publicationKind: 'story', role: 'story' },
    'https://media.example/collection.jpg',
    'image',
    'collection.jpg',
  );
  const user = { id: 'vendor-collections', uploadedMedia: [story], storyCollections: [] };
  const germany = createStoryCollection(user, { name: 'Германия', storyIds: [story.id] });
  createStoryCollection(user, { name: 'Работа', storyIds: [story.id] });

  assert.equal(getPublicStoryHighlights(user).length, 2);
  assert.equal(getPublicStoryHighlights(user)[0].stories[0].id, story.id);
  const renamed = updateStoryCollection(user, germany.id, { name: 'Поездка' });
  assert.equal(renamed.name, 'Поездка');
  assert.deepEqual(renamed.storyIds, [story.id]);
});

test('publication metadata accepts photo carousels and rejects mixed media', () => {
  assert.deepEqual(
    normalizeMediaPublication(
      {
        publicationId: 'publication_123',
        publicationKind: 'photo',
        publicationIndex: '1',
        publicationCount: '3',
      },
      'image',
      'profile',
      'fallback',
    ),
    {
      publicationId: 'publication_123',
      publicationKind: 'photo',
      publicationIndex: 1,
      publicationCount: 3,
    },
  );
  assert.throws(
    () =>
      normalizeMediaPublication(
        { publicationKind: 'photo', publicationCount: 2 },
        'video',
        'reels',
        'fallback',
      ),
    /только изображения/,
  );
  assert.throws(
    () =>
      normalizeMediaPublication(
        { publicationKind: 'video', publicationCount: 2 },
        'video',
        'reels',
        'fallback',
      ),
    /один файл/,
  );
});

test('media sniffing recognizes supported image and video signatures', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const mp4 = Buffer.from('000000006674797069736F6D', 'hex');
  const mov = Buffer.from('000000006674797071742020', 'hex');

  assert.equal(sniffMediaContentType(jpeg), 'image/jpeg');
  assert.equal(sniffMediaContentType(png), 'image/png');
  assert.equal(sniffMediaContentType(mp4), 'video/mp4');
  assert.equal(sniffMediaContentType(mov), 'video/quicktime');
});

test('media validation rejects spoofed or unsupported files', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.throws(() => validateMediaBytes(jpeg, 'video/mp4'), /не совпадает/);
  assert.throws(
    () => validateMediaBytes(Buffer.from('not-a-media-file'), 'image/jpeg'),
    /не является поддерживаемым/,
  );
});

test('video metadata enforces a real video stream and 60 second limit', () => {
  assert.deepEqual(
    validateVideoMetadata({ durationSeconds: 59.987, height: 1920, width: 1080 }),
    { durationSeconds: 59.987, height: 1920, width: 1080 },
  );
  assert.throws(
    () => validateVideoMetadata({ durationSeconds: 61, height: 1920, width: 1080 }),
    /duration exceeds/,
  );
  assert.throws(
    () => validateVideoMetadata({ durationSeconds: 10, height: 0, width: 0 }),
    /stream unavailable/,
  );
});

test('new OAuth accounts require legal consent', () => {
  const db = { users: [] };
  assert.throws(
    () =>
      upsertOAuthUser(db, {
        email: 'new@example.com',
        provider: 'google',
        role: 'client',
        subject: 'subject-without-consent',
      }),
    /Terms acceptance required/,
  );
  const user = upsertOAuthUser(db, {
    email: 'new@example.com',
    provider: 'google',
    role: 'client',
    subject: 'subject-with-consent',
    termsAccepted: true,
  });
  assert.equal(user.termsVersion, '2026-10-29');
  assert.ok(user.termsAcceptedAt);
});

test('public text strips control bytes and blocks abuse and link spam', () => {
  assert.equal(validatePublicText('  Привет\u0000 мир  '), 'Привет мир');
  assert.throws(() => validatePublicText('сука'), /недопустимые/);
  assert.throws(
    () => validatePublicText('https://a.kz https://b.kz https://c.kz'),
    /Слишком много ссылок/,
  );
});

test('upload errors never expose S3 internals', () => {
  const result = getPublicUploadError(new Error('SignatureDoesNotMatch AWSAccessKeyId'));
  assert.deepEqual(result, {
    status: 502,
    error: 'Не удалось сохранить файл. Повторите позже.',
  });
});

test('client diagnostics redact credentials and personal email', () => {
  const payload = normalizeClientErrorPayload({
    level: 'fatal',
    message: 'Failed for user@example.com',
    stack: 'Authorization: Bearer secret.token.value',
    platform: 'ios',
    status: 503,
  });

  assert.equal(payload.level, 'fatal');
  assert.equal(payload.message, 'Failed for [redacted-email]');
  assert.equal(payload.stack, 'Authorization: Bearer [redacted]');
  assert.equal(payload.status, 503);
});
