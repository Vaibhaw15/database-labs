// Udemy lab: the brief, the 12 steps and the requirements shown on the right.
// `tests` lists which checks in ./checks.js each step runs.

export const REQ_F = [
  'People sign up with their name, email and a password.',
  'Instructors publish courses, and one course can have several instructors.',
  'Anyone can browse the catalogue without signing in, and see each course’s title, price and instructors.',
  'Each course is split into modules, and each module into lessons, in an order the instructor chooses.',
  'Every lesson is a video with a title, a duration and a link to its video file.',
  'A student pays once to join a course.',
  'The “My learning” page lists a student’s courses with how far they’ve got, such as 40% complete.',
  'Students mark a lesson as done when they finish it.',
];
export const REQ_NF = [
  'Up to 20,000 students may be watching at the same moment.',
  'If a student closes the tab, they lose no more than 10 seconds of their place in the video.',
  '“My learning” loads in well under a second.',
];

export const STEPS = [
  { n: 1, stage: 'Intro', level: 'easy', title: 'The brief',
    brief: 'You are designing the database for a new video-course platform, a small version of Udemy. The requirements are on the right. Every table you build from here comes from them.',
    task: 'Read both lists of requirements, then move on.', hint: 'Functional requirements say what the system does. Non-functional ones say how well it has to do it: load, speed and data loss.', tests: [] },
  { n: 2, stage: 'Find', level: 'easy', title: 'Spot the entities',
    brief: 'Good designs start by naming what the system has to remember. These are entities. Each one usually becomes a table.',
    task: 'Read the requirements and type each entity you find. Then check your list.', hint: 'Look for nouns that have their own details: something with a name, a title or a price. Things like “price” are details of an entity, not entities.', entities: true, tests: [] },
  { n: 3, stage: 'Draw', level: 'easy', title: 'Lay out the tables',
    brief: 'Now turn your entities into tables on the board.',
    task: 'Add a table for each entity, give it a primary key, add the columns the requirements mention and choose a type for each. A course holds modules and a module holds lessons: link them, and keep the order the instructor sets. Then run the checks.',
    hint: 'A module belongs to one course, so the module row carries course_id, marked FK to course.id. Same for lessons and modules. An integer position column stores the order.', tests: ['users','course','modules','lessons'] },
  { n: 4, stage: 'Connect', level: 'medium', title: 'Who teaches what',
    brief: 'The catalogue shows instructor names on every course. One course can have several instructors, and one instructor can teach many courses.',
    task: 'Store which instructor teaches which course.', hint: 'Many-to-many needs a table in the middle. Each row pairs one course_id with one instructor user_id.', tests: ['instructors'] },
  { n: 5, stage: 'Connect', level: 'medium', title: 'Joining a course',
    brief: 'Paying for a course enrols the student in it. A student can join many courses, and a course has many students.',
    task: 'Store who joined which course, and when.', hint: 'Another table in the middle, pairing user_id and course_id, plus enrolled_at as timestamptz.', tests: ['enrolments'] },
  { n: 6, stage: 'Connect', level: 'medium', title: 'Ticking off lessons',
    brief: 'Students mark lessons as done. “My learning” shows a percentage for each course.',
    task: 'Store what you need to work that percentage out.', hint: 'Store the facts, not the percentage. One row per student and lesson with a completed flag lets you count finished lessons against the total.', tests: ['progress'] },
  { n: 7, stage: 'Change', level: 'medium', title: 'Pick up where they left off',
    from: 'Product manager', message: 'Students keep asking for this: when they reopen a lesson, the video should continue from where they stopped, not start again.',
    task: 'Change your tables to save that place. Everything from earlier steps must still pass.', hint: 'The progress row already exists per student and lesson. Give it a number of seconds into the video.', tests: ['resume'] },
  { n: 8, stage: 'Change', level: 'medium', title: 'A price change',
    from: 'Instructor', message: 'From 1 March my course goes from ₹2,999 to ₹4,999. About 1,200 people already bought it at the old price. Anyone who asks for a refund gets back exactly what they paid.',
    task: 'Meera buys in February for ₹2,999. Arjun buys in March for ₹4,999. Both ask for a refund in April. Make sure the database knows Meera gets ₹2,999 and Arjun gets ₹4,999.', hint: 'course.price only knows today’s price. Copy the amount onto the enrolment at the moment of purchase.', tests: ['pricePaid'] },
  { n: 9, stage: 'Change', level: 'medium', title: 'No duplicate pairs',
    from: 'On-call engineer', message: 'Around 9pm last night 20,000 students were watching. The player saves each student’s place every 10 seconds, and every save inserted a new row instead of updating the existing one. Separately, the payment provider sent one success message twice, so a student was enrolled in the same course twice and now sees it twice.',
    task: 'These are the same bug. A student should have one enrolment per course and one progress row per lesson. Make the database itself refuse a second row for the same pair.', hint: 'Mark UQ on both foreign keys in the same table. Here that means the pair is unique together, so the app can update the row instead of adding one.', tests: ['uniquePairs'] },
  { n: 10, stage: 'Change', level: 'medium', title: 'Instructor profiles',
    from: 'Product manager', message: 'Every instructor gets a public page with a short bio, their qualifications and links to their social profiles.',
    task: 'Change your tables to support it. Everything before must still pass.', hint: 'Students don’t have bios, so a separate instructor_profiles table with user_id (FK, UQ) keeps users clean. Links fit jsonb or their own table.', tests: ['profiles'] },
  { n: 11, stage: 'Change', level: 'easy', title: 'Course categories',
    from: 'Product manager', message: 'Courses belong to categories such as Web Development or Data Science. A course sits in exactly one category, and each category page lists its courses.',
    task: 'Change your tables to support it.', hint: 'One category has many courses, so course gets a category_id. No table in the middle needed.', tests: ['categories'] },
  { n: 12, stage: 'Change', level: 'easy', title: 'Comments and replies',
    from: 'Product manager', message: 'Students can leave a comment under a lesson, and other students can reply to it. The lesson page shows each comment with its replies underneath, oldest first.',
    task: 'Change your tables to support it.', hint: 'A replies table with comment_id works. So does a single comments table where parent_id points back to comments.id, which also handles replies to replies later.', tests: ['postComment','replies'] },
];

export const ENTITY_NEED = [
  { label: 'People', al: ['user','student','account','instructor','member','learner'], miss: 'Who signs up? You haven’t named the people using the platform.' },
  { label: 'Courses', al: ['course'], miss: 'You haven’t named the main thing being sold.' },
  { label: 'Course parts', al: ['module','section','chapter','unit'], miss: 'A course is split into parts. Name them.' },
  { label: 'Lessons', al: ['lesson','lecture','video'], miss: 'Each part holds smaller pieces a student watches. Name them.' },
];
