//
//  APIService.swift
//  NemiAIInbox
//
//  Created by NemiAI
//

import Foundation
import Combine

class APIService: ObservableObject {
    static let shared = APIService()

    private let baseURL = "http://localhost:3000/api"
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    private init() {}

    // MARK: - Authentication

    func signUp(email: String, password: String, name: String) async throws -> AuthResponse {
        let url = URL(string: "\(baseURL)/auth/signup")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "email": email,
            "password": password,
            "name": name
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 || httpResponse.statusCode == 201 else {
            throw APIError.serverError(httpResponse.statusCode)
        }

        return try decoder.decode(AuthResponse.self, from: data)
    }

    func login(email: String, password: String) async throws -> AuthResponse {
        let url = URL(string: "\(baseURL)/auth/login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "email": email,
            "password": password
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }

        return try decoder.decode(AuthResponse.self, from: data)
    }

    func refreshToken(refreshToken: String) async throws -> AuthResponse {
        let url = URL(string: "\(baseURL)/auth/refresh")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = ["refreshToken": refreshToken]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw APIError.unauthorized
        }

        return try decoder.decode(AuthResponse.self, from: data)
    }

    func getCurrentUser() async throws -> User {
        let url = URL(string: "\(baseURL)/auth/me")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        if let token = KeychainHelper.get(key: "accessToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw APIError.unauthorized
        }

        return try decoder.decode(User.self, from: data)
    }

    // MARK: - Email Operations

    func getEmails(category: EmailCategory? = nil, page: Int = 1, limit: Int = 50) async throws -> [Email] {
        var components = URLComponents(string: "\(baseURL)/emails")!
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "page", value: "\(page)"),
            URLQueryItem(name: "limit", value: "\(limit)")
        ]

        if let category = category {
            queryItems.append(URLQueryItem(name: "category", value: category.rawValue))
        }

        components.queryItems = queryItems

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        if let token = KeychainHelper.get(key: "accessToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }

        // Debug: Print raw JSON response
        if let jsonString = String(data: data, encoding: .utf8) {
            print("📧 Raw API Response (first 2000 chars):")
            print(String(jsonString.prefix(2000)))
        }

        do {
            let emailsResponse = try decoder.decode(EmailsResponse.self, from: data)
            return emailsResponse.emails
        } catch let DecodingError.keyNotFound(key, context) {
            print("❌ Key '\(key.stringValue)' not found:", context.debugDescription)
            print("codingPath:", context.codingPath)
            throw APIError.decodingError
        } catch let DecodingError.valueNotFound(value, context) {
            print("❌ Value '\(value)' not found:", context.debugDescription)
            print("codingPath:", context.codingPath)
            throw APIError.decodingError
        } catch let DecodingError.typeMismatch(type, context) {
            print("❌ Type '\(type)' mismatch:", context.debugDescription)
            print("codingPath:", context.codingPath)
            throw APIError.decodingError
        } catch let DecodingError.dataCorrupted(context) {
            print("❌ Data corrupted:", context.debugDescription)
            print("codingPath:", context.codingPath)
            throw APIError.decodingError
        } catch {
            print("❌ Decoding error:", error)
            throw APIError.decodingError
        }
    }

    func getBadgeCategoryStats() async throws -> BadgeCategoryStatsResponse {
        let url = URL(string: "\(baseURL)/emails/badges/categories/stats")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        if let token = KeychainHelper.get(key: "accessToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }

        return try decoder.decode(BadgeCategoryStatsResponse.self, from: data)
    }

    func classifyEmails(emailIds: [String]) async throws -> ClassifyResponse {
        let url = URL(string: "\(baseURL)/emails/classify")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = KeychainHelper.get(key: "accessToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let body: [String: Any] = ["emailIds": emailIds]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }

        return try decoder.decode(ClassifyResponse.self, from: data)
    }

    // MARK: - Push Notifications

    func registerDeviceToken(token: String, platform: String) async throws {
        let url = URL(string: "\(baseURL)/push/register")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let authToken = KeychainHelper.get(key: "accessToken") {
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        }

        let body: [String: Any] = [
            "token": token,
            "platform": platform
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 || httpResponse.statusCode == 201 else {
            throw APIError.serverError(httpResponse.statusCode)
        }
    }

    // MARK: - Email Accounts

    func getEmailProviders() async throws -> [EmailProviderConfig] {
        let url = URL(string: "\(baseURL)/email-accounts/providers")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        if let token = KeychainHelper.get(key: "accessToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }

        let providersResponse = try decoder.decode(EmailProvidersResponse.self, from: data)
        return providersResponse.providers
    }

    func addEmailAccount(emailAddress: String, password: String, provider: String, accountName: String?, imapHost: String?, imapPort: Int?, imapSecure: Bool?) async throws -> EmailAccount {
        let url = URL(string: "\(baseURL)/email-accounts")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = KeychainHelper.get(key: "accessToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var body: [String: Any] = [
            "email_address": emailAddress,
            "password": password,
            "provider": provider
        ]

        if let accountName = accountName {
            body["account_name"] = accountName
        }
        if let imapHost = imapHost {
            body["imap_host"] = imapHost
        }
        if let imapPort = imapPort {
            body["imap_port"] = imapPort
        }
        if let imapSecure = imapSecure {
            body["imap_secure"] = imapSecure
        }

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 || httpResponse.statusCode == 201 else {
            if httpResponse.statusCode == 400 {
                // Try to decode error message
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let errorMsg = json["error"] as? String {
                    throw APIError.customError(errorMsg)
                }
            }
            throw APIError.serverError(httpResponse.statusCode)
        }

        let accountResponse = try decoder.decode(EmailAccountResponse.self, from: data)
        return accountResponse.emailAccount
    }

    func getEmailAccounts() async throws -> [EmailAccount] {
        let url = URL(string: "\(baseURL)/email-accounts")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        if let token = KeychainHelper.get(key: "accessToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }

        let accountsResponse = try decoder.decode(EmailAccountsResponse.self, from: data)
        return accountsResponse.emailAccounts
    }

    func getAccountStats(accountId: String) async throws -> EmailAccountStats {
        let url = URL(string: "\(baseURL)/email-accounts/\(accountId)/stats")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        if let token = KeychainHelper.get(key: "accessToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }

        let statsResponse = try decoder.decode(EmailAccountStatsResponse.self, from: data)
        return statsResponse.stats
    }

    func updateEmailAccount(accountId: String, accountName: String?, syncEnabled: Bool?, isActive: Bool?) async throws -> EmailAccount {
        let url = URL(string: "\(baseURL)/email-accounts/\(accountId)")!
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = KeychainHelper.get(key: "accessToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var body: [String: Any] = [:]
        if let accountName = accountName {
            body["account_name"] = accountName
        }
        if let syncEnabled = syncEnabled {
            body["sync_enabled"] = syncEnabled
        }
        if let isActive = isActive {
            body["is_active"] = isActive
        }

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }

        let accountResponse = try decoder.decode(EmailAccountResponse.self, from: data)
        return accountResponse.emailAccount
    }

    func deleteEmailAccount(accountId: String) async throws {
        let url = URL(string: "\(baseURL)/email-accounts/\(accountId)")!
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"

        if let token = KeychainHelper.get(key: "accessToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 204 else {
            throw APIError.serverError(httpResponse.statusCode)
        }
    }

    // MARK: - Analytics

    func sendEngagementEvent(event: EngagementEvent) async throws {
        let url = URL(string: "\(baseURL)/analytics/events")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = KeychainHelper.get(key: "accessToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        request.httpBody = try encoder.encode(event)

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 201 || httpResponse.statusCode == 204 else {
            throw APIError.serverError(httpResponse.statusCode)
        }
    }

    func saveViewSession(
        sessionId: String,
        userId: String,
        emailId: String,
        openedAt: Date,
        closedAt: Date,
        durationSeconds: Int,
        linkClicksCount: Int
    ) async throws {
        let url = URL(string: "\(baseURL)/analytics/view-sessions")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = KeychainHelper.get(key: "accessToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let formatter = ISO8601DateFormatter()
        let body: [String: Any] = [
            "session_id": sessionId,
            "user_id": userId,
            "email_id": emailId,
            "opened_at": formatter.string(from: openedAt),
            "closed_at": formatter.string(from: closedAt),
            "duration_seconds": durationSeconds,
            "link_clicks_count": linkClicksCount
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 201 || httpResponse.statusCode == 204 else {
            throw APIError.serverError(httpResponse.statusCode)
        }
    }

    func getBadgeEngagementMetrics(userId: String) async throws -> [BadgeEngagementMetric] {
        let url = URL(string: "\(baseURL)/analytics/badge-engagement/\(userId)")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        if let token = KeychainHelper.get(key: "accessToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }

        return try decoder.decode([BadgeEngagementMetric].self, from: data)
    }

    func getUserBadgeDefinitions() async throws -> [UserBadgeDefinition] {
        let url = URL(string: "\(baseURL)/badges/user-definitions")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        if let token = KeychainHelper.get(key: "accessToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }

        // The API returns { userId, badges } so we need to decode and extract badges array
        struct BadgesResponse: Codable {
            let badges: [UserBadgeDefinition]
        }

        let badgesResponse = try decoder.decode(BadgesResponse.self, from: data)
        return badgesResponse.badges
    }

    func updateBadgeOrder(badgeOrder: [[String: Any]]) async throws {
        let url = URL(string: "\(baseURL)/badges/order")!
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = KeychainHelper.get(key: "accessToken") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let body = ["badge_order": badgeOrder]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }
    }
}

// MARK: - Response Models

struct AuthResponse: Codable {
    let accessToken: String
    let refreshToken: String
    let user: User

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case user
    }
}

struct EmailsResponse: Codable {
    let emails: [Email]
    let total: Int
    let page: Int
    let limit: Int
}

struct ClassifyResponse: Codable {
    let classified: Int
    let message: String
}

struct BadgeCategoryStatsResponse: Codable {
    let categories: [BadgeCategoryStats]
}

struct BadgeCategoryStats: Codable {
    let name: String
    let emailCount: Int
    let badgeCount: Int
    let totalUsage: Int

    enum CodingKeys: String, CodingKey {
        case name
        case emailCount = "emailCount"
        case badgeCount = "badgeCount"
        case totalUsage = "totalUsage"
    }
}

struct BadgeInfo: Codable {
    let name: String
    let color: String
    let icon: String
    let count: Int
}

// MARK: - API Errors

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case serverError(Int)
    case decodingError
    case networkError
    case customError(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .unauthorized:
            return "Unauthorized access"
        case .serverError(let code):
            return "Server error: \(code)"
        case .decodingError:
            return "Failed to decode response"
        case .networkError:
            return "Network connection failed"
        case .customError(let message):
            return message
        }
    }
}

// MARK: - KeychainHelper

class KeychainHelper {
    static func save(key: String, value: String) {
        let data = Data(value.utf8)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]

        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    static func get(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: kCFBooleanTrue!,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)

        if status == errSecSuccess {
            if let data = dataTypeRef as? Data {
                return String(data: data, encoding: .utf8)
            }
        }

        return nil
    }

    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]

        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - Badge Engagement Metric Model

struct BadgeEngagementMetric: Codable {
    let badgeName: String
    let totalEmailsWithBadge: Int
    let emailsOpened: Int
    let emailsWithClicks: Int
    let totalTimeSpentSeconds: Int
    let avgTimeSpentSeconds: Double
    let totalLinkClicks: Int
    let openRate: Double
    let clickRate: Double
    let engagementScore: Double
    let lastInteractionAt: Date?

    enum CodingKeys: String, CodingKey {
        case badgeName = "badge_name"
        case totalEmailsWithBadge = "total_emails_with_badge"
        case emailsOpened = "emails_opened"
        case emailsWithClicks = "emails_with_clicks"
        case totalTimeSpentSeconds = "total_time_spent_seconds"
        case avgTimeSpentSeconds = "avg_time_spent_seconds"
        case totalLinkClicks = "total_link_clicks"
        case openRate = "open_rate"
        case clickRate = "click_rate"
        case engagementScore = "engagement_score"
        case lastInteractionAt = "last_interaction_at"
    }
}

// MARK: - User Badge Definition Model

struct UserBadgeDefinition: Codable {
    let badgeName: String
    let badgeColor: String
    let badgeIcon: String
    let category: String?
    let usageCount: Int
    let engagementScore: Double?
    let displayOrder: Int?
    let lastUsedAt: Date?

    enum CodingKeys: String, CodingKey {
        case badgeName = "badge_name"
        case badgeColor = "badge_color"
        case badgeIcon = "badge_icon"
        case category
        case usageCount = "usage_count"
        case engagementScore = "engagement_score"
        case displayOrder = "display_order"
        case lastUsedAt = "last_used_at"
    }

    // Custom decoder to handle engagement_score as either String or Double
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        badgeName = try container.decode(String.self, forKey: .badgeName)
        badgeColor = try container.decode(String.self, forKey: .badgeColor)
        badgeIcon = try container.decode(String.self, forKey: .badgeIcon)
        category = try container.decodeIfPresent(String.self, forKey: .category)
        usageCount = try container.decode(Int.self, forKey: .usageCount)
        displayOrder = try container.decodeIfPresent(Int.self, forKey: .displayOrder)
        lastUsedAt = try container.decodeIfPresent(Date.self, forKey: .lastUsedAt)

        // Handle engagement_score as either String or Double
        if let scoreString = try? container.decodeIfPresent(String.self, forKey: .engagementScore) {
            engagementScore = Double(scoreString)
        } else {
            engagementScore = try container.decodeIfPresent(Double.self, forKey: .engagementScore)
        }
    }
}
