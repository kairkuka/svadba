const CONFIRMED_BOOKING_STATUSES = new Set([
  'Подтверждена',
  'В работе',
  'Закрыта',
  'Закрыто',
]);

const CANCELLED_BOOKING_STATUSES = new Set([
  'Отклонена',
  'Отменена',
  'cancelled',
  'canceled',
  'rejected',
]);

const VENDOR_BOOKING_STATUSES = new Set([
  'Ожидает подтверждения',
  'Подтверждена',
  'В работе',
  'Отклонена',
  'Закрыта',
]);

function getTodayIso(timeZone = 'Asia/Almaty', now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeIsoDate(value) {
  const raw = String(value || '').trim();
  let year;
  let month;
  let day;
  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    [, year, month, day] = match;
  } else {
    match = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) return '';
    [, day, month, year] = match;
  }
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return '';
  }
  return `${year}-${month}-${day}`;
}

function parseBookingTime(value) {
  const match = String(value || '').trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function validateBookingInput(input, options = {}) {
  const date = normalizeIsoDate(input?.date);
  const timeFrom = String(input?.timeFrom || '').trim();
  const timeTo = String(input?.timeTo || '').trim();
  if (!date) return { error: 'Выберите корректную дату бронирования.' };
  if (!options.allowPast && date < getTodayIso(options.timeZone, options.now)) {
    return { error: 'Нельзя забронировать прошедшую дату.' };
  }
  const fromMinutes = parseBookingTime(timeFrom);
  const toMinutes = parseBookingTime(timeTo);
  if (fromMinutes === null || toMinutes === null) {
    return { error: 'Укажите время в формате ЧЧ:ММ.' };
  }
  if (fromMinutes >= toMinutes) {
    return { error: 'Время начала должно быть раньше времени окончания.' };
  }
  return { date, timeFrom, timeTo };
}

function isConfirmedBookingStatus(status) {
  return CONFIRMED_BOOKING_STATUSES.has(String(status || '').trim());
}

function isCancelledBookingStatus(status) {
  return CANCELLED_BOOKING_STATUSES.has(String(status || '').trim());
}

function isVendorBookingStatus(status) {
  return VENDOR_BOOKING_STATUSES.has(String(status || '').trim());
}

function parseMoney(value) {
  const amount = Number(String(value ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

function sanitizeVendorSettingsValues(values) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return {};
  const sanitized = structuredClone(values);
  if (sanitized['Документы'] && typeof sanitized['Документы'] === 'object') {
    delete sanitized['Документы']['Статус верификации'];
    delete sanitized['Документы']['Комментарий модератора'];
  }
  return sanitized;
}

function sanitizeClientSettingsValues(values) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return {};
  const sanitized = structuredClone(values);
  if (sanitized['Бюджет'] && typeof sanitized['Бюджет'] === 'object') {
    delete sanitized['Бюджет']['Забронировано'];
    delete sanitized['Бюджет']['Осталось'];
  }
  return sanitized;
}

function validateEventDraft(input, options = {}) {
  const draft = input && typeof input === 'object' ? { ...input } : {};
  const date = String(draft.date || '').trim();
  if (date) {
    const normalizedDate = normalizeIsoDate(date);
    if (!normalizedDate) return { error: 'Укажите корректную дату мероприятия.' };
    if (!options.allowPast && normalizedDate < getTodayIso(options.timeZone, options.now)) {
      return { error: 'Нельзя создать или изменить прошедшее мероприятие.' };
    }
    draft.date = normalizedDate;
  }
  draft.guests = String(draft.guests || '').replace(/[^\d]/g, '').slice(0, 6);
  draft.budget = String(parseMoney(draft.budget) || '');
  return { draft };
}

module.exports = {
  getTodayIso,
  isCancelledBookingStatus,
  isConfirmedBookingStatus,
  isVendorBookingStatus,
  normalizeIsoDate,
  parseBookingTime,
  parseMoney,
  sanitizeClientSettingsValues,
  sanitizeVendorSettingsValues,
  validateBookingInput,
  validateEventDraft,
};
