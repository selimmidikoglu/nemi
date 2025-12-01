//
//  NemiAIInboxApp.swift
//  NemiAIInbox
//
//  Created by NemiAI
//

import SwiftUI
import UserNotifications

@main
struct NemiAIInboxApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var pushNotificationHandler = PushNotificationHandler.shared

    var body: some Scene {
        WindowGroup {
            AuthFlow()
                .preferredColorScheme(.dark) // FORCE DARK MODE FOR TESTING
                .onAppear {
                    Task {
                        await pushNotificationHandler.requestPermission()
                    }
                }
        }
    }
}

// MARK: - App Delegate

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = PushNotificationHandler.shared
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        PushNotificationHandler.shared.didRegisterForRemoteNotifications(withDeviceToken: deviceToken)
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        PushNotificationHandler.shared.didFailToRegisterForRemoteNotifications(withError: error)
    }
}
