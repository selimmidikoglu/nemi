import Foundation
import SwiftUI
import Combine

@MainActor
class EmailAccountViewModel: ObservableObject {
    @Published var emailAccounts: [EmailAccount] = []
    @Published var providers: [EmailProviderConfig] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiService = APIService.shared

    func loadProviders() async {
        isLoading = true
        errorMessage = nil

        do {
            providers = try await apiService.getEmailProviders()
        } catch {
            errorMessage = "Failed to load providers: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func loadEmailAccounts() async {
        isLoading = true
        errorMessage = nil

        do {
            emailAccounts = try await apiService.getEmailAccounts()
        } catch {
            errorMessage = "Failed to load email accounts: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func addEmailAccount(
        emailAddress: String,
        password: String,
        provider: String,
        accountName: String? = nil,
        imapHost: String? = nil,
        imapPort: Int? = nil,
        imapSecure: Bool? = nil
    ) async -> String? {
        isLoading = true
        errorMessage = nil

        do {
            let account = try await apiService.addEmailAccount(
                emailAddress: emailAddress,
                password: password,
                provider: provider,
                accountName: accountName,
                imapHost: imapHost,
                imapPort: imapPort,
                imapSecure: imapSecure
            )
            emailAccounts.append(account)
            isLoading = false
            return account.id
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
            return nil
        }
    }

    func toggleSync(for account: EmailAccount) async {
        do {
            let updated = try await apiService.updateEmailAccount(
                accountId: account.id,
                accountName: nil,
                syncEnabled: !account.syncEnabled,
                isActive: nil
            )

            if let index = emailAccounts.firstIndex(where: { $0.id == account.id }) {
                emailAccounts[index] = updated
            }
        } catch {
            errorMessage = "Failed to update account: \(error.localizedDescription)"
        }
    }

    func deleteAccount(_ account: EmailAccount) async {
        do {
            try await apiService.deleteEmailAccount(accountId: account.id)
            emailAccounts.removeAll { $0.id == account.id }
        } catch {
            errorMessage = "Failed to delete account: \(error.localizedDescription)"
        }
    }
}
