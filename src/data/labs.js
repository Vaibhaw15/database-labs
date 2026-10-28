import udemy from './udemy/index.js';
import redbus from './redbus/index.js';
import zomato from './zomato/index.js';
import splitwise from './splitwise/index.js';

// Every lab shown on the home screen, in order.
//
// To add a lab (for example Swiggy Instamart):
//   1. Copy one of the lab folders, such as src/data/zomato, to src/data/instamart.
//   2. Rewrite its steps.js (requirements and steps) and checks.js (resolve() and one check per step).
//   3. In its index.js set a new id, title and storeKey.
//   4. Import it here and add it to the list.
//
// A lab that isn't built yet can be listed with status: 'soon' and just the fields its card shows:
//   { id: 'instamart', status: 'soon', name: 'Instamart', title: 'Design an Instamart-like database',
//     category: 'Quick commerce', tagline: '...', level: 'Medium', topics: ['...'] }

export const LABS = [udemy, redbus, zomato, splitwise];

export const findLab = (id) => LABS.find((l) => l.id === id && l.status === 'ready');
