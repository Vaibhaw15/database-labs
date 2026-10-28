// Right panel: add a table, key legend, and the requirements.
export default function SidePanel({ lab, act }) {
  return (
    <aside className="panel right">
      <div className="pad">
        <button className="addtable" onClick={() => act.addTable()}>
          <span className="ico" aria-hidden="true">+</span>
          <span>
            <b>Add a table</b>
            <small>Places a new table in the middle of the board</small>
          </span>
        </button>

        <div className="legend">
          <div><span className="k pk on">PK</span> Primary key: identifies each row</div>
          <div><span className="k uq on">UQ</span> Unique. Several UQ columns are unique together</div>
          <div><span className="k fk on">FK</span> Foreign key: points to a row in another table</div>
        </div>

        <details className="req" open>
          <summary>Functional requirements</summary>
          <ul>{lab.reqF.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </details>
        <details className="req" open>
          <summary>Non-functional requirements</summary>
          <ul>{lab.reqNF.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </details>

        <div className="tips">
          <p>Drag a table by its header. Drag empty space to pan.</p>
          <p><kbd>Ctrl</kbd> + scroll to zoom. Turning on FK for a column named <code>course_id</code> links it to course automatically.</p>
          <p>Your work saves in this browser.</p>
        </div>
      </div>
    </aside>
  );
}
