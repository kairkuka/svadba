const assert = require('node:assert/strict');
const test = require('node:test');

const {
  isConfirmedBookingStatus,
  normalizeIsoDate,
  sanitizeClientSettingsValues,
  sanitizeVendorSettingsValues,
  validateBookingInput,
  validateEventDraft,
} = require('./domain');

test('booking rejects past dates and invalid times', () => {
  const now = new Date('2026-10-16T08:00:00.000Z');
  assert.match(
    validateBookingInput({ date: '2026-10-15', timeFrom: '18:00', timeTo: '23:00' }, { now }).error,
    /прошедшую/,
  );
  assert.match(
    validateBookingInput({ date: '2026-10-20', timeFrom: '99:99', timeTo: '23:00' }, { now }).error,
    /ЧЧ:ММ/,
  );
  assert.match(
    validateBookingInput({ date: '2026-10-20', timeFrom: '23:00', timeTo: '18:00' }, { now }).error,
    /раньше/,
  );
});

test('booking normalizes DD.MM.YYYY and accepts valid range', () => {
  assert.deepEqual(
    validateBookingInput(
      { date: '20.10.2026', timeFrom: '18:00', timeTo: '23:00' },
      { now: new Date('2026-10-16T08:00:00.000Z') },
    ),
    { date: '2026-10-20', timeFrom: '18:00', timeTo: '23:00' },
  );
  assert.equal(normalizeIsoDate('31.02.2026'), '');
});

test('pending booking is not confirmed budget', () => {
  assert.equal(isConfirmedBookingStatus('Ожидает подтверждения'), false);
  assert.equal(isConfirmedBookingStatus('Подтверждена'), true);
});

test('client cannot write computed budget fields', () => {
  assert.deepEqual(
    sanitizeClientSettingsValues({
      Бюджет: { 'Общий бюджет': '1.000.000', Забронировано: '999', Осталось: '1' },
    }),
    { Бюджет: { 'Общий бюджет': '1.000.000' } },
  );
});

test('vendor cannot write moderation fields', () => {
  assert.deepEqual(
    sanitizeVendorSettingsValues({
      Документы: {
        'ИИН / БИН': '123',
        'Статус верификации': 'Проверен',
        'Комментарий модератора': 'fake',
      },
    }),
    { Документы: { 'ИИН / БИН': '123' } },
  );
});

test('event rejects past date and normalizes money', () => {
  const result = validateEventDraft(
    { date: '20.10.2026', guests: '120 гостей', budget: '6.500.000 ₸' },
    { now: new Date('2026-10-16T08:00:00.000Z') },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.draft.date, '2026-10-20');
  assert.equal(result.draft.guests, '120');
  assert.equal(result.draft.budget, '6500000');
});
