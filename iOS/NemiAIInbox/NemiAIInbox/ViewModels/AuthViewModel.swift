//
//  AuthViewModel.swift
//  NemiAIInbox
//
//  Created by NemiAI
//

import Foundation
import Combine

@MainActor
class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiService = APIService.shared
    private var cancellables = Set<AnyCancellable>()

    init() {
        checkAuthStatus()
    }

    func signUp(email: String, password: String, name: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await apiService.signUp(email: email, password: password, name: name)
            await handleAuthSuccess(response)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func login(email: String, password: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await apiService.login(email: email, password: password)
            await handleAuthSuccess(response)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func loginWithGoogle() async {
        isLoading = true
        errorMessage = nil
        errorMessage = "Google login not yet implemented"
        isLoading = false
    }

    func loginWithApple() async {
        isLoading = true
        errorMessage = nil
        errorMessage = "Apple login not yet implemented"
        isLoading = false
    }

    func logout() {
        KeychainHelper.delete(key: "accessToken")
        KeychainHelper.delete(key: "refreshToken")
        currentUser = nil
        isAuthenticated = false
    }

    func refreshToken() async throws {
        guard let refreshToken = KeychainHelper.get(key: "refreshToken") else {
            throw AuthError.noRefreshToken
        }

        let response = try await apiService.refreshToken(refreshToken: refreshToken)
        KeychainHelper.save(key: "accessToken", value: response.accessToken)
        KeychainHelper.save(key: "refreshToken", value: response.refreshToken)
    }

    private func checkAuthStatus() {
        if let _ = KeychainHelper.get(key: "accessToken") {
            Task {
                do {
                    let user = try await apiService.getCurrentUser()
                    currentUser = user
                    isAuthenticated = true
                } catch {
                    do {
                        try await refreshToken()
                        let user = try await apiService.getCurrentUser()
                        currentUser = user
                        isAuthenticated = true
                    } catch {
                        logout()
                    }
                }
            }
        }
    }

    private func handleAuthSuccess(_ response: AuthResponse) async {
        KeychainHelper.save(key: "accessToken", value: response.accessToken)
        KeychainHelper.save(key: "refreshToken", value: response.refreshToken)
        currentUser = response.user
        isAuthenticated = true
    }
}

enum AuthError: LocalizedError {
    case noRefreshToken
    case invalidCredentials
    case networkError

    var errorDescription: String? {
        switch self {
        case .noRefreshToken:
            return "No refresh token available"
        case .invalidCredentials:
            return "Invalid email or password"
        case .networkError:
            return "Network connection failed"
        }
    }
}
