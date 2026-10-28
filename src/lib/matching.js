// Helpers for matching table and column names loosely,
// so "Users", "user" and "app_users" are all recognised as users.

export const N = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Singular form: "categories" -> "category", "lessons" -> "lesson"
export const SG = (s) => {
  s = N(s);
  if (s.endsWith('ies')) return s.slice(0, -3) + 'y';
  if (/(ss|us|is)$/.test(s)) return s;
  if (/(ch|sh|x)es$/.test(s)) return s.slice(0, -2);
  if (s.endsWith('s')) return s.slice(0, -1);
  return s;
};

// Name contains one of the aliases
export const has = (name, aliases) => aliases.some((a) => N(name).includes(N(a)));

// Name equals one of the aliases (singular or plural)
export const is = (name, aliases) => aliases.some((a) => SG(name) === SG(a));

export const NUM = ['integer', 'bigint', 'numeric', 'bigserial'];
export const TXT = ['text', 'varchar'];
export const TIME = ['timestamptz'];

export const TYPES = ['bigserial', 'bigint', 'integer', 'numeric', 'text', 'varchar', 'boolean', 'timestamptz', 'date', 'time', 'uuid', 'jsonb', 'text[]', 'bytea'];

// A column's foreign key is stored as "tableId:columnId".
// null = FK switched off, '' = FK on but no target chosen yet.
export const refT = (c) => (c.fk ? c.fk.split(':')[0] : null);
export const fkOn = (c) => c.fk !== null && c.fk !== undefined;

export const uid = () => Math.random().toString(36).slice(2, 9);

// When FK is switched on for "course_id", guess it points to course.id
export function guessRef(colName, tables, selfId) {
  const n = N(colName);
  if (!n.endsWith('id') || n === 'id') return '';
  const base = SG(n.slice(0, -2));
  if (!base) return '';
  const t =
    tables.find((t) => SG(t.name) === base) ||
    tables.find((t) => N(t.name).includes(base) || base.includes(SG(t.name))) ||
    (base === 'parent' ? tables.find((t) => t.id === selfId) : null);
  if (!t) return '';
  const pk = t.cols.find((c) => c.pk) || t.cols[0];
  return pk ? t.id + ':' + pk.id : '';
}
