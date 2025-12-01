# Quick Command Reference

## One-Line Setup & Start

```bash
# Complete setup + start development
./scripts/setup.sh && npm run dev
```

## Essential Commands

| Command | npm | Make | Description |
|---------|-----|------|-------------|
| **Setup** | `npm run setup` | `make setup` | Complete project setup |
| **Start Dev** | `npm run dev` | `make dev` | Start all servers |
| **Install** | `npm run install:all` | `make install` | Install dependencies |
| **DB Setup** | `npm run db:setup` | `make db-setup` | Setup database |
| **Logs** | `npm run logs` | `make logs` | View backend logs |
| **Health** | `npm run health` | `make health` | Check API health |
| **Clean** | `npm run clean` | `make clean` | Clean artifacts |

## Quick Workflows

### First Time
```bash
./scripts/setup.sh
npm run dev
```

### Daily Development
```bash
make dev
```

### Database Reset
```bash
make db-reset
```

### Production Build
```bash
make build
make start
```

### Docker
```bash
docker-compose up -d      # Start all services
docker-compose logs -f    # View logs
docker-compose down       # Stop services
```

## All Available Commands

### Setup Commands
- `make help` - Show all commands
- `make install` - Install all dependencies
- `make setup` - Complete project setup (install + database)
- `./scripts/setup.sh` - Interactive setup wizard

### Development Commands
- `make dev` - Start backend + open iOS project
- `make dev-backend` - Start backend only
- `make dev-ios` - Open iOS project in Xcode
- `npm run dev` - Same as make dev

### Database Commands
- `make db-create` - Create database
- `make db-migrate` - Run migrations
- `make db-seed` - Seed sample data
- `make db-setup` - Migrate + seed
- `make db-reset` - Drop, recreate, setup (with confirmation)

### Build & Deploy Commands
- `make build` - Build for production
- `make start` - Start production server
- `npm run build` - Build backend

### Testing Commands
- `make test` - Run all tests
- `make test-backend` - Run backend tests
- `make lint` - Run linter

### Utility Commands
- `make logs` - Tail backend logs
- `make health` - Check API health
- `make clean` - Clean build artifacts
- `make reset-all` - Nuclear reset (clean + reinstall + reset DB)

### Docker Commands
- `make docker-up` - Start Docker services
- `make docker-down` - Stop Docker services
- `make docker-logs` - View Docker logs
- `docker-compose up -d postgres` - Start only database
- `docker-compose --profile debug up -d` - Start with pgAdmin

## Configuration Files

- `package.json` - Root package with all npm scripts
- `Makefile` - Make commands for easy execution
- `docker-compose.yml` - Docker orchestration
- `Backend/.env` - Backend configuration (copy from .env.example)

## Tips

### Create Aliases
Add to `~/.bashrc` or `~/.zshrc`:
```bash
alias nemi='cd /path/to/NEMI'
alias nemi-dev='cd /path/to/NEMI && make dev'
alias nemi-logs='cd /path/to/NEMI && make logs'
alias nemi-reset='cd /path/to/NEMI && make db-reset'
```

### VS Code Integration
Press `Cmd+Shift+P` → "Tasks: Run Task" → Select command

### Keyboard Shortcuts
- `Ctrl+C` - Stop servers
- `Cmd+R` (Xcode) - Build and run iOS app
- `Cmd+.` (Xcode) - Stop iOS app

## Troubleshooting

```bash
# Port already in use
lsof -ti:3000 | xargs kill -9

# Database connection failed
brew services start postgresql@15

# Dependencies out of sync
make clean && make install

# Complete fresh start
make reset-all
```

## More Documentation

- **Detailed Guide**: [MONOREPO_GUIDE.md](MONOREPO_GUIDE.md)
- **Quick Start**: [QUICKSTART.md](QUICKSTART.md)
- **Full Setup**: [SETUP.md](SETUP.md)
- **API Docs**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
