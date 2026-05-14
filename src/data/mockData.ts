import { PlanStatus, RunStatus } from '../types';
import type { Plan, Run, AppEvent } from '../types';

export const seedPlans: Plan[] = [
  {
    id: 'p-seed-001',
    name: 'HHL Matrix Inversion Pipeline',
    intent: 'Run HHL algorithm for sparse 4x4 matrix inversion with classical pre-conditioning',
    revision: 1,
    status: PlanStatus.VERIFIED,
    graph: {
      nodes: [
        { id: 'n1', type: 'classical', description: 'Load sparse matrix & pre-condition', policy_tag: 'AC-01', entropy: 0.1 },
        { id: 'n2', type: 'quantum', description: 'HHL eigenvalue decomposition', policy_tag: 'QC-04', entropy: 0.7 },
        { id: 'n3', type: 'quantum', description: 'Controlled rotation on ancilla', policy_tag: 'QC-05', entropy: 0.65 },
        { id: 'n4', type: 'classical', description: 'Post-select & extract solution vector', policy_tag: 'AC-02', entropy: 0.05 }
      ],
      edges: [
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n3' },
        { from: 'n3', to: 'n4' }
      ]
    },
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'p-seed-002',
    name: 'VQE Ground State Estimator',
    intent: 'Variational Quantum Eigensolver for H2 molecule ground state energy',
    revision: 2,
    status: PlanStatus.DRAFT,
    graph: {
      nodes: [
        { id: 'n1', type: 'classical', description: 'Initialize ansatz parameters', entropy: 0.05 },
        { id: 'n2', type: 'quantum', description: 'Prepare parameterized trial state', entropy: 0.6 },
        { id: 'n3', type: 'quantum', description: 'Measure Hamiltonian expectation value', entropy: 0.55 },
        { id: 'n4', type: 'classical', description: 'Classical optimizer step (COBYLA)', entropy: 0.1 },
        { id: 'n5', type: 'classical', description: 'Convergence check & report', entropy: 0.02 }
      ],
      edges: [
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n3' },
        { from: 'n3', to: 'n4' },
        { from: 'n4', to: 'n2' },
        { from: 'n4', to: 'n5' }
      ]
    },
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
];

export const seedRuns: Run[] = [];

export const seedEvents: AppEvent[] = [
  {
    id: 'evt-boot',
    type: 'SYSTEM_ONLINE',
    message: 'Quantum UACP Control Plane Initialized',
    timestamp: new Date().toISOString()
  }
];
