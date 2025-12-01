//
//  SettingsScreen.swift
//  NemiAIInbox
//
//  Created by NemiAI
//

import SwiftUI
import Combine

struct SettingsScreen: View {
    @Environment(\.dismiss) var dismiss
    @State private var showingAddEmailAccount = false
    @State private var showingConfigurations = false
    @State private var showingSecurityPrivacy = false
    @State private var showingTermsServices = false
    @State private var showingAbout = false
    @State private var showingAccountsList = false
    @State private var accounts: [EmailAccountInfo] = []
    @State private var isLoadingAccounts = false
    @State private var hasLoadedAccounts = false

    var body: some View {
        NavigationView {
            List {
                // Account Section
                Section {
                    Button(action: {
                        showingAccountsList = true
                    }) {
                        HStack(spacing: 12) {
                            Image(systemName: "envelope.circle.fill")
                                .font(.title2)
                                .foregroundColor(.blue)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Email Accounts")
                                    .font(.body)
                                    .fontWeight(.medium)
                                    .foregroundColor(.primary)

                                Text("Manage connected accounts")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 4)
                    }

                    Button(action: {
                        showingAddEmailAccount = true
                    }) {
                        HStack(spacing: 12) {
                            Image(systemName: "plus.circle.fill")
                                .font(.title2)
                                .foregroundColor(.green)

                            Text("Add Email Account")
                                .font(.body)
                                .fontWeight(.medium)
                                .foregroundColor(.primary)
                        }
                        .padding(.vertical, 4)
                    }
                } header: {
                    Text("Accounts")
                }

                // Preferences Section
                Section {
                    Button(action: {
                        showingConfigurations = true
                    }) {
                        HStack(spacing: 12) {
                            Image(systemName: "gearshape.fill")
                                .font(.title2)
                                .foregroundColor(.orange)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Configurations")
                                    .font(.body)
                                    .fontWeight(.medium)
                                    .foregroundColor(.primary)

                                Text("Sync, notifications, and auto-delete")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    }

                    NavigationLink(destination: NotificationsScreen()) {
                        HStack(spacing: 12) {
                            Image(systemName: "bell.circle.fill")
                                .font(.title2)
                                .foregroundColor(.red)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Notifications")
                                    .font(.body)
                                    .fontWeight(.medium)

                                Text("Push notification preferences")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                } header: {
                    Text("Preferences")
                }

                // Privacy & Security Section
                Section {
                    Button(action: {
                        showingSecurityPrivacy = true
                    }) {
                        HStack(spacing: 12) {
                            Image(systemName: "lock.shield.fill")
                                .font(.title2)
                                .foregroundColor(.purple)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Security & Privacy")
                                    .font(.body)
                                    .fontWeight(.medium)
                                    .foregroundColor(.primary)

                                Text("Data protection and privacy settings")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                } header: {
                    Text("Privacy & Security")
                }

                // About Section
                Section {
                    Button(action: {
                        showingTermsServices = true
                    }) {
                        HStack(spacing: 12) {
                            Image(systemName: "doc.text.fill")
                                .font(.title2)
                                .foregroundColor(.indigo)

                            Text("Terms & Services")
                                .font(.body)
                                .fontWeight(.medium)
                                .foregroundColor(.primary)
                        }
                        .padding(.vertical, 4)
                    }

                    Button(action: {
                        showingAbout = true
                    }) {
                        HStack(spacing: 12) {
                            Image(systemName: "info.circle.fill")
                                .font(.title2)
                                .foregroundColor(.cyan)

                            Text("About")
                                .font(.body)
                                .fontWeight(.medium)
                                .foregroundColor(.primary)
                        }
                        .padding(.vertical, 4)
                    }

                    HStack(spacing: 12) {
                        Image(systemName: "app.badge")
                            .font(.title2)
                            .foregroundColor(.gray)

                        VStack(alignment: .leading, spacing: 4) {
                            Text("Version")
                                .font(.body)
                                .fontWeight(.medium)

                            Text("1.0.0 (Build 1)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("About")
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showingAddEmailAccount) {
                AddEmailAccountScreen()
                    .onDisappear {
                        // Reload accounts after adding new account
                        Task {
                            await loadAccounts()
                        }
                    }
            }
            .sheet(isPresented: $showingConfigurations) {
                ConfigurationsScreen()
            }
            .sheet(isPresented: $showingSecurityPrivacy) {
                SecurityPrivacyScreen()
            }
            .sheet(isPresented: $showingTermsServices) {
                TermsServicesScreen()
            }
            .sheet(isPresented: $showingAbout) {
                AboutScreen()
            }
            .navigationDestination(isPresented: $showingAccountsList) {
                AccountsListScreen(accounts: $accounts, onReload: loadAccounts)
            }
        }
        .task {
            guard !hasLoadedAccounts else { return }
            await loadAccounts()
            hasLoadedAccounts = true
        }
    }

    private func loadAccounts() async {
        guard !isLoadingAccounts else { return }
        isLoadingAccounts = true
        defer { isLoadingAccounts = false }

        do {
            let apiAccounts = try await APIService.shared.getEmailAccounts()
            var accountInfos: [EmailAccountInfo] = []

            for apiAccount in apiAccounts {
                let stats = try? await APIService.shared.getAccountStats(accountId: apiAccount.id)
                let info = EmailAccountInfo(
                    id: apiAccount.id,
                    email: apiAccount.emailAddress,
                    provider: apiAccount.provider,
                    isActive: apiAccount.syncEnabled,
                    totalEmails: stats?.totalEmails ?? 0,
                    analyzedEmails: stats?.analyzedEmails ?? 0,
                    lastSyncAt: apiAccount.lastSyncAt
                )
                accountInfos.append(info)
            }

            accounts = accountInfos
        } catch {
            print("Error loading accounts in Settings: \(error.localizedDescription)")
            accounts = []
        }
    }
}

// MARK: - Accounts List Screen

struct AccountsListScreen: View {
    @Binding var accounts: [EmailAccountInfo]
    let onReload: () async -> Void
    @State private var showingAddAccount = false
    @State private var viewId = UUID()

    // Timer to refresh stats every 10 seconds while analyzing
    let timer = Timer.publish(every: 10, on: .main, in: .common).autoconnect()

    init(accounts: Binding<[EmailAccountInfo]>, onReload: @escaping () async -> Void) {
        self._accounts = accounts
        self.onReload = onReload
        print("🔵 AccountsListScreen INIT called - accounts count: \(accounts.wrappedValue.count)")
    }

    var body: some View {
        List {
            if accounts.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "envelope.open")
                        .font(.system(size: 48))
                        .foregroundColor(.secondary)

                    Text("No Email Accounts")
                        .font(.headline)
                        .foregroundColor(.secondary)

                    Text("Add an email account to get started")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Button(action: {
                        showingAddAccount = true
                    }) {
                        Text("Add Account")
                            .font(.body)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                            .background(Color.blue)
                            .cornerRadius(12)
                    }
                }
                .frame(maxWidth: .infinity)
                .listRowBackground(Color.clear)
            } else {
                ForEach(accounts) { account in
                    AccountRow(account: account)
                }
                .onDelete(perform: deleteAccounts)
            }
        }
        .id(viewId)
        .refreshable {
            await onReload()
        }
        .navigationTitle("Email Accounts")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: {
                    print("🟢 Add Account button tapped, setting showingAddAccount = true")
                    showingAddAccount = true
                    print("🟢 showingAddAccount is now: \(showingAddAccount)")
                }) {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showingAddAccount) {
            print("🟡 Sheet content being created")
            return AddEmailAccountScreen()
                .onAppear {
                    print("🟢 AddEmailAccountScreen appeared")
                }
                .onDisappear {
                    print("🔴 AddEmailAccountScreen disappeared")
                    // Reload accounts when sheet is dismissed
                    Task {
                        await onReload()
                    }
                }
        }
        .onReceive(timer) { _ in
            print("⏰ Timer fired in AccountsListScreen, showingAddAccount: \(showingAddAccount)")

            // Don't auto-refresh when Add Account sheet is showing
            guard !showingAddAccount else {
                print("⏰ Skipping reload because sheet is showing")
                return
            }

            // Auto-refresh if any account is analyzing
            if accounts.contains(where: { $0.isAnalyzing }) {
                print("⏰ Calling onReload because accounts are analyzing")
                Task {
                    await onReload()
                }
            } else {
                print("⏰ No accounts analyzing, skipping reload")
            }
        }
    }

    private func deleteAccounts(at offsets: IndexSet) {
        Task {
            for index in offsets {
                let account = accounts[index]
                do {
                    try await APIService.shared.deleteEmailAccount(accountId: account.id)
                } catch {
                    print("Error deleting account: \(error.localizedDescription)")
                }
            }
            // Reload accounts from parent after deletion
            await onReload()
        }
    }
}

struct AccountRow: View {
    let account: EmailAccountInfo

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 12) {
                Circle()
                    .fill(LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(width: 40, height: 40)
                    .overlay(
                        Image(systemName: "envelope.fill")
                            .foregroundColor(.white)
                            .font(.caption)
                    )

                VStack(alignment: .leading, spacing: 4) {
                    Text(account.email)
                        .font(.body)
                        .fontWeight(.medium)

                    HStack(spacing: 8) {
                        Text(account.provider)
                            .font(.caption)
                            .foregroundColor(.secondary)

                        if account.isAnalyzing {
                            HStack(spacing: 4) {
                                Image(systemName: "brain")
                                    .font(.caption2)
                                    .foregroundColor(.orange)

                                Text("AI Analyzing (\(account.analyzedEmails)/\(account.totalEmails))")
                                    .font(.caption2)
                                    .foregroundColor(.orange)
                            }
                        } else if account.totalEmails > 0 {
                            HStack(spacing: 4) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.caption2)
                                    .foregroundColor(.green)

                                Text("\(account.totalEmails) emails analyzed")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }

                Spacer()

                Circle()
                    .fill(account.isActive ? Color.green : Color.gray)
                    .frame(width: 8, height: 8)
            }

            // Progress bar when analyzing
            if account.isAnalyzing {
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.gray.opacity(0.2))
                            .frame(height: 4)

                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.orange)
                            .frame(width: geometry.size.width * account.analysisProgress, height: 4)
                    }
                }
                .frame(height: 4)
            }
        }
        .padding(.vertical, 4)
    }
}

