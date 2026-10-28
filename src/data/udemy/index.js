import { STEPS, REQ_F, REQ_NF, ENTITY_NEED } from './steps.js';
import { resolve, CHECKS } from './checks.js';

// Everything the app needs to run the Udemy lab.
export default {
  id: 'udemy',
  status: 'ready',
  name: 'Udemy',
  title: 'Design a Udemy-like database',
  category: 'E-learning',
  tagline: 'Courses, modules, lessons, enrolments and progress, built from the requirements up.',
  level: 'Easy',
  minutes: 75,
  entityExample: 'course',
  boardLabel: 'Udemy-style course platform',
  topics: ['Many-to-many', 'Price history', 'Unique pairs', 'Self-reference'],
  storeKey: 'database-labs-udemy',
  steps: STEPS,
  reqF: REQ_F,
  reqNF: REQ_NF,
  entityNeed: ENTITY_NEED,
  resolve,
  checks: CHECKS,
};
