import { create } from 'zustand';
import type { Application, EndpointGroup } from '@/types';
import { generateId } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApplicationsState {
  applications: Application[];
  groups: EndpointGroup[];
  loading: boolean;
  // Fetch from backend
  fetchApplications: () => Promise<void>;
  fetchGroups: () => Promise<void>;
  // CRUD
  addApplication: (name: string, description: string, tags: string[]) => Promise<string>;
  deleteApplication: (id: string) => Promise<void>;
  addGroup: (applicationId: string, name: string, description: string) => Promise<string>;
  deleteGroup: (id: string) => Promise<void>;
  updateApplication: (id: string, updates: Partial<Application>) => void;
}

export const useApplicationsStore = create<ApplicationsState>((set, get) => ({
  applications: [],
  groups: [],
  loading: false,

  fetchApplications: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/applications`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Normalize: backend returns snake_case, frontend types use camelCase
      const apps: Application[] = (data.applications || []).map((a: Record<string, unknown>) => ({
        id: a.id as string,
        name: a.name as string,
        description: (a.description as string) || '',
        tags: (a.tags as string[]) || [],
        groupIds: [],
        createdAt: (a.created_at as string) || new Date().toISOString(),
        updatedAt: (a.updated_at as string) || new Date().toISOString(),
      }));
      set({ applications: apps });
    } catch (err) {
      console.error('[applicationsStore] fetchApplications failed:', err);
    } finally {
      set({ loading: false });
    }
  },

  fetchGroups: async () => {
    try {
      const res = await fetch(`${API_URL}/api/groups`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const groups: EndpointGroup[] = (data.groups || []).map((g: Record<string, unknown>) => ({
        id: g.id as string,
        applicationId: g.application_id as string,
        name: g.name as string,
        description: (g.description as string) || '',
        endpointIds: [],
        createdAt: (g.created_at as string) || new Date().toISOString(),
      }));
      // Stitch groupIds into applications
      const apps = get().applications.map((app) => ({
        ...app,
        groupIds: groups.filter((g) => g.applicationId === app.id).map((g) => g.id),
      }));
      set({ groups, applications: apps });
    } catch (err) {
      console.error('[applicationsStore] fetchGroups failed:', err);
    }
  },

  addApplication: async (name, description, tags) => {
    const res = await fetch(`${API_URL}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, tags }),
    });
    if (!res.ok) throw new Error(`Failed to create application: ${res.status}`);
    const data = await res.json();
    const id = data.id as string;
    const now = new Date().toISOString();
    set((state) => ({
      applications: [
        ...state.applications,
        { id, name, description, tags, groupIds: [], createdAt: now, updatedAt: now },
      ],
    }));
    return id;
  },

  deleteApplication: async (id) => {
    await fetch(`${API_URL}/api/applications/${id}`, { method: 'DELETE' });
    set((state) => ({
      applications: state.applications.filter((a) => a.id !== id),
      groups: state.groups.filter((g) => g.applicationId !== id),
    }));
  },

  addGroup: async (applicationId, name, description) => {
    const res = await fetch(`${API_URL}/api/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ application_id: applicationId, name, description }),
    });
    if (!res.ok) throw new Error(`Failed to create group: ${res.status}`);
    const data = await res.json();
    const id = data.id as string;
    const now = new Date().toISOString();
    set((state) => ({
      groups: [...state.groups, { id, applicationId, name, description, endpointIds: [], createdAt: now }],
      applications: state.applications.map((a) =>
        a.id === applicationId ? { ...a, groupIds: [...a.groupIds, id] } : a
      ),
    }));
    return id;
  },

  deleteGroup: async (id) => {
    await fetch(`${API_URL}/api/groups/${id}`, { method: 'DELETE' });
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== id),
      applications: state.applications.map((a) => ({
        ...a,
        groupIds: a.groupIds.filter((gid) => gid !== id),
      })),
    }));
  },

  updateApplication: (id, updates) => {
    set((state) => ({
      applications: state.applications.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
      ),
    }));
  },
}));
