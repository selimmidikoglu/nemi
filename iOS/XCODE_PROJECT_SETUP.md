# NemiAI Inbox - Xcode Project Setup Guide

## ✅ All iOS Files Created Successfully!

All Swift files have been created at: `/Users/gaban/Documents/NEMI/iOS/NemiAIInbox/NemiAIInbox/`

### File Structure:
```
iOS/NemiAIInbox/NemiAIInbox/
├── Models/
│   ├── Email.swift              ✅ Created
│   └── User.swift               ✅ Created
├── Services/
│   └── APIService.swift         ✅ Created
├── ViewModels/
│   ├── AuthViewModel.swift      ✅ Created
│   └── FeedViewModel.swift      ✅ Created
├── Views/
│   ├── AuthFlow.swift           ✅ Created
│   ├── FeedScreen.swift         ✅ Created
│   ├── SidebarMenu.swift        ✅ Created
│   └── EmailDetailScreen.swift  ✅ Created
├── Utils/
│   └── PushNotificationHandler.swift  ✅ Created
└── NemiAIInboxApp.swift         ✅ Created
```

---

## 🚀 Step-by-Step: Create Xcode Project and Add Files

### Step 1: Create New Xcode Project

1. **Open Xcode**
2. Select **"Create a new Xcode project"** (or File → New → Project)
3. Choose **iOS** → **App** template
4. Click **Next**

### Step 2: Configure Project Settings

Fill in the following:
- **Product Name**: `NemiAIInbox`
- **Team**: Select your Apple Developer Team (or add your Apple ID)
- **Organization Identifier**: `com.yourname` (e.g., `com.nemi`)
- **Bundle Identifier**: Will be auto-generated (e.g., `com.yourname.NemiAIInbox`)
- **Interface**: **SwiftUI**
- **Language**: **Swift**
- **Storage**: None
- **Include Tests**: Uncheck both boxes (optional)

Click **Next**

### Step 3: Save Project Location

**IMPORTANT**: Save the project at:
```
/Users/gaban/Documents/NEMI/iOS/
```

This will create: `/Users/gaban/Documents/NEMI/iOS/NemiAIInbox/`

The Xcode project will be: `NemiAIInbox.xcodeproj`

Click **Create**

### Step 4: Delete Default Files

In the Project Navigator (left sidebar), you'll see:
- NemiAIInbox (blue project icon)
  - NemiAIInbox (yellow folder)
    - **ContentView.swift** ← DELETE THIS
    - Assets.xcassets
    - Preview Content

**Delete ContentView.swift**:
1. Right-click on `ContentView.swift`
2. Select **"Delete"**
3. Choose **"Move to Trash"**

### Step 5: Add Our Swift Files to Xcode

1. **Right-click** on the **yellow NemiAIInbox folder** in Project Navigator
2. Select **"Add Files to "NemiAIInbox"..."**
3. Navigate to: `/Users/gaban/Documents/NEMI/iOS/NemiAIInbox/NemiAIInbox/`
4. **Select ALL 5 folders**:
   - ✅ Models
   - ✅ Services
   - ✅ ViewModels
   - ✅ Views
   - ✅ Utils

5. **IMPORTANT - Check these settings at the bottom**:
   - ✅ **"Copy items if needed"** - CHECK THIS
   - ✅ **"Create groups"** - SELECT THIS (not "Create folder references")
   - ✅ **"Add to targets"** - Make sure **NemiAIInbox** is CHECKED

6. Click **"Add"**

### Step 6: Replace NemiAIInboxApp.swift

The Xcode project created a default `NemiAIInboxApp.swift`. We need to replace it:

