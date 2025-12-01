//
//  CategoryBadgeSelector.swift
//  NemiAIInbox
//
//  Morphing category-based badge selector
//  Shows categories in compact state, expands to show badges within selected category
//

import SwiftUI

struct CategoryBadgeSelector: View {
    let categories: [(name: String, count: Int, badges: [EmailBadge])]
    @Binding var selectedBadge: EmailBadge?

    @State private var expandedCategory: String? = nil
    @State private var expandedCategoryFrame: CGRect = .zero
    @State private var hoveredBadgeIndex: Int? = nil
    @State private var badgeFrames: [Int: CGRect] = [:]
    @GestureState private var isPressing = false

    // Compact button size
    private let compactHeight: CGFloat = 44
    private let badgeHeight: CGFloat = 44

    // Expanded panel width
    private let expandedWidth: CGFloat = 200

    var isExpanded: Bool {
        expandedCategory != nil
    }

    var expandedHeight: CGFloat {
        guard let category = expandedCategory,
              let categoryData = categories.first(where: { $0.name == category }) else {
            return compactHeight
        }
        let badgeCount = min(categoryData.badges.count + 1, 11) // +1 for "All", max 11
        return CGFloat(badgeCount) * badgeHeight
    }

    var body: some View {
        compactCategoryRow
            .frame(height: max(compactHeight, isExpanded ? expandedHeight : compactHeight))
    }

    // MARK: - Compact Category Row

    private var compactCategoryRow: some View {
        ZStack(alignment: .topLeading) {
            // Base layer: Category pills
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(categories, id: \.name) { category in
                        GeometryReader { geo in
                            CategoryPill(
                                name: category.name,
                                count: category.count,
                                badges: category.badges,
                                isSelected: selectedBadge?.category == category.name
                            )
                            .opacity(expandedCategory == category.name ? 0 : 1)
                            .gesture(
                                LongPressGesture(minimumDuration: 0.2)
                                    .updating($isPressing) { currentState, gestureState, _ in
                                        gestureState = currentState
                                    }
                                    .onEnded { _ in
                                        expandedCategoryFrame = geo.frame(in: .local)
                                        withAnimation(.spring(response: 0.15, dampingFraction: 0.7)) {
                                            expandedCategory = category.name
                                        }
                                        let impact = UIImpactFeedbackGenerator(style: .medium)
                                        impact.impactOccurred()
                                    }
                                    .simultaneously(with: DragGesture(minimumDistance: 0)
                                        .onChanged { value in
                                            if expandedCategory != nil {
                                                let globalLocation = CGPoint(
                                                    x: value.location.x + geo.frame(in: .global).minX,
                                                    y: value.location.y + geo.frame(in: .global).minY
                                                )
                                                updateHoveredBadge(at: globalLocation)
                                            }
                                        }
                                        .onEnded { _ in
                                            if expandedCategory != nil {
                                                selectHoveredBadge()
                                                withAnimation(.spring(response: 0.15, dampingFraction: 0.7)) {
                                                    expandedCategory = nil
                                                }
                                                hoveredBadgeIndex = nil
                                            }
                                        }
                                    )
                            )
                        }
                        .frame(width: pillWidth(for: category), height: compactHeight)
                    }
                }
                .padding(.horizontal, 16)
            }

            // Morphing panel overlay
            if let category = expandedCategory,
               let categoryData = categories.first(where: { $0.name == category }) {
                morphingPanel(for: categoryData, categoryName: category)
                    .offset(x: expandedCategoryFrame.minX, y: 0)
            }
        }
    }

    private func pillWidth(for category: (name: String, count: Int, badges: [EmailBadge])) -> CGFloat {
        let nameWidth = CGFloat(category.name.count) * 8
        let countWidth: CGFloat = 30
        let padding: CGFloat = 40
        return nameWidth + countWidth + padding
    }

    // MARK: - Morphing Panel

    private func morphingPanel(for categoryData: (name: String, count: Int, badges: [EmailBadge]), categoryName: String) -> some View {
        let pillW = pillWidth(for: categoryData)

        return ZStack(alignment: .topLeading) {
            // Morphing background
            RoundedRectangle(cornerRadius: isExpanded ? 12 : 20)
                .fill(Color(.systemBackground))
                .shadow(
                    color: Color.black.opacity(isExpanded ? 0.2 : 0.1),
                    radius: isExpanded ? 10 : 4,
                    x: 0,
                    y: 2
                )
                .frame(
                    width: isExpanded ? expandedWidth : pillW,
                    height: isExpanded ? expandedHeight : compactHeight
                )
                .animation(.spring(response: 0.15, dampingFraction: 0.7), value: isExpanded)

            // Content that morphs
            if isExpanded {
                BadgeListContent(
                    categoryName: categoryName,
                    badges: categoryData.badges,
                    selectedBadge: selectedBadge,
                    hoveredBadgeIndex: hoveredBadgeIndex,
                    badgeFrames: $badgeFrames,
                    onSelectAll: {
                        selectedBadge = nil
                        withAnimation(.spring(response: 0.15, dampingFraction: 0.7)) {
                            expandedCategory = nil
                        }
                        hoveredBadgeIndex = nil
                    }
                )
                .frame(width: expandedWidth, height: expandedHeight)
            }
        }
        .zIndex(1000)
    }

    // MARK: - Helper Functions

    private func updateHoveredBadge(at location: CGPoint) {
        for (index, rect) in badgeFrames {
            if rect.contains(location) {
                if hoveredBadgeIndex != index {
                    hoveredBadgeIndex = index
                    let selection = UISelectionFeedbackGenerator()
                    selection.selectionChanged()
                }
                return
            }
        }
        hoveredBadgeIndex = nil
    }

    private func selectHoveredBadge() {
        guard let index = hoveredBadgeIndex,
              let category = expandedCategory,
              let categoryData = categories.first(where: { $0.name == category }) else {
            return
        }

        if index == 0 {
            // First badge is "All" - clear selection
            selectedBadge = nil
        } else if index - 1 < categoryData.badges.count {
            selectedBadge = categoryData.badges[index - 1]
        }

        let impact = UIImpactFeedbackGenerator(style: .light)
        impact.impactOccurred()
    }
}

