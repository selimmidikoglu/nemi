/**
 * Migration script to add calendar/actions related tables and columns
 * Run with: npx ts-node src/scripts/migrate-calendar-actions.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('Starting migration for calendar and actions...\n');

    await client.query('BEGIN');

    // 1. Add new columns to emails table for AI reply and actions
    console.log('1. Adding new columns to emails table...');

    await client.query(`
      ALTER TABLE emails
      ADD COLUMN IF NOT EXISTS is_answerable BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS response_urgency VARCHAR(20) DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS suggested_replies JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS extracted_actions JSONB DEFAULT '[]'::jsonb
    `);
    console.log('   ✓ Added is_answerable, response_urgency, suggested_replies, extracted_actions columns');

    // 2. Create email_actions table for storing extracted actions
    console.log('\n2. Creating email_actions table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS email_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,

        action_type VARCHAR(20) NOT NULL, -- 'deadline', 'reminder', 'task'
        title VARCHAR(500) NOT NULL,
        description TEXT,

        due_date TIMESTAMP WITH TIME ZONE,
        priority VARCHAR(10) DEFAULT 'medium', -- 'high', 'medium', 'low'

        status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'dismissed'
        calendar_type VARCHAR(20) DEFAULT 'reminder', -- 'your_life', 'reminder'

        ai_confidence DECIMAL(3,2),
        source_text TEXT,

        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,

        -- For Google Calendar sync
        google_calendar_event_id VARCHAR(255),
        synced_to_calendar BOOLEAN DEFAULT FALSE
      )
    `);
    console.log('   ✓ Created email_actions table');

    // 3. Create indexes for email_actions
    console.log('\n3. Creating indexes for email_actions...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_actions_user_id ON email_actions(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_actions_email_id ON email_actions(email_id);
      CREATE INDEX IF NOT EXISTS idx_email_actions_status ON email_actions(status);
      CREATE INDEX IF NOT EXISTS idx_email_actions_calendar_type ON email_actions(calendar_type);
      CREATE INDEX IF NOT EXISTS idx_email_actions_due_date ON email_actions(due_date);
      CREATE INDEX IF NOT EXISTS idx_email_actions_user_status ON email_actions(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_email_actions_user_calendar ON email_actions(user_id, calendar_type, status);
    `);
    console.log('   ✓ Created indexes');

    // 4. Create user_calendar_settings table
    console.log('\n4. Creating user_calendar_settings table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_calendar_settings (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

        -- Google Calendar OAuth
        google_calendar_connected BOOLEAN DEFAULT FALSE,
        google_calendar_access_token TEXT,
        google_calendar_refresh_token TEXT,
        google_calendar_token_expiry TIMESTAMP WITH TIME ZONE,

        -- Calendar preferences
        primary_calendar_id VARCHAR(255), -- User's primary Google Calendar ID
        deadline_calendar_id VARCHAR(255), -- Secondary calendar for deadlines (Your Life)

        -- Auto-sync settings
        auto_create_deadlines BOOLEAN DEFAULT TRUE,
        auto_create_reminders BOOLEAN DEFAULT TRUE,

        -- Notification settings
        notification_before_minutes INTEGER DEFAULT 60,
        email_notifications BOOLEAN DEFAULT TRUE,
        push_notifications BOOLEAN DEFAULT TRUE,

        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('   ✓ Created user_calendar_settings table');

    // 5. Create scheduled_emails table for Send Later feature
    console.log('\n5. Creating scheduled_emails table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS scheduled_emails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,

        -- Email content
        to_addresses JSONB NOT NULL,
        cc_addresses JSONB,
        bcc_addresses JSONB,
        subject VARCHAR(1000),
        body TEXT,
        html_body TEXT,

        -- Reply context
        in_reply_to VARCHAR(255),
        references_header TEXT,
        thread_id VARCHAR(255),

        -- Scheduling
        scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
        timezone VARCHAR(100) DEFAULT 'UTC',

        -- Status
        status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'sent', 'cancelled', 'failed'
        error_message TEXT,

        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        sent_at TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log('   ✓ Created scheduled_emails table');

    // 6. Create indexes for scheduled_emails
    console.log('\n6. Creating indexes for scheduled_emails...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_emails_user_id ON scheduled_emails(user_id);
      CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status);
      CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for);
      CREATE INDEX IF NOT EXISTS idx_scheduled_emails_pending ON scheduled_emails(status, scheduled_for) WHERE status = 'scheduled';
    `);
    console.log('   ✓ Created indexes');

    // 7. Create email_snippets table for templates
    console.log('\n7. Creating email_snippets table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS email_snippets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,

        name VARCHAR(100) NOT NULL,
        shortcut VARCHAR(50), -- e.g., ";meet" for quick insert
        content TEXT NOT NULL,

        -- Variables like {first_name}, {company}
        variables JSONB DEFAULT '[]'::jsonb,

        -- Usage tracking
        use_count INTEGER DEFAULT 0,
        last_used_at TIMESTAMP WITH TIME ZONE,

        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

        UNIQUE(user_id, shortcut)
      )
    `);
    console.log('   ✓ Created email_snippets table');

    // 8. Create trigger for updated_at
    console.log('\n8. Creating updated_at triggers...');

    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers for each new table
    const tables = ['email_actions', 'user_calendar_settings', 'scheduled_emails', 'email_snippets'];
    for (const table of tables) {
      await client.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
          BEFORE UPDATE ON ${table}
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    }
    console.log('   ✓ Created updated_at triggers');

    await client.query('COMMIT');

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNew tables created:');
    console.log('  - email_actions (for deadlines, reminders, tasks from emails)');
    console.log('  - user_calendar_settings (for Google Calendar integration)');
    console.log('  - scheduled_emails (for Send Later feature)');
    console.log('  - email_snippets (for email templates)');
    console.log('\nNew columns added to emails:');
    console.log('  - is_answerable (boolean)');
    console.log('  - response_urgency (varchar)');
    console.log('  - suggested_replies (jsonb)');
    console.log('  - extracted_actions (jsonb)');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
