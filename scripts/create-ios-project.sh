#!/bin/bash

# Create iOS Xcode Project Script
# This helps set up the Xcode project structure

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Create iOS Xcode Project        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════╝${NC}"
echo ""

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}✗ Xcode not found. Please install Xcode from App Store.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Xcode found${NC}"
echo ""

PROJECT_DIR="/Users/gaban/Documents/NEMI/iOS"
PROJECT_NAME="NemiAIInbox"

echo -e "${YELLOW}Important:${NC}"
echo "iOS projects require Xcode to create the .xcodeproj structure."
echo ""
echo -e "${BLUE}Steps to create the project:${NC}"
echo ""
echo "1. Open Xcode:"
echo "   ${GREEN}open -a Xcode${NC}"
echo ""
echo "2. Create New Project (Cmd+Shift+N)"
echo "   - Choose: iOS → App"
echo "   - Product Name: ${YELLOW}NemiAIInbox${NC}"
echo "   - Organization Identifier: ${YELLOW}com.nemi${NC}"
echo "   - Interface: ${YELLOW}SwiftUI${NC}"
echo "   - Language: ${YELLOW}Swift${NC}"
echo "   - Save Location: ${YELLOW}${PROJECT_DIR}${NC}"
echo ""
echo "3. Add Existing Swift Files:"
echo "   - Right-click project → Add Files"
echo "   - Select files in iOS/NemiAIInbox/"
echo "   - Organize by folders matching structure"
echo ""
echo "4. Build and Run (Cmd+R)"
echo ""
echo -e "${BLUE}Would you like to open Xcode now? [y/N]${NC}"
read -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Opening Xcode...${NC}"
    open -a Xcode
    echo ""
    echo -e "${YELLOW}Follow the steps above to create the project.${NC}"
else
    echo -e "${YELLOW}You can open Xcode later with:${NC} open -a Xcode"
fi

echo ""
echo -e "${BLUE}Alternative: Use Package.swift${NC}"
echo "For a Swift Package Manager approach, we can create Package.swift"
echo "However, for iOS apps, Xcode project is the standard approach."
