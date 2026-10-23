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

function createPreMigrationBackup(dbPath) {
  const backupDir = path.join(path.dirname(dbPath), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `pre-postgres-${timestamp}.json`);
  fs.copyFileSync(dbPath, backupPath);
  return backupPath;
}

async function main() {
  loadEnvFile();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Set DATABASE_URL before running migration');
  }

  const dataDir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(__dirname, 'data');
  const dbPath = process.env.DB_PATH || path.join(dataDir, 'db.json');
  const stateKey = process.env.DATABASE_STATE_KEY || 'svadba-main';
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Local JSON database not found: ${dbPath}`);
  }
  const backupPath = createPreMigrationBackup(dbPath);
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === '1' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        key text PRIMARY KEY,
        data jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await pool.query(
      `
        INSERT INTO app_state (key, data, updated_at)
        VALUES ($1, $2::jsonb, now())
        ON CONFLICT (key)
        DO UPDATE SET data = EXCLUDED.data, updated_at = now()
      `,
      [stateKey, JSON.stringify(db)],
    );
    console.log(`Migrated ${dbPath} to Postgres app_state key "${stateKey}"`);
    console.log(`Backup created: ${backupPath}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
