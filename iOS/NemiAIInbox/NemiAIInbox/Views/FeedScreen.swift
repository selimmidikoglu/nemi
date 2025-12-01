//
//  FeedScreen.swift
//  NemiAIInbox
//
//  Created by NemiAI
//

import SwiftUI
import Combine

struct FeedScreen: View {
    @StateObject private var viewModel = FeedViewModel()
    @State private var showingSidebar = false
    @State private var selectedEmail: Email?
    @State private var showingSettings = false
    @State private var showingBadgeManagement = false
    @State private var badgeDisplayMode: BadgeDisplayMode = .horizontal
    @State private var accountStats: EmailAccountStats?
    @State private var isCheckingSync = false

    // Timer to check sync status every 5 seconds
    let timer = Timer.publish(every: 5, on: .main, in: .common).autoconnect()

    enum BadgeDisplayMode {
        case horizontal
        case bottom
    }

    var body: some View {
        NavigationView {
            ZStack {
                VStack(spacing: 0) {
                    // Filter area - show selected badge indicator
                    if !viewModel.categories.isEmpty {
                        HStack(alignment: .center, spacing: 12) {
                            Spacer()

                            // Show selected badge indicator
                            if let selectedBadge = viewModel.selectedBadge {
                                SelectedBadgeIndicator(badge: selectedBadge, onDismiss: {
                                    withAnimation {
                                        viewModel.selectedBadge = nil
                                    }
                                })
                                .transition(.scale.combined(with: .opacity))
                            }

                            Spacer()
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)

                        Divider()
                    }

                    if viewModel.isLoading && viewModel.emails.isEmpty {
                        ProgressView()
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if viewModel.emails.isEmpty {
                        EmptyStateView(accountStats: accountStats)
                    } else {
                        EmailListView(
                            emailGroups: viewModel.groupedEmails,
                            selectedEmail: $selectedEmail,
                            badgeDisplayMode: badgeDisplayMode
                        )
                        .refreshable {
                            await viewModel.refresh()
                        }
                    }
                }

                // Badge selector with toggle (on top of everything)
                if !viewModel.emails.isEmpty {
                    VStack {
                        HStack(spacing: 12) {
                            // Expandable badge selector button
                            ExpandingBadgeSelector(
                                badges: viewModel.uniqueBadges.isEmpty ?
                                    [EmailBadge(name: "All", color: "#007AFF", icon: "tray.fill", importance: 1.0, category: "System")] :
                                    viewModel.uniqueBadges,
                                selectedBadge: $viewModel.selectedBadge
                            )

                            Spacer()

                            // Toggle button for display mode
                            Button(action: {
                                withAnimation {
                                    badgeDisplayMode = badgeDisplayMode == .horizontal ? .bottom : .horizontal
                                }
                            }) {
                                Image(systemName: badgeDisplayMode == .horizontal
                                    ? "rectangle.grid.1x2"
                                    : "square.grid.3x2")
                                    .font(.title3)
                                    .foregroundColor(.primary)
                                    .padding(8)
                                    .background(Color(.systemGray6))
                                    .cornerRadius(8)
                            }

                            // Badge management button
                            Button(action: {
                                showingBadgeManagement = true
                            }) {
                                Image(systemName: "slider.horizontal.3")
                                    .font(.title3)
                                    .foregroundColor(.primary)
                                    .padding(8)
                                    .background(Color(.systemGray6))
                                    .cornerRadius(8)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 12)

                        Spacer()
                    }
                    .zIndex(999)
                }

                if showingSidebar {
                    Color.black.opacity(0.3)
                        .ignoresSafeArea()
                        .onTapGesture {
                            withAnimation {
                                showingSidebar = false
                            }
                        }

                    SidebarMenu(isShowing: $showingSidebar)
                        .transition(.move(edge: .leading))
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: {
                        withAnimation {
                            showingSidebar.toggle()
                        }
                    }) {
                        Image(systemName: "line.3.horizontal")
                            .font(.title2)
                            .foregroundColor(.primary)
                    }
                }

                ToolbarItem(placement: .principal) {
                    Text("📧 MY INBOX")
                        .font(.headline)
                        .bold()
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingSettings = true
                    }) {
                        Image(systemName: "gearshape.fill")
                            .font(.title3)
                            .foregroundColor(.primary)
                    }
                }
            }
            .sheet(item: $selectedEmail) { email in
                EmailDetailScreen(email: email)
            }
            .sheet(isPresented: $showingSettings) {
                SettingsScreen()
            }
            .sheet(isPresented: $showingBadgeManagement) {
                BadgeManagementScreen()
            }
            .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
                Button("OK") {
                    viewModel.errorMessage = nil
                }
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
        }
        .task {
            await viewModel.loadEmails()
            await checkSyncStatus()
        }
        .onReceive(timer) { _ in
            // Don't auto-refresh when Settings is showing
            guard !showingSettings else { return }

            // Auto-refresh if there are no emails or if syncing
            if viewModel.emails.isEmpty || (accountStats?.pendingEmails ?? 0) > 0 {
                Task {
                    await checkSyncStatus()
                    if viewModel.emails.isEmpty {
                        await viewModel.loadEmails()
                    }
                }
            }
        }
    }

    private func checkSyncStatus() async {
        guard !isCheckingSync else { return }
        isCheckingSync = true
        defer { isCheckingSync = false }

        do {
            // Get first email account stats
            let accounts = try await APIService.shared.getEmailAccounts()
            if let firstAccount = accounts.first {
                accountStats = try? await APIService.shared.getAccountStats(accountId: firstAccount.id)
            }
        } catch {
            // Silently fail - not critical
        }
    }
}

