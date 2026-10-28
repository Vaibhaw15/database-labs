// Splitwise lab: the brief, the 15 steps and the requirements shown on the right.
// `tests` lists which checks in ./checks.js each step runs.

export const REQ_F = [
  'People sign up with their name, email and phone, and pick a default currency.',
  'Friends create groups such as "Goa trip" or "Flat 302" and add members. Members can leave later.',
  'Anyone in a group adds an expense: what it was for, the date, the amount and who paid.',
  'An expense is split between some or all members: equally, by exact amounts, by percentages or by shares.',
  'Everyone sees how much they owe and are owed, in each group and overall.',
  'People settle up by recording a payment to someone they owe.',
  'Two friends can also share an expense without being in a group.',
];

export const REQ_NF = [
  'A busy group can have 10,000 expenses, and its balances still load in under a second.',
  'Money never goes missing: every expense’s shares add up exactly to its total, and balances always match the history.',
  'Amounts are exact to the paisa. No rounding drift, ever.',
  'The mobile app works offline and syncs later, and a retried request never creates a duplicate.',
];

export const STEPS = [
  { n: 1, stage: 'Intro', level: 'easy', title: 'The brief',
    brief: 'You are designing the database for an expense-sharing app like Splitwise. Friends add what they spent, the app works out who owes whom, and people settle up. It looks simple, but it is all money, and money has to add up exactly.',
    task: 'Read both lists of requirements, then move on.',
    hint: 'Read the non-functional requirements twice. Exact amounts, balances that match the history, and no duplicates from offline retries will each turn into a step.',
    tests: [] },

  { n: 2, stage: 'Find', level: 'easy', title: 'Spot the entities',
    brief: 'Start by naming what the app has to remember. Each entity usually becomes a table.',
    task: 'Read the requirements and type each entity you find. Then check your list.',
    hint: 'An expense is one thing, but how it is divided between people is another: each person’s share has its own amount. Paying someone back is not an expense either.',
    entities: true, tests: [] },

  { n: 3, stage: 'Draw', level: 'medium', title: 'Lay out the tables',
    brief: 'Start with people and groups.',
    task: 'Create tables for users, groups and group members. A person can be in many groups and a group has many people, so members is a table in the middle. Record when each person joined and when they left, and make sure nobody can be added to the same group twice. Then run the checks.',
    hint: 'group_members has group_id and user_id, both FK and both UQ so the pair is unique. joined_at and left_at are timestamptz. Leaving sets left_at instead of deleting the row, because their old expenses still need them.',
    tests: ['users', 'groups', 'members'] },

  { n: 4, stage: 'Connect', level: 'medium', title: 'Adding an expense',
    brief: 'Neha adds "Dinner at Thalassa" to the Goa trip group: ₹2,400 on 14 March, paid by her.',
    task: 'Store expenses with what they were for, the amount, the date and who paid.',
    hint: 'Store money as numeric, or as integer paise (240000 for ₹2,400). Never a floating-point type. The date it was spent is a date, which is different from when it was entered, which is a timestamptz.',
    tests: ['expenses'] },

  { n: 5, stage: 'Connect', level: 'medium', title: 'Who owes what',
    brief: 'The dinner was for Neha, Rahul, Arjun and Priya. Each owes ₹600 of it. Next time only three people share a cab.',
    task: 'Store, for each expense, how much each person in it owes. A person appears at most once in any expense.',
    hint: 'An expense_splits table with expense_id and user_id (both FK, both UQ together) and owed_amount. The owed amounts of an expense must add up to its total.',
    tests: ['splits'] },

  { n: 6, stage: 'Connect', level: 'hard', title: 'Four ways to split',
    from: 'Product manager',
    message: 'People split in four ways: equally, by exact amounts, by percentages (40/30/30) or by shares (2 shares for the couple, 1 for each single). When someone taps Edit, they must see the split exactly as they entered it, not just the final rupees.',
    task: 'Change your tables so an expense remembers how it was split, and each person’s row keeps what was entered for them as well as what they owe.',
    hint: 'Add split_type to expenses. Keep owed_amount, and add the input next to it, such as share_value (the percent, the number of shares, or the exact amount). Storing only the result loses what the user typed.',
    tests: ['splitTypes'] },

  { n: 7, stage: 'Change', level: 'hard', title: 'Two people paid',
    from: 'Support team',
    message: 'The hotel bill was ₹18,000. Rahul paid ₹10,000 on his card and Arjun paid ₹8,000 in cash. Right now an expense can only have one payer, so people are creating two fake expenses.',
    task: 'Let several people pay for one expense, each a different amount.',
    hint: 'Move "who paid" into its own table: expense_payers with expense_id and user_id (UQ together) and paid_amount. The paid amounts add up to the total, just like the owed amounts.',
    tests: ['payers'] },

  { n: 8, stage: 'Change', level: 'medium', title: 'Friends outside groups',
    from: 'Product manager',
    message: 'People want to add friends and share one-off expenses, like a movie with one friend, without creating a group. A friend request can be pending until the other person accepts.',
    task: 'Store friendships between users, with a status. The same two people shouldn’t be friends twice.',
    hint: 'A friendships table with two FKs to users (user_id and friend_id), both UQ together, plus status and created_at. Many apps store each pair once with the smaller id first, using a CHECK. Expenses then just leave group_id empty.',
    tests: ['friends'] },

  { n: 9, stage: 'Change', level: 'medium', title: 'Settle up',
    from: 'Product manager',
    message: 'Arjun owes Neha ₹1,850. He sends it over UPI and taps "Settle up". This isn’t an expense, nobody bought anything, but it must reduce what Arjun owes.',
    task: 'Store settlements: who paid whom, how much and when.',
    hint: 'A settlements table with two FKs to users (payer_id and payee_id), the amount, an optional group_id and settled_at. Keeping settlements separate from expenses keeps spending reports honest.',
    tests: ['settlements'] },

  { n: 10, stage: 'Change', level: 'hard', title: 'The trip abroad',
    from: 'Group admin',
    message: 'Our Bali trip group uses rupees, but half the bills are in Indonesian rupiah and some in dollars. If the exchange rate changes next week, the expenses we already added must not change.',
    task: 'Let each expense be in its own currency, and keep the rate used to convert it to the group’s currency.',
    hint: 'groups gets base_currency. expenses get currency (a 3-letter code like IDR) and exchange_rate as numeric, frozen when the expense is added. A rate needs decimals, so integer won’t do.',
    tests: ['currency'] },

  { n: 11, stage: 'Change', level: 'hard', title: 'Balances in under a second',
    from: 'On-call engineer',
    message: 'The "Flat 302" group has 11,000 expenses over three years. Opening it adds up every split, payer and settlement on each visit and takes 6 seconds.',
    task: 'Store each person’s current balance so the group page can read it directly. There must be exactly one balance row per person per group.',
    hint: 'A group_balances table with group_id and user_id (both FK, UQ together) and net_amount, updated in the same transaction as each expense or settlement. It is a cache: the history stays the source of truth.',
    tests: ['balances'] },

  { n: 12, stage: 'Change', level: 'hard', title: 'Who changed the dinner bill?',
    from: 'Support team',
    message: 'Neha says the dinner was ₹2,400, but now it shows ₹3,000 and she doesn’t know who changed it. Another user deleted an expense by mistake and wants it back.',
    task: 'Keep a history of every change to an expense, and let deleted expenses be restored.',
    hint: 'Soft delete: deleted_at on expenses instead of removing the row. An expense_history table records expense_id, changed_by (FK users), changed_at, and the old and new values as jsonb.',
    tests: ['audit'] },

  { n: 13, stage: 'Change', level: 'hard', title: 'Three identical cab rides',
    from: 'On-call engineer',
    message: 'On flaky metro wifi the app sent "Add expense" for an ₹800 cab, didn’t get a reply, and retried twice. The server saved all three. The group now shows the same cab three times, and the balances are off by ₹1,600.',
    task: 'Make the database itself refuse a retried request that was already saved.',
    hint: 'The app generates a client_request_id (a uuid) when the expense is created on the phone and sends it with every retry. Mark it UQ on expenses, so the second insert fails and the server returns the saved expense instead.',
    tests: ['idempotency'] },

  { n: 14, stage: 'Change', level: 'medium', title: 'Rent every month',
    from: 'Product manager',
    message: 'Flat 302 pays ₹45,000 rent on the 1st of every month and ₹649 for Netflix on the 15th. People want to set it up once, and see which expenses were created automatically.',
    task: 'Store recurring expenses and link each generated expense back to the rule that created it.',
    hint: 'A recurring_expenses table with the group, amount, description, frequency (monthly, weekly...) and next_run_date as a date. Each generated expense gets recurring_id, an FK that stays empty for normal expenses.',
    tests: ['recurring'] },

  { n: 15, stage: 'Change', level: 'hard', title: 'Money never goes missing',
    from: 'Engineering lead',
    message: 'After a bug last month, the cached balances say Arjun owes ₹500, but adding up his history says ₹450. We can’t tell which is right, and nothing records every rupee that moved.',
    task: 'Add a ledger: one row for every amount that moves to or from a person, linked to the expense or settlement that caused it. The rows for any expense or settlement must add up to zero.',
    hint: 'ledger_entries with user_id, group_id, amount (signed: + is owed to you, - is what you owe), expense_id and settlement_id (one of them set), and created_at. Rows are only ever inserted, never updated. Any balance can be rebuilt by summing a person’s rows.',
    tests: ['ledger'] },
];

export const ENTITY_NEED = [
  { label: 'Users', al: ['user', 'person', 'people', 'member', 'friend', 'account'], miss: 'Who shares the expenses? Name the people.' },
  { label: 'Groups', al: ['group', 'trip', 'circle'], miss: 'People share expenses inside something, like "Goa trip". Name it.' },
  { label: 'Expenses', al: ['expense', 'bill', 'spend', 'cost', 'transaction'], miss: 'What gets added when someone pays for dinner?' },
  { label: 'Shares', al: ['split', 'share', 'owe', 'portion', 'debt', 'participant'], miss: 'Each person’s part of an expense has its own amount. Name it.' },
  { label: 'Settlements', al: ['settle', 'payment', 'repay', 'payback', 'transfer'], miss: 'Paying someone back isn’t an expense. What is it?' },
];
