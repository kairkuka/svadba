const { GetObjectCommand, ListObjectsV2Command, S3Client } = require('@aws-sdk/client-s3');
const { Pool } = require('pg');

function requiredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function findLatestBackup(s3, bucket, prefix) {
  let continuationToken;
  let latest;

  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const item of page.Contents || []) {
      if (!item.Key) continue;
      if (!latest || new Date(item.LastModified || 0) > new Date(latest.LastModified || 0)) {
        latest = item;
      }
    }

    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  if (!latest?.Key) throw new Error(`No database backup found at s3://${bucket}/${prefix}`);
  return latest;
}

async function main() {
  const region = requiredEnv('AWS_REGION');
  const bucket = requiredEnv('DB_BACKUP_BUCKET');
  const prefix = `${String(process.env.DB_BACKUP_PREFIX || 'db-backups').replace(/^\/+|\/+$/g, '')}/`;
  const databaseUrl = requiredEnv('DATABASE_URL');
  const stateKey = String(process.env.DATABASE_STATE_KEY || 'svadba-main');
  const s3 = new S3Client({ region });
  const latest = await findLatestBackup(s3, bucket, prefix);
  const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: latest.Key }));
  const raw = await object.Body.transformToString();
  const backup = JSON.parse(raw);

  if (!Array.isArray(backup.users) || !Array.isArray(backup.vendors)) {
    throw new Error('Backup schema validation failed');
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === '1' ? { rejectUnauthorized: false } : undefined,
  });
  const client = await pool.connect();
  const probeKey = `${stateKey}-restore-check-${Date.now()}`;

  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO app_state (key, data, updated_at) VALUES ($1, $2::jsonb, now())',
      [probeKey, raw],
    );
    const restored = await client.query(
      `SELECT jsonb_array_length(data->'users') AS users,
              jsonb_array_length(data->'vendors') AS vendors
         FROM app_state
        WHERE key = $1`,
      [probeKey],
    );
    const row = restored.rows[0];
    if (
      Number(row?.users) !== backup.users.length ||
      Number(row?.vendors) !== backup.vendors.length
    ) {
      throw new Error('Restored row does not match backup');
    }

    await client.query('ROLLBACK');
    const persisted = await pool.query(
      'SELECT count(*)::int AS count FROM app_state WHERE key = $1',
      [probeKey],
    );
    if (Number(persisted.rows[0]?.count) !== 0) {
      throw new Error('Rollback verification failed');
    }

    console.log(
      `restore-rehearsal-ok users=${backup.users.length} vendors=${backup.vendors.length} rollback=verified`,
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
