//
//  BadgeSelectorButton.swift
//  NemiAIInbox
//
//  Interactive press-and-hold badge selector with drag gesture
//

import SwiftUI

struct BadgeSelectorButton: View {
    let badges: [EmailBadge]
    @Binding var selectedBadge: EmailBadge?
    @State private var isPressed: Bool = false
    @State private var dragLocation: CGPoint = .zero
    @State private var hoveredBadgeIndex: Int? = nil
    @State private var badgePositions: [CGRect] = []

    var body: some View {
        ZStack {
            // The button itself
            Button(action: {}) {
                Image(systemName: "line.3.horizontal.decrease.circle")
                    .font(.title3)
                    .foregroundColor(selectedBadge == nil ? .blue : selectedBadge?.swiftUIColor)
            }
            .simultaneousGesture(
                LongPressGesture(minimumDuration: 0.3)
                    .onEnded { _ in
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            isPressed = true
                        }
                        // Haptic feedback
                        let impact = UIImpactFeedbackGenerator(style: .medium)
                        impact.impactOccurred()
                    }
            )
            .simultaneousGesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in
                        if isPressed {
                            dragLocation = value.location
                            updateHoveredBadge(at: value.location)
                        }
                    }
                    .onEnded { value in
                        if isPressed {
                            selectHoveredBadge()
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                isPressed = false
                            }
                            hoveredBadgeIndex = nil
                        }
                    }
            )

            // Popup badge selector
            if isPressed {
                BadgeSelectorPopup(
                    badges: badges,
                    selectedBadge: $selectedBadge,
                    hoveredBadgeIndex: $hoveredBadgeIndex,
                    badgePositions: $badgePositions
                )
                .transition(.scale.combined(with: .opacity))
                .zIndex(1000)
            }
        }
    }

    private func updateHoveredBadge(at location: CGPoint) {
        for (index, rect) in badgePositions.enumerated() {
            if rect.contains(location) {
                if hoveredBadgeIndex != index {
                    hoveredBadgeIndex = index
                    // Light haptic feedback when hovering over a new badge
                    let selection = UISelectionFeedbackGenerator()
                    selection.selectionChanged()
                }
                return
            }
        }
        hoveredBadgeIndex = nil
    }

    private func selectHoveredBadge() {
        guard let index = hoveredBadgeIndex else { return }

        if index == 0 {
            // First badge is "All"
            selectedBadge = nil
        } else if index - 1 < badges.count {
            selectedBadge = badges[index - 1]
        }

        // Haptic feedback on selection
        let impact = UIImpactFeedbackGenerator(style: .light)
        impact.impactOccurred()
    }
}

// MARK: - Badge Selector Popup

struct BadgeSelectorPopup: View {
    let badges: [EmailBadge]
    @Binding var selectedBadge: EmailBadge?
    @Binding var hoveredBadgeIndex: Int?
    @Binding var badgePositions: [CGRect]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // "All" badge
            BadgeRow(
                badge: nil,
                isSelected: selectedBadge == nil,
                isHovered: hoveredBadgeIndex == 0,
                index: 0,
                badgePositions: $badgePositions
            )

            Divider()

            // Individual badges (limit to top 10 most important)
            ForEach(Array(badges.prefix(10).enumerated()), id: \.element.id) { index, badge in
                BadgeRow(
                    badge: badge,
                    isSelected: selectedBadge?.name == badge.name,
                    isHovered: hoveredBadgeIndex == index + 1,
                    index: index + 1,
                    badgePositions: $badgePositions
                )

                if index < min(badges.count, 10) - 1 {
                    Divider()
                }
            }
        }
        .frame(width: 200)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemBackground))
                .shadow(color: Color.black.opacity(0.2), radius: 10, x: 0, y: 4)
        )
        .offset(x: -210, y: 0) // Position to the right of the button
    }
}

// MARK: - Badge Row

struct BadgeRow: View {
    let badge: EmailBadge?
    let isSelected: Bool
    let isHovered: Bool
    let index: Int
    @Binding var badgePositions: [CGRect]

    var body: some View {
        HStack(spacing: 8) {
            if let badge = badge {
                Image(systemName: mapIconName(badge.icon))
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(badge.swiftUIColor)
                    .frame(width: 20)
            } else {
                Image(systemName: "tray.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.blue)
                    .frame(width: 20)
            }

            Text(badge?.name ?? "All")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.primary)

            Spacer()

            if isSelected {
                Image(systemName: "checkmark")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.blue)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(
            isHovered
                ? (badge?.swiftUIColor.opacity(0.15) ?? Color.blue.opacity(0.15))
                : Color.clear
        )
        .background(
            GeometryReader { geometry in
                Color.clear.preference(
                    key: BadgePositionPreferenceKey.self,
                    value: [index: geometry.frame(in: .global)]
                )
            }
        )
        .onPreferenceChange(BadgePositionPreferenceKey.self) { preferences in
            DispatchQueue.main.async {
                if let rect = preferences[index] {
                    // Ensure badgePositions array is large enough
                    while badgePositions.count <= index {
                        badgePositions.append(.zero)
                    }
                    badgePositions[index] = rect
                }
            }
        }
    }

    private func mapIconName(_ icon: String) -> String {
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

// MARK: - Preference Key

struct BadgePositionPreferenceKey: PreferenceKey {
    static var defaultValue: [Int: CGRect] = [:]

    static func reduce(value: inout [Int: CGRect], nextValue: () -> [Int: CGRect]) {
        value.merge(nextValue()) { $1 }
    }
}
