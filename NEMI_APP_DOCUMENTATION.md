# NEMI - AI-Powered Intelligent Email Management Application

## Complete Technical Documentation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Core Features & Functionality](#4-core-features--functionality)
5. [Database Architecture](#5-database-architecture)
6. [API Endpoints Reference](#6-api-endpoints-reference)
7. [Services & Business Logic](#7-services--business-logic)
8. [Email Provider Integrations](#8-email-provider-integrations)
9. [AI/ML Features Deep Dive](#9-aiml-features-deep-dive)
10. [Real-Time Architecture](#10-real-time-architecture)
11. [Authentication & Security](#11-authentication--security)
12. [Frontend Architecture](#12-frontend-architecture)
13. [Unique & Innovative Features](#13-unique--innovative-features)
14. [File Structure](#14-file-structure)
15. [Infrastructure & Deployment](#15-infrastructure--deployment)

---

## 1. Executive Summary

### What is NEMI?

**NEMI** (NemiAIInbox) is an **intelligent email management application** that leverages artificial intelligence to automatically analyze, categorize, and prioritize emails. It transforms the traditional email experience by providing:

- **AI-powered email analysis and summarization** - Every email is analyzed before being displayed
- **Smart badge and category system** - Dynamic, learning categorization
- **Real-time push notifications** - Instant email delivery via Gmail Pub/Sub and Outlook Webhooks
- **Advanced search with Elasticsearch** - Full-text search with complex queries
- **Multi-provider support** - Gmail, Outlook, and IMAP integration
- **Engagement tracking** - Personalized inbox ordering based on user behavior
- **Smart unsubscribe recommendations** - AI-powered newsletter management

### Key Value Propositions

1. **AI-First Approach**: Unlike traditional email clients, NEMI analyzes emails BEFORE displaying them
2. **Adaptive Learning**: The inbox learns from your behavior and reorders emails accordingly
3. **Visual Email Cards**: Beautiful HTML cards with dark mode support for quick scanning
4. **Unified Experience**: Same powerful features across Gmail, Outlook, and IMAP providers
5. **Privacy-Focused**: All processing happens on your infrastructure

---

## 2. Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           NEMI Architecture                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐    │
│  │   Next.js    │────▶│   Express    │────▶│   PostgreSQL     │    │
│  │   Frontend   │     │   Backend    │     │   Database       │    │
│  │   (React)    │◀────│   (Node.js)  │     │   (28 tables)    │    │
│  └──────────────┘     └──────────────┘     └──────────────────┘    │
│         │                    │                      │               │
│         │              ┌─────┴─────┐                │               │
│         │              │           │                │               │
│         ▼              ▼           ▼                ▼               │
│  ┌──────────────┐ ┌────────┐ ┌─────────┐  ┌────────────────┐       │
│  │  WebSocket   │ │  AI    │ │ Search  │  │  Email         │       │
│  │  Server      │ │ Engine │ │ Engine  │  │  Providers     │       │
│  │  (ws)        │ │(OpenAI)│ │(Elastic)│  │(Gmail/Outlook) │       │
│  └──────────────┘ └────────┘ └─────────┘  └────────────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Email Provider (Gmail/Outlook/IMAP)
          │
          ▼
    ┌─────────────┐
    │  Webhook /  │ ◀── Gmail Pub/Sub, Outlook Graph Webhooks
    │  Sync Job   │
    └─────────────┘
          │
          ▼
    ┌─────────────┐
    │  AI Engine  │ ◀── OpenAI GPT-4 / DeepSeek / Claude
    │  Analysis   │
    └─────────────┘
          │
          ▼
    ┌─────────────┐
    │  Database   │ ◀── Save email + analysis + badges + scores
    │  Storage    │
    └─────────────┘
          │
          ▼
    ┌─────────────┐
    │  WebSocket  │ ◀── Notify connected clients
    │  Broadcast  │
    └─────────────┘
          │
          ▼
    ┌─────────────┐
    │  Frontend   │ ◀── Real-time UI update
    │  Display    │
    └─────────────┘
```

---

## 3. Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type-safe JavaScript |
| **Tailwind CSS** | Utility-first CSS framework |
| **Zustand** | Lightweight state management |
| **Axios** | HTTP client with interceptors |
| **WebSocket** | Real-time communication |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime |
| **Express** | Web framework |
| **TypeScript** | Type safety |
| **ws** | WebSocket server |
| **node-cron** | Background job scheduling |
| **bcryptjs** | Password hashing |
| **jsonwebtoken** | JWT authentication |

### Database & Search
| Technology | Purpose |
|------------|---------|
| **PostgreSQL** | Primary relational database |
| **Elasticsearch** | Full-text search engine |
| **pg** | PostgreSQL Node.js client |

### AI & ML
| Technology | Purpose |
|------------|---------|
| **OpenAI GPT-4** | Primary AI model |
| **DeepSeek** | Cost-effective alternative |
| **Claude (Anthropic)** | Secondary AI option |

### Email Integrations
| Technology | Purpose |
|------------|---------|
| **Google APIs** | Gmail, People, Pub/Sub |
| **Microsoft Graph** | Outlook integration |
| **node-imap** | Generic IMAP support |
| **Nodemailer** | SMTP email sending |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **Docker Compose** | Local development environment |
| **Ngrok** | Webhook tunneling for development |

---

## 4. Core Features & Functionality

### 4.1 Multi-Provider Email Support

NEMI supports three email providers with unified experience:

#### Gmail Integration
- **OAuth 2.0 Authentication** with automatic token refresh
- **Push Notifications** via Google Cloud Pub/Sub
- **Full CRUD Operations**: Read, compose, reply, archive, trash, star
- **Thread Support**: Conversation grouping
- **Label Management**: Read and apply Gmail labels
- **Bi-directional Sync**: Actions sync back to Gmail

#### Outlook/Hotmail Integration
- **OAuth 2.0 Authentication** with Microsoft identity platform
- **Push Notifications** via Microsoft Graph Webhooks
- **Full CRUD Operations**: Read, archive, delete
- **Delta Query**: Efficient incremental sync
- **Multi-account**: Support for multiple Outlook accounts

#### IMAP Integration
- **Universal Support**: Any IMAP-compatible email server
- **Secure Storage**: AES-256 encrypted credentials
- **UID Tracking**: Efficient incremental sync
- **Provider Detection**: Auto-detect Yahoo, iCloud, custom servers

### 4.2 AI-Powered Email Analysis

Every email undergoes comprehensive AI analysis:

#### Summary Generation
- **Ultra-concise summaries**: Maximum 60 characters
- **Skip fluff**: Removes greetings, signatures, pleasantries
- **Action-focused**: Highlights what needs to be done

#### 7-Dimensional Scoring System
Each email receives scores from 0.0 to 1.0:

| Score | Description | Example Triggers |
|-------|-------------|------------------|
| `promotional_score` | Marketing/advertising content | "Sale", "Discount", "Unsubscribe" |
| `personal_score` | Personal correspondence | Family names, personal tone |
| `urgent_score` | Time-sensitive items | "URGENT", deadlines, expiring offers |
| `work_score` | Professional/work-related | Company domains, project names |
| `financial_score` | Money-related content | Invoices, payments, bank statements |
| `social_score` | Social network activity | LinkedIn, Twitter, event invites |
| `requires_action_score` | Needs user response | Questions, approval requests, RSVPs |

#### Master Importance Score Calculation
```javascript
// Score weights
const weights = {
  urgent: 1.0,
  requires_action: 0.9,
  personal: 0.6,
  work_related: 0.5,
  financial: 0.4,
  social: 0.3,
  promotional: 0.1
};

// Calculate weighted sum + badge boost
masterScore = Σ(score * weight) + (badgeCount * 0.1);
```

### 4.3 Smart Badge System

#### Dynamic Badge Generation
- **1-5 badges per email**: AI determines appropriate number
- **Color coding**: Semantic colors (red=urgent, green=money, blue=work)
- **Icon selection**: Emoji icons for visual recognition
- **Importance scores**: 0.0-1.0 per badge

#### 14 Predefined Categories
```
Coding, Communication, Tasks, Finance, Social, Travel,
Shopping, Health, Education, Entertainment, News,
Government, Security, Personal
```

#### Dynamic Category Creation
AI creates new categories when needed:
```
Beauty, Fashion, Gaming, Crypto, Pets, Real Estate,
Automotive, Food & Dining, Fitness, Hobbies
```

#### Company/Service Badges
Automatic detection of 50+ services:
```
GitHub, Slack, LinkedIn, Twitter/X, Stripe, PayPal,
AWS, Google Cloud, Vercel, Notion, Figma, Jira, etc.
```

### 4.4 HTML Card Rendering

Every email gets a beautiful visual card:

#### Card Specifications
- **Layout**: Horizontal (flex-row), single-line
- **Height**: Maximum 60px
- **Theme**: Light + Dark mode support (`dark:` variants)
- **Styling**: Full Tailwind CSS

#### Card Types

**Meeting Cards**
```html
📅 Team Standup | Today 2:00 PM | [Join Meeting]
```

**Flight Cards**
```html
✈️ UA 1234 | SFO → NYC | Gate B12 | Boards 3:45 PM
```

**GitHub PR Cards**
```html
💻 anthropics/claude-code #1234 | Fix auth bug | [View PR]
```

**Invoice Cards**
```html
💰 Invoice #INV-2024-001 | $1,250.00 | Due Jan 15 | [Pay Now]
```

**Package Tracking Cards**
```html
📦 Your order shipped! | Arrives Dec 18 | [Track Package]
```

### 4.5 Engagement Tracking & Personalization

#### Tracked Events
| Event | Data Captured |
|-------|---------------|
| `email_opened` | Timestamp, email ID, user ID |
| `email_closed` | Duration (ms), email ID |
| `link_clicked` | Link URL, click count |
| `badge_filtered` | Badge name, timestamp |
| `badge_selected` | Badge name, email ID |

#### View Session Tracking
```typescript
{
  email_id: number,
  user_id: number,
  opened_at: timestamp,
  closed_at: timestamp,
  duration_ms: number,
  link_click_count: number
}
```

#### Personalized Inbox Ordering
```sql
-- Emails ordered by personalized score
personalizedScore =
  (masterImportanceScore * 0.3) +
  (AVG(badgeEngagementScore * badgeImportance) * 0.7)

ORDER BY personalizedScore DESC, date DESC
```

### 4.6 Smart Unsubscribe System

#### Recommendation Algorithm
```javascript
// Configurable thresholds
settings = {
  timeRange: 30,        // days to analyze
  minEmails: 5,         // minimum emails for recommendation
  maxOpenRate: 0.1,     // 10% or less
  inactiveDays: 14      // days since last open
}

// Recommendation score calculation
score = (1 - openRate) * (totalEmails / 100) * (daysSinceLastOpen / 365)
```

#### Unsubscribe Methods
1. **URL Detection**: Finds unsubscribe links in email headers and body
2. **Mailto Detection**: Detects mailto:unsubscribe links
3. **One-Click**: Opens unsubscribe URL automatically
4. **Manual Tracking**: Marks sender as unsubscribed

### 4.7 Advanced Search (Elasticsearch)

#### Search Capabilities
| Feature | Example |
|---------|---------|
| **From filter** | `from:github.com` |
| **To filter** | `to:team@company.com` |
| **Subject search** | `subject:meeting` |
| **Full-text** | `quarterly report` |
| **Exclude words** | `NOT newsletter` |
| **Attachments** | `has:attachment` |
| **Date range** | `after:2024-01-01 before:2024-12-31` |

#### Search Response
```json
{
  "emails": [...],
  "total": 150,
  "badgeStats": {
    "GitHub": 23,
    "Work": 45,
    "Urgent": 12
  }
}
```

---

## 5. Database Architecture

### Schema Overview (28 Tables)

#### Core Tables

##### `users`
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  photo_url TEXT,
  preferences JSONB DEFAULT '{}',
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

##### `emails`
```sql
CREATE TABLE emails (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  email_account_id INTEGER REFERENCES email_accounts(id),
  provider_message_id VARCHAR(255) NOT NULL,
  provider_thread_id VARCHAR(255),

  -- Sender/Recipients (JSONB for flexibility)
  from_address JSONB NOT NULL,    -- {email, name}
  to_addresses JSONB,              -- [{email, name}, ...]
  cc_addresses JSONB,
  bcc_addresses JSONB,
  reply_to JSONB,

  -- Content
  subject TEXT,
  body TEXT,
  html_body TEXT,
  snippet VARCHAR(500),

  -- Status flags
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  has_attachments BOOLEAN DEFAULT false,

  -- AI Analysis Results
  ai_summary VARCHAR(200),
  category VARCHAR(100),
  importance VARCHAR(20),
  master_importance_score DECIMAL(5,4),
  ai_raw_response JSONB,

  -- Enhanced AI fields
  is_about_me BOOLEAN DEFAULT false,
  mention_context TEXT,
  html_snippet TEXT,
  render_as_html BOOLEAN DEFAULT false,

  -- Company detection
  company_name VARCHAR(255),
  company_domain VARCHAR(255),
  company_logo_url TEXT,

  -- Unsubscribe
  unsubscribe_url TEXT,
  unsubscribe_email VARCHAR(255),

  -- Snooze
  snoozed_until TIMESTAMP,

  -- Provider sync
  imap_uid INTEGER,

  -- Timestamps
  date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,

  UNIQUE(email_account_id, provider_message_id)
);
```

##### `email_accounts`
```sql
CREATE TABLE email_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  provider VARCHAR(50) NOT NULL,  -- 'gmail', 'outlook', 'imap'
  email_address VARCHAR(255) NOT NULL,

  -- OAuth tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,

  -- IMAP credentials (encrypted)
  imap_host VARCHAR(255),
  imap_port INTEGER,
  imap_secure BOOLEAN DEFAULT true,
  encrypted_password TEXT,

  -- Sync state
  last_sync_at TIMESTAMP,
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_error TEXT,

  -- Push notification state
  gmail_history_id VARCHAR(255),
  gmail_watch_expiration TIMESTAMP,
  outlook_subscription_id VARCHAR(255),
  outlook_subscription_expiration TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, email_address)
);
```

##### `email_badges`
```sql
CREATE TABLE email_badges (
  id SERIAL PRIMARY KEY,
  email_id INTEGER REFERENCES emails(id) ON DELETE CASCADE,
  badge_name VARCHAR(100) NOT NULL,
  badge_color VARCHAR(50),
  badge_icon VARCHAR(50),
  importance_score DECIMAL(3,2) CHECK (importance_score BETWEEN 0 AND 1),
  category VARCHAR(100),
  created_by_ai BOOLEAN DEFAULT true,
  user_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(email_id, badge_name)
);
```

##### `email_scores`
```sql
CREATE TABLE email_scores (
  id SERIAL PRIMARY KEY,
  email_id INTEGER REFERENCES emails(id) ON DELETE CASCADE UNIQUE,
  promotional_score DECIMAL(3,2) CHECK (promotional_score BETWEEN 0 AND 1),
  personal_score DECIMAL(3,2) CHECK (personal_score BETWEEN 0 AND 1),
  urgent_score DECIMAL(3,2) CHECK (urgent_score BETWEEN 0 AND 1),
  work_score DECIMAL(3,2) CHECK (work_score BETWEEN 0 AND 1),
  financial_score DECIMAL(3,2) CHECK (financial_score BETWEEN 0 AND 1),
  social_score DECIMAL(3,2) CHECK (social_score BETWEEN 0 AND 1),
  requires_action_score DECIMAL(3,2) CHECK (requires_action_score BETWEEN 0 AND 1),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Engagement Tables

##### `email_view_sessions`
```sql
CREATE TABLE email_view_sessions (
  id SERIAL PRIMARY KEY,
  email_id INTEGER REFERENCES emails(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  opened_at TIMESTAMP NOT NULL,
  closed_at TIMESTAMP,
  duration_ms INTEGER,
  link_click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

##### `badge_engagement_metrics`
```sql
CREATE TABLE badge_engagement_metrics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  badge_name VARCHAR(100) NOT NULL,
  total_emails INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_with_link_clicks INTEGER DEFAULT 0,
  total_time_spent_ms BIGINT DEFAULT 0,
  total_link_clicks INTEGER DEFAULT 0,
  open_rate DECIMAL(5,4),
  click_rate DECIMAL(5,4),
  engagement_score DECIMAL(5,4),
  last_updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, badge_name)
);
```

##### `sender_engagement_metrics`
```sql
CREATE TABLE sender_engagement_metrics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  sender_email VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255),
  company_name VARCHAR(255),
  company_logo_url TEXT,
  total_emails INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  open_rate DECIMAL(5,4),
  total_time_spent_ms BIGINT DEFAULT 0,
  engagement_score DECIMAL(5,4),
  has_unsubscribe_option BOOLEAN DEFAULT false,
  unsubscribe_url TEXT,
  unsubscribe_email VARCHAR(255),
  is_unsubscribed BOOLEAN DEFAULT false,
  last_email_at TIMESTAMP,
  last_opened_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, sender_email)
);
```

#### Session & Auth Tables

##### `sessions`
```sql
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  device_type VARCHAR(50),
  device_name VARCHAR(255),
  user_agent TEXT,
  ip_address INET,
  remember_me BOOLEAN DEFAULT false,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
```

##### `refresh_tokens`
```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Database Indexes

```sql
-- Email queries
CREATE INDEX idx_emails_user_date ON emails(user_id, date DESC);
CREATE INDEX idx_emails_account ON emails(email_account_id);
CREATE INDEX idx_emails_provider_msg ON emails(provider_message_id);
CREATE INDEX idx_emails_read ON emails(user_id, is_read);
CREATE INDEX idx_emails_starred ON emails(user_id, is_starred);
CREATE INDEX idx_emails_archived ON emails(user_id, is_archived);
CREATE INDEX idx_emails_snoozed ON emails(snoozed_until) WHERE snoozed_until IS NOT NULL;

-- Badge queries
CREATE INDEX idx_badges_email ON email_badges(email_id);
CREATE INDEX idx_badges_name ON email_badges(badge_name);
CREATE INDEX idx_badges_category ON email_badges(category);

-- Engagement queries
CREATE INDEX idx_view_sessions_email ON email_view_sessions(email_id);
CREATE INDEX idx_view_sessions_user ON email_view_sessions(user_id);
CREATE INDEX idx_engagement_events_user ON email_engagement_events(user_id);
CREATE INDEX idx_engagement_events_type ON email_engagement_events(event_type);
CREATE INDEX idx_engagement_events_data ON email_engagement_events USING GIN(event_data);
```

---

## 6. API Endpoints Reference

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/signup` | Register new user |
| `POST` | `/login` | Login with credentials |
| `POST` | `/logout` | Logout (revoke tokens) |
| `POST` | `/refresh` | Refresh access token |
| `GET` | `/sessions` | List active sessions |
| `DELETE` | `/sessions/:id` | Revoke specific session |
| `DELETE` | `/sessions` | Revoke all sessions |
| `GET` | `/gmail` | Start Gmail OAuth |
| `GET` | `/gmail/callback` | Gmail OAuth callback |
| `GET` | `/outlook` | Start Outlook OAuth |
| `GET` | `/outlook/callback` | Outlook OAuth callback |
| `POST` | `/resend-verification` | Resend email verification |

### Email Routes (`/api/emails`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | List emails (paginated, filtered) |
| `GET` | `/snoozed` | Get snoozed emails |
| `GET` | `/archived` | Get archived emails |
| `GET` | `/deleted` | Get deleted (trash) emails |
| `GET` | `/:id` | Get email by ID |
| `PATCH` | `/:id/read` | Mark as read/unread |
| `PATCH` | `/:id/star` | Toggle star |
| `POST` | `/:id/trash` | Move to trash |
| `DELETE` | `/:id/trash` | Restore from trash |
| `DELETE` | `/:id` | Permanently delete |
| `POST` | `/bulk-delete` | Delete multiple emails |
| `POST` | `/fetch` | Sync from provider |
| `GET` | `/badges/stats` | Badge statistics |
| `GET` | `/categories/stats` | Category statistics |
| `GET` | `/analysis/progress` | AI analysis progress |

### Email Account Routes (`/api/email-accounts`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | List connected accounts |
| `POST` | `/` | Add new account |
| `DELETE` | `/:id` | Remove account |
| `POST` | `/:id/sync` | Trigger manual sync |

### Search Routes (`/api/search`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Advanced search (Elasticsearch) |

**Query Parameters:**
```
?q=search+term
&from=sender@email.com
&to=recipient@email.com
&subject=meeting
&hasAttachment=true
&after=2024-01-01
&before=2024-12-31
&page=1
&limit=20
```

### Analytics Routes (`/api/analytics`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/events` | Record engagement event |
| `POST` | `/view-sessions` | Save view session |
| `GET` | `/overview` | Analytics overview |
| `GET` | `/reading-stats` | Reading behavior stats |
| `GET` | `/top-badges` | Most engaged badges |

### Badge Routes (`/api/badges`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/:badgeName/emails` | Emails with specific badge |
| `POST` | `/reorder` | Update badge display order |
| `GET` | `/engagement` | Badge engagement metrics |

### Unsubscribe Routes (`/api/unsubscribe`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/settings` | Get user settings |
| `PATCH` | `/settings` | Update settings |
| `GET` | `/recommendations` | Get recommendations |
| `GET` | `/recommendations/count` | Count pending recommendations |
| `POST` | `/recommendations/generate` | Generate new recommendations |
| `POST` | `/recommendations/dismiss` | Dismiss recommendation |
| `POST` | `/unsubscribe` | Unsubscribe from senders |
| `GET` | `/senders` | All sender metrics |
| `GET` | `/senders/low-engagement` | Low engagement senders |

### Contacts Routes (`/api/contacts`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/search` | Search contacts |
| `GET` | `/recent` | Recent contacts |
| `GET` | `/frequent` | Frequent contacts |

### Webhook Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/gmail/webhook` | Gmail Pub/Sub notifications |
| `GET` | `/api/outlook/webhook` | Outlook validation challenge |
| `POST` | `/api/outlook/webhook` | Outlook Graph notifications |

---

## 7. Services & Business Logic

### 7.1 DeepEmailAnalyzerService

The core AI engine that analyzes every email.

#### Initialization
```typescript
class DeepEmailAnalyzerService {
  private openai: OpenAI;
  private prompt: string;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.prompt = fs.readFileSync('AI/prompts/deep_email_analysis.txt', 'utf-8');
  }
}
```

#### Analysis Flow
```typescript
async analyzeEmail(email: RawEmail, userId: number): Promise<AnalysisResult> {
  // 1. Get user context (learned badges, categories)
  const userContext = await this.getUserContext(userId);

  // 2. Parse sender domain for company intelligence
  const senderInfo = this.parseEmailSender(email.from);

  // 3. Build personalized prompt
  const fullPrompt = this.buildPrompt(email, userContext, senderInfo);

  // 4. Call AI model
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{ role: 'user', content: fullPrompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3
  });

  // 5. Parse and validate response
  const analysis = this.parseResponse(response);

  // 6. Calculate master score
  analysis.masterScore = this.calculateMasterScore(analysis);

  // 7. Save to database
  await this.saveAnalysis(email.id, analysis, userId);

  return analysis;
}
```

#### Known Service Detection
```typescript
const KNOWN_SERVICES = {
  'github.com': { name: 'GitHub', icon: '💻', category: 'Coding' },
  'slack.com': { name: 'Slack', icon: '💬', category: 'Communication' },
  'linkedin.com': { name: 'LinkedIn', icon: '💼', category: 'Social' },
  'stripe.com': { name: 'Stripe', icon: '💳', category: 'Finance' },
  // ... 50+ more
};
```

### 7.2 GmailService

Gmail API integration with comprehensive features.

```typescript
class GmailService {
  // Fetch recent emails
  async fetchEmails(accessToken: string, maxResults: number = 100): Promise<Email[]>;

  // Get full email details
  async getEmailDetails(accessToken: string, messageId: string): Promise<EmailDetails>;

  // Extract inline images (CID to base64)
  async extractInlineImages(message: GmailMessage): Promise<Map<string, string>>;

  // Email actions
  async markAsRead(accessToken: string, messageId: string): Promise<void>;
  async markAsUnread(accessToken: string, messageId: string): Promise<void>;
  async starEmail(accessToken: string, messageId: string): Promise<void>;
  async unstarEmail(accessToken: string, messageId: string): Promise<void>;
  async archiveEmail(accessToken: string, messageId: string): Promise<void>;
  async trashEmail(accessToken: string, messageId: string): Promise<void>;
  async untrashEmail(accessToken: string, messageId: string): Promise<void>;

  // Compose
  async sendEmail(accessToken: string, email: ComposeEmail): Promise<void>;
}
```

### 7.3 GmailPushService

Real-time Gmail notifications via Pub/Sub.

```typescript
class GmailPushService {
  private wsServer: WebSocket.Server;
  private clients: Map<number, WebSocket[]> = new Map();

  // Initialize WebSocket server
  initializeWebSocket(server: http.Server): void {
    this.wsServer = new WebSocket.Server({ server, path: '/ws' });

    this.wsServer.on('connection', (ws, req) => {
      const userId = this.extractUserId(req);
      this.addClient(userId, ws);

      ws.on('close', () => this.removeClient(userId, ws));
    });
  }

  // Setup Gmail watch
  async setupWatch(accountId: number): Promise<WatchResponse> {
    const watch = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: `projects/${PROJECT_ID}/topics/${TOPIC_NAME}`,
        labelIds: ['INBOX']
      }
    });

    // Save historyId and expiration
    await this.saveWatchState(accountId, watch.data);

    return watch.data;
  }

  // Process Pub/Sub notification
  async processNotification(data: PubSubMessage): Promise<void> {
    const { emailAddress, historyId } = JSON.parse(
      Buffer.from(data.message.data, 'base64').toString()
    );

    // Get history changes
    const changes = await this.getHistoryChanges(emailAddress, historyId);

    // Fetch new emails
    const emails = await this.fetchNewEmails(changes.messagesAdded);

    // Analyze with AI
    const analyzedEmails = await this.analyzeEmails(emails);

    // Notify connected clients
    this.notifyUser(userId, {
      type: 'new_emails',
      emails: analyzedEmails
    });
  }

  // Notify user via WebSocket
  notifyUser(userId: number, data: WebSocketMessage): void {
    const userClients = this.clients.get(userId) || [];
    userClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
  }
}
```

### 7.4 EngagementService

User engagement tracking and analytics.

```typescript
class EngagementService {
  // Record engagement event
  async recordEvent(userId: number, event: EngagementEvent): Promise<void>;

  // Save view session
  async saveViewSession(session: ViewSession): Promise<void>;

  // Refresh badge metrics (materialized view)
  async refreshBadgeMetrics(userId: number): Promise<void>;

  // Update sender metrics
  async updateSenderMetrics(userId: number, senderEmail: string): Promise<void>;

  // Get analytics overview
  async getOverview(userId: number): Promise<AnalyticsOverview>;

  // Get badge engagement
  async getBadgeEngagement(userId: number): Promise<BadgeEngagement[]>;

  // Get reading stats
  async getReadingStats(userId: number): Promise<ReadingStats>;
}
```

### 7.5 UnsubscribeService

Smart unsubscribe recommendations.

```typescript
class UnsubscribeService {
  // Generate recommendations
  async generateRecommendations(userId: number): Promise<Recommendation[]> {
    const settings = await this.getSettings(userId);

    // Get senders with low engagement
    const senders = await this.getLowEngagementSenders(userId, {
      timeRange: settings.timeRange,
      minEmails: settings.minEmails,
      maxOpenRate: settings.maxOpenRate,
      inactiveDays: settings.inactiveDays
    });

    // Calculate recommendation scores
    const recommendations = senders.map(sender => ({
      ...sender,
      score: this.calculateScore(sender)
    }));

    // Save recommendations
    await this.saveRecommendations(userId, recommendations);

    return recommendations;
  }

  // Calculate recommendation score
  calculateScore(sender: SenderMetrics): number {
    return (1 - sender.openRate) *
           (sender.totalEmails / 100) *
           (sender.daysSinceLastOpen / 365);
  }

  // Unsubscribe from sender
  async unsubscribe(userId: number, senderEmail: string): Promise<void>;
}
```

---

## 8. Email Provider Integrations

### 8.1 Gmail Integration Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    Gmail Integration Flow                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User clicks "Connect Gmail"                                    │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │ GET /auth/  │───▶│   Google     │───▶│ OAuth Consent   │   │
│  │   gmail     │    │  Auth URL    │    │     Screen      │   │
│  └─────────────┘    └──────────────┘    └─────────────────┘   │
│                                                │               │
│                                                ▼               │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │   Save      │◀───│  Exchange    │◀───│ Callback with   │   │
│  │   Tokens    │    │    Code      │    │   Auth Code     │   │
│  └─────────────┘    └──────────────┘    └─────────────────┘   │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │  Setup      │───▶│  Google      │───▶│ 7-day Watch     │   │
│  │  Watch      │    │  Pub/Sub     │    │  Subscription   │   │
│  └─────────────┘    └──────────────┘    └─────────────────┘   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 8.2 Gmail Push Notification Flow

```
┌────────────────────────────────────────────────────────────────┐
│               Gmail Push Notification Flow                      │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  New email arrives in Gmail                                     │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │   Gmail     │───▶│  Pub/Sub     │───▶│  Push to        │   │
│  │   Server    │    │   Topic      │    │  Webhook        │   │
│  └─────────────┘    └──────────────┘    └─────────────────┘   │
│                                                │               │
│                                                ▼               │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │ POST        │───▶│  Validate    │───▶│ Get History     │   │
│  │ /gmail/     │    │  Message     │    │   Changes       │   │
│  │  webhook    │    │              │    │                 │   │
│  └─────────────┘    └──────────────┘    └─────────────────┘   │
│                                                │               │
│                                                ▼               │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │ Fetch Full  │───▶│  AI          │───▶│  Save to        │   │
│  │  Email      │    │  Analysis    │    │  Database       │   │
│  └─────────────┘    └──────────────┘    └─────────────────┘   │
│                                                │               │
│                                                ▼               │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │  WebSocket  │───▶│  Frontend    │───▶│  Show           │   │
│  │  Broadcast  │    │  Receives    │    │  Notification   │   │
│  └─────────────┘    └──────────────┘    └─────────────────┘   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 8.3 Outlook Integration

```typescript
// OAuth configuration
const outlookConfig = {
  clientId: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  redirectUri: `${BASE_URL}/api/auth/outlook/callback`,
  scopes: ['Mail.Read', 'Mail.ReadWrite', 'offline_access', 'User.Read']
};

// Webhook subscription (3-day max)
const subscription = await client.api('/subscriptions').post({
  changeType: 'created,updated',
  notificationUrl: `${WEBHOOK_URL}/api/outlook/webhook`,
  resource: 'me/mailFolders/Inbox/messages',
  expirationDateTime: new Date(Date.now() + 4230 * 60 * 1000).toISOString(),
  clientState: userId.toString()
});
```

### 8.4 IMAP Integration

```typescript
class ImapService {
  async connect(config: ImapConfig): Promise<void> {
    this.imap = new Imap({
      user: config.email,
      password: decrypt(config.encryptedPassword),
      host: config.host,
      port: config.port,
      tls: config.secure,
      tlsOptions: { rejectUnauthorized: false }
    });

    return new Promise((resolve, reject) => {
      this.imap.once('ready', resolve);
      this.imap.once('error', reject);
      this.imap.connect();
    });
  }

  async fetchEmails(since?: Date): Promise<Email[]> {
    await this.openBox('INBOX');

    const searchCriteria = since
      ? ['SINCE', since.toISOString().split('T')[0]]
      : ['ALL'];

    const results = await this.search(searchCriteria);
    return this.fetchMessages(results);
  }
}
```

---

## 9. AI/ML Features Deep Dive

### 9.1 AI Prompt Engineering

The AI prompt is 838 lines and includes:

#### System Context
```
You are an advanced email analysis AI. Your task is to analyze emails
and provide structured insights including summaries, categorization,
importance scoring, and actionable metadata extraction.
```

#### User Personalization
```
USER CONTEXT:
- Name: {userName}
- Email: {userEmail}
- Previously used badges: {learnedBadges}
- Existing categories: {existingCategories}
- Badge usage counts: {badgeUsageCounts}
```

#### Output Schema
```json
{
  "summary": "60 char max, no fluff",
  "is_about_me": true/false,
  "mention_context": "Why this email mentions user",
  "badges": [
    {
      "name": "Badge Name",
      "color": "blue",
      "icon": "💼",
      "importance": 0.8,
      "category": "Work"
    }
  ],
  "scores": {
    "promotional": 0.1,
    "personal": 0.8,
    "urgent": 0.0,
    "work_related": 0.7,
    "financial": 0.0,
    "social": 0.2,
    "requires_action": 0.5
  },
  "html_snippet": "<div class='flex...'>...</div>",
  "render_as_html": true,
  "metadata": {
    "has_meeting": true,
    "meeting_url": "https://zoom.us/...",
    "meeting_time": "2024-01-15T14:00:00Z",
    "sender_type": "newsletter",
    "unsubscribe": {
      "method": "url",
      "value": "https://..."
    }
  }
}
```

### 9.2 HTML Card Generation Rules

```
HTML CARD REQUIREMENTS:
1. Layout: MUST be horizontal (flex-row), single-line
2. Height: MAXIMUM 60px
3. Theme: MUST include dark mode variants
4. Styling: Full Tailwind CSS classes
5. Content: Icon, title, key info, action button
6. Responsive: Works on mobile and desktop

CARD STRUCTURE:
<div class="flex items-center gap-3 p-3 bg-X-50 dark:bg-X-900/30 rounded-lg">
  <span class="text-2xl">ICON</span>
  <div class="flex-1 min-w-0">
    <p class="text-sm font-medium text-X-900 dark:text-X-100 truncate">TITLE</p>
    <p class="text-xs text-X-600 dark:text-X-400">DETAILS</p>
  </div>
  <a href="URL" class="px-3 py-1 text-xs font-medium bg-X-500 ...">ACTION</a>
</div>
```

### 9.3 AI Model Support

```typescript
// OpenAI GPT-4
const openaiResponse = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [{ role: 'user', content: prompt }],
  response_format: { type: 'json_object' },
  temperature: 0.3,
  max_tokens: 2000
});

// DeepSeek (cost-effective)
const deepseekResponse = await deepseek.chat.completions.create({
  model: 'deepseek-chat',
  messages: [{ role: 'user', content: prompt }],
  response_format: { type: 'json_object' },
  temperature: 0.3
});

// Claude (Anthropic)
const claudeResponse = await anthropic.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 2000,
  messages: [{ role: 'user', content: prompt }]
});
```

### 9.4 Personalized Scoring Algorithm

```typescript
async getPersonalizedScore(email: Email, userId: number): Promise<number> {
  // Get badge engagement metrics for user
  const badgeMetrics = await this.getBadgeMetrics(userId);

  // Get email's badges
  const emailBadges = await this.getEmailBadges(email.id);

  // Calculate weighted badge score
  let badgeScore = 0;
  let totalWeight = 0;

  for (const badge of emailBadges) {
    const metrics = badgeMetrics.find(m => m.badge_name === badge.name);
    if (metrics) {
      badgeScore += metrics.engagement_score * badge.importance;
      totalWeight += badge.importance;
    }
  }

  const avgBadgeScore = totalWeight > 0 ? badgeScore / totalWeight : 0.5;

  // Combine with master score
  // 30% AI importance, 70% user engagement
  return (email.master_importance_score * 0.3) + (avgBadgeScore * 0.7);
}
```

---

## 10. Real-Time Architecture

### 10.1 WebSocket Server

```typescript
// Server initialization
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// Connection handling
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userId = parseInt(url.searchParams.get('userId'));

  if (!userId) {
    ws.close(4001, 'User ID required');
    return;
  }

  // Track connection
  if (!clients.has(userId)) {
    clients.set(userId, []);
  }
  clients.get(userId).push(ws);

  // Heartbeat
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  // Cleanup on close
  ws.on('close', () => {
    const userClients = clients.get(userId) || [];
    const index = userClients.indexOf(ws);
    if (index > -1) {
      userClients.splice(index, 1);
    }
  });
});

