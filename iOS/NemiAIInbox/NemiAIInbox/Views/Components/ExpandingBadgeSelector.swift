//
//  ExpandingBadgeSelector.swift
//  NemiAIInbox
//
//  Morphing button that expands into a badge selector panel
//

import SwiftUI

struct ExpandingBadgeSelector: View {
    let badges: [EmailBadge]
    @Binding var selectedBadge: EmailBadge?

    @State private var isExpanded: Bool = false
    @State private var dragLocation: CGPoint = .zero
    @State private var hoveredBadgeIndex: Int? = nil
    @State private var badgeFrames: [Int: CGRect] = [:]
    @GestureState private var isPressing = false

    // Calculate compact button size
    private let compactSize: CGSize = CGSize(width: 44, height: 44)
    // Expanded panel size
    private let expandedWidth: CGFloat = 200

    var expandedHeight: CGFloat {
        // Calculate based on number of badges (max 10)
        let badgeCount = min(badges.count + 1, 11) // +1 for "All"
        return CGFloat(badgeCount) * 44 // Each row is 44pt
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // The morphing button/panel
                RoundedRectangle(cornerRadius: isExpanded ? 12 : 22)
                    .fill(Color(.systemBackground))
                    .shadow(color: Color.black.opacity(isExpanded ? 0.2 : 0.1), radius: isExpanded ? 10 : 4, x: 0, y: 2)
                    .frame(
                        width: isExpanded ? expandedWidth : compactSize.width,
                        height: isExpanded ? expandedHeight : compactSize.height
                    )
                    .overlay(
                        Group {
                            if isExpanded {
                                // Expanded: Show badge list
                                SimpleBadgeListContent(
                                    badges: badges,
                                    selectedBadge: selectedBadge,
                                    hoveredBadgeIndex: hoveredBadgeIndex,
                                    badgeFrames: $badgeFrames
                                )
                            } else {
                                // Compact: Show filter icon
                                Image(systemName: "line.3.horizontal.decrease.circle.fill")
                                    .font(.system(size: 24))
                                    .foregroundColor(selectedBadge == nil ? .blue : selectedBadge?.swiftUIColor)
                            }
                        }
                    )
                    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isExpanded)
                    .zIndex(isExpanded ? 1000 : 1) // Bring to front when expanded
            }
            .frame(width: compactSize.width, height: compactSize.height, alignment: .topLeading)
            .contentShape(Rectangle().size(width: isExpanded ? expandedWidth : compactSize.width, height: isExpanded ? expandedHeight : compactSize.height))
            .gesture(
                LongPressGesture(minimumDuration: 0.2)
                    .updating($isPressing) { currentState, gestureState, transaction in
                        gestureState = currentState
                    }
                    .onEnded { _ in
                        withAnimation {
                            isExpanded = true
                        }
                        // Haptic feedback
                        let impact = UIImpactFeedbackGenerator(style: .medium)
                        impact.impactOccurred()
                    }
                    .simultaneously(with: DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            if isExpanded {
                                // Convert drag location to global coordinates
                                let globalLocation = CGPoint(
                                    x: value.location.x + geometry.frame(in: .global).minX,
                                    y: value.location.y + geometry.frame(in: .global).minY
                                )
                                dragLocation = globalLocation
                                updateHoveredBadge(at: globalLocation)
                            }
                        }
                        .onEnded { _ in
                            if isExpanded {
                                selectHoveredBadge()
                                withAnimation {
                                    isExpanded = false
                                }
                                hoveredBadgeIndex = nil
                            }
                        }
                    )
            )
        }
        .frame(width: compactSize.width, height: compactSize.height)
    }

    private func updateHoveredBadge(at location: CGPoint) {
        for (index, rect) in badgeFrames {
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

// MARK: - Simple Badge List Content

struct SimpleBadgeListContent: View {
    let badges: [EmailBadge]
    let selectedBadge: EmailBadge?
    let hoveredBadgeIndex: Int?
    @Binding var badgeFrames: [Int: CGRect]

    var body: some View {
        VStack(spacing: 0) {
            // "All" badge
            SimpleBadgeRow(
                badge: nil,
                isSelected: selectedBadge == nil,
                isHovered: hoveredBadgeIndex == 0,
                index: 0,
                badgeFrames: $badgeFrames
            )

            // Individual badges (limit to top 10 most important)
            ForEach(Array(badges.prefix(10).enumerated()), id: \.element.id) { index, badge in
                Divider()

                SimpleBadgeRow(
                    badge: badge,
                    isSelected: selectedBadge?.name == badge.name,
                    isHovered: hoveredBadgeIndex == index + 1,
                    index: index + 1,
                    badgeFrames: $badgeFrames
                )
            }
        }
    }
}

// MARK: - Simple Badge Row

struct SimpleBadgeRow: View {
    let badge: EmailBadge?
    let isSelected: Bool
    let isHovered: Bool
    let index: Int
    @Binding var badgeFrames: [Int: CGRect]

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
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 14))
                    .foregroundColor(.blue)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 12)
        .background(
            isHovered
                ? (badge?.swiftUIColor.opacity(0.2) ?? Color.blue.opacity(0.2))
                : Color.clear
        )
        .background(
            GeometryReader { geometry in
                Color.clear.preference(
                    key: SimpleBadgeFramePreferenceKey.self,
                    value: [index: geometry.frame(in: .global)]
                )
            }
        )
        .onPreferenceChange(SimpleBadgeFramePreferenceKey.self) { preferences in
            DispatchQueue.main.async {
                if let rect = preferences[index] {
                    badgeFrames[index] = rect
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

struct SimpleBadgeFramePreferenceKey: PreferenceKey {
    static var defaultValue: [Int: CGRect] = [:]

    static func reduce(value: inout [Int: CGRect], nextValue: () -> [Int: CGRect]) {
        value.merge(nextValue()) { $1 }
    }
}
