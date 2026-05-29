import { create } from 'zustand';
import type { Endpoint } from '@/types';
import { MOCK_ENDPOINTS } from '@/data/mockData';
import { generateId } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface EndpointsState {
  endpoints: Endpoint[];
  addEndpoint: (endpoint: Omit<Endpoint, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateEndpoint: (id: string, updates: Partial<Endpoint>) => void;
  deleteEndpoint: (id: string) => void;
  getByGroup: (groupId: string) => Endpoint[];
  getByApplication: (applicationId: string) => Endpoint[];
  search: (query: string) => Endpoint[];
  fetchEndpoints: () => Promise<void>;
}

export const useEndpointsStore = create<EndpointsState>((set, get) => ({
  endpoints: [],

  fetchEndpoints: async () => {
    try {
      const res = await fetch(`${API_URL}/api/endpoints`);
      const data = await res.json();
      if (data.endpoints) {
        set({ endpoints: data.endpoints });
      }
    } catch (error) {
      console.error('Failed to fetch endpoints', error);
    }
  },

  addEndpoint: (endpoint) => {
    const id = `ep-${generateId()}`;
    const now = new Date().toISOString();
    const newEndpoint = { ...endpoint, id, createdAt: now, updatedAt: now };
    set((state) => ({
      endpoints: [...state.endpoints, newEndpoint],
    }));

    // Save to backend
    fetch(`${API_URL}/api/endpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEndpoint),
    }).catch(console.error);

    return id;
  },

  updateEndpoint: (id, updates) => {
    set((state) => ({
      endpoints: state.endpoints.map((e) =>
        e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
      ),
    }));

    // Update in backend
    const updatedEndpoint = get().endpoints.find(e => e.id === id);
    if (updatedEndpoint) {
      fetch(`${API_URL}/api/endpoints/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEndpoint),
      }).catch(console.error);
    }
  },

  deleteEndpoint: (id) => {
    set((state) => ({ endpoints: state.endpoints.filter((e) => e.id !== id) }));

    // Delete in backend
    fetch(`${API_URL}/api/endpoints/${id}`, {
      method: 'DELETE',
    }).catch(console.error);
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