'use strict';
const crypto = require('crypto');
const { q, one, run, id } = require('./db');
const { bad, vName, vEmail, vPass, txt, num, skillsOf } = require('./validate');
const { emit, note } = require('./live');
const { hashPw, cookies, startSession, fails } = require('./auth');
const { state } = require('./state');
const CATS = ['Web Development', 'Design', 'Writing', 'Marketing', 'Data & AI', 'Mobile'];
/* routes */
const routes = [],
  R = (m, re, fn, open) => routes.push({ m, re, fn, open });
const myJob = (u, jid) => {
  const j = one('SELECT * FROM jobs WHERE id=?', jid);
  if (!j) bad('Job not found.', 404);
  if (j.uid !== u.id) bad('Not allowed.', 403);
  return j;
};
R('GET', /^\/api\/state$/, ({ u }) => state(u), 1);
R(
  'POST',
  /^\/api\/signup$/,
  ({ b, req, res }) => {
    const email = vEmail(b.email),
      name = vName(b.name);
    vPass(b.password, email);
    if (one('SELECT 1 FROM users WHERE email=?', email))
      bad('An account with this email already exists. Log in instead.', 409);
    const salt = crypto.randomBytes(16).toString('hex'),
      uid = id('u');
    run(
      'INSERT INTO users(id,name,email,salt,hash,role,ts) VALUES(?,?,?,?,?,?,?)',
      uid,
      name,
      email,
      salt,
      hashPw(b.password, salt),
      b.role === 'client' ? 'client' : 'freelancer',
      Date.now(),
    );
    startSession(req, res, uid);
    emit();
    return { ok: 1 };
  },
  1,
);
R(
  'POST',
  /^\/api\/login$/,
  ({ b, req, res }) => {
    const email = String(b.email || '')
        .trim()
        .toLowerCase(),
      k = req.socket.remoteAddress + '|' + email,
      f = fails.get(k) || { n: 0, until: 0 };
    if (f.until > Date.now())
      bad(
        'Too many failed attempts. Try again in ' +
          Math.ceil((f.until - Date.now()) / 1000) +
          ' seconds.',
        429,
      );
    const u = one('SELECT * FROM users WHERE email=?', email);
    const ok =
      u &&
      crypto.timingSafeEqual(
        Buffer.from(hashPw(String(b.password || ''), u.salt), 'hex'),
        Buffer.from(u.hash, 'hex'),
      );
    if (!ok) {
      f.n++;
      if (f.n >= 5) {
        f.until = Date.now() + 30000;
        f.n = 0;
      }
      fails.set(k, f);
      bad('Email or password is incorrect.', 401);
    }
    fails.delete(k);
    startSession(req, res, u.id);
    return { ok: 1 };
  },
  1,
);
R(
  'POST',
  /^\/api\/logout$/,
  ({ req, res }) => {
    const t = cookies(req).sid;
    if (t) run('DELETE FROM sessions WHERE token=?', t);
    res.setHeader('Set-Cookie', 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    return { ok: 1 };
  },
  1,
);
R('POST', /^\/api\/role$/, ({ u, b }) => {
  run('UPDATE users SET role=? WHERE id=?', b.role === 'client' ? 'client' : 'freelancer', u.id);
  return { ok: 1 };
});
R('POST', /^\/api\/profile$/, ({ u, b }) => {
  const name = vName(b.name),
    rate = String(b.rate ?? '').trim();
  if (rate !== '' && !(+rate >= 0 && +rate <= 1e5)) bad('Enter a valid rate.');
  run(
    'UPDATE users SET name=?,title=?,rate=?,loc=?,skills=?,bio=? WHERE id=?',
    name,
    txt(b.title, 80, 'Title', false),
    rate,
    txt(b.loc, 80, 'Location', false),
    skillsOf(b.skills),
    txt(b.bio, 1500, 'Bio', false),
    u.id,
  );
  emit();
  return { ok: 1 };
});
R('POST', /^\/api\/jobs$/, ({ u, b }) => {
  const cat = CATS.includes(b.cat) ? b.cat : bad('Choose a category.'),
    type = b.type === 'hourly' ? 'hourly' : 'fixed',
    level = ['Entry', 'Intermediate', 'Expert'].includes(b.level) ? b.level : 'Intermediate';
  const jid = id('j');
  run(
    'INSERT INTO jobs(id,uid,title,cat,descr,skills,type,amt,level,ts) VALUES(?,?,?,?,?,?,?,?,?,?)',
    jid,
    u.id,
    txt(b.title, 100, 'Title'),
    cat,
    txt(b.desc, 5000, 'Description'),
    skillsOf(b.skills),
    type,
    num(b.amt, 'budget'),
    level,
    Date.now(),
  );
  emit();
  return { id: jid };
});
R('POST', /^\/api\/jobs\/(\w+)\/delete$/, ({ u, p }) => {
  const j = myJob(u, p[0]);
  for (const t of ['props', 'ms', 'reviews', 'saved', 'invites'])
    run(`DELETE FROM ${t} WHERE jobId=?`, j.id);
  run('DELETE FROM jobs WHERE id=?', j.id);
  emit();
  return { ok: 1 };
});
R('POST', /^\/api\/props$/, ({ u, b }) => {
  const j = one('SELECT * FROM jobs WHERE id=?', b.jobId);
  if (!j) bad('Job not found.', 404);
  if (j.uid === u.id) bad('You can’t apply to your own job.');
  if (j.status === 'filled') bad('This job has been filled.');
  if (one('SELECT 1 FROM props WHERE jobId=? AND uid=?', j.id, u.id))
    bad('You already applied to this job.', 409);
  run(
    'INSERT INTO props(id,jobId,uid,bid,letter,ts) VALUES(?,?,?,?,?,?)',
    id('p'),
    j.id,
    u.id,
    num(b.bid, 'amount'),
    txt(b.letter, 5000, 'Cover letter'),
    Date.now(),
  );
  note(j.uid, u.name + ' sent a proposal for “' + j.title + '”', 'mine', 'client');
  emit();
  return { ok: 1 };
});
R('POST', /^\/api\/props\/(\w+)\/(hire|decline)$/, ({ u, p }) => {
  const pr = one('SELECT * FROM props WHERE id=?', p[0]);
  if (!pr) bad('Proposal not found.', 404);
  const j = myJob(u, pr.jobId);
  if (pr.status !== 'pending') bad('That proposal was already handled.');
  if (p[1] === 'decline') {
    run("UPDATE props SET status='declined' WHERE id=?", pr.id);
    note(pr.uid, 'Your proposal for “' + j.title + '” was declined', 'mine', 'freelancer');
  } else {
    if (j.status === 'filled') bad('This job is already filled.');
    run("UPDATE props SET status='accepted' WHERE id=?", pr.id);
    for (const o of q(
      "SELECT * FROM props WHERE jobId=? AND id!=? AND status='pending'",
      j.id,
      pr.id,
    )) {
      run("UPDATE props SET status='declined' WHERE id=?", o.id);
      note(o.uid, 'Another freelancer was hired for “' + j.title + '”', 'mine', 'freelancer');
    }
    run("UPDATE jobs SET status='filled' WHERE id=?", j.id);
    note(pr.uid, 'You were hired for “' + j.title + '”', 'mine', 'freelancer');
  }
  emit();
  return { ok: 1 };
});
R('POST', /^\/api\/jobs\/(\w+)\/ms$/, ({ u, p, b }) => {
  const j = myJob(u, p[0]);
  if (j.status !== 'filled') bad('Hire someone before adding milestones.');
  run(
    'INSERT INTO ms(id,jobId,t,amt,ts) VALUES(?,?,?,?,?)',
    id('m'),
    j.id,
    txt(b.t, 100, 'Milestone name'),
    num(b.amt, 'amount'),
    Date.now(),
  );
  emit();
  return { ok: 1 };
});
R('POST', /^\/api\/ms\/(\w+)\/(fund|release)$/, ({ u, p }) => {
  const m = one('SELECT * FROM ms WHERE id=?', p[0]);
  if (!m) bad('Milestone not found.', 404);
  const j = myJob(u, m.jobId),
    hp = one("SELECT uid FROM props WHERE jobId=? AND status='accepted'", j.id);
  if (p[1] === 'fund') {
    if (m.st !== 'pending') bad('Already funded.');
    run("UPDATE ms SET st='funded' WHERE id=?", m.id);
    note(hp && hp.uid, 'Escrow funded for “' + m.t + '”', 'mine', 'freelancer');
  } else {
    if (m.st !== 'funded') bad('Fund the escrow before releasing.');
    run("UPDATE ms SET st='released' WHERE id=?", m.id);
    note(
      hp && hp.uid,
      'Payment of $' + m.amt + ' released for “' + m.t + '”',
      'mine',
      'freelancer',
    );
  }
  emit();
  return { ok: 1 };
});
R('POST', /^\/api\/jobs\/(\w+)\/review$/, ({ u, p, b }) => {
  const j = myJob(u, p[0]),
    hp = one("SELECT uid FROM props WHERE jobId=? AND status='accepted'", j.id);
  if (!hp || !one("SELECT 1 FROM ms WHERE jobId=? AND st='released'", j.id))
    bad('Release a payment before reviewing.');
  if (one('SELECT 1 FROM reviews WHERE jobId=?', j.id)) bad('Already reviewed.', 409);
  const s = Math.round(+b.stars);
  if (!(s >= 1 && s <= 5)) bad('Choose 1–5 stars.');
  run(
    'INSERT INTO reviews VALUES(?,?,?,?,?,?,?)',
    id('r'),
    j.id,
    hp.uid,
    u.id,
    s,
    txt(b.text, 1000, 'Review'),
    Date.now(),
  );
  note(hp.uid, 'You received a new review for “' + j.title + '”', 'profile');
  emit();
  return { ok: 1 };
});
R('POST', /^\/api\/msgs$/, ({ u, b }) => {
  const to = one('SELECT id FROM users WHERE id=?', b.to);
  if (!to) bad('User not found.', 404);
  if (to.id === u.id) bad('You can’t message yourself.');
  run(
    'INSERT INTO msgs(fromId,toId,text,ts) VALUES(?,?,?,?)',
    u.id,
    to.id,
    txt(b.text, 2000, 'Message'),
    Date.now(),
  );
  note(to.id, 'New message from ' + u.name, 'msgs', '', u.id);
  emit(u.id, to.id);
  return { ok: 1 };
});
R('POST', /^\/api\/saved$/, ({ u, b }) => {
  if (!one('SELECT 1 FROM jobs WHERE id=?', b.jobId)) bad('Job not found.', 404);
  run(
    one('SELECT 1 FROM saved WHERE uid=? AND jobId=?', u.id, b.jobId)
      ? 'DELETE FROM saved WHERE uid=? AND jobId=?'
      : 'INSERT INTO saved(uid,jobId) VALUES(?,?)',
    u.id,
    b.jobId,
  );
  return { ok: 1 };
});
R('POST', /^\/api\/invite$/, ({ u, b }) => {
  const j = myJob(u, b.jobId),
    t = one('SELECT id FROM users WHERE id=?', b.tid);
  if (!t || t.id === u.id) bad('Freelancer not found.', 404);
  if (j.status === 'filled') bad('That job is filled.');
  run('INSERT OR IGNORE INTO invites VALUES(?,?,?)', u.id, t.id, j.id);
  note(t.id, u.name + ' invited you to “' + j.title + '”', 'jobs', 'freelancer');
  emit(t.id, u.id);
  return { ok: 1 };
});
R('POST', /^\/api\/notes\/read$/, ({ u, b }) => {
  b.c
    ? run('UPDATE notes SET read=1 WHERE uid=? AND c=?', u.id, String(b.c))
    : run('UPDATE notes SET read=1 WHERE uid=?', u.id);
  return { ok: 1 };
});

module.exports = { routes };
