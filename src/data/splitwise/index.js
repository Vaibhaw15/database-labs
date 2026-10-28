import { STEPS, REQ_F, REQ_NF, ENTITY_NEED } from './steps.js';
import { resolve, CHECKS } from './checks.js';

// Everything the app needs to run the Splitwise lab.
export default {
  id: 'splitwise',
  status: 'ready',
  name: 'Splitwise',
  title: 'Design a Splitwise-like database',
  category: 'Expense sharing',
  tagline: 'Groups, uneven splits, multiple payers, currencies and settlements, kept exact by a ledger that always adds up.',
  level: 'Hard',
  minutes: 130,
  entityExample: 'expense',
  boardLabel: 'Splitwise-style expense sharing',
  topics: ['Exact money', 'Multiple payers', 'Idempotent sync', 'Audit history', 'Double-entry ledger'],
  storeKey: 'database-labs-splitwise',
  steps: STEPS,
  reqF: REQ_F,
  reqNF: REQ_NF,
  entityNeed: ENTITY_NEED,
  resolve,
  checks: CHECKS,
};
