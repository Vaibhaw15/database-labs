import { STEPS, REQ_F, REQ_NF, ENTITY_NEED } from './steps.js';
import { resolve, CHECKS } from './checks.js';

// Everything the app needs to run the Zomato lab.
export default {
  id: 'zomato',
  status: 'ready',
  name: 'Zomato',
  title: 'Design a Zomato-like database',
  category: 'Food delivery',
  tagline: 'Restaurants, menus with add-ons, orders, riders and reviews, with every bill frozen at checkout.',
  level: 'Medium',
  minutes: 100,
  entityExample: 'restaurant',
  boardLabel: 'Zomato-style food delivery',
  topics: ['Nested menus', 'Add-on choices', 'Snapshots', 'One review per order'],
  storeKey: 'database-labs-zomato',
  steps: STEPS,
  reqF: REQ_F,
  reqNF: REQ_NF,
  entityNeed: ENTITY_NEED,
  resolve,
  checks: CHECKS,
};
