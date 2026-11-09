'use strict';
const bad = (error, status = 400) => {
  throw { status, error };
};
const COMMON = [
  'password',
  'password1',
  '12345678',
  '123456789',
  'qwerty123',
  '11111111',
  'iloveyou',
  'admin123',
  'letmein1',
  'welcome1',
  'abc12345',
  'password123',
  'qwertyuiop',
];
const vName = v => {
  v = String(v || '')
    .trim()
    .replace(/\s+/g, ' ');
  if (v.length < 2 || v.length > 60 || !/^[\p{L}][\p{L} .'’-]*$/u.test(v))
    bad('Enter a valid full name (letters, spaces, hyphens, apostrophes).');
  return v;
};
const vEmail = v => {
  v = String(v || '')
    .trim()
    .toLowerCase();
  const l = v.split('@')[0];
  if (
    !v ||
    v.length > 254 ||
    !/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(v) ||
    v.includes('..') ||
    l.length > 64 ||
    l.startsWith('.') ||
    l.endsWith('.')
  )
    bad('Enter a valid email, like name@example.com.');
  return v;
};
const vPass = (p, em) => {
  p = String(p || '');
  if (
    p.length < 8 ||
    p.length > 64 ||
    !/[A-Z]/.test(p) ||
    !/[a-z]/.test(p) ||
    !/\d/.test(p) ||
    !/[^A-Za-z0-9\s]/.test(p) ||
    /\s/.test(p)
  )
    bad(
      'Password needs 8–64 characters with upper and lower case, a number, a special character and no spaces.',
    );
  if (COMMON.includes(p.toLowerCase())) bad('That password is too common.');
  const l = em.split('@')[0];
  if (l.length >= 4 && p.toLowerCase().includes(l))
    bad('Your password can’t contain your email name.');
};
const txt = (v, max, label, req = true) => {
  v = String(v ?? '').trim();
  if (req && !v) bad(label + ' is required.');
  if (v.length > max) bad(label + ' is too long.');
  return v;
};
const num = (v, label) => {
  v = +v;
  if (!Number.isFinite(v) || v <= 0 || v > 1e7) bad('Enter a valid ' + label + '.');
  return Math.round(v * 100) / 100;
};
const skillsOf = v =>
  JSON.stringify(
    [
      ...new Set(
        String(v || '')
          .split(',')
          .map(s => s.trim().slice(0, 40))
          .filter(Boolean),
      ),
    ].slice(0, 15),
  );

module.exports = { bad, vName, vEmail, vPass, txt, num, skillsOf };
