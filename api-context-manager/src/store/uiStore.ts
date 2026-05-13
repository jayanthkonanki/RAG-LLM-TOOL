import { create } from 'zustand';
import type { TabId, BottomTabId } from '@/types';

type PanelView = 'endpoints' | 'files' | 'applications';

interface UIState {
  // Sidebar
  sidebarWidth: number;
  expandedApps: Set<string>;
  expandedGroups: Set<string>;
  activePanelView: PanelView;

  // Active selection
  selectedApplicationId: string | null;
  selectedGroupId: string | null;
  selectedEndpointId: string | null;

  // Tabs
  openEndpointIds: string[];
  activeEndpointId: string | null;
  activeTab: TabId;
  activeBottomTab: BottomTabId;

  // Right panel
  rightPanelOpen: boolean;
  bottomPanelOpen: boolean;
  bottomPanelHeight: number;

  // Search
  searchOpen: boolean;
  searchQuery: string;

  // Modals
  createAppModalOpen: boolean;
  createGroupModalOpen: boolean;
  createEndpointModalOpen: boolean;

  // Actions
  toggleApp: (id: string) => void;
  toggleGroup: (id: string) => void;
  selectEndpoint: (id: string) => void;
  closeEndpointTab: (id: string) => void;
  setActiveTab: (tab: TabId) => void;
  setActiveBottomTab: (tab: BottomTabId) => void;
  setActivePanelView: (view: PanelView) => void;
  setSelectedApplication: (id: string | null) => void;
  setSelectedGroup: (id: string | null) => void;
  toggleRightPanel: () => void;
  toggleBottomPanel: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (q: string) => void;
  openCreateAppModal: () => void;
  closeCreateAppModal: () => void;
  openCreateGroupModal: (appId?: string) => void;
  closeCreateGroupModal: () => void;
  openCreateEndpointModal: (groupId?: string) => void;
  closeCreateEndpointModal: () => void;
  pendingGroupAppId: string | null;
  pendingEndpointGroupId: string | null;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarWidth: 260,
  expandedApps: new Set(['app-1']),
  expandedGroups: new Set(['grp-1']),
  activePanelView: 'endpoints',

  selectedApplicationId: null,
  selectedGroupId: null,
  selectedEndpointId: 'ep-1',

  openEndpointIds: ['ep-1'],
  activeEndpointId: 'ep-1',
  activeTab: 'overview',
  activeBottomTab: 'context-preview',

  rightPanelOpen: true,
  bottomPanelOpen: true,
  bottomPanelHeight: 200,

  searchOpen: false,
  searchQuery: '',

  createAppModalOpen: false,
  createGroupModalOpen: false,
  createEndpointModalOpen: false,
  pendingGroupAppId: null,
  pendingEndpointGroupId: null,

  toggleApp: (id) =>
    set((state) => {
      const next = new Set(state.expandedApps);
      next.has(id) ? next.delete(id) : next.add(id);
      return { expandedApps: next };
    }),

  toggleGroup: (id) =>
    set((state) => {
      const next = new Set(state.expandedGroups);
      next.has(id) ? next.delete(id) : next.add(id);
      return { expandedGroups: next };
    }),

  selectEndpoint: (id) =>
    set((state) => {
      const alreadyOpen = state.openEndpointIds.includes(id);
      return {
        selectedEndpointId: id,
        activeEndpointId: id,
        openEndpointIds: alreadyOpen ? state.openEndpointIds : [...state.openEndpointIds, id],
        activeTab: 'overview',
      };
    }),

  closeEndpointTab: (id) =>
    set((state) => {
      const remaining = state.openEndpointIds.filter((eid) => eid !== id);
      const newActive = state.activeEndpointId === id ? (remaining[remaining.length - 1] ?? null) : state.activeEndpointId;
      return { openEndpointIds: remaining, activeEndpointId: newActive, selectedEndpointId: newActive };
    }),

  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveBottomTab: (tab) => set({ activeBottomTab: tab }),
  setActivePanelView: (view) => set({ activePanelView: view }),
  setSelectedApplication: (id) => set({ selectedApplicationId: id }),
  setSelectedGroup: (id) => set({ selectedGroupId: id }),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false, searchQuery: '' }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  openCreateAppModal: () => set({ createAppModalOpen: true }),
  closeCreateAppModal: () => set({ createAppModalOpen: false }),
  openCreateGroupModal: (appId) => set({ createGroupModalOpen: true, pendingGroupAppId: appId ?? null }),
  closeCreateGroupModal: () => set({ createGroupModalOpen: false, pendingGroupAppId: null }),
  openCreateEndpointModal: (groupId) => set({ createEndpointModalOpen: true, pendingEndpointGroupId: groupId ?? null }),
  closeCreateEndpointModal: () => set({ createEndpointModalOpen: false, pendingEndpointGroupId: null }),
}));
