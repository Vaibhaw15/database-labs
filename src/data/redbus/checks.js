// Redbus lab: how to find each table's role, and the check for every step.
import { has, is, NUM, TXT, TIME, refT, fkOn } from '../../lib/matching.js';

// Works out which of the user's tables plays which role (users, buses, trips...).
export function resolve(T) {
  const fkTo = (t, x) => (t && x ? t.cols.find((c) => refT(c) === x.id) : null);
  const fksTo = (t, x) => (t && x ? t.cols.filter((c) => refT(c) === x.id) : []);
  const colOf = (t, al, types, allowFk) =>
    t ? t.cols.find((c) => has(c.name, al) && (!types || types.includes(c.type)) && (allowFk || !fkOn(c)) && !c.pk) : null;
  const find = (al, pred = () => true) => T.find((t) => is(t.name, al) && pred(t)) || T.find((t) => has(t.name, al) && pred(t));

  const operator = find(['operator', 'agency', 'travels', 'company', 'vendor']);
  const city = find(['city', 'cities', 'town', 'location', 'place', 'station'], (t) => !has(t.name, ['route', 'stop', 'point']));
  const route = find(['route'], (t) => !has(t.name, ['stop', 'point']));
  const bus = find(['bus', 'buses', 'coach', 'vehicle'], (t) => !has(t.name, ['seat', 'trip', 'booking', 'route', 'stop', 'operator']));
  const seat = find(['seat', 'berth'], (t) => !has(t.name, ['booking', 'booked', 'passenger', 'ticket', 'reserv']));
  const trip = find(['trip', 'schedule', 'journey', 'departure', 'service', 'ride'], (t) => !has(t.name, ['booking', 'ticket']));
  const stop = T.find((t) => t !== route && has(t.name, ['stop', 'point', 'boarding', 'pickup']) && fkTo(t, route)) || find(['stop', 'point'], (t) => t !== route);
  const booking = find(['booking', 'ticket', 'reservation', 'pnr', 'order'], (t) => !has(t.name, ['seat', 'passenger', 'payment', 'item']));
  const bookingSeat =
    T.find((t) => t !== booking && booking && seat && fkTo(t, booking) && fkTo(t, seat)) ||
    find(['bookingseat', 'passenger', 'ticketseat', 'bookedseat', 'bookingitem'], (t) => t !== booking);
  const payment = find(['payment', 'transaction'], (t) => t !== booking);
  // Users last, so a "passengers" table that belongs to a booking isn't mistaken for the users table
  const users = find(['user', 'customer', 'traveller', 'traveler', 'account', 'member', 'passenger'],
    (t) => t !== bookingSeat && !fkTo(t, booking) && !has(t.name, ['booking', 'seat', 'trip', 'payment']));

  const timeOf = (t, al) => colOf(t, al, TIME) || colOf(t, al);
  return { T, timeOf, users, operator, city, route, bus, seat, trip, stop, booking, bookingSeat, payment, fkTo, fksTo, colOf };
}

const P = (cond, msg, list) => { if (!cond) list.push(msg); };
const pkOk = (t, p) => P(t.cols.some((c) => c.pk), `${t.name} has no primary key. Mark its id column as PK.`, p);
const typeMsg = (t, c, want) => `${t.name}.${c.name} is ${c.type}. Use ${want}.`;
const needType = (t, c, types, want, p) => { if (c && !types.includes(c.type)) p.push(typeMsg(t, c, want)); };
const ORDER = ['order', 'seq', 'position', 'sort', 'index', 'rank', 'pos'];
const STATUS = ['status', 'state'];

// The pair (a, b) is unique together when both columns are marked UQ
const pairUnique = (t, ca, cb) => ca && cb && ca.uq && cb.uq;

