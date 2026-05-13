'use client';
import { useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useApplicationsStore } from '@/store/applicationsStore';
import { useEndpointsStore } from '@/store/endpointsStore';
import { Modal, FormField, inputClass, textareaClass, selectClass } from '@/components/ui/Modal';
import type { HttpMethod, EndpointCategory, RiskLevel, DataSensitivity } from '@/types';
import { MOCK_GROUPS } from '@/data/mockData';

// ─── Create Application Modal ────────────────────────────────────────────────
export function CreateAppModal() {
  const { createAppModalOpen, closeCreateAppModal } = useUIStore();
  const addApplication = useApplicationsStore((s) => s.addApplication);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addApplication(name.trim(), desc.trim(), tags.split(',').map((t) => t.trim()).filter(Boolean));
    setName(''); setDesc(''); setTags('');
    closeCreateAppModal();
  };

  return (
    <Modal open={createAppModalOpen} onClose={closeCreateAppModal} title="Create Application">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Application Name" required>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. User Service" autoFocus />
        </FormField>
        <FormField label="Description">
          <textarea className={textareaClass} rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What does this service do?" />
        </FormField>
        <FormField label="Tags" hint="Comma-separated">
          <input className={inputClass} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="auth, identity, core" />
        </FormField>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={closeCreateAppModal} className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-sm hover:bg-zinc-700 transition-colors">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">Create</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Create Group Modal ───────────────────────────────────────────────────────
export function CreateGroupModal() {
  const { createGroupModalOpen, closeCreateGroupModal, pendingGroupAppId } = useUIStore();
  const { applications, addGroup } = useApplicationsStore();
  const [appId, setAppId] = useState(pendingGroupAppId ?? applications[0]?.id ?? '');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !appId) return;
    addGroup(appId, name.trim(), desc.trim());
    setName(''); setDesc('');
    closeCreateGroupModal();
  };

  return (
    <Modal open={createGroupModalOpen} onClose={closeCreateGroupModal} title="Create Endpoint Group">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Application" required>
          <select className={selectClass} value={appId} onChange={(e) => setAppId(e.target.value)}>
            {applications.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </FormField>
        <FormField label="Group Name" required>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Auth APIs" autoFocus />
        </FormField>
        <FormField label="Description">
          <textarea className={textareaClass} rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Purpose of this group" />
        </FormField>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={closeCreateGroupModal} className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-sm hover:bg-zinc-700 transition-colors">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">Create</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Create Endpoint Modal ────────────────────────────────────────────────────
const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const CATEGORIES: EndpointCategory[] = ['authentication', 'data-retrieval', 'data-mutation', 'file-management', 'notification', 'analytics', 'admin', 'webhook', 'streaming', 'utility'];
const RISK_LEVELS: RiskLevel[] = ['safe', 'low', 'medium', 'high', 'critical'];

export function CreateEndpointModal() {
  const { createEndpointModalOpen, closeCreateEndpointModal, pendingEndpointGroupId } = useUIStore();
  const { applications, groups } = useApplicationsStore();
  const { addEndpoint, endpoints } = useEndpointsStore();

  const allGroups = groups;

  const [form, setForm] = useState({
    groupId: pendingEndpointGroupId ?? allGroups[0]?.id ?? '',
    name: '',
    method: 'GET' as HttpMethod,
    path: '',
    shortDescription: '',
    longDescription: '',
    category: 'data-retrieval' as EndpointCategory,
    tags: '',
    riskLevel: 'safe' as RiskLevel,
    businessPurpose: '',
    executionIntent: '',
    whenToUse: '',
    whenNotToUse: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.path.trim()) return;
    const group = allGroups.find((g) => g.id === form.groupId);
    if (!group) return;

    addEndpoint({
      groupId: form.groupId,
      applicationId: group.applicationId,
      name: form.name.trim(),
      method: form.method,
      path: form.path.trim(),
      shortDescription: form.shortDescription.trim(),
      longDescription: form.longDescription.trim(),
      category: form.category,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      riskLevel: form.riskLevel,
      aiReadabilityScore: 40,
      requestSchema: { headers: [], queryParams: [], bodySchema: {}, requiredFields: [], optionalFields: [], validationNotes: '' },
      responseSchema: { successSchema: {}, successExample: {}, failureExamples: [], commonErrors: [], edgeCases: [] },
      agentContext: {
        toolName: form.name.toLowerCase().replace(/\s+/g, '_'),
        naturalLanguageDescription: form.shortDescription,
        usageGuidance: '',
        executionExamples: [],
        failureScenarios: [],
        operationalWarnings: [],
        semanticTags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        businessDomain: '',
        recommendedExecutionOrder: null,
        whenToUse: form.whenToUse,
        whenNotToUse: form.whenNotToUse,
        existingRisks: [],
        existingDependencies: [],
      },
      agentContextLabels: {
        businessPurpose: form.businessPurpose,
        executionIntent: form.executionIntent,
        expectedOutcome: '',
        requiredConditions: '',
        unsafeOperationsWarning: '',
        sideEffects: '',
        dependencies: [],
        requiredAuthentication: '',
        dataSensitivity: 'internal' as DataSensitivity,
        rateLimitAwareness: '',
        idempotent: form.method === 'GET',
        retrySafe: form.method === 'GET',
      },
      notes: '',
    });
    closeCreateEndpointModal();
  };

  return (
    <Modal open={createEndpointModalOpen} onClose={closeCreateEndpointModal} title="Create Endpoint" width="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Basic */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Group" required>
            <select className={selectClass} value={form.groupId} onChange={(e) => set('groupId', e.target.value)}>
              {allGroups.map((g) => {
                const app = applications.find((a) => a.id === g.applicationId);
                return <option key={g.id} value={g.id}>{app?.name} / {g.name}</option>;
              })}
            </select>
          </FormField>
          <FormField label="HTTP Method" required>
            <select className={selectClass} value={form.method} onChange={(e) => set('method', e.target.value)}>
              {HTTP_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </FormField>
        </div>

        <FormField label="Endpoint Name" required>
          <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Get User Profile" autoFocus />
        </FormField>

        <FormField label="URL Path" required>
          <input className={inputClass} value={form.path} onChange={(e) => set('path', e.target.value)} placeholder="/users/{userId}/profile" />
        </FormField>

        <FormField label="Short Description">
          <input className={inputClass} value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} placeholder="One-line description" />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Category">
            <select className={selectClass} value={form.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>)}
            </select>
          </FormField>
          <FormField label="Risk Level">
            <select className={selectClass} value={form.riskLevel} onChange={(e) => set('riskLevel', e.target.value)}>
              {RISK_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </FormField>
        </div>

        <FormField label="Tags" hint="Comma-separated">
          <input className={inputClass} value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="auth, read, user" />
        </FormField>

        <div className="border-t border-zinc-800 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400 mb-3">AI Context Labels</p>
          <div className="space-y-3">
            <FormField label="Business Purpose">
              <input className={inputClass} value={form.businessPurpose} onChange={(e) => set('businessPurpose', e.target.value)} placeholder="Why does this endpoint exist?" />
            </FormField>
            <FormField label="Execution Intent">
              <input className={inputClass} value={form.executionIntent} onChange={(e) => set('executionIntent', e.target.value)} placeholder="What action does this perform?" />
            </FormField>
            <FormField label="When to Use">
              <input className={inputClass} value={form.whenToUse} onChange={(e) => set('whenToUse', e.target.value)} placeholder="When should an agent call this?" />
            </FormField>
            <FormField label="When NOT to Use">
              <input className={inputClass} value={form.whenNotToUse} onChange={(e) => set('whenNotToUse', e.target.value)} placeholder="When should agents avoid this?" />
            </FormField>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-zinc-800">
          <button type="button" onClick={closeCreateEndpointModal} className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-sm hover:bg-zinc-700 transition-colors">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">Create Endpoint</button>
        </div>
      </form>
    </Modal>
  );
}
