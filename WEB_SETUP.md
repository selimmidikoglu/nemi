# NEMI Web App - Quick Start Guide

## What's New

A complete Next.js web version of NEMI has been added to the project! You can now access your AI-powered email management from any browser.

## Project Structure

The project now includes three main components:

```
NEMI/
├── Backend/          # Node.js/Express API server
├── AI/              # AI services (Claude/OpenAI integration)
├── iOS/             # Native iOS app (SwiftUI)
└── Web/             # Next.js web application (NEW!)
```

## Quick Start - Web App

### Option 1: Local Development

1. **Install dependencies**:
   ```bash
   cd Web
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env.local
   ```

3. **Start the web app**:
   ```bash
   npm run dev
   ```

4. **Access the app**:
   Open [http://localhost:3001](http://localhost:3001)

### Option 2: Using Docker

1. **Start all services** (Backend + Database + Web):
   ```bash
   docker-compose up
   ```

2. **Access the web app**:
   Open [http://localhost:3001](http://localhost:3001)

### Option 3: From Project Root

```bash
# Install all dependencies (Backend, AI, Web)
npm run install:all

# Start only the web app
npm run dev:web

# Start only the backend
npm run dev:backend
```

## Features

The web app includes all the core features from the iOS app:

- ✅ User authentication (register/login)
- ✅ Email feed with AI summaries
- ✅ Email categorization (Work, Personal, Finance, etc.)
- ✅ Importance detection (Critical, High, Normal, Low)
- ✅ Me-related email detection
- ✅ Star/unstar emails
- ✅ Mark as read/unread
- ✅ Email deletion
- ✅ Multi-account support (Gmail, Outlook, IMAP)
- ✅ Email synchronization
- ✅ Advanced filtering
- ✅ Dark mode support
- ✅ Responsive design

## First Time Setup

1. **Start the backend** (if not already running):
   ```bash
   npm run dev:backend
   ```

2. **Start the web app**:
   ```bash
   npm run dev:web
   ```

3. **Create an account**:
   - Navigate to [http://localhost:3001](http://localhost:3001)
   - Click "Sign up"
   - Create your account

4. **Add an email account**:
   - After login, click "Accounts"
   - Click "Add Account"
   - Enter your email credentials

5. **Sync your emails**:
   - Return to the feed
   - Click "Sync" to fetch your emails
   - AI will automatically analyze and categorize them

## Technology Stack

### Web App
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Date Formatting**: date-fns

### Shared Backend
- Node.js + Express
- PostgreSQL
- Claude/OpenAI APIs

## Development Workflow

### Working on Web Only
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Web
npm run dev:web
```

### Working on iOS and Web
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Web
npm run dev:web

# Terminal 3: iOS
npm run dev:ios
```

### Using Docker for Everything
```bash
# Start all services
docker-compose up

# Web: http://localhost:3001
# Backend API: http://localhost:3000
# pgAdmin: http://localhost:5050
```

## Environment Variables

### Web App (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Backend (.env)
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5434
DB_NAME=nemi_ai_inbox
DB_USER=nemi
DB_PASSWORD=nemi_dev_password

# Add your API keys
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

## Project Scripts

### Root Level
```bash
npm run dev:web           # Start web app
npm run dev:backend       # Start backend
npm run dev:ios           # Start iOS simulator
npm run build             # Build everything
npm run install:all       # Install all dependencies
```

### Web Directory
```bash
npm run dev              # Start dev server (port 3001)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
```

## API Endpoints Used by Web

The web app uses the same API as the iOS app:

- `POST /api/auth/login` - Authentication
- `POST /api/auth/register` - User registration
- `GET /api/emails` - Fetch emails
- `GET /api/emails/:id` - Email details
- `PATCH /api/emails/:id/read` - Mark as read
- `PATCH /api/emails/:id/star` - Star email
- `DELETE /api/emails/:id` - Delete email
- `POST /api/emails/sync` - Sync emails
- `GET /api/email-accounts` - List accounts
- `POST /api/email-accounts` - Add account
- `DELETE /api/email-accounts/:id` - Remove account

## Deployment

### Web App Deployment

The web app can be deployed to:

1. **Vercel** (Recommended for Next.js):
   ```bash
   npm install -g vercel
   cd Web
   vercel
   ```

2. **Netlify**:
   ```bash
   npm run build
   # Upload the .next folder
   ```

3. **Docker**:
   ```bash
   cd Web
   docker build -t nemi-web .
   docker run -p 3001:3001 nemi-web
   ```

4. **Any Node.js hosting**:
   ```bash
   npm run build
   npm start
   ```

## Troubleshooting

### Web app can't connect to backend
- Check that backend is running on port 3000
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Check browser console for CORS errors

### "Module not found" errors
```bash
cd Web
rm -rf node_modules .next
npm install
```

### Port already in use
```bash
# Change port in Web/package.json
"dev": "next dev -p 3002"  # Use different port
```

### TypeScript errors
```bash
cd Web
npm run lint
```

## Architecture

```
┌─────────────┐
│   Browser   │
│  (Web App)  │
└──────┬──────┘
       │ HTTP
       ↓
┌──────────────┐     ┌──────────────┐
│   Backend    │────→│  PostgreSQL  │
│   (Express)  │     │   Database   │
└──────┬───────┘     └──────────────┘
       │
       ↓
┌──────────────┐
│  AI Services │
│ Claude/OpenAI│
└──────────────┘
```

## What's Next

Future enhancements for the web app:
- [ ] Real-time notifications with WebSockets
- [ ] Email composition and sending
- [ ] Advanced search with full-text indexing
- [ ] Email threading/conversations
- [ ] Keyboard shortcuts
- [ ] Progressive Web App (PWA) support
- [ ] OAuth integration for Gmail/Outlook
- [ ] Email templates
- [ ] Bulk operations
- [ ] Export functionality

## Documentation

For more detailed information:
- [Web App README](./Web/README.md)
- [Backend API Documentation](./Backend/README.md)
- [iOS App Documentation](./iOS/README.md)

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Verify backend is running and accessible
3. Check database connection
4. Ensure all environment variables are set
5. Try clearing browser cache and localStorage

Happy emailing! 📧
