# Getting Started with NemiAIInbox

Welcome! This guide will get you up and running in **5 minutes**.

## Prerequisites

Before you begin, ensure you have:
- ✅ **Node.js 18+** installed ([download](https://nodejs.org/))
- ✅ **PostgreSQL 14+** installed ([download](https://www.postgresql.org/))
- ✅ **Xcode 15+** installed (for iOS development)

Optional but recommended:
- ⚙️ **Make** (comes with macOS/Linux)
- 🐳 **Docker** (alternative to local PostgreSQL)

## 🚀 Quick Start (5 Minutes)

### Step 1: Setup Everything (1 command!)

```bash
cd /path/to/NEMI
./scripts/setup.sh
```

This will:
- ✅ Check prerequisites
- ✅ Install all dependencies  
- ✅ Create database
- ✅ Run migrations
- ✅ Seed sample data
- ✅ Configure environment

### Step 2: Configure API Keys

Edit `Backend/.env`:

```bash
nano Backend/.env
```

Add your AI API key (choose one):

```bash
# Option 1: Claude (Recommended)
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Option 2: OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
```

Get API keys:
- **Claude**: [console.anthropic.com](https://console.anthropic.com/)
- **OpenAI**: [platform.openai.com](https://platform.openai.com/)

### Step 3: Start Development

```bash
npm run dev
```

or

```bash
make dev
```

**That's it!** 🎉

- Backend API: http://localhost:3000
- iOS App: Opens in Xcode automatically

## 🧪 Test the Setup

### Check API Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-28T...",
  "uptime": 1.23
}
```

### Try Sample Login

The setup script created a demo account:

- **Email**: `demo@example.com`
- **Password**: `password123`

Test it:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "password123"
  }'
```

You should receive an access token!

### iOS App

1. Xcode should have opened automatically
2. Select iPhone 15 Pro simulator
3. Press **Cmd+R** to build and run
4. Login with demo credentials above

## 📱 What You Can Do Now

### Backend API
- ✅ User authentication (signup, login)
- ✅ Email management (list, view, classify)
- ✅ AI summarization and categorization
- ✅ Push notification setup
- ✅ 5 sample emails to explore

### iOS App
- ✅ Login screen
- ✅ Email feed with AI summaries
- ✅ Email detail view
- ✅ Category sidebar
- ✅ Push notification support

### Sample Data Included
- 1 demo user account
- 5 categorized emails
- Work, Personal, Finance emails
- AI summaries already generated

## 🎯 Common Commands

| Task | Command |
|------|---------|
| Start dev servers | `make dev` or `npm run dev` |
| View logs | `make logs` |
| Check API health | `make health` |
| Reset database | `make db-reset` |
| Run tests | `make test` |
| Clean everything | `make clean` |

## 🐳 Alternative: Docker Setup

If you prefer Docker or don't want to install PostgreSQL:

```bash
# Start everything with Docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔧 Configuration

### Backend (.env)

Required variables:
```bash
# Database (auto-configured by setup script)
DATABASE_URL=postgresql://...

# JWT Secrets (auto-generated)
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# AI Provider (YOU MUST ADD THIS)
AI_PROVIDER=claude
ANTHROPIC_API_KEY=your-key-here
```

### iOS (Xcode)

1. **Bundle ID**: Update if needed in Xcode
2. **Firebase**: Add `GoogleService-Info.plist` (optional for now)
3. **APNs**: Configure for push notifications (optional for now)

## 📚 Next Steps

### 1. Explore the App
- Login with demo account
- Browse sample emails
- Check AI summaries and categories
- Try the sidebar menu

### 2. Configure Email Providers
Set up OAuth to fetch real emails:
- [Gmail Setup](SETUP.md#gmail-oauth-setup)
- [Outlook Setup](SETUP.md#outlook-oauth-setup)

### 3. Customize AI
Edit AI prompts:
- `AI/prompts/summarize_email.txt`
- `AI/prompts/classify_email.txt`

### 4. Deploy to Production
- [Docker Deployment](MONOREPO_GUIDE.md#deployment)
- Configure APNs for push notifications

## 🆘 Troubleshooting

### "Port 3000 already in use"
```bash
lsof -ti:3000 | xargs kill -9
```

### "Database connection failed"
```bash
# Check PostgreSQL
pg_isready

# Start PostgreSQL (macOS)
brew services start postgresql@15

# Or use Docker
docker-compose up -d postgres
```

### "npm install fails"
```bash
make clean
npm run install:all
```

### "iOS build fails"
```bash
# In Xcode
# Product → Clean Build Folder (Cmd+Shift+K)
# Then rebuild (Cmd+R)
```

## 🎓 Learning Resources

### Essential Docs
- **[MONOREPO_GUIDE.md](MONOREPO_GUIDE.md)** - All commands and workflows
- **[QUICKSTART.md](QUICKSTART.md)** - Detailed quick start
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Complete API reference

### Advanced Topics
- **[SETUP.md](SETUP.md)** - Manual setup instructions
- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - Architecture deep dive

### Quick References
- **[MONOREPO_COMMANDS.md](MONOREPO_COMMANDS.md)** - Command cheat sheet
- **[README.md](README.md)** - Project overview

## 💬 Get Help

### Check Status
```bash
make health          # API health
make logs           # View logs
```

### Common Solutions
```bash
make clean          # Clean artifacts
make db-reset       # Reset database
make reset-all      # Nuclear option
```

### Documentation
- All docs in root directory (*.md files)
- Comments in code
- Example requests in API docs

## ✨ Quick Tips

1. **Use aliases** - Add shortcuts to your shell
2. **Keep logs open** - Run `make logs` in a separate terminal
3. **Test early** - Run `make health` after changes
4. **Reset often** - Use `make db-reset` to test migrations

## 🎉 You're Ready!

Your NemiAIInbox is now running:

- ✅ Backend API at http://localhost:3000
- ✅ iOS app in Xcode
- ✅ Database with sample data
- ✅ AI integration configured
- ✅ Ready for development!

**Happy coding!** 🚀

---

**Questions?** Check [MONOREPO_GUIDE.md](MONOREPO_GUIDE.md) or other docs in the root directory.
