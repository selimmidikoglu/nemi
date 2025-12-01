#!/bin/bash

# NemiAIInbox Setup Script
# Run this script to set up the entire project from scratch

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js $NODE_VERSION installed"
    else
        print_error "Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi

    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm $NPM_VERSION installed"
    else
        print_error "npm not found"
        exit 1
    fi

    # Check PostgreSQL
    if command -v psql &> /dev/null; then
        PG_VERSION=$(psql --version | awk '{print $3}')
        print_success "PostgreSQL $PG_VERSION installed"
    else
        print_warning "PostgreSQL not found. Install from https://www.postgresql.org/"
        print_info "Alternatively, use Docker: docker-compose up -d postgres"
    fi

    # Check Xcode (for iOS development)
    if command -v xcodebuild &> /dev/null; then
        XCODE_VERSION=$(xcodebuild -version | head -n 1)
        print_success "$XCODE_VERSION installed"
    else
        print_warning "Xcode not found. Required for iOS development."
    fi
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"

    print_info "Installing root dependencies..."
    npm install
    print_success "Root dependencies installed"

    print_info "Installing backend dependencies..."
    cd Backend && npm install && cd ..
    print_success "Backend dependencies installed"
}

# Setup environment files
setup_env() {
    print_header "Setting Up Environment"

    # Create root .env if it doesn't exist
    if [ ! -f .env ]; then
        print_info "Creating root .env from template..."
        cp .env.example .env
        print_success "Root .env created"
    else
        print_info "Root .env already exists"
    fi

    # Create Backend .env (REQUIRED)
    if [ ! -f Backend/.env ]; then
        print_info "Creating Backend/.env from template..."
        cp Backend/.env.example Backend/.env

        # Generate JWT secrets automatically
        if command -v openssl &> /dev/null; then
            JWT_SECRET=$(openssl rand -base64 32)
            JWT_REFRESH_SECRET=$(openssl rand -base64 32)

            # Update .env file with generated secrets
            sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|g" Backend/.env
            sed -i.bak "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|g" Backend/.env
            rm Backend/.env.bak

            print_success "JWT secrets generated automatically"
        fi

        print_success "Backend/.env created"
        print_warning "IMPORTANT: Add your AI API key to Backend/.env"
        print_info "Required: ANTHROPIC_API_KEY or OPENAI_API_KEY"
        echo ""
        print_info "Get Claude API key: https://console.anthropic.com/"
        print_info "Or OpenAI key: https://platform.openai.com/"
    else
        print_info "Backend/.env already exists"
    fi

    # Create optional .env files
    for dir in AI iOS Database scripts; do
        if [ ! -f "$dir/.env" ] && [ -f "$dir/.env.example" ]; then
            print_info "Creating $dir/.env from template..."
            cp "$dir/.env.example" "$dir/.env"
            print_success "$dir/.env created"
        fi
    done

    echo ""
    print_info "Environment files created. Review and customize as needed:"
    print_info "  - Backend/.env (required)"
    print_info "  - .env (optional)"
    print_info "  - AI/.env (optional)"
    print_info "  - iOS/.env (optional)"
}

# Setup database
setup_database() {
    print_header "Setting Up Database"

    # Check if database exists
    if psql -lqt | cut -d \| -f 1 | grep -qw nemi_ai_inbox; then
        print_info "Database 'nemi_ai_inbox' already exists"
        read -p "$(echo -e ${YELLOW}Do you want to drop and recreate it? [y/N]: ${NC})" -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Dropping database..."
            dropdb nemi_ai_inbox || true
            print_info "Creating database..."
            createdb nemi_ai_inbox
            print_success "Database recreated"
        fi
    else
        print_info "Creating database..."
        createdb nemi_ai_inbox
        print_success "Database created"
    fi

    # Run migrations
    print_info "Running migrations..."
    cd Backend && npm run migrate && cd ..
    print_success "Migrations completed"

    # Seed data
    read -p "$(echo -e ${YELLOW}Do you want to seed sample data? [Y/n]: ${NC})" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        print_info "Seeding database..."
        cd Backend && npm run seed && cd ..
        print_success "Database seeded with sample data"
        print_info "Demo credentials: demo@example.com / password123"
    fi
}

# Print next steps
print_next_steps() {
    print_header "Setup Complete!"

    echo -e "${GREEN}✓ NemiAIInbox is ready!${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo ""
    echo "1. Configure your environment:"
    echo -e "   ${YELLOW}nano Backend/.env${NC}"
    echo "   - Add your AI API key (Claude or OpenAI)"
    echo "   - Set JWT secrets"
    echo ""
    echo "2. Start development servers:"
    echo -e "   ${YELLOW}npm run dev${NC}"
    echo "   or"
    echo -e "   ${YELLOW}make dev${NC}"
    echo ""
    echo "3. Open iOS app:"
    echo -e "   ${YELLOW}open iOS/NemiAIInbox.xcodeproj${NC}"
    echo ""
    echo "4. Test the API:"
    echo -e "   ${YELLOW}curl http://localhost:3000/health${NC}"
    echo ""
    echo -e "${BLUE}Documentation:${NC}"
    echo "  - Quick Start: QUICKSTART.md"
    echo "  - Setup Guide: SETUP.md"
    echo "  - API Docs: API_DOCUMENTATION.md"
    echo ""
}

# Main execution
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   NemiAIInbox Setup Script        ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════╝${NC}"
    echo ""

    check_prerequisites
    install_dependencies
    setup_env

    # Only setup database if PostgreSQL is available
    if command -v psql &> /dev/null; then
        setup_database
    else
        print_warning "Skipping database setup (PostgreSQL not found)"
        print_info "You can use Docker: docker-compose up -d"
    fi

    print_next_steps
}

# Run main function
main
