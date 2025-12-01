import * as fs from 'fs';
import * as path from 'path';
import { pool } from '../config/database';
import { logger } from '../config/logger';

/**
 * Run database migrations
 */
async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    const migrationsDir = path.join(__dirname, '../../../Database/migrations');
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      logger.info(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      try {
        await pool.query(sql);
        logger.info(`Migration ${file} completed successfully`);
      } catch (error) {
        logger.error(`Migration ${file} failed:`, error);
        throw error;
      }
    }

    logger.info('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
