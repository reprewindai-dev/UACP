export enum PlanStatus {
  DRAFT = 'draft',
  VERIFIED = 'verified',
  LOCKED = 'locked'
}

export enum RunStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface GraphNode {
  id: string;
  type: 'quantum' | 'classical';
  description: string;
  policy_tag?: string;
  entropy?: number;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface PlanGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Plan {
  id: string;
  name: string;
  intent: string;
  revision: number;
  status: PlanStatus;
  graph: PlanGraph;
  createdAt: string;
}

export interface Run {
  id: string;
  planId: string;
  status: RunStatus;
  currentStep: string;
  progress: number;
  output?: string;
  startTime: string;
  endTime?: string;
}

export interface AppEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ObservabilitySignals {
  quantum_coherence: number;
  classical_latency: number;
  uacp_pressure: number;
  gopher_policy_alignment: number;
  horowitz_signals: Array<{ id: string; value: number; trend: string }>;
}
