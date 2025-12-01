# iOS Simulator Support Added! 🎉

## What's New

Your monorepo now includes **automatic iOS simulator support**! No more manual Xcode steps - everything runs with one command.

## ✨ New Features

### 1. Full Stack Development (One Command!)

```bash
npm run dev
# or
make dev
```

**Now automatically:**
- ✅ Starts backend API
- ✅ Boots iOS simulator (iPhone 15 Pro)
- ✅ Builds iOS app
- ✅ Installs app to simulator
- ✅ Launches app automatically
- ✅ Keeps everything running

### 2. iOS-Only Simulator Launch

```bash
npm run dev:ios
# or
make dev-ios
```

**Perfect for:**
- When backend is already running
- Testing iOS changes quickly
- Switching simulator devices

### 3. Custom Simulator Selection

```bash
./scripts/ios-dev.sh "iPhone 14"
./scripts/ios-dev.sh "iPhone 15 Plus"
./scripts/ios-dev.sh "iPad Pro (12.9-inch)"
```

## 📁 New Files Added

```
scripts/
├── ios-dev.sh         # iOS simulator launcher
└── dev-all.sh         # Full stack (backend + iOS)
```

## 📝 Updated Files

```
package.json           # New dev scripts
Makefile              # New make commands
IOS_SIMULATOR_GUIDE.md # Complete simulator guide
```

## 🎯 Command Comparison

| What You Want | Command | What Happens |
|---------------|---------|--------------|
| Everything | `make dev` | Backend + iOS simulator |
| Backend only | `make dev-backend` | API server only |
| iOS only | `make dev-ios` | Simulator only |
| Open Xcode | `make dev-xcode` | Manual control |

## 🚀 Quick Example

```bash
# Complete development environment
cd /Users/gaban/Documents/NEMI

# One command starts everything!
make dev

# ✅ Backend API starts at http://localhost:3000
# ✅ iOS simulator boots
# ✅ App builds and installs
# ✅ App launches automatically
# ✅ Ready to develop!
```

## 💡 Benefits

1. **No Manual Steps** - Simulator starts automatically
2. **Faster Iteration** - One command to start everything
3. **Consistent Environment** - Always same simulator
4. **Flexible Options** - Choose backend only, iOS only, or both
5. **Multiple Devices** - Easy to test different simulators

## 📚 Full Documentation

See [IOS_SIMULATOR_GUIDE.md](IOS_SIMULATOR_GUIDE.md) for:
- All simulator commands
- Troubleshooting guide
- Simulator controls
- Device selection
- Development workflows
- Hot reload info

## 🎓 Usage Examples

### Daily Development
```bash
make dev                    # Start everything
# Work on code...
# Ctrl+C to stop
```

### Test Different Devices
```bash
./scripts/ios-dev.sh "iPhone 15"
./scripts/ios-dev.sh "iPhone 15 Pro Max"
./scripts/ios-dev.sh "iPad Air"
```

### Backend Testing Only
```bash
make dev-backend           # No iOS
curl http://localhost:3000/health
```

### iOS Development Only
```bash
make dev-backend           # Terminal 1: Backend
make dev-ios              # Terminal 2: iOS
```

## ⚠️ Requirements

- ✅ Xcode 15+ installed
- ✅ Xcode Command Line Tools
- ✅ iOS simulators downloaded in Xcode

Verify installation:
```bash
xcodebuild -version
xcrun simctl list devices
```

## 🐛 Troubleshooting

### Simulator won't boot
```bash
killall Simulator
make dev-ios
```

### Build fails
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
make dev-ios
```

### App not connecting to backend
Check API URL in `iOS/NemiAIInbox/Services/APIService.swift`:
```swift
// Should be localhost for simulator
private let baseURL = "http://localhost:3000/api"
```

See [IOS_SIMULATOR_GUIDE.md](IOS_SIMULATOR_GUIDE.md) for complete troubleshooting guide.

## 🎉 Try It Now!

```bash
cd /Users/gaban/Documents/NEMI

# Start everything with one command!
make dev

# Or with npm
npm run dev
```

**Your app will automatically:**
1. Start backend on port 3000
2. Boot iPhone 15 Pro simulator
3. Build and install iOS app
4. Launch app in simulator
5. Connect to backend API

**Happy developing!** 🚀

---

**More Info:**
- Complete guide: [IOS_SIMULATOR_GUIDE.md](IOS_SIMULATOR_GUIDE.md)
- All commands: [MONOREPO_COMMANDS.md](MONOREPO_COMMANDS.md)
- Getting started: [GETTING_STARTED.md](GETTING_STARTED.md)
