# Environment Variables Quick Reference

## 🚀 Fastest Setup

```bash
# 1. Create Backend config
cp Backend/.env.example Backend/.env

# 2. Add these 3 lines to Backend/.env
DATABASE_URL=postgresql://nemi:nemi@localhost:5432/nemi_ai_inbox
JWT_SECRET=$(openssl rand -base64 32)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# 3. Start!
make dev
```

## 📋 Required Variables (Backend/.env)

| Variable | Where to Get | Example |
|----------|--------------|---------|
| `DATABASE_URL` | Your PostgreSQL connection | `postgresql://user:pass@localhost:5432/nemi_ai_inbox` |
| `JWT_SECRET` | Generate: `openssl rand -base64 32` | Random 32+ char string |
| `JWT_REFRESH_SECRET` | Generate: `openssl rand -base64 32` | Random 32+ char string |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) | `sk-ant-xxxxx` |

## 🔑 Where to Get API Keys

| Service | URL | Variable |
|---------|-----|----------|
| Claude API | [console.anthropic.com](https://console.anthropic.com/) | `ANTHROPIC_API_KEY` |
| OpenAI API | [platform.openai.com](https://platform.openai.com/) | `OPENAI_API_KEY` |
| Firebase | [console.firebase.google.com](https://console.firebase.google.com/) | `FIREBASE_PROJECT_ID` |
| Gmail OAuth | [console.cloud.google.com](https://console.cloud.google.com/) | `GMAIL_CLIENT_ID` |
| Apple Developer | [developer.apple.com](https://developer.apple.com/) | `APNS_KEY_ID` |

## 📁 File Locations

```
Backend/.env          ⭐ REQUIRED - Main configuration
.env                  Optional - Monorepo settings
AI/.env              Optional - AI-specific config
iOS/.env             Optional - iOS build config
Database/.env        Optional - DB-specific config
scripts/.env         Optional - Script behavior
```

## 🎯 Minimal Backend/.env

```bash
# Database
DATABASE_URL=postgresql://nemi:nemi@localhost:5432/nemi_ai_inbox

# Security
JWT_SECRET=your-random-32-char-string-here
JWT_REFRESH_SECRET=another-random-32-char-string

# AI (choose one)
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

## 🔧 Common Commands

```bash
# Generate JWT secret
openssl rand -base64 32

# Test database connection
psql $DATABASE_URL -c "SELECT NOW();"

# Check backend health
curl http://localhost:3000/health

# View current env
cat Backend/.env | grep -v "^#" | grep -v "^$"
```

## 🐛 Quick Fixes

**"Cannot connect to database"**
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/nemi_ai_inbox
```

**"JWT secret not set"**
```bash
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
```

**"AI API key invalid"**
```bash
# Get new key from console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-your-new-key
```

## 📚 Full Documentation

- **Complete Guide:** [ENV_CONFIGURATION_GUIDE.md](ENV_CONFIGURATION_GUIDE.md)
- **Setup Guide:** [SETUP.md](SETUP.md)
- **Getting Started:** [GETTING_STARTED.md](GETTING_STARTED.md)

---

**Copy & paste minimum config:**
```bash
# Backend/.env minimum
DATABASE_URL=postgresql://nemi:nemi@localhost:5432/nemi_ai_inbox
JWT_SECRET=replace-with-random-32-chars
JWT_REFRESH_SECRET=replace-with-another-random-32-chars
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your-key-here
NODE_ENV=development
PORT=3000
```
