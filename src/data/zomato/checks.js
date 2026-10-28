// Zomato lab: how to find each table's role, and the check for every step.
import { has, is, NUM, TXT, TIME, refT, fkOn } from '../../lib/matching.js';

// Works out which of the user's tables plays which role (restaurants, dishes, orders...).
export function resolve(T) {
  const fkTo = (t, x) => (t && x ? t.cols.find((c) => refT(c) === x.id) : null);
  const colOf = (t, al, types, allowFk) =>
    t ? t.cols.find((c) => has(c.name, al) && (!types || types.includes(c.type)) && (allowFk || !fkOn(c)) && !c.pk) : null;
  const timeOf = (t, al) => colOf(t, al, TIME) || colOf(t, al);
  const find = (al, pred = () => true) => T.find((t) => is(t.name, al) && pred(t)) || T.find((t) => has(t.name, al) && pred(t));

  const restaurant = find(['restaurant', 'outlet', 'store', 'kitchen', 'vendor'], (t) => !has(t.name, ['category', 'section', 'review', 'dish', 'menu', 'order']));
  const users = find(['user', 'customer', 'account', 'member', 'eater'], (t) => !has(t.name, ['address', 'order', 'review', 'payment']));
  const address = T.find((t) => has(t.name, ['address', 'location']) && fkTo(t, users) && !has(t.name, ['order'])) || find(['address'], (t) => !has(t.name, ['order']));
  const category = find(['category', 'section', 'menucategory', 'menusection'], (t) => t !== restaurant && !has(t.name, ['addon', 'option', 'dish', 'item']));
  const dish = find(['dish', 'menuitem', 'food', 'item', 'product'], (t) => !has(t.name, ['order', 'addon', 'option', 'group', 'categor', 'section', 'custom', 'cart']));
  const addonGroup =
    T.find((t) => dish && t !== dish && fkTo(t, dish) && has(t.name, ['group', 'custom', 'variant', 'option', 'choice'])) ||
    find(['addongroup', 'optiongroup', 'customization', 'customisation', 'variantgroup', 'choicegroup']);
  const addon =
    T.find((t) => addonGroup && t !== addonGroup && fkTo(t, addonGroup) && !has(t.name, ['order', 'cart'])) ||
    find(['addon', 'option', 'topping', 'extra', 'variant'], (t) => t !== addonGroup && !has(t.name, ['group', 'order', 'cart']));
  const rider = find(['rider', 'deliverypartner', 'partner', 'driver', 'agent', 'courier', 'executive', 'delivery'], (t) => !has(t.name, ['order', 'review', 'address', 'payment']));
  const order = find(['order'], (t) => !has(t.name, ['item', 'addon', 'line', 'payment', 'review', 'status', 'history']));
  const orderItem = T.find((t) => order && dish && t !== order && fkTo(t, order) && fkTo(t, dish)) || find(['orderitem', 'orderline', 'lineitem', 'cartitem']);
  const orderAddon = T.find((t) => orderItem && addon && t !== orderItem && fkTo(t, orderItem) && fkTo(t, addon)) || find(['orderitemaddon', 'orderaddon', 'itemaddon', 'orderitemoption']);
  const payment = find(['payment', 'transaction']);
  const review = find(['review', 'rating', 'feedback']);

  return { T, users, address, restaurant, category, dish, addonGroup, addon, rider, order, orderItem, orderAddon, payment, review, fkTo, colOf, timeOf };
}

const P = (cond, msg, list) => { if (!cond) list.push(msg); };
const pkOk = (t, p) => P(t.cols.some((c) => c.pk), `${t.name} has no primary key. Mark its id column as PK.`, p);
const typeMsg = (t, c, want) => `${t.name}.${c.name} is ${c.type}. Use ${want}.`;
const needType = (t, c, types, want, p) => { if (c && !types.includes(c.type)) p.push(typeMsg(t, c, want)); };
// Latitude / longitude matched as whole words, so "flat_building" isn't read as "lat"
const LAT_RE = /(^|_)(lat|latitude)($|_)/i;
const LNG_RE = /(^|_)(lng|lon|long|longitude)($|_)/i;
const latOf = (t, types) => t.cols.find((c) => LAT_RE.test(c.name) && !fkOn(c) && (!types || types.includes(c.type)));
const lngOf = (t, types) => t.cols.find((c) => LNG_RE.test(c.name) && !fkOn(c) && (!types || types.includes(c.type)));
const ORDER = ['order', 'seq', 'position', 'sort', 'index', 'rank', 'pos'];
const STATUS = ['status', 'state'];

