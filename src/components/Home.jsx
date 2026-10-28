import { LABS } from '../data/labs.js';
import { progressOf } from '../lib/storage.js';

// Landing screen: every database design lab, with your progress on each.
export default function Home() {
  const ready = LABS.filter((l) => l.status === 'ready').length;

  return (
    <div className="home">
      <header className="home-bar">
        <div className="brand-inline"><b>Database</b><span>Labs</span></div>
        <span className="home-count">
          {ready} lab{ready === 1 ? '' : 's'} ready{LABS.length > ready ? ` · ${LABS.length - ready} coming soon` : ''}
        </span>
      </header>

      <section className="home-hero">
        <p className="eyebrow">Database design practice</p>
        <h1 className="home-title">Design the databases behind apps you use every day.</h1>
        <p className="home-lede">
          Pick an app, read what it has to do, and build its schema on a board, one step at a time.
          Every step adds a real requirement, and the checks tell you exactly what your tables are missing.
        </p>
      </section>

      <section aria-labelledby="labs-h">
        <h2 id="labs-h" className="home-h2">Labs</h2>
        <ul className="lab-grid">
          {LABS.map((lab) => <LabCard key={lab.id} lab={lab} />)}
        </ul>
      </section>
    </div>
  );
}

function LabCard({ lab }) {
  const soon = lab.status !== 'ready';
  const p = soon ? null : progressOf(lab);
  const pct = p && p.total ? Math.round((p.done / p.total) * 100) : 0;
  const finished = p && p.done === p.total;

  return (
    <li className={'lab-card' + (soon ? ' soon' : '')}>
      <div className="lab-top">
        <span className="lab-cat">{lab.category}</span>
        {soon ? <span className="pill idle">Coming soon</span> : <span className={'level ' + lab.level.toLowerCase()}>{lab.level}</span>}
      </div>

      <h3 className="lab-title">{lab.title}</h3>
      <p className="lab-tag">{lab.tagline}</p>

      {lab.topics && (
        <ul className="lab-topics" aria-label="What you'll practise">
          {lab.topics.map((t) => <li key={t}>{t}</li>)}
        </ul>
      )}

      <div className="lab-foot">
        {soon ? (
          <span className="lab-meta">In the works</span>
        ) : (
          <>
            <div className="lab-progress">
              <div className="lab-meta">
                <span>{lab.steps.length} steps · ~{lab.minutes} min</span>
                <span className="tab">{p.done}/{p.total} done</span>
              </div>
              <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={lab.name + ' progress'}>
                <span style={{ width: pct + '%' }} />
              </div>
            </div>
            <a className="btn primary lab-go" href={'#' + lab.id}>
              {finished ? 'Review your design' : p.started ? `Continue from step ${p.step}` : 'Start lab'} →
            </a>
          </>
        )}
      </div>
    </li>
  );
}
