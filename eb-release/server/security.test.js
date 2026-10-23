const assert = require('node:assert/strict');
const test = require('node:test');

const {
  getPublicUploadError,
  normalizeClientErrorPayload,
  sniffMediaContentType,
  validateMediaBytes,
  validatePublicText,
} = require('./index');

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
