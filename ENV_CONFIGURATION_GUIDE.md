# Environment Configuration Guide

Complete guide to configuring environment variables for NemiAIInbox.

## 📁 Environment Files Structure

```
NemiAIInbox/
├── .env.example              # Root monorepo config
├── .env                      # Your root config (git-ignored)
├── Backend/.env.example      # Backend API config ⭐ REQUIRED
├── Backend/.env              # Your backend config (git-ignored)
├── AI/.env.example           # AI services config
├── AI/.env                   # Your AI config (git-ignored)
├── iOS/.env.example          # iOS app config
├── Database/.env.example     # Database config
└── scripts/.env.example      # Script config
```

## 🚀 Quick Setup

### Automated Setup (Recommended)

```bash
# Run setup script - it will create .env files for you
./scripts/setup.sh
```

### Manual Setup

```bash
# Create all .env files from examples
cp .env.example .env
cp Backend/.env.example Backend/.env
cp AI/.env.example AI/.env
cp iOS/.env.example iOS/.env
cp Database/.env.example Database/.env
cp scripts/.env.example scripts/.env

# Edit Backend/.env (REQUIRED)
nano Backend/.env
```

## ⭐ Required Configuration

### 1. Backend/.env (ESSENTIAL)

**Minimum required for development:**

```bash
# Database
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/nemi_ai_inbox

# JWT Secrets (generate random strings)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# AI Provider (choose one)
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-xxxxx  # Get from console.anthropic.com
```

**Generate JWT secrets:**
```bash
# On macOS/Linux
openssl rand -base64 32
```

### 2. Get API Keys

#### Claude API Key (Recommended)
1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up / Log in
3. Go to API Keys
4. Create new key
5. Copy to `Backend/.env`: `ANTHROPIC_API_KEY=sk-ant-xxxxx`

