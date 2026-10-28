// Splitwise lab: how to find each table's role, and the check for every step.
import { has, is, NUM, TXT, TIME, refT, fkOn } from '../../lib/matching.js';

// Money must be exact: numeric, or integer/bigint paise. Never an auto-increment.
const MONEY = ['numeric', 'integer', 'bigint'];

// Works out which of the user's tables plays which role (users, groups, expenses...).
export function resolve(T) {
  const fkTo = (t, x) => (t && x ? t.cols.find((c) => refT(c) === x.id) : null);
  const fksTo = (t, x) => (t && x ? t.cols.filter((c) => refT(c) === x.id) : []);
  const colOf = (t, al, types, allowFk) =>
    t ? t.cols.find((c) => has(c.name, al) && (!types || types.includes(c.type)) && (allowFk || !fkOn(c)) && !c.pk) : null;
  const timeOf = (t, al) => colOf(t, al, TIME) || colOf(t, al);
  const find = (al, pred = () => true) => T.find((t) => is(t.name, al) && pred(t)) || T.find((t) => has(t.name, al) && pred(t));

  const users = find(['user', 'person', 'people', 'account'],
    (t) => !has(t.name, ['group', 'expense', 'split', 'friend', 'settle', 'payment', 'balance', 'ledger', 'payer', 'share', 'history']));
  const group = find(['group', 'trip', 'circle'], (t) => !has(t.name, ['member', 'expense', 'balance', 'user', 'ledger']));
  const member =
    T.find((t) => group && users && t !== group && t !== users && fkTo(t, group) && fkTo(t, users) && has(t.name, ['member', 'participant', 'user', 'people'])) ||
    find(['groupmember', 'membership', 'member', 'participant'], (t) => t !== users && t !== group);
  const expense = find(['expense', 'bill', 'spend', 'cost', 'transaction'],
    (t) => !has(t.name, ['split', 'share', 'payer', 'paid', 'history', 'log', 'audit', 'version', 'recurring', 'template', 'schedule', 'ledger', 'comment', 'participant', 'item', 'balance']));
  const split =
    T.find((t) => expense && users && t !== expense && fkTo(t, expense) && fkTo(t, users) && has(t.name, ['split', 'share', 'owe', 'participant', 'portion', 'debt'])) ||
    find(['split', 'share', 'owe'], (t) => t !== expense && !has(t.name, ['recurring', 'template']));
  const payer =
    T.find((t) => expense && users && t !== expense && t !== split && fkTo(t, expense) && fkTo(t, users) && has(t.name, ['payer', 'paid', 'payment', 'contribut'])) ||
    find(['payer', 'contribution', 'contributor'], (t) => t !== split);
  const friend = find(['friend', 'connection', 'contact', 'buddy']);
  const settle = find(['settle', 'repay', 'payback', 'transfer', 'payment'], (t) => t !== payer && !has(t.name, ['expense', 'ledger', 'method']));
  const balance = find(['balance', 'debt', 'summary'], (t) => t !== split && !has(t.name, ['ledger', 'history']));
  const history = find(['history', 'audit', 'activity', 'log', 'version', 'revision', 'change'], (t) => !has(t.name, ['ledger']));
  const recurring = find(['recurring', 'repeat', 'schedule', 'subscription', 'template']);
  const ledger = find(['ledger', 'entry', 'entries', 'journal', 'posting']);

  return { T, users, group, member, expense, split, payer, friend, settle, balance, history, recurring, ledger, fkTo, fksTo, colOf, timeOf };
}

const P = (cond, msg, list) => { if (!cond) list.push(msg); };
const pkOk = (t, p) => P(t.cols.some((c) => c.pk), `${t.name} has no primary key. Mark its id column as PK.`, p);
const typeMsg = (t, c, want) => `${t.name}.${c.name} is ${c.type}. Use ${want}.`;
const needType = (t, c, types, want, p) => { if (c && !types.includes(c.type)) p.push(typeMsg(t, c, want)); };
const moneyMsg = 'numeric, or integer paise. Money needs to be exact';
const STATUS = ['status', 'state'];