// One entry per check. run(R) returns a list of problems; empty means passed.
export const CHECKS = {
  users: {
    name: 'users', desc: 'id, name, phone, email',
    expected: 'A table for travellers with a primary key, name, phone number and email.',
    run: (R) => {
      const t = R.users; if (!t) return ['No table for travellers yet.'];
      const p = []; pkOk(t, p);
      P(R.colOf(t, ['name']), 'Add the traveller’s name.', p);
      const ph = R.colOf(t, ['phone', 'mobile', 'contact']);
      if (!ph) p.push('Add a phone number column.'); else needType(t, ph, TXT, 'varchar or text, because phone numbers can start with + or 0', p);
      P(R.colOf(t, ['email', 'mail']), 'Add an email column.', p);
      return p;
    },
  },
  operators: {
    name: 'operators', desc: 'id, name, contact number',
    expected: 'An operators table with a primary key, a name and a contact number.',
    run: (R) => {
      const t = R.operator; if (!t) return ['No operators table yet.'];
      const p = []; pkOk(t, p);
      P(R.colOf(t, ['name']), 'Add the operator’s name.', p);
      P(R.colOf(t, ['phone', 'contact', 'mobile']), 'Add a contact number.', p);
      return p;
    },
  },
  buses: {
    name: 'buses', desc: 'belongs to an operator, number, type, seat count',
    expected: 'A buses table that points to its operator, with registration number, bus type and total seats.',
    run: (R) => {
      const t = R.bus; if (!t) return ['No buses table yet.'];
      const p = []; pkOk(t, p);
      P(R.fkTo(t, R.operator), `${t.name} doesn't point to an operator. Add operator_id and mark it FK to operators.`, p);
      const num = R.colOf(t, ['number', 'reg', 'plate', 'registration', 'no']);
      if (!num) p.push('Add the registration number, such as bus_number.'); else needType(t, num, TXT, 'varchar, because numbers like KA-01-AB-1234 contain letters', p);
      P(R.colOf(t, ['type', 'category', 'class', 'kind']), 'Add the bus type (AC sleeper, non-AC seater...).', p);
      const cnt = R.colOf(t, ['seat', 'capacity']);
      if (!cnt) p.push('Add the number of seats, such as total_seats.'); else needType(t, cnt, NUM, 'integer', p);
      return p;
    },
  },
  cities: {
    name: 'cities', desc: 'id, name, state',
    expected: 'A cities table with a primary key, a name and a state.',
    run: (R) => {
      const t = R.city; if (!t) return ['No cities table yet.'];
      const p = []; pkOk(t, p);
      P(R.colOf(t, ['name', 'city']), 'Add the city name.', p);
      P(R.colOf(t, ['state', 'region', 'province']), 'Add the state, so two cities with the same name stay apart.', p);
      return p;
    },
  },
  routes: {
    name: 'routes', desc: 'from a city, to a city, distance, journey time',
    expected: 'A routes table with two foreign keys to cities (start and end), a distance and a usual duration.',
    run: (R) => {
      const t = R.route; if (!t) return ['No routes table yet.'];
      const p = []; pkOk(t, p);
      const n = R.fksTo(t, R.city).length;
      if (n === 0) p.push(`${t.name} doesn't point to any city. Add source_city_id and destination_city_id, both FK to cities.`);
      else if (n === 1) p.push('A route has a start and an end, so it needs two foreign keys to cities: source_city_id and destination_city_id.');
      const d = R.colOf(t, ['distance', 'km']);
      if (!d) p.push('Add the distance, such as distance_km.'); else needType(t, d, NUM, 'numeric or integer', p);
      const m = R.colOf(t, ['duration', 'mins', 'minutes', 'time', 'hours']);
      if (!m) p.push('Add the usual journey time, such as duration_mins.'); else needType(t, m, NUM, 'an integer number of minutes', p);
      return p;
    },
  },
  seats: {
    name: 'seats', desc: 'belongs to a bus, seat number, deck, seat type',
    expected: 'A seats table that points to its bus, with seat number, deck and seat type.',
    run: (R) => {
      const t = R.seat; if (!t) return ['No seats table yet.'];
      const p = []; pkOk(t, p);
      P(R.fkTo(t, R.bus), `${t.name} doesn't point to a bus. Add bus_id and mark it FK to buses.`, p);
      const num = R.colOf(t, ['number', 'label', 'code', 'no', 'name']);
      if (!num) p.push('Add the seat number, such as seat_number.'); else needType(t, num, TXT, 'varchar, because seats are numbered like L4 or U12', p);
      P(R.colOf(t, ['deck', 'level', 'floor', 'upper', 'lower']), 'Add the deck (lower or upper).', p);
      P(R.colOf(t, ['type', 'kind', 'sleeper', 'class']), 'Add the seat type (seater or sleeper).', p);
      return p;
    },
  },
  trips: {
    name: 'trips', desc: 'a bus on a route, departure, arrival, fare',
    expected: 'A trips table pointing to a bus and a route, with departure and arrival times and a fare.',
    run: (R) => {
      const t = R.trip; if (!t) return ['No trips table yet.'];
      const p = []; pkOk(t, p);
      P(R.fkTo(t, R.bus), `${t.name} needs an FK to the bus that runs it.`, p);
      P(R.fkTo(t, R.route), `${t.name} needs an FK to the route it runs.`, p);
      const dep = R.timeOf(t, ['depart', 'start', 'leave']);
      if (!dep) p.push('Add departure_time.'); else needType(t, dep, TIME, 'timestamptz, so it holds both date and time', p);
      const arr = R.timeOf(t, ['arriv', 'reach', 'end']);
      if (!arr) p.push('Add arrival_time.'); else needType(t, arr, TIME, 'timestamptz', p);
      const fare = R.colOf(t, ['fare', 'price', 'cost', 'amount']);
      if (!fare) p.push('Add the fare.'); else needType(t, fare, NUM, 'numeric', p);
      return p;
    },
  },
  stops: {
    name: 'route stops', desc: 'boarding and dropping points in order',
    expected: 'A stops table pointing to its route, with name, boarding or dropping, order, and minutes after departure.',
    run: (R) => {
      const t = R.stop; if (!t) return ['No table for boarding and dropping points yet.'];
      const p = []; pkOk(t, p);
      P(R.fkTo(t, R.route), `${t.name} needs an FK to its route.`, p);
      P(R.colOf(t, ['name', 'stop', 'point', 'place', 'location']), 'Add the stop name, such as Majestic.', p);
      P(R.colOf(t, ['type', 'kind', 'boarding', 'dropping', 'pickup']), 'Record whether it’s a boarding or a dropping point.', p);
      P(R.colOf(t, ORDER, NUM), 'Store the order of the stop with an integer column such as stop_order.', p);
      P(R.colOf(t, ['offset', 'minute', 'mins', 'eta', 'time', 'arrival']), 'Store how long after departure the bus reaches the stop, such as time_offset_mins.', p);
      return p;
    },
  },
  bookings: {
    name: 'bookings', desc: 'PNR, traveller, trip, stops, total, time booked',
    expected: 'A bookings table with a unique PNR, the traveller, the trip, boarding and dropping stops, the total and when it was booked.',
    run: (R) => {
      const t = R.booking; if (!t) return ['No bookings table yet.'];
      const p = []; pkOk(t, p);
      const pnr = R.colOf(t, ['pnr', 'reference', 'code', 'ticketno', 'number']);
      if (!pnr) p.push('Add a PNR column.'); else P(pnr.uq, `Mark ${pnr.name} as UQ, so no two bookings share a PNR.`, p);
      P(R.fkTo(t, R.users), `${t.name} needs an FK to the traveller who booked.`, p);
      P(R.fkTo(t, R.trip), `${t.name} needs an FK to the trip.`, p);
      if (R.stop && R.fksTo(t, R.stop).length < 2) p.push('Add boarding_stop_id and dropping_stop_id, both FK to the stops table.');
      const tot = R.colOf(t, ['total', 'amount', 'price', 'fare']);
      if (!tot) p.push('Add the total amount.'); else needType(t, tot, NUM, 'numeric', p);
      const at = R.timeOf(t, ['booked', 'created', 'at', 'date', 'time']);
      if (!at) p.push('Add when it was booked, such as booked_at.'); else needType(t, at, TIME, 'timestamptz', p);
      return p;
    },
  },
  passengers: {
    name: 'booking seats', desc: 'one row per passenger and seat',
    expected: 'A table pointing to the booking and the seat, with passenger name, age and gender.',
    run: (R) => {
      const t = R.bookingSeat;
      if (!t) return ['No table for the passengers in a booking yet. It needs an FK to bookings and an FK to seats.'];
      const p = []; pkOk(t, p);
      P(R.fkTo(t, R.booking), `${t.name} needs an FK to its booking.`, p);
      P(R.fkTo(t, R.seat), `${t.name} needs an FK to the seat.`, p);
      P(R.colOf(t, ['name']), 'Add the passenger’s name.', p);
      const age = R.colOf(t, ['age']);
      if (!age) p.push('Add the passenger’s age.'); else needType(t, age, NUM, 'integer', p);
      P(R.colOf(t, ['gender', 'sex']), 'Add the passenger’s gender. Bus operators use it to seat women safely.', p);
      return p;
    },
  },
  seatFare: {
    name: 'fare paid per seat', desc: 'what each passenger actually paid',
    expected: 'Each booked seat stores the fare charged at the moment of booking.',
    run: (R) => {
      const t = R.bookingSeat; if (!t) return ['There is no booking seats table to store the fare in.'];
      const c = R.colOf(t, ['fare', 'price', 'amount', 'paid', 'cost']);
      if (!c) return ['Fares change, and one seat can be cancelled on its own. Copy the fare onto each booked seat, such as fare.'];
      return NUM.includes(c.type) ? [] : [typeMsg(t, c, 'numeric')];
    },
  },
  noDoubleBooking: {
    name: 'one seat, one passenger', desc: 'seat + trip is unique, seat number is unique per bus',
    expected: 'booking_seats has trip and seat UQ together, and seats has bus and seat number UQ together.',
    run: (R) => {
      const p = [];
      const t = R.bookingSeat;
      if (!t) p.push('No booking seats table found.');
      else {
        const ct = t.cols.find((c) => R.trip && refT(c) === R.trip.id);
        const cs = t.cols.find((c) => R.seat && refT(c) === R.seat.id);
        if (!ct) p.push(`${t.name} only knows the seat, not the trip, so the database can’t tell L4 on Friday’s trip from L4 on Saturday’s. Add trip_id as FK to trips.`);
        if (!cs) p.push(`${t.name} needs an FK to the seat.`);
        if (ct && cs && !pairUnique(t, ct, cs)) p.push(`Mark both ${ct.name} and ${cs.name} as UQ on ${t.name}, so the same seat can’t be booked twice on one trip.`);
      }
      const s = R.seat;
      if (s) {
        const cb = s.cols.find((c) => R.bus && refT(c) === R.bus.id);
        const cn = R.colOf(s, ['number', 'label', 'code', 'no', 'name']);
        if (cb && cn && !pairUnique(s, cb, cn)) p.push(`Mark both ${cb.name} and ${cn.name} as UQ on ${s.name}, so a bus can’t have two seats called L4.`);
      }
      return p;
    },
  },
  uniqueMaster: {
    name: 'no duplicate cities or routes', desc: 'city + state unique, source + destination unique',
    expected: 'cities has name and state UQ together, and routes has source and destination UQ together.',
    run: (R) => {
      const p = [];
      const c = R.city;
      if (c) {
        const n = R.colOf(c, ['name', 'city']), st = R.colOf(c, ['state', 'region', 'province']);
        if (n && st && !pairUnique(c, n, st)) p.push(`Mark both ${n.name} and ${st.name} as UQ on ${c.name}.`);
      } else p.push('No cities table found.');
      const r = R.route;
      if (r) {
        const fks = R.fksTo(r, R.city);
        if (fks.length >= 2 && !(fks[0].uq && fks[1].uq)) p.push(`Mark both ${fks[0].name} and ${fks[1].name} as UQ on ${r.name}.`);
        if (fks.length < 2) p.push(`${r.name} needs its two city foreign keys first.`);
      } else p.push('No routes table found.');
      return p;
    },
  },
  payments: {
    name: 'payments', desc: 'many attempts per booking, unique transaction reference',
    expected: 'A payments table pointing to the booking, with a unique transaction reference, amount, mode, status and time.',
    run: (R) => {
      const t = R.payment;
      if (!t) return ['No payments table yet. One booking can have several attempts, so a column on bookings isn’t enough.'];
      const p = []; pkOk(t, p);
      P(R.fkTo(t, R.booking), `${t.name} needs an FK to its booking.`, p);
      const ref = R.colOf(t, ['transaction', 'txn', 'reference', 'ref', 'gateway']);
      if (!ref) p.push('Add the gateway’s transaction reference.'); else P(ref.uq, `Mark ${ref.name} as UQ, so a repeated callback can’t record the same payment twice.`, p);
      const amt = R.colOf(t, ['amount', 'total', 'paid']);
      if (!amt) p.push('Add the amount.'); else needType(t, amt, NUM, 'numeric', p);
      P(R.colOf(t, ['mode', 'method', 'type', 'instrument']), 'Add the payment mode (UPI, card, net banking...).', p);
      P(R.colOf(t, STATUS), 'Add a status (initiated, success, failed, refunded).', p);
      const at = R.timeOf(t, ['time', 'at', 'date', 'created', 'paid']);
      if (!at || !TIME.includes(at.type)) p.push('Add when the attempt happened as a timestamptz, such as payment_time.');
      return p;
    },
  },
  statuses: {
    name: 'status and cancellations', desc: 'trip status, booking status, cancel one seat',
    expected: 'trips and bookings each have a status, and each booked seat can be cancelled on its own.',
    run: (R) => {
      const p = [];
      P(R.trip && R.colOf(R.trip, STATUS), 'Add a status column to trips (scheduled, boarding, running, completed, cancelled).', p);
      P(R.booking && R.colOf(R.booking, STATUS), 'Add a status column to bookings (pending, confirmed, cancelled).', p);
      P(R.bookingSeat && R.colOf(R.bookingSeat, ['cancel'], ['boolean', 'timestamptz']), 'Add is_cancelled (boolean) or cancelled_at (timestamptz) to the booking seats table, so one passenger can cancel alone.', p);
      return p;
    },
  },
};
