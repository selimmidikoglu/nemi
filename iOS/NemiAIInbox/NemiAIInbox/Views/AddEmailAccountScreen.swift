import SwiftUI

struct AddEmailAccountScreen: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel = EmailAccountViewModel()

    @State private var selectedProvider: EmailProviderConfig?
    @State private var emailAddress = ""
    @State private var password = ""
    @State private var accountName = ""

    // Custom IMAP settings
    @State private var customImapHost = ""
    @State private var customImapPort = "993"
    @State private var customImapSecure = true
    @State private var showCustomSettings = false

    // Sync progress
    @State private var showingSyncProgress = false
    @State private var addedAccountId: String?

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Email Provider")) {
                    if viewModel.providers.isEmpty {
                        ProgressView()
                            .frame(maxWidth: .infinity, alignment: .center)
                    } else {
                        Picker("Provider", selection: $selectedProvider) {
                            Text("Select Provider").tag(nil as EmailProviderConfig?)
                            ForEach(viewModel.providers) { provider in
                                Text(provider.name).tag(provider as EmailProviderConfig?)
                            }
                        }
                        .onChange(of: selectedProvider) { oldValue, newValue in
                            showCustomSettings = newValue?.provider == "custom"
                        }
                    }
                }

                Section(header: Text("Account Details")) {
                    TextField("Email Address", text: $emailAddress)
                        .textContentType(.emailAddress)
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)

                    SecureField("Password", text: $password)
                        .textContentType(.password)

                    TextField("Account Name (Optional)", text: $accountName)
                        .textContentType(.name)
                }

                if showCustomSettings {
                    Section(header: Text("Custom IMAP Settings")) {
                        TextField("IMAP Host", text: $customImapHost)
                            .autocapitalization(.none)

                        TextField("IMAP Port", text: $customImapPort)
                            .keyboardType(.numberPad)

                        Toggle("Use SSL/TLS", isOn: $customImapSecure)
                    }
                }

                if let provider = selectedProvider {
                    Section(header: Text("Setup Instructions")) {
                        if let instructions = provider.setupInstructions {
                            Text(instructions)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }

                if let error = viewModel.errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Add Email Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Add") {
                        Task {
                            await addAccount()
                        }
                    }
                    .disabled(!isFormValid || viewModel.isLoading)
                }
            }
            .overlay {
                if viewModel.isLoading {
                    ZStack {
                        Color.black.opacity(0.3)
                            .ignoresSafeArea()

                        VStack(spacing: 16) {
                            ProgressView()
                                .scaleEffect(1.5)

                            Text("Connecting to email server...")
                                .font(.headline)
                        }
                        .padding(32)
                        .background(Color(UIColor.systemBackground))
                        .cornerRadius(12)
                    }
                }
            }
        }
        .task {
            await viewModel.loadProviders()
        }
        .fullScreenCover(isPresented: $showingSyncProgress) {
            if let accountId = addedAccountId {
                EmailSyncProgressScreen(accountId: accountId)
                    .onDisappear {
                        // Dismiss the Add Account screen when sync progress is dismissed
                        dismiss()
                    }
            }
        }
    }

    private var isFormValid: Bool {
        guard !emailAddress.isEmpty,
              !password.isEmpty,
              selectedProvider != nil else {
            return false
        }

        if showCustomSettings {
            return !customImapHost.isEmpty && !customImapPort.isEmpty
        }

        return true
    }

    private func addAccount() async {
        guard let provider = selectedProvider else { return }

        let imapHost = showCustomSettings ? customImapHost : nil
        let imapPort = showCustomSettings ? Int(customImapPort) : nil
        let imapSecure = showCustomSettings ? customImapSecure : nil

        if let accountId = await viewModel.addEmailAccount(
            emailAddress: emailAddress,
            password: password,
            provider: provider.provider,
            accountName: accountName.isEmpty ? nil : accountName,
            imapHost: imapHost,
            imapPort: imapPort,
            imapSecure: imapSecure
        ) {
            addedAccountId = accountId
            showingSyncProgress = true
        }
    }
}

#Preview {
    AddEmailAccountScreen()
}
