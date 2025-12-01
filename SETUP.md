# NemiAIInbox Setup Guide

This guide will help you set up and run the NemiAIInbox project locally.

## Prerequisites

- **Node.js** 18+ and npm 9+
- **PostgreSQL** 14+
- **Xcode** 15+ (for iOS development)
- **Claude API Key** or **OpenAI API Key**
- **Firebase Account** (for authentication)
- **Apple Developer Account** (for push notifications)

## Backend Setup

### 1. Install Dependencies

```bash
cd Backend
npm install
```

### 2. Set Up PostgreSQL Database

Create a new PostgreSQL database:

```bash
createdb nemi_ai_inbox
```

Or using psql:

```sql
CREATE DATABASE nemi_ai_inbox;
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/nemi_ai_inbox
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nemi_ai_inbox
DB_USER=your_username
DB_PASSWORD=your_password

# JWT Secrets (generate secure random strings)
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# AI Provider (choose one)
AI_PROVIDER=claude  # or 'openai'

# Claude API
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# OR OpenAI API
OPENAI_API_KEY=your-openai-api-key-here

# Firebase (get from Firebase Console)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY=your-firebase-private-key

# APNs (get from Apple Developer Portal)
APNS_KEY_ID=your-apns-key-id
APNS_TEAM_ID=your-apns-team-id
APNS_PRIVATE_KEY_PATH=./apns-key.p8
APNS_PRODUCTION=false
```

### 4. Run Database Migrations

```bash
npm run migrate
```

### 5. (Optional) Seed Database with Sample Data

```bash
npm run seed
```

### 6. Start the Backend Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

The backend API will be available at `http://localhost:3000`

## iOS Setup

### 1. Install Dependencies

The iOS app uses Swift Package Manager for dependencies. Open the project in Xcode, and dependencies will be resolved automatically.

### 2. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Add an iOS app with your bundle identifier
4. Download `GoogleService-Info.plist`
5. Add the file to your Xcode project at `iOS/NemiAIInbox/`

### 3. Configure Push Notifications

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create an App ID with Push Notifications enabled
3. Create an APNs Key
4. Download the `.p8` key file and save to Backend directory
5. Update `.env` with your APNs credentials

### 4. Update API Base URL

In `iOS/NemiAIInbox/Services/APIService.swift`, update the base URL:

```swift
private let baseURL = "http://localhost:3000/api"  // For simulator
// Or use your local IP for physical device testing
// private let baseURL = "http://192.168.1.x:3000/api"
```

### 5. Build and Run

1. Open `iOS/NemiAIInbox.xcodeproj` in Xcode
2. Select your target device or simulator
3. Press Cmd+R to build and run

## Email Provider Setup

### Gmail OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/gmail/callback`
6. Update `.env` with credentials:

```bash
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret
```

### Outlook OAuth Setup

1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application
3. Add Microsoft Graph API permissions for Mail.Read
4. Add redirect URI: `http://localhost:3000/api/auth/outlook/callback`
5. Update `.env` with credentials:

```bash
OUTLOOK_CLIENT_ID=your-outlook-client-id
OUTLOOK_CLIENT_SECRET=your-outlook-client-secret
```

## AI Configuration

### Using Claude (Recommended)

1. Get an API key from [Anthropic Console](https://console.anthropic.com/)
2. Set in `.env`:

```bash
AI_PROVIDER=claude
ANTHROPIC_API_KEY=your-api-key
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

### Using OpenAI

1. Get an API key from [OpenAI Platform](https://platform.openai.com/)
2. Set in `.env`:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-4-turbo-preview
```

## Testing

### Backend API Testing

Test the health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123.45
}
```

### Testing with Sample Data

If you seeded the database, you can login with:
- Email: `demo@example.com`
- Password: `password123`

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL is running: `pg_isready`
- Check connection string in `.env`
- Verify user permissions: `GRANT ALL PRIVILEGES ON DATABASE nemi_ai_inbox TO your_user;`

### iOS Build Issues

- Clean build folder: Product → Clean Build Folder (Cmd+Shift+K)
- Delete derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`
- Reset package cache: File → Packages → Reset Package Caches

### AI API Issues

- Verify API key is correct
- Check API rate limits and quota
- Review error logs: `tail -f Backend/logs/app.log`

### Push Notification Issues

- Ensure APNs key is properly configured
- Check bundle identifier matches
- Test on physical device (push notifications don't work in simulator)

## Next Steps

- Configure email provider OAuth for your account
- Customize AI prompts in `AI/prompts/`
- Extend email categories based on user needs
- Implement additional features from the roadmap

## Support

For issues and questions:
- Check the main [README.md](README.md)
- Review API documentation
- Open an issue on GitHub
