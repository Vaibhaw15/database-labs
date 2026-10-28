# Database Labs

A hands-on database design lab. Pick an app, read its requirements, and build its schema on a drag-and-drop board one step at a time. The app checks your design after every step and tells you exactly what is missing.

## Run it

You need Node.js 18 or newer.

```bash
cd ~/Documents/database-labs
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173). Stop it with Control + C.

To make a production build: `npm run build` (output goes to `dist/`).

## Labs

| Lab | Steps | Level | Opens at |
| --- | --- | --- | --- |
| Udemy (e-learning) | 12 | Easy | `#udemy` |
| Redbus (bus ticket booking) | 13 | Medium | `#redbus` |
| Zomato (food delivery) | 13 | Medium | `#zomato` |
| Splitwise (expense sharing) | 15 | Hard | `#splitwise` |

Each lab has as many steps as its design needs.

### Udemy

1. The brief
2. Spot the entities
3. Lay out the tables (users, course, modules, lessons)
4. Who teaches what (many-to-many)
5. Joining a course (enrolments)
6. Ticking off lessons (progress)
7. Pick up where they left off (video position)
8. A price change (price paid on the enrolment)
9. No duplicate pairs (unique student + course, student + lesson)
10. Instructor profiles
11. Course categories
12. Comments and replies

### Redbus

1. The brief
2. Spot the entities
3. Lay out the tables (users, operators, buses, cities)
4. Routes between cities (two FKs to cities)
5. The seat layout
6. Scheduling trips
7. Boarding and dropping points
8. Booking for a group (bookings + booking_seats)
9. Festival fares (fare stored per booked seat)
10. No seat sold twice (trip + seat unique together)
11. One city, one route (no duplicate cities or routes)
12. Payments (many attempts, unique transaction reference)
13. Status and cancellations

### Zomato

1. The brief
2. Spot the entities
3. Lay out the tables (users, saved addresses, restaurants)
4. Menu sections and dishes (section name unique per restaurant)
5. Customise your dish (choice groups and options)
6. Placing an order (orders + order_items)
7. Menu prices change (dish and add-on prices kept on the order)
8. The address moved (delivery address kept on the order)
9. The bill (item total, fee, taxes, discount, total)
10. Delivery partners (riders + rider on each order)
11. Track the order (status, OTP, delivered time)
12. Payments (many attempts, unique transaction reference)
13. Ratings and reviews (one review per order)

### Splitwise

1. The brief
2. Spot the entities
3. Lay out the tables (users, groups, group members with joined/left times)
4. Adding an expense (exact money types, date vs timestamp)
5. Who owes what (one split row per person per expense)
6. Four ways to split (store the entered value and the result)
7. Two people paid (multiple payers)
8. Friends outside groups (self many-to-many)
9. Settle up (payer and payee, two FKs to users)
10. The trip abroad (currency and frozen exchange rate)
11. Balances in under a second (cached balance per person per group)
12. Who changed the dinner bill? (soft delete and audit history)
13. Three identical cab rides (idempotency key for offline retries)
14. Rent every month (recurring expense rules)
15. Money never goes missing (double-entry ledger)

A full PostgreSQL model answer is in `docs/splitwise-model-answer.sql`.

## Project structure

```
docs/
  splitwise-model-answer.sql   A full schema that passes every Splitwise step
src/
  main.jsx              Starts React
  App.jsx               Routing: home screen (#) or a lab (#udemy, #redbus, #zomato, #splitwise)
  styles.css            All styles, light and dark theme
  data/
    labs.js             The list of labs on the home screen
    udemy/              One folder per lab:
      index.js            title, level, minutes, storage key
      steps.js            requirements, steps, entity list
      checks.js           resolve() finds your tables by role; CHECKS tests each step
    redbus/             (same three files)
    zomato/             (same three files)
    splitwise/          (same three files)
  lib/
    checks.js           Runs a step's checks for any lab
    matching.js         Loose name matching, column types, FK helpers
    geometry.js         Table sizes used to draw relationship lines
    storage.js          Saves each lab's progress in localStorage
  components/
    Home.jsx            Landing screen with every lab and your progress
    LabView.jsx         One lab: state, undo/redo, schema actions
    StepPanel.jsx       Left panel: brief, checks, results, step list
    Board.jsx           Canvas: pan, zoom, drag, fit, auto layout
    TableCard.jsx       One table: name, columns, PK / UQ / FK, types
    Edges.jsx           Relationship lines between tables
    TestCard.jsx        One test result (Expected / Received)
    SidePanel.jsx       Add table, key legend, requirements
```

## Adding a new lab

1. Copy a lab folder, for example `src/data/zomato`, to `src/data/<new-lab>`.
2. In `steps.js`, write the requirements and steps. In `checks.js`, change `resolve()` to find the new lab's tables and write a check for each step. A check's `run(R)` returns a list of problems, empty when passed.
3. In `index.js`, set a new `id`, title, level, minutes and `storeKey`.
4. In `src/data/labs.js`, import it and add it to `LABS`.

It then appears on the home screen and opens at `#<id>`.

## Adding a step to a lab

1. Add a check to `CHECKS` in that lab's `checks.js`.
2. Add the step to `STEPS` in that lab's `steps.js` and list the check's key in `tests`.
