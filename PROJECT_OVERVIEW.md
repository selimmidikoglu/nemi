# NemiAIInbox - Project Overview

## Executive Summary

NemiAIInbox is an intelligent iOS email client that leverages AI to automatically categorize, summarize, and prioritize emails. The system uses Claude or OpenAI to provide smart email management with features like dynamic categorization, AI-generated summaries, and intelligent notifications for important messages.

## Architecture Overview

### Tech Stack

**Frontend:**
- SwiftUI for iOS (targeting iOS 15+)
- MVVM architecture pattern
- Combine framework for reactive programming
- Native iOS notifications (APNs)

**Backend:**
- Node.js with Express.js
- TypeScript for type safety
- PostgreSQL for data persistence
- JWT for authentication
- RESTful API architecture

**AI/ML:**
- Claude 3.5 Sonnet (Anthropic) or GPT-4 (OpenAI)
- Custom prompt engineering for classification and summarization
- Batch processing for efficiency

**Infrastructure:**
- PostgreSQL database with migrations
- Firebase for OAuth authentication
- Apple Push Notification Service (APNs)
- Email provider APIs (Gmail, Outlook, iCloud)

## Core Features

### 1. AI-Powered Email Summarization
- Automatic generation of concise email summaries
- Context-aware summarization focusing on key points
- Preserves sender intent and action items

### 2. Smart Email Categorization
- 8 predefined categories: Work, Personal, Me-related, Finance, Social, Promotions, Newsletters, Other
- Dynamic category learning based on user behavior
- Importance level classification (Critical, High, Normal, Low)
- "Me-related" flag for personally relevant emails

### 3. Intelligent Notifications
- Push notifications for important emails only
- User-configurable notification preferences by category
- Priority-based notification system
- Rich notifications with quick actions (Reply, Mark Read, Delete)

### 4. Email Management
- Clean, intuitive SwiftUI interface
- Swipe actions for quick email management
- Full-text search and filtering
- Attachment preview and management
- Star/unstar and read/unread status

### 5. Multi-Provider Support
- Gmail OAuth integration
- Outlook OAuth integration
- iCloud support (planned)
- Yahoo support (planned)

## Project Structure

```
NemiAIInbox/
├── iOS/                          # iOS application
│   └── NemiAIInbox/
│       ├── Views/                # SwiftUI views
│       │   ├── FeedScreen.swift
│       │   ├── SidebarMenu.swift
│       │   ├── EmailDetailScreen.swift
│       │   └── AuthFlow.swift
│       ├── ViewModels/           # MVVM view models
│       │   ├── FeedViewModel.swift
│       │   └── AuthViewModel.swift
│       ├── Models/               # Data models
│       │   ├── Email.swift
│       │   └── User.swift
│       ├── Services/             # API and service layer
│       │   └── APIService.swift
│       └── Utils/                # Utilities
│           └── PushNotificationHandler.swift
│
├── Backend/                      # Node.js backend
│   └── src/
│       ├── routes/               # API routes
│       │   ├── auth.routes.ts
│       │   ├── email.routes.ts
│       │   └── push.routes.ts
│       ├── controllers/          # Request handlers
│       │   ├── auth.controller.ts
│       │   ├── email.controller.ts
│       │   └── push.controller.ts
│       ├── services/             # Business logic
│       │   ├── auth.service.ts
│       │   ├── email.service.ts
│       │   ├── ai.service.ts
│       │   └── push.service.ts
│       ├── middleware/           # Express middleware
│       │   ├── auth.ts
│       │   ├── errorHandler.ts
│       │   └── validateRequest.ts
│       └── config/               # Configuration
│           ├── database.ts
│           └── logger.ts
│
├── AI/                           # AI pipeline
│   ├── services/
│   │   ├── emailSummarizer.ts    # Email summarization
│   │   └── categoryClassifier.ts # Email classification
│   └── prompts/                  # AI prompt templates
│       ├── summarize_email.txt
│       └── classify_email.txt
│
├── Shared/                       # Shared code
│   ├── models/                   # Shared data models
│   │   ├── Email.ts
│   │   └── User.ts
│   └── types/                    # TypeScript types
│       └── api.ts
│
└── Database/                     # Database layer
    ├── migrations/               # SQL migrations
    │   └── 001_initial_schema.sql
    └── seeds/                    # Seed data
        └── 001_sample_data.sql
```

## Data Flow

### Email Fetching & Processing Flow

