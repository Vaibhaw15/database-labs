import { TW, colY } from '../lib/geometry.js';

// Relationship lines: from each FK column to the column it points to.
// The FK end gets a crow's foot (many), the target end a bar (one).
export default function Edges({ tables }) {
  const byId = Object.fromEntries(tables.map((t) => [t.id, t]));
  const lines = [];

  tables.forEach((t) =>
    t.cols.forEach((c, i) => {
      if (!c.fk) return;
      const [tid, cid] = c.fk.split(':');
      const tt = byId[tid];
      if (!tt) return;
      const j = tt.cols.findIndex((x) => x.id === cid);
      if (j < 0) return;

      const sy = colY(t, i);
      const ty = colY(tt, j);
      let sx, tx, d, sDir, tDir;

      if (tt.id === t.id || Math.abs(tt.x - t.x) < TW * 0.6) {
        // Same table or stacked tables: loop out to the right
        sx = t.x + TW; tx = tt.x + TW;
        const out = Math.max(sx, tx) + 46;
        d = `M${sx},${sy} C${out},${sy} ${out},${ty} ${tx},${ty}`;
        sDir = 1; tDir = 1;
      } else if (tt.x > t.x) {
        sx = t.x + TW; tx = tt.x;
        const dx = Math.max(40, (tx - sx) / 2);
        d = `M${sx},${sy} C${sx + dx},${sy} ${tx - dx},${ty} ${tx},${ty}`;
        sDir = 1; tDir = -1;
      } else {
        sx = t.x; tx = tt.x + TW;
        const dx = Math.max(40, (sx - tx) / 2);
        d = `M${sx},${sy} C${sx - dx},${sy} ${tx + dx},${ty} ${tx},${ty}`;
        sDir = -1; tDir = 1;
      }

      const fx = sx + sDir * 9;
      lines.push(
        <g key={t.id + c.id}>
          <path d={d} />
          <path d={`M${sx},${sy - 6} L${fx},${sy} L${sx},${sy + 6}`} />
          <line className="end" x1={tx + tDir * 7} y1={ty - 6} x2={tx + tDir * 7} y2={ty + 6} />
          <circle className="end" cx={fx} cy={sy} r="2.5" />
        </g>
      );
    })
  );

  return (
    <svg className="edges" width="1" height="1" aria-hidden="true">
      {lines}
    </svg>
  );
}
