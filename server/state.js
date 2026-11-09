'use strict';
const { q } = require('./db');
/* state snapshot for one user */
const pubUser = u => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  title: u.title,
  rate: u.rate,
  loc: u.loc,
  skills: JSON.parse(u.skills),
  bio: u.bio,
});
function state(u) {
  if (!u) return { me: null };
  const users = q('SELECT * FROM users'),
    nm = Object.fromEntries(users.map(x => [x.id, x.name]));
  const jobsR = q('SELECT * FROM jobs ORDER BY ts DESC'),
    propsR = q('SELECT * FROM props ORDER BY ts DESC'),
    msR = q('SELECT * FROM ms ORDER BY ts');
  const owner = Object.fromEntries(jobsR.map(j => [j.id, j.uid])),
    hired = Object.fromEntries(
      propsR.filter(p => p.status === 'accepted').map(p => [p.jobId, p.uid]),
    );
  const jobs = jobsR.map(j => ({
    id: j.id,
    uid: j.uid,
    title: j.title,
    cat: j.cat,
    desc: j.descr,
    skills: JSON.parse(j.skills),
    type: j.type,
    amt: j.amt,
    level: j.level,
    status: j.status === 'filled' ? 'filled' : undefined,
    owner: nm[j.uid] || 'Unknown',
    ts: j.ts,
    np: propsR.filter(p => p.jobId === j.id).length,
    ms:
      j.uid === u.id || hired[j.id] === u.id
        ? msR.filter(m => m.jobId === j.id).map(m => ({ id: m.id, t: m.t, amt: m.amt, st: m.st }))
        : [],
  }));
  const props = propsR
    .filter(p => p.uid === u.id || owner[p.jobId] === u.id)
    .map(p => ({
      id: p.id,
      jobId: p.jobId,
      uid: p.uid,
      name: nm[p.uid] || 'Unknown',
      bid: p.bid,
      letter: p.letter,
      status: p.status,
      ts: p.ts,
    }));
  const talents = users
    .filter(x => x.id !== u.id && x.title)
    .map(x => ({
      id: x.id,
      name: x.name,
      title: x.title,
      rate: x.rate || 0,
      loc: x.loc || 'Remote',
      skills: JSON.parse(x.skills),
      bio: x.bio,
      jss: 0,
    }));
  return {
    me: pubUser(u),
    jobs,
    props,
    talents,
    people: nm,
    stats: { members: users.length },
    reviews: q('SELECT id,jobId,toId,stars,text,ts FROM reviews ORDER BY ts DESC'),
    notes: q('SELECT * FROM notes WHERE uid=? ORDER BY ts DESC LIMIT 60', u.id).map(n => ({
      ...n,
      read: !!n.read,
    })),
    msgs: q('SELECT * FROM msgs WHERE fromId=? OR toId=? ORDER BY ts,id', u.id, u.id).map(m => ({
      peer: m.fromId === u.id ? m.toId : m.fromId,
      me: m.fromId === u.id,
      text: m.text,
      ts: m.ts,
    })),
    saved: q('SELECT jobId FROM saved WHERE uid=?', u.id).map(x => x.jobId),
    invites: q('SELECT DISTINCT tid FROM invites WHERE uid=?', u.id).map(x => x.tid),
  };
}

module.exports = { state };
