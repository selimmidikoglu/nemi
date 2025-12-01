//
//  HTMLEmailView.swift
//  NemiAIInbox
//
//  Created by NemiAI
//

import SwiftUI
import WebKit

// MARK: - HTML Email View

struct HTMLEmailView: View {
    let htmlContent: String
    let emailId: String?
    let userId: String?
    @State private var contentHeight: CGFloat = 300
    @State private var isLoading = true
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if isLoading {
                ProgressView()
                    .frame(height: 200)
                    .frame(maxWidth: .infinity)
            }

            WebView(
                htmlContent: wrappedHTML,
                emailId: emailId,
                userId: userId,
                contentHeight: $contentHeight,
                isLoading: $isLoading
            )
            .frame(height: max(contentHeight, 100))
            .frame(maxWidth: .infinity)
        }
    }

    private var wrappedHTML: String {
        let isDarkMode = colorScheme == .dark

        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    padding: 16px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    font-size: 16px;
                    line-height: 1.5;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    background-color: \(isDarkMode ? "#1c1c1e" : "#ffffff");
                    color: \(isDarkMode ? "#ffffff" : "#000000");
                }

                /* Make images responsive */
                img {
                    max-width: 100% !important;
                    height: auto !important;
                    display: block;
                    margin: 8px 0;
                }

                /* Tables */
                table {
                    max-width: 100%;
                    border-collapse: collapse;
                }

                /* Links */
                a {
                    color: \(isDarkMode ? "#0a84ff" : "#007aff");
                    text-decoration: none;
                }

                a:active {
                    opacity: 0.7;
                }

                /* Blockquotes */
                blockquote {
                    border-left: 3px solid \(isDarkMode ? "#3a3a3c" : "#e5e5ea");
                    margin-left: 0;
                    padding-left: 16px;
                    color: \(isDarkMode ? "#98989d" : "#6c6c70");
                }

                /* Code blocks */
                pre, code {
                    background-color: \(isDarkMode ? "#2c2c2e" : "#f5f5f7");
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-family: 'SF Mono', 'Menlo', 'Courier New', monospace;
                    font-size: 14px;
                    overflow-x: auto;
                }

                pre {
                    padding: 12px;
                }

                /* Remove unwanted margins from email clients */
                .gmail_quote, .gmail_attr {
                    margin: 16px 0;
                }

                /* Make divs responsive */
                div[style*="width"] {
                    max-width: 100% !important;
                    width: auto !important;
                }

                /* Headings */
                h1, h2, h3, h4, h5, h6 {
                    margin-top: 16px;
                    margin-bottom: 8px;
                }

                /* Paragraphs */
                p {
                    margin: 8px 0;
                }

                /* Lists */
                ul, ol {
                    padding-left: 24px;
                    margin: 8px 0;
                }

                /* Hide potentially dangerous elements */
                script, iframe[src*="javascript"] {
                    display: none !important;
                }
            </style>
        </head>
        <body>
            \(htmlContent)

            <script>
                // Send height to Swift
                function updateHeight() {
                    const height = document.body.scrollHeight;
                    window.webkit.messageHandlers.heightUpdate.postMessage(height);
                }

                // Update height when content loads
                window.addEventListener('load', updateHeight);

                // Update height when images load
                const images = document.getElementsByTagName('img');
                for (let img of images) {
                    img.addEventListener('load', updateHeight);
                }

                // Initial height update
                setTimeout(updateHeight, 100);
                setTimeout(updateHeight, 500);
                setTimeout(updateHeight, 1000);
            </script>
        </body>
        </html>
        """
    }
}

// MARK: - WebView Wrapper

struct WebView: UIViewRepresentable {
    let htmlContent: String
    let emailId: String?
    let userId: String?
    @Binding var contentHeight: CGFloat
    @Binding var isLoading: Bool

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.dataDetectorTypes = [.link, .phoneNumber]

        // Add message handler for height updates
        let contentController = WKUserContentController()
        contentController.add(context.coordinator, name: "heightUpdate")
        config.userContentController = contentController

        // Disable scrolling
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .clear

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        webView.loadHTMLString(htmlContent, baseURL: nil)
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: WebView

        init(_ parent: WebView) {
            self.parent = parent
        }

        // Handle height updates from JavaScript
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "heightUpdate", let height = message.body as? CGFloat {
                DispatchQueue.main.async {
                    self.parent.contentHeight = height
                }
            }
        }

        // Handle navigation
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if navigationAction.navigationType == .linkActivated {
                // Open links in Safari
                if let url = navigationAction.request.url {
                    // Track link click before opening
                    if let emailId = parent.emailId, let userId = parent.userId {
                        AnalyticsService.shared.trackLinkClick(emailId: emailId, userId: userId, url: url)
                    }

                    UIApplication.shared.open(url)
                }
                decisionHandler(.cancel)
            } else {
                decisionHandler(.allow)
            }
        }

        // Handle loading state
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.isLoading = false
            }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            DispatchQueue.main.async {
                self.parent.isLoading = false
            }
        }
    }
}

// MARK: - Preview

struct HTMLEmailView_Previews: PreviewProvider {
    static var previews: some View {
        ScrollView {
            HTMLEmailView(
                htmlContent: """
                    <h1>Welcome to NemiAI Inbox</h1>
                    <p>This is a <strong>test email</strong> with HTML content.</p>
                    <p>Here's a link: <a href="https://example.com">Click me</a></p>
                    <img src="https://via.placeholder.com/400x200" alt="Test image">
                    <blockquote>This is a quote from someone important.</blockquote>
                    <ul>
                        <li>Item 1</li>
                        <li>Item 2</li>
                        <li>Item 3</li>
                    </ul>
                """,
                emailId: "preview-email-id",
                userId: "preview-user-id"
            )
            .padding()
        }
        .preferredColorScheme(.dark)
    }
}
