#!/bin/bash

# iOS Development Script - Builds and runs app in simulator
# Usage: ./scripts/ios-dev.sh [simulator-name]

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Configuration
PROJECT_PATH="iOS/NemiAIInbox.xcodeproj"
SCHEME="NemiAIInbox"
SIMULATOR_NAME="${1:-iPhone 15 Pro}"  # Default to iPhone 15 Pro

echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   iOS Development Mode            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════╝${NC}"
echo ""

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    print_error "Xcode not found. Please install Xcode from App Store."
    exit 1
fi

print_success "Xcode found"

# Check if project exists
if [ ! -d "$PROJECT_PATH" ]; then
    print_error "iOS project not found at $PROJECT_PATH"
    exit 1
fi

print_success "iOS project found"

# List available simulators
print_info "Available simulators:"
xcrun simctl list devices available | grep "iPhone\|iPad" | head -10

echo ""
print_info "Using simulator: $SIMULATOR_NAME"
echo ""

# Boot simulator if not running
print_info "Booting simulator..."
xcrun simctl boot "$SIMULATOR_NAME" 2>/dev/null || true
sleep 2
print_success "Simulator ready"

# Open Simulator.app
print_info "Opening Simulator.app..."
open -a Simulator
sleep 2

# Build and run
print_info "Building and running iOS app..."
echo ""

xcodebuild \
    -project "$PROJECT_PATH" \
    -scheme "$SCHEME" \
    -destination "platform=iOS Simulator,name=$SIMULATOR_NAME" \
    -configuration Debug \
    clean build \
    | xcpretty || xcodebuild \
    -project "$PROJECT_PATH" \
    -scheme "$SCHEME" \
    -destination "platform=iOS Simulator,name=$SIMULATOR_NAME" \
    -configuration Debug \
    clean build

if [ $? -eq 0 ]; then
    print_success "Build successful!"

    # Install and launch
    print_info "Installing and launching app..."

    # Get the app path
    APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "NemiAIInbox.app" -type d | head -1)

    if [ -n "$APP_PATH" ]; then
        # Install the app
        xcrun simctl install "$SIMULATOR_NAME" "$APP_PATH"

        # Get bundle identifier
        BUNDLE_ID=$(defaults read "$APP_PATH/Info.plist" CFBundleIdentifier)

        # Launch the app
        xcrun simctl launch "$SIMULATOR_NAME" "$BUNDLE_ID"

        echo ""
        print_success "App launched in simulator!"
        echo ""
        print_info "API: http://localhost:3000"
        print_info "Logs: Run 'make logs' in another terminal"
    else
        print_error "Could not find built app. Opening Xcode instead..."
        open "$PROJECT_PATH"
    fi
else
    print_error "Build failed. Opening Xcode for debugging..."
    open "$PROJECT_PATH"
    exit 1
fi

echo ""
print_success "iOS app is running!"
echo ""
echo -e "${YELLOW}Tips:${NC}"
echo "  - Press Cmd+Q in Simulator to quit"
echo "  - Press Cmd+Shift+H for home button"
echo "  - Use Cmd+K to toggle keyboard"
echo ""