// MARK: - Category Filter View

struct CategoryFilterView: View {
    @Binding var selectedCategory: EmailCategory?
    let onRefresh: () -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                CategoryChip(
                    title: "All",
                    icon: "tray.fill",
                    isSelected: selectedCategory == nil,
                    action: { selectedCategory = nil; onRefresh() }
                )

                ForEach(EmailCategory.allCases, id: \.self) { category in
                    CategoryChip(
                        title: category.rawValue,
                        icon: category.icon,
                        color: category.color,
                        isSelected: selectedCategory == category,
                        action: { selectedCategory = category; onRefresh() }
                    )
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
        }
        .background(Color(.systemBackground))
    }
}

struct CategoryChip: View {
    let title: String
    let icon: String
    var color: Color = .blue
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(isSelected ? color : Color(.systemGray6))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(20)
        }
    }
}

// MARK: - Email List View

struct EmailListView: View {
    let emailGroups: [EmailGroup]
    @Binding var selectedEmail: Email?
    var badgeDisplayMode: FeedScreen.BadgeDisplayMode = .horizontal

    var body: some View {
        List {
            // Add top spacing to push content below badge selector
            Color.clear
                .frame(height: 60)
                .listRowInsets(EdgeInsets())
                .listRowSeparator(.hidden)

            ForEach(emailGroups) { group in
                Section(header: Text(group.title).font(.subheadline).fontWeight(.semibold)) {
                    ForEach(group.emails) { email in
                        EmailRowView(email: email, badgeDisplayMode: badgeDisplayMode)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                selectedEmail = email
                            }
                    }
                }
            }
        }
        .listStyle(.plain)
    }
}

// MARK: - Email Row View

