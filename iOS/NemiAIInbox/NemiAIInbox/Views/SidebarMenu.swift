//
//  SidebarMenu.swift
//  NemiAIInbox
//
//  Created by NemiAI
//

import SwiftUI
import Combine

struct SidebarMenu: View {
    @Binding var isShowing: Bool
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var showingSettings = false
    @State private var showingEmailAccounts = false

    var body: some View {
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                SidebarHeader(user: authViewModel.currentUser)
                    .padding()

                Divider()

                ScrollView {
                    VStack(spacing: 0) {
                        SidebarSection(title: "Mailboxes") {
                            SidebarItem(icon: "tray.fill", title: "All Inboxes", badge: nil) {
                                isShowing = false
                            }

                            SidebarItem(icon: "paperplane.fill", title: "Sent", badge: nil) {
                                isShowing = false
                            }

                            SidebarItem(icon: "doc.fill", title: "Drafts", badge: nil) {
                                isShowing = false
                            }

                            SidebarItem(icon: "trash.fill", title: "Trash", badge: nil) {
                                isShowing = false
                            }
                        }

                        Divider()

                        SidebarSection(title: "Categories") {
                            ForEach(EmailCategory.allCases, id: \.self) { category in
                                SidebarItem(
                                    icon: category.icon,
                                    title: category.rawValue,
                                    badge: nil,
                                    color: category.color
                                ) {
                                    isShowing = false
                                }
                            }
                        }

                        Divider()

                        SidebarSection(title: "Settings") {
                            SidebarItem(icon: "envelope.badge", title: "Email Accounts", badge: nil) {
                                isShowing = false
                                showingEmailAccounts = true
                            }

                            SidebarItem(icon: "gear", title: "Preferences", badge: nil) {
                                isShowing = false
                                showingSettings = true
                            }

                            SidebarItem(icon: "bell.fill", title: "Notifications", badge: nil) {
                                isShowing = false
                            }

                            SidebarItem(icon: "person.crop.circle", title: "Account", badge: nil) {
                                isShowing = false
                            }
                        }

                        Divider()

                        SidebarItem(icon: "arrow.right.square", title: "Logout", badge: nil, color: .red) {
                            authViewModel.logout()
                            isShowing = false
                        }
                        .padding(.top, 8)
                    }
                }

                Spacer()

                SidebarFooter()
                    .padding()
            }
            .frame(width: 280)
            .background(Color(.systemBackground))
            .shadow(radius: 5)

            Spacer()
        }
        .sheet(isPresented: $showingSettings) {
            SettingsView()
        }
        .sheet(isPresented: $showingEmailAccounts) {
            EmailAccountsScreen()
        }
    }
}

// MARK: - Sidebar Header

struct SidebarHeader: View {
    let user: User?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Circle()
                    .fill(LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(width: 60, height: 60)
                    .overlay(
                        Text(user?.name.prefix(1).uppercased() ?? "?")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                    )

                Spacer()
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(user?.name ?? "User")
                    .font(.title3)
                    .fontWeight(.semibold)

                Text(user?.email ?? "")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Sidebar Section

struct SidebarSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.secondary)
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 8)

            content
        }
    }
}

// MARK: - Sidebar Item

struct SidebarItem: View {
    let icon: String
    let title: String
    let badge: Int?
    var color: Color = .primary
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(color)
                    .frame(width: 24)

                Text(title)
                    .font(.body)
                    .foregroundColor(color)

                Spacer()

                if let badge = badge, badge > 0 {
                    Text("\(badge)")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.blue)
                        .cornerRadius(10)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Sidebar Footer

struct SidebarFooter: View {
    var body: some View {
        VStack(spacing: 8) {
            Divider()

            HStack {
                Text("NemiAI Inbox")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)

                Spacer()

                Text("v1.0.0")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            Text("Powered by AI")
                .font(.caption2)
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

// MARK: - Settings View

struct SettingsView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var authViewModel: AuthViewModel

    var body: some View {
        NavigationView {
            Form {
                Section("Appearance") {
                    Toggle("Dark Mode", isOn: .constant(false))
                    Picker("Theme", selection: .constant(0)) {
                        Text("System").tag(0)
                        Text("Light").tag(1)
                        Text("Dark").tag(2)
                    }
                }

                Section("AI Features") {
                    Toggle("Auto-Summarize Emails", isOn: .constant(true))
                    Toggle("Smart Categorization", isOn: .constant(true))
                    Toggle("Personal Relevance Detection", isOn: .constant(true))
                }

                Section("Notifications") {
                    Toggle("Push Notifications", isOn: .constant(true))
                    Toggle("Email Previews", isOn: .constant(true))
                    Picker("Notification Sound", selection: .constant(0)) {
                        Text("Default").tag(0)
                        Text("Chime").tag(1)
                        Text("Bell").tag(2)
                    }
                }

                Section("Email Provider") {
                    if let user = authViewModel.currentUser {
                        HStack {
                            Text("Provider")
                            Spacer()
                            Text(user.emailProvider.rawValue)
                                .foregroundColor(.secondary)
                        }

                        HStack {
                            Text("Email")
                            Spacer()
                            Text(user.email)
                                .foregroundColor(.secondary)
                        }
                    }

                    Button("Reconnect Email Account") {
                        // Reconnect email account
                    }
                    .foregroundColor(.blue)
                }

                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }

                    Button("Privacy Policy") {
                        // Open privacy policy
                    }

                    Button("Terms of Service") {
                        // Open terms
                    }
                }

                Section {
                    Button("Logout") {
                        authViewModel.logout()
                        dismiss()
                    }
                    .foregroundColor(.red)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}
