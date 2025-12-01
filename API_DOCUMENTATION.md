# NemiAIInbox API Documentation

Base URL: `http://localhost:3000/api`

All endpoints except authentication require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Authentication Endpoints

### POST /auth/signup

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "displayName": "John Doe"  // optional
}
```

**Response:** 201 Created
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "emailProvider": "Other",
    "emailProviderConnected": false,
    "preferences": { ... }
  }
}
```

### POST /auth/login

Login with existing credentials.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** 200 OK (same structure as signup)

### POST /auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** 200 OK
```json
{
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token",
  "user": { ... }
}
```

### POST /auth/logout

Logout and invalidate refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** 200 OK
```json
{
  "message": "Logged out successfully"
}
```

## Email Endpoints

### POST /emails/fetch

Fetch new emails from email provider.

**Authentication Required:** Yes

**Request Body:**
```json
{
  "provider": "Gmail"  // or "Outlook", "iCloud", etc.
}
```

**Response:** 200 OK
```json
{
  "count": 25,
  "emails": [
    {
      "id": "uuid",
      "from": {
        "email": "sender@example.com",
        "name": "Sender Name"
      },
      "to": [...],
      "subject": "Email subject",
      "body": "Email body content",
      "snippet": "Email preview...",
      "date": "2024-01-15T10:30:00.000Z",
      "isRead": false,
      "isStarred": false,
      "hasAttachments": true,
      "attachments": [...],
      "aiSummary": "AI-generated summary",
      "category": "Work",
      "importance": "High",
      "isPersonallyRelevant": true
    }
  ]
}
```

### GET /emails

Get user's emails with optional filtering.

**Authentication Required:** Yes

**Query Parameters:**
- `category` (optional): Filter by category (Work, Personal, etc.)
- `limit` (optional): Number of emails to return (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `isRead` (optional): Filter by read status (true/false)
- `isStarred` (optional): Filter by starred status (true/false)
- `isPersonallyRelevant` (optional): Filter Me-related emails (true/false)

**Example:**
```
GET /emails?category=Work&limit=20&offset=0&isRead=false
```

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "from": { ... },
    "subject": "...",
    ...
  }
]
```

### GET /emails/:id

Get a single email by ID.

**Authentication Required:** Yes

**Response:** 200 OK
```json
{
  "id": "uuid",
  "from": { ... },
  "to": [ ... ],
  "cc": [ ... ],
  "subject": "Email subject",
  "body": "Full email body",
  "htmlBody": "<html>...</html>",
  "attachments": [
    {
      "id": "uuid",
      "filename": "document.pdf",
      "mimeType": "application/pdf",
      "size": 245678,
      "downloadUrl": "https://..."
    }
  ],
  ...
}
```

### POST /emails/classify

Classify emails using AI.

**Authentication Required:** Yes

**Request Body:**
```json
{
  "emailIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:** 200 OK
```json
{
  "classified": 3,
  "results": [
    {
      "emailId": "uuid1",
      "category": "Work",
      "importance": "High",
      "isPersonallyRelevant": true
    },
    ...
  ]
}
```

### PATCH /emails/:id/read

Mark email as read or unread.

**Authentication Required:** Yes

**Request Body:**
```json
{
  "isRead": true
}
```

**Response:** 200 OK
```json
{
  "message": "Read status updated"
}
```

### PATCH /emails/:id/star

Star or unstar an email.

**Authentication Required:** Yes

**Request Body:**
```json
{
  "isStarred": true
}
```

**Response:** 200 OK
```json
{
  "message": "Star status updated"
}
```

### DELETE /emails/:id

Delete an email.

**Authentication Required:** Yes

**Response:** 200 OK
```json
{
  "message": "Email deleted successfully"
}
```

### GET /emails/categories/stats

Get email count by category.

**Authentication Required:** Yes

**Response:** 200 OK
```json
[
  {
    "category": "Work",
    "count": 45
  },
  {
    "category": "Personal",
    "count": 23
  },
  ...
]
```

## Push Notification Endpoints

### POST /push/register

Register device for push notifications.

**Authentication Required:** Yes

**Request Body:**
```json
{
  "deviceToken": "device_token_from_apns",
  "userId": "user_uuid"
}
```

**Response:** 200 OK
```json
{
  "message": "Device registered successfully"
}
```

### POST /push/send

Send a push notification (for testing or admin use).

**Authentication Required:** Yes

**Request Body:**
```json
{
  "userId": "user_uuid",
  "title": "Notification Title",
  "body": "Notification message",
  "data": {
    "emailId": "uuid",
    "category": "Work"
  }
}
```

**Response:** 200 OK
```json
{
  "message": "Notification sent",
  "success": 2,
  "failed": 0
}
```

### DELETE /push/unregister

Unregister device token.

**Authentication Required:** Yes

**Request Body:**
```json
{
  "deviceToken": "device_token_from_apns"
}
```

**Response:** 200 OK
```json
{
  "message": "Device unregistered successfully"
}
```

## Error Responses

All endpoints may return error responses in the following format:

**400 Bad Request**
```json
{
  "error": "Validation error",
  "message": "Request validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**401 Unauthorized**
```json
{
  "error": "Unauthorized",
  "message": "No authentication token provided"
}
```

**404 Not Found**
```json
{
  "error": "Not found",
  "message": "Email not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## Rate Limiting

API requests are rate limited to 100 requests per 15 minutes per IP address.

When rate limit is exceeded:
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

## Data Types

### Email Categories
- `Work`
- `Personal`
- `Me-related`
- `Finance`
- `Social`
- `Promotions`
- `Newsletters`
- `Other`

### Importance Levels
- `Critical`
- `High`
- `Normal`
- `Low`

### Email Providers
- `Gmail`
- `Outlook`
- `iCloud`
- `Yahoo`
- `Other`

## Best Practices

1. **Token Management**: Store tokens securely using iOS Keychain
2. **Refresh Tokens**: Implement automatic token refresh when receiving 401 errors
3. **Pagination**: Use limit and offset for large email lists
4. **Caching**: Cache email lists locally and sync periodically
5. **Error Handling**: Always handle error responses gracefully
6. **Rate Limiting**: Implement exponential backoff for retries
