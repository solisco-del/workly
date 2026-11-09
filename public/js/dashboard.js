/* Workly – earnings / spending dashboard */
function vDash() {
  const fr = S.role === 'freelancer',
    me = S.session,
    $$ = n => '$' + n.toLocaleString();
  const jobs = fr
    ? S.jobs.filter(j =>
        S.props.some(p => p.jobId === j.id && p.uid === me && p.status === 'accepted'),
      )
    : S.jobs.filter(j => j.uid === me);
  const ms = jobs.flatMap(j => (j.ms || []).map(m => ({ ...m, job: j.title })));
  const sum = s => ms.filter(m => m.st === s).reduce((a, m) => a + m.amt, 0);
  const mp = S.props.filter(p => p.uid === me),
    won = mp.filter(p => p.status === 'accepted').length;
  const k = (i, l, v) =>
    `<div class="card kpi"><span class="ico">${ic(i, 22)}</span><div><div class="meta" style="margin:0">${l}</div><b>${v}</b></div></div>`;
  const tot = sum('released') + sum('funded') + sum('pending') || 1;
  const row = (l, v) =>
    `<div class="top"><span>${l}</span><b>${$$(v)}</b></div><div class="pb"><i style="width:${(v / tot) * 100}%"></i></div>`;
  const pc = CATS.map(c => [c, S.jobs.filter(j => j.cat === c).length]),
    mx = Math.max(1, ...pc.map(x => x[1]));
  const first = fr
    ? k('wallet', 'Total earned', $$(sum('released')))
    : k('wallet', 'Total paid', $$(sum('released')));
  const last = fr
    ? k('send', 'Proposals sent', mp.length + ' (' + won + ' won)')
    : k('briefcase', 'Jobs posted', jobs.length);
  return `<h2>${fr ? 'Earnings dashboard' : 'Spending dashboard'}</h2><div class="kpis">${first}${k('lock', 'In escrow', $$(sum('funded')))}${k('clock', 'Awaiting funding', $$(sum('pending')))}${last}</div>
<div class="card"><h3 style="margin:0 0 12px">Payments by status</h3>${row('Released', sum('released'))}${row('In escrow', sum('funded'))}${row('Awaiting funding', sum('pending'))}</div>
<div class="card"><h3 style="margin:0 0 12px">Milestones</h3>${ms.length ? ms.map(m => `<div class="top" style="margin-bottom:6px"><span>${esc(m.job)} · ${esc(m.t)}</span><span><b>${$$(m.amt)}</b> <span class="stat ${m.st === 'released' ? 'accepted' : ''}">${m.st}</span></span></div>`).join('') : '<p class="meta" style="margin:0">No milestones yet. They appear once a proposal is accepted and the client adds them.</p>'}</div>
<h3 style="margin:22px 0 10px">Marketplace overview</h3><div class="kpis">${k('briefcase', 'Open jobs', S.jobs.filter(j => j.status !== 'filled').length)}${k('check', 'Filled jobs', S.jobs.filter(j => j.status === 'filled').length)}${k('users', 'Members', S.stats.members || 0)}${k('send', 'Proposals', S.props.length)}</div>
<div class="card"><h3 style="margin:0 0 12px">Jobs by category</h3>${pc.map(([c, n]) => `<div class="top"><span>${c}</span><b>${n}</b></div><div class="pb"><i style="width:${(n / mx) * 100}%"></i></div>`).join('')}</div>`;
}