1. In Project Navigator, find **NemiAIInboxApp.swift** (it's in the yellow NemiAIInbox folder)
2. Click on it to open it
3. **Select All** (⌘A) and **Delete** all the content
4. **Copy** the content from our file at `/Users/gaban/Documents/NEMI/iOS/NemiAIInbox/NemiAIInbox/NemiAIInboxApp.swift`
5. **Paste** it into Xcode

Or simply:
1. Delete the Xcode-created `NemiAIInboxApp.swift` (Move to Trash)
2. Follow Step 5 again but select only `NemiAIInboxApp.swift` file

### Step 7: Verify File Structure in Xcode

Your Project Navigator should now look like:

```
NemiAIInbox (blue icon)
└── NemiAIInbox (yellow folder)
    ├── Models
    │   ├── Email.swift
    │   └── User.swift
    ├── Services
    │   └── APIService.swift
    ├── ViewModels
    │   ├── AuthViewModel.swift
    │   └── FeedViewModel.swift
    ├── Views
    │   ├── AuthFlow.swift
    │   ├── FeedScreen.swift
    │   ├── SidebarMenu.swift
    │   └── EmailDetailScreen.swift
    ├── Utils
    │   └── PushNotificationHandler.swift
    ├── NemiAIInboxApp.swift
    ├── Assets.xcassets
    └── Preview Content
```

### Step 8: Configure Signing & Capabilities

1. Click on the **blue NemiAIInbox project** at the top of Project Navigator
2. Select the **NemiAIInbox target** (under "Targets")
3. Go to **"Signing & Capabilities"** tab
4. Make sure **"Automatically manage signing"** is checked
5. Select your **Team** from the dropdown (if not already selected)

**(Optional) Add Push Notifications:**
1. Click **"+ Capability"** button
2. Search for **"Push Notifications"**
3. Double-click to add it

### Step 9: Build and Run! 🎉

1. At the top of Xcode, select a **simulator** from the device dropdown
   - Recommended: **iPhone 15 Pro** or **iPhone 14 Pro**
2. Press **⌘R** (Command + R) or click the **▶️ Play button**
3. Wait for Xcode to build (first build may take 1-2 minutes)
4. The iOS Simulator will launch automatically
5. Your app will install and open!

---

## 🎨 What You Should See

### Login Screen:
- Beautiful gradient background (blue to purple)
- Large envelope icon at the top
- "NemiAI Inbox" title
- "AI-Powered Email Intelligence" subtitle
- Email and password input fields
- Blue "Login" button
- "Continue with Google" button
- "Continue with Apple" button
- "Don't have an account? Sign Up" link at the bottom

### After Login (if backend is running):
- Main inbox feed with email list
- Category filter chips at the top
- Email cards with AI summaries
- Category badges (Work, Personal, Me-related)
- Sidebar menu accessible via hamburger icon

---

## 🐛 Troubleshooting

### Build Errors?

**Error: "No such module"**
- Clean build folder: **Product → Clean Build Folder** (⌘⇧K)
- Try building again

**Error: "Cannot find type 'X' in scope"**
- Make sure all files are added to the target
- Check each file in the File Inspector (right sidebar) under "Target Membership"

**Signing Error:**
- Go to Signing & Capabilities
- Make sure you've selected a valid Team
- Try toggling "Automatically manage signing" off and on

**Simulator won't launch:**
- Try a different simulator device
- Restart Xcode
- Restart your Mac (if necessary)

### App Crashes on Launch?

**Check the console output in Xcode** (bottom panel) for error messages.

Common issues:
- Backend not running (app will show login screen but login will fail)
- API endpoint incorrect (check APIService.swift - should be `http://localhost:3000/api`)

---

## 🔧 Testing Without Backend

The app will launch and show the login screen even without the backend running!

You can test the UI by:
1. Viewing the login screen design
2. Clicking "Sign Up" to see the signup screen
3. The app won't proceed past login without a backend, but you can see the beautiful UI!

---

## 🚦 Next Steps After Xcode Setup

1. ✅ Get the app building and running in simulator
2. 🔄 Start the backend: `cd /Users/gaban/Documents/NEMI && npm run dev`
3. 🗄️ Make sure PostgreSQL database is running
4. 🔐 Create a test account in the app
5. 📧 Test email functionality!

---

## 📱 Features to Test

Once backend is running:
- ✅ Sign up / Login
- ✅ View inbox
- ✅ Filter by category
- ✅ Tap email to see details
- ✅ View AI summaries
- ✅ Run AI classification (wand icon)
- ✅ Open sidebar menu
- ✅ View settings
- ✅ Logout

---

## 🎯 Quick Reference

| Action | Shortcut |
|--------|----------|
| Build & Run | ⌘R |
| Stop | ⌘. |
| Clean Build | ⌘⇧K |
| Open Navigator | ⌘1 |
| Open Console | ⌘⇧Y |
| Find in Project | ⌘⇧F |

---

## 📞 Need Help?

If you encounter any errors during setup, share:
1. The error message from Xcode
2. Screenshot of the issue
3. Which step you're on

Good luck! 🚀
