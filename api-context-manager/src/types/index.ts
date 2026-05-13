export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export type DataSensitivity = 'public' | 'internal' | 'confidential' | 'restricted';

export type EndpointCategory =
  | 'authentication'
  | 'data-retrieval'
  | 'data-mutation'
  | 'file-management'
  | 'notification'
  | 'analytics'
  | 'admin'
  | 'webhook'
  | 'streaming'
  | 'utility';

export interface Tag {
  id: string;
  label: string;
  color: string;
}

export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: string | number | boolean | null;
}

export interface RequestSchema {
  headers: SchemaField[];
  queryParams: SchemaField[];
  bodySchema: Record<string, unknown>;
  requiredFields: string[];
  optionalFields: string[];
  validationNotes: string;
}

export interface ResponseSchema {
  successSchema: Record<string, unknown>;
  successExample: Record<string, unknown>;
  failureExamples: Array<{ status: number; body: Record<string, unknown>; description: string }>;
  commonErrors: string[];
  edgeCases: string[];
}

export interface AgentContext {
  toolName: string;
  naturalLanguageDescription: string;
  usageGuidance: string;
  executionExamples: string[];
  failureScenarios: string[];
  operationalWarnings: string[];
  semanticTags: string[];
  businessDomain: string;
  recommendedExecutionOrder: number | null;
  whenToUse: string;
  whenNotToUse: string;
  existingRisks: string[];
  existingDependencies: string[];
}

export interface AgentContextLabels {
  businessPurpose: string;
  executionIntent: string;
  expectedOutcome: string;
  requiredConditions: string;
  unsafeOperationsWarning: string;
  sideEffects: string;
  dependencies: string[];
  requiredAuthentication: string;
  dataSensitivity: DataSensitivity;
  rateLimitAwareness: string;
  idempotent: boolean;
  retrySafe: boolean;
}

export interface Endpoint {
  id: string;
  groupId: string;
  applicationId: string;
  name: string;
  method: HttpMethod;
  path: string;
  shortDescription: string;
  longDescription: string;
  category: EndpointCategory;
  tags: string[];
  riskLevel: RiskLevel;
  requestSchema: RequestSchema;
  responseSchema: ResponseSchema;
  agentContext: AgentContext;
  agentContextLabels: AgentContextLabels;
  notes: string;
  aiReadabilityScore: number; // 0–100 mock score
  createdAt: string;
  updatedAt: string;
}

export interface EndpointGroup {
  id: string;
  applicationId: string;
  name: string;
  description: string;
  endpointIds: string[];
  createdAt: string;
}

export interface Application {
  id: string;
  name: string;
  description: string;
  tags: string[];
  groupIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  extension?: string;
  children?: FileNode[];
  size?: string;
}

export type TabId = 'overview' | 'request' | 'response' | 'ai-context' | 'examples' | 'notes';
export type BottomTabId = 'notes' | 'context-preview' | 'json-preview' | 'agent-prompt';
