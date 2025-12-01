//
//  BadgeFilterView.swift
//  NemiAIInbox
//
//  Created by NemiAI
//

import SwiftUI

struct BadgeFilterView: View {
    let badges: [EmailBadge]
    @Binding var selectedBadge: EmailBadge?

    var body: some View {
        FlowLayout(spacing: 8) {
            // "All" badge to clear filter
            SmallBadgePill(
                badge: nil,
                isSelected: selectedBadge == nil,
                onTap: {
                    selectedBadge = nil
                }
            )

            // Individual badge filters
            ForEach(badges) { badge in
                SmallBadgePill(
                    badge: badge,
                    isSelected: selectedBadge?.name == badge.name,
                    onTap: {
                        if selectedBadge?.name == badge.name {
                            selectedBadge = nil  // Deselect if already selected
                        } else {
                            selectedBadge = badge
                        }
                    }
                )
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(.systemBackground))
    }
}

// MARK: - Flow Layout (Flex Wrap)

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(
            in: proposal.replacingUnspecifiedDimensions().width,
            subviews: subviews,
            spacing: spacing
        )
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(
            in: bounds.width,
            subviews: subviews,
            spacing: spacing
        )
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x, y: bounds.minY + result.positions[index].y), proposal: .unspecified)
        }
    }

    struct FlowResult {
        var size: CGSize = .zero
        var positions: [CGPoint] = []

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var currentX: CGFloat = 0
            var currentY: CGFloat = 0
            var lineHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)

                if currentX + size.width > maxWidth && currentX > 0 {
                    // Move to next line
                    currentX = 0
                    currentY += lineHeight + spacing
                    lineHeight = 0
                }

                positions.append(CGPoint(x: currentX, y: currentY))
                currentX += size.width + spacing
                lineHeight = max(lineHeight, size.height)
            }

            self.size = CGSize(width: maxWidth, height: currentY + lineHeight)
        }
    }
}

// MARK: - Small Badge Pill

struct SmallBadgePill: View {
    let badge: EmailBadge?
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 4) {
                if let badge = badge {
                    Image(systemName: mapIconName(badge.icon))
                        .font(.system(size: 10, weight: .semibold))
                } else {
                    Image(systemName: "tray.fill")
                        .font(.system(size: 10, weight: .semibold))
                }

                Text(badge?.name ?? "All")
                    .font(.system(size: 12, weight: .medium))
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
                isSelected
                    ? (badge?.swiftUIColor ?? Color.blue)
                    : Color(.systemGray6)
            )
            .foregroundColor(
                isSelected
                    ? .white
                    : (badge?.swiftUIColor ?? Color.primary)
            )
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
    }

    private func mapIconName(_ icon: String) -> String {
        // Map backend icon names to SF Symbols
        switch icon.lowercased() {
        case "warning", "alarm", "alert": return "exclamationmark.triangle.fill"
        case "calendar", "event": return "calendar"
        case "money", "attach_money", "credit_card": return "dollarsign.circle.fill"
        case "work", "briefcase": return "briefcase.fill"
        case "github": return "curlybraces" // Better GitHub/code icon
        case "code", "code-branch": return "chevron.left.forwardslash.chevron.right"
        case "chat": return "bubble.left.fill"
        case "person", "user": return "person.fill"
        case "mail", "email": return "envelope.fill"
        case "attachment", "paperclip": return "paperclip"
        case "link", "url": return "link"
        case "check", "checkmark": return "checkmark.circle.fill"
        case "clock", "time": return "clock.fill"
        case "plane", "flight": return "airplane"
        case "cart", "shopping": return "cart.fill"
        case "ticket": return "ticket.fill"
        case "document", "file": return "doc.fill"
        case "star", "favorite": return "star.fill"
        case "security", "lock": return "lock.fill"
        default: return "tag.fill"
        }
    }
}
