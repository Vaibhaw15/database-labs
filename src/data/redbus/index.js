import { STEPS, REQ_F, REQ_NF, ENTITY_NEED } from './steps.js';
import { resolve, CHECKS } from './checks.js';

// Everything the app needs to run the Redbus lab.
export default {
  id: 'redbus',
  status: 'ready',
  name: 'Redbus',
  title: 'Design a Redbus-like database',
  category: 'Bus ticket booking',
  tagline: 'Operators, routes, trips, seat layouts and bookings, where no seat is ever sold twice.',
  level: 'Medium',
  minutes: 90,
  entityExample: 'bus',
  boardLabel: 'Redbus-style bus booking',
  topics: ['Two FKs to one table', 'Seat layouts', 'No double booking', 'Payment retries'],
  storeKey: 'database-labs-redbus',
  steps: STEPS,
  reqF: REQ_F,
  reqNF: REQ_NF,
  entityNeed: ENTITY_NEED,
  resolve,
  checks: CHECKS,
};
