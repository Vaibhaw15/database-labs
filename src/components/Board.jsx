import { useEffect, useRef, useState } from 'react';
import TableCard from './TableCard.jsx';
import Edges from './Edges.jsx';
import { TW, tblH } from '../lib/geometry.js';
import { refT } from '../lib/matching.js';

// The schema canvas: pan, zoom, drag tables, fit and auto layout.
export default function Board({ lab, state, setState, act, canUndo, canRedo }) {
  const boardRef = useRef(null);
  const drag = useRef(null);
  const viewRef = useRef(state.view);
  viewRef.current = state.view;
  const [grab, setGrab] = useState(false);

  const setView = (v) => setState((s) => ({ ...s, view: typeof v === 'function' ? v(s.view) : v }));

  // Start dragging a table by its header
  const onHeadDown = (e, t) => {
    if (e.target.closest('input,button,select')) return;
    act.snap();
    drag.current = { kind: 'table', id: t.id, sx: e.clientX, sy: e.clientY, ox: t.x, oy: t.y };
    setGrab(true);
  };

  // Start panning when dragging empty space
  const onBoardDown = (e) => {
    if (e.target.closest('.tbl,.toolbar,.empty div')) return;
    drag.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: viewRef.current.x, oy: viewRef.current.y };
    setGrab(true);
  };

  useEffect(() => {
    const move = (e) => {
      const d = drag.current;
      if (!d) return;
      const k = viewRef.current.k;
      if (d.kind === 'table') {
        act.moveTable(d.id, Math.round(d.ox + (e.clientX - d.sx) / k), Math.round(d.oy + (e.clientY - d.sy) / k));
      } else {
        setView((v) => ({ ...v, x: d.ox + e.clientX - d.sx, y: d.oy + e.clientY - d.sy }));
      }
    };
    const up = () => { drag.current = null; setGrab(false); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  // Scroll pans; Ctrl/Cmd + scroll zooms around the cursor
  useEffect(() => {
    const el = boardRef.current;
    const wheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        const v = viewRef.current;
        const nk = Math.min(2, Math.max(0.2, v.k * Math.exp(-e.deltaY * 0.01)));
        const mx = e.clientX - r.left, my = e.clientY - r.top;
        setView({ k: nk, x: mx - ((mx - v.x) * nk) / v.k, y: my - ((my - v.y) * nk) / v.k });
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, []);

  const zoomBy = (f) => {
    const r = boardRef.current.getBoundingClientRect();
    const v = viewRef.current;
    const nk = Math.min(2, Math.max(0.2, v.k * f));
    const mx = r.width / 2, my = r.height / 2;
    setView({ k: nk, x: mx - ((mx - v.x) * nk) / v.k, y: my - ((my - v.y) * nk) / v.k });
  };

  const fit = (tables = state.tables) => {
    if (!tables.length) return;
    const r = boardRef.current.getBoundingClientRect();
    const x0 = Math.min(...tables.map((t) => t.x));
    const y0 = Math.min(...tables.map((t) => t.y));
    const x1 = Math.max(...tables.map((t) => t.x + TW + 50));
    const y1 = Math.max(...tables.map((t) => t.y + tblH(t)));
    const k = Math.min(1.1, Math.max(0.2, Math.min((r.width - 60) / (x1 - x0), (r.height - 120) / (y1 - y0))));
    setView({ k, x: (r.width - (x1 - x0) * k) / 2 - x0 * k, y: (r.height - (y1 - y0) * k) / 2 - y0 * k + 10 });
  };

  // Columns by dependency depth: tables with no FKs on the left, tables that point to them further right
  const autoLayout = () => {
    const T = state.tables;
    const byId = Object.fromEntries(T.map((t) => [t.id, t]));
    const memo = {};
    const depth = (t, seen = {}) => {
      if (memo[t.id] != null) return memo[t.id];
      if (seen[t.id]) return 0;
      seen[t.id] = 1;
      const refs = t.cols.map(refT).filter((id) => id && id !== t.id && byId[id]);
      const d = refs.length ? 1 + Math.max(...refs.map((id) => depth(byId[id], seen))) : 0;
      return (memo[t.id] = d);
    };
    const cols = {};
    T.forEach((t) => { const d = depth(t); (cols[d] = cols[d] || []).push(t); });
    const pos = {};
    Object.keys(cols).forEach((d) => {
      let y = 0;
      cols[d].forEach((t) => { pos[t.id] = { x: d * (TW + 110), y }; y += tblH(t) + 40; });
    });
    const next = T.map((t) => ({ ...t, ...pos[t.id] }));
    act.setTables(next);
    setTimeout(() => fit(next), 0);
  };

  // Where new tables appear: the middle of what you can see
  const center = () => {
    const r = boardRef.current.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: Math.round((r.width / 2 - v.x) / v.k - TW / 2 + (Math.random() * 60 - 30)),
      y: Math.round((r.height / 2 - v.y) / v.k - 80 + (Math.random() * 60 - 30)),
    };
  };
  useEffect(() => { act.registerCenter(center); }, []);

  const v = state.view;
  const n = state.tables.length;

  return (
    <section
      className={'board' + (grab ? ' grab' : '')}
      ref={boardRef}
      onPointerDown={onBoardDown}
      aria-label="Schema board"
      style={{ backgroundSize: `${22 * v.k}px ${22 * v.k}px`, backgroundPosition: `${v.x}px ${v.y}px` }}
    >
      <div className="board-top">
        <span><b>{lab.name}</b> / {lab.boardLabel}</span>
        <span>{n} table{n === 1 ? '' : 's'}</span>
      </div>

      <div className="world" style={{ transform: `translate(${v.x}px,${v.y}px) scale(${v.k})` }}>
        <Edges tables={state.tables} />
        {state.tables.map((t) => (
          <TableCard key={t.id} t={t} tables={state.tables} act={act} onHeadDown={onHeadDown} />
        ))}
      </div>

      {!n && (
        <div className="empty">
          <div>
            <b>Your board is empty</b>
            <p>
              {state.step < 3
                ? 'You will draw tables here from step 3. Start with the brief on the left.'
                : 'Add your first table from the right, or start with a users table.'}
            </p>
            <button className="btn" onClick={() => act.addTable('users', [['name', 'varchar'], ['email', 'varchar'], ['password_hash', 'text']])}>
              Start with a users table
            </button>
          </div>
        </div>
      )}

      <div className="toolbar" role="toolbar" aria-label="Board controls">
        <button onClick={act.undo} disabled={!canUndo} aria-label="Undo" title="Undo">↶</button>
        <button onClick={act.redo} disabled={!canRedo} aria-label="Redo" title="Redo">↷</button>
        <span className="sep" />
        <button onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out">−</button>
        <span className="zoom">{Math.round(v.k * 100)}%</span>
        <button onClick={() => zoomBy(1.2)} aria-label="Zoom in">+</button>
        <span className="sep" />
        <button onClick={() => fit()}>Fit</button>
        <button onClick={autoLayout} disabled={!n}>Auto layout</button>
      </div>
    </section>
  );
}
