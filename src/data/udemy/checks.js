// Udemy lab: how to find each table's role, and the check for every step.
import { has, is, NUM, TXT, TIME, refT, fkOn } from '../../lib/matching.js';

// Works out which of the user's tables plays which role (users, course, enrolment...).
export function resolve(T) {
  const fkTo = (t, x) => (t && x ? t.cols.find(c => refT(c) === x.id) : null);
  const colOf = (t, al, types, allowFk) => t ? t.cols.find(c => has(c.name, al) && (!types || types.includes(c.type)) && (allowFk || !fkOn(c)) && !c.pk) : null;
  const find = (al, pred = () => true) => T.find(t => is(t.name, al) && pred(t)) || T.find(t => has(t.name, al) && pred(t));
  const users = find(['user','account','student','member','people','person'], t => !has(t.name, ['course','lesson','progress','comment']));
  const course = T.find(t => is(t.name, ['course'])) || T.find(t => has(t.name, ['course']) && colOf(t, ['title','name']) && colOf(t, ['price','cost','fee']));
  const module = find(['module','section','chapter','unit'], t => t !== course);
  const lesson = find(['lesson','lecture','video'], t => !has(t.name, ['progress','comment','reply','complet']));
  const category = find(['category','categories','genre','topic'], t => t !== course && !fkTo(t, course));
  const pairs = (a, b) => (a && b ? T.filter(t => t !== a && t !== b && fkTo(t, a) && fkTo(t, b)) : []);
  const instrEntity = find(['instructor','teacher','tutor'], t => !fkTo(t, course));
  const cu = pairs(course, users);
  const named = (list, al) => list.find(t => has(t.name, al));
  const ENROL = ['enrol','enroll','purchase','order','subscri','student','member','join','buy'];
  const INSTR = ['instruct','teach','tutor','author','mentor','creator'];
  let instr = named(cu.concat(pairs(course, instrEntity)), INSTR) || null;
  let enrol = named(cu.filter(t => t !== instr), ENROL) || null;
  if (!enrol) enrol = cu.find(t => t !== instr && !has(t.name, INSTR) && colOf(t, ['at','date','time','joined','created'], TIME)) || null;
  if (!instr) instr = cu.find(t => t !== enrol && !has(t.name, ENROL)) || null;
  const lu = pairs(lesson, users);
  const progress = named(lu, ['progress','complet','watch','track','view','status']) || lu.find(t => !has(t.name, ['comment','reply','note','review'])) || null;
  const comment = find(['comment','discussion','question','post'], t => !has(t.name, ['reply','replies','answer','response']));
  const reply = comment ? T.find(t => t !== comment && has(t.name, ['reply','replies','answer','response']) && fkTo(t, comment)) || null : null;
  const selfRef = comment ? comment.cols.find(c => refT(c) === comment.id) : null;
  const timeOf = (t, al) => colOf(t, al, TIME) || colOf(t, al);
  return { T, timeOf, users, course, module, lesson, category, instr, instrEntity, enrol, progress, comment, reply, selfRef, fkTo, colOf, pairs };
}

// One entry per check. run(R) returns a list of problems; empty means passed.
const P = (cond, msg, list) => { if (!cond) list.push(msg); };
const pkOk = (t, p) => P(t.cols.some(c => c.pk), `${t.name} has no primary key. Mark its id column as PK.`, p);
const typeMsg = (t, c, want) => `${t.name}.${c.name} is ${c.type}. Use ${want}.`;