struct EmailAccountInfo: Identifiable {
    let id: String
    let email: String
    let provider: String
    let isActive: Bool
    let totalEmails: Int
    let analyzedEmails: Int
    let lastSyncAt: Date?

    var isAnalyzing: Bool {
        totalEmails > 0 && analyzedEmails < totalEmails
    }

    var analysisProgress: Double {
        guard totalEmails > 0 else { return 0 }
        return Double(analyzedEmails) / Double(totalEmails)
    }
}

// MARK: - Configurations Screen

struct ConfigurationsScreen: View {
    @Environment(\.dismiss) var dismiss
    @AppStorage("emailSyncTimeout") private var syncTimeout: Int = 300
    @AppStorage("autoDeleteEnabled") private var autoDeleteEnabled = false
    @AppStorage("autoDeleteDays") private var autoDeleteDays: Int = 30
    @AppStorage("autoDeleteUnreadOnly") private var autoDeleteUnreadOnly = true

    var body: some View {
        NavigationView {
            Form {
                Section {
                    HStack {
                        Text("Sync Interval")
                        Spacer()
                        Picker("", selection: $syncTimeout) {
                            Text("1 min").tag(60)
                            Text("5 min").tag(300)
                            Text("15 min").tag(900)
                            Text("30 min").tag(1800)
                            Text("1 hour").tag(3600)
                        }
                        .pickerStyle(.menu)
                    }

                    Text("How often to check for new emails")
                        .font(.caption)
                        .foregroundColor(.secondary)
                } header: {
                    Text("Email Sync")
                } footer: {
                    Text("More frequent syncing uses more battery")
                }

                Section {
                    Toggle("Enable Auto-Delete", isOn: $autoDeleteEnabled)

                    if autoDeleteEnabled {
                        HStack {
                            Text("Delete After")
                            Spacer()
                            Picker("", selection: $autoDeleteDays) {
                                Text("7 days").tag(7)
                                Text("14 days").tag(14)
                                Text("30 days").tag(30)
                                Text("60 days").tag(60)
                                Text("90 days").tag(90)
                            }
                            .pickerStyle(.menu)
                        }

                        Toggle("Unread Emails Only", isOn: $autoDeleteUnreadOnly)

                        Text(autoDeleteUnreadOnly
                            ? "Only delete emails that have never been opened"
                            : "Delete all emails older than the specified period")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                } header: {
                    Text("Auto-Delete Old Emails")
                } footer: {
                    Text("Automatically remove old emails to save storage")
                }
            }
            .navigationTitle("Configurations")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Notifications Screen

struct NotificationsScreen: View {
    @AppStorage("notificationsEnabled") private var notificationsEnabled = true
    @AppStorage("notifyMeRelated") private var notifyMeRelated = true
    @AppStorage("notifyWork") private var notifyWork = true
    @AppStorage("notifyPersonal") private var notifyPersonal = false
    @AppStorage("notifyFinancial") private var notifyFinancial = true

    var body: some View {
        Form {
            Section {
                Toggle("Enable Notifications", isOn: $notificationsEnabled)
            } footer: {
                Text("Allow NemiAI Inbox to send you push notifications")
            }

            if notificationsEnabled {
                Section {
                    Toggle("Me-Related Emails", isOn: $notifyMeRelated)
                    Toggle("Work Emails", isOn: $notifyWork)
                    Toggle("Personal Emails", isOn: $notifyPersonal)
                    Toggle("Financial Emails", isOn: $notifyFinancial)
                } header: {
                    Text("Notify Me About")
                } footer: {
                    Text("Choose which categories trigger notifications")
                }
            }
        }
        .navigationTitle("Notifications")
    }
}

// MARK: - Security & Privacy Screen

struct SecurityPrivacyScreen: View {
    @Environment(\.dismiss) var dismiss
    @AppStorage("biometricEnabled") private var biometricEnabled = false
    @AppStorage("dataCollection") private var dataCollection = true
    @AppStorage("aiAnalysis") private var aiAnalysis = true

    var body: some View {
        NavigationView {
            Form {
                Section {
                    Toggle("Biometric Lock", isOn: $biometricEnabled)

                    Text("Require Face ID or Touch ID to open the app")
                        .font(.caption)
                        .foregroundColor(.secondary)
                } header: {
                    Text("Security")
                }

                Section {
                    Toggle("AI Email Analysis", isOn: $aiAnalysis)

                    Text("Use AI to analyze and categorize emails. Email content is sent to secure AI servers.")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Toggle("Usage Data Collection", isOn: $dataCollection)

                    Text("Help us improve by sharing anonymous usage data")
                        .font(.caption)
                        .foregroundColor(.secondary)
                } header: {
                    Text("Privacy")
                }

                Section {
                    Button("Clear Cache") {
                        // TODO: Implement cache clearing
                    }

                    Button("Delete All Local Data", role: .destructive) {
                        // TODO: Implement data deletion
                    }
                } header: {
                    Text("Data Management")
                }
            }
            .navigationTitle("Security & Privacy")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Terms & Services Screen

struct TermsServicesScreen: View {
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("Terms of Service")
                        .font(.title)
                        .fontWeight(.bold)

                    Group {
                        SectionHeader(title: "1. Acceptance of Terms")
                        BodyText(text: "By accessing and using NemiAI Inbox, you accept and agree to be bound by the terms and provision of this agreement.")

                        SectionHeader(title: "2. Use License")
                        BodyText(text: "Permission is granted to temporarily use NemiAI Inbox for personal, non-commercial transitory viewing only.")

                        SectionHeader(title: "3. Privacy Policy")
                        BodyText(text: "Your use of NemiAI Inbox is also governed by our Privacy Policy. Please review our Privacy Policy to understand our practices.")

                        SectionHeader(title: "4. Email Data")
                        BodyText(text: "NemiAI Inbox accesses your email data to provide AI-powered inbox management. Email content is processed securely and not shared with third parties without your consent.")

                        SectionHeader(title: "5. AI Processing")
                        BodyText(text: "Email content may be sent to AI service providers for analysis, summarization, and categorization. All data is transmitted securely.")

                        SectionHeader(title: "6. Disclaimer")
                        BodyText(text: "The app is provided 'as is'. NemiAI Inbox makes no warranties, expressed or implied, and hereby disclaims all warranties.")
                    }

                    Group {
                        SectionHeader(title: "7. Limitations")
                        BodyText(text: "In no event shall NemiAI Inbox or its suppliers be liable for any damages arising out of the use or inability to use the app.")

                        SectionHeader(title: "8. Changes to Terms")
                        BodyText(text: "NemiAI Inbox reserves the right to revise these terms of service at any time. Continued use constitutes acceptance of updated terms.")

                        SectionHeader(title: "9. Contact")
                        BodyText(text: "For questions about these Terms, please contact us at support@nemiaiinbox.com")
                    }

                    Spacer(minLength: 40)
                }
                .padding()
            }
            .navigationTitle("Terms & Services")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.headline)
            .fontWeight(.semibold)
            .padding(.top, 8)
    }
}

struct BodyText: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.body)
            .foregroundColor(.secondary)
            .fixedSize(horizontal: false, vertical: true)
    }
}

