import * as fs from 'fs';
import * as path from 'path';
import { pool } from '../config/database';
import { logger } from '../config/logger';

/**
 * Seed database with sample data
 */
async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    const seedsDir = path.join(__dirname, '../../../Database/seeds');
    const seedFiles = fs
      .readdirSync(seedsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of seedFiles) {
      logger.info(`Running seed: ${file}`);
      const sql = fs.readFileSync(path.join(seedsDir, file), 'utf-8');

      try {
        await pool.query(sql);
        logger.info(`Seed ${file} completed successfully`);
      } catch (error) {
        logger.error(`Seed ${file} failed:`, error);
        throw error;
      }
    }

    logger.info('All seeds completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
