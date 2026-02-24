import { Pool } from 'pg'

const globalForPg = globalThis

function parseIntEnv(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseSslConfig() {
  if (process.env.PGSSL === 'disable') {
    return false
  }

  if (process.env.PGSSL === 'require') {
    return { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' }
  }

  return process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}

function buildPoolConfig() {
  const connectionString = process.env.DATABASE_URL

  if (connectionString) {
    return {
      connectionString,
      ssl: parseSslConfig(),
      max: parseIntEnv(process.env.PGPOOL_MAX, 20),
      idleTimeoutMillis: parseIntEnv(process.env.PGPOOL_IDLE_TIMEOUT_MS, 30000),
      connectionTimeoutMillis: parseIntEnv(process.env.PGPOOL_CONNECTION_TIMEOUT_MS, 10000),
    }
  }

  const host = process.env.PGHOST
  const port = parseIntEnv(process.env.PGPORT, 5432)
  const database = process.env.PGDATABASE
  const user = process.env.PGUSER
  const password = process.env.PGPASSWORD

  if (!host || !database || !user) {
    throw new Error(
      'Database configuration is missing. Set DATABASE_URL or PGHOST, PGPORT, PGDATABASE, PGUSER, and PGPASSWORD.',
    )
  }

  return {
    host,
    port,
    database,
    user,
    password,
    ssl: parseSslConfig(),
    max: parseIntEnv(process.env.PGPOOL_MAX, 20),
    idleTimeoutMillis: parseIntEnv(process.env.PGPOOL_IDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMillis: parseIntEnv(process.env.PGPOOL_CONNECTION_TIMEOUT_MS, 10000),
  }
}

export function getPool() {
  if (!globalForPg.__pgPool) {
    globalForPg.__pgPool = new Pool(buildPoolConfig())
  }

  return globalForPg.__pgPool
}

export async function query(text, params = []) {
  return getPool().query(text, params)
}

export async function withClient(callback) {
  const client = await getPool().connect()

  try {
    return await callback(client)
  } finally {
    client.release()
  }
}

export async function closePool() {
  if (globalForPg.__pgPool) {
    await globalForPg.__pgPool.end()
    globalForPg.__pgPool = undefined
  }
}
