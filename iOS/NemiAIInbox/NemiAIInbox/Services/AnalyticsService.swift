import Foundation

/// Service for tracking user behavior and engagement analytics
/// Tracks email opens, reading time, link clicks, and badge interactions
class AnalyticsService {
    static let shared = AnalyticsService()

    private let apiService = APIService.shared

    // Active view sessions (tracked in memory until closed)
    private var activeViewSessions: [String: ViewSession] = [:]

    // Queue for offline events (sent when connection restored)
    private var eventQueue: [EngagementEvent] = []

    private init() {}

    // MARK: - View Session Tracking

    /// Tracks when user opens an email
    /// - Parameters:
    ///   - emailId: ID of the email being opened
    ///   - userId: ID of the user
    func trackEmailOpened(emailId: String, userId: String) {
        let sessionId = UUID().uuidString
        let session = ViewSession(
            id: sessionId,
            userId: userId,
            emailId: emailId,
            openedAt: Date(),
            linkClicksCount: 0
        )

        activeViewSessions[emailId] = session

        // Send event
        let event = EngagementEvent(
            userId: userId,
            emailId: emailId,
            eventType: .opened,
            eventData: [
                "session_id": sessionId as Any,
                "timestamp": ISO8601DateFormatter().string(from: Date()) as Any
            ]
        )

        sendEvent(event)
    }

    /// Tracks when user closes an email
    /// - Parameters:
    ///   - emailId: ID of the email being closed
    ///   - userId: ID of the user
    func trackEmailClosed(emailId: String, userId: String) {
        guard let session = activeViewSessions[emailId] else {
            print("⚠️ No active session found for email: \(emailId)")
            return
        }

        let closedAt = Date()
        let durationSeconds = Int(closedAt.timeIntervalSince(session.openedAt))

        // Send session close event
        let event = EngagementEvent(
            userId: userId,
            emailId: emailId,
            eventType: .closed,
            eventData: [
                "session_id": session.id as Any,
                "duration_seconds": durationSeconds as Any,
                "link_clicks_count": session.linkClicksCount as Any,
                "timestamp": ISO8601DateFormatter().string(from: closedAt) as Any
            ]
        )

        sendEvent(event)

        // Save session to backend
        saveViewSession(session: session, closedAt: closedAt, durationSeconds: durationSeconds)

        // Remove from active sessions
        activeViewSessions.removeValue(forKey: emailId)
    }

    /// Tracks when user clicks a link within an email
    /// - Parameters:
    ///   - emailId: ID of the email containing the link
    ///   - userId: ID of the user
    ///   - url: URL that was clicked
    func trackLinkClick(emailId: String, userId: String, url: URL) {
        // Increment link click counter in active session
        if var session = activeViewSessions[emailId] {
            session.linkClicksCount += 1
            activeViewSessions[emailId] = session
        }

        // Send link click event
        let event = EngagementEvent(
            userId: userId,
            emailId: emailId,
            eventType: .linkClicked,
            eventData: [
                "url": url.absoluteString as Any,
                "domain": (url.host ?? "unknown") as Any,
                "timestamp": ISO8601DateFormatter().string(from: Date()) as Any
            ]
        )

        sendEvent(event)
    }

    /// Tracks when user filters emails by badge
    /// - Parameters:
    ///   - badgeName: Name of the badge being filtered
    ///   - userId: ID of the user
    ///   - emailCount: Number of emails with this badge
    func trackBadgeFiltered(badgeName: String, userId: String, emailCount: Int) {
        let event = EngagementEvent(
            userId: userId,
            emailId: nil,
            eventType: .badgeFiltered,
            eventData: [
                "badge_name": badgeName as Any,
                "email_count": emailCount as Any,
                "timestamp": ISO8601DateFormatter().string(from: Date()) as Any
            ]
        )

        sendEvent(event)
    }

    // MARK: - Private Helper Methods

    /// Sends engagement event to backend
    private func sendEvent(_ event: EngagementEvent) {
        Task {
            do {
                try await apiService.sendEngagementEvent(event: event)
            } catch {
                print("⚠️ Failed to send engagement event: \(error.localizedDescription)")
                // Queue for retry
                eventQueue.append(event)
            }
        }
    }

    /// Saves view session to backend
    private func saveViewSession(session: ViewSession, closedAt: Date, durationSeconds: Int) {
        Task {
            do {
                try await apiService.saveViewSession(
                    sessionId: session.id,
                    userId: session.userId,
                    emailId: session.emailId,
                    openedAt: session.openedAt,
                    closedAt: closedAt,
                    durationSeconds: durationSeconds,
                    linkClicksCount: session.linkClicksCount
                )
            } catch {
                print("⚠️ Failed to save view session: \(error.localizedDescription)")
            }
        }
    }

    /// Retries sending queued events (called when connection restored)
    func retryQueuedEvents() {
        guard !eventQueue.isEmpty else { return }

        let events = eventQueue
        eventQueue.removeAll()

        for event in events {
            sendEvent(event)
        }
    }
}

// MARK: - Data Models

/// Represents an active email viewing session
private struct ViewSession {
    let id: String
    let userId: String
    let emailId: String
    let openedAt: Date
    var linkClicksCount: Int
}

/// Represents a user engagement event
struct EngagementEvent: Codable {
    let userId: String
    let emailId: String?
    let eventType: EventType
    let eventData: [String: Any]

    enum EventType: String, Codable {
        case opened
        case closed
        case linkClicked = "link_clicked"
        case badgeFiltered = "badge_filtered"
    }

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case emailId = "email_id"
        case eventType = "event_type"
        case eventData = "event_data"
    }

    // Custom initializer
    init(userId: String, emailId: String?, eventType: EventType, eventData: [String: Any]) {
        self.userId = userId
        self.emailId = emailId
        self.eventType = eventType
        self.eventData = eventData
    }

    // Custom encoding to handle [String: Any]
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(userId, forKey: .userId)
        try container.encodeIfPresent(emailId, forKey: .emailId)
        try container.encode(eventType, forKey: .eventType)

        // Convert eventData to JSON-compatible dictionary
        let jsonData = try JSONSerialization.data(withJSONObject: eventData)
        let jsonObject = try JSONSerialization.jsonObject(with: jsonData)
        try container.encode(jsonObject as? [String: String] ?? [:], forKey: .eventData)
    }

    // Custom decoding to handle [String: Any]
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        userId = try container.decode(String.self, forKey: .userId)
        emailId = try container.decodeIfPresent(String.self, forKey: .emailId)
        eventType = try container.decode(EventType.self, forKey: .eventType)

        // Decode eventData as generic dictionary
        if let data = try? container.decode([String: String].self, forKey: .eventData) {
            eventData = data
        } else {
            eventData = [:]
        }
    }
}
