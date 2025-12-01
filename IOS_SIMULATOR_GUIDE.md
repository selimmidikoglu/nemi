# iOS Simulator Development Guide

This guide shows you how to automatically build and run the iOS app in the simulator during development.

## 🚀 Quick Start - Run Everything!

```bash
# Start backend API + iOS simulator (RECOMMENDED)
npm run dev
# or
make dev
```

This single command:
1. ✅ Starts the backend API server
2. ✅ Builds the iOS app
3. ✅ Launches iPhone simulator
4. ✅ Installs and runs the app
5. ✅ Keeps everything running

**That's the easiest way!** Everything starts automatically.

## 📱 iOS Simulator Options

### Option 1: Full Development (Backend + iOS)

**Start everything together:**
```bash
npm run dev
# or
make dev
# or
./scripts/dev-all.sh
```

**What happens:**
- Backend starts at http://localhost:3000
- iOS simulator boots (iPhone 15 Pro by default)
- App builds and installs automatically
- App launches in the simulator
- Both stay running

**To stop:**
- Press `Ctrl+C` to stop backend
- Quit Simulator.app or press `Cmd+Q`

---

### Option 2: iOS Simulator Only (No Backend)

**If backend is already running elsewhere:**
```bash
npm run dev:ios
# or
make dev-ios
# or
./scripts/ios-dev.sh
```

**What happens:**
- Boots simulator
- Builds iOS app
- Installs and launches app
- No backend started (assumes running separately)

---

### Option 3: Backend Only (No iOS)

**If you want to test backend or run iOS manually:**
```bash
npm run dev:backend
# or
make dev-backend
```

**What happens:**
- Only backend API starts
- No iOS simulator launched
- Good for API testing or manual Xcode runs

---

### Option 4: Open Xcode Manually

**Traditional development workflow:**
```bash
npm run dev:xcode
# or
make dev-xcode
```

**What happens:**
- Just opens Xcode project
- You control everything manually
- Press `Cmd+R` in Xcode to build/run

---

## 🎯 Choosing a Simulator

### Use Default (iPhone 15 Pro)
```bash
make dev-ios
```

### Specify Different Simulator
```bash
./scripts/ios-dev.sh "iPhone 14"
./scripts/ios-dev.sh "iPhone 15 Plus"
./scripts/ios-dev.sh "iPad Pro (12.9-inch)"
```

### List Available Simulators
```bash
xcrun simctl list devices available | grep "iPhone\|iPad"
```

Common options:
- iPhone 15 Pro (default)
- iPhone 15
- iPhone 15 Plus
- iPhone 15 Pro Max
- iPhone 14
- iPad Pro (12.9-inch)
- iPad Air

## 🛠️ What the Scripts Do

### dev-all.sh (Full Stack)
1. Checks prerequisites (.env, database)
2. Starts backend in background
3. Waits for backend to be healthy
4. Launches iOS simulator script
5. Keeps both running until stopped

### ios-dev.sh (iOS Only)
1. Checks Xcode installation
2. Verifies project exists
3. Boots specified simulator
4. Opens Simulator.app
5. Builds app with xcodebuild
6. Installs app to simulator
7. Launches app automatically

## 📋 Development Workflows

### Daily Development
```bash
# Morning: Start everything
make dev

# Work on code...
# Hot reload works for backend
# iOS requires rebuild (Cmd+R in Xcode)

# Evening: Stop everything
# Press Ctrl+C
```

### Backend-Only Testing
```bash
# Start backend
make dev-backend

# Test API
curl http://localhost:3000/health

# Make changes, auto-reloads
```

### iOS-Only Development
```bash
# Backend already running elsewhere
make dev-ios-only

# Or open Xcode manually
make dev-xcode
# Then Cmd+R in Xcode
```

### Switching Simulators
```bash
# Try different device
./scripts/ios-dev.sh "iPhone 15 Pro Max"

# Or use Xcode
make dev-xcode
# In Xcode: Select device from dropdown
```

## 🐛 Troubleshooting

### "Simulator failed to boot"
```bash
# Kill all simulators
killall Simulator

# Boot fresh
xcrun simctl boot "iPhone 15 Pro"
open -a Simulator
```

### "Build failed"
```bash
# Clean Xcode build cache
rm -rf ~/Library/Developer/Xcode/DerivedData

# Try again
make dev-ios
```

### "App not installing"
```bash
# Erase simulator
xcrun simctl erase "iPhone 15 Pro"

# Rebuild and install
make dev-ios
```

