/* Workly – accounts: signup, login, profile */
const user = () => S.users.find(u => u.id === S.session);
async function hash(p) {
  const s = 'workly:' + p;
  try {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    let h = 5381;
    for (const c of s) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
    return 'f' + h.toString(16);
  }
}
let authMode = 'login',
  chat = '';
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
const PR = [
  ['At least 8 characters', v => v.length >= 8],
  ['An uppercase letter', v => /[A-Z]/.test(v)],
  ['A lowercase letter', v => /[a-z]/.test(v)],
  ['A number', v => /\d/.test(v)],
  ['A special character (!@#$…)', v => /[^A-Za-z0-9\s]/.test(v)],
  ['No spaces', v => !/\s/.test(v)],
];
const V = {
  name: v => {
    v = v.trim().replace(/\s+/g, ' ');
    return !v
      ? 'Enter your full name.'
      : v.length < 2
        ? 'Name must be at least 2 characters.'
        : v.length > 60
          ? 'Name must be 60 characters or fewer.'
          : !/^[\p{L}][\p{L} .'’-]*$/u.test(v)
            ? 'Use letters, spaces, hyphens and apostrophes only.'
            : '';
  },
  email: v => {
    v = v.trim();
    const l = v.split('@')[0];
    return !v
      ? 'Enter your email address.'
      : v.length > 254
        ? 'That email address is too long.'
        : !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(v) ||
            v.includes('..') ||
            l.length > 64 ||
            l.startsWith('.') ||
            l.endsWith('.')
          ? 'Enter a valid email, like name@example.com.'
          : '';
  },
  pass: (v, em) => {
    if (!v) return 'Enter a password.';
    if (PR.some(r => !r[1](v))) return 'Your password doesn’t meet all the requirements below.';
    if (COMMON.includes(v.toLowerCase()))
      return 'That password is too common. Choose something harder to guess.';
    const l = (em || '').split('@')[0].toLowerCase();
    if (l.length >= 4 && v.toLowerCase().includes(l))
      return 'Your password can’t contain your email name.';
    return '';
  },
};
function fe(id, msg) {
  const i = $('#' + id),
    e = $('#' + id + 'e');
  if (!i) return;
  i.setAttribute('aria-invalid', msg ? 'true' : 'false');
  i.classList.toggle('bad', !!msg);
  if (e) e.textContent = msg || '';
}
const pwField = (id, label, ac) =>
  `<div class="f"><label for="${id}">${label}</label><div class="pw"><input id="${id}" type="password" maxlength="64" autocomplete="${ac}" aria-describedby="${id}e"><button type="button" class="eye" data-eye="${id}" aria-label="Show password" aria-pressed="false">${ic('eye', 18)}</button></div><p class="fe" id="${id}e" role="alert"></p></div>`;
function vAuth() {
  const su = authMode === 'signup';
  return `<div class="auth card"><h2>${su ? 'Create your account' : 'Welcome back'}</h2><p class="meta">${su ? 'Join Workly to hire talent or find work.' : 'Log in to continue.'}</p>
<form id="auth" novalidate>
${su ? `<div class="f"><label for="an">Full name</label><input id="an" maxlength="60" autocomplete="name" aria-describedby="ane"><p class="fe" id="ane" role="alert"></p></div>` : ''}
<div class="f"><label for="ae">Email</label><input id="ae" type="email" maxlength="254" autocomplete="email" inputmode="email" aria-describedby="aee"><p class="fe" id="aee" role="alert"></p></div>
${pwField('ap', 'Password', su ? 'new-password' : 'current-password')}
${su ? `<div class="meter"><i id="mt"></i></div><p class="meta" id="ml" style="margin:0 0 6px"></p><ul class="rules" id="rules">${PR.map(r => `<li>${ic('x', 13)} ${r[0]}</li>`).join('')}</ul>${pwField('ap2', 'Confirm password', 'new-password')}<div class="f"><label for="ar">I want to</label><select id="ar"><option value="freelancer">Find work</option><option value="client">Hire talent</option></select></div><label class="chk"><input id="at" type="checkbox" aria-describedby="ate"> I agree to the Terms of Service and Privacy Policy</label><p class="fe" id="ate" role="alert"></p>` : ''}
<p id="aerr" class="fe" role="alert" style="margin:10px 0"></p><button class="btn" style="width:100%">${su ? 'Sign up' : 'Log in'}</button></form>
<p class="meta" style="text-align:center;margin-top:14px">${su ? 'Already have an account?' : 'New to Workly?'} <button class="lnk" data-auth="${su ? 'login' : 'signup'}">${su ? 'Log in' : 'Sign up'}</button></p></div>`;
}
function updPw() {
  const v = $('#ap').value,
    li = document.querySelectorAll('#rules li');
  if (!li.length) return;
  PR.forEach((r, i) => {
    const ok = v.length > 0 && r[1](v);
    li[i].classList.toggle('ok', ok);
    li[i].innerHTML = ic(ok ? 'check' : 'x', 13) + ' ' + r[0];
  });
  const s = v ? PR.filter(r => r[1](v)).length + (v.length >= 12 ? 1 : 0) : 0,
    c =
      s <= 2
        ? ['Weak', '#ef4444']
        : s <= 4
          ? ['Fair', '#f59e0b']
          : s <= 6
            ? ['Good', '#65a30d']
            : ['Strong', '#16a34a'];
  $('#mt').style.width = (s / 7) * 100 + '%';
  $('#mt').style.background = c[1];
  $('#ml').textContent = v ? 'Strength: ' + c[0] : '';
}
function checkField(el) {
  const id = el.id,
    su = authMode === 'signup';
  let m = '';
  if (id === 'an') m = V.name(el.value);
  else if (id === 'ae') m = V.email(el.value);
  else if (id === 'ap') {
    m = su ? V.pass(el.value, $('#ae').value) : el.value ? '' : 'Enter your password.';
    if (su && $('#ap2') && $('#ap2').value) checkField($('#ap2'));
  } else if (id === 'ap2')
    m = !el.value
      ? 'Confirm your password.'
      : el.value !== $('#ap').value
        ? 'Passwords do not match.'
        : '';
  else if (id === 'at') m = el.checked ? '' : 'You must accept the terms to continue.';
  else return '';
  fe(id, m);
  return m;
}
function validateAll() {
  let first = null;
  (authMode === 'signup' ? ['an', 'ae', 'ap', 'ap2', 'at'] : ['ae', 'ap']).forEach(id => {
    const el = $('#' + id);
    if (el && checkField(el) && !first) first = el;
  });
  return first;
}
async function doAuth() {
  if (doAuth.b) return;
  const su = authMode === 'signup',
    err = m => {
      const a = $('#aerr');
      if (a) a.textContent = m;
    };
  err('');
  const bad = validateAll();
  if (bad) {
    bad.focus();
    return;
  }
  doAuth.b = 1;
  try {
    await api(su ? 'signup' : 'login', {
      name: su ? $('#an').value.trim().replace(/\s+/g, ' ') : undefined,
      email: $('#ae').value.trim(),
      password: $('#ap').value,
      role: su ? $('#ar').value : undefined,
    });
    await sync();
    authMode = 'login';
    view = S.role === 'client' ? 'mine' : 'jobs';
    chat = '';
    render();
    live();
    toast('Welcome, ' + user().name.split(' ')[0]);
  } catch (e) {
    err(e.message);
  } finally {
    doAuth.b = 0;
  }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-eye]');
  if (!b) return;
  const i = document.getElementById(b.dataset.eye),
    show = i.type === 'password';
  i.type = show ? 'text' : 'password';
  b.innerHTML = ic(show ? 'eyeoff' : 'eye', 18);
  b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  b.setAttribute('aria-pressed', String(show));
});
document.addEventListener('input', e => {
  const el = e.target;
  if (!el.closest || !el.closest('#auth')) return;
  const a = $('#aerr');
  if (a) a.textContent = '';
  if (el.id === 'ap') updPw();
  if (el.classList.contains('bad')) checkField(el);
  if (el.id === 'ap' && $('#ap2') && $('#ap2').value) checkField($('#ap2'));
});
document.addEventListener('focusout', e => {
  const el = e.target;
  if (el.closest && el.closest('#auth') && el.type !== 'checkbox' && el.value) checkField(el);
});

function vProfile() {
  const u = user();
  return `<h2>Your profile</h2><form id="prof" class="card"><div class="f"><label for="pn">Full name</label><input id="pn" required value="${esc(u.name)}"></div>
<div class="f"><label for="pt">Professional title</label><input id="pt" placeholder="e.g. Web designer" value="${esc(u.title)}"></div>
<div class="two"><div class="f"><label for="pr">Hourly rate ($)</label><input id="pr" type="number" min="0" value="${esc(u.rate)}"></div><div class="f"><label for="pl">Location</label><input id="pl" value="${esc(u.loc)}"></div></div>
<div class="f"><label for="ps">Skills (comma-separated)</label><input id="ps" value="${esc(u.skills.join(', '))}"></div>
<div class="f"><label for="pb">About you</label><textarea id="pb" rows="4">${esc(u.bio)}</textarea></div>
<p class="meta">Email: ${esc(u.email)}. Add a title to appear in Find talent.</p><button class="btn">Save profile</button></form>${revList(u.id)}`;
}