1. **User Authentication**
   - User logs in via email/password or OAuth
   - JWT tokens issued (access + refresh)
   - Tokens stored securely in iOS Keychain

2. **Email Fetching**
   - iOS app requests email fetch from provider
   - Backend connects to email provider API (Gmail/Outlook)
   - Raw emails retrieved and stored temporarily

3. **AI Processing**
   - Emails sent to AI service in batches
   - EmailSummarizer generates summaries
   - CategoryClassifier determines category, importance, and relevance
   - Results stored in database

4. **Push Notifications**
   - High-priority or Me-related emails trigger notifications
   - Notification sent via APNs to user's device
   - User can interact with notification (quick actions)

5. **Display**
   - iOS app fetches processed emails from backend
   - Emails displayed with summaries and categorization
   - User can view full details, reply, archive, etc.

## Database Schema

### Users Table
- User authentication and profile information
- Email provider connection status
- User preferences (notifications, AI features, theme)

### Emails Table
- Complete email content and metadata
- AI-generated fields (summary, category, importance)
- Read/starred/deleted status
- Foreign key to user

### Email Attachments Table
- Attachment metadata
- Download URLs
- Foreign key to email

### Device Tokens Table
- APNs device tokens for push notifications
- Foreign key to user

### Refresh Tokens Table
- JWT refresh tokens for authentication
- Expiration tracking

## Security Considerations

### Authentication
- Passwords hashed with bcrypt (10 rounds)
- JWT access tokens (24h expiry)
- JWT refresh tokens (7 days expiry)
- Tokens transmitted via HTTPS only

### Data Protection
- User emails stored encrypted at rest (planned)
- API keys stored in environment variables
- Database credentials secured
- OAuth tokens encrypted in database

### API Security
- Rate limiting (100 req/15min)
- Request validation using express-validator
- CORS configuration for allowed origins
- Helmet.js for HTTP headers security

## AI Integration

### Prompt Engineering

**Summarization Prompts:**
- Focus on key points and action items
- Maintain professional tone
- Character limit for mobile display
- Time-sensitive information prioritization

**Classification Prompts:**
- Structured JSON output
- Context-aware categorization
- Confidence scoring
- Reasoning explanation for debugging

### Performance Optimization
- Batch processing (10 emails at a time)
- Configurable AI provider (Claude/OpenAI)
- Fallback to basic categorization on AI failure
- Caching of AI results

## Future Enhancements

### Phase 2 Features
- [ ] iPad support with adaptive layouts
- [ ] Email threading and conversations
- [ ] Advanced search with filters
- [ ] Custom category creation and training
- [ ] Snooze functionality
- [ ] Email templates for quick replies

### Phase 3 Features
- [ ] Multi-account support
- [ ] Calendar integration
- [ ] Contact management
- [ ] Email scheduling
- [ ] Dark mode optimization
- [ ] Offline support with local database

### Phase 4 Features
- [ ] AI-powered smart compose
- [ ] Meeting scheduler integration
- [ ] Email analytics dashboard
- [ ] Team collaboration features
- [ ] macOS app

## Development Guidelines

### Code Style
- TypeScript strict mode enabled
- ESLint for code quality
- SwiftLint for iOS code (to be added)
- Consistent naming conventions

### Git Workflow
- Feature branches from main
- Pull request reviews required
- Semantic commit messages
- CI/CD pipeline (to be implemented)

### Testing Strategy
- Unit tests for services and utilities
- Integration tests for API endpoints
- UI tests for critical user flows
- End-to-end testing for main features

## Performance Targets

- API response time: < 200ms (p95)
- Email fetch time: < 5s for 50 emails
- AI processing: < 10s for batch of 10 emails
- App launch time: < 2s
- Memory usage: < 150MB
- Database query time: < 50ms (p95)

## Monitoring & Logging

### Backend Logging
- Winston logger with rotating files
- Error tracking with stack traces
- Request/response logging
- Database query performance logging

### iOS Logging
- OSLog for structured logging
- Crash reporting (to be added)
- Analytics events (to be added)
- Performance monitoring (to be added)

## Deployment

### Backend Deployment
- Docker containerization (planned)
- Environment-based configuration
- Database migrations automated
- Health check endpoints

### iOS Deployment
- TestFlight for beta testing
- App Store submission
- Staged rollout strategy
- Version management

## Contributing

See [SETUP.md](SETUP.md) for development environment setup.
See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for API reference.

## License

Copyright © 2025 NemiAIInbox. All rights reserved.