### "xcodebuild not found"
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Verify
xcodebuild -version
```

### Backend Connection Issues in Simulator

The simulator can't use `localhost` from iOS app. Update API URL:

**For Simulator:** Use `http://localhost:3000` ✅
```swift
// In APIService.swift
private let baseURL = "http://localhost:3000/api"
```

**For Physical Device:** Use your Mac's IP ✅
```swift
// In APIService.swift
private let baseURL = "http://192.168.1.x:3000/api"
// Replace x with your Mac's local IP
```

Find your IP:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

## ⚙️ Simulator Controls

### Keyboard Shortcuts (in Simulator)
- `Cmd+K` - Toggle keyboard
- `Cmd+Shift+H` - Home button (once)
- `Cmd+Shift+H` (double press) - App switcher
- `Cmd+R` - Rotate device
- `Cmd+←` or `Cmd+→` - Rotate left/right
- `Cmd+1`, `Cmd+2`, `Cmd+3` - Zoom levels
- `Cmd+Q` - Quit simulator

### Device Actions
- Shake device: Hardware → Shake Gesture
- Lock/Unlock: `Cmd+L`
- Take screenshot: `Cmd+S`
- Trigger memory warning: Hardware → Simulate Memory Warning

## 📊 Monitoring

### Watch Backend Logs
```bash
# In another terminal
make logs
# or
tail -f Backend/logs/app.log
```

### Watch iOS Console
```bash
# Open Console.app
open -a Console

# Filter by: NemiAIInbox
```

### Check Backend Health
```bash
make health
# or
curl http://localhost:3000/health
```

## 🎨 Hot Reload

### Backend (Automatic ✅)
- Changes auto-reload with nodemon
- No action needed
- Watch terminal for restart confirmation

### iOS (Manual 🔄)
- Make code changes
- In Xcode: Press `Cmd+R`
- Or rebuild: `make dev-ios`

**Note:** iOS doesn't have hot reload like web development. You must rebuild.

## 🚀 Advanced Usage

### Build for Specific Configuration
```bash
# Debug build (default)
./scripts/ios-dev.sh

# To add Release build support, edit ios-dev.sh
# Change: -configuration Debug
# To: -configuration Release
```

### Run Multiple Simulators
```bash
# Terminal 1: iPhone 15 Pro
./scripts/ios-dev.sh "iPhone 15 Pro"

# Terminal 2: iPad
./scripts/ios-dev.sh "iPad Pro (12.9-inch)"
```

### Run on Physical Device

**Not supported by scripts** - use Xcode:
1. Connect iPhone via USB
2. Run: `make dev-xcode`
3. Select your device in Xcode
4. Update API URL to your Mac's IP
5. Press `Cmd+R`

## 📚 Additional Resources

### Xcode Documentation
- [Simulator User Guide](https://developer.apple.com/documentation/xcode/running-your-app-in-the-simulator-or-on-a-device)
- [xcodebuild Manual](https://developer.apple.com/library/archive/technotes/tn2339/_index.html)

### Simulator Commands
```bash
# List all simulators
xcrun simctl list

# Boot simulator
xcrun simctl boot "Device Name"

# Install app
xcrun simctl install "Device Name" path/to/app.app

# Launch app
xcrun simctl launch "Device Name" com.bundle.id

# Uninstall app
xcrun simctl uninstall "Device Name" com.bundle.id

# Erase simulator
xcrun simctl erase "Device Name"
```

## 💡 Pro Tips

1. **Keep Simulator Open** - Faster rebuilds if simulator already running
2. **Use Cmd+R in Xcode** - Fastest way to rebuild during development
3. **Watch Logs** - Run `make logs` in separate terminal
4. **Clean Regularly** - iOS builds can get stale, clean when issues arise
5. **Test on Multiple Devices** - Use different simulators to test layouts

## 🎯 Recommended Workflow

```bash
# Terminal 1: Start everything
make dev

# Terminal 2: Watch logs
make logs

# Xcode: Make iOS changes, press Cmd+R to rebuild
# Editor: Make backend changes, auto-reloads

# Test in simulator
# Check logs for API calls
# Iterate!
```

---

**Questions?** Check:
- [MONOREPO_GUIDE.md](MONOREPO_GUIDE.md) - All monorepo commands
- [GETTING_STARTED.md](GETTING_STARTED.md) - Setup guide
- [QUICKSTART.md](QUICKSTART.md) - Quick reference