// MARK: - Category Pill

struct CategoryPill: View {
    let name: String
    let count: Int
    let badges: [EmailBadge]
    let isSelected: Bool

    // Get the most important badge color for the category
    private var categoryColor: Color {
        badges.first?.swiftUIColor ?? .blue
    }

    private var categoryIcon: String {
        switch name {
        case "Coding": return "curlybraces"
        case "Communication": return "bubble.left.and.bubble.right.fill"
        case "Tasks": return "checkmark.circle.fill"
        case "Finance": return "dollarsign.circle.fill"
        case "Social": return "person.2.fill"
        case "Travel": return "airplane"
        case "Shopping": return "cart.fill"
        default: return "tag.fill"
        }
    }

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: categoryIcon)
                .font(.system(size: 12, weight: .semibold))

            Text(name)
                .font(.system(size: 14, weight: .semibold))

            Text("\(count)")
                .font(.system(size: 12, weight: .medium))
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(Color.white.opacity(0.3))
                .cornerRadius(8)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(isSelected ? categoryColor : Color(.systemGray5))
        .foregroundColor(isSelected ? .white : .primary)
        .cornerRadius(20)
    }
}

// MARK: - Badge List Content

struct BadgeListContent: View {
    let categoryName: String
    let badges: [EmailBadge]
    let selectedBadge: EmailBadge?
    let hoveredBadgeIndex: Int?
    @Binding var badgeFrames: [Int: CGRect]
    let onSelectAll: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // "All" option
            ExpandableBadgeRow(
                badge: nil,
                categoryName: categoryName,
                isSelected: selectedBadge == nil,
                isHovered: hoveredBadgeIndex == 0,
                index: 0,
                badgeFrames: $badgeFrames
            )

            // Individual badges (limit to top 10)
            ForEach(Array(badges.prefix(10).enumerated()), id: \.element.id) { index, badge in
                Divider()

                CategoryBadgeRow(
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

// MARK: - Category Badge Row

struct CategoryBadgeRow: View {
    let badge: EmailBadge
    let isSelected: Bool
    let isHovered: Bool
    let index: Int
    @Binding var badgeFrames: [Int: CGRect]

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: mapIconName(badge.icon))
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(badge.swiftUIColor)
                .frame(width: 20)

            Text(badge.name)
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
                ? badge.swiftUIColor.opacity(0.2)
                : Color.clear
        )
        .background(
            GeometryReader { geometry in
                Color.clear.preference(
                    key: BadgeFramePreferenceKey.self,
                    value: [index: geometry.frame(in: .global)]
                )
            }
        )
        .onPreferenceChange(BadgeFramePreferenceKey.self) { preferences in
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
        case "github": return "curlybraces"
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

// MARK: - Expandable Badge Row (for "All" option)

struct ExpandableBadgeRow: View {
    let badge: EmailBadge?
    let categoryName: String
    let isSelected: Bool
    let isHovered: Bool
    let index: Int
    @Binding var badgeFrames: [Int: CGRect]

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "tray.fill")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.blue)
                .frame(width: 20)

            Text("All \(categoryName)")
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
                ? Color.blue.opacity(0.2)
                : Color.clear
        )
        .background(
            GeometryReader { geometry in
                Color.clear.preference(
                    key: BadgeFramePreferenceKey.self,
                    value: [index: geometry.frame(in: .global)]
                )
            }
        )
        .onPreferenceChange(BadgeFramePreferenceKey.self) { preferences in
            DispatchQueue.main.async {
                if let rect = preferences[index] {
                    badgeFrames[index] = rect
                }
            }
        }
    }
}

// MARK: - Preference Key (reuse from ExpandingBadgeSelector)

struct BadgeFramePreferenceKey: PreferenceKey {
    static var defaultValue: [Int: CGRect] = [:]

    static func reduce(value: inout [Int: CGRect], nextValue: () -> [Int: CGRect]) {
        value.merge(nextValue()) { $1 }
    }
}
