//
//  BadgeManagementScreen.swift
//  NemiAIInbox
//
//  Badge management screen with drag & drop reordering
//  and visual engagement indicators
//

import SwiftUI
import Combine

struct BadgeManagementScreen: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel = BadgeManagementViewModel()
    @State private var searchText = ""
    @State private var hasChanges = false

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Search bar (only shows if >10 badges)
                if viewModel.badges.count > 10 {
                    SearchBar(text: $searchText)
                        .padding()
                }

                // Badge list with drag & drop
                if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.badges.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "tag.slash")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        Text("No badges yet")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        Text("Badges will appear here as your emails are analyzed by AI")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(spacing: 20) {
                            // Horizontal drag & drop badge list
                            HorizontalBadgeReorderList(
                                badges: filteredBadges,
                                onMove: { from, to in
                                    viewModel.moveBadges(from: IndexSet(integer: from), to: to)
                                    hasChanges = true
                                }
                            )
                            .padding(.horizontal)

                            Divider()
                                .padding(.horizontal)

                            // Vertical detailed list view
                            VStack(spacing: 12) {
                                Text("Badge Details")
                                    .font(.headline)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(.horizontal)

                                ForEach(filteredBadges) { badge in
                                    BadgeManagementRow(badge: badge)
                                        .padding(.horizontal)
                                }
                            }
                        }
                        .padding(.vertical)
                    }
                }

                // Save button (activated when order changes)
                if hasChanges {
                    Button(action: {
                        Task {
                            await viewModel.saveDisplayOrder()
                            hasChanges = false
                        }
                    }) {
                        HStack {
                            if viewModel.isSaving {
                                ProgressView()
                                    .tint(.white)
                            }
                            Text(viewModel.isSaving ? "Saving..." : "Save Order")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(viewModel.isSaving)
                    .padding()
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .navigationTitle("Manage Badges")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
            .onAppear {
                Task {
                    await viewModel.loadBadges()
                }
            }
        }
    }

    private var filteredBadges: [ManagedBadge] {
        if searchText.isEmpty {
            return viewModel.badges
        }
        return viewModel.badges.filter { badge in
            badge.name.localizedCaseInsensitiveContains(searchText) ||
            badge.category.localizedCaseInsensitiveContains(searchText)
        }
    }
}

// MARK: - Horizontal Badge Reorder List

struct HorizontalBadgeReorderList: View {
    let badges: [ManagedBadge]
    let onMove: (Int, Int) -> Void

    @State private var draggingItem: ManagedBadge?
    @State private var dragOffset: CGSize = .zero

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Drag to Reorder")
                .font(.headline)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(Array(badges.enumerated()), id: \.element.id) { index, badge in
                        DraggableBadgeCard(
                            badge: badge,
                            index: index,
                            isDragging: draggingItem?.id == badge.id,
                            onDragStart: { draggingItem = badge },
                            onDragEnd: { fromIndex, toIndex in
                                if fromIndex != toIndex {
                                    onMove(fromIndex, toIndex > fromIndex ? toIndex + 1 : toIndex)
                                }
                                draggingItem = nil
                            }
                        )
                    }
                }
                .padding(.vertical, 8)
            }
            .frame(height: 140)
        }
    }
}

// MARK: - Draggable Badge Card

struct DraggableBadgeCard: View {
    let badge: ManagedBadge
    let index: Int
    let isDragging: Bool
    let onDragStart: () -> Void
    let onDragEnd: (Int, Int) -> Void

    @State private var dragOffset: CGSize = .zero
    @State private var draggedOverIndex: Int?

    var body: some View {
        VStack(spacing: 8) {
            // Badge visual
            VStack(spacing: 4) {
                Image(systemName: badge.icon)
                    .font(.title)
                    .foregroundColor(Color(hex: badge.color) ?? .blue)

                Text(badge.name)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .lineLimit(1)
            }
            .frame(width: 100, height: 70)
            .background((Color(hex: badge.color) ?? .blue).opacity(0.15))
            .cornerRadius(12)

            // Stats
            VStack(spacing: 2) {
                Text("\(badge.usageCount)")
                    .font(.caption)
                    .fontWeight(.bold)
                Text("emails")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(8)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(isDragging ? 0.3 : 0.1), radius: isDragging ? 12 : 4, x: 0, y: isDragging ? 6 : 2)
        .scaleEffect(isDragging ? 1.05 : 1.0)
        .opacity(isDragging ? 0.8 : 1.0)
        .offset(dragOffset)
        .gesture(
            DragGesture()
                .onChanged { value in
                    if !isDragging {
                        onDragStart()
                    }
                    dragOffset = value.translation
                }
                .onEnded { value in
                    // Calculate which position the badge was dropped at
                    let dragDistance = value.translation.width
                    let cardWidth: CGFloat = 120 // Approximate card width with spacing
                    let positionsMovedInReorder = Int(round(dragDistance / cardWidth))
                    let newIndex = max(0, index + positionsMovedInReorder)

                    onDragEnd(index, newIndex)

                    withAnimation(.spring()) {
                        dragOffset = .zero
                    }
                }
        )
        .animation(.spring(), value: isDragging)
        .animation(.spring(), value: dragOffset)
    }
}

// MARK: - Badge Management Row

struct BadgeManagementRow: View {
    let badge: ManagedBadge

