//
//  AuthFlow.swift
//  NemiAIInbox
//
//  Created by NemiAI
//

import SwiftUI

struct AuthFlow: View {
    @StateObject private var authViewModel = AuthViewModel()
    @State private var showingSignUp = false

    var body: some View {
        if authViewModel.isAuthenticated {
            FeedScreen()
                .environmentObject(authViewModel)
        } else {
            if showingSignUp {
                SignUpView(showingSignUp: $showingSignUp)
                    .environmentObject(authViewModel)
            } else {
                LoginView(showingSignUp: $showingSignUp)
                    .environmentObject(authViewModel)
            }
        }
    }
}

// MARK: - Login View

struct LoginView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @Binding var showingSignUp: Bool

    @State private var email = ""
    @State private var password = ""

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.blue.opacity(0.6), Color.purple.opacity(0.6)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 32) {
                    Spacer()
                        .frame(height: 60)

                    VStack(spacing: 16) {
                        Image(systemName: "envelope.fill")
                            .font(.system(size: 80))
                            .foregroundColor(.white)

                        Text("NemiAI Inbox")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.white)

                        Text("AI-Powered Email Intelligence")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.9))
                    }

                    VStack(spacing: 20) {
                        CustomTextField(
                            icon: "envelope",
                            placeholder: "Email",
                            text: $email
                        )
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)

                        CustomSecureField(
                            icon: "lock",
                            placeholder: "Password",
                            text: $password
                        )

                        if let errorMessage = authViewModel.errorMessage {
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundColor(.red)
                                .padding(.horizontal)
                        }

                        Button(action: {
                            Task {
                                await authViewModel.login(email: email, password: password)
                            }
                        }) {
                            if authViewModel.isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    .frame(maxWidth: .infinity)
                                    .padding()
                            } else {
                                Text("Login")
                                    .font(.headline)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding()
                            }
                        }
                        .background(Color.blue)
                        .cornerRadius(12)
                        .disabled(authViewModel.isLoading || email.isEmpty || password.isEmpty)

                        Button("Forgot Password?") {
                            // Handle forgot password
                        }
                        .font(.subheadline)
                        .foregroundColor(.white)
                    }
                    .padding(.horizontal, 32)

                    HStack {
                        Rectangle()
                            .fill(Color.white.opacity(0.3))
                            .frame(height: 1)

                        Text("OR")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.7))

                        Rectangle()
                            .fill(Color.white.opacity(0.3))
                            .frame(height: 1)
                    }
                    .padding(.horizontal, 32)

                    VStack(spacing: 12) {
                        OAuthButton(
                            icon: "g.circle.fill",
                            title: "Continue with Google",
                            action: {
                                Task {
                                    await authViewModel.loginWithGoogle()
                                }
                            }
                        )

                        OAuthButton(
                            icon: "applelogo",
                            title: "Continue with Apple",
                            action: {
                                Task {
                                    await authViewModel.loginWithApple()
                                }
                            }
                        )
                    }
                    .padding(.horizontal, 32)

                    Button(action: {
                        withAnimation {
                            showingSignUp = true
                        }
                    }) {
                        HStack(spacing: 4) {
                            Text("Don't have an account?")
                                .foregroundColor(.white.opacity(0.9))
                            Text("Sign Up")
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                        }
                        .font(.subheadline)
                    }

                    Spacer()
                }
            }
        }
    }
}

// MARK: - Sign Up View

struct SignUpView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @Binding var showingSignUp: Bool

    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.purple.opacity(0.6), Color.blue.opacity(0.6)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 32) {
                    Spacer()
                        .frame(height: 60)

                    VStack(spacing: 16) {
                        Image(systemName: "envelope.fill")
                            .font(.system(size: 80))
                            .foregroundColor(.white)

                        Text("Create Account")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.white)

                        Text("Join NemiAI Inbox")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.9))
                    }

                    VStack(spacing: 20) {
                        CustomTextField(
                            icon: "person",
                            placeholder: "Full Name",
                            text: $name
                        )

                        CustomTextField(
                            icon: "envelope",
                            placeholder: "Email",
                            text: $email
                        )
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)

                        CustomSecureField(
                            icon: "lock",
                            placeholder: "Password",
                            text: $password
                        )

                        CustomSecureField(
                            icon: "lock",
                            placeholder: "Confirm Password",
                            text: $confirmPassword
                        )

                        if let errorMessage = authViewModel.errorMessage {
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundColor(.red)
                                .padding(.horizontal)
                        }

                        Button(action: {
                            Task {
                                await authViewModel.signUp(email: email, password: password, name: name)
                            }
                        }) {
                            if authViewModel.isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    .frame(maxWidth: .infinity)
                                    .padding()
                            } else {
                                Text("Sign Up")
                                    .font(.headline)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding()
                            }
                        }
                        .background(Color.purple)
                        .cornerRadius(12)
                        .disabled(authViewModel.isLoading || !isFormValid)
                    }
                    .padding(.horizontal, 32)

                    Button(action: {
                        withAnimation {
                            showingSignUp = false
                        }
                    }) {
                        HStack(spacing: 4) {
                            Text("Already have an account?")
                                .foregroundColor(.white.opacity(0.9))
                            Text("Login")
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                        }
                        .font(.subheadline)
                    }

                    Spacer()
                }
            }
        }
    }

    private var isFormValid: Bool {
        !name.isEmpty &&
        !email.isEmpty &&
        !password.isEmpty &&
        password == confirmPassword &&
        password.count >= 8
    }
}

// MARK: - Custom Components

struct CustomTextField: View {
    let icon: String
    let placeholder: String
    @Binding var text: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(.white.opacity(0.7))
                .frame(width: 20)

            TextField(placeholder, text: $text)
                .foregroundColor(.white)
                .placeholder(when: text.isEmpty) {
                    Text(placeholder)
                        .foregroundColor(.white.opacity(0.5))
                }
        }
        .padding()
        .background(Color.white.opacity(0.2))
        .cornerRadius(12)
    }
}

struct CustomSecureField: View {
    let icon: String
    let placeholder: String
    @Binding var text: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(.white.opacity(0.7))
                .frame(width: 20)

            SecureField(placeholder, text: $text)
                .foregroundColor(.white)
        }
        .padding()
        .background(Color.white.opacity(0.2))
        .cornerRadius(12)
    }
}

struct OAuthButton: View {
    let icon: String
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.title3)

                Text(title)
                    .font(.body)
                    .fontWeight(.medium)
            }
            .foregroundColor(.primary)
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.white)
            .cornerRadius(12)
        }
    }
}

extension View {
    func placeholder<Content: View>(
        when shouldShow: Bool,
        alignment: Alignment = .leading,
        @ViewBuilder placeholder: () -> Content
    ) -> some View {
        ZStack(alignment: alignment) {
            placeholder().opacity(shouldShow ? 1 : 0)
            self
        }
    }
}
