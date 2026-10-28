// Zomato lab: the brief, the 13 steps and the requirements shown on the right.
// `tests` lists which checks in ./checks.js each step runs.

export const REQ_F = [
  'Customers sign up with their name, phone number and email.',
  'Customers save delivery addresses (home, work...) with flat, street, pincode and a map location.',
  'Restaurants list their name, contact number, cost for two, opening hours and location.',
  'Each menu is grouped into sections like Starters or Biryani, in an order the restaurant chooses.',
  'A dish has a name, a description, a price, and is marked veg or non-veg.',
  'Customers order several dishes from one restaurant, with quantities, to one of their saved addresses.',
  'A delivery partner picks the order up and brings it to the customer.',
  'Customers pay online or with cash on delivery.',
];

export const REQ_NF = [
  'At dinner peak the city places 50,000 orders an hour.',
  'Once an order is placed, its bill never changes, even if the menu or the address changes later.',
  'Restaurants near the customer load in under a second.',
];

export const STEPS = [
  { n: 1, stage: 'Intro', level: 'easy', title: 'The brief',
    brief: 'You are designing the database for a food delivery app, a small version of Zomato or Swiggy. Customers browse nearby restaurants, build an order, and a delivery partner brings it to their door. The requirements are on the right.',
    task: 'Read both lists of requirements, then move on.',
    hint: 'Look at the second non-functional line. Menus and addresses keep changing, but a placed order has to stay exactly as it was. That idea comes back more than once.',
    tests: [] },

  { n: 2, stage: 'Find', level: 'easy', title: 'Spot the entities',
    brief: 'Start by naming what the app has to remember. Each entity usually becomes a table.',
    task: 'Read the requirements and type each entity you find. Then check your list.',
    hint: 'There are three groups of people or businesses (customers, restaurants, delivery partners), the things being sold, and what happens when someone buys. A customer can have several addresses, so the address is its own thing too.',
    entities: true, tests: [] },

  { n: 3, stage: 'Draw', level: 'easy', title: 'Lay out the tables',
    brief: 'Turn the first entities into tables on the board.',
    task: 'Create tables for customers, their saved addresses and restaurants. Give each a primary key, add the columns the requirements mention and pick a type for each. One customer can save many addresses: link them. Then run the checks.',
    hint: 'Store latitude and longitude as numeric, so the app can work out distances. Pincodes and phone numbers are text, even though they look like numbers. Opening hours fit the time type.',
    tests: ['users', 'addresses', 'restaurants'] },

  { n: 4, stage: 'Connect', level: 'medium', title: 'Menu sections and dishes',
    brief: 'Every restaurant has its own menu, split into sections like Starters, Biryani and Desserts, in an order the restaurant picks. Each section holds dishes.',
    task: 'Store menus so the app can show each restaurant’s sections in order with their dishes. A restaurant shouldn’t be able to have two sections with the same name.',
    hint: 'Sections point to their restaurant, dishes point to their section. Mark restaurant_id and the section name UQ together. A boolean is_veg drives the green and red dots.',
    tests: ['menuSections', 'dishes'] },

  { n: 5, stage: 'Connect', level: 'medium', title: 'Customise your dish',
    brief: 'A pizza asks "Choose your size" (pick exactly one) and "Extra toppings" (pick up to three). Each choice can add to the price: Large is +₹150, extra cheese is +₹60.',
    task: 'Store these choices for each dish, including how many a customer may pick from each group.',
    hint: 'Two tables. A group belongs to a dish and holds the rules (min and max picks). Each option belongs to a group and has its extra price.',
    tests: ['addonGroups', 'addons'] },

  { n: 6, stage: 'Connect', level: 'medium', title: 'Placing an order',
    brief: 'Priya orders two Paneer Tikkas and one Butter Naan from one restaurant, delivered to her home address. She gets an order number like ZMT-48213 to track it.',
    task: 'Store orders and the dishes in them.',
    hint: 'orders holds what is shared: customer, restaurant, address, a unique order number and when it was placed. order_items holds one row per dish with its quantity.',
    tests: ['orders', 'orderItems'] },

  { n: 7, stage: 'Change', level: 'medium', title: 'Menu prices change',
    from: 'Restaurant owner',
    message: 'From Monday our Paneer Tikka goes from ₹280 to ₹320, and extra cheese from ₹50 to ₹60. Customers who ordered last week must still see what they actually paid, and refunds have to match.',
    task: 'Make sure every order keeps the price of each dish and each add-on as it was when the order was placed.',
    hint: 'Copy the price onto the order item (price_per_unit). Chosen add-ons need their own table, pointing to the order item and the add-on, with the price paid for it.',
    tests: ['priceSnapshot'] },

  { n: 8, stage: 'Change', level: 'medium', title: 'The address moved',
    from: 'Support team',
    message: 'A customer moved flats and edited her "Home" address. Now every past order, including invoices from last month, shows the new flat. Another customer tried to delete an old address and the app refused, because orders still point to it.',
    task: 'An order should remember where it was delivered, even after the saved address is edited or deleted.',
    hint: 'Keep address_id if you like, but also copy the address onto the order when it’s placed: the address text and its latitude and longitude. Same idea as the price, applied to the address.',
    tests: ['addressSnapshot'] },

  { n: 9, stage: 'Change', level: 'easy', title: 'The bill',
    from: 'Finance team',
    message: 'Customers want to see the full bill: item total, delivery fee, taxes and charges, any discount, and the final amount. We also need these numbers for GST filing.',
    task: 'Store each part of the bill on the order.',
    hint: 'Separate numeric columns on orders: item_total, delivery_fee, taxes, discount_amount and total_amount. Storing them, instead of working them out later, keeps the bill fixed.',
    tests: ['bill'] },

  { n: 10, stage: 'Change', level: 'medium', title: 'Delivery partners',
    from: 'Operations team',
    message: 'We are onboarding riders. Each has a name, phone, vehicle type and number. To assign the nearest free rider we need their live location and whether they are online right now.',
    task: 'Store delivery partners, and record which one delivers each order.',
    hint: 'A riders table with location as numeric latitude and longitude plus an is_online flag. An order gets rider_id, which stays empty until someone accepts it.',
    tests: ['riders'] },

  { n: 11, stage: 'Change', level: 'easy', title: 'Track the order',
    from: 'Product manager',
    message: 'Customers watch their order move from placed to accepted, preparing, rider assigned, out for delivery and delivered. The rider must enter a 4-digit OTP from the customer to finish delivery, and we show when it arrived.',
    task: 'Change your tables to support tracking and the delivery OTP.',
    hint: 'On orders: a status column, an OTP stored as text (it can start with 0), and delivered_at as a timestamptz.',
    tests: ['tracking'] },

  { n: 12, stage: 'Change', level: 'medium', title: 'Payments',
    from: 'Finance team',
    message: 'A UPI payment can fail and the customer retries with a card. Cash on delivery has no gateway reference at all. When the gateway retries its callback, we must not record the same payment twice.',
    task: 'Store payment attempts for each order.',
    hint: 'A payments table with order_id (many attempts per order), mode, amount, status and time. Mark the transaction reference UQ. Cash orders leave it empty, and empty values don’t clash with each other.',
    tests: ['payments'] },

  { n: 13, stage: 'Change', level: 'easy', title: 'Ratings and reviews',
    from: 'Product manager',
    message: 'After delivery, customers rate the food and the rider separately, from 1 to 5, and can write a review. Only people who actually ordered can review, and only once per order.',
    task: 'Store reviews so each order gets at most one.',
    hint: 'Point the review at the order, which proves the customer ordered, and mark order_id UQ. Keep two separate rating columns, one for the restaurant and one for the rider.',
    tests: ['reviews'] },
];

export const ENTITY_NEED = [
  { label: 'Customers', al: ['user', 'customer', 'account', 'member', 'eater'], miss: 'Who places the orders? Name the people using the app.' },
  { label: 'Addresses', al: ['address', 'location'], miss: 'Orders are delivered somewhere, and a customer can save several places.' },
  { label: 'Restaurants', al: ['restaurant', 'outlet', 'kitchen', 'store', 'vendor'], miss: 'Who cooks the food?' },
  { label: 'Dishes', al: ['dish', 'item', 'food', 'menu', 'product'], miss: 'What exactly is being ordered?' },
  { label: 'Orders', al: ['order', 'cart'], miss: 'What gets created when a customer checks out?' },
  { label: 'Delivery partners', al: ['rider', 'delivery', 'partner', 'driver', 'agent', 'courier', 'executive'], miss: 'Who brings the food to the door?' },
];