// Heartbeat interval
setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);
```

### 10.2 Frontend WebSocket Hook

```typescript
// useGmailPush.ts
export function useGmailPush() {
  const { user } = useAuthStore();
  const { addPushedEmails } = useEmailStore();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const ws = new WebSocket(
      `${WS_URL}/ws?userId=${user.id}`
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'new_emails' || data.type === 'gmail_new_emails') {
        addPushedEmails(data.emails);
        showNotification(data.emails);
      }
    };

    ws.onclose = () => {
      // Reconnect after delay
      setTimeout(() => reconnect(), 5000);
    };

    wsRef.current = ws;

    return () => ws.close();
  }, [user?.id]);
}
```

### 10.3 Message Types

```typescript
// WebSocket message types
type WebSocketMessage =
  | { type: 'new_emails', emails: Email[] }
  | { type: 'gmail_new_emails', emails: Email[] }
  | { type: 'outlook_new_emails', emails: Email[] }
  | { type: 'email_updated', email: Email }
  | { type: 'sync_progress', progress: SyncProgress }
  | { type: 'analysis_complete', emailId: number }
  | { type: 'error', message: string };
```

---

## 11. Authentication & Security

### 11.1 JWT Token Strategy

```typescript
// Access token (short-lived)
const accessToken = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

