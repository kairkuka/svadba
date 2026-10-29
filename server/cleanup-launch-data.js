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

function createEmptyEventDraft() {
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

function isOldDemoEventDraft(eventDraft) {
  if (!eventDraft || typeof eventDraft !== 'object') return false;
  const oldSignals = [
    ['type', ['Кыз узату', 'Годик']],
    ['date', ['7 сентября', '12 августа', '31 августа']],
    ['city', ['Алматы', 'Астана']],
    ['guests', ['120']],
    ['budget', ['3 500 000 тг', '3500000', '3 500 000']],
    ['place', ['Пока выбираем']],
    ['comment', ['Нужны ведущий, декор и фото.']],
  ];
  const score = oldSignals.reduce((sum, [key, values]) => {
    const current = String(eventDraft[key] || '').trim();
    return values.includes(current) ? sum + 1 : sum;
  }, 0);

  return score >= 3 && (
    ['Кыз узату', 'Годик'].includes(String(eventDraft.type || '').trim()) ||
    String(eventDraft.comment || '').trim() === 'Нужны ведущий, декор и фото.'
  );
}

function cleanOldDemoSettingsValues(settingsValues) {
  if (!settingsValues || typeof settingsValues !== 'object') return 0;
  const eventSettings = settingsValues.Мероприятие;
  if (!eventSettings || typeof eventSettings !== 'object') return 0;

  const mappedEventDraft = {
    type: eventSettings['Тип мероприятия'],
    date: eventSettings['Дата мероприятия'],
    city: eventSettings.Город,
    guests: eventSettings['Количество гостей'],
    budget: eventSettings.Бюджет,
    place: eventSettings.Площадка,
    comment: eventSettings.Комментарий,
  };
  if (!isOldDemoEventDraft(mappedEventDraft)) return 0;

  settingsValues.Мероприятие = {
    'Тип мероприятия': '',
    'Дата мероприятия': '',
    Город: '',
    'Количество гостей': '',
    Бюджет: '',
    Площадка: '',
    Комментарий: '',
  };
  return 1;
}

function cleanupNestedDemoData(value, report, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);

  if (isOldDemoEventDraft(value.eventDraft)) {
    value.eventDraft = createEmptyEventDraft();
    report.eventDraftsCleared += 1;
  }

  report.eventSettingsCleared += cleanOldDemoSettingsValues(value.clientSettingsValues);

  if (Array.isArray(value.bookings)) {
    for (const booking of value.bookings) {
      if (['Кыз узату', 'Годик'].includes(String(booking?.clientName || '').trim())) {
        booking.clientName = 'Клиент';
        report.demoBookingNamesCleared += 1;
      }
    }
  }

  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    cleanupNestedDemoData(child, report, seen);
  }
}

function cleanupDb(db) {
  const report = {
    usersChecked: 0,
    eventDraftsCleared: 0,
    eventSettingsCleared: 0,
    demoBookingNamesCleared: 0,
    staleUserBookingsRemoved: 0,
    staleGlobalBookingsRemoved: 0,
  };

  const deletedUserIds = new Set();
  db.users = Array.isArray(db.users) ? db.users : [];
  db.bookings = Array.isArray(db.bookings) ? db.bookings : [];
  db.vendors = Array.isArray(db.vendors) ? db.vendors : [];

  cleanupNestedDemoData(db, report);

  for (const user of db.users) {
    report.usersChecked += 1;

    if (Array.isArray(user.bookings)) {
      const before = user.bookings.length;
      user.bookings = user.bookings.filter((booking) => {
        if (!booking?.vendorId || !booking?.clientId) return true;
        const vendorExists = db.vendors.some((vendor) => vendor.id === booking.vendorId);
        const clientExists = db.users.some((candidate) => candidate.id === booking.clientId);
        return vendorExists && clientExists;
      });
      report.staleUserBookingsRemoved += before - user.bookings.length;
    }

    if (user.deletedAt) {
      deletedUserIds.add(user.id);
    }
  }

  const beforeBookings = db.bookings.length;
  db.bookings = db.bookings.filter((booking) => {
    if (!booking?.vendorId || !booking?.clientId) return false;
    if (deletedUserIds.has(booking.clientId)) return false;
    const vendorExists = db.vendors.some((vendor) => vendor.id === booking.vendorId);
    const clientExists = db.users.some((user) => user.id === booking.clientId);
    return vendorExists && clientExists;
  });
  report.staleGlobalBookingsRemoved = beforeBookings - db.bookings.length;

  return report;
}

async function readDbFromPostgres(pool, stateKey) {
  const result = await pool.query('SELECT data FROM app_state WHERE key = $1', [stateKey]);
  if (!result.rows[0]?.data) {
    throw new Error(`No app_state row found for key "${stateKey}"`);
  }
  return result.rows[0].data;
}

async function writeDbToPostgres(pool, stateKey, db) {
  await pool.query(
    `
      INSERT INTO app_state (key, data, updated_at)
      VALUES ($1, $2::jsonb, now())
      ON CONFLICT (key)
      DO UPDATE SET data = EXCLUDED.data, updated_at = now()
    `,
    [stateKey, JSON.stringify(db)],
  );
}

async function main() {
  loadEnvFile();
  const dryRun = process.argv.includes('--dry-run');
  const databaseUrl = process.env.DATABASE_URL || '';
  const stateKey = process.env.DATABASE_STATE_KEY || 'svadba-main';

  if (databaseUrl) {
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === '1' ? { rejectUnauthorized: false } : undefined,
    });
    try {
      const db = await readDbFromPostgres(pool, stateKey);
      const report = cleanupDb(db);
      if (!dryRun) {
        await writeDbToPostgres(pool, stateKey, db);
      }
      console.log(JSON.stringify({ dryRun, storage: 'postgres', report }, null, 2));
    } finally {
      await pool.end();
    }
    return;
  }

  const dataDir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(__dirname, 'data');
  const dbPath = process.env.DB_PATH || path.join(dataDir, 'db.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const report = cleanupDb(db);

  if (!dryRun) {
    const backupPath = `${dbPath}.before-launch-cleanup-${Date.now()}.bak`;
    fs.copyFileSync(dbPath, backupPath);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log(JSON.stringify({ backupPath, dryRun, storage: 'file', report }, null, 2));
    return;
  }

  console.log(JSON.stringify({ dryRun, storage: 'file', report }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
