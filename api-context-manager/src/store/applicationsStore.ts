import { create } from 'zustand';
import type { Application, EndpointGroup } from '@/types';
import { MOCK_APPLICATIONS, MOCK_GROUPS } from '@/data/mockData';
import { generateId } from '@/lib/utils';

interface ApplicationsState {
  applications: Application[];
  groups: EndpointGroup[];
  addApplication: (name: string, description: string, tags: string[]) => string;
  updateApplication: (id: string, updates: Partial<Application>) => void;
  deleteApplication: (id: string) => void;
  addGroup: (applicationId: string, name: string, description: string) => string;
  deleteGroup: (id: string) => void;
}

export const useApplicationsStore = create<ApplicationsState>((set) => ({
  applications: MOCK_APPLICATIONS,
  groups: MOCK_GROUPS,

  addApplication: (name, description, tags) => {
    const id = `app-${generateId()}`;
    const now = new Date().toISOString();
    set((state) => ({
      applications: [
        ...state.applications,
        { id, name, description, tags, groupIds: [], createdAt: now, updatedAt: now },
      ],
    }));
    return id;
  },

  updateApplication: (id, updates) => {
    set((state) => ({
      applications: state.applications.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
      ),
    }));
  },

  deleteApplication: (id) => {
    set((state) => ({
      applications: state.applications.filter((a) => a.id !== id),
      groups: state.groups.filter((g) => g.applicationId !== id),
    }));
  },

  addGroup: (applicationId, name, description) => {
    const id = `grp-${generateId()}`;
    const now = new Date().toISOString();
    set((state) => ({
      groups: [...state.groups, { id, applicationId, name, description, endpointIds: [], createdAt: now }],
      applications: state.applications.map((a) =>
        a.id === applicationId ? { ...a, groupIds: [...a.groupIds, id] } : a
      ),
    }));
    return id;
  },

  deleteGroup: (id) => {
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== id),
      applications: state.applications.map((a) => ({
        ...a,
        groupIds: a.groupIds.filter((gid) => gid !== id),
      })),
    }));
  },
}));
