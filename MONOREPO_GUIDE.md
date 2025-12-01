# NemiAIInbox Monorepo Guide

This project is structured as a monorepo, allowing you to manage all components from the root directory with single commands.

## 🚀 Quick Start (One Command!)

```bash
# Complete setup from scratch
./scripts/setup.sh

# Or using Make
make setup

# Start everything
npm run dev
# or
make dev
```

That's it! The script will:
- ✅ Check prerequisites
- ✅ Install all dependencies
- ✅ Set up environment files
- ✅ Create database
- ✅ Run migrations
- ✅ Seed sample data
- ✅ Start development servers

## 📦 Available Commands

### Using npm Scripts

```bash
# Setup & Installation
npm run setup              # Complete project setup
npm run install:all        # Install all dependencies

# Development
npm run dev                # Start all dev servers
npm run dev:backend        # Start only backend
npm run dev:ios            # Open iOS in Xcode

# Database
npm run db:create          # Create database
npm run db:migrate         # Run migrations
npm run db:seed            # Seed sample data
npm run db:setup           # Migrate + seed
npm run db:reset           # Drop, recreate, and setup

# Production
npm run build              # Build for production
npm run start              # Start production server

# Testing & Quality
npm run test               # Run tests
npm run lint               # Run linter

# Utilities
npm run logs               # Tail backend logs
npm run health             # Check API health
npm run clean              # Clean build artifacts
```

### Using Make (Recommended)

```bash
# Setup
make help                  # Show all commands
make install               # Install dependencies
make setup                 # Complete setup

# Development
make dev                   # Start all servers
make dev-backend           # Backend only
make dev-ios               # Open iOS project

# Database
make db-create             # Create database
make db-migrate            # Run migrations
make db-seed               # Seed data
make db-setup              # Setup database
make db-reset              # Reset database (with confirmation)

# Testing
make test                  # Run tests
make lint                  # Run linter

# Utilities
make logs                  # Tail logs
make health                # Health check
make clean                 # Clean everything
make reset-all             # Nuclear option: clean + reinstall + reset DB
```

### Using Scripts Directly

```bash
# Automated setup
./scripts/setup.sh

# Start development
./scripts/dev.sh
```

## 🐳 Docker Support

### Start with Docker Compose

```bash
# Start all services (database + backend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Start with pgAdmin (database UI)
docker-compose --profile debug up -d

# Access pgAdmin at http://localhost:5050
# Email: admin@nemi.local
# Password: admin
```

### Makefile Docker Commands

```bash
make docker-up             # Start Docker services
make docker-down           # Stop Docker services
make docker-logs           # Show logs
```

## 📁 Monorepo Structure

```
NemiAIInbox/                 # Root (monorepo)
├── package.json             # Root package with workspace scripts
├── Makefile                 # Make commands for easy management
├── docker-compose.yml       # Docker orchestration
├── scripts/                 # Automation scripts
│   ├── setup.sh            # Complete setup script
│   └── dev.sh              # Development start script
├── Backend/                 # Backend workspace
│   ├── package.json        # Backend dependencies
│   ├── Dockerfile          # Backend container
│   └── src/                # Backend source
├── AI/                      # AI workspace
│   ├── services/           # AI services
│   └── prompts/            # AI prompts
├── iOS/                     # iOS app (not in workspace)
│   └── NemiAIInbox/
├── Shared/                  # Shared code
│   ├── models/
│   └── types/
└── Database/                # Database files
    ├── migrations/
    └── seeds/
```

## 🔧 Workspace Configuration

The monorepo uses npm workspaces to manage packages. The root `package.json` defines workspaces:

```json
{
  "workspaces": [
    "Backend",
    "AI"
  ]
}
```

### Benefits

1. **Single `node_modules`** - Dependencies are hoisted to root
2. **Shared dependencies** - Common packages installed once
3. **Unified commands** - Run scripts from root
4. **Easy linking** - Workspaces can reference each other

