# Xcode Project Setup Guide

## 📱 Quick Setup (5 Minutes)

Xcode is now open. Follow these exact steps:

---

### Step 1: Create New Project

1. In Xcode, click: **File → New → Project** (or press `Cmd+Shift+N`)
2. Select **iOS** tab at the top
3. Choose **App** template
4. Click **Next**

---

### Step 2: Configure Project

Fill in these EXACT values:

| Field | Value |
|-------|-------|
| **Product Name** | `NemiAIInbox` |
| **Team** | (leave as is / select your team) |
| **Organization Identifier** | `com.nemi` |
| **Bundle Identifier** | `com.nemi.NemiAIInbox` (auto-fills) |
| **Interface** | **SwiftUI** |
| **Language** | **Swift** |
| **Storage** | None (leave unchecked) |
| **Include Tests** | ☐ (can leave unchecked for now) |

Click **Next**

---

### Step 3: Choose Location

1. Navigate to: `/Users/gaban/Documents/NEMI/iOS`
2. **IMPORTANT:** ☐ **UNCHECK** "Create Git repository" (we already have one)
3. Click **Create**

---

### Step 4: Delete Default Files

Xcode creates default files we don't need. Delete them:

1. In the left panel (Navigator), find these files:
   - `ContentView.swift`
   - `NemiAIInboxApp.swift` (the one Xcode just created)

2. Right-click each file → **Delete**
3. Choose **"Move to Trash"**

---

### Step 5: Add Our Swift Files

Now add all the code we created:

1. **Right-click** on the `NemiAIInbox` folder (blue icon in Navigator)
2. Select **"Add Files to 'NemiAIInbox'..."**
3. Navigate to: `/Users/gaban/Documents/NEMI/iOS/NemiAIInbox/`
4. **Hold `Cmd` key** and click to select ALL these items:
   - ☑️ `Models` folder
   - ☑️ `Views` folder
   - ☑️ `ViewModels` folder
   - ☑️ `Services` folder
   - ☑️ `Utils` folder
   - ☑️ `NemiAIInboxApp.swift` file

5. **Important Checkboxes at the bottom:**
   - ☑️ **"Copy items if needed"**
   - ☑️ **"Create groups"** (not "Create folder references")
   - ☑️ **"Add to targets: NemiAIInbox"**

6. Click **Add**

---

### Step 6: Verify File Structure

Your project should now look like this in Navigator:

```
NemiAIInbox (blue project icon)
├── NemiAIInbox (yellow folder)
│   ├── NemiAIInboxApp.swift      ← Our app file
│   ├── Models/
│   │   ├── Email.swift
│   │   └── User.swift
│   ├── Views/
│   │   ├── FeedScreen.swift
│   │   ├── SidebarMenu.swift
│   │   ├── EmailDetailScreen.swift
│   │   └── AuthFlow.swift
│   ├── ViewModels/
│   │   ├── FeedViewModel.swift
│   │   └── AuthViewModel.swift
│   ├── Services/
│   │   └── APIService.swift
│   ├── Utils/
│   │   └── PushNotificationHandler.swift
│   └── Assets.xcassets
└── Products
```

---

### Step 7: Select Simulator

1. At the top of Xcode, click the device selector (next to the Play button)
2. Choose: **iPhone 15 Pro** (or any iPhone simulator you prefer)

---

### Step 8: Build and Run!

Press **`Cmd + R`** or click the ▶️ **Play button**

The app will:
- Build (may take 1-2 minutes first time)
- Launch simulator
- Show the login screen

---

## ✅ Success!

If you see the NemiAIInbox login screen, you're done! 🎉

---

## 🐛 Troubleshooting

### Build Fails

**Error: "Cannot find type 'X' in scope"**
- Make sure ALL folders were added with "Create groups"
- Check that files appear in Navigator (not grayed out)

**Error: "Missing Info.plist"**
- Select project (blue icon) → Select target → Info tab
- Should show Info.plist automatically

### Files Not Showing

If files don't appear in Navigator:
1. File → Add Files to "NemiAIInbox"
2. Make sure to check "Copy items if needed"

### Simulator Not Starting

1. Xcode → Preferences → Locations
2. Check "Command Line Tools" is selected
3. Try: Window → Devices and Simulators → Add simulator

---

## 🚀 After Setup

Once the project is created, you can use our automation:

```bash
# Start backend + iOS automatically
make dev

# Or build iOS anytime
make dev-ios

# Or just backend
make dev-backend
```

---

## 📝 Notes

- The `.xcodeproj` file will be created at: `/Users/gaban/Documents/NEMI/iOS/NemiAIInbox.xcodeproj`
- You only need to do this setup ONCE
- After that, use `make dev` or `make dev-ios` to run

---

## ❓ Need Help?

If you get stuck:

1. **Check file locations:**
   ```bash
   ls /Users/gaban/Documents/NEMI/iOS/NemiAIInbox/
   ```
   Should show: Models, Views, ViewModels, Services, Utils, NemiAIInboxApp.swift

2. **Restart Xcode:**
   - Quit Xcode
   - Reopen and try again

3. **Use Xcode's built-in help:**
   - Help → Xcode Help → "Creating a Project"

---

**Good luck! The hardest part is this initial Xcode setup. After this, everything is automated!** 🚀
