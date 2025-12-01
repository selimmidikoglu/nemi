# Database Reset Scripts

This directory contains utility scripts for managing the NEMI database.

## Quick Reset Script

The `reset-database.sh` script allows you to quickly delete all email data while preserving user accounts.

### What It Does:
✅ Deletes all emails and email data
✅ Deletes all AI-generated badges
✅ Deletes all AI analysis history
✅ Deletes email account credentials
✅ Clears learned badge patterns
✅ Clears custom categories
✅ Reclaims disk space (VACUUM)
❌ **Preserves user accounts and auth tokens**

### Usage Methods:

#### Method 1: Direct Script Execution
```bash
# From NEMI root directory
./scripts/reset-database.sh
```

#### Method 2: NPM Command (Recommended)
```bash
# From Backend directory
cd Backend
npm run db:reset
```

#### Method 3: Direct Call from Anywhere
```bash
# Absolute path
/Users/gaban/Documents/NEMI/scripts/reset-database.sh
```

### Script Output:

**Before cleanup:**
```
📊 Current database state:
emails,362
email_badges,657
email_scores,348
ai_analysis_history,5057
email_accounts,1
user_badge_definitions,120
users,2
```

**After cleanup:**
```
✅ Database state after cleanup:
emails,0
email_badges,0
email_scores,0
ai_analysis_history,0
email_accounts,0
user_badge_definitions,0
users,2  ← PRESERVED!
```

### Safety Features:

1. **Confirmation Prompt**
   - You must type "yes" to proceed
   - Prevents accidental deletion

2. **Before/After Counts**
   - Shows exact counts before deletion
   - Shows verification after deletion

3. **Preserved Data**
   - Users table is never touched
   - Auth tokens remain valid
   - Device tokens preserved

### Environment Variables:

You can customize database connection:

```bash
# Use custom database settings
DB_HOST=localhost \
DB_PORT=5432 \
DB_NAME=nemi_ai_inbox \
DB_USER=gaban \
./scripts/reset-database.sh
```

### When to Use:

✅ **Testing new features** - Fresh start for testing
✅ **After bugs** - Clean slate to reproduce issues
✅ **Switching accounts** - Remove old Gmail, add new one
✅ **Performance testing** - Start with clean database
✅ **Development workflow** - Reset between iterations

### What Happens After Reset:

1. **All emails deleted** - Inbox is empty
2. **All accounts removed** - Need to re-add Gmail/IMAP
3. **All badges cleared** - AI will create fresh badges
4. **All categories cleared** - AI will create fresh categories
5. **Users intact** - Can still login with same credentials

### Next Steps After Reset:

1. Open iOS app
2. Go to Settings → Email Accounts
3. Tap "Add Email Account"
4. Add Gmail account with OAuth
5. Wait for sync (max 100 emails on first sync)
6. Watch AI analysis progress in Settings
7. See emails appear in Feed Screen

### Troubleshooting:

**Error: Permission denied**
```bash
chmod +x ./scripts/reset-database.sh
```

**Error: psql command not found**
```bash
# macOS
brew install postgresql

# Linux
sudo apt-get install postgresql-client
```

**Error: Connection refused**
```bash
# Check if PostgreSQL is running
pg_ctl status

# Start PostgreSQL if needed
brew services start postgresql
```

### Advanced Usage:

**Silent mode (skip confirmation):**
```bash
# ⚠️ DANGEROUS - No confirmation!
echo "yes" | ./scripts/reset-database.sh
```

**Custom database:**
```bash
DB_NAME=my_custom_db ./scripts/reset-database.sh
```

**Dry run (see what would be deleted):**
```bash
# Just show counts, don't delete
psql -h localhost -U gaban -d nemi_ai_inbox << 'EOF'
SELECT 'emails' as table_name, COUNT(*) as count FROM emails
UNION ALL
SELECT 'email_badges', COUNT(*) FROM email_badges
UNION ALL
SELECT 'email_scores', COUNT(*) FROM email_scores;
EOF
```

---

## Files in This Directory:

- **reset-database.sh** - Main reset script
- **README.md** - This file

---

**Created by:** NemiAI Team
**Last Updated:** 2025-11-01
**Version:** 1.0.0
