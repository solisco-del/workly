'use strict';
const { one, run, id } = require('./db');
/* live updates (Server-Sent Events) */
const clients = new Map();
function emit(...uids) {
  for (const [u, set] of clients)
    if (!uids.length || uids.includes(u)) for (const r of set) r.write('data: sync\n\n');
}
setInterval(() => {
  for (const set of clients.values()) for (const r of set) r.write(': ping\n\n');
}, 25000).unref();
const note = (uid, text, v, r, c) => {
  if (!uid) return;
  if (c && one('SELECT 1 FROM notes WHERE uid=? AND c=? AND read=0', uid, c)) return;
  run(
    'INSERT INTO notes(id,uid,text,v,r,c,read,ts) VALUES(?,?,?,?,?,?,0,?)',
    id('n'),
    uid,
    text,
    v,
    r || '',
    c || '',
    Date.now(),
  );
};

module.exports = { clients, emit, note };