## 🎯 Common Workflows

### First Time Setup

```bash
# Clone the repo
git clone <repo-url>
cd NEMI

# Run setup script (recommended)
./scripts/setup.sh

# Or manually
make setup

# Start development
make dev
```

### Daily Development

```bash
# Start everything
make dev

# Or individual components
make dev-backend           # Terminal 1: Backend
make dev-ios              # Terminal 2: iOS in Xcode
```

### Database Management

```bash
# Create new migration
# 1. Create file in Database/migrations/002_your_migration.sql
# 2. Run migration
make db-migrate

# Reset database to fresh state
make db-reset

# View database logs
make logs
```

### Testing

```bash
# Run all tests
make test

# Run linter
make lint

# Check API health
make health
```

### Production Build

```bash
# Build for production
make build

# Start production server
make start

# Or with Docker
docker-compose -f docker-compose.prod.yml up -d
```

## 🔄 Dependency Management

### Adding Dependencies

```bash
# Add to root (dev tools like linters)
npm install -D <package>

# Add to backend
cd Backend
npm install <package>

# Or from root
npm install <package> -w Backend
```

### Updating Dependencies

```bash
# Update all workspaces
npm update

# Update specific workspace
npm update -w Backend
```

### Cleaning and Reinstalling

```bash
# Clean everything
make clean

# Reinstall
make install

# Or both
make reset-all
```

## 📊 Monitoring & Debugging

### Check System Status

```bash
# API health
make health

# View logs
make logs

# Database connection
psql -d nemi_ai_inbox -c "SELECT NOW();"

# Check running processes
ps aux | grep node
```

### Common Issues

**Port 3000 already in use:**
```bash
# Kill process
lsof -ti:3000 | xargs kill -9

# Or change port in Backend/.env
PORT=3001
```

**Database connection failed:**
```bash
# Check PostgreSQL is running
pg_isready

# Start PostgreSQL
brew services start postgresql@15

# Or use Docker
docker-compose up -d postgres
```

**Dependencies out of sync:**
```bash
# Clean and reinstall
make clean
make install
```

## 🚢 Deployment

### Docker Deployment

```bash
# Build production image
docker build -t nemi-backend ./Backend

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

```bash
# Build
make build

# Set production environment
export NODE_ENV=production

# Run migrations
make db-migrate

# Start server
make start
```

## 🔐 Environment Configuration

### Root `.env` (optional)
Can be used for shared environment variables.

### Backend `.env` (required)
Contains all backend configuration. Copy from `.env.example`:

```bash
cp Backend/.env.example Backend/.env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - JWT signing key
- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` - AI provider

## 📚 Additional Resources

- [QUICKSTART.md](QUICKSTART.md) - Fast setup guide
- [SETUP.md](SETUP.md) - Detailed setup instructions
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API reference
- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - Architecture details

## 🎓 Tips & Tricks

### Quick Commands

```bash
# Restart backend only
make dev-backend

# Check everything is working
make health && make logs

# Fresh start
make db-reset && make dev
```

### Aliases (add to ~/.bashrc or ~/.zshrc)

```bash
alias nemi-dev='cd /path/to/NEMI && make dev'
alias nemi-logs='cd /path/to/NEMI && make logs'
alias nemi-reset='cd /path/to/NEMI && make db-reset'
```

### VS Code Tasks

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Dev",
      "type": "shell",
      "command": "make dev",
      "problemMatcher": []
    },
    {
      "label": "Run Tests",
      "type": "shell",
      "command": "make test",
      "problemMatcher": []
    }
  ]
}
```

## 🤝 Contributing

When contributing:

1. Run `make lint` before committing
2. Run `make test` to ensure tests pass
3. Update migrations for schema changes
4. Document new npm scripts in root `package.json`
5. Update this guide for new workflows

---

**Questions?** Check the main [README.md](README.md) or [SETUP.md](SETUP.md)
