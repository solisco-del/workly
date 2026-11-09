/* Workly – client. All data lives on the Workly server (accounts, jobs, chat); this page is just the UI. */
const CATS = ['Web Development', 'Design', 'Writing', 'Marketing', 'Data & AI', 'Mobile'];
const blank = () => ({
  role: 'freelancer',
  jobs: [],
  props: [],
  talents: [],
  reviews: [],
  notes: [],
  msgs: [],
  saved: [],
  invites: [],
  people: {},
  stats: {},
  users: [],
  session: null,
});
let S = blank(),
  bellSnap = new Set();
const save = () => {};
const api = async (p, b) => {
  const r = await fetch('/api/' + p, {
    method: b === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: b === undefined ? undefined : JSON.stringify(b),
    credentials: 'same-origin',
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok)
    throw Object.assign(new Error(j.error || 'Something went wrong.'), { status: r.status });
  return j;
};
async function sync() {
  const d = await api('state');
  S = Object.assign(blank(), d);
  S.users = d.me ? [d.me] : [];
  S.session = d.me ? d.me.id : null;
  S.role = d.me ? d.me.role : 'freelancer';
}
const $ = s => document.querySelector(s);
const esc = s =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const money = j => (j.type === 'hourly' ? `$${j.amt}/hr` : `$${Number(j.amt).toLocaleString()}`);
const ago = t => {
  const m = Math.max(0, (Date.now() - t) / 6e4),
    p = (n, u) => n + ' ' + u + (n === 1 ? '' : 's') + ' ago';
  return m < 1
    ? 'just now'
    : m < 60
      ? (m | 0) + ' min ago'
      : m < 1440
        ? p((m / 60) | 0, 'hour')
        : m < 43200
          ? p((m / 1440) | 0, 'day')
          : p((m / 43200) | 0, 'month');
};
const toast = m => {
  const t = $('#toast');
  t.textContent = m;
  t.classList.add('show');
  clearTimeout(toast.id);
  toast.id = setTimeout(() => t.classList.remove('show'), 2200);
};
const uid = p => p + Math.random().toString(36).slice(2, 8);
let view = 'jobs',
  F = { q: '', cat: '', type: [], level: [], saved: false };
