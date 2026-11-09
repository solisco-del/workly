/* Workly – messages, notifications, milestones, reviews */
const allTalents = () => S.talents;
function vMsgs() {
  const nm = S.people || {},
    peers = [
      ...new Set(
        S.msgs
          .slice()
          .sort((a, b) => b.ts - a.ts)
          .map(m => m.peer),
      ),
    ];
  if (chat && nm[chat] && !peers.includes(chat)) peers.unshift(chat);
  const cur = chat && nm[chat] ? chat : peers[0],
    ms = S.msgs.filter(m => m.peer === cur);
  if (cur && S.notes.some(n => n.c === cur && !n.read)) {
    S.notes.forEach(n => {
      if (n.c === cur) n.read = true;
    });
    api('notes/read', { c: cur }).catch(() => {});
  }
  return (
    `<h2>Messages</h2>` +
    (peers.length
      ? `<div class="chat"><div class="threads">${peers.map(n => `<button data-thread="${esc(n)}" class="${n === cur ? 'on' : ''}">${esc(nm[n] || 'User')}</button>`).join('')}</div><div class="conv"><div class="msgs" id="msgs">${ms.length ? ms.map(m => `<div class="m ${m.me ? 'me' : ''}">${esc(m.text)}<small>${ago(m.ts)}</small></div>`).join('') : '<p class="meta">Say hello to start the conversation.</p>'}</div><form id="chat" data-to="${esc(cur)}" class="row" style="flex-wrap:nowrap"><input id="ct" required maxlength="2000" autocomplete="off" placeholder="Write a message" aria-label="Message"><button class="btn">Send</button></form></div></div>`
      : '<div class="empty">No conversations yet. Use Message on a job or a freelancer to start one.</div>')
  );
}
async function sendMsg(to, text) {
  try {
    await api('msgs', { to, text });
    chat = to;
    await sync();
    render();
    const c = $('#ct');
    if (c) c.focus();
  } catch (e) {
    toast(e.message);
  }
}
function openChat(n) {
  if (n === S.session) return toast('This is your own listing');
  chat = n;
  $('#modal').innerHTML = '';
  view = 'msgs';
  render();
  scrollTo(0, 0);
}
function msList(j, own) {
  const ms = j.ms || [],
    rel = ms.filter(m => m.st === 'released').reduce((a, m) => a + m.amt, 0);
  return `<div class="prop"><h4 style="margin:0 0 6px">Milestones · $${rel.toLocaleString()} paid</h4>${ms.map(m => `<div class="top" style="align-items:center;margin-bottom:6px"><span>${esc(m.t)} · <b>$${m.amt}</b> <span class="stat ${m.st === 'released' ? 'accepted' : ''}">${m.st}</span></span>${own ? (m.st === 'pending' ? `<button class="btn sm" data-ms="fund" data-j="${j.id}" data-m="${m.id}">Fund escrow</button>` : m.st === 'funded' ? `<button class="btn sm" data-ms="release" data-j="${j.id}" data-m="${m.id}">Release</button>` : '') : ''}</div>`).join('') || '<p class="meta">No milestones yet.</p>'}${own ? `<form class="row" data-msf="${j.id}"><input name="t" required placeholder="Milestone name"><input name="a" type="number" min="1" required placeholder="Amount ($)" style="flex:0 0 130px;min-width:110px"><button class="btn o sm">Add milestone</button></form>` : ''}</div>`;
}
let bellOpen = false;
function note(u, text, v) {
  if (!u) return;
  S.notes.unshift({ id: uid('n'), uid: u, text, v, ts: Date.now(), read: false });
  S.notes.length = Math.min(S.notes.length, 60);
}
function acct() {
  const me = user(),
    a = $('#acct');
  if (!me) {
    a.innerHTML = '';
    return;
  }
  const ns = S.notes.filter(n => n.uid === S.session),
    un = ns.filter(n => !n.read).length;
  a.innerHTML = `<div class="bellw"><button class="btn d sm" data-bell aria-label="Notifications, ${un} unread">${ic('bell', 17)}${un ? `<b class="bd">${un}</b>` : ''}</button>${
    bellOpen
      ? `<div class="pan">${
          ns.length
            ? ns
                .slice(0, 8)
                .map(
                  n =>
                    `<button class="ni ${(bellOpen ? bellSnap.has(n.id) : !n.read) ? 'un' : ''}" data-nv="${n.v}" data-r="${n.r || ''}" data-c="${esc(n.c || '')}">${esc(n.text)}<small>${ago(n.ts)}</small></button>`,
                )
                .join('')
            : '<p class="meta" style="padding:12px;margin:0">No notifications yet.</p>'
        }</div>`
      : ''
  }</div><button class="btn d sm" data-nav="profile">${ic('user', 15)} ${esc(me.name)}</button><button class="btn d sm" data-logout aria-label="Log out">${ic('logout', 15)}</button>`;
}
const starsOf = t => {
  const r = S.reviews.filter(x => x.toId === t.id);
  return r.length
    ? `<span><span style="color:#f59e0b">${ic('star', 13, true)}</span> ${(r.reduce((a, x) => a + x.stars, 0) / r.length).toFixed(1)} (${r.length})</span>`
    : '';
};
const bar = n =>
  `<span class="stars" role="img" aria-label="${n} out of 5 stars">${[1, 2, 3, 4, 5].map(i => ic('star', 15, i <= n)).join('')}</span>`;
const revList = n => {
  const r = S.reviews.filter(x => x.toId === n);
  return r.length
    ? `<h3 style="margin:20px 0 8px">Reviews</h3>` +
        r
          .map(
            x =>
              `<div class="card"><div>${bar(x.stars)}</div><p style="margin:4px 0 0">${esc(x.text)}</p><div class="meta">${ago(x.ts)}</div></div>`,
          )
          .join('')
    : '';
};
function revBlock(j, own) {
  const p = S.props.find(x => x.jobId === j.id && x.status === 'accepted'),
    r = S.reviews.find(x => x.jobId === j.id);
  if (!p || !(j.ms || []).some(m => m.st === 'released')) return '';
  if (r)
    return `<div class="prop"><h4 style="margin:0 0 4px">Review for ${esc(p.name)}</h4><div>${bar(r.stars)}</div><p style="margin:4px 0 0">${esc(r.text)}</p></div>`;
  return own
    ? `<form class="prop" data-rev="${j.id}"><h4 style="margin:0 0 6px">Review ${esc(p.name)}</h4><div class="row"><select name="s" aria-label="Rating"><option value="5">5 stars – Excellent</option><option value="4">4 stars – Good</option><option value="3">3 stars – Average</option><option value="2">2 stars – Poor</option><option value="1">1 star – Terrible</option></select><input name="t" required placeholder="Describe your experience"><button class="btn o sm">Submit review</button></div></form>`
    : '';
}
