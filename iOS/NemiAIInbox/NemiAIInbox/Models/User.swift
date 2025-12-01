//
//  User.swift
//  NemiAIInbox
//
//  Created by NemiAI
//

import Foundation
import SwiftUI

// MARK: - User Model

struct User: Identifiable, Codable {
    let id: String
    let email: String
    let name: String
    let emailProvider: EmailProvider
    let preferences: UserPreferences
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, email, name
        case emailProvider = "email_provider"
        case preferences
        case createdAt = "created_at"
    }
}

// MARK: - Email Provider

enum EmailProvider: String, Codable {
    case gmail = "gmail"
    case outlook = "outlook"
    case icloud = "icloud"
    case yahoo = "yahoo"
    case other = "other"
}

// MARK: - User Preferences

struct UserPreferences: Codable {
    let theme: AppTheme
    let notificationsEnabled: Bool
    let autoSummarize: Bool
    let smartCategorization: Bool

    enum CodingKeys: String, CodingKey {
        case theme
        case notificationsEnabled = "notifications_enabled"
        case autoSummarize = "auto_summarize"
        case smartCategorization = "smart_categorization"
    }
}

// MARK: - App Theme

enum AppTheme: String, Codable {
    case system = "system"
    case light = "light"
    case dark = "dark"
}
