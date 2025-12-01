#!/bin/bash

# NEMI Database Reset Script
# This script deletes all email data while preserving user accounts

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-nemi_ai_inbox}
DB_USER=${DB_USER:-gaban}

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  NEMI Database Reset Script            ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""

# Function to show counts before cleanup
show_before_counts() {
    echo -e "${YELLOW}📊 Current database state:${NC}"
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -A -F"," << 'EOF'
SELECT
    'emails' as table_name, COUNT(*) as count FROM emails
UNION ALL
SELECT 'email_badges', COUNT(*) FROM email_badges
UNION ALL
SELECT 'email_scores', COUNT(*) FROM email_scores
UNION ALL
SELECT 'ai_analysis_history', COUNT(*) FROM ai_analysis_history
UNION ALL
SELECT 'email_accounts', COUNT(*) FROM email_accounts
UNION ALL
SELECT 'user_badge_definitions', COUNT(*) FROM user_badge_definitions
UNION ALL
SELECT 'users (PRESERVED)', COUNT(*) FROM users
ORDER BY table_name;
EOF
    echo ""
}

# Function to show counts after cleanup
show_after_counts() {
    echo -e "${GREEN}✅ Database state after cleanup:${NC}"
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -A -F"," << 'EOF'
SELECT
    'emails' as table_name, COUNT(*) as count FROM emails
UNION ALL
SELECT 'email_badges', COUNT(*) FROM email_badges
UNION ALL
SELECT 'email_scores', COUNT(*) FROM email_scores
UNION ALL
SELECT 'ai_analysis_history', COUNT(*) FROM ai_analysis_history
UNION ALL
SELECT 'email_accounts', COUNT(*) FROM email_accounts
UNION ALL
SELECT 'user_badge_definitions', COUNT(*) FROM user_badge_definitions
UNION ALL
SELECT 'users (PRESERVED)', COUNT(*) FROM users
ORDER BY table_name;
EOF
    echo ""
}

# Function to perform cleanup
perform_cleanup() {
    echo -e "${YELLOW}🗑️  Deleting ALL data (except users table)...${NC}"

    psql -h $DB_HOST -U $DB_USER -d $DB_NAME << 'EOF'
-- Disable triggers for faster deletion
SET session_replication_role = 'replica';

-- Delete all email-related data
DELETE FROM ai_analysis_history;
DELETE FROM email_scores;
DELETE FROM email_badges;
DELETE FROM email_labels;
DELETE FROM email_attachments;
DELETE FROM email_engagement_events;
DELETE FROM email_view_sessions;
DELETE FROM badge_engagement_metrics;
DELETE FROM emails;

-- Delete email accounts (will need to re-add them)
DELETE FROM email_accounts;

-- Clear all other tables
TRUNCATE user_badge_definitions CASCADE;
TRUNCATE custom_categories CASCADE;
TRUNCATE tag_definitions CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Show verification (should all be 0 except users)
SELECT 'emails_remaining' as status, COUNT(*) as count FROM emails
UNION ALL
SELECT 'email_badges_remaining', COUNT(*) FROM email_badges
UNION ALL
SELECT 'email_scores_remaining', COUNT(*) FROM email_scores
UNION ALL
SELECT 'ai_analysis_history_remaining', COUNT(*) FROM ai_analysis_history
UNION ALL
SELECT 'email_accounts_remaining', COUNT(*) FROM email_accounts
UNION ALL
SELECT 'users_PRESERVED', COUNT(*) FROM users;
EOF

    echo -e "${GREEN}✅ All data deleted (except users, refresh_tokens, device_tokens)${NC}"
    echo ""
}

# Function to vacuum database
perform_vacuum() {
    echo -e "${YELLOW}🧹 Reclaiming disk space...${NC}"

    psql -h $DB_HOST -U $DB_USER -d $DB_NAME << 'EOF'
VACUUM FULL emails, email_badges, email_scores, ai_analysis_history, user_badge_definitions;
EOF

    echo -e "${GREEN}✅ Disk space reclaimed${NC}"
    echo ""
}

# Main execution
echo -e "${BLUE}Database: ${NC}$DB_NAME@$DB_HOST:$DB_PORT"
echo -e "${BLUE}User: ${NC}$DB_USER"
echo ""

# Show before state
show_before_counts

# Ask for confirmation
echo -e "${RED}⚠️  WARNING: This will delete ALL data including email accounts!${NC}"
echo -e "${GREEN}✅ Only users, refresh_tokens, and device_tokens tables will be PRESERVED.${NC}"
echo -e "${YELLOW}⚠️  You will need to re-add Gmail/Outlook connections after this.${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo -e "${YELLOW}❌ Aborted by user${NC}"
    exit 1
fi

# Perform cleanup
perform_cleanup

# Vacuum database
perform_vacuum

# Show after state
show_after_counts

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Database Reset Complete!           ║${NC}"
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Re-add email account (Gmail/Outlook/IMAP)"
echo "  2. Configure account credentials"
echo "  3. Wait for emails to sync"
echo "  4. Watch AI analysis progress"
echo ""
