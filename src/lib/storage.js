// Each lab's progress is kept in this browser's localStorage under its own key.

export const fresh = () => ({ step: 1, entities: [], tables: [], results: {}, view: { x: 40, y: 60, k: 0.85 } });

// Keys used before the rename, read once so earlier progress isn't lost
const LEGACY_KEYS = {
  'database-labs-udemy': 'vaibhaw-database-v1',
  'database-labs-zomato': 'vaibhaw-database-zomato',
  'database-labs-redbus': 'vaibhaw-database-redbus',
  'database-labs-splitwise': 'vaibhaw-database-splitwise',
};

export function load(key) {
  try {
    let raw = localStorage.getItem(key);
    if (raw == null && LEGACY_KEYS[key]) raw = localStorage.getItem(LEGACY_KEYS[key]);
    const v = JSON.parse(raw);
    if (v && Array.isArray(v.tables)) return { ...fresh(), ...v };
  } catch (e) {}
  return fresh();
}

export function save(key, s) {
  try { localStorage.setItem(key, JSON.stringify(s)); } catch (e) {}
}

// How many steps of a lab are passed, for the home screen
export function progressOf(lab) {
  if (!lab.storeKey) return { done: 0, total: 0, step: 1, started: false };
  const s = load(lab.storeKey);
  const done = lab.steps.filter((st) => s.results[st.n]?.passed).length;
  return { done, total: lab.steps.length, step: s.step, started: done > 0 || s.tables.length > 0 };
}
