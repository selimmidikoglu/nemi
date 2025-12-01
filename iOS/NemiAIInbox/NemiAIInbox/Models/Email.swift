//
//  Email.swift
//  NemiAIInbox
//
//  Created by NemiAI
//

import Foundation
import SwiftUI

// MARK: - Email Model

struct Email: Identifiable, Codable {
    let id: String
    let from: EmailAddress
    let to: [EmailAddress]?
    let cc: [EmailAddress]?
    let subject: String
    let body: String
    let htmlBody: String?
    let receivedAt: Date
    let isRead: Bool
    let hasAttachments: Bool
    let attachments: [EmailAttachment]
    let aiSummary: String?
    let category: EmailCategory
    let importance: ImportanceLevel
    let isPersonallyRelevant: Bool
    let badges: [EmailBadge]?
    let scores: EmailScores?
    let masterImportanceScore: Double?

    enum CodingKeys: String, CodingKey {
        case id, from, to, cc, subject, body, htmlBody, receivedAt, isRead, hasAttachments, attachments
        case aiSummary = "ai_summary"
        case category, importance
        case isPersonallyRelevant = "is_personally_relevant"
        case badges, scores
        case masterImportanceScore = "master_importance_score"
    }
}

// MARK: - Email Address

struct EmailAddress: Codable {
    let email: String
    let name: String?
}

// MARK: - Email Attachment

struct EmailAttachment: Codable {
    let filename: String
    let mimeType: String
    let size: Int?

    enum CodingKeys: String, CodingKey {
        case filename
        case mimeType = "mime_type"
        case size
    }
}

// MARK: - Email Category

enum EmailCategory: String, Codable, CaseIterable {
    case work = "Work"
    case personal = "Personal"
    case meRelated = "Me-related"
    case finance = "Finance"
    case social = "Social"
    case promotions = "Promotions"
    case updates = "Updates"
    case other = "Other"

    var icon: String {
        switch self {
        case .work: return "briefcase.fill"
        case .personal: return "person.fill"
        case .meRelated: return "star.fill"
        case .finance: return "dollarsign.circle.fill"
        case .social: return "person.2.fill"
        case .promotions: return "tag.fill"
        case .updates: return "bell.fill"
        case .other: return "folder.fill"
        }
    }

    var color: Color {
        switch self {
        case .work: return .blue
        case .personal: return .green
        case .meRelated: return .purple
        case .finance: return .orange
        case .social: return .pink
        case .promotions: return .red
        case .updates: return .cyan
        case .other: return .gray
        }
    }
}

// MARK: - Importance Level

enum ImportanceLevel: String, Codable {
    case high = "high"
    case normal = "normal"
    case low = "low"
}

// MARK: - Email Badge

struct EmailBadge: Codable, Identifiable {
    var id: String { name }
    let name: String
    let color: String
    let icon: String
    let importance: Double
    let category: String

    var swiftUIColor: Color {
        Color(hex: color) ?? .gray
    }
}

// MARK: - Email Scores

struct EmailScores: Codable {
    let promotionalScore: Double?
    let personalScore: Double?
    let urgentScore: Double?
    let workScore: Double?
    let financialScore: Double?
    let socialScore: Double?
    let requiresActionScore: Double?

    enum CodingKeys: String, CodingKey {
        case promotionalScore = "promotional_score"
        case personalScore = "personal_score"
        case urgentScore = "urgent_score"
        case workScore = "work_score"
        case financialScore = "financial_score"
        case socialScore = "social_score"
        case requiresActionScore = "requires_action_score"
    }
}

// MARK: - Color Extension for Hex Support

extension Color {
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }

        let red = Double((rgb & 0xFF0000) >> 16) / 255.0
        let green = Double((rgb & 0x00FF00) >> 8) / 255.0
        let blue = Double(rgb & 0x0000FF) / 255.0

        self.init(red: red, green: green, blue: blue)
    }
}