struct EmailRowView: View {
    let email: Email
    var badgeDisplayMode: FeedScreen.BadgeDisplayMode = .horizontal

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(email.from.name ?? email.from.email)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)

                Spacer()

                // Unread indicator dot
                if !email.isRead {
                    Circle()
                        .fill(Color.blue)
                        .frame(width: 8, height: 8)
                }

                Text(email.receivedAt.timeAgo)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Text(email.subject)
                .font(.body)
                .foregroundColor(email.isRead ? .secondary : .primary)
                .lineLimit(1)

            if let summary = email.aiSummary {
                HStack(spacing: 6) {
                    Image(systemName: "sparkles")
                        .font(.caption)
                        .foregroundColor(.blue)

                    Text(summary)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                .padding(8)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(8)
            }

            // Badge display based on mode
            if badgeDisplayMode == .horizontal {
                HStack(spacing: 8) {
                    // Show AI-generated badges if available, otherwise show default badges
                    if let badges = email.badges, !badges.isEmpty {
                        ForEach(badges.prefix(3)) { badge in
                            AIBadgeView(badge: badge)
                        }
                    } else {
                        CategoryBadge(category: email.category)

                        if email.isPersonallyRelevant {
                            PersonalBadge()
                        }

                        ImportanceBadge(importance: email.importance)
                    }

                    Spacer()

                    if email.hasAttachments {
                        Image(systemName: "paperclip")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            } else {
                // Bottom mode - badges with flex wrap
                FlexWrapView(spacing: 6) {
                    if let badges = email.badges, !badges.isEmpty {
                        ForEach(badges.prefix(5)) { badge in
                            AIBadgeView(badge: badge)
                        }
                    } else {
                        CategoryBadge(category: email.category)
                        if email.isPersonallyRelevant {
                            PersonalBadge()
                        }
                        ImportanceBadge(importance: email.importance)
                    }
                }

                if email.hasAttachments {
                    HStack {
                        Spacer()
                        Image(systemName: "paperclip")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Badges

struct CategoryBadge: View {
    let category: EmailCategory

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: category.icon)
                .font(.system(size: 10))
            Text(category.rawValue)
                .font(.caption2)
                .fontWeight(.medium)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(category.color.opacity(0.2))
        .foregroundColor(category.color)
        .cornerRadius(6)
    }
}

struct PersonalBadge: View {
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "person.fill")
                .font(.system(size: 10))
            Text("Me")
                .font(.caption2)
                .fontWeight(.medium)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.purple.opacity(0.2))
        .foregroundColor(.purple)
        .cornerRadius(6)
    }
}

struct AIBadgeView: View {
    let badge: EmailBadge

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: mapIconName(badge.icon))
                .font(.system(size: 10))
                .foregroundColor(badge.swiftUIColor)
            Text(badge.name)
                .font(.caption2)
                .fontWeight(.medium)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(badge.swiftUIColor.opacity(0.15))
        .foregroundColor(badge.swiftUIColor)
        .cornerRadius(6)
    }

    private func mapIconName(_ icon: String) -> String {
        // Map backend icon names to SF Symbols
        switch icon.lowercased() {
        case "warning", "alarm", "alert": return "exclamationmark.triangle.fill"
        case "calendar", "event": return "calendar"
        case "money", "attach_money", "credit_card": return "dollarsign.circle.fill"
        case "work", "briefcase": return "briefcase.fill"
        case "person", "people": return "person.fill"
        case "mail", "email": return "envelope.fill"
        case "attachment", "paperclip": return "paperclip"
        case "link", "url": return "link"
        case "check", "check_circle": return "checkmark.circle.fill"
        case "clock", "time": return "clock.fill"
        case "plane", "flight": return "airplane"
        case "cart", "shopping": return "cart.fill"
        case "ticket": return "ticket.fill"
        case "document": return "doc.fill"
        case "star": return "star.fill"
        case "github": return "curlybraces" // Better GitHub/code icon
        case "code", "code-branch": return "chevron.left.forwardslash.chevron.right"
        case "slack": return "bubble.left.and.bubble.right.fill"
        case "chat": return "bubble.left.fill"
        case "book": return "book.fill"
        case "tag": return "tag.fill"
        case "bell": return "bell.fill"
        case "school": return "graduationcap.fill"
        case "developer_board": return "laptopcomputer"
        case "currency_bitcoin": return "bitcoinsign.circle.fill"
        case "list": return "list.bullet"
        default: return "tag.fill"
        }
    }
}

struct ImportanceBadge: View {
    let importance: ImportanceLevel

    var body: some View {
        if importance != .normal {
            HStack(spacing: 4) {
                Image(systemName: importance == .high ? "exclamationmark.circle.fill" : "arrow.down.circle.fill")
                    .font(.system(size: 10))
                Text(importance.rawValue.capitalized)
                    .font(.caption2)
                    .fontWeight(.medium)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(importance == .high ? Color.red.opacity(0.2) : Color.gray.opacity(0.2))
            .foregroundColor(importance == .high ? .red : .gray)
            .cornerRadius(6)
        }
    }
}

// MARK: - Empty State View

struct EmptyStateView: View {
    let accountStats: EmailAccountStats?
    @State private var showingAddEmailAccount = false

    private var isSyncing: Bool {
        guard let stats = accountStats else { return false }
        return stats.totalEmails > 0 && stats.analyzedEmails < stats.totalEmails
    }

    private var hasAccount: Bool {
        accountStats != nil
    }

    var body: some View {
        VStack(spacing: 24) {
            // Icon
            if isSyncing {
                Image(systemName: "arrow.triangle.2.circlepath")
                    .font(.system(size: 64))
                    .foregroundColor(.blue)
                    .symbolEffect(.pulse)
            } else {
                Image(systemName: hasAccount ? "tray" : "envelope.badge.shield.half.filled")
                    .font(.system(size: 64))
                    .foregroundColor(.secondary)
            }

            // Title
            Text(isSyncing ? "Syncing Emails..." : (hasAccount ? "Inbox Empty" : "No Emails Yet"))
                .font(.title2)
                .fontWeight(.bold)

            // Description
            if isSyncing {
                VStack(spacing: 12) {
                    Text("Fetching and analyzing your emails")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)

                    if let stats = accountStats {
                        HStack(spacing: 8) {
                            Image(systemName: "envelope.fill")
                                .font(.caption)
                                .foregroundColor(.blue)
                            Text("\(stats.totalEmails) emails fetched")
                                .font(.caption)
                                .foregroundColor(.secondary)

                            if stats.analyzedEmails > 0 {
                                Divider()
                                    .frame(height: 12)

                                Image(systemName: "brain")
                                    .font(.caption)
                                    .foregroundColor(.orange)
                                Text("\(stats.analyzedEmails) analyzed")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }

                        // Progress bar
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.gray.opacity(0.2))
                                    .frame(height: 8)

                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.blue)
                                    .frame(
                                        width: geometry.size.width * (Double(stats.analyzedEmails) / Double(stats.totalEmails)),
                                        height: 8
                                    )
                            }
                        }
                        .frame(height: 8)
                        .frame(maxWidth: 200)
                    }

