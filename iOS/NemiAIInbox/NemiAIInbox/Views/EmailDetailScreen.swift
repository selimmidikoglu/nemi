//
//  EmailDetailScreen.swift
//  NemiAIInbox
//
//  Created by NemiAI
//

import SwiftUI

struct EmailDetailScreen: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var authViewModel: AuthViewModel
    let email: Email
    @State private var showingActionSheet = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    EmailDetailHeader(email: email)
                        .padding()

                    Divider()

                    if let summary = email.aiSummary {
                        AISummarySection(summary: summary)
                            .padding(.horizontal)
                    }

                    EmailMetadataSection(email: email)
                        .padding(.horizontal)

                    Divider()

                    EmailBodySection(email: email, userId: authViewModel.currentUser?.id)
                        .padding()

                    if email.hasAttachments, !email.attachments.isEmpty {
                        AttachmentsSection(attachments: email.attachments)
                            .padding(.horizontal)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingActionSheet = true
                    }) {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .confirmationDialog("Email Actions", isPresented: $showingActionSheet) {
                Button("Reply") {
                    // Handle reply
                }

                Button("Forward") {
                    // Handle forward
                }

                Button("Mark as Unread") {
                    // Handle mark as unread
                }

                Button("Move to Trash", role: .destructive) {
                    // Handle delete
                    dismiss()
                }

                Button("Cancel", role: .cancel) { }
            }
            .onAppear {
                // Track email opened
                if let userId = authViewModel.currentUser?.id {
                    AnalyticsService.shared.trackEmailOpened(emailId: email.id, userId: userId)
                }
            }
            .onDisappear {
                // Track email closed
                if let userId = authViewModel.currentUser?.id {
                    AnalyticsService.shared.trackEmailClosed(emailId: email.id, userId: userId)
                }
            }
        }
    }
}

// MARK: - Email Detail Header

struct EmailDetailHeader: View {
    let email: Email

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(email.subject)
                .font(.title2)
                .fontWeight(.bold)

            HStack(spacing: 12) {
                Circle()
                    .fill(LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(width: 50, height: 50)
                    .overlay(
                        Text(email.from.name?.prefix(1).uppercased() ?? email.from.email.prefix(1).uppercased())
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                    )

                VStack(alignment: .leading, spacing: 4) {
                    Text(email.from.name ?? email.from.email)
                        .font(.body)
                        .fontWeight(.semibold)

                    Text(email.from.email)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Text(email.receivedAt.detailedTimeAgo)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - AI Summary Section

struct AISummarySection: View {
    let summary: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundColor(.blue)
                Text("AI Summary")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.blue)
            }

            Text(summary)
                .font(.body)
                .foregroundColor(.primary)
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(12)
        }
    }
}

// MARK: - Email Metadata Section

struct EmailMetadataSection: View {
    let email: Email

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Details")
                .font(.subheadline)
                .fontWeight(.semibold)

            // Show AI-generated badges if available, otherwise show default badges
            if let badges = email.badges, !badges.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(badges) { badge in
                            AIBadgeView(badge: badge)
                        }
                    }
                }
            } else {
                HStack(spacing: 8) {
                    CategoryBadge(category: email.category)

                    if email.isPersonallyRelevant {
                        PersonalBadge()
                    }

                    ImportanceBadge(importance: email.importance)
                }
            }

            if let to = email.to, !to.isEmpty {
                MetadataRow(label: "To", value: to.map { $0.email }.joined(separator: ", "))
            }

            if let cc = email.cc, !cc.isEmpty {
                MetadataRow(label: "Cc", value: cc.map { $0.email }.joined(separator: ", "))
            }

            MetadataRow(label: "Date", value: email.receivedAt.formatted())
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct MetadataRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack(alignment: .top) {
            Text(label)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.secondary)
                .frame(width: 60, alignment: .leading)

            Text(value)
                .font(.caption)
                .foregroundColor(.primary)
        }
    }
}

// MARK: - Email Body Section

struct EmailBodySection: View {
    let email: Email
    let userId: String?
    @State private var showHTML = true

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Message")
                    .font(.subheadline)
                    .fontWeight(.semibold)

                Spacer()

                if email.htmlBody != nil {
                    Button(action: {
                        showHTML.toggle()
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: showHTML ? "doc.plaintext" : "doc.richtext")
                                .font(.caption)
                            Text(showHTML ? "Plain Text" : "Rich HTML")
                                .font(.caption)
                        }
                        .foregroundColor(.blue)
                    }
                }
            }

            if let htmlBody = email.htmlBody, showHTML {
                HTMLEmailView(htmlContent: htmlBody, emailId: email.id, userId: userId)
            } else {
                Text(email.body)
                    .font(.body)
                    .foregroundColor(.primary)
            }
        }
    }
}

// MARK: - Attachments Section

struct AttachmentsSection: View {
    let attachments: [EmailAttachment]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Attachments")
                .font(.subheadline)
                .fontWeight(.semibold)

            ForEach(attachments, id: \.filename) { attachment in
                AttachmentRow(attachment: attachment)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct AttachmentRow: View {
    let attachment: EmailAttachment

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: iconForMimeType(attachment.mimeType))
                .font(.title2)
                .foregroundColor(.blue)
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 4) {
                Text(attachment.filename)
                    .font(.body)
                    .fontWeight(.medium)

                if let size = attachment.size {
                    Text(formatBytes(size))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            Button(action: {
                // Download attachment
            }) {
                Image(systemName: "arrow.down.circle")
                    .font(.title3)
                    .foregroundColor(.blue)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }

    private func iconForMimeType(_ mimeType: String) -> String {
        if mimeType.starts(with: "image/") {
            return "photo"
        } else if mimeType.starts(with: "video/") {
            return "video"
        } else if mimeType.starts(with: "audio/") {
            return "music.note"
        } else if mimeType.contains("pdf") {
            return "doc.fill"
        } else if mimeType.contains("zip") || mimeType.contains("archive") {
            return "archivebox"
        } else {
            return "doc"
        }
    }

    private func formatBytes(_ bytes: Int) -> String {
        let kb = Double(bytes) / 1024
        if kb < 1024 {
            return String(format: "%.1f KB", kb)
        }
        let mb = kb / 1024
        return String(format: "%.1f MB", mb)
    }
}

// MARK: - Date Extension

extension Date {
    var detailedTimeAgo: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: self)
    }

    func formatted() -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        formatter.timeStyle = .short
        return formatter.string(from: self)
    }
}
