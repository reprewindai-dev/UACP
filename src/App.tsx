import { useState, useEffect } from 'react';
import type { Plan, Run, AppEvent, ObservabilitySignals } from './types';

type Tab = 'intent' | 'execution' | 'ops';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('intent');
  const [intent, setIntent] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [signals, setSignals] = useState<ObservabilitySignals | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/plans').then(r => r.json()),
      fetch('/api/runs').then(r => r.json()),
      fetch('/api/events').then(r => r.json()),
      fetch('/api/bootstrap').then(r => r.json()),
    ]).then(([p, r, e]) => {
      setPlans(p);
      setRuns(r);
      setEvents(e);
    }).catch(console.error);

    const interval = setInterval(() => {
      fetch('/api/observability/signals')
        .then(r => r.json())
        .then(setSignals)
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCreatePlan = async () => {
    if (!intent.trim() || loading) return;
    setLoading(true);
    try {
      const graph = generateGraph(intent);
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Plan: ${intent.slice(0, 40)}`, intent, graph })
      });
      const plan = await res.json();
      setPlans(prev => [plan, ...prev]);
      setIntent('');
      setActiveTab('execution');
    } catch (err) {
      console.error('Plan creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRun = async (planId: string) => {
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });
      const run = await res.json();
      setRuns(prev => [run, ...prev]);
      setActiveTab('ops');

      const poll = setInterval(async () => {
        const updated = await fetch('/api/runs').then(r => r.json());
        setRuns(updated);
        const current = updated.find((r: Run) => r.id === run.id);
        if (current?.status === 'completed' || current?.status === 'failed') {
          clearInterval(poll);
          const evts = await fetch('/api/events').then(r => r.json());
          setEvents(evts);
        }
      }, 2000);
    } catch (err) {
      console.error('Run start error:', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#050505', color: '#e0e0e0', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#0a0a0a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
          <div>
            <div style={{ fontStyle: 'italic', fontSize: 16, letterSpacing: '-0.02em' }}>The Deterministic Engine</div>
            <div style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(59,130,246,0.6)' }}>Quantum UACP v0</div>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: 32, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
          {(['intent', 'execution', 'ops'] as Tab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: 'none', border: 'none', color: activeTab === tab ? '#3b82f6' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600, borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent', paddingBottom: 4 }}>
              {tab === 'intent' ? 'Intent Console' : tab === 'execution' ? 'Execution Graph' : 'Ops / Control Plane'}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {activeTab === 'intent' && (
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div className="glass-panel" style={{ padding: 32, borderRadius: 12 }}>
              <h2 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3b82f6', marginBottom: 16, fontFamily: 'monospace' }}>Intent Console</h2>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>Translate natural-language intent into a deterministic execution graph.</p>
              <textarea
                value={intent}
                onChange={e => setIntent(e.target.value)}
                placeholder="Describe your quantum/classical workflow intent..."
                rows={4}
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 16, color: '#e0e0e0', fontSize: 14, fontFamily: "'Inter', sans-serif", resize: 'vertical', outline: 'none' }}
              />
              <button
                onClick={handleCreatePlan}
                disabled={loading || !intent.trim()}
                style={{ marginTop: 16, padding: '12px 24px', background: loading ? 'rgba(59,130,246,0.3)' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}
              >
                {loading ? 'Compiling...' : 'Compile Plan'}
              </button>
            </div>

            {/* Event Log */}
            <div className="glass-panel" style={{ padding: 24, borderRadius: 12, marginTop: 16 }}>
              <h3 style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginBottom: 12, fontFamily: 'monospace' }}>Event Log</h3>
              <div className="custom-scrollbar" style={{ maxHeight: 300, overflowY: 'auto' }}>
                {events.map(evt => (
                  <div key={evt.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 11 }}>
                    <span style={{ fontFamily: 'monospace', color: '#3b82f6', marginRight: 8, fontSize: 9 }}>{evt.type}</span>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>{evt.message}</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: 12, fontSize: 9, fontFamily: 'monospace' }}>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'execution' && (
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <h2 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3b82f6', marginBottom: 16, fontFamily: 'monospace' }}>Execution Graphs</h2>
            {plans.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No plans yet. Use the Intent Console to create one.</p>}
            {plans.map(plan => (
              <div key={plan.id} className="glass-panel" style={{ padding: 24, borderRadius: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{plan.name}</div>
                    <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{plan.id} · r{plan.revision} · {plan.status}</div>
                  </div>
                  <button onClick={() => handleStartRun(plan.id)} style={{ padding: '8px 16px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase' }}>
                    ▶ Execute
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>{plan.intent}</div>
                {/* Graph visualization */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {plan.graph.nodes.map((node, i) => (
                    <div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ padding: '6px 10px', borderRadius: 6, fontSize: 10, fontFamily: 'monospace', background: node.type === 'quantum' ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)', border: `1px solid ${node.type === 'quantum' ? 'rgba(139,92,246,0.3)' : 'rgba(59,130,246,0.3)'}`, color: node.type === 'quantum' ? '#a78bfa' : '#60a5fa' }}>
                        {node.description}
                      </div>
                      {i < plan.graph.nodes.length - 1 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>→</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'ops' && (
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <h2 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3b82f6', marginBottom: 16, fontFamily: 'monospace' }}>Operations / Control Plane</h2>

            {/* Signals */}
            {signals && (
              <div className="glass-panel" style={{ padding: 24, borderRadius: 12, marginBottom: 16 }}>
                <h3 style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginBottom: 12, fontFamily: 'monospace' }}>Observability Signals</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <SignalCard label="Quantum Coherence" value={`${signals.quantum_coherence.toFixed(1)}%`} color="#8b5cf6" />
                  <SignalCard label="Classical Latency" value={`${signals.classical_latency.toFixed(1)}ms`} color="#3b82f6" />
                  <SignalCard label="UACP Pressure" value={signals.uacp_pressure.toFixed(3)} color="#f59e0b" />
                  <SignalCard label="Policy Alignment" value={signals.gopher_policy_alignment.toFixed(4)} color="#10b981" />
                </div>
              </div>
            )}

            {/* Runs */}
            <div className="glass-panel" style={{ padding: 24, borderRadius: 12 }}>
              <h3 style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginBottom: 12, fontFamily: 'monospace' }}>Active Runs</h3>
              {runs.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No runs yet. Execute a plan to start one.</p>}
              {runs.map(run => (
                <div key={run.id} style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{run.id}</span>
                    <StatusBadge status={run.status} />
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{run.currentStep}</div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${run.progress}%`, background: run.status === 'completed' ? '#10b981' : '#3b82f6', borderRadius: 2, transition: 'width 0.5s' }} />
                  </div>
                  {run.output && <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>{run.output}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SignalCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: 6, fontFamily: 'monospace' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { pending: '#f59e0b', executing: '#3b82f6', completed: '#10b981', failed: '#ef4444' };
  return (
    <span style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 4, background: `${colors[status] || '#666'}22`, color: colors[status] || '#666', border: `1px solid ${colors[status] || '#666'}44` }}>
      {status}
    </span>
  );
}

function generateGraph(intent: string) {
  const words = intent.toLowerCase().split(' ');
  const hasQuantum = words.some(w => ['quantum', 'hhl', 'vqe', 'qubit', 'superposition', 'entangle'].includes(w));
  const nodes = [
    { id: 'n1', type: 'classical' as const, description: 'Input validation & pre-processing', entropy: 0.05 },
    ...(hasQuantum ? [
      { id: 'n2', type: 'quantum' as const, description: 'Quantum state preparation', entropy: 0.6 },
      { id: 'n3', type: 'quantum' as const, description: 'Quantum circuit execution', entropy: 0.7 },
    ] : [
      { id: 'n2', type: 'classical' as const, description: 'Compute pipeline stage 1', entropy: 0.1 },
      { id: 'n3', type: 'classical' as const, description: 'Compute pipeline stage 2', entropy: 0.15 },
    ]),
    { id: 'n4', type: 'classical' as const, description: 'Result aggregation & verification', entropy: 0.08 }
  ];
  const edges = nodes.slice(1).map((n, i) => ({ from: nodes[i].id, to: n.id }));
  return { nodes, edges };
}