                    Text("Your emails will appear here shortly")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.top, 4)
                }
            } else {
                Text(hasAccount ? "All caught up!\nNo new emails" : "Add your email accounts to start\nreceiving and managing emails")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }

            // Action button (only if no account)
            if !hasAccount {
                Button(action: {
                    showingAddEmailAccount = true
                }) {
                    Label("Add Email Account", systemImage: "plus.circle.fill")
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(Color.blue)
                        .cornerRadius(12)
                }
                .padding(.top, 8)
            }
        }
        .padding(.horizontal, 40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .sheet(isPresented: $showingAddEmailAccount) {
            AddEmailAccountScreen()
        }
    }
}

// MARK: - Selected Badge Indicator

struct SelectedBadgeIndicator: View {
    let badge: EmailBadge
    let onDismiss: () -> Void

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: mapIconName(badge.icon))
                .font(.system(size: 12, weight: .semibold))

            Text(badge.name)
                .font(.system(size: 14, weight: .semibold))

            Button(action: onDismiss) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.8))
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(badge.swiftUIColor)
        .foregroundColor(.white)
        .cornerRadius(20)
    }

    private func mapIconName(_ icon: String) -> String {
        switch icon.lowercased() {
        case "warning", "alarm", "alert": return "exclamationmark.triangle.fill"
        case "calendar", "event": return "calendar"
        case "money", "attach_money", "credit_card": return "dollarsign.circle.fill"
        case "work", "briefcase": return "briefcase.fill"
        case "github": return "curlybraces" // Better GitHub/code icon
        case "code", "code-branch": return "chevron.left.forwardslash.chevron.right"
        case "chat": return "bubble.left.fill"
        case "person", "user": return "person.fill"
        case "mail", "email": return "envelope.fill"
        case "attachment", "paperclip": return "paperclip"
        case "link", "url": return "link"
        case "check", "checkmark": return "checkmark.circle.fill"
        case "clock", "time": return "clock.fill"
        case "plane", "flight": return "airplane"
        case "cart", "shopping": return "cart.fill"
        case "ticket": return "ticket.fill"
        case "document", "file": return "doc.fill"
        case "star", "favorite": return "star.fill"
        case "security", "lock": return "lock.fill"
        default: return "tag.fill"
        }
    }
}

// MARK: - Date Extension

// MARK: - Flex Wrap View

struct FlexWrapView<Content: View>: View {
    let spacing: CGFloat
    let content: () -> Content

    @State private var totalHeight: CGFloat = 0

    init(spacing: CGFloat = 8, @ViewBuilder content: @escaping () -> Content) {
        self.spacing = spacing
        self.content = content
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            GeometryReader { geometry in
                self.generateContent(in: geometry)
            }
        }
        .frame(height: totalHeight)
    }

    private func generateContent(in geometry: GeometryProxy) -> some View {
        var width: CGFloat = 0
        var height: CGFloat = 0
        var lastHeight: CGFloat = 0

        return ZStack(alignment: .topLeading) {
            content()
                .alignmentGuide(.leading) { dimension in
                    if abs(width - dimension.width) > geometry.size.width {
                        width = 0
                        height -= lastHeight + spacing
                    }

                    let result = width

                    if dimension.width == 0 {
                        width = 0
                    } else {
                        width -= dimension.width + spacing
                    }

                    lastHeight = dimension.height

                    return result
                }
                .alignmentGuide(.top) { _ in
                    let result = height

                    if width == 0 {
                        height = 0
                    }

                    return result
                }
        }
        .background(viewHeightReader($totalHeight))
    }

    private func viewHeightReader(_ binding: Binding<CGFloat>) -> some View {
        return GeometryReader { geometry -> Color in
            let rect = geometry.frame(in: .local)
            DispatchQueue.main.async {
                binding.wrappedValue = rect.size.height
            }
            return .clear
        }
    }
}

// MARK: - Date Extension

extension Date {
    var timeAgo: String {
        let calendar = Calendar.current
        let now = Date()

        if calendar.isDateInToday(self) {
            let components = calendar.dateComponents([.hour, .minute], from: self, to: now)
            if let hours = components.hour, hours > 0 {
                return "\(hours)h ago"
            }
            if let minutes = components.minute, minutes > 0 {
                return "\(minutes)m ago"
            }
            return "Just now"
        } else if calendar.isDateInYesterday(self) {
            return "Yesterday"
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "MMM d"
            return formatter.string(from: self)
        }
    }
}