#### OpenAI API Key (Alternative)
1. Go to [platform.openai.com](https://platform.openai.com/)
2. Sign up / Log in
3. Go to API Keys
4. Create new key
5. Copy to `Backend/.env`: `OPENAI_API_KEY=sk-xxxxx`

## 📋 Configuration by Directory

### Root (.env)

**Purpose:** Shared monorepo settings

**When to configure:** When using Docker or custom project settings

**Key variables:**
```bash
PROJECT_NAME=NemiAIInbox
ENVIRONMENT=development
DB_HOST=localhost
DB_PORT=5432
DEFAULT_SIMULATOR=iPhone 15 Pro
```

**Optional:** Can be skipped if using Backend/.env directly

---

### Backend/.env ⭐ REQUIRED

**Purpose:** Backend API server configuration

**When to configure:** ALWAYS - required for backend to run

**Critical variables:**

```bash
# Database - REQUIRED
DATABASE_URL=postgresql://user:pass@localhost:5432/nemi_ai_inbox

# JWT - REQUIRED (generate random strings!)
JWT_SECRET=your-32-char-random-string
JWT_REFRESH_SECRET=your-32-char-random-string

# AI - REQUIRED (choose one)
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Server - Optional (defaults provided)
NODE_ENV=development
PORT=3000
```

**Optional variables:**

```bash
# Firebase (for OAuth)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-email
FIREBASE_PRIVATE_KEY=your-key

# Gmail OAuth
GMAIL_CLIENT_ID=xxx.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=xxxxx

# Outlook OAuth
OUTLOOK_CLIENT_ID=your-outlook-client-id
OUTLOOK_CLIENT_SECRET=your-outlook-secret

# APNs (for push notifications)
APNS_KEY_ID=your-key-id
APNS_TEAM_ID=your-team-id
APNS_PRIVATE_KEY_PATH=./apns-key.p8
```

---

### AI/.env

**Purpose:** AI service specific configuration

**When to configure:** If you want separate AI config from Backend

**Key variables:**
```bash
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-xxxxx
AI_BATCH_SIZE=10
ENABLE_AI_SUMMARIES=true
ENABLE_AUTO_CATEGORIZATION=true
```

**Note:** Usually not needed - Backend/.env covers AI config

---

### iOS/.env

**Purpose:** iOS app build configuration

**When to configure:** For custom builds or CI/CD

**Key variables:**
```bash
API_BASE_URL=http://localhost:3000/api
BUNDLE_IDENTIFIER=com.nemi.inbox
ENABLE_AI_SUMMARIES=true
```

**Note:** Most iOS config is in Xcode project, not .env

---

### Database/.env

**Purpose:** Database-specific settings

**When to configure:** For custom database setup or Docker

**Key variables:**
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nemi_ai_inbox
DB_USER=nemi
DB_PASSWORD=nemi_dev_password
```

**Note:** Usually use DATABASE_URL in Backend/.env instead

---

### scripts/.env

**Purpose:** Script behavior configuration

**When to configure:** To customize setup script behavior

**Key variables:**
```bash
DEFAULT_SIMULATOR=iPhone 15 Pro
AUTO_CREATE_DATABASE=true
AUTO_RUN_MIGRATIONS=true
VERBOSE_OUTPUT=true
```

**Note:** Optional - scripts work with defaults

## 🔐 Security Best Practices

### Never Commit These!

```bash
# .gitignore already includes:
.env
.env.local
.env.*.local
Backend/.env
AI/.env
iOS/.env
Database/.env
scripts/.env
```

### Generate Strong Secrets

```bash
# JWT secrets (32+ characters)
openssl rand -base64 32

# Encryption keys
openssl rand -hex 32

# Random passwords
openssl rand -base64 16
```

### Production Security

```bash
# Use environment variables, not .env files
export DATABASE_URL="postgresql://..."
export JWT_SECRET="..."
export ANTHROPIC_API_KEY="..."

# Or use secret management
# - AWS Secrets Manager
# - HashiCorp Vault
# - Kubernetes Secrets
```

## 🎯 Configuration Templates

### Minimal Development Setup

**Backend/.env:**
```bash
DATABASE_URL=postgresql://nemi:nemi@localhost:5432/nemi_ai_inbox
JWT_SECRET=dev-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your-key-here
NODE_ENV=development
PORT=3000
```

### Complete Development Setup

**Backend/.env:**
```bash
# Server
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://nemi:nemi@localhost:5432/nemi_ai_inbox

# JWT
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# AI
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-xxxxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Features
ENABLE_AI_SUMMARIES=true
ENABLE_AUTO_CATEGORIZATION=true

# Logging
LOG_LEVEL=debug
LOG_FILE_PATH=./logs/app.log

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

### Production Setup

**Backend/.env:**
```bash
# Server
NODE_ENV=production
PORT=3000
API_BASE_URL=https://api.yourdomain.com

# Database (use connection string from provider)
DATABASE_URL=postgresql://user:pass@production-db:5432/nemi_ai_inbox?ssl=true
DB_SSL=true

# JWT (use strong secrets!)
JWT_SECRET=<strong-random-secret-32-chars>
JWT_REFRESH_SECRET=<strong-random-secret-32-chars>

# AI
AI_PROVIDER=claude
ANTHROPIC_API_KEY=<production-api-key>

# Firebase
FIREBASE_PROJECT_ID=<prod-project-id>
FIREBASE_CLIENT_EMAIL=<service-account-email>
FIREBASE_PRIVATE_KEY=<service-account-key>

# APNs
APNS_KEY_ID=<production-key-id>
APNS_TEAM_ID=<team-id>
APNS_PRIVATE_KEY_PATH=/secrets/apns-prod.p8
APNS_PRODUCTION=true

# Security
ALLOWED_ORIGINS=https://yourdomain.com
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=warn
```

## 🔧 Environment-Specific Config

### Docker Development

**.env (root):**
```bash
DB_HOST=postgres
DB_PORT=5432
POSTGRES_USER=nemi
POSTGRES_PASSWORD=nemi_dev_password
```

Use `docker-compose.yml` to load these.

### CI/CD (GitHub Actions, etc.)

Set as repository secrets:
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ANTHROPIC_API_KEY`
- `FIREBASE_CREDENTIALS`

## 📊 Validation

### Check Configuration

```bash
# Check if required vars are set
make health

# Or manually
curl http://localhost:3000/health
```

### Test Database Connection

```bash
psql $DATABASE_URL -c "SELECT NOW();"
```

### Test AI Connection

```bash
# Make a test API call
curl -X POST http://localhost:3000/api/test/ai \
  -H "Content-Type: application/json" \
  -d '{"text": "test"}'
```

## 🐛 Troubleshooting

### "DATABASE_URL not defined"

**Solution:**
```bash
# Check Backend/.env exists
ls -la Backend/.env

# If not, create it
cp Backend/.env.example Backend/.env
nano Backend/.env
```

### "AI API key invalid"

**Solution:**
```bash
# Verify key in Backend/.env
grep ANTHROPIC_API_KEY Backend/.env

# Get new key from console.anthropic.com
# Update Backend/.env
```

### "JWT secret not secure"

**Solution:**
```bash
# Generate new secret
openssl rand -base64 32

# Update Backend/.env
JWT_SECRET=<generated-secret>
```

### "Database connection failed"

**Solution:**
```bash
# Check PostgreSQL running
pg_isready

# Check DATABASE_URL format
# postgresql://user:password@host:port/database

# Test connection
psql $DATABASE_URL
```

## 📚 Additional Resources

### Getting API Keys

- **Claude:** [console.anthropic.com](https://console.anthropic.com/)
- **OpenAI:** [platform.openai.com](https://platform.openai.com/)
- **Firebase:** [console.firebase.google.com](https://console.firebase.google.com/)
- **Gmail OAuth:** [console.cloud.google.com](https://console.cloud.google.com/)
- **Apple Developer:** [developer.apple.com](https://developer.apple.com/)

### Environment Variable Tools

- **dotenv:** Load .env files (included in project)
- **direnv:** Auto-load .env per directory
- **envchain:** Store secrets in keychain
- **Vault:** Enterprise secret management

## 🎓 Best Practices

1. **Never commit .env files** - Already in .gitignore
2. **Use different secrets per environment** - dev vs prod
3. **Rotate secrets regularly** - Especially in production
4. **Use secret management** - Vault, AWS Secrets Manager, etc.
5. **Document required variables** - In .env.example
6. **Validate on startup** - Check required vars exist
7. **Use strong secrets** - 32+ random characters
8. **Limit access** - File permissions: `chmod 600 .env`

---

**Quick Start:**
```bash
# 1. Copy example
cp Backend/.env.example Backend/.env

# 2. Add API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key" >> Backend/.env

# 3. Generate secrets
echo "JWT_SECRET=$(openssl rand -base64 32)" >> Backend/.env
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)" >> Backend/.env

# 4. Start development
make dev
```

**Questions?** Check [GETTING_STARTED.md](GETTING_STARTED.md) or [SETUP.md](SETUP.md)
