//
//  PushNotificationHandler.swift
//  NemiAIInbox
//
//  Created by NemiAI
//

import Foundation
import UserNotifications
import UIKit
import Combine

class PushNotificationHandler: NSObject, ObservableObject {
    static let shared = PushNotificationHandler()

    @Published var deviceToken: String?
    @Published var notificationPermissionGranted = false

    private let apiService = APIService.shared

    private override init() {
        super.init()
    }

    func requestPermission() async {
        let center = UNUserNotificationCenter.current()

        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            await MainActor.run {
                notificationPermissionGranted = granted
            }

            if granted {
                await registerForRemoteNotifications()
            }
        } catch {
            print("Error requesting notification permission: \(error)")
        }
    }

    @MainActor
    func registerForRemoteNotifications() async {
        UIApplication.shared.registerForRemoteNotifications()
    }

    func didRegisterForRemoteNotifications(withDeviceToken deviceToken: Data) {
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        self.deviceToken = tokenString

        Task {
            await registerDeviceTokenWithBackend(tokenString)
        }
    }

    func didFailToRegisterForRemoteNotifications(withError error: Error) {
        print("Failed to register for remote notifications: \(error)")
    }

    private func registerDeviceTokenWithBackend(_ token: String) async {
        do {
            try await apiService.registerDeviceToken(token: token, platform: "ios")
            print("Successfully registered device token with backend")
        } catch {
            print("Failed to register device token with backend: \(error)")
        }
    }

    func handleNotification(_ notification: UNNotification) {
        let userInfo = notification.request.content.userInfo

        if let emailId = userInfo["emailId"] as? String {
            print("Received notification for email: \(emailId)")

            NotificationCenter.default.post(
                name: NSNotification.Name("NewEmailReceived"),
                object: nil,
                userInfo: ["emailId": emailId]
            )
        }
    }

    func handleNotificationResponse(_ response: UNNotificationResponse) async {
        let userInfo = response.notification.request.content.userInfo

        if let emailId = userInfo["emailId"] as? String {
            print("User tapped notification for email: \(emailId)")

            await MainActor.run {
                NotificationCenter.default.post(
                    name: NSNotification.Name("OpenEmail"),
                    object: nil,
                    userInfo: ["emailId": emailId]
                )
            }
        }
    }

    func updateBadgeCount(_ count: Int) {
        Task { @MainActor in
            if #available(iOS 16.0, *) {
                UNUserNotificationCenter.current().setBadgeCount(count)
            } else {
                UIApplication.shared.applicationIconBadgeNumber = count
            }
        }
    }

    func clearBadge() {
        updateBadgeCount(0)
    }
}

extension PushNotificationHandler: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        handleNotification(notification)
        completionHandler([.banner, .sound, .badge])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        Task {
            await handleNotificationResponse(response)
            completionHandler()
        }
    }
}

extension NSNotification.Name {
    static let newEmailReceived = NSNotification.Name("NewEmailReceived")
    static let openEmail = NSNotification.Name("OpenEmail")
}
