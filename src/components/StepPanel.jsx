import { useState } from 'react';
import TestCard from './TestCard.jsx';
import { runStep } from '../lib/checks.js';
import { N } from '../lib/matching.js';

// Left panel: the current step, its checks and results, and the list of all steps.
export default function StepPanel({ lab, state, setState, act }) {
  const STEPS = lab.steps;
  const s = STEPS[state.step - 1];
  const res = state.results[state.step] || { passed: false, attempts: 0, tests: null };
  const passed = res.passed || s.n === 1;
  const [entity, setEntity] = useState('');
  const [confirm, setConfirm] = useState(false);

  // You can open any step up to the first one you haven't passed
  let maxOpen = 1;
  for (const st of STEPS) {
    if (st.n === 1 || state.results[st.n]?.passed) maxOpen = st.n + 1;
    else break;
  }
  maxOpen = Math.min(maxOpen, STEPS.length);

  const go = (n) => setState((x) => ({ ...x, step: n }));

  const run = () => {
    const tests = runStep(lab, s.n, state);
    const ok = tests.every((t) => !t.problems.length);
    setState((x) => ({
      ...x,
      results: {
        ...x.results,
        [s.n]: { passed: ok || !!x.results[s.n]?.passed, attempts: (x.results[s.n]?.attempts || 0) + 1, tests, last: ok },
      },
    }));
  };

  const next = () => {
    if (s.n === 1) setState((x) => ({ ...x, results: { ...x.results, 1: { passed: true, attempts: 1, tests: [] } }, step: 2 }));
    else if (s.n < STEPS.length) go(s.n + 1);
  };

  const addEntity = (e) => {
    e.preventDefault();
    const v = entity.trim();
    if (!v) return;
    if (!state.entities.some((x) => N(x) === N(v))) setState((x) => ({ ...x, entities: [...x.entities, v] }));
    setEntity('');
  };

  const tests = res.tests;
  const nPass = tests ? tests.filter((t) => !t.problems.length).length : 0;

  return (
    <aside className="panel">
      <div className="brand">
        <a className="back" href="#" aria-label="All labs">←</a>
        <b>Database Labs</b><span>{lab.name}</span>
      </div>

      <div className="pad">
        <div className="crumbs">
          <span>Step {s.n} of {STEPS.length}</span>
          <span aria-hidden="true">›</span>
          <span className="stage">{s.stage}</span>
          <span className={'level ' + s.level}>{s.level}</span>
        </div>
        <h1>{s.title}</h1>

        {s.brief && <p className="brief">{s.brief}</p>}
        {s.message && (
          <div className="msg">
            <div className="from"><i aria-hidden="true">{s.from[0]}</i>{s.from}</div>
            <p>{s.message}</p>
          </div>
        )}
        <p className="task">{s.task}</p>

        {s.entities && (
          <div className="entities">
            <form onSubmit={addEntity}>
              <input id="entity-input" aria-label="Entity name" placeholder={'e.g. ' + (lab.entityExample || 'user')} value={entity}
                onChange={(e) => setEntity(e.target.value)} />
              <button className="btn" type="submit">Add</button>
            </form>
            {state.entities.length ? (
              <div className="chips">
                {state.entities.map((en) => (
                  <span className="chip" key={en}>
                    {en}
                    <button aria-label={'Remove ' + en}
                      onClick={() => setState((x) => ({ ...x, entities: x.entities.filter((y) => y !== en) }))}>×</button>
                  </span>
                ))}
              </div>
            ) : (
              <span className="empty-note">No entities yet. Add them one at a time.</span>
            )}
          </div>
        )}

        <details className="hint">
          <summary>Show a hint</summary>
          <p>{s.hint}</p>
        </details>

        {s.n === 1 ? (
          <button className="btn primary" onClick={next}>Start designing →</button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn primary" onClick={run}>Run the checks</button>
            {passed && s.n < STEPS.length && <button className="btn" onClick={next}>Next step →</button>}
          </div>
        )}
        {s.n > 1 && (
          <button className="btn ghost" style={{ marginTop: 6 }} onClick={() => go(s.n - 1)}>← Previous step</button>
        )}

        {s.n > 1 && (
          <div className="status">
            <span className={'pill ' + (res.passed ? 'ok' : tests ? 'bad' : 'idle')}>
              {res.passed ? 'Passed' : tests ? 'Not passed yet' : 'Not run yet'}
            </span>
            <span>{res.attempts} attempt{res.attempts === 1 ? '' : 's'}</span>
          </div>
        )}

        {tests && tests.length > 0 && (
          <div>
            <h2>Test runs</h2>
            <p className="sub">
              {nPass} of {tests.length} passed{res.passed && !res.last ? ' on this run. You passed this step before.' : '.'}
            </p>
            <div className="tests">
              {tests.map((t) => <TestCard key={t.id} t={t} />)}
            </div>
          </div>
        )}

        <nav className="steps" aria-label="Steps">
          <div className="steps-h">
            <b>Challenges</b>
            <button className="btn ghost" onClick={() => setConfirm(true)}>Start over</button>
          </div>
          {confirm && (
            <div className="confirm">
              <span>Clear every table, your entity list and all progress?</span>
              <div className="row">
                <button className="btn" style={{ color: 'var(--bad)' }} onClick={() => { act.reset(); setConfirm(false); }}>Yes, clear it</button>
                <button className="btn ghost" onClick={() => setConfirm(false)}>Cancel</button>
              </div>
            </div>
          )}
          <ol>
            {STEPS.map((st) => (
              <li key={st.n}>
                <button aria-current={st.n === s.n ? 'step' : undefined} disabled={st.n > maxOpen} onClick={() => go(st.n)}>
                  <span className="num">{String(st.n).padStart(2, '0')}</span>
                  <span>{st.title}</span>
                  <span className="tick">{state.results[st.n]?.passed ? '✓' : ''}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </aside>
  );
}
