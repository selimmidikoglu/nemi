import SwiftUI

struct EmailAccountsScreen: View {
    @StateObject private var viewModel = EmailAccountViewModel()
    @State private var showingAddAccount = false

    var body: some View {
        NavigationView {
            List {
                if viewModel.emailAccounts.isEmpty && !viewModel.isLoading {
                    VStack(spacing: 16) {
                        Image(systemName: "envelope.badge.shield.half.filled")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)

                        Text("No Email Accounts")
                            .font(.title2)
                            .bold()

                        Text("Add your email accounts to start receiving and managing emails")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)

                        Button(action: {
                            showingAddAccount = true
                        }) {
                            Label("Add Email Account", systemImage: "plus.circle.fill")
                                .font(.headline)
                        }
                        .buttonStyle(.borderedProminent)
                        .padding(.top)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 60)
                    .listRowBackground(Color.clear)
                } else {
                    ForEach(viewModel.emailAccounts) { account in
                        EmailAccountRow(account: account, viewModel: viewModel)
                    }
                    .onDelete(perform: deleteAccounts)
                }

                if let error = viewModel.errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Email Accounts")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingAddAccount = true
                    }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .refreshable {
                await viewModel.loadEmailAccounts()
            }
            .overlay {
                if viewModel.isLoading {
                    ProgressView()
                }
            }
            .sheet(isPresented: $showingAddAccount) {
                AddEmailAccountScreen()
            }
        }
        .task {
            await viewModel.loadEmailAccounts()
        }
    }

    private func deleteAccounts(at offsets: IndexSet) {
        for index in offsets {
            let account = viewModel.emailAccounts[index]
            Task {
                await viewModel.deleteAccount(account)
            }
        }
    }
}

struct EmailAccountRow: View {
    let account: EmailAccount
    @ObservedObject var viewModel: EmailAccountViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(account.displayName)
                        .font(.headline)

                    Text(account.emailAddress)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Spacer()

                providerBadge
            }

            HStack {
                statusIndicator

                Spacer()

                Toggle("Sync", isOn: Binding(
                    get: { account.syncEnabled },
                    set: { _ in
                        Task {
                            await viewModel.toggleSync(for: account)
                        }
                    }
                ))
                .labelsHidden()
            }

            if let error = account.lastSyncError {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 8)
    }

    private var providerBadge: some View {
        Text(account.provider.capitalized)
            .font(.caption)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(providerColor.opacity(0.2))
            .foregroundColor(providerColor)
            .cornerRadius(8)
    }

    private var statusIndicator: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)

            Text(account.statusText)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }

    private var providerColor: Color {
        switch account.provider.lowercased() {
        case "gmail":
            return .red
        case "outlook":
            return .blue
        case "yahoo":
            return .purple
        case "icloud":
            return .cyan
        default:
            return .gray
        }
    }

    private var statusColor: Color {
        if !account.isActive {
            return .gray
        }
        if account.lastSyncError != nil {
            return .red
        }
        if account.lastSyncAt != nil {
            return .green
        }
        return .orange
    }
}

#Preview {
    EmailAccountsScreen()
}