export const CHECKS = {
  users: { name: 'users', desc: 'id, name, email, password', expected: 'A users table with a primary key, name, email and password.',
    run: R => { const p = []; const t = R.users; if (!t) return ['No users table yet.']; pkOk(t, p);
      P(R.colOf(t, ['name']), 'Add a name column.', p); P(R.colOf(t, ['email','mail']), 'Add an email column.', p);
      P(R.colOf(t, ['password','pass','hash','pwd']), 'Add a password column (store a hash, never the plain password).', p); return p; } },
  course: { name: 'course', desc: 'id, title, price', expected: 'A course table with a primary key, a title and a numeric price.',
    run: R => { const p = []; const t = R.course; if (!t) return ['No course table yet.']; pkOk(t, p);
      P(R.colOf(t, ['title','name']), 'Add a title column.', p);
      const pr = R.colOf(t, ['price','cost','fee']); if (!pr) p.push('Add a price column.'); else if (!NUM.includes(pr.type)) p.push(typeMsg(t, pr, 'numeric or integer'));
      return p; } },
  modules: { name: 'modules', desc: 'id, title, belongs to a course, position', expected: 'A modules table that points to its course and stores its position.',
    run: R => { const p = []; const t = R.module; if (!t) return ['No modules table yet.']; pkOk(t, p);
      P(R.colOf(t, ['title','name']), 'Add a title column.', p);
      P(R.fkTo(t, R.course), `${t.name} doesn't point to a course. Add course_id and mark it FK to course.id.`, p);
      P(R.colOf(t, ['position','order','sort','seq','index','rank','number','pos'], NUM), 'Store the order the instructor sets with an integer position column.', p); return p; } },
  lessons: { name: 'lessons', desc: 'id, title, length, video URL, belongs to a module, position', expected: 'A lessons table with title, duration, video URL, its module and its position.',
    run: R => { const p = []; const t = R.lesson; if (!t) return ['No lessons table yet.']; pkOk(t, p);
      P(R.colOf(t, ['title','name']), 'Add a title column.', p);
      const d = R.colOf(t, ['length','duration','second','minute','runtime']); if (!d) p.push('Add the video length (for example duration_seconds).'); else if (!NUM.includes(d.type)) p.push(typeMsg(t, d, 'an integer number of seconds'));
      P(R.colOf(t, ['url','video','file','src','link','path'], TXT), 'Add the video file URL as text.', p);
      P(R.fkTo(t, R.module), `${t.name} doesn't point to a module. Add module_id as FK to the modules table.`, p);
      P(R.colOf(t, ['position','order','sort','seq','index','rank','number','pos'], NUM), 'Store the lesson order with an integer position column.', p); return p; } },
  instructors: { name: 'course_instructors', desc: 'one course has many instructors', expected: 'A table pairing each course with each of its instructors.',
    run: R => { if (R.instr) return []; if (R.course && R.course.cols.some(c => R.users && refT(c) === R.users.id)) return ['A single instructor column on course fits only one person. A course can have several, so use a separate table that pairs courses with instructors.'];
      return ['No table pairs a course with an instructor yet. It needs an FK to course and an FK to the instructor (users).']; } },
  enrolments: { name: 'enrolments', desc: 'which student joined which course, and when', expected: 'A table pairing students with courses, with the time they joined.',
    run: R => { const t = R.enrol; if (!t) return ['No table pairs a student with a course yet. It needs an FK to users and an FK to course.'];
      const any = R.timeOf(t, ['at','date','time','joined','created','enrol','enroll','purchased']);
      if (!any) return ['Add a column for when they joined, such as enrolled_at.']; if (!TIME.includes(any.type)) return [typeMsg(t, any, 'timestamptz')]; return []; } },
  progress: { name: 'lesson_progress', desc: 'which student finished which lesson', expected: 'A table pairing students with lessons, marking completion.',
    run: R => { const t = R.progress; if (!t) return ['No table pairs a student with a lesson yet. It needs an FK to users and an FK to lessons.'];
      const c = R.colOf(t, ['complet','done','finish','watched'], ['boolean','timestamptz']);
      return c ? [] : ['Add a column that records completion, such as is_completed (boolean) or completed_at (timestamptz).']; } },
  resume: { name: 'resume point', desc: 'where in the video they left', expected: 'The progress row stores seconds into the video as a number.',
    run: R => { const t = R.progress; if (!t) return ['There is no lesson progress table to store the position in.'];
      const AL = ['position','second','offset','lastseen','seen','resume','playhead','upto','where','left','pos','time','progress','watched'];
      const c = t.cols.find(x => !fkOn(x) && !x.pk && has(x.name, AL) && !has(x.name, ['complet','done','finish']) && NUM.includes(x.type));
      if (c) return []; const wrong = t.cols.find(x => !fkOn(x) && has(x.name, AL) && TIME.includes(x.type) && !has(x.name, ['complet']));
      return [wrong ? `${t.name}.${wrong.name} is a timestamp, which records when, not where. Store the seconds into the video as an integer.` : 'Add a column for the playback position in seconds, such as last_position_seconds (integer).']; } },
  pricePaid: { name: 'price paid', desc: 'what each student actually paid', expected: 'The enrolment stores the amount the student paid.',
    run: R => { const t = R.enrol; if (!t) return ['There is no enrolment table to store the price in.'];
      const c = R.colOf(t, ['paid','price','amount','cost','fee','total']);
      if (!c) return ['Course price changes over time, so copy the amount onto the enrolment, such as price_paid.']; if (!NUM.includes(c.type)) return [typeMsg(t, c, 'numeric or integer')]; return []; } },
  uniquePairs: { name: 'one row per pair', desc: 'no duplicate enrolments or progress rows', expected: 'student + course is unique on enrolments, and student + lesson is unique on progress.',
    run: R => { const p = []; const chk = (t, a, b, label) => { if (!t) { p.push(`No ${label} table found.`); return; }
        const ca = t.cols.find(c => a && refT(c) === a.id), cb = t.cols.find(c => b && refT(c) === b.id);
        if (!ca || !cb) { p.push(`${t.name} needs both foreign keys.`); return; }
        if (!(ca.uq && cb.uq)) p.push(`Mark both ${ca.name} and ${cb.name} as UQ on ${t.name}, so the pair is unique together.`); };
      chk(R.enrol, R.users, R.course, 'enrolment'); chk(R.progress, R.users, R.lesson, 'lesson progress'); return p; } },
  profiles: { name: 'instructor profile', desc: 'bio, qualifications, social links', expected: 'Instructor profile data linked to the instructor: bio, qualifications and social links.',
    run: R => { const p = []; const extra = R.T.filter(t => t !== R.users && has(t.name, ['profile','instructor','teacher','bio','social','link']) && !has(t.name, ['course']));
      const pool = [R.users, ...extra].filter(Boolean);
      const findIn = al => pool.find(t => R.colOf(t, al, null, false));
      P(findIn(['bio','about','summary','description','headline']), 'Add a short bio (text).', p);
      P(findIn(['qualif','credential','degree','certif','experience','education']), 'Add qualifications, for example a text[] or a text column.', p);
      const social = findIn(['social','twitter','linkedin','website','youtube','github','instagram','links']) || pool.find(t => has(t.name, ['social','link']) && R.colOf(t, ['url','link','handle']));
      P(social, 'Add social links, such as a jsonb column or a separate table with a url per link.', p);
      extra.forEach(t => { if (R.users && !t.cols.some(c => refT(c) && (refT(c) === R.users.id || pool.some(x => x.id === refT(c))))) p.push(`${t.name} isn't linked to anyone. Add an FK to the instructor's user.`); });
      return p; } },
  categories: { name: 'categories', desc: 'each course sits in one category', expected: 'A categories table, and course points to one category.',
    run: R => { const p = []; const t = R.category; if (!t) return ['No categories table yet.']; pkOk(t, p);
      P(R.colOf(t, ['name','title']), 'Give the category a name.', p);
      if (!R.fkTo(R.course, t)) { const join = R.pairs(R.course, t)[0]; p.push(join ? `Each course sits in exactly one category, so a category_id column on course is enough. ${join.name} allows many.` : 'course needs a category_id column marked FK to the categories table.'); }
      return p; } },
  postComment: { name: 'post a comment', desc: 'a student comments under a lesson', expected: 'A comments table with its lesson, its author, the text and when it was posted.',
    run: R => { const p = []; const t = R.comment; if (!t) return ['No comments table yet.']; pkOk(t, p);
      P(R.fkTo(t, R.lesson), `${t.name} needs an FK to the lesson it sits under.`, p);
      P(R.fkTo(t, R.users), `${t.name} needs an FK to the student who wrote it.`, p);
      P(R.colOf(t, ['body','text','content','comment','message']), 'Add the comment text.', p);
      const ts = R.timeOf(t, ['at','created','posted','date','time']); if (!ts) p.push('Add created_at so comments can be shown oldest first.'); else if (!TIME.includes(ts.type)) p.push(typeMsg(t, ts, 'timestamptz'));
      return p; } },
  replies: { name: 'replies', desc: 'one comment has many replies, oldest first', expected: 'Replies point to their comment, with author, text and time posted.',
    run: R => { const c = R.comment; if (!c) return ['Create the comments table first.']; if (R.selfRef) return [];
      const t = R.reply; if (!t) return ['No way to reply yet. Add a replies table with an FK to comments, or a parent_id on comments that points to comments.id.'];
      const p = []; P(R.fkTo(t, R.users), `${t.name} needs an FK to the student who replied.`, p);
      P(R.colOf(t, ['body','text','content','reply','message']), 'Add the reply text.', p);
      const ts = R.timeOf(t, ['at','created','posted','date','time']); if (!ts) p.push('Add created_at so replies can be shown oldest first.'); else if (!TIME.includes(ts.type)) p.push(typeMsg(t, ts, 'timestamptz'));
      return p; } },
};
