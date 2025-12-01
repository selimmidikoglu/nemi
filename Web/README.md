# NEMI Web - AI-Powered Email Management

A modern Next.js web application for intelligent email management, powered by AI. This is the web counterpart to the NEMI iOS app, sharing the same backend infrastructure.

## Features

- **AI-Powered Email Summaries** - Get concise summaries of your emails using Claude/OpenAI
- **Smart Categorization** - Automatic email categorization (Work, Personal, Finance, etc.)
- **Importance Detection** - AI identifies critical, high, normal, and low priority emails
- **Me-Related Detection** - Highlights emails that are specifically about you
- **Multi-Account Support** - Manage multiple email accounts (Gmail, Outlook, IMAP)
- **Modern UI** - Clean, responsive interface with dark mode support
- **Real-time Sync** - Keep your emails up to date across all devices
- **Search & Filters** - Advanced filtering by category, importance, read status, and more

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Date Formatting**: date-fns

## Prerequisites

- Node.js 18+ (Note: Next.js 16+ requires Node.js 20+, but we're using Next.js 14)
- npm 9+
- Running NEMI Backend API (see [Backend README](../Backend/README.md))
- PostgreSQL database

## Installation

### Local Development

1. **Navigate to the Web directory**:
   ```bash
   cd Web
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3001](http://localhost:3001)

### Using Docker

1. **From the project root**:
   ```bash
   docker-compose up web
   ```

   This will start the web app along with its dependencies (backend and database).

2. **Access the application**:
   Navigate to [http://localhost:3001](http://localhost:3001)

## Project Structure

```
Web/
├── app/                      # Next.js App Router pages
│   ├── page.tsx             # Home page (redirects to login/feed)
│   ├── login/               # Login page
│   ├── register/            # Registration page
│   ├── feed/                # Main email feed
│   ├── accounts/            # Email account management
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── EmailList.tsx        # Email list component
│   └── EmailDetail.tsx      # Email detail view
├── lib/                     # Utilities and services
│   ├── api.ts              # API service layer
│   └── store.ts            # Zustand state management
├── types/                   # TypeScript type definitions
│   └── index.ts            # Shared types
├── public/                  # Static assets
├── next.config.js          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server on port 3001
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Key Features Explained

### Authentication
- JWT-based authentication with access and refresh tokens
- Automatic token refresh on expiration
- Secure token storage in localStorage
- Protected routes with automatic redirects

### Email Management
- Fetch and display emails with AI-generated summaries
- Mark emails as read/unread
- Star/unstar important emails
- Delete emails
- Filter by category, importance, read status
- Real-time email synchronization

### Email Accounts
- Connect multiple email accounts
- Support for Gmail, Outlook, and IMAP
- Per-account synchronization
- Account management (add/remove)

### State Management
The app uses Zustand for state management with three main stores:

1. **Auth Store** - User authentication state
2. **Email Store** - Email data and operations
3. **Email Account Store** - Email account management

### API Integration
All API calls go through a centralized `apiService` class that handles:
- Token injection in request headers
- Automatic token refresh on 401 errors
- Error handling and logging
- Request/response interceptors

## Configuration

### Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:3000)

Note: Environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

### Backend Integration

The web app connects to the NEMI backend API. Ensure the backend is running and accessible at the URL specified in `NEXT_PUBLIC_API_URL`.

API endpoints used:
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/me` - Get current user
- `GET /api/emails` - Fetch emails
- `GET /api/emails/:id` - Get email details
- `PATCH /api/emails/:id/read` - Mark as read/unread
- `PATCH /api/emails/:id/star` - Star/unstar email
- `DELETE /api/emails/:id` - Delete email
- `POST /api/emails/sync` - Sync emails
- `GET /api/email-accounts` - Get email accounts
- `POST /api/email-accounts` - Add email account
- `DELETE /api/email-accounts/:id` - Remove account

## UI/UX Features

### Responsive Design
- Mobile-first approach
- Adapts to all screen sizes
- Touch-friendly interactions

### Dark Mode
- Automatic dark mode based on system preferences
- Consistent theming across all components

### Email List
- Compact view with key information
- Unread indicator
- Category badges
- Importance indicators
- Me-related badges
- Star functionality
- Relative timestamps

### Email Detail
- Full email content display
- HTML email rendering
- AI summary highlighting
- Quick actions (star, delete, mark read)
- Category and importance badges

## Deployment

### Production Build

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start the production server**:
   ```bash
   npm start
   ```

### Docker Production Deployment

The included Dockerfile uses a multi-stage build for optimal production images:

```bash
docker build -t nemi-web .
docker run -p 3001:3001 -e NEXT_PUBLIC_API_URL=https://api.yourdomain.com nemi-web
```

### Deployment Platforms

This Next.js app can be deployed to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **AWS** (Amplify, ECS, EC2)
- **Google Cloud Platform**
- **Azure**
- **DigitalOcean App Platform**

For Vercel deployment:
```bash
npm install -g vercel
vercel
```

## Security Considerations

- Tokens are stored in localStorage (consider httpOnly cookies for production)
- API requests use CORS with specific origins
- Input validation on all forms
- XSS prevention through React's automatic escaping
- HTML emails are sanitized before rendering

## Browser Support

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

## Performance Optimizations

- Code splitting with Next.js App Router
- Lazy loading of components
- Optimized images with Next.js Image component
- Efficient state management with Zustand
- Request deduplication
- Automatic static optimization

## Troubleshooting

### Cannot connect to backend
- Ensure backend is running on the correct port
- Check `NEXT_PUBLIC_API_URL` environment variable
- Verify CORS settings in backend allow requests from web origin

### Authentication issues
- Clear localStorage and try logging in again
- Check if backend JWT configuration is correct
- Verify refresh token expiration settings

### Emails not loading
- Check if email accounts are properly connected
- Verify backend can connect to email providers
- Check browser console for API errors
- Ensure database migrations are up to date

### Build errors
- Delete `.next` folder and `node_modules`
- Run `npm install` again
- Check for TypeScript errors: `npm run lint`

## Contributing

When contributing to the web app:

1. Follow the existing code style
2. Use TypeScript for all new files
3. Add proper type definitions
4. Test on multiple browsers
5. Ensure responsive design works
6. Update documentation for new features

## Related Documentation

- [Backend API Documentation](../Backend/README.md)
- [iOS App Documentation](../iOS/README.md)
- [Database Schema](../Database/README.md)

## License

See main project LICENSE file.

## Support

For issues, questions, or contributions, please refer to the main project repository.
