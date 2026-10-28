import { useEffect, useState } from 'react';

// One test result: green when passed, red with the problems listed when not.
export default function TestCard({ t }) {
  const ok = !t.problems.length;
  const [open, setOpen] = useState(!ok);
  useEffect(() => setOpen(!ok), [ok, t.problems.join('|')]);

  return (
    <div className={'test ' + (ok ? 'ok' : 'bad') + (open ? ' open' : '')}>
      <button aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="ic" aria-hidden="true">{ok ? '✓' : '!'}</span>
        <span>
          <span className="nm">{t.name}</span>
          <br />
          <span className="ds">{t.desc}</span>
        </span>
        <span className="chev" aria-hidden="true">⌄</span>
      </button>

      {open && (
        <dl className="detail">
          <div>
            <dt>Expected</dt>
            <dd>{t.expected}</dd>
          </div>
          <div>
            <dt>Received</dt>
            <dd>
              {t.received ? t.received : ok ? 'Matches.' : ''}
              {t.problems.length > 0 && (
                <ul>{t.problems.map((p, i) => <li key={i}>{p}</li>)}</ul>
              )}
            </dd>
          </div>
          <div>
            <span className={'verdict ' + (ok ? 'ok' : 'bad')}>
              {ok ? 'Check passed.' : 'Not yet. Fix the points above and run again.'}
            </span>
          </div>
        </dl>
      )}
    </div>
  );
}
