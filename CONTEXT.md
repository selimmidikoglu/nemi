# NEMI AI Inbox - Complete Project Context

**Last Updated:** 2025-11-12
**Project Type:** Full-stack AI Email Management System (Monorepo)
**Status:** Development/Testing Phase

---

## 🎯 PROJECT OVERVIEW

**NEMI (Nemi AI Inbox)** is an intelligent email management system that uses AI to automatically categorize, summarize, and prioritize emails. It learns from user engagement patterns to surface the most relevant emails.

### Core Value Proposition
- **AI-Powered Triage**: Automatically categorizes emails into Work, Personal, Finance, etc.
- **Smart Summaries**: AI generates concise summaries of each email
- **Engagement Learning**: System learns which emails you engage with most
- **Multi-Platform**: Web app, iOS app (in development)
- **Badge System**: Gamified email management with achievement badges

---

## 🏗️ ARCHITECTURE

### Monorepo Structure
```
NEMI/
├── Backend/          # Node.js + Express API (Port 3000)
├── Web/              # Next.js 14 Web App (Port 3001)
├── iOS/              # SwiftUI iOS App
├── AI/               # AI Service Layer (DeepSeek/Claude/OpenAI)
├── Database/         # PostgreSQL Migrations & Seeds
├── Shared/           # Shared Types & Models
└── scripts/          # Dev automation scripts
```

### Technology Stack

**Backend (Node.js + TypeScript)**
- Express.js - REST API framework
- PostgreSQL - Primary database (via `pg`)
- JWT - Authentication (access + refresh tokens)
- DeepSeek/Claude/OpenAI - AI provider (configurable)
- node-cron - Background job scheduling
- Winston - Logging
- bcrypt - Password hashing

**Web Frontend (Next.js 14 + TypeScript)**
- React 18 + Next.js 14 (App Router)
- TailwindCSS - Styling
- Recharts - Analytics charts
- Lucide Icons - Icon system
- shadcn/ui components (likely)

**iOS (SwiftUI)**
- Native iOS app (development)
- APNs push notifications

**Database (PostgreSQL)**
- User accounts & authentication
- Email storage & metadata
- AI analysis results
- Engagement tracking
- Badge achievements
- Email accounts (Gmail, Outlook, IMAP)

---

## 🔑 KEY FEATURES IMPLEMENTED

### 1. Email Management
- ✅ Multi-account support (Gmail, Outlook, IMAP)
- ✅ OAuth2 integration for Gmail/Outlook
- ✅ Manual IMAP configuration
- ✅ Encrypted credential storage (AES-256-CBC)
- ✅ Automatic email syncing (background jobs)
- ✅ Read/unread status tracking
- ✅ Star/favorite emails
- ✅ Email categorization

### 2. AI-Powered Features
- ✅ **Email Summarization**: AI generates concise summaries
- ✅ **Auto-Categorization**: Work, Personal, Finance, Social, Promotions, etc.
- ✅ **Sentiment Analysis**: Positive, Negative, Neutral detection
- ✅ **Priority Detection**: Critical, High, Normal, Low
- ✅ **Entity Extraction**: Names, companies, dates, amounts
- ✅ **Action Items**: Automatically detects tasks/deadlines
- ✅ **Personal Relevance**: "Me-related" email detection
- ✅ **Deep Analysis**: Advanced AI insights
- ✅ **Multi-Provider Support**: DeepSeek (default), Claude, OpenAI

### 3. Engagement Tracking
- ✅ Time spent reading emails
- ✅ Click tracking (links, attachments)
- ✅ Reply tracking
- ✅ Engagement score calculation
- ✅ Learning system (adapts to user behavior)

### 4. Badge/Achievement System
- ✅ 30+ badges implemented
- ✅ Categories: Productivity, Organization, Social, AI Mastery, etc.
- ✅ Bronze/Silver/Gold tiers
- ✅ Progress tracking
- ✅ Unlock notifications

### 5. Analytics Dashboard
- ✅ Email volume charts (daily/weekly/monthly)
- ✅ Category distribution
- ✅ Response time tracking
- ✅ Engagement metrics
- ✅ Badge progress visualization
- ✅ Sender analytics
- ✅ Time-based insights

### 6. Authentication & Security
- ✅ JWT authentication (24h access, 7d refresh)
- ✅ Bcrypt password hashing
- ✅ Token refresh flow
- ✅ Rate limiting (100 req/15min)
- ✅ CORS protection
- ✅ Helmet.js security headers
- ✅ Credential encryption (for email accounts)

---

## 🌐 API ENDPOINTS

### Authentication (`/api/auth`)
- `POST /signup` - Register new user
- `POST /login` - User login
- `POST /refresh` - Refresh access token
- `POST /logout` - Logout (invalidate refresh token)

### Email Accounts (`/api/email-accounts`)
- `GET /` - List user's email accounts
- `POST /` - Add new email account
- `PUT /:id` - Update account
- `DELETE /:id` - Remove account
- `POST /:id/sync` - Trigger manual sync
- `GET /auth/gmail` - Gmail OAuth initiation
- `GET /auth/gmail/callback` - Gmail OAuth callback
- `GET /auth/outlook` - Outlook OAuth initiation
- `GET /auth/outlook/callback` - Outlook OAuth callback

