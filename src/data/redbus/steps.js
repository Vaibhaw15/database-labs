// Redbus lab: the brief, the 12 steps and the requirements shown on the right.
// `tests` lists which checks in ./checks.js each step runs.

export const REQ_F = [
  'Travellers sign up with their name, phone number and email.',
  'Bus operators register with a name and a contact number.',
  'Each operator owns buses. A bus has a registration number, a type such as AC sleeper or non-AC seater, and a seat count.',
  'Every bus has a seat layout: seat numbers, lower or upper deck, seater or sleeper.',
  'Buses run on routes between two cities. A route has a distance and a usual journey time.',
  'A trip is one bus running one route at a set departure time, with a fare.',
  'Travellers search trips by from-city, to-city and date, pick seats and book them.',
  'One booking can cover several passengers, each with their own seat.',
];

export const REQ_NF = [
  'On festival weekends, 5,000 people may try to book the same popular trip within a few minutes.',
  'A seat is never sold to two people on the same trip.',
  'Search results load in under a second.',
];

export const STEPS = [
  { n: 1, stage: 'Intro', level: 'easy', title: 'The brief',
    brief: 'You are designing the database for an online bus-ticket platform, a small version of Redbus. Operators list their buses, travellers find a trip and book seats. The requirements are on the right.',
    task: 'Read both lists of requirements, then move on.',
    hint: 'Notice the non-functional line about seats never being sold twice. You will come back to it. A good schema makes that rule something the database enforces, not something the app hopes for.',
    tests: [] },

  { n: 2, stage: 'Find', level: 'easy', title: 'Spot the entities',
    brief: 'Start by naming what the platform has to remember. Each entity usually becomes a table.',
    task: 'Read the requirements and type each entity you find. Then check your list.',
    hint: 'Ask what has its own details. A traveller has a phone number, a bus has a registration number, a city has a state. A trip is different from a route: the route is Bengaluru to Chennai, a trip is that route on Friday at 10pm.',
    entities: true, tests: [] },

  { n: 3, stage: 'Draw', level: 'easy', title: 'Lay out the tables',
    brief: 'Turn the first entities into tables on the board.',
    task: 'Create tables for travellers, operators, buses and cities. Give each a primary key, add the columns the requirements mention and pick a type for each. Every bus belongs to one operator: link them. Then run the checks.',
    hint: 'One operator owns many buses, so the bus row carries operator_id, marked FK to operators. The registration number is text, the seat count is an integer.',
    tests: ['users', 'operators', 'buses', 'cities'] },

  { n: 4, stage: 'Connect', level: 'medium', title: 'Routes between cities',
    brief: 'A route connects two cities, like Bengaluru to Chennai. It has a distance and a usual journey time.',
    task: 'Store routes so each one knows where it starts and where it ends.',
    hint: 'A route points at the cities table twice. Two foreign keys to the same table is fine: name them source_city_id and destination_city_id so the meaning is clear.',
    tests: ['routes'] },

  { n: 5, stage: 'Connect', level: 'medium', title: 'The seat layout',
    brief: 'Travellers pick seats from a map of the bus. Each bus has its own layout: seat numbers like L4 or U12, lower or upper deck, seater or sleeper.',
    task: 'Store the seats of every bus so the app can draw that map.',
    hint: 'One bus has many seats, so seats carries bus_id. Row and column numbers let the app place each seat on the map.',
    tests: ['seats'] },

  { n: 6, stage: 'Connect', level: 'medium', title: 'Scheduling trips',
    brief: 'An operator runs a bus on a route at a set time. The same bus can run the same route every night, and every run is a separate trip with its own fare.',
    task: 'Store the trips travellers search for.',
    hint: 'A trip points to one bus and one route, and has departure and arrival times as timestamptz. Searching by date then means looking at departure_time.',
    tests: ['trips'] },

  { n: 7, stage: 'Change', level: 'medium', title: 'Boarding and dropping points',
    from: 'Product manager',
    message: 'Travellers don’t board at "Bengaluru". They board at Majestic, Silk Board or Electronic City, and get off at Koyambedu or Guindy. We need to show these points in order, with the time the bus reaches each one.',
    task: 'Change your tables to store these points for each route. Everything from earlier steps must still pass.',
    hint: 'A route has many stops, so stops carry route_id. Store the order of each stop and how many minutes after departure the bus reaches it. Then any trip on that route can work out the clock times.',
    tests: ['stops'] },

  { n: 8, stage: 'Change', level: 'medium', title: 'Booking for a group',
    from: 'Product manager',
    message: 'A family of four books together: one payment, one PNR, but four seats, and each passenger’s name, age and gender has to be on the ticket. They also pick where they board and where they get off.',
    task: 'Store bookings so one booking can hold several passengers and seats.',
    hint: 'Split it in two. bookings holds what is shared: PNR, who booked, the trip, boarding and dropping stops, the total. booking_seats holds one row per passenger with their seat.',
    tests: ['bookings', 'passengers'] },

  { n: 9, stage: 'Change', level: 'medium', title: 'Festival fares',
    from: 'Bus operator',
    message: 'For Diwali week the Bengaluru to Chennai sleeper goes from ₹1,200 to ₹1,800. Plenty of people already booked at the old fare. If one passenger in a group cancels, we refund exactly what was paid for that seat.',
    task: 'Rohit books two seats at ₹1,200 each before the change. Later Sneha books one seat at ₹1,800. Both cancel one seat. Make sure the database knows Rohit gets ₹1,200 back and Sneha gets ₹1,800.',
    hint: 'The trip’s fare only knows today’s price, and a booking total covers every seat. Copy the fare onto each booked seat at the moment of booking.',
    tests: ['seatFare'] },

  { n: 10, stage: 'Change', level: 'medium', title: 'No seat sold twice',
    from: 'On-call engineer',
    message: 'Friday night, 9:58pm. Two people both have a confirmed ticket for seat L4 on the 10pm Bengaluru to Chennai sleeper. They clicked "Book" within a second of each other, both requests checked that the seat was free, and both inserted a row.',
    task: 'Checking in the app isn’t enough when thousands book at once. Make the database itself refuse a second booking of the same seat on the same trip. While you’re there, make sure a bus can’t have two seats with the same number.',
    hint: 'A seat row belongs to a bus, not a trip, so seat_id alone can’t say which night. Add trip_id to booking_seats and mark trip_id and seat_id as UQ together. For the layout, mark bus_id and seat_number UQ together on seats.',
    tests: ['noDoubleBooking'] },

  { n: 11, stage: 'Change', level: 'easy', title: 'One city, one route',
    from: 'Support team',
    message: 'The from-city dropdown shows "Bengaluru, Karnataka" twice, and searches split trips across both. There are also two Bengaluru to Chennai routes with different distances, so half the buses never show up.',
    task: 'Make the database refuse a duplicate city in the same state, and a second route between the same two cities in the same direction.',
    hint: 'Same idea as the seats: mark city name and state UQ together on cities, and source and destination city UQ together on routes. Chennai to Bengaluru is still allowed, because the pair is in a different order.',
    tests: ['uniqueMaster'] },

  { n: 12, stage: 'Change', level: 'medium', title: 'Payments',
    from: 'Finance team',
    message: 'Some payments fail and the traveller tries again with another method, so one booking can have several payment attempts. We need the gateway’s transaction reference for every attempt, and the same reference must never be recorded twice when the gateway retries its callback.',
    task: 'Store payment attempts for each booking.',
    hint: 'A payments table with booking_id (many attempts per booking), amount, mode, status and time. Mark the transaction reference UQ so a repeated callback can’t create a second row.',
    tests: ['payments'] },

  { n: 13, stage: 'Change', level: 'easy', title: 'Status and cancellations',
    from: 'Product manager',
    message: 'Travellers want to see if their bus is scheduled, boarding, running, completed or cancelled. Bookings move from pending to confirmed or cancelled. And one passenger in a group should be able to cancel their seat without cancelling the whole booking.',
    task: 'Change your tables to support all three.',
    hint: 'A status column on trips and another on bookings. For a single seat, a flag on its booking_seats row (is_cancelled, or cancelled_at as a timestamp) is enough.',
    tests: ['statuses'] },
];

export const ENTITY_NEED = [
  { label: 'Travellers', al: ['user', 'customer', 'traveller', 'traveler', 'passenger', 'account', 'member'], miss: 'Who books the tickets? Name the people using the platform.' },
  { label: 'Operators', al: ['operator', 'agency', 'travels', 'company', 'vendor'], miss: 'Someone owns and runs the buses. Name them.' },
  { label: 'Buses', al: ['bus', 'coach', 'vehicle'], miss: 'What actually carries the passengers?' },
  { label: 'Cities', al: ['city', 'cities', 'town', 'location', 'place', 'station', 'route'], miss: 'Trips go from one place to another. Name those places or the route between them.' },
  { label: 'Trips', al: ['trip', 'schedule', 'journey', 'departure', 'service', 'ride'], miss: 'One bus running one route at one time. What is that called?' },
  { label: 'Bookings', al: ['booking', 'ticket', 'reservation', 'pnr', 'order'], miss: 'What does a traveller get when they buy seats?' },
];
