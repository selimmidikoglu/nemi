#!/bin/bash

# Complete Development Script - Starts backend + iOS simulator
# Usage: ./scripts/dev-all.sh

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   NemiAIInbox Full Dev Mode       ║${NC}"
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

echo -e "${GREEN}✓ Prerequisites met${NC}"
echo ""
echo -e "${BLUE}Starting services...${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend in background
echo -e "${BLUE}[1/2]${NC} Starting Backend API..."
cd Backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for backend...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend ready${NC}"
        break
    fi
    sleep 1
done

# Check if backend started successfully
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${RED}✗ Backend failed to start${NC}"
    echo "Check backend.log for details:"
    tail backend.log
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo -e "${BLUE}[2/2]${NC} Starting iOS Simulator..."
./scripts/ios-dev.sh &
IOS_PID=$!

echo ""
echo -e "${GREEN}╔════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   All Services Running!           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Backend API:${NC} http://localhost:3000"
echo -e "${BLUE}iOS App:${NC} Running in simulator"
echo -e "${BLUE}Backend Logs:${NC} backend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for iOS build to complete
wait $IOS_PID

# Keep backend running
echo ""
echo -e "${GREEN}iOS app launched!${NC}"
echo -e "${BLUE}Backend is still running...${NC}"
echo ""
echo "To view backend logs: tail -f backend.log"
echo "To stop backend: kill $BACKEND_PID"
echo ""

# Keep script running
wait $BACKEND_PID