### Emails (`/api/emails`)
- `GET /` - List emails (with filtering)
- `GET /:id` - Get single email
- `PATCH /:id/read` - Mark read/unread
- `PATCH /:id/star` - Star/unstar email
- `DELETE /:id` - Delete email
- `POST /classify` - Batch AI classification
- `GET /categories/stats` - Category statistics

### Analytics (`/api/analytics`)
- `GET /overview` - Dashboard overview
- `GET /volume` - Email volume over time
- `GET /categories` - Category distribution
- `GET /response-times` - Response time metrics
- `GET /engagement` - Engagement analytics
- `GET /senders` - Top senders analysis

### Badges (`/api/badges`)
- `GET /` - List all badges
- `GET /user` - User's badge progress
- `GET /user/:userId` - Specific user's badges

### Push Notifications (`/api/push`)
- `POST /register` - Register device token
- `POST /send` - Send push notification
- `DELETE /unregister` - Remove device token

---

## 🗄️ DATABASE SCHEMA

### Core Tables
1. **users** - User accounts (email, password hash, display name, preferences)
2. **refresh_tokens** - JWT refresh tokens (user_id, token, expires_at)
3. **user_email_accounts** - Email account connections (provider, credentials, sync status)
4. **emails** - Email messages (subject, body, sender, recipients, metadata)
5. **email_attachments** - File attachments (filename, mime_type, size)
6. **ai_email_analyses** - AI-generated insights (summary, category, sentiment, entities)
7. **email_engagement** - User engagement tracking (time_spent, clicks, replies)
8. **badges** - Badge definitions (name, description, criteria, tier)
9. **user_badges** - User badge achievements (earned_at, progress)
10. **device_tokens** - Push notification tokens (iOS/Android)

### Key Relationships
- User → Email Accounts (1:many)
- Email Account → Emails (1:many)
- Email → AI Analysis (1:1)
- Email → Engagement (1:1)
- Email → Attachments (1:many)
- User → Badges (many:many via user_badges)

---

## ⚙️ CONFIGURATION

### Environment Variables (`Backend/.env`)

**Current Setup:**
- Database: `postgresql://nemi:nemi_password@localhost:5432/nemi_ai_inbox`
- AI Provider: **DeepSeek** (cheaper than OpenAI/Claude)
- JWT Secrets: Generated and configured
- Ports: Backend=3000, Web=3001
- CORS: Allows localhost:3000, 3001, 8080

**API Keys Configured:**
- ✅ DeepSeek API Key: `sk-21ee4dd3...` (active)
- ✅ OpenAI API Key: `sk-proj-Asxk2t43...` (backup)
- ⚠️ Anthropic API Key: Not configured (placeholder)

**Email Providers:**
- ⚙️ Gmail OAuth: Not configured (needs Google Cloud setup)
- ⚙️ Outlook OAuth: Not configured (needs Azure setup)
- ✅ IMAP: Fully functional (manual config)

**Push Notifications:**
- ⚠️ APNs: Not configured (needs Apple Developer setup)

---

## 🚀 HOW TO RUN

### One-Command Start
```bash
npm run dev          # Starts backend + web (concurrently)
```

### Individual Services
```bash
npm run dev:backend  # Backend only (port 3000)
npm run dev:web      # Web only (port 3001)
npm run dev:ios      # Opens Xcode + starts backend
```

### Database Commands
```bash
npm run db:migrate   # Run migrations
npm run db:seed      # Seed sample data
npm run db:setup     # Migrate + seed
npm run db:reset     # Drop, create, migrate, seed
```

### Testing
```bash
npm run health       # Check backend health
curl http://localhost:3000/health
```

---

## 🐛 CURRENT STATUS & KNOWN ISSUES

### ✅ What's Working
- Backend API running on port 3000
- Web app running on port 3001
- Database fully migrated
- AI email analysis (DeepSeek)
- Email syncing (IMAP)
- Badge system
- Analytics dashboard
- Authentication flow

### ⚠️ Known Issues (2025-11-12)

1. **Web App "Feels Blocked"** (User Report - Current Session)
   - Servers ARE running (confirmed with curl)
   - Web returns 200 OK
   - Backend API returns 404 (might be normal - no `/api` endpoint)
   - **Need to investigate:**
     - Browser console errors
     - Network requests failing
     - UI not responding
     - Auth blocking content

2. **Email Provider OAuth Not Set Up**
   - Gmail OAuth: Needs Google Cloud project
   - Outlook OAuth: Needs Azure app registration
   - Workaround: IMAP works fine

3. **Push Notifications Not Configured**
   - APNs credentials not set up
   - Endpoints exist but won't work yet

4. **AI Provider Rate Limits**
   - Using DeepSeek to save costs
   - May hit rate limits during heavy testing
   - Can switch to OpenAI/Claude if needed

---

## 📊 BACKGROUND JOBS

Three cron jobs run automatically:

1. **Email Sync Job** (`email-sync.job.ts`)
   - Runs every 5 minutes
   - Fetches new emails from all connected accounts
   - Triggered via: `*/5 * * * *`

