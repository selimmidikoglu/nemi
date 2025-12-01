# NemiAIInbox Monorepo Makefile
# Run 'make help' to see all available commands

.PHONY: help install setup dev start stop clean test lint db-setup db-migrate db-seed db-reset logs health

# Colors for output
GREEN  := \033[0;32m
YELLOW := \033[0;33m
BLUE   := \033[0;34m
NC     := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)NemiAIInbox Monorepo Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# Installation Commands
install: ## Install all dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm install
	cd Backend && npm install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

setup: ## Complete project setup (install + database)
	@echo "$(BLUE)Setting up NemiAIInbox...$(NC)"
	@make install
	@make db-create
	@make db-setup
	@echo "$(GREEN)✓ Setup complete!$(NC)"
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Edit Backend/.env with your API keys"
	@echo "  2. Run 'make dev' to start development servers"

# Development Commands
dev: ## Start all development servers (backend + iOS simulator)
	@echo "$(BLUE)Starting full development environment...$(NC)"
	./scripts/dev-all.sh

dev-all: ## Start backend + iOS simulator (same as dev)
	@echo "$(BLUE)Starting full development environment...$(NC)"
	./scripts/dev-all.sh

dev-backend: ## Start only backend server
	@echo "$(BLUE)Starting backend server...$(NC)"
	cd Backend && npm run dev

dev-ios: ## Build and run iOS app in simulator
	@echo "$(BLUE)Starting iOS simulator...$(NC)"
	./scripts/ios-dev.sh

dev-ios-only: ## Build and run iOS app only (no backend)
	@echo "$(BLUE)Starting iOS simulator...$(NC)"
	./scripts/ios-dev.sh

dev-xcode: ## Open iOS project in Xcode (manual)
	@echo "$(BLUE)Opening iOS project...$(NC)"
	open iOS/NemiAIInbox.xcodeproj || echo "Please open iOS/NemiAIInbox.xcodeproj in Xcode manually"

# Production Commands
build: ## Build for production
	@echo "$(BLUE)Building for production...$(NC)"
	cd Backend && npm run build
	@echo "$(GREEN)✓ Build complete$(NC)"

start: ## Start production server
	@echo "$(BLUE)Starting production server...$(NC)"
	cd Backend && npm start

# Database Commands
db-create: ## Create PostgreSQL database
	@echo "$(BLUE)Creating database...$(NC)"
	createdb nemi_ai_inbox || echo "$(YELLOW)Database already exists$(NC)"

db-migrate: ## Run database migrations
	@echo "$(BLUE)Running migrations...$(NC)"
	cd Backend && npm run migrate
	@echo "$(GREEN)✓ Migrations complete$(NC)"

db-seed: ## Seed database with sample data
	@echo "$(BLUE)Seeding database...$(NC)"
	cd Backend && npm run seed
	@echo "$(GREEN)✓ Database seeded$(NC)"

db-setup: db-migrate db-seed ## Run migrations and seed data
	@echo "$(GREEN)✓ Database setup complete$(NC)"

db-reset: ## Drop and recreate database (WARNING: destroys all data)
	@echo "$(YELLOW)WARNING: This will destroy all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		dropdb nemi_ai_inbox || echo "Database doesn't exist"; \
		make db-create; \
		make db-setup; \
		echo "$(GREEN)✓ Database reset complete$(NC)"; \
	fi

# Testing Commands
test: ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	cd Backend && npm test

test-backend: ## Run backend tests only
	@echo "$(BLUE)Running backend tests...$(NC)"
	cd Backend && npm test

lint: ## Run linter
	@echo "$(BLUE)Running linter...$(NC)"
	cd Backend && npm run lint

# Utility Commands
clean: ## Clean build artifacts and dependencies
	@echo "$(BLUE)Cleaning...$(NC)"
	cd Backend && rm -rf dist node_modules
	rm -rf node_modules
	@echo "$(GREEN)✓ Clean complete$(NC)"

logs: ## Tail backend logs
	@echo "$(BLUE)Tailing logs... (Ctrl+C to stop)$(NC)"
	tail -f Backend/logs/app.log

health: ## Check API health
	@echo "$(BLUE)Checking API health...$(NC)"
	@curl -s http://localhost:3000/health | jq '.' || curl http://localhost:3000/health

# Docker Commands (for future use)
docker-up: ## Start services with Docker Compose
	@echo "$(BLUE)Starting Docker services...$(NC)"
	docker-compose up -d

docker-down: ## Stop Docker services
	@echo "$(BLUE)Stopping Docker services...$(NC)"
	docker-compose down

docker-logs: ## Show Docker logs
	docker-compose logs -f

# Quick Commands
quick-start: ## Quick start (for returning developers)
	@echo "$(BLUE)Quick starting...$(NC)"
	@make dev

reset-all: clean install db-reset ## Nuclear option: clean everything and start fresh
	@echo "$(GREEN)✓ Complete reset done$(NC)"
