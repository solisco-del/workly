/* Workly – render loop, event handlers and startup */
function render() {
  const me = user();
  document.querySelector('header .seg').style.display = me ? '' : 'none';
  acct();
  if (!me) {
    $('#nav').innerHTML = '';
    $('#main').innerHTML = vAuth();
    return;
  }
  const fr = S.role === 'freelancer';
  const items = fr
    ? [
        ['jobs', 'Find work'],
        ['talent', 'Find talent'],
        ['mine', 'My proposals'],
        ['msgs', 'Messages'],
        ['dash', 'Dashboard'],
      ]
    : [
        ['mine', 'My jobs'],
        ['talent', 'Find talent'],
        ['post', 'Post a job'],
        ['jobs', 'Browse jobs'],
        ['msgs', 'Messages'],
        ['dash', 'Dashboard'],
      ];
  $('#nav').innerHTML = items
    .map(
      ([k, l]) =>
        `<button data-nav="${k}" class="${view === k ? 'on' : ''}">${ic(NI[k], 16)} ${l}</button>`,
    )
    .join('');
  document.querySelectorAll('.seg button').forEach(b => {
    const o = b.dataset.role === S.role;
    b.classList.toggle('on', o);
    b.setAttribute('aria-pressed', String(o));
  });
  $('#main').innerHTML = (
    {
      jobs: vJobs,
      talent: vTalent,
      mine: vMine,
      post: vPost,
      msgs: vMsgs,
      profile: vProfile,
      dash: vDash,
    }[view] || vJobs
  )();
  if (view === 'jobs') list();
  const mb = $('#msgs');
  if (mb) mb.scrollTop = mb.scrollHeight;
  acct();
}
function go(v) {
  view = v;
  render();
  scrollTo(0, 0);
}
/* events */
const act = async (p, b, ok) => {
  try {
    await api(p, b);
    await sync();
    render();
    if (ok) toast(ok);
    return true;
  } catch (e) {
    toast(e.message);
    if (e.status === 401) {
      await sync().catch(() => {});
      render();
    }
    return false;
  }
};
let es;
function live() {
  if (es) {
    es.close();
    es = null;
  }
  if (!S.session) return;
  es = new EventSource('/api/events');
  es.onmessage = async () => {
    try {
      await sync();
      soft();
    } catch (e) {}
  };
}
function soft() {
  const a = document.activeElement,
    typing = a && /INPUT|TEXTAREA|SELECT/.test(a.tagName),
    modal = $('#modal').firstChild;
  if (!S.session) {
    render();
    return;
  }
  if (view === 'msgs' && !modal) {
    const i = $('#ct'),
      v = i ? i.value : '',
      fo = a === i;
    render();
    const n = $('#ct');
    if (n) {
      n.value = v;
      if (fo) n.focus();
    }
    return;
  }
  if (typing || modal) {
    acct();
    if (view === 'jobs' && $('#list')) list();
    return;
  }
  render();
}
document.addEventListener('click', e => {
  const t = e.target,
    g = a => t.closest('[' + a + ']');
  if (g('data-close') && (t.hasAttribute('data-close') || t.closest('.x'))) {
    $('#modal').innerHTML = '';
    return;
  }
  let el;
  if (bellOpen && !t.closest('.bellw')) {
    bellOpen = false;
    acct();
  }
  if ((el = g('data-save'))) {
    const id = el.dataset.save,
      i = S.saved.indexOf(id);
    i < 0 ? S.saved.push(id) : S.saved.splice(i, 1);
    view === 'jobs' ? list() : render();
    api('saved', { jobId: id }).catch(async () => {
      await sync();
      render();
    });
    return;
  }
  if (g('data-bell')) {
    bellOpen = !bellOpen;
    if (bellOpen) {
      bellSnap = new Set(S.notes.filter(n => !n.read).map(n => n.id));
      if (bellSnap.size) {
        S.notes.forEach(n => (n.read = true));
        api('notes/read', {}).catch(() => {});
      }
    }
    acct();
    return;
  }
  if ((el = g('data-nv'))) {
    bellOpen = false;
    const d = el.dataset;
    if (d.r && d.r !== S.role) {
      S.role = d.r;
      api('role', { role: d.r }).catch(() => {});
    }
    if (d.c) chat = d.c;
    go(d.nv);
    return;
  }
  if (g('data-logout')) {
    bellOpen = false;
    api('logout', {})
      .catch(() => {})
      .finally(() => {
        if (es) {
          es.close();
          es = null;
        }
        S = blank();
        authMode = 'login';
        chat = '';
        render();
      });
    return;
  }
  if ((el = g('data-auth'))) {
    authMode = el.dataset.auth;
    render();
    return;
  }
  if ((el = g('data-msg'))) {
    openChat(el.dataset.msg);
    return;
  }
  if ((el = g('data-thread'))) {
    chat = el.dataset.thread;
    render();
    return;
  }
  if ((el = g('data-ms'))) {
    act(
      'ms/' + el.dataset.m + '/' + el.dataset.ms,
      {},
      el.dataset.ms === 'fund' ? 'Escrow funded' : 'Payment released',
    );
    return;
  }
  if ((el = g('data-nav'))) {
    go(el.dataset.nav);
    return;
  }
  if ((el = g('data-invite'))) {
    if (S.role !== 'client') {
      toast('Switch to Client to invite talent');
      return;
    }
    const jb = S.jobs.find(j => j.uid === S.session && j.status !== 'filled');
    if (!jb) {
      toast('Post a job first, then invite talent');
      go('post');
      return;
    }
    act('invite', { tid: el.dataset.invite, jobId: jb.id }, 'Invited to “' + jb.title + '”');
    return;
  }
  if ((el = g('data-hire'))) {
    act('props/' + el.dataset.hire + '/hire', {}, 'Freelancer hired');
    return;
  }
  if ((el = g('data-decline'))) {
    act('props/' + el.dataset.decline + '/decline', {});
    return;
  }
  if ((el = g('data-del'))) {
    if (el.dataset.arm !== '1') {
      el.dataset.arm = '1';
      el.textContent = 'Click again to confirm';
      setTimeout(() => {
        if (el.isConnected) {
          el.dataset.arm = '';
          el.textContent = 'Delete';
        }
      }, 3000);
      return;
    }
    act('jobs/' + el.dataset.del + '/delete', {}, 'Job deleted');
    return;
  }
  if ((el = g('data-job'))) {
    openJob(el.dataset.job);
    return;
  }
  if ((el = g('data-role'))) {
    S.role = el.dataset.role;
    view = S.role === 'client' ? 'mine' : 'jobs';
    api('role', { role: S.role }).catch(() => {});
    render();
    return;
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'q') {
    F.q = e.target.value;
    list();
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'cat') {
    F.cat = t.value;
    list();
  }
  if (t.dataset.f) {
    const k = t.dataset.f;
    if (k === 'saved') F.saved = t.checked;
    else {
      const a = F[k],
        i = a.indexOf(t.value);
      t.checked ? a.push(t.value) : a.splice(i, 1);
    }
    list();
  }
});
document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target,
    v = id => $('#' + id).value;
  if (f.dataset.rev) {
    act(
      'jobs/' + f.dataset.rev + '/review',
      { stars: f.elements.s.value, text: f.elements.t.value },
      'Review submitted',
    );
    return;
  }
  if (f.id === 'auth') {
    doAuth();
    return;
  }
  if (f.id === 'chat') {
    const x = $('#ct').value.trim();
    if (x) sendMsg(f.dataset.to, x);
    return;
  }
  if (f.dataset.msf) {
    act(
      'jobs/' + f.dataset.msf + '/ms',
      { t: f.elements.t.value, amt: f.elements.a.value },
      'Milestone added',
    );
    return;
  }
  if (f.id === 'prof') {
    const er = V.name(v('pn'));
    if (er) {
      toast(er);
      return;
    }
    act(
      'profile',
      { name: v('pn'), title: v('pt'), rate: v('pr'), loc: v('pl'), skills: v('ps'), bio: v('pb') },
      'Profile saved',
    );
    return;
  }
  if (f.id === 'pf') {
    if (
      await act('props', { jobId: f.dataset.job, bid: v('bid'), letter: v('cl') }, 'Proposal sent')
    )
      $('#modal').innerHTML = '';
    return;
  }
  if (f.id === 'postf') {
    if (
      await act(
        'jobs',
        {
          title: v('t'),
          cat: v('c'),
          desc: v('d'),
          skills: v('s'),
          type: v('ty'),
          amt: v('a'),
          level: v('l'),
        },
        'Job posted',
      )
    ) {
      view = 'mine';
      render();
    }
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    $('#modal').innerHTML = '';
    if (bellOpen) {
      bellOpen = false;
      acct();
    }
  } else if (
    (e.key === 'Enter' || e.key === ' ') &&
    e.target.classList &&
    e.target.classList.contains('job') &&
    e.target.dataset.job
  ) {
    e.preventDefault();
    openJob(e.target.dataset.job);
  }
});
document.body.insertAdjacentHTML('beforeend', '<div id="modal"></div>');
new MutationObserver(() =>
  document.body.classList.toggle('lock', !!$('#modal').firstChild),
).observe($('#modal'), { childList: true });
$('#logo').onclick = () => go(S.role === 'client' ? 'mine' : 'jobs');
$('#logo').onkeydown = e => {
  if (e.key === 'Enter') e.target.click();
};
addEventListener('focus', () => {
  if (S.session)
    sync()
      .then(soft)
      .catch(() => {});
});
(async () => {
  try {
    await sync();
    view = S.role === 'client' ? 'mine' : 'jobs';
    render();
    live();
  } catch (e) {
    $('#main').innerHTML =
      '<div class="auth card"><h2>Can’t reach the Workly server</h2><p class="meta">Start it with <b>npm start</b> and open <b>http://localhost:3000</b> in your browser. Don’t open the HTML file directly.</p></div>';
  }
})();