// Columns that point to `x`, required to be UQ together
const pairUq = (t, cols) => cols.every((c) => c && c.uq);

// One entry per check. run(R) returns a list of problems; empty means passed.
export const CHECKS = {
  users: {
    name: 'users', desc: 'id, name, email, phone, default currency',
    expected: 'A users table with a primary key, name, email, phone and a default currency.',
    run: (R) => {
      const t = R.users; if (!t) return ['No users table yet.'];
      const p = []; pkOk(t, p);
      P(R.colOf(t, ['name']), 'Add the person’s name.', p);
      P(R.colOf(t, ['email', 'mail']), 'Add an email column.', p);
      const ph = R.colOf(t, ['phone', 'mobile']);
      if (!ph) p.push('Add a phone number.'); else needType(t, ph, TXT, 'varchar', p);
      const cur = R.colOf(t, ['currency']);
      if (!cur) p.push('Add the default currency, such as default_currency (INR).'); else needType(t, cur, TXT, 'varchar, holding a 3-letter code like INR', p);
      return p;
    },
  },
  groups: {
    name: 'groups', desc: 'id, name, who created it, when',
    expected: 'A groups table with a primary key, a name, the user who created it and when.',
    run: (R) => {
      const t = R.group; if (!t) return ['No groups table yet.'];
      const p = []; pkOk(t, p);
      P(R.colOf(t, ['name', 'title']), 'Add the group name, such as Goa trip.', p);
      P(R.fkTo(t, R.users), `${t.name} should record who created it: add created_by as FK to users.`, p);
      const at = R.timeOf(t, ['created', 'at', 'date']);
      if (!at) p.push('Add created_at.'); else needType(t, at, TIME, 'timestamptz', p);
      return p;
    },
  },
  members: {
    name: 'group members', desc: 'group + user unique, joined and left times',
    expected: 'A members table pointing to group and user (unique together), with joined_at and left_at.',
    run: (R) => {
      const t = R.member; if (!t) return ['No table for group members yet. It needs an FK to groups and an FK to users.'];
      const p = []; pkOk(t, p);
      const cg = R.fkTo(t, R.group), cu = R.fkTo(t, R.users);
      P(cg, `${t.name} needs an FK to groups.`, p);
      P(cu, `${t.name} needs an FK to users.`, p);
      if (cg && cu && !pairUq(t, [cg, cu])) p.push(`Mark both ${cg.name} and ${cu.name} as UQ, so nobody is added to the same group twice.`);
      const j = R.timeOf(t, ['join', 'added', 'created', 'at']);
      if (!j) p.push('Add joined_at.'); else needType(t, j, TIME, 'timestamptz', p);
      P(R.colOf(t, ['left', 'leave', 'removed', 'exit', 'active']), 'Record leaving, such as left_at (timestamptz). Don’t delete the row: their old expenses still point to them.', p);
      return p;
    },
  },
  expenses: {
    name: 'expenses', desc: 'group, description, exact amount, date, who paid',
    expected: 'An expenses table with its group, a description, an exact amount, the date spent and who paid.',
    run: (R) => {
      const t = R.expense; if (!t) return ['No expenses table yet.'];
      const p = []; pkOk(t, p);
      P(R.fkTo(t, R.group), `${t.name} needs group_id as FK to groups (left empty for expenses between two friends).`, p);
      P(R.colOf(t, ['desc', 'title', 'name', 'note', 'what', 'label'], TXT), 'Add a description, such as Dinner at Thalassa.', p);
      const amt = R.colOf(t, ['amount', 'total', 'cost', 'price', 'value']);
      if (!amt) p.push('Add the amount.'); else needType(t, amt, MONEY, moneyMsg, p);
      const d = R.colOf(t, ['date', 'spent', 'incurred', 'day', 'on'], ['date', 'timestamptz']);
      if (!d) p.push('Add the date it was spent, such as expense_date (date).');
      P(R.fkTo(t, R.users) || R.payer, `${t.name} needs to know who paid: add paid_by as FK to users.`, p);
      return p;
    },
  },
  splits: {
    name: 'expense splits', desc: 'what each person owes, once per expense',
    expected: 'A splits table pointing to expense and user (unique together), with the exact amount owed.',
    run: (R) => {
      const t = R.split; if (!t) return ['No table for each person’s share yet. It needs an FK to expenses and an FK to users.'];
      const p = []; pkOk(t, p);
      const ce = R.fkTo(t, R.expense), cu = R.fkTo(t, R.users);
      P(ce, `${t.name} needs an FK to expenses.`, p);
      P(cu, `${t.name} needs an FK to users.`, p);
      if (ce && cu && !pairUq(t, [ce, cu])) p.push(`Mark both ${ce.name} and ${cu.name} as UQ, so a person appears once per expense.`);
      const o = R.colOf(t, ['owe', 'due', 'amount', 'share', 'portion', 'value']);
      if (!o) p.push('Add the amount owed, such as owed_amount.'); else needType(t, o, MONEY, moneyMsg, p);
      return p;
    },
  },
  splitTypes: {
    name: 'split type and inputs', desc: 'how it was split, and what was entered per person',
    expected: 'expenses record the split type, and each split keeps the entered value next to the amount owed.',
    run: (R) => {
      const p = [];
      P(R.expense && R.colOf(R.expense, ['split', 'type', 'method', 'mode', 'strategy']), 'Add split_type to expenses (equal, exact, percent, shares).', p);
      const t = R.split;
      if (!t) { p.push('There is no splits table.'); return p; }
      const owed = R.colOf(t, ['owe', 'due', 'amount']) || R.colOf(t, ['share', 'portion', 'value']);
      const input = t.cols.find((c) => c !== owed && !fkOn(c) && !c.pk && NUM.includes(c.type) && c.type !== 'bigserial' &&
        has(c.name, ['percent', 'pct', 'share', 'weight', 'ratio', 'unit', 'input', 'value', 'exact', 'entered']));
      if (!input) p.push(`Keep what was entered for each person next to the amount owed, such as share_value (numeric) on ${t.name}. With only the result, Edit can’t show "40%" or "2 shares".`);
      else needType(t, input, ['numeric'], 'numeric, because percentages like 33.33 need decimals', p);
      return p;
    },
  },
  payers: {
    name: 'expense payers', desc: 'several people can pay one expense',
    expected: 'A payers table pointing to expense and user (unique together), with the amount each paid.',
    run: (R) => {
      const t = R.payer; if (!t) return ['No table for payers yet. With paid_by on expenses, only one person can pay.'];
      const p = []; pkOk(t, p);
      const ce = R.fkTo(t, R.expense), cu = R.fkTo(t, R.users);
      P(ce, `${t.name} needs an FK to expenses.`, p);
      P(cu, `${t.name} needs an FK to users.`, p);
      if (ce && cu && !pairUq(t, [ce, cu])) p.push(`Mark both ${ce.name} and ${cu.name} as UQ, so a person pays once per expense.`);
      const a = R.colOf(t, ['paid', 'amount', 'value', 'contribut']);
      if (!a) p.push('Add how much this person paid, such as paid_amount.'); else needType(t, a, MONEY, moneyMsg, p);
      return p;
    },
  },
  friends: {
    name: 'friendships', desc: 'two users, unique pair, status',
    expected: 'A friendships table with two FKs to users (unique together), a status and when it was created.',
    run: (R) => {
      const t = R.friend; if (!t) return ['No friendships table yet.'];
      const p = []; pkOk(t, p);
      const fks = R.fksTo(t, R.users);
      if (fks.length < 2) p.push(`A friendship is between two people, so ${t.name} needs two FKs to users, such as user_id and friend_id.`);
      else if (!pairUq(t, fks.slice(0, 2))) p.push(`Mark both ${fks[0].name} and ${fks[1].name} as UQ, so the same two people aren’t friends twice.`);
      P(R.colOf(t, STATUS), 'Add a status (pending, accepted, blocked).', p);
      P(R.colOf(t, ['created', 'at', 'since', 'date'], TIME), 'Add created_at as a timestamptz.', p);
      return p;
    },
  },
  settlements: {
    name: 'settlements', desc: 'payer, payee, amount, when',
    expected: 'A settlements table with two FKs to users (who paid, who received), the amount and when.',
    run: (R) => {
      const t = R.settle; if (!t) return ['No settlements table yet. A payment back is not an expense: keep it in its own table.'];
      const p = []; pkOk(t, p);
      if (R.fksTo(t, R.users).length < 2) p.push(`${t.name} needs two FKs to users: who paid (payer_id) and who received (payee_id).`);
      const a = R.colOf(t, ['amount', 'value', 'paid', 'total']);
      if (!a) p.push('Add the amount.'); else needType(t, a, MONEY, moneyMsg, p);
      P(R.colOf(t, ['settled', 'paid', 'created', 'at', 'date', 'time'], TIME), 'Add when it happened, such as settled_at (timestamptz).', p);
      return p;
    },
  },
  currency: {
    name: 'currencies', desc: 'group base currency, expense currency and frozen rate',
    expected: 'groups have a base currency; expenses have their own currency and a numeric exchange rate.',
    run: (R) => {
      const p = [];
      P(R.group && R.colOf(R.group, ['currency'], TXT), 'Add base_currency to groups (a 3-letter code like INR).', p);
      const e = R.expense;
      if (!e) { p.push('There is no expenses table.'); return p; }
      P(R.colOf(e, ['currency'], TXT), 'Add currency to expenses (a 3-letter code like IDR).', p);
      const r = R.colOf(e, ['rate', 'fx', 'exchange', 'conversion']);
      if (!r) p.push('Add exchange_rate to expenses, frozen when the expense is added.'); else needType(e, r, ['numeric'], 'numeric, because a rate like 0.0053 needs decimals', p);
      return p;
    },
  },
  balances: {
    name: 'cached balances', desc: 'one row per person per group',
    expected: 'A balances table pointing to the group and the user (unique together), with the current net amount.',
    run: (R) => {
      const t = R.balance; if (!t) return ['No balances table yet. Without one, every page load adds up the whole history.'];
      const p = []; pkOk(t, p);
      const cg = R.fkTo(t, R.group);
      const cus = R.fksTo(t, R.users);
      P(cg, `${t.name} needs an FK to groups.`, p);
      P(cus.length, `${t.name} needs an FK to users.`, p);
      const keys = [cg, ...cus].filter(Boolean);
      if (cg && cus.length && !pairUq(t, keys)) p.push(`Mark ${keys.map((c) => c.name).join(' and ')} as UQ together, so there is exactly one balance row per person per group.`);
      const a = R.colOf(t, ['net', 'amount', 'balance', 'value', 'owe']);
      if (!a) p.push('Add the current balance, such as net_amount.'); else needType(t, a, MONEY, moneyMsg, p);
      return p;
    },
  },
  audit: {
    name: 'history and restore', desc: 'soft delete, and who changed what',
    expected: 'expenses are soft-deleted, and a history table records each change with who, when and the old and new values.',
    run: (R) => {
      const p = [];
      const e = R.expense;
      P(e && R.colOf(e, ['deleted', 'archived', 'removed'], ['timestamptz', 'boolean']), 'Add deleted_at (timestamptz) to expenses, so deleting hides the row instead of removing it.', p);
      const t = R.history;
      if (!t) { p.push('No history table yet. It records each change: which expense, who changed it, when, and what changed.'); return p; }
      P(R.fkTo(t, R.expense), `${t.name} needs an FK to the expense.`, p);
      P(R.fkTo(t, R.users), `${t.name} needs changed_by as FK to users.`, p);
      P(R.colOf(t, ['changed', 'at', 'time', 'created', 'date'], TIME), 'Add changed_at as a timestamptz.', p);
      P(R.colOf(t, ['old', 'new', 'before', 'after', 'change', 'diff', 'data', 'snapshot', 'payload', 'value'], ['jsonb', 'text']), 'Store what changed, such as old_values and new_values as jsonb.', p);
      return p;
    },
  },
  idempotency: {
    name: 'no duplicate retries', desc: 'a unique client request id on expenses',
    expected: 'expenses have a client-generated request id marked UQ.',
    run: (R) => {
      const e = R.expense; if (!e) return ['There is no expenses table.'];
      const c = R.colOf(e, ['client', 'request', 'idempot', 'dedup', 'device', 'local', 'sync', 'nonce'], ['uuid', 'text', 'varchar']);
      if (!c) return ['Add client_request_id (uuid) to expenses. The phone creates it once and sends the same value on every retry.'];
      return c.uq ? [] : [`Mark ${c.name} as UQ, so a retry of an expense that was already saved is refused.`];
    },
  },
  recurring: {
    name: 'recurring expenses', desc: 'a rule, its schedule, and links from generated expenses',
    expected: 'A recurring table with amount, frequency and next run date, and expenses point back to the rule that created them.',
    run: (R) => {
      const t = R.recurring; if (!t) return ['No table for recurring expenses yet.'];
      const p = []; pkOk(t, p);
      P(R.fkTo(t, R.group) || R.fkTo(t, R.users), `${t.name} needs an FK to its group.`, p);
      const a = R.colOf(t, ['amount', 'total', 'cost', 'value']);
      if (!a) p.push('Add the amount.'); else needType(t, a, MONEY, moneyMsg, p);
      P(R.colOf(t, ['freq', 'interval', 'repeat', 'every', 'period', 'rule', 'cron', 'cadence']), 'Add the frequency (monthly, weekly...).', p);
      P(R.colOf(t, ['next', 'due', 'run', 'start'], ['date', 'timestamptz']), 'Add next_run_date (date).', p);
      P(R.expense && R.fkTo(R.expense, t), 'Add recurring_id to expenses as FK to the recurring table, empty for normal expenses.', p);
      return p;
    },
  },
  ledger: {
    name: 'ledger', desc: 'every movement of money, linked to its cause',
    expected: 'A ledger table with the user, a signed amount, the expense or settlement that caused it, and when.',
    run: (R) => {
      const t = R.ledger; if (!t) return ['No ledger table yet.'];
      const p = []; pkOk(t, p);
      P(R.fkTo(t, R.users), `${t.name} needs an FK to the user whose balance moves.`, p);
      const a = R.colOf(t, ['amount', 'value', 'delta', 'change']);
      if (!a) p.push('Add a signed amount: positive when you are owed, negative when you owe.'); else needType(t, a, MONEY, moneyMsg, p);
      const linked = (R.fkTo(t, R.expense) && R.fkTo(t, R.settle)) ||
        (R.colOf(t, ['source', 'ref', 'origin'], TXT) && R.colOf(t, ['source', 'ref', 'origin'], NUM.concat('uuid')));
      if (!linked) {
        const missing = [!R.fkTo(t, R.expense) && 'expense_id (FK to expenses)', !R.fkTo(t, R.settle) && 'settlement_id (FK to settlements)'].filter(Boolean);
        p.push(`Link every entry to what caused it. Add ${missing.join(' and ')}; one of them is set on each row.`);
      }
      P(R.colOf(t, ['created', 'at', 'time', 'date', 'posted'], TIME), 'Add created_at as a timestamptz.', p);
      return p;
    },
  },
};
