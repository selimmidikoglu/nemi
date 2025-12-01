//
//  FeedViewModel.swift
//  NemiAIInbox
//
//  Created by NemiAI
//

import Foundation
import Combine

@MainActor
class FeedViewModel: ObservableObject {
    @Published var emails: [Email] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedCategory: EmailCategory?
    @Published var selectedBadge: EmailBadge?
    @Published var badgeCategories: [BadgeCategoryStats] = []
    @Published var allUserBadges: [EmailBadge] = []

    private let apiService = APIService.shared
    private var cancellables = Set<AnyCancellable>()

    init() {
        Task {
            await loadEmails()
            await loadBadgeCategories()
            await loadUserBadges()
        }
    }

    func loadUserBadges() async {
        do {
            let badgeDefs = try await apiService.getUserBadgeDefinitions()
            allUserBadges = badgeDefs.map { def in
                EmailBadge(
                    name: def.badgeName,
                    color: def.badgeColor,
                    icon: def.badgeIcon,
                    importance: def.engagementScore ?? 0.5,
                    category: def.category ?? "Other"
                )
            }
            .sorted { $0.importance > $1.importance }
            print("🟢 Loaded \(allUserBadges.count) user badges from API: \(allUserBadges.map { $0.name })")
        } catch {
            print("❌ Error loading user badges: \(error)")
        }
    }

    func loadBadgeCategories() async {
        do {
            let response = try await apiService.getBadgeCategoryStats()
            badgeCategories = response.categories
            print("🟢 Loaded \(badgeCategories.count) badge categories from API")
        } catch {
            print("❌ Error loading badge categories: \(error)")
        }
    }

    func loadEmails() async {
        isLoading = true
        errorMessage = nil

        do {
            emails = try await apiService.getEmails(category: selectedCategory)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func refresh() async {
        await loadEmails()
        await loadBadgeCategories()
        await loadUserBadges()
    }

    func classifyEmails() async {
        guard !emails.isEmpty else { return }

        isLoading = true
        errorMessage = nil

        let emailIds = emails.map { $0.id }

        do {
            _ = try await apiService.classifyEmails(emailIds: emailIds)
            await loadEmails()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // Get unique badges from currently displayed emails
    var uniqueBadges: [EmailBadge] {
        var badgeMap: [String: EmailBadge] = [:]

        // Extract badges from current emails
        for email in emails {
            if let badges = email.badges {
                for badge in badges {
                    badgeMap[badge.name] = badge
                }
            }
        }

        let result = Array(badgeMap.values).sorted { $0.importance > $1.importance }
        print("📊 uniqueBadges from emails: \(result.count), names: \(result.map { $0.name })")
        return result
    }

    // Group badges by category
    var badgesByCategory: [String: [EmailBadge]] {
        let badges = uniqueBadges
        return Dictionary(grouping: badges) { $0.category }
    }

    // Convert API badge categories to format expected by CategoryBadgeSelector
    var categories: [(name: String, count: Int, badges: [EmailBadge])] {
        // Group actual badges from emails by category
        let badgesByCategoryDict = badgesByCategory

        return badgeCategories.map { category in
            let categoryBadges = badgesByCategoryDict[category.name] ?? []
            return (name: category.name, count: category.emailCount, badges: categoryBadges)
        }
    }

    // Filter emails by selected badge
    var filteredEmails: [Email] {
        guard let selectedBadge = selectedBadge else {
            return emails
        }

        return emails.filter { email in
            email.badges?.contains(where: { $0.name == selectedBadge.name }) ?? false
        }
    }

    var groupedEmails: [EmailGroup] {
        let calendar = Calendar.current
        let emailsToGroup = filteredEmails

        var groups: [String: [Email]] = [:]

        for email in emailsToGroup {
            let groupKey: String
            if calendar.isDateInToday(email.receivedAt) {
                groupKey = "Today"
            } else if calendar.isDateInYesterday(email.receivedAt) {
                groupKey = "Yesterday"
            } else {
                let formatter = DateFormatter()
                formatter.dateFormat = "MMMM d, yyyy"
                groupKey = formatter.string(from: email.receivedAt)
            }

            if groups[groupKey] != nil {
                groups[groupKey]?.append(email)
            } else {
                groups[groupKey] = [email]
            }
        }

        return groups.map { EmailGroup(title: $0.key, emails: $0.value) }
            .sorted { group1, group2 in
                if group1.title == "Today" { return true }
                if group2.title == "Today" { return false }
                if group1.title == "Yesterday" { return true }
                if group2.title == "Yesterday" { return false }
                return group1.title > group2.title
            }
    }
}

struct EmailGroup: Identifiable {
    let id = UUID()
    let title: String
    let emails: [Email]
}
