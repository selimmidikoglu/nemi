import Foundation

struct EmailAccount: Codable, Identifiable {
    let id: String
    let emailAddress: String
    let accountName: String?
    let provider: String
    let imapHost: String
    let imapPort: Int
    let imapSecure: Bool
    let isActive: Bool
    let syncEnabled: Bool
    let lastSyncAt: Date?
    let lastSyncError: String?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case emailAddress = "email_address"
        case accountName = "account_name"
        case provider
        case imapHost = "imap_host"
        case imapPort = "imap_port"
        case imapSecure = "imap_secure"
        case isActive = "is_active"
        case syncEnabled = "sync_enabled"
        case lastSyncAt = "last_sync_at"
        case lastSyncError = "last_sync_error"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    var displayName: String {
        accountName ?? emailAddress
    }

    var statusText: String {
        if !isActive {
            return "Inactive"
        }
        if let error = lastSyncError {
            return "Error: \(error)"
        }
        if let lastSync = lastSyncAt {
            let formatter = RelativeDateTimeFormatter()
            formatter.unitsStyle = .abbreviated
            return "Synced \(formatter.localizedString(for: lastSync, relativeTo: Date()))"
        }
        return "Never synced"
    }
}

struct EmailProviderConfig: Codable, Identifiable, Hashable, Equatable {
    let name: String
    let provider: String
    let imapHost: String
    let imapPort: Int
    let imapSecure: Bool
    let smtpHost: String?
    let smtpPort: Int?
    let smtpSecure: Bool?
    let authType: String
    let setupInstructions: String?

    var id: String { provider }

    // Hashable conformance
    func hash(into hasher: inout Hasher) {
        hasher.combine(provider)
    }

    // Equatable conformance
    static func == (lhs: EmailProviderConfig, rhs: EmailProviderConfig) -> Bool {
        return lhs.provider == rhs.provider
    }

    enum CodingKeys: String, CodingKey {
        case name
        case provider
        case imapHost = "imapHost"
        case imapPort = "imapPort"
        case imapSecure = "imapSecure"
        case smtpHost = "smtpHost"
        case smtpPort = "smtpPort"
        case smtpSecure = "smtpSecure"
        case authType = "authType"
        case setupInstructions = "setupInstructions"
    }
}

struct EmailAccountsResponse: Codable {
    let emailAccounts: [EmailAccount]

    enum CodingKeys: String, CodingKey {
        case emailAccounts = "email_accounts"
    }
}

struct EmailAccountResponse: Codable {
    let emailAccount: EmailAccount

    enum CodingKeys: String, CodingKey {
        case emailAccount = "email_account"
    }
}

struct EmailProvidersResponse: Codable {
    let providers: [EmailProviderConfig]
}

struct EmailAccountStats: Codable {
    let totalEmails: Int
    let analyzedEmails: Int
    let pendingEmails: Int
    let failedEmails: Int

    enum CodingKeys: String, CodingKey {
        case totalEmails = "total_emails"
        case analyzedEmails = "analyzed_emails"
        case pendingEmails = "pending_emails"
        case failedEmails = "failed_emails"
    }
}

struct EmailAccountStatsResponse: Codable {
    let stats: EmailAccountStats
}
