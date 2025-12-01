# iOS Files Import Checklist

## Files Location
All files are located at: `/Users/gaban/Documents/NEMI/iOS/NemiAIInbox/NemiAIInbox/`

## Files to Import (Folders):
- [ ] Models/ (Contains: Email.swift, User.swift)
- [ ] Views/ (Contains: AuthFlow.swift, FeedScreen.swift, SidebarMenu.swift, EmailDetailScreen.swift)
- [ ] ViewModels/ (Contains: AuthViewModel.swift, FeedViewModel.swift)
- [ ] Services/ (Contains: APIService.swift)
- [ ] Utils/ (Contains: PushNotificationHandler.swift)

## Import Steps:
1. [ ] Open Xcode
2. [ ] Open NemiAIInbox.xcodeproj
3. [ ] Right-click on NemiAIInbox folder in Project Navigator
4. [ ] Select "Add Files to NemiAIInbox..."
5. [ ] Select all 5 folders (Models, Views, ViewModels, Services, Utils)
6. [ ] Check "Copy items if needed"
7. [ ] Check "Create groups"
8. [ ] Check your app target under "Add to targets"
9. [ ] Click "Add"
10. [ ] Delete ContentView.swift if it exists
11. [ ] Verify NemiAIInboxApp.swift is updated (should import UserNotifications)
12. [ ] Select a simulator (iPhone 15 Pro recommended)
13. [ ] Press ⌘R to build and run

## Expected Result:
You should see the login screen with:
- NemiAI Inbox logo (envelope icon)
- Email and password fields
- Login button
- "Continue with Google" and "Continue with Apple" buttons
- "Don't have an account? Sign Up" link

## If Build Fails:
1. Check Build Errors in Xcode (⌘9 to open Issue Navigator)
2. Make sure all Swift files are added to the target
3. Verify Team is selected in Signing & Capabilities
4. Clean build folder: Product → Clean Build Folder (⌘⇧K)
5. Try building again

## Backend Note:
The app will try to connect to `http://localhost:3000/api` for the backend.
Make sure your backend is running before testing login functionality.
For now, you can test the UI without the backend running.
