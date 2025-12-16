/**
 * Backfill script to add company logos to existing emails
 * Run with: npx ts-node src/scripts/backfill-logos.ts
 */

import { pool } from '../config/database';
import { LogoService } from '../services/logo.service';
import { logger } from '../config/logger';

async function backfillLogos() {
  console.log('🚀 Starting logo backfill...');

  try {
    // Get all unique from_email domains that don't have company_logo_url
    const result = await pool.query(`
      SELECT DISTINCT from_email
      FROM emails
      WHERE company_logo_url IS NULL
        AND from_email IS NOT NULL
    `);

    const emails = result.rows.map(r => r.from_email);
    console.log(`📧 Found ${emails.length} unique sender emails without logos`);

    if (emails.length === 0) {
      console.log('✅ No emails need logo updates');
      return;
    }

    // Get logos for all domains (this will cache them)
    const logoMap = await LogoService.getLogosForEmails(emails);
    console.log(`🖼️  Retrieved logos for ${logoMap.size} domains`);

    // Update emails in batches
    let updatedCount = 0;
    for (const [domain, logoInfo] of logoMap.entries()) {
      if (!logoInfo.logoUrl) continue;

      const updateResult = await pool.query(`
        UPDATE emails
        SET company_name = COALESCE(company_name, $1),
            company_domain = COALESCE(company_domain, $2),
            company_logo_url = COALESCE(company_logo_url, $3)
        WHERE from_email LIKE $4
          AND company_logo_url IS NULL
      `, [
        logoInfo.companyName,
        domain,
        logoInfo.logoUrl,
        `%@${domain}`
      ]);

      updatedCount += updateResult.rowCount || 0;
      console.log(`  ✓ Updated ${updateResult.rowCount} emails for ${domain} -> ${logoInfo.companyName || domain}`);
    }

    console.log(`\n✅ Backfill complete! Updated ${updatedCount} emails with company logos`);

    // Show cache stats
    const cacheStats = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN logo_valid THEN 1 END) as valid
      FROM domain_logo_cache
    `);
    console.log(`📊 Logo cache: ${cacheStats.rows[0].total} domains cached (${cacheStats.rows[0].valid} valid)`);

  } catch (error) {
    console.error('❌ Error during backfill:', error);
  } finally {
    await pool.end();
  }
}

// Run the backfill
backfillLogos();