    var body: some View {
        HStack(spacing: 16) {
            // Drag handle
            Image(systemName: "line.3.horizontal")
                .font(.title3)
                .foregroundColor(.secondary)

            // Badge preview
            HStack(spacing: 8) {
                Image(systemName: badge.icon)
                    .font(.body)
                    .foregroundColor(Color(hex: badge.color) ?? .blue)

                Text(badge.name)
                    .font(.body)
                    .fontWeight(.medium)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background((Color(hex: badge.color) ?? .blue).opacity(0.15))
            .cornerRadius(16)

            Spacer()

            // Engagement indicator (pulse/glow based on engagement score)
            EngagementIndicator(engagementScore: badge.engagementScore)

            // Usage count
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(badge.usageCount)")
                    .font(.body)
                    .fontWeight(.semibold)
                Text("emails")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Engagement Indicator

struct EngagementIndicator: View {
    let engagementScore: Double

    var body: some View {
        ZStack {
            // Pulsing circle for high engagement
            if engagementScore > 0.7 {
                Circle()
                    .fill(indicatorColor.opacity(0.3))
                    .frame(width: 40, height: 40)
                    .scaleEffect(pulseAnimation ? 1.2 : 1.0)
                    .animation(
                        Animation.easeInOut(duration: 1.5).repeatForever(autoreverses: true),
                        value: pulseAnimation
                    )
            }

            Circle()
                .fill(indicatorColor)
                .frame(width: 24, height: 24)
        }
        .onAppear {
            if engagementScore > 0.7 {
                pulseAnimation = true
            }
        }
    }

    @State private var pulseAnimation = false

    private var indicatorColor: Color {
        if engagementScore >= 0.7 {
            return .green
        } else if engagementScore >= 0.4 {
            return .yellow
        } else {
            return .gray
        }
    }
}

// MARK: - Search Bar

struct SearchBar: View {
    @Binding var text: String

    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)

            TextField("Search badges...", text: $text)
                .textFieldStyle(.plain)

            if !text.isEmpty {
                Button(action: {
                    text = ""
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(12)
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }
}

// MARK: - ViewModel

@MainActor
class BadgeManagementViewModel: ObservableObject {
    @Published var badges: [ManagedBadge] = []
    @Published var isSaving = false
    @Published var isLoading = false

    private let apiService = APIService.shared

    func loadBadges() async {
        isLoading = true
        defer { isLoading = false }

        do {
            // Get user badge definitions which include all badge metadata
            let badgeDefs = try await apiService.getUserBadgeDefinitions()

            badges = badgeDefs.map { def in
                ManagedBadge(
                    name: def.badgeName,
                    color: def.badgeColor,
                    icon: def.badgeIcon,
                    category: def.category ?? "Other",
                    usageCount: def.usageCount,
                    engagementScore: def.engagementScore ?? 0.5,
                    displayOrder: def.displayOrder ?? 0
                )
            }
            .sorted {
                // Sort by display order first, then by engagement score
                if $0.displayOrder == $1.displayOrder {
                    return $0.engagementScore > $1.engagementScore
                }
                return $0.displayOrder < $1.displayOrder
            }

            print("✅ Loaded \(badges.count) badges for management")
        } catch {
            print("❌ Error loading badges: \(error)")
        }
    }

    func moveBadges(from source: IndexSet, to destination: Int) {
        badges.move(fromOffsets: source, toOffset: destination)

        // Update display order
        for (index, _) in badges.enumerated() {
            badges[index].displayOrder = index
        }
    }

    func saveDisplayOrder() async {
        isSaving = true
        defer { isSaving = false }

        do {
            // Prepare badge order data
            let badgeOrder = badges.map { badge in
                return ["badge_name": badge.name, "order": badge.displayOrder] as [String : Any]
            }

            // Call API to save badge display order
            try await apiService.updateBadgeOrder(badgeOrder: badgeOrder)

            print("✅ Saved badge order: \(badges.map { ($0.name, $0.displayOrder) })")
        } catch {
            print("❌ Failed to save badge order: \(error)")
        }
    }
}

// MARK: - Managed Badge Model

struct ManagedBadge: Identifiable {
    let id = UUID()
    let name: String
    let color: String
    let icon: String
    let category: String
    let usageCount: Int
    let engagementScore: Double
    var displayOrder: Int
}

// MARK: - Preview

struct BadgeManagementScreen_Previews: PreviewProvider {
    static var previews: some View {
        BadgeManagementScreen()
    }
}
