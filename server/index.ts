import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import type { Plan, Run, AppEvent, ObservabilitySignals } from '../src/types';
import { seedPlans, seedRuns, seedEvents } from '../src/data/mockData';

const app = express();
const server = createServer(app);
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());

// --- In-memory state ---
const plans: Plan[] = [...seedPlans];
const runs: Run[] = [...seedRuns];
const events: AppEvent[] = [...seedEvents];

function addEvent(type: string, message: string, metadata?: Record<string, unknown>) {
  const event: AppEvent = {
    id: `evt-${Math.random().toString(36).substring(2, 9)}`,
    type,
    message,
    timestamp: new Date().toISOString(),
    metadata
  };
  events.push(event);
  return event;
}

// --- API Routes ---

app.get('/api/bootstrap', (_req, res) => {
  res.json({
    system: 'Quantum UACP v0',
    version: '0.2.0',
    status: 'operational',
    identity: 'Gopher-Engine',
    surfaces: ['Intent Console', 'Execution Graph', 'Ops / Control Plane'],
    planCount: plans.length,
    runCount: runs.length
  });
});

app.get('/api/plans', (_req, res) => res.json(plans));

app.post('/api/plans', (req, res) => {
  const { name, intent, graph } = req.body;
  if (!intent) return res.status(400).json({ error: 'Intent required' });

  const newPlan: Plan = {
    id: `p-${Math.random().toString(36).substring(2, 9)}`,
    name: name || 'New Plan',
    intent,
    revision: 1,
    status: 'draft' as any,
    graph: graph || { nodes: [], edges: [] },
    createdAt: new Date().toISOString()
  };

  plans.push(newPlan);
  addEvent('PLAN_CREATED', `New plan created: ${newPlan.id} (${newPlan.name})`, { planId: newPlan.id });
  res.json(newPlan);
});

app.post('/api/plans/:id/status', (req, res) => {
  const plan = plans.find(p => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const { status } = req.body;
  if (!['draft', 'verified', 'locked'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  plan.status = status;
  addEvent('PLAN_STATUS', `Plan ${plan.id} status → ${status}`, { planId: plan.id, status });
  res.json(plan);
});

app.post('/api/plans/:id/revise', (req, res) => {
  const plan = plans.find(p => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  plan.revision += 1;
  if (req.body.graph) plan.graph = req.body.graph;
  addEvent('PLAN_REVISED', `Plan ${plan.id} revised to r${plan.revision}`, { planId: plan.id, revision: plan.revision });
  res.json(plan);
});

app.get('/api/runs', (_req, res) => res.json(runs));

app.post('/api/runs', (req, res) => {
  const { planId } = req.body;
  const plan = plans.find(p => p.id === planId);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const newRun: Run = {
    id: `run-${Math.random().toString(36).substring(2, 9)}`,
    planId,
    status: 'pending' as any,
    currentStep: 'Initializing Gateway',
    progress: 0,
    startTime: new Date().toISOString()
  };
  runs.push(newRun);
  addEvent('RUN_STARTED', `Execution run started for plan ${planId}`, { runId: newRun.id, planId });
  simulateExecution(newRun, plan);
  res.json(newRun);
});

app.post('/api/runs/:id/status', (req, res) => {
  const run = runs.find(r => r.id === req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  run.status = req.body.status;
  res.json(run);
});

app.post('/api/gateway/execute', (req, res) => {
  const { planId } = req.body;
  const plan = plans.find(p => p.id === planId);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  if (plan.status !== 'verified' && plan.status !== 'locked') {
    return res.status(403).json({ error: 'Plan must be verified or locked for gateway admission' });
  }
  const newRun: Run = {
    id: `run-${Math.random().toString(36).substring(2, 9)}`,
    planId,
    status: 'pending' as any,
    currentStep: 'Gateway Admission',
    progress: 0,
    startTime: new Date().toISOString()
  };
  runs.push(newRun);
  addEvent('GATEWAY_EXECUTE', `Gateway admitted plan ${planId}`, { runId: newRun.id, planId });
  simulateExecution(newRun, plan);
  res.json(newRun);
});

app.post('/api/policies/evaluate', (req, res) => {
  const { planId } = req.body;
  const plan = plans.find(p => p.id === planId);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const violations = plan.graph.nodes
    .filter(n => (n.entropy || 0) > 0.8)
    .map(n => ({ nodeId: n.id, reason: `Entropy ${n.entropy} exceeds threshold 0.8` }));
  res.json({
    planId,
    compliant: violations.length === 0,
    violations,
    evaluatedAt: new Date().toISOString()
  });
});

app.get('/api/events', (_req, res) => res.json(events));

app.get('/api/observability/signals', (_req, res) => {
  const t = Date.now();
  const signals: ObservabilitySignals = {
    quantum_coherence: 88 + Math.sin(t / 5000) * 5,
    classical_latency: 14 + Math.cos(t / 3000) * 3,
    uacp_pressure: 0.05 + Math.sin(t / 10000) * 0.02,
    gopher_policy_alignment: 0.992 + Math.random() * 0.005,
    horowitz_signals: [
      { id: 'UACP_PRESSURE', value: 0.82 + Math.sin(t / 10000) * 0.1, trend: 'rising' },
      { id: 'COHERENCE_TRANSITION', value: 0.45 + Math.cos(t / 6000) * 0.05, trend: 'stable' },
      { id: 'SIGNAL_NOISE', value: 0.12 + Math.sin(t / 2000) * 0.02, trend: 'falling' }
    ]
  };
  res.json(signals);
});

app.post('/api/reset', (_req, res) => {
  plans.length = 0;
  runs.length = 0;
  events.length = 0;
  addEvent('SYSTEM_RESET', 'Control plane state reset');
  res.json({ status: 'reset' });
});

async function simulateExecution(run: Run, plan: Plan) {
  const steps = plan.graph.nodes.length > 0
    ? plan.graph.nodes.map((node, i) => ({
        step: node.description,
        progress: Math.floor(((i + 1) / plan.graph.nodes.length) * 100)
      }))
    : [
        { step: 'Quantum State Preparation', progress: 20 },
        { step: 'HHL Matrix Decomposition', progress: 40 },
        { step: 'Classical Error Correction', progress: 60 },
        { step: 'VQE Optimization', progress: 80 },
        { step: 'Collapsing Result Wavefunction', progress: 100 }
      ];

  for (const s of steps) {
    await new Promise(r => setTimeout(r, 1500));
    run.status = 'executing' as any;
    run.currentStep = s.step;
    run.progress = s.progress;
    addEvent('RUN_UPDATE', `Run ${run.id}: ${s.step}`, { runId: run.id, progress: s.progress });
  }

  run.status = 'completed' as any;
  run.endTime = new Date().toISOString();
  run.output = 'Execution finalized. Deterministic outcomes verified across all nodes.';
  addEvent('RUN_COMPLETED', `Run ${run.id} finalized successfully`, { runId: run.id });
}

// --- Static serving for production ---
if (process.env.NODE_ENV === 'production') {
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`⚡ Quantum UACP v0 server running on http://localhost:${PORT}`);
});