// Refresh token (long-lived, rotated)
const refreshToken = jwt.sign(
  { userId: user.id, tokenVersion: user.tokenVersion },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);

// Token rotation on refresh
async function refreshTokens(refreshToken: string) {
  const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

  // Invalidate old refresh token
  await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [payload.userId]);

  // Generate new tokens
  const newAccessToken = generateAccessToken(payload.userId);
  const newRefreshToken = generateRefreshToken(payload.userId);

  // Save new refresh token
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [payload.userId, newRefreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
  );

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
```

### 11.2 Password Security

```typescript
// Password hashing (bcrypt, 10 rounds)
const passwordHash = await bcrypt.hash(password, 10);

// Password verification
const isValid = await bcrypt.compare(password, user.password_hash);
```

### 11.3 Session Management

```typescript
// Create session on login
async function createSession(userId: number, req: Request): Promise<Session> {
  const session = {
    user_id: userId,
    device_type: getDeviceType(req.headers['user-agent']),
    device_name: getDeviceName(req.headers['user-agent']),
    user_agent: req.headers['user-agent'],
    ip_address: req.ip,
    remember_me: req.body.rememberMe || false,
    expires_at: req.body.rememberMe
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : null
  };

  const result = await db.query(
    `INSERT INTO sessions (user_id, device_type, device_name, user_agent, ip_address, remember_me, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    Object.values(session)
  );

  return result.rows[0];
}
```

### 11.4 OAuth Token Storage

```typescript
// Encrypt OAuth tokens for storage
const encryptedAccessToken = encrypt(accessToken);
const encryptedRefreshToken = encrypt(refreshToken);

// AES-256-GCM encryption
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}
```

---

## 12. Frontend Architecture

### 12.1 State Management (Zustand)

```typescript
// useAuthStore.ts
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
  refreshAuth: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password, rememberMe = false) => {
    const response = await api.post('/auth/login', { email, password, rememberMe });

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('accessToken', response.data.accessToken);
    storage.setItem('refreshToken', response.data.refreshToken);

    set({
      user: response.data.user,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      isAuthenticated: true
    });
  },

  // ... other methods
}));
```

```typescript
// useEmailStore.ts
interface EmailState {
  emails: Email[];
  selectedEmail: Email | null;
  filters: EmailFilters;
  pagination: Pagination;
  isLoading: boolean;

  fetchEmails: (filters?: EmailFilters) => Promise<void>;
  addPushedEmails: (emails: Email[]) => void;
  markAsRead: (emailId: number) => Promise<void>;
  starEmail: (emailId: number) => Promise<void>;
  deleteEmail: (emailId: number) => Promise<void>;
  archiveEmail: (emailId: number) => Promise<void>;
  snoozeEmail: (emailId: number, until: Date) => Promise<void>;
  setSelectedEmail: (email: Email | null) => void;
  setFilters: (filters: Partial<EmailFilters>) => void;
}

export const useEmailStore = create<EmailState>((set, get) => ({
  emails: [],
  selectedEmail: null,
  filters: { badge: null, category: null, accountId: null, isRead: null },
  pagination: { page: 1, limit: 50, total: 0, hasMore: true },
  isLoading: false,

  fetchEmails: async (filters) => {
    set({ isLoading: true });

    const response = await api.get('/emails', { params: { ...get().filters, ...filters } });

    set({
      emails: response.data.emails,
      pagination: response.data.pagination,
      isLoading: false
    });
  },

  addPushedEmails: (newEmails) => {
    set(state => ({
      emails: [...newEmails, ...state.emails]
    }));
  },

  // ... other methods
}));
```

### 12.2 Key Components

#### EmailList Component
```typescript
// Core email list with virtual scrolling support
function EmailList() {
  const { emails, selectedEmail, setSelectedEmail, isLoading } = useEmailStore();
  const { trackEmailOpen } = useEmailTracking();

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {emails.map(email => (
        <EmailListItem
          key={email.id}
          email={email}
          isSelected={selectedEmail?.id === email.id}
          onClick={() => {
            setSelectedEmail(email);
            trackEmailOpen(email.id);
          }}
        />
      ))}
    </div>
  );
}
```

#### EmailDetail Component
```typescript
// Full email view with actions
function EmailDetail({ email }: { email: Email }) {
  const { markAsRead, starEmail, archiveEmail, deleteEmail, snoozeEmail } = useEmailStore();
  const { trackLinkClick } = useEmailTracking();

  return (
    <div className="flex flex-col h-full">
      {/* Header with actions */}
      <div className="flex items-center gap-2 p-4 border-b">
        <button onClick={() => archiveEmail(email.id)}>Archive</button>
        <button onClick={() => deleteEmail(email.id)}>Delete</button>
        <button onClick={() => starEmail(email.id)}>
          {email.is_starred ? '★' : '☆'}
        </button>
        <SnoozeButton onSnooze={(date) => snoozeEmail(email.id, date)} />
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-auto p-4">
        <h1 className="text-xl font-semibold">{email.subject}</h1>
        <div className="flex items-center gap-2 mt-2">
          <Avatar src={email.sender_avatar} />
          <span>{email.from_address.name}</span>
          <span className="text-gray-500">{email.from_address.email}</span>
        </div>

        {/* Badges */}
        <div className="flex gap-2 mt-4">
          {email.badges.map(badge => (
            <Badge key={badge.name} {...badge} />
          ))}
        </div>

        {/* AI Summary */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <p className="text-sm">{email.ai_summary}</p>
        </div>

        {/* HTML Card */}
        {email.render_as_html && (
          <EmailHtmlCard html={email.html_snippet} onLinkClick={trackLinkClick} />
        )}

        {/* Body */}
        <div
          className="mt-4 prose dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: email.html_body || email.body }}
        />
      </div>

      {/* Inline Reply */}
      <InlineReplyBox email={email} />
    </div>
  );
}
```

#### EmailHtmlCard Component
```typescript
// Renders AI-generated HTML cards
function EmailHtmlCard({ html, onLinkClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Intercept link clicks for tracking
    const links = containerRef.current.querySelectorAll('a');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        onLinkClick(link.href);
      });
    });
  }, [html]);

  return (
    <div
      ref={containerRef}
      className="mt-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

### 12.3 Custom Hooks

```typescript
// useEmailTracking.ts
export function useEmailTracking() {
  const sessionRef = useRef<ViewSession | null>(null);

  const trackEmailOpen = useCallback(async (emailId: number) => {
    sessionRef.current = {
      email_id: emailId,
      opened_at: new Date(),
      link_click_count: 0
    };

    await api.post('/analytics/events', {
      type: 'email_opened',
      email_id: emailId
    });
  }, []);

  const trackEmailClose = useCallback(async () => {
    if (!sessionRef.current) return;

    const session = {
      ...sessionRef.current,
      closed_at: new Date(),
      duration_ms: Date.now() - sessionRef.current.opened_at.getTime()
    };

    await api.post('/analytics/view-sessions', session);
    sessionRef.current = null;
  }, []);

  const trackLinkClick = useCallback(async (url: string) => {
    if (sessionRef.current) {
      sessionRef.current.link_click_count++;
    }

    await api.post('/analytics/events', {
      type: 'link_clicked',
      data: { url }
    });
  }, []);

  return { trackEmailOpen, trackEmailClose, trackLinkClick };
}
```

---

## 13. Unique & Innovative Features

### 13.1 AI-First Email Flow

**Traditional Email Client:**
```
Fetch → Display → (Optional) Analyze
```

**NEMI:**
```
Fetch → Analyze (AI) → Save with Analysis → Display
```

Benefits:
- Instant summaries and badges on first view
- Pre-calculated importance scores
- Smart categorization from day one
- No "loading" states for AI features

### 13.2 Engagement-Based Learning

The inbox adapts to user behavior:

```typescript
// Every interaction is tracked
trackEmailOpen(emailId);      // Opens
trackEmailClose();            // Duration
trackLinkClick(url);          // Clicks
trackBadgeFilter(badgeName);  // Badge usage

// Metrics influence future ordering
personalizedScore =
  (aiImportance * 0.3) +
  (engagementScore * 0.7);
```

### 13.3 Theme-Aware HTML Cards

Every email gets a beautiful card that works in both light and dark modes:

```html
<div class="flex items-center gap-3 p-3
            bg-blue-50 dark:bg-blue-900/30
            rounded-lg">
  <span class="text-2xl">📅</span>
  <div class="flex-1 min-w-0">
    <p class="text-sm font-medium
              text-blue-900 dark:text-blue-100">
      Team Standup
    </p>
    <p class="text-xs text-blue-600 dark:text-blue-400">
      Today at 2:00 PM
    </p>
  </div>
  <a href="..." class="px-3 py-1 text-xs font-medium
                       bg-blue-500 hover:bg-blue-600
                       text-white rounded-md">
    Join Meeting
  </a>
</div>
```

### 13.4 Smart Unsubscribe System

Proactive newsletter management:

```
Analyzes:
- Open rate per sender
- Time spent reading
- Days since last interaction
- Email volume

Recommends unsubscribe when:
- Open rate < 10%
- 5+ emails received
- 14+ days since last open
```

### 13.5 Multi-Provider Unified Experience

Same features across all providers:

| Feature | Gmail | Outlook | IMAP |
|---------|-------|---------|------|
| AI Analysis | ✅ | ✅ | ✅ |
| Smart Badges | ✅ | ✅ | ✅ |
| HTML Cards | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ | Polling |
| Bi-directional Sync | ✅ | ✅ | ✅ |
| Search | ✅ | ✅ | ✅ |

### 13.6 Company Intelligence

Automatic sender enrichment:

```typescript
// Domain detection
"notifications@github.com" → GitHub

// Known services (50+)
const services = {
  'github.com': { name: 'GitHub', icon: '💻', category: 'Coding' },
  'slack.com': { name: 'Slack', icon: '💬', category: 'Communication' },
  'stripe.com': { name: 'Stripe', icon: '💳', category: 'Finance' },
  // ...
};

// Logo fetching
const logo = await fetchLogo('github.com');
// 1. Try Clearbit Logo API
// 2. Fallback to Google Favicon
```

### 13.7 Real-Time Everything

- **Gmail**: Pub/Sub webhooks + WebSocket = instant delivery
- **Outlook**: Graph webhooks + WebSocket = instant delivery
- **Sync Status**: Live progress indicator
- **Multi-Device**: WebSocket broadcasts to all clients
- **Notifications**: Browser + in-app notifications

---

## 14. File Structure

```
NEMI/
├── Backend/
│   ├── src/
│   │   ├── server.ts                    # Express server, WebSocket, cron
│   │   ├── routes/
│   │   │   ├── index.ts                 # Route aggregator
│   │   │   ├── auth.routes.ts           # Authentication
│   │   │   ├── email.routes.ts          # Email CRUD
│   │   │   ├── email-account.routes.ts  # Account management
│   │   │   ├── search.routes.ts         # Elasticsearch
│   │   │   ├── analytics.routes.ts      # Engagement tracking
│   │   │   ├── badges.routes.ts         # Badge management
│   │   │   ├── unsubscribe.routes.ts    # Smart unsubscribe
│   │   │   ├── contacts.routes.ts       # Contact search
│   │   │   └── outlook-webhook.routes.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── email.controller.ts
│   │   │   ├── email-account.controller.ts
│   │   │   ├── search.controller.ts
│   │   │   ├── unsubscribe.controller.ts
│   │   │   └── outlook-webhook.controller.ts
│   │   ├── services/
│   │   │   ├── deep-email-analyzer.service.ts  # Core AI engine
│   │   │   ├── gmail.service.ts                # Gmail API
│   │   │   ├── gmail-push.service.ts           # Gmail webhooks
│   │   │   ├── outlook.service.ts              # Outlook API
│   │   │   ├── outlook-push.service.ts         # Outlook webhooks
│   │   │   ├── imap.service.ts                 # IMAP support
│   │   │   ├── email.service.ts                # Unified email ops
│   │   │   ├── auth.service.ts                 # Authentication
│   │   │   ├── engagement.service.ts           # Analytics
│   │   │   ├── unsubscribe.service.ts          # Unsubscribe logic
│   │   │   ├── elasticsearch.service.ts        # Search
│   │   │   ├── contacts.service.ts             # Contacts
│   │   │   ├── logo.service.ts                 # Company logos
│   │   │   └── user-email-account.service.ts
│   │   ├── jobs/
│   │   │   ├── email-sync.job.ts               # Periodic sync
│   │   │   └── unsubscribe-recommendations.job.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   └── logger.ts
│   │   └── utils/
│   │       ├── encryption.ts
│   │       └── email-parser.ts
│   └── package.json
│
├── Web/
│   ├── app/
│   │   ├── layout.tsx                   # Root layout
│   │   ├── globals.css                  # Global styles
│   │   ├── page.tsx                     # Landing page
│   │   ├── login/page.tsx               # Login
│   │   ├── register/page.tsx            # Registration
│   │   ├── verify-email/page.tsx        # Email verification
│   │   ├── feed/page.tsx                # Main inbox (600+ lines)
│   │   ├── analytics/
│   │   │   ├── page.tsx                 # Analytics dashboard
│   │   │   └── badges/[badgeName]/page.tsx
│   │   ├── accounts/page.tsx            # Account management
│   │   └── settings/page.tsx            # User settings
│   ├── components/
│   │   ├── EmailList.tsx                # Email list
│   │   ├── EmailDetail.tsx              # Email view
│   │   ├── EmailFilters.tsx             # Filter controls
│   │   ├── EmailSidebar.tsx             # Navigation
│   │   ├── EmailHtmlCard.tsx            # AI HTML cards
│   │   ├── EmailCompose.tsx             # Compose email
│   │   ├── GmailCompose.tsx             # Gmail compose
│   │   ├── InlineReplyBox.tsx           # Quick reply
│   │   ├── SnoozeModal.tsx              # Snooze picker
│   │   ├── UnsubscribeModal.tsx         # Unsubscribe UI
│   │   ├── UnsubscribeNotification.tsx  # Notifications
│   │   ├── AdvancedSearchModal.tsx      # Search UI
│   │   ├── SyncStatusIndicator.tsx      # Sync progress
│   │   ├── UndoToast.tsx                # Undo actions
│   │   ├── AppHeader.tsx                # Top navigation
│   │   └── landing/
│   │       ├── LandingNav.tsx
│   │       └── Footer.tsx
│   ├── hooks/
│   │   ├── useEmailPolling.ts           # Polling fallback
│   │   ├── useGmailPush.ts              # WebSocket
│   │   └── useEmailTracking.ts          # Engagement
│   ├── lib/
│   │   ├── api.ts                       # API service (800+ lines)
│   │   └── store.ts                     # Zustand stores
│   ├── types/
│   │   └── index.ts                     # TypeScript interfaces
│   └── package.json
│
├── Database/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 003_email_accounts.sql
│       ├── 006_ai_analysis_system.sql
│       ├── 012_email_engagement_tracking.sql
│       ├── 019_gmail_push_notifications.sql
│       ├── 020_sessions_auth.sql
│       ├── 024_snooze_and_archive.sql
│       ├── 026_smart_unsubscribe.sql
│       └── 028_outlook_push_notifications.sql
│
├── AI/
│   └── prompts/
│       └── deep_email_analysis.txt      # 838-line AI prompt
│
├── docker-compose.yml                   # PostgreSQL, Elasticsearch
├── package.json                         # Monorepo scripts
├── MICROSOFT_AZURE_SETUP_GUIDE.md
└── OUTLOOK_INTEGRATION_GUIDE.md
```

---

## 15. Infrastructure & Deployment

### 15.1 Docker Compose Setup

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: nemi
      POSTGRES_PASSWORD: nemi_password
      POSTGRES_DB: nemi_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data

  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@nemi.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"

volumes:
  postgres_data:
  es_data:
```

### 15.2 Environment Variables

```bash
# Backend/.env
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://nemi:nemi_password@localhost:5432/nemi_db

# JWT
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# AI
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=...
ANTHROPIC_API_KEY=...

# Gmail
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_PUBSUB_TOPIC=projects/your-project/topics/gmail-push
GOOGLE_PUBSUB_SUBSCRIPTION=projects/your-project/subscriptions/gmail-push-sub

# Outlook
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_TENANT_ID=common

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# Encryption
ENCRYPTION_KEY=32-byte-key-here

# Webhooks (development)
WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok.io
```

### 15.3 Cron Jobs

```typescript
// Email sync (every 15 minutes)
cron.schedule('*/15 * * * *', async () => {
  await syncAllAccounts();
});

// Gmail watch renewal (every 6 hours)
cron.schedule('0 */6 * * *', async () => {
  await renewGmailWatches();
});

// Outlook subscription renewal (every 2 hours)
cron.schedule('0 */2 * * *', async () => {
  await renewOutlookSubscriptions();
});

// Badge metrics refresh (every hour)
cron.schedule('0 * * * *', async () => {
  await refreshBadgeMetrics();
});

// Unsubscribe recommendations (daily at 3 AM)
cron.schedule('0 3 * * *', async () => {
  await generateUnsubscribeRecommendations();
});
```

---

## Summary

NEMI is a **comprehensive, AI-first email management application** that transforms how users interact with their inbox. By analyzing every email with AI before display, implementing engagement-based learning, and providing beautiful visual cards, NEMI delivers a modern email experience that helps users focus on what matters most.

### Key Differentiators

1. **AI-First Architecture**: Every email is analyzed before being shown
2. **Adaptive Learning**: Inbox reorders based on user behavior
3. **Visual Excellence**: Theme-aware HTML cards for quick scanning
4. **Multi-Provider**: Unified experience across Gmail, Outlook, IMAP
5. **Real-Time**: Instant notifications via Pub/Sub and WebSocket
6. **Smart Unsubscribe**: Proactive newsletter management
7. **Privacy-Focused**: All processing on your infrastructure

### Technology Highlights

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Zustand
- **Backend**: Node.js, Express, TypeScript, WebSocket
- **Database**: PostgreSQL (28 tables), Elasticsearch
- **AI**: OpenAI GPT-4, DeepSeek, Claude
- **Real-Time**: Gmail Pub/Sub, Outlook Webhooks, WebSocket

---

*Generated for NEMI Email Application - December 2024*
