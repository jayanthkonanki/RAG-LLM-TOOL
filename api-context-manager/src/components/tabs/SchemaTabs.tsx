'use client';
import { useUIStore } from '@/store/uiStore';
import { useEndpointsStore } from '@/store/endpointsStore';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { useState } from 'react';

export function RequestSchemaTab() {
  const activeEndpointId = useUIStore((s) => s.activeEndpointId);
  const endpoint = useEndpointsStore((s) => s.endpoints.find((e) => e.id === activeEndpointId));
  if (!endpoint) return null;

  const { requestSchema } = endpoint;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
      {/* Headers */}
      {requestSchema.headers.length > 0 && (
        <SchemaSection title="Headers">
          <FieldsTable fields={requestSchema.headers} />
        </SchemaSection>
      )}

      {/* Query params */}
      {requestSchema.queryParams.length > 0 && (
        <SchemaSection title="Query Parameters">
          <FieldsTable fields={requestSchema.queryParams} />
        </SchemaSection>
      )}

      {/* Required / Optional fields */}
      <SchemaSection title="Fields">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Required</p>
            {requestSchema.requiredFields.length > 0 ? (
              <ul className="space-y-1">
                {requestSchema.requiredFields.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-zinc-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <code>{f}</code>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-zinc-600">None</p>}
          </div>
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Optional</p>
            {requestSchema.optionalFields.length > 0 ? (
              <ul className="space-y-1">
                {requestSchema.optionalFields.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-zinc-500">
                    <Circle className="w-3 h-3 text-zinc-600 shrink-0" />
                    <code>{f}</code>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-zinc-600">None</p>}
          </div>
        </div>
      </SchemaSection>

      {/* Body schema */}
      {Object.keys(requestSchema.bodySchema).length > 0 && (
        <SchemaSection title="Body Schema">
          <JsonBlock data={requestSchema.bodySchema} />
        </SchemaSection>
      )}

      {/* Validation notes */}
      {requestSchema.validationNotes && (
        <SchemaSection title="Validation Notes">
          <p className="text-sm text-zinc-400 leading-relaxed">{requestSchema.validationNotes}</p>
        </SchemaSection>
      )}
    </div>
  );
}

export function ResponseSchemaTab() {
  const activeEndpointId = useUIStore((s) => s.activeEndpointId);
  const endpoint = useEndpointsStore((s) => s.endpoints.find((e) => e.id === activeEndpointId));
  if (!endpoint) return null;

  const { responseSchema } = endpoint;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
      <SchemaSection title="Success Schema">
        <JsonBlock data={responseSchema.successSchema} />
      </SchemaSection>

      <SchemaSection title="Success Example">
        <JsonBlock data={responseSchema.successExample} />
      </SchemaSection>

      <SchemaSection title="Failure Examples">
        <div className="space-y-3">
          {responseSchema.failureExamples.map((ex, i) => (
            <div key={i} className="border border-zinc-800 rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-2 bg-red-500/5 border-b border-zinc-800">
                <span className="text-xs font-mono font-bold text-red-400">{ex.status}</span>
                <span className="text-xs text-zinc-500">{ex.description}</span>
              </div>
              <JsonBlock data={ex.body} className="border-0 rounded-none" />
            </div>
          ))}
        </div>
      </SchemaSection>

      <SchemaSection title="Common Errors">
        <ul className="space-y-1">
          {responseSchema.commonErrors.map((e, i) => (
            <li key={i} className="text-xs text-zinc-400 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-red-400/50 shrink-0" />
              {e}
            </li>
          ))}
        </ul>
      </SchemaSection>

      {responseSchema.edgeCases.length > 0 && (
        <SchemaSection title="Edge Cases">
          <ul className="space-y-1">
            {responseSchema.edgeCases.map((e, i) => (
              <li key={i} className="text-xs text-zinc-400 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-yellow-400/50 shrink-0" />
                {e}
              </li>
            ))}
          </ul>
        </SchemaSection>
      )}
    </div>
  );
}

export function NotesTab() {
  const activeEndpointId = useUIStore((s) => s.activeEndpointId);
  const endpoint = useEndpointsStore((s) => s.endpoints.find((e) => e.id === activeEndpointId));
  const updateEndpoint = useEndpointsStore((s) => s.updateEndpoint);

  if (!endpoint) return null;

  return (
    <div className="flex-1 flex flex-col px-6 py-5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">Notes</p>
      <textarea
        value={endpoint.notes}
        onChange={(e) => updateEndpoint(endpoint.id, { notes: e.target.value })}
        placeholder="Add implementation notes, TODOs, or context for this endpoint..."
        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 placeholder-zinc-700 resize-none outline-none focus:border-zinc-600 transition-colors leading-relaxed"
      />
    </div>
  );
}

function SchemaSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-zinc-900 text-left hover:bg-zinc-800/50 transition-colors"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5 text-zinc-600" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />}
        <span className="text-xs font-semibold text-zinc-400">{title}</span>
      </button>
      {open && <div className="px-4 py-4 bg-zinc-950/50">{children}</div>}
    </div>
  );
}

function FieldsTable({ fields }: { fields: Array<{ name: string; type: string; required: boolean; description: string; example?: unknown }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left pb-2 pr-4 text-zinc-600 font-medium">Name</th>
            <th className="text-left pb-2 pr-4 text-zinc-600 font-medium">Type</th>
            <th className="text-left pb-2 pr-4 text-zinc-600 font-medium">Required</th>
            <th className="text-left pb-2 text-zinc-600 font-medium">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {fields.map((f) => (
            <tr key={f.name}>
              <td className="py-2 pr-4"><code className="text-blue-300">{f.name}</code></td>
              <td className="py-2 pr-4"><code className="text-purple-300">{f.type}</code></td>
              <td className="py-2 pr-4">
                {f.required
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  : <Circle className="w-3.5 h-3.5 text-zinc-600" />}
              </td>
              <td className="py-2 text-zinc-500">{f.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JsonBlock({ data, className }: { data: Record<string, unknown>; className?: string }) {
  return (
    <pre className={cn('bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-xs text-emerald-300 font-mono overflow-x-auto leading-relaxed', className)}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
