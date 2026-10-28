import { useCallback, useEffect, useRef, useState } from 'react';
import StepPanel from './StepPanel.jsx';
import Board from './Board.jsx';
import SidePanel from './SidePanel.jsx';
import { load, save, fresh } from '../lib/storage.js';
import { refT, uid } from '../lib/matching.js';

// One lab: step panel, board and requirements. Works for any lab object from data/labs.js.
export default function LabView({ lab }) {
  // state: { step, entities, tables, results, view }
  const [state, setState] = useState(() => load(lab.storeKey));
  const stRef = useRef(state);
  stRef.current = state;

  // Undo / redo keep snapshots of the tables
  const hist = useRef({ past: [], future: [] });
  const centerFn = useRef(() => ({ x: 60, y: 60 }));
  const [, force] = useState(0);

  useEffect(() => { save(lab.storeKey, state); }, [state, lab.storeKey]);
  useEffect(() => { document.title = lab.name + ' · Database Labs'; return () => { document.title = 'Database Labs'; }; }, [lab]);

  const snap = useCallback(() => {
    const h = hist.current;
    h.past.push(JSON.stringify(stRef.current.tables));
    if (h.past.length > 80) h.past.shift();
    h.future = [];
    force((x) => x + 1);
  }, []);

  const setTables = (fn, record = true) => {
    if (record) snap();
    setState((s) => ({ ...s, tables: typeof fn === 'function' ? fn(s.tables) : fn }));
  };

  const newCol = (name, type, pk = false) => ({ id: uid(), name, type, pk, uq: false, fk: null });

  // Every change to the schema goes through these actions
  const act = {
    snap,
    setTables,
    registerCenter: (f) => { centerFn.current = f; },

    addTable: (name = 'new_table', extra = []) => {
      const p = centerFn.current();
      const t = { id: uid(), name, x: p.x, y: p.y, cols: [newCol('id', 'bigserial', true), ...extra.map(([n, ty]) => newCol(n, ty))] };
      setTables((T) => [...T, t]);
      setTimeout(() => {
        const el = document.getElementById('tn-' + t.id);
        if (el && name === 'new_table') { el.focus(); el.select(); }
      }, 30);
    },

    // Deleting a table clears FKs that pointed at it
    delTable: (id) => setTables((T) => T.filter((t) => t.id !== id).map((t) => ({ ...t, cols: t.cols.map((c) => (refT(c) === id ? { ...c, fk: '' } : c)) }))),

    patchTable: (id, patch, record = true) => setTables((T) => T.map((t) => (t.id === id ? { ...t, ...patch } : t)), record),

    moveTable: (id, x, y) => setTables((T) => T.map((t) => (t.id === id ? { ...t, x, y } : t)), false),

    addCol: (tid) => {
      const c = newCol('', 'text');
      setTables((T) => T.map((t) => (t.id === tid ? { ...t, cols: [...t.cols, c] } : t)));
      setTimeout(() => document.getElementById('cn-' + c.id)?.focus(), 30);
    },

    delCol: (tid, cid) => setTables((T) => T.map((t) =>
      t.id === tid
        ? { ...t, cols: t.cols.filter((c) => c.id !== cid) }
        : { ...t, cols: t.cols.map((c) => (c.fk === tid + ':' + cid ? { ...c, fk: '' } : c)) }
    )),

    patchCol: (tid, cid, patch, record = true) => setTables((T) => T.map((t) => {
      if (t.id !== tid) return t;
      return {
        ...t,
        cols: t.cols.map((c) => {
          if (c.id !== cid) return c;
          const n = { ...c, ...patch };
          // An FK column stores the id it points to, so it can't auto-increment
          if (patch.fk && n.type === 'bigserial') n.type = 'bigint';
          if (patch.fk) {
            const [rt, rc] = patch.fk.split(':');
            const target = T.find((x) => x.id === rt)?.cols.find((x) => x.id === rc);
            if (target && target.type === 'uuid') n.type = 'uuid';
          }
          return n;
        }),
      };
    }), record),

    undo: () => {
      const h = hist.current;
      if (!h.past.length) return;
      h.future.push(JSON.stringify(stRef.current.tables));
      const prev = JSON.parse(h.past.pop());
      setState((s) => ({ ...s, tables: prev }));
      force((x) => x + 1);
    },

    redo: () => {
      const h = hist.current;
      if (!h.future.length) return;
      h.past.push(JSON.stringify(stRef.current.tables));
      const nx = JSON.parse(h.future.pop());
      setState((s) => ({ ...s, tables: nx }));
      force((x) => x + 1);
    },

    reset: () => {
      hist.current = { past: [], future: [] };
      setState(fresh());
    },
  };

  // Ctrl/Cmd + Z to undo, + Shift to redo
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest && e.target.closest('input,select,textarea')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? act.redo() : act.undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="app">
      <StepPanel lab={lab} state={state} setState={setState} act={act} />
      <Board lab={lab} state={state} setState={setState} act={act} canUndo={hist.current.past.length > 0} canRedo={hist.current.future.length > 0} />
      <SidePanel lab={lab} act={act} />
    </div>
  );
}
