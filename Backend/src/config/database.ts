import { Pool, PoolConfig } from 'pg';
import { logger } from './logger';

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'nemi_ai_inbox',
  user: process.env.DB_USER || 'nemi',
  password: process.env.DB_PASSWORD || 'nemi_password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
};

// Log the connection config for debugging (without password)
logger.info(`Database pool config: host=${poolConfig.host}, port=${poolConfig.port}, database=${poolConfig.database}, user=${poolConfig.user}`);

// Create database connection pool
export const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
  process.exit(-1);
});

/**
 * Test database connection
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    logger.info(`Database connected at ${result.rows[0].now}`);

    // Debug: Check what database we're connected to
    const dbCheck = await client.query('SELECT current_database(), current_user, current_schema()');
    logger.info(`Connected to database: ${dbCheck.rows[0].current_database}, user: ${dbCheck.rows[0].current_user}, schema: ${dbCheck.rows[0].current_schema}`);

    // Debug: Check if ai_analyzed_at column exists
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'emails' AND column_name = 'ai_analyzed_at'
    `);
    logger.info(`ai_analyzed_at column exists: ${columnCheck.rows.length > 0}`);

    client.release();
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
};

/**
 * Execute a query
 */
export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Query error:', { text, error });
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 */
export const getClient = async () => {
  return await pool.connect();
};

export default { pool, query, getClient, connectDatabase };
