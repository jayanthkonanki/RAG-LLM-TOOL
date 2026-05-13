import { create } from 'zustand';
import type { Endpoint } from '@/types';
import { MOCK_ENDPOINTS } from '@/data/mockData';
import { generateId } from '@/lib/utils';

interface EndpointsState {
  endpoints: Endpoint[];
  addEndpoint: (endpoint: Omit<Endpoint, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateEndpoint: (id: string, updates: Partial<Endpoint>) => void;
  deleteEndpoint: (id: string) => void;
  getByGroup: (groupId: string) => Endpoint[];
  getByApplication: (applicationId: string) => Endpoint[];
  search: (query: string) => Endpoint[];
}

export const useEndpointsStore = create<EndpointsState>((set, get) => ({
  endpoints: MOCK_ENDPOINTS,

  addEndpoint: (endpoint) => {
    const id = `ep-${generateId()}`;
    const now = new Date().toISOString();
    set((state) => ({
      endpoints: [...state.endpoints, { ...endpoint, id, createdAt: now, updatedAt: now }],
    }));
    return id;
  },

  updateEndpoint: (id, updates) => {
    set((state) => ({
      endpoints: state.endpoints.map((e) =>
        e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
      ),
    }));
  },

  deleteEndpoint: (id) => {
    set((state) => ({ endpoints: state.endpoints.filter((e) => e.id !== id) }));
  },

  getByGroup: (groupId) => get().endpoints.filter((e) => e.groupId === groupId),

  getByApplication: (applicationId) =>
    get().endpoints.filter((e) => e.applicationId === applicationId),

  search: (query) => {
    const q = query.toLowerCase();
    return get().endpoints.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.path.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q)) ||
        e.agentContext.toolName.toLowerCase().includes(q) ||
        e.agentContext.businessDomain.toLowerCase().includes(q) ||
        e.agentContext.semanticTags.some((t) => t.toLowerCase().includes(q)) ||
        e.agentContextLabels.businessPurpose.toLowerCase().includes(q)
    );
  },
}));
