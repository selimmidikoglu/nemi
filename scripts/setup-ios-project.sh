#!/bin/bash

# Complete iOS Project Setup Script
# This creates a working Xcode project with all your Swift files

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Setting Up iOS Xcode Project    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════╝${NC}"
echo ""

PROJECT_ROOT="/Users/gaban/Documents/NEMI"
IOS_DIR="$PROJECT_ROOT/iOS"
PROJECT_NAME="NemiAIInbox"

cd "$PROJECT_ROOT"

echo -e "${GREEN}Step 1: Creating basic iOS app structure${NC}"

# Create a simple Info.plist
cat > "$IOS_DIR/$PROJECT_NAME/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>UIApplicationSceneManifest</key>
    <dict>
        <key>UIApplicationSupportsMultipleScenes</key>
        <true/>
    </dict>
    <key>UILaunchScreen</key>
    <dict/>
    <key>UIRequiredDeviceCapabilities</key>
    <array>
        <string>armv7</string>
    </array>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
    </array>
</dict>
</plist>
EOF

echo -e "${GREEN}✓ Info.plist created${NC}"

echo ""
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}Next Steps - Please Do This in Xcode:${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo ""
echo "Unfortunately, iOS apps REQUIRE an Xcode project (.xcodeproj) which"
echo "can only be properly created through Xcode GUI or complex XML generation."
echo ""
echo -e "${GREEN}EASY METHOD - Follow these exact steps:${NC}"
echo ""
echo "1. Open Xcode (I'll open it for you)"
echo ""
echo "2. Click: File → New → Project"
echo ""
echo "3. Select: iOS → App → Next"
echo ""
echo "4. Fill in:"
echo "   Product Name: ${YELLOW}NemiAIInbox${NC}"
echo "   Team: (leave as is)"
echo "   Organization Identifier: ${YELLOW}com.nemi${NC}"
echo "   Interface: ${YELLOW}SwiftUI${NC}"
echo "   Language: ${YELLOW}Swift${NC}"
echo "   Click Next"
echo ""
echo "5. Save to: ${YELLOW}$IOS_DIR${NC}"
echo "   UNCHECK 'Create Git repository'"
echo "   Click Create"
echo ""
echo "6. In Xcode Navigator (left panel):"
echo "   - DELETE ContentView.swift (right-click → Delete → Move to Trash)"
echo "   - DELETE the default NemiAIInboxApp.swift"
echo ""
echo "7. Add our files:"
echo "   - Right-click 'NemiAIInbox' folder → Add Files to NemiAIInbox"
echo "   - Navigate to: $IOS_DIR/$PROJECT_NAME/"
echo "   - Hold Cmd and select:"
echo "     ${YELLOW}• Models folder${NC}"
echo "     ${YELLOW}• Views folder${NC}"
echo "     ${YELLOW}• ViewModels folder${NC}"
echo "     ${YELLOW}• Services folder${NC}"
echo "     ${YELLOW}• Utils folder${NC}"
echo "     ${YELLOW}• NemiAIInboxApp.swift${NC}"
echo "   - Check 'Copy items if needed'"
echo "   - Check 'Create groups'"
echo "   - Add to target: NemiAIInbox"
echo "   - Click Add"
echo ""
echo "8. Select simulator: iPhone 15 Pro"
echo ""
echo "9. Press ${GREEN}Cmd+R${NC} to build and run!"
echo ""
echo -e "${BLUE}Opening Xcode now...${NC}"
echo ""

open -a Xcode

echo ""
echo -e "${GREEN}Xcode opened! Follow the steps above.${NC}"
echo ""
echo "After you create the project, you can use:"
echo "  ${YELLOW}make dev${NC}         - Start backend + iOS"
echo "  ${YELLOW}make dev-ios${NC}     - Build and run iOS"
echo ""