// MARK: - About Screen

struct AboutScreen: View {
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 32) {
                    // App Icon
                    Image(systemName: "envelope.badge.shield.half.filled")
                        .font(.system(size: 100))
                        .foregroundColor(.blue)
                        .padding(.top, 40)

                    VStack(spacing: 8) {
                        Text("NemiAI Inbox")
                            .font(.title)
                            .fontWeight(.bold)

                        Text("Version 1.0.0")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }

                    VStack(alignment: .leading, spacing: 16) {
                        Text("About")
                            .font(.headline)
                            .fontWeight(.semibold)

                        Text("NemiAI Inbox is an AI-powered email management application that helps you stay organized and productive. Our intelligent system analyzes your emails, categorizes them, and provides actionable insights.")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.horizontal)

                    VStack(spacing: 12) {
                        AboutLink(icon: "globe", title: "Website", url: "https://nemiaiinbox.com")
                        AboutLink(icon: "envelope", title: "Support", url: "mailto:support@nemiaiinbox.com")
                        AboutLink(icon: "bubble.left.and.bubble.right", title: "Feedback", url: "mailto:feedback@nemiaiinbox.com")
                    }
                    .padding(.horizontal)

                    Text("© 2025 NemiAI. All rights reserved.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.bottom, 40)
                }
            }
            .navigationTitle("About")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct AboutLink: View {
    let icon: String
    let title: String
    let url: String

    var body: some View {
        Button(action: {
            if let url = URL(string: url) {
                UIApplication.shared.open(url)
            }
        }) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(.blue)
                    .frame(width: 30)

                Text(title)
                    .font(.body)
                    .foregroundColor(.primary)

                Spacer()

                Image(systemName: "arrow.up.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }
}