// Latitude and longitude as numeric columns
const geo = (R, t, p, what) => {
  const la = latOf(t), lo = lngOf(t);
  if (!la || !lo) p.push(`Add the ${what} location as two numeric columns, latitude and longitude.`);
  else { needType(t, la, ['numeric'], 'numeric', p); needType(t, lo, ['numeric'], 'numeric', p); }
};

// One entry per check. run(R) returns a list of problems; empty means passed.
export const CHECKS = {
  users: {
    name: 'users', desc: 'id, name, phone, email',
    expected: 'A customers table with a primary key, name, phone number and email.',
    run: (R) => {
      const t = R.users; if (!t) return ['No table for customers yet.'];
      const p = []; pkOk(t, p);
      P(R.colOf(t, ['name']), 'Add the customer’s name.', p);
      const ph = R.colOf(t, ['phone', 'mobile', 'contact']);
      if (!ph) p.push('Add a phone number column.'); else needType(t, ph, TXT, 'varchar, because phone numbers can start with + or 0', p);
      P(R.colOf(t, ['email', 'mail']), 'Add an email column.', p);
      return p;
    },
  },
  addresses: {
    name: 'saved addresses', desc: 'belongs to a customer, flat, street, pincode, location',
    expected: 'An addresses table pointing to its customer, with the address lines, pincode, and latitude and longitude.',
    run: (R) => {
      const t = R.address; if (!t) return ['No table for saved addresses yet.'];
      const p = []; pkOk(t, p);
      P(R.fkTo(t, R.users), `${t.name} doesn’t point to a customer. Add user_id and mark it FK to the customers table.`, p);
      P(R.colOf(t, ['flat', 'street', 'line', 'building', 'house', 'area', 'address'], TXT), 'Add the address lines as text, such as flat_building and area_street.', p);
      const pin = R.colOf(t, ['pin', 'zip', 'postal']);
      if (!pin) p.push('Add the pincode.'); else needType(t, pin, TXT, 'varchar, so the pincode keeps its exact digits', p);
      geo(R, t, p, 'map');
      return p;
    },
  },
  restaurants: {
    name: 'restaurants', desc: 'name, phone, cost for two, hours, location',
    expected: 'A restaurants table with name, contact number, cost for two, opening and closing time, and location.',
    run: (R) => {
      const t = R.restaurant; if (!t) return ['No restaurants table yet.'];
      const p = []; pkOk(t, p);
      P(R.colOf(t, ['name']), 'Add the restaurant name.', p);
      P(R.colOf(t, ['phone', 'contact', 'mobile']), 'Add a contact number.', p);
      const cost = R.colOf(t, ['cost', 'fortwo', 'price']);
      if (!cost) p.push('Add the cost for two.'); else needType(t, cost, NUM, 'integer or numeric', p);
      P(R.colOf(t, ['open', 'hour', 'timing', 'start']), 'Add when it opens, such as opens_at (time).', p);
      P(R.colOf(t, ['close', 'hour', 'timing', 'end']), 'Add when it closes, such as closes_at (time).', p);
      geo(R, t, p, 'restaurant’s');
      return p;
    },
  },
  menuSections: {
    name: 'menu sections', desc: 'belongs to a restaurant, name, display order, unique name',
    expected: 'A sections table pointing to its restaurant, with a name and display order, where name is unique per restaurant.',
    run: (R) => {
      const t = R.category; if (!t) return ['No table for menu sections yet.'];
      const p = []; pkOk(t, p);
      const fk = R.fkTo(t, R.restaurant);
      P(fk, `${t.name} needs an FK to its restaurant.`, p);
      const nm = R.colOf(t, ['name', 'title']);
      P(nm, 'Add the section name, such as Starters.', p);
      P(R.colOf(t, ORDER, NUM), 'Store the order the restaurant picks with an integer column such as display_order.', p);
      if (fk && nm && !(fk.uq && nm.uq)) p.push(`Mark both ${fk.name} and ${nm.name} as UQ on ${t.name}, so one restaurant can’t have two "Starters" sections.`);
      return p;
    },
  },
  dishes: {
    name: 'dishes', desc: 'belongs to a section, name, price, veg or not',
    expected: 'A dishes table pointing to its section, with name, description, price and a veg flag.',
    run: (R) => {
      const t = R.dish; if (!t) return ['No dishes table yet.'];
      const p = []; pkOk(t, p);
      P(R.fkTo(t, R.category), `${t.name} needs an FK to its menu section.`, p);
      P(R.colOf(t, ['name', 'title']), 'Add the dish name.', p);
      P(R.colOf(t, ['desc', 'detail', 'about']), 'Add a description.', p);
      const pr = R.colOf(t, ['price', 'cost', 'amount', 'mrp']);
      if (!pr) p.push('Add the price.'); else needType(t, pr, NUM, 'numeric', p);
      const v = R.colOf(t, ['veg']);
      if (!v) p.push('Add is_veg so the menu can show veg and non-veg dots.'); else needType(t, v, ['boolean'], 'boolean', p);
      return p;
    },
  },
  addonGroups: {
    name: 'choice groups', desc: 'belongs to a dish, name, min and max picks',
    expected: 'A table of choice groups pointing to the dish, with a name and how many options may be picked.',
    run: (R) => {
      const t = R.addonGroup; if (!t) return ['No table for choice groups yet, like "Choose your size". It needs an FK to dishes.'];
      const p = []; pkOk(t, p);
      P(R.fkTo(t, R.dish), `${t.name} needs an FK to its dish.`, p);
      P(R.colOf(t, ['name', 'title', 'label']), 'Add the group name, such as Choose your size.', p);
      P(R.colOf(t, ['min', 'required'], ['integer', 'bigint', 'numeric', 'boolean']), 'Add the minimum picks (min_selection), or a required flag.', p);
      P(R.colOf(t, ['max', 'limit'], NUM), 'Add the maximum picks, such as max_selection.', p);
      return p;
    },
  },
  addons: {
    name: 'options', desc: 'belongs to a group, name, extra price',
    expected: 'An options table pointing to its group, with a name and the extra price.',
    run: (R) => {
      const t = R.addon; if (!t) return ['No table for the options in a group yet, like Large or Extra cheese.'];
      const p = []; pkOk(t, p);
      P(R.fkTo(t, R.addonGroup), `${t.name} needs an FK to its choice group.`, p);
      P(R.colOf(t, ['name', 'title', 'label']), 'Add the option name, such as Extra cheese.', p);
      const pr = R.colOf(t, ['price', 'extra', 'additional', 'cost', 'amount']);
      if (!pr) p.push('Add the extra price, such as additional_price.'); else needType(t, pr, NUM, 'numeric', p);
      return p;
    },
  },
  orders: {
    name: 'orders', desc: 'customer, restaurant, address, order number, time placed',
    expected: 'An orders table pointing to the customer, restaurant and address, with a unique order number and when it was placed.',
    run: (R) => {
      const t = R.order; if (!t) return ['No orders table yet.'];
      const p = []; pkOk(t, p);
      P(R.fkTo(t, R.users), `${t.name} needs an FK to the customer.`, p);
      P(R.fkTo(t, R.restaurant), `${t.name} needs an FK to the restaurant.`, p);
      P(R.fkTo(t, R.address), `${t.name} needs an FK to the delivery address.`, p);
      const num = R.colOf(t, ['number', 'code', 'ref', 'display', 'no']);
      if (!num) p.push('Add an order number customers can quote, such as order_number.'); else P(num.uq, `Mark ${num.name} as UQ, so no two orders share a number.`, p);
      const at = R.timeOf(t, ['placed', 'created', 'ordered', 'at', 'time']);
      if (!at) p.push('Add when it was placed, such as placed_at.'); else needType(t, at, TIME, 'timestamptz', p);
      return p;
    },
  },
  orderItems: {
    name: 'order items', desc: 'one row per dish with its quantity',
    expected: 'An order items table pointing to the order and the dish, with a quantity.',
    run: (R) => {
      const t = R.orderItem; if (!t) return ['No table for the dishes in an order yet. It needs an FK to orders and an FK to dishes.'];
      const p = []; pkOk(t, p);
      P(R.fkTo(t, R.order), `${t.name} needs an FK to its order.`, p);
      P(R.fkTo(t, R.dish), `${t.name} needs an FK to the dish.`, p);
      const q = R.colOf(t, ['qty', 'quantity', 'count', 'units']);
      if (!q) p.push('Add the quantity.'); else needType(t, q, NUM, 'integer', p);
      return p;
    },
  },
  priceSnapshot: {
    name: 'prices kept on the order', desc: 'dish price and add-on prices as paid',
    expected: 'Each order item stores its unit price, and chosen add-ons are stored with the price paid.',
    run: (R) => {
      const p = [];
      const t = R.orderItem;
      if (!t) p.push('There is no order items table to store prices in.');
      else {
        const pr = R.colOf(t, ['price', 'unit', 'rate', 'amount', 'cost']);
        if (!pr) p.push(`Copy the dish price onto ${t.name}, such as price_per_unit. The dish price will change; this one must not.`);
        else needType(t, pr, NUM, 'numeric', p);
      }
      const a = R.orderAddon;
      if (!a) p.push('The add-ons a customer chose aren’t stored. Add a table with order_item_id, addon_id and the price paid for that add-on.');
      else {
        P(R.fkTo(a, R.orderItem), `${a.name} needs an FK to the order item.`, p);
        P(R.fkTo(a, R.addon), `${a.name} needs an FK to the add-on that was picked.`, p);
        const ap = R.colOf(a, ['price', 'amount', 'cost', 'extra']);
        if (!ap) p.push(`Store the price paid on ${a.name}, such as addon_price.`); else needType(a, ap, NUM, 'numeric', p);
      }
      return p;
    },
  },
  addressSnapshot: {
    name: 'address kept on the order', desc: 'where it was delivered, even after edits',
    expected: 'The order stores a copy of the delivery address and its location at the time it was placed.',
    run: (R) => {
      const t = R.order; if (!t) return ['There is no orders table.'];
      const p = [];
      const text = R.colOf(t, ['address', 'flat', 'street', 'line', 'building', 'landmark'], [...TXT, 'jsonb']);
      if (!text) p.push(`${t.name} only points to the saved address, which can be edited or deleted later. Copy the address onto the order when it’s placed, such as delivery_address (text or jsonb).`);
      const isJson = text && text.type === 'jsonb';
      if (!isJson && (!latOf(t, ['numeric']) || !lngOf(t, ['numeric']))) p.push('Copy the delivery location too, as numeric delivery_lat and delivery_lng, so the rider’s map doesn’t move when the saved address changes.');
      return p;
    },
  },
  bill: {
    name: 'bill breakdown', desc: 'item total, delivery fee, taxes, discount, total',
    expected: 'The order stores item total, delivery fee, taxes, discount and the final total as numeric columns.',
    run: (R) => {
      const t = R.order; if (!t) return ['There is no orders table.'];
      const p = [];
      const num = (al, extra) => t.cols.find((c) => !fkOn(c) && !c.pk && has(c.name, al) && (!extra || extra(c)) && NUM.includes(c.type));
      P(num(['itemtotal', 'subtotal', 'itemsum', 'itemamount']), 'Add item_total (numeric): the dishes before fees.', p);
      P(num(['delivery', 'shipping'], (c) => has(c.name, ['fee', 'charge', 'cost', 'amount'])), 'Add delivery_fee (numeric).', p);
      P(num(['tax', 'gst', 'charges']), 'Add taxes and charges (numeric).', p);
      P(num(['discount', 'coupon', 'offer', 'promo']), 'Add discount_amount (numeric).', p);
      P(num(['total', 'grand', 'payable', 'final'], (c) => !has(c.name, ['item', 'sub'])), 'Add total_amount (numeric): what the customer pays.', p);
      return p;
    },
  },
  riders: {
    name: 'delivery partners', desc: 'name, phone, vehicle, live location, online',
    expected: 'A riders table with name, phone, vehicle, live latitude and longitude and an online flag, and orders point to their rider.',
    run: (R) => {
      const t = R.rider; if (!t) return ['No table for delivery partners yet.'];
      const p = []; pkOk(t, p);
      P(R.colOf(t, ['name']), 'Add the rider’s name.', p);
      const ph = R.colOf(t, ['phone', 'mobile', 'contact']);
      if (!ph) p.push('Add a phone number.'); else needType(t, ph, TXT, 'varchar', p);
      P(R.colOf(t, ['vehicle', 'bike']), 'Add the vehicle type.', p);
      geo(R, t, p, 'rider’s live');
      P(R.colOf(t, ['online', 'available', 'active', 'free', 'duty'], ['boolean']), 'Add is_online (boolean), so only riders on duty get orders.', p);
      P(R.order && R.fkTo(R.order, t), 'orders needs rider_id as FK to the riders table. It stays empty until a rider accepts.', p);
      return p;
    },
  },
  tracking: {
    name: 'order tracking', desc: 'status, delivery OTP, delivered time',
    expected: 'The order has a status, a delivery OTP stored as text and a delivered_at time.',
    run: (R) => {
      const t = R.order; if (!t) return ['There is no orders table.'];
      const p = [];
      P(R.colOf(t, STATUS), 'Add a status column (placed, accepted, preparing, out for delivery, delivered, cancelled).', p);
      const otp = R.colOf(t, ['otp', 'verification', 'secret']);
      if (!otp) p.push('Add the delivery OTP.'); else needType(t, otp, TXT, 'varchar, because an OTP like 0472 must keep its leading 0', p);
      P(R.colOf(t, ['delivered', 'completed'], TIME), 'Add delivered_at as a timestamptz.', p);
      return p;
    },
  },
  payments: {
    name: 'payments', desc: 'many attempts per order, unique transaction reference',
    expected: 'A payments table pointing to the order, with a unique transaction reference, mode, amount, status and time.',
    run: (R) => {
      const t = R.payment;
      if (!t) return ['No payments table yet. One order can have several attempts, so a column on orders isn’t enough.'];
      const p = []; pkOk(t, p);
      P(R.fkTo(t, R.order), `${t.name} needs an FK to its order.`, p);
      const ref = R.colOf(t, ['transaction', 'txn', 'reference', 'ref']);
      if (!ref) p.push('Add the gateway’s transaction reference.'); else P(ref.uq, `Mark ${ref.name} as UQ, so a repeated callback can’t record the same payment twice.`, p);
      P(R.colOf(t, ['mode', 'method', 'type', 'instrument']), 'Add the payment mode (UPI, card, wallet, cash on delivery).', p);
      const amt = R.colOf(t, ['amount', 'total', 'paid']);
      if (!amt) p.push('Add the amount.'); else needType(t, amt, NUM, 'numeric', p);
      P(R.colOf(t, STATUS), 'Add a status (pending, success, failed, refunded).', p);
      P(R.colOf(t, ['time', 'at', 'date', 'created', 'paid'], TIME), 'Add when the attempt happened as a timestamptz, such as payment_time.', p);
      return p;
    },
  },
  reviews: {
    name: 'reviews', desc: 'one per order, separate food and rider ratings',
    expected: 'A reviews table pointing to the order (unique), with a restaurant rating and a rider rating.',
    run: (R) => {
      const t = R.review; if (!t) return ['No reviews table yet.'];
      const p = []; pkOk(t, p);
      const fo = R.fkTo(t, R.order);
      if (!fo) p.push(`${t.name} needs an FK to the order. That proves the customer actually ordered.`);
      else P(fo.uq, `Mark ${fo.name} as UQ, so each order gets one review at most.`, p);
      const ratings = t.cols.filter((c) => !fkOn(c) && !c.pk && has(c.name, ['rating', 'stars', 'score']));
      const riderR = ratings.find((c) => has(c.name, ['rider', 'delivery', 'partner', 'driver']));
      const foodR = ratings.find((c) => c !== riderR);
      if (!foodR) p.push('Add a rating for the restaurant, such as restaurant_rating (1 to 5).'); else needType(t, foodR, NUM, 'integer', p);
      if (!riderR) p.push('Add a separate rating for the rider, such as rider_rating.'); else needType(t, riderR, NUM, 'integer', p);
      return p;
    },
  },
};
