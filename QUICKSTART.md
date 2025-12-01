# Quick Start Guide

Get NemiAIInbox up and running in 5 minutes!

## Prerequisites Check

Before starting, make sure you have:
- ✅ Node.js 18+ installed (`node --version`)
- ✅ PostgreSQL 14+ installed and running (`pg_isready`)
- ✅ Xcode 15+ installed (for iOS development)
- ✅ At least one AI API key (Claude or OpenAI)

## 1. Backend Setup (5 minutes)

### Install and Configure

```bash
# Navigate to backend directory
cd Backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Edit .env file with your credentials:

```bash
# Required: Database
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/nemi_ai_inbox

# Required: JWT Secrets (generate random strings)
JWT_SECRET=your-random-secret-key-here
JWT_REFRESH_SECRET=your-random-refresh-key-here

# Required: AI Provider (choose one)
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-xxxxx  # Get from console.anthropic.com

# OR use OpenAI
# AI_PROVIDER=openai
# OPENAI_API_KEY=sk-xxxxx  # Get from platform.openai.com
```

### Initialize Database

```bash
# Create database
createdb nemi_ai_inbox

# Run migrations
npm run migrate

# (Optional) Add sample data
npm run seed
```

### Start Backend

```bash
npm run dev
```

You should see:
```
Server running on port 3000
Database connected successfully
```

Test it: `curl http://localhost:3000/health`

## 2. iOS Setup (Optional - for testing)

### Open Project

```bash
cd iOS
open NemiAIInbox.xcodeproj
```

### Update API Base URL

In `iOS/NemiAIInbox/Services/APIService.swift`:

```swift
private let baseURL = "http://localhost:3000/api"  // For simulator
```

For physical device, use your Mac's local IP:
```swift
private let baseURL = "http://192.168.1.x:3000/api"  // Replace x with your IP
```

### Build and Run

1. Select iPhone Simulator (iPhone 15 Pro recommended)
2. Press `Cmd + R` to build and run
3. The app will launch with login screen

## 3. Test the System

### Option A: Use Sample Data (if you ran seed)

Login with:
- Email: `demo@example.com`
- Password: `password123`

You'll see 5 sample emails already categorized and summarized!

### Option B: Create New Account

1. Click "Sign Up" in the iOS app
2. Enter your email and password
3. Complete registration

### Test API Directly

```bash
# Sign up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'

# You'll receive access token - save it!
# Use token in subsequent requests:

# Get emails
curl http://localhost:3000/api/emails \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 4. What's Next?

### Configure Email Providers

To fetch real emails, set up OAuth:

**Gmail:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project and enable Gmail API
3. Create OAuth credentials
4. Add to `.env`:
```bash
GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-client-secret
```

**Outlook:**
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register application
3. Add Mail.Read permission
4. Add to `.env`:
```bash
OUTLOOK_CLIENT_ID=your-client-id
OUTLOOK_CLIENT_SECRET=your-client-secret
```

### Configure Push Notifications (iOS)

1. Get APNs key from Apple Developer Portal
2. Add to `.env`:
```bash
APNS_KEY_ID=your-key-id
APNS_TEAM_ID=your-team-id
APNS_PRIVATE_KEY_PATH=./apns-key.p8
```

### Customize AI Behavior

Edit prompts in `AI/prompts/`:
- `summarize_email.txt` - Controls how emails are summarized
- `classify_email.txt` - Controls categorization logic

## Common Issues

### Database Connection Failed
```bash
# Check PostgreSQL is running
pg_isready

# If not running, start it:
# macOS (Homebrew):
brew services start postgresql@14

# Linux:
sudo systemctl start postgresql
```

### Port 3000 Already in Use
```bash
# Change PORT in .env
PORT=3001

# Or kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

### AI API Errors
- Verify API key is correct
- Check you have credits/quota
- Review API provider status page

### iOS Build Errors
- Clean build folder: `Cmd + Shift + K`
- Reset packages: File → Packages → Reset Package Caches
- Restart Xcode

## Project Structure

```
NemiAIInbox/
├── iOS/              # SwiftUI iOS app
├── Backend/          # Node.js API server
├── AI/               # AI services and prompts
├── Database/         # SQL migrations and seeds
└── Shared/           # Shared models and types
```

## Key Files

- **[README.md](README.md)** - Project overview
- **[SETUP.md](SETUP.md)** - Detailed setup instructions
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Complete API reference
- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - Architecture and design docs

## Getting Help

1. Check the detailed [SETUP.md](SETUP.md) guide
2. Review [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
3. Look at sample data in `Database/seeds/`
4. Check backend logs: `tail -f Backend/logs/app.log`

## Next Steps

- [ ] Set up email provider OAuth
- [ ] Configure push notifications
- [ ] Customize AI prompts
- [ ] Deploy to production
- [ ] Add custom email categories
- [ ] Implement iPad support

Happy coding! 🚀
