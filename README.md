# NemiAIInbox

An intelligent iOS email client powered by AI for automatic email classification, summarization, and smart notifications.

## Project Structure

```
NemiAIInbox/
├── iOS/                    # SwiftUI iOS application
│   └── NemiAIInbox/
│       ├── Views/          # SwiftUI views
│       ├── ViewModels/     # MVVM view models
│       ├── Models/         # iOS-specific models
│       ├── Services/       # API and service layer
│       └── Utils/          # Helper utilities
├── Backend/                # Node.js + Express API server
│   └── src/
│       ├── routes/         # API route definitions
│       ├── controllers/    # Request handlers
│       ├── services/       # Business logic
│       ├── middleware/     # Auth, validation, etc.
│       └── config/         # Configuration files
├── AI/                     # AI pipeline for classification & summarization
│   ├── services/           # AI service implementations
│   └── prompts/            # AI prompt templates
├── Shared/                 # Shared code between frontend & backend
│   ├── models/             # Shared data models
│   └── types/              # TypeScript types
└── Database/               # Database schema and migrations
    ├── migrations/         # DB migration files
    └── seeds/              # Seed data
```

## Technology Stack

- **Frontend**: SwiftUI (iOS 15+)
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Authentication**: Firebase / OAuth2
- **AI**: Claude / OpenAI API
- **Push Notifications**: Apple Push Notification Service (APNs)

## Features

### Core Features
- AI-powered email summarization
- Automatic email categorization (Work, Personal, Me-related)
- Dynamic, learning-based category creation
- Smart push notifications for important emails
- Rich email display with image support
- OAuth email provider integration

### Screens
1. **Feed Screen**: List view of emails with AI summaries
2. **Sidebar Menu**: Dynamic categories managed by AI
3. **Email Detail**: Full email content with AI summary and attachments
4. **Auth Flow**: Sign-in/Sign-up with OAuth support

## Setup Instructions

### 🚀 Quick Start (Monorepo - One Command!)

```bash
# Complete automated setup
./scripts/setup.sh

# Start everything
npm run dev
# or
make dev
```

**That's it!** The setup script handles everything: dependencies, database, migrations, and sample data.

### Manual Setup

```bash
# Install all dependencies
npm run install:all
# or
make install

# Setup database
npm run db:setup
# or
make db-setup

# Configure environment
cp Backend/.env.example Backend/.env
# Edit Backend/.env with your API keys

# Start development servers
npm run dev
# or
make dev
```

### iOS Setup
1. iOS project opens automatically with `npm run dev`
2. Or manually: Open `iOS/NemiAIInbox.xcodeproj` in Xcode
3. Configure Firebase in `GoogleService-Info.plist`
4. Update Bundle Identifier and signing
5. Build and run (Cmd+R)

📘 **See [MONOREPO_GUIDE.md](MONOREPO_GUIDE.md) for all available commands and workflows.**

## Configuration

### Environment Variables
See [Backend/.env.example](Backend/.env.example) for required configuration.

### Firebase Setup
1. Create a Firebase project
2. Enable Email/Password and OAuth providers
3. Download `GoogleService-Info.plist` to iOS project
4. Add Firebase Admin SDK credentials to backend

## API Endpoints

### Authentication
- `POST /auth/signup` - Create new user account
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token

### Emails
- `POST /emails/fetch` - Fetch emails from provider
- `POST /emails/classify` - Classify email categories
- `GET /emails` - List user emails
- `GET /emails/:id` - Get single email details

### Push Notifications
- `POST /push/send` - Send push notification
- `POST /push/register` - Register device token

## Development Roadmap

- [ ] iPad support with adaptive layouts
- [ ] Multi-user AI learning system
- [ ] Custom category training
- [ ] Email threading and conversations
- [ ] Search and filtering
- [ ] Attachment preview and management
- [ ] Dark mode support
- [ ] Offline support with local caching

## License

Copyright © 2025 NemiAIInbox. All rights reserved.
