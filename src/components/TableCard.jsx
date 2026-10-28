import { TYPES, fkOn, guessRef } from '../lib/matching.js';

// One table on the board: name, columns with PK / UQ / FK toggles, type picker.
export default function TableCard({ t, tables, act, onHeadDown }) {
  // An FK can point at any primary-key or unique column
  const refOptions = tables.flatMap((tt) =>
    tt.cols.filter((c) => c.pk || c.uq).map((c) => ({ v: tt.id + ':' + c.id, l: tt.name + '.' + c.name }))
  );

  return (
    <div className="tbl" style={{ left: t.x, top: t.y }}>
      <div className="tbl-head" onPointerDown={(e) => onHeadDown(e, t)}>
        <span className="grip" aria-hidden="true">⋮⋮</span>
        <input
          className="tname"
          id={'tn-' + t.id}
          aria-label="Table name"
          value={t.name}
          placeholder="table_name"
          onFocus={act.snap}
          onChange={(e) => act.patchTable(t.id, { name: e.target.value }, false)}
        />
        <button className="x" aria-label={'Delete table ' + t.name} title="Delete table" onClick={() => act.delTable(t.id)}>×</button>
      </div>

      <ul className="cols">
        {t.cols.map((c) => (
          <li key={c.id} className={'col' + (fkOn(c) ? ' withfk' : '')}>
            <div className="col-main">
              <div className="keys">
                <button className={'k pk' + (c.pk ? ' on' : '')} aria-pressed={!!c.pk} title="Primary key"
                  onClick={() => act.patchCol(t.id, c.id, { pk: !c.pk })}>PK</button>
                <button className={'k uq' + (c.uq ? ' on' : '')} aria-pressed={!!c.uq} title="Unique. Mark several columns to make them unique together."
                  onClick={() => act.patchCol(t.id, c.id, { uq: !c.uq })}>UQ</button>
                <button className={'k fk' + (fkOn(c) ? ' on' : '')} aria-pressed={fkOn(c)} title="Foreign key"
                  onClick={() => act.patchCol(t.id, c.id, { fk: fkOn(c) ? null : guessRef(c.name, tables, t.id) })}>FK</button>
              </div>
              <input
                className="cname"
                id={'cn-' + c.id}
                aria-label="Column name"
                value={c.name}
                placeholder="column_name"
                onFocus={act.snap}
                onChange={(e) => act.patchCol(t.id, c.id, { name: e.target.value }, false)}
              />
              <select className="ctype" id={'ct-' + c.id} aria-label="Column type" value={c.type}
                onChange={(e) => act.patchCol(t.id, c.id, { type: e.target.value })}>
                {TYPES.map((ty) => (
                  <option key={ty} value={ty}>{ty === 'varchar' ? 'varchar(255)' : ty}</option>
                ))}
              </select>
              <button className="x" aria-label={'Remove column ' + c.name} title="Remove column" onClick={() => act.delCol(t.id, c.id)}>×</button>
            </div>

            {fkOn(c) && (
              <div className="fkline">
                <span aria-hidden="true">→</span>
                <select id={'fk-' + c.id} aria-label="References" value={c.fk || ''}
                  onChange={(e) => act.patchCol(t.id, c.id, { fk: e.target.value })}>
                  <option value="">choose what it points to…</option>
                  {refOptions.map((o) => (
                    <option key={o.v} value={o.v}>{o.l}</option>
                  ))}
                </select>
              </div>
            )}
          </li>
        ))}
      </ul>

      <button className="addcol" onClick={() => act.addCol(t.id)}>
        <span aria-hidden="true">+</span> Add column
      </button>
    </div>
  );
}
