#!/bin/bash

# Development script - starts all services
# Usage: ./scripts/dev.sh

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   NemiAIInbox Development Mode    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════╝${NC}"
echo ""

# Check if .env exists
if [ ! -f Backend/.env ]; then
    echo -e "${YELLOW}⚠ Backend/.env not found!${NC}"
    echo -e "Run ${GREEN}./scripts/setup.sh${NC} first"
    exit 1
fi

# Check if database exists
if command -v psql &> /dev/null; then
    if ! psql -lqt | cut -d \| -f 1 | grep -qw nemi_ai_inbox; then
        echo -e "${YELLOW}⚠ Database 'nemi_ai_inbox' not found!${NC}"
        echo -e "Run ${GREEN}make db-setup${NC} or ${GREEN}./scripts/setup.sh${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Starting development servers...${NC}"
echo ""
echo -e "${BLUE}Backend:${NC} http://localhost:3000"
echo -e "${BLUE}iOS:${NC} Open iOS/NemiAIInbox.xcodeproj in Xcode"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Start backend
cd Backend && npm run dev