2. **AI Analysis Job** (`ai-analysis.job.ts`)
   - Runs every 10 minutes
   - Analyzes emails that haven't been processed yet
   - Batch size: 10 emails at a time
   - Triggered via: `*/10 * * * *`

3. **Engagement Calculation Job** (`engagement-calculation.job.ts`)
   - Runs daily at 2 AM
   - Recalculates engagement scores
   - Updates learning system
   - Checks badge progress
   - Triggered via: `0 2 * * *`

---

## 🎨 WEB APP PAGES

### Public Routes
- `/login` - Login page
- `/register` - Registration page

### Protected Routes (require auth)
- `/feed` - Main email feed with categories
- `/accounts` - Manage email accounts
- `/analytics` - Analytics dashboard
- `/analytics/badges/[badgeName]` - Badge detail view
- `/settings` - User settings

---

## 🧠 HOW TO USE THIS FILE AS CONTEXT

### Starting a New Claude Session

**Step 1: Load Context**
Say: *"Read CONTEXT.md, PROJECT_SUMMARY.md, and README.md"*

**Step 2: Ask About Recent Work**
Check git log: `git log --oneline -20`

**Step 3: State Your Goal**
Example: *"I need to fix the login authentication bug"*

### When Making Changes

**Update This File:**
- Add to "Session History" section
- Update "Known Issues" if you discover bugs
- Mark features as complete in "Current Status"
- Add new endpoints to API section if created

---

## 📝 SESSION HISTORY

### Session 1: 2025-11-12 (Current)

**User Reports:**
- Web app "feels blocked" or slow
- Context.md was too minimal
- AI summaries too verbose (repeating obvious info)
- No "About Me" detection (can't tell if user is @mentioned in PRs)
- All emails look the same (need HTML cards for meetings, flights, etc.)

**Actions Taken:**
- ✅ Verified servers are running (curl test)
- ✅ Confirmed web app responds with 200 OK
- ✅ Confirmed backend API running
- ✅ Expanded CONTEXT.md significantly (this file)
- ✅ **MAJOR: Enhanced AI email analysis system**
  - Added "About Me" detection (`is_about_me`, `mention_context` fields)
  - Made summaries ultra-concise (max 60 chars, skip obvious context)
  - Added HTML card rendering for special emails (meetings, flights, PRs, etc.)
  - Created migration 018_enhanced_ai_analysis.sql
  - Updated prompt with explicit guidelines
  - Updated TypeScript interfaces and database save logic

**Investigation Needed:**
- [ ] Check browser console for errors
- [ ] Check network tab for failed API calls
- [ ] Verify authentication flow
- [ ] Check if CORS is blocking requests
- [ ] Review Web app error boundaries

**Files Modified:**
- `CONTEXT.md` - Expanded from 100 to 500+ lines
- `AI/prompts/deep_email_analysis.txt` - Added "About Me" detection, concise summaries, HTML rendering
- `Backend/src/services/deep-email-analyzer.service.ts` - New fields in interfaces, updated save logic
- `Database/migrations/018_enhanced_ai_analysis.sql` - New migration for AI enhancements
- `AI_IMPROVEMENTS_2025-11-12.md` - Complete documentation of changes
- `.claude/commands/context.md` - Auto-load context slash command
- `.claude/project_prompt.md` - Project-level auto-context

---

## 🔧 DEBUGGING TIPS

### Backend Issues
```bash
# Check logs
tail -f Backend/logs/app.log

# Test API
curl http://localhost:3000/health
curl http://localhost:3000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test@nemi.com","password":"password123"}'

# Check database
psql -U nemi -d nemi_ai_inbox
\dt              # List tables
SELECT * FROM users;
```

### Web App Issues
1. Open browser dev tools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests
4. Check Application > Local Storage for tokens
5. Try: `localStorage.getItem('accessToken')`

### Database Issues
```bash
# Connect to DB
psql -U nemi -d nemi_ai_inbox

# Check migrations
SELECT * FROM schema_migrations;

# Reset database
npm run db:reset
```

---

## 💡 QUICK WINS FOR NEXT SESSIONS

### High Priority
1. Fix the "blocked" web app issue
2. Set up Gmail OAuth for testing
3. Add more sample emails for testing
4. Improve error handling in web app

### Medium Priority
1. Deploy to staging server
2. Add email search functionality
3. Implement email reply feature
4. Add more badge types

### Low Priority (Polish)
1. Dark mode for web app
2. Mobile responsive improvements
3. Email templates for notifications
4. Performance optimization

---

## 📚 RELATED DOCUMENTATION

Read these files for deeper understanding:

1. **README.md** - Quick start guide
2. **PROJECT_SUMMARY.md** - Detailed feature list
3. **API_DOCUMENTATION.md** - Complete API reference
4. **SETUP.md** - Full setup instructions
5. **MONOREPO_GUIDE.md** - Monorepo commands
6. **ANALYTICS_FEATURE_PLAN.md** - Analytics implementation details

---

**END OF CONTEXT FILE**

*Last verified working: 2025-11-12 18:00 UTC*
