import { SG } from './matching.js';

// Runs one step's checks for any lab.
// Each lab supplies: steps, entityNeed, resolve(tables) and checks.
// From step 4 on, an extra "Earlier steps" test re-runs every check before it,
// so a new change can't silently break an old one.
export function runStep(lab, step, state) {
  const s = lab.steps[step - 1];

  // The "find the entities" step checks the typed list, not the board
  if (s.entities) {
    return lab.entityNeed.map((e, i) => {
      const ok = state.entities.some((x) => e.al.some((a) => SG(x).includes(SG(a))));
      return { id: 'e' + i, name: e.label, desc: 'Found in the requirements', expected: 'An entity for this', problems: ok ? [] : [e.miss] };
    });
  }

  const R = lab.resolve(state.tables);
  const out = [];
  const firstCheckStep = lab.steps.find((x) => x.tests.length)?.n ?? 3;

  if (step > firstCheckStep) {
    const earlier = [];
    for (let k = firstCheckStep; k < step; k++) lab.steps[k - 1].tests.forEach((id) => earlier.push(id));
    const bad = earlier.map((id) => ({ id, p: lab.checks[id].run(R) })).filter((x) => x.p.length);
    out.push({
      id: 'earlier',
      name: 'Earlier steps',
      desc: `Re-runs every check from steps ${firstCheckStep} to ${step - 1}`,
      expected: `All ${earlier.length} earlier checks pass`,
      received: `${earlier.length - bad.length} of ${earlier.length} pass`,
      problems: bad.flatMap((b) => b.p.map((m) => lab.checks[b.id].name + ': ' + m)),
    });
  }

  s.tests.forEach((id) => {
    const c = lab.checks[id];
    out.push({ id, name: c.name, desc: c.desc, expected: c.expected, problems: c.run(R) });
  });
  return out;
}
