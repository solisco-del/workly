'use strict';
const crypto = require('crypto');
const { one, run } = require('./db');
const hashPw = (p, s) => crypto.scryptSync(p, s, 64).toString('hex');
/* sessions */
const cookies = req =>
  Object.fromEntries(
    (req.headers.cookie || '')
      .split(/;\s*/)
      .filter(Boolean)
      .map(c => {
        const i = c.indexOf('=');
        return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
      }),
  );
const authUser = req => {
  const t = cookies(req).sid;
  if (!t) return null;
  const s = one('SELECT uid FROM sessions WHERE token=?', t);
  return s ? one('SELECT * FROM users WHERE id=?', s.uid) : null;
};
const startSession = (req, res, uid) => {
  const t = crypto.randomBytes(32).toString('hex');
  run('INSERT INTO sessions VALUES(?,?,?)', t, uid, Date.now());
  const sec = req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader(
    'Set-Cookie',
    `sid=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${sec ? '; Secure' : ''}`,
  );
};
const fails = new Map();

module.exports = { hashPw, cookies, authUser, startSession, fails };
