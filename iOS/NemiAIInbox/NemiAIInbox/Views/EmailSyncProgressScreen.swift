//
//  EmailSyncProgressScreen.swift
//  NemiAIInbox
//
//  Shows progress when syncing emails after adding new account
//

import SwiftUI
import Combine

struct EmailSyncProgressScreen: View {
    let accountId: String
    @Environment(\.dismiss) var dismiss
    @State private var stats: EmailAccountStats?
    @State private var isComplete = false

    // Timer to poll progress every 2 seconds
    let timer = Timer.publish(every: 2, on: .main, in: .common).autoconnect()

    private var fetchProgress: Double {
        guard let stats = stats, stats.totalEmails > 0 else { return 0 }
        return Double(stats.totalEmails) / 100.0 // Assume 100 is initial fetch target
    }

    private var analysisProgress: Double {
        guard let stats = stats, stats.totalEmails > 0 else { return 0 }
        return Double(stats.analyzedEmails) / Double(stats.totalEmails)
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 32) {
                Spacer()

                // Animated sync icon
                ZStack {
                    Circle()
                        .fill(Color.blue.opacity(0.1))
                        .frame(width: 120, height: 120)

                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.system(size: 50))
                        .foregroundColor(.blue)
                        .symbolEffect(.pulse)
                }

                VStack(spacing: 8) {
                    Text("Syncing Your Inbox")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Please wait while we fetch and analyze your emails")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                // Email Fetch Progress
                if let stats = stats {
                    VStack(spacing: 24) {
                        // Fetch progress
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: "envelope.fill")
                                    .foregroundColor(.blue)
                                Text("Fetching Emails")
                                    .font(.headline)
                                Spacer()
                                Text("\(stats.totalEmails)")
                                    .font(.headline)
                                    .foregroundColor(.blue)
                            }

                            GeometryReader { geometry in
                                ZStack(alignment: .leading) {
                                    RoundedRectangle(cornerRadius: 4)
                                        .fill(Color.gray.opacity(0.2))
                                        .frame(height: 8)

                                    RoundedRectangle(cornerRadius: 4)
                                        .fill(Color.blue)
                                        .frame(width: geometry.size.width * min(fetchProgress, 1.0), height: 8)
                                        .animation(.easeInOut(duration: 0.3), value: fetchProgress)
                                }
                            }
                            .frame(height: 8)
                        }

                        // AI Analysis Progress
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: "brain")
                                    .foregroundColor(.orange)
                                Text("AI Analysis")
                                    .font(.headline)
                                Spacer()
                                Text("\(stats.analyzedEmails)/\(stats.totalEmails)")
                                    .font(.headline)
                                    .foregroundColor(.orange)
                            }

                            GeometryReader { geometry in
                                ZStack(alignment: .leading) {
                                    RoundedRectangle(cornerRadius: 4)
                                        .fill(Color.gray.opacity(0.2))
                                        .frame(height: 8)

                                    RoundedRectangle(cornerRadius: 4)
                                        .fill(Color.orange)
                                        .frame(width: geometry.size.width * analysisProgress, height: 8)
                                        .animation(.easeInOut(duration: 0.3), value: analysisProgress)
                                }
                            }
                            .frame(height: 8)

                            if stats.analyzedEmails == stats.totalEmails && stats.totalEmails > 0 {
                                HStack {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.green)
                                    Text("Analysis Complete!")
                                        .font(.caption)
                                        .foregroundColor(.green)
                                }
                            }
                        }

                        // Status messages
                        VStack(spacing: 4) {
                            if stats.pendingEmails > 0 {
                                HStack(spacing: 4) {
                                    Image(systemName: "clock.fill")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                    Text("\(stats.pendingEmails) emails pending analysis")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }

                            if stats.failedEmails > 0 {
                                HStack(spacing: 4) {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .font(.caption2)
                                        .foregroundColor(.red)
                                    Text("\(stats.failedEmails) emails failed")
                                        .font(.caption)
                                        .foregroundColor(.red)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 32)
                } else {
                    ProgressView()
                        .scaleEffect(1.5)
                }

                Spacer()

                // Continue button (only shown when complete)
                if isComplete {
                    Button(action: {
                        dismiss()
                    }) {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                            Text("Go to Inbox")
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding(.horizontal, 32)
                        .padding(.vertical, 16)
                        .background(Color.blue)
                        .cornerRadius(12)
                    }
                    .transition(.scale.combined(with: .opacity))
                    .padding(.bottom, 32)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Skip") {
                        dismiss()
                    }
                    .font(.subheadline)
                }
            }
        }
        .task {
            await loadProgress()
        }
        .onReceive(timer) { _ in
            Task {
                await loadProgress()
            }
        }
    }

    private func loadProgress() async {
        do {
            stats = try await APIService.shared.getAccountStats(accountId: accountId)

            // Check if sync is complete
            if let stats = stats, stats.totalEmails > 0 && stats.analyzedEmails == stats.totalEmails {
                withAnimation {
                    isComplete = true
                }

                // Auto-dismiss after 2 seconds
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    dismiss()
                }
            }
        } catch {
            print("Error loading sync progress: \(error)")
        }
    }
}

#Preview {
    EmailSyncProgressScreen(accountId: "test-account-id")
}
