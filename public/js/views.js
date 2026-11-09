/* Workly – page views: jobs, talent, my jobs/proposals, post job */
function vJobs() {
  return `<div class="hero"><h1>${S.role === 'client' ? 'Browse open jobs' : 'Find work you love'}</h1><p>Browse projects from clients hiring right now.</p>
<div class="row"><input id="q" type="search" placeholder="Search jobs by title, skill or keyword" value="${esc(F.q)}" aria-label="Search jobs"><select id="cat" aria-label="Category"><option value="">All categories</option>${CATS.map(c => `<option ${F.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div>
<div class="layout"><aside class="side"><h4>Payment type</h4>${['hourly', 'fixed'].map(t => `<label><input type="checkbox" data-f="type" value="${t}" ${F.type.includes(t) ? 'checked' : ''}>${t === 'hourly' ? 'Hourly' : 'Fixed-price'}</label>`).join('')}
<h4>Experience level</h4>${['Entry', 'Intermediate', 'Expert'].map(t => `<label><input type="checkbox" data-f="level" value="${t}" ${F.level.includes(t) ? 'checked' : ''}>${t}</label>`).join('')}
<h4>Saved</h4><label><input type="checkbox" data-f="saved" ${F.saved ? 'checked' : ''}>Saved jobs only</label></aside><section><p class="cnt" id="cnt"></p><div id="list"></div></section></div>`;
}
function list() {
  const q = F.q.toLowerCase();
  const r = S.jobs
    .filter(
      j =>
        (!F.cat || j.cat === F.cat) &&
        (!F.type.length || F.type.includes(j.type)) &&
        (!F.level.length || F.level.includes(j.level)) &&
        (!F.saved || S.saved.includes(j.id)) &&
        (!q || (j.title + j.desc + j.skills.join(' ')).toLowerCase().includes(q)),
    )
    .sort((a, b) => (a.status === 'filled') - (b.status === 'filled') || b.ts - a.ts);
  $('#cnt').textContent = r.length + ' job' + (r.length === 1 ? '' : 's') + ' found';
  $('#list').innerHTML = r.length
    ? r.map(jobCard).join('')
    : S.jobs.length
      ? '<div class="empty">No jobs match these filters. Clear a filter or try a different keyword.</div>'
      : '<div class="empty">No jobs have been posted yet. Switch to Client and post the first one.</div>';
}
function jobCard(j) {
  const n = j.np || 0,
    sv = S.saved.includes(j.id);
  return `<div class="card job" data-job="${j.id}" role="button" tabindex="0"><div class="top"><div><div class="meta">Posted ${ago(j.ts)}${j.status === 'filled' ? ' · <b>Filled</b>' : ''}</div><h3>${esc(j.title)}</h3></div>
  <button class="heart" data-save="${j.id}" aria-pressed="${sv}" aria-label="${sv ? 'Unsave' : 'Save'} job">${ic('heart', 17, sv)}</button></div>
  <div class="meta"><span><b>${j.type === 'hourly' ? 'Hourly' : 'Fixed-price'}</b></span><span>${j.level}</span><span>${j.type === 'hourly' ? 'Rate' : 'Budget'}: <b>${money(j)}</b></span></div>
  <p class="desc">${esc(j.desc)}</p><div class="chips">${j.skills.map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>
  <div class="meta" style="margin:10px 0 0"><span>Proposals: ${n}</span><span>${esc(j.owner)}</span></div></div>`;
}

function openJob(id) {
  const j = S.jobs.find(x => x.id === id),
    fr = S.role === 'freelancer',
    mine = S.props.find(p => p.jobId === id && p.uid === S.session);
  if (!j) return;
  let body = '';
  if (fr) {
    body = mine
      ? `<div class="card" style="margin:16px 0 0"><b>You applied ${ago(mine.ts)}.</b> Status: <span class="stat ${mine.status}">${mine.status}</span><p>${esc(mine.letter)}</p></div>`
      : j.uid === S.session
        ? '<p class="meta" style="margin-top:16px">This is your own job posting.</p>'
        : j.status === 'filled'
          ? '<p class="empty">This job has been filled.</p>'
          : `<form id="pf" data-job="${id}" style="margin-top:18px"><h3>Submit a proposal</h3><div class="f"><label for="bid">${j.type === 'hourly' ? 'Your hourly rate ($)' : 'Your bid ($)'}</label><input id="bid" type="number" min="1" required value="${j.amt}"></div>
    <div class="f"><label for="cl">Cover letter</label><textarea id="cl" rows="5" required placeholder="Introduce yourself and explain why you’re a great fit."></textarea></div><button class="btn">Send proposal</button></form>`;
  } else if (!fr)
    body =
      '<p class="meta" style="margin-top:16px">Switch to Freelancer to apply to this job, or open My jobs to review proposals.</p>';
  $('#modal').innerHTML =
    `<div class="ov" data-close><div class="modal" role="dialog" aria-modal="true"><button class="x" data-close aria-label="Close">${ic('x', 22)}</button>
  <div class="meta">Posted ${ago(j.ts)} · ${j.cat}</div><h2>${esc(j.title)}</h2>
  <div class="meta"><span><b>${j.type === 'hourly' ? 'Hourly' : 'Fixed-price'}</b></span><span>${j.level}</span><span>${j.type === 'hourly' ? 'Rate' : 'Budget'}: <b>${money(j)}</b></span><span>Client: ${esc(j.owner)}</span></div>
  <p style="white-space:pre-wrap">${esc(j.desc)}</p><div class="chips">${j.skills.map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div><p style="margin:12px 0 0"><button class="btn o sm" data-msg="${esc(j.uid)}">Message client</button></p>${body}</div></div>`;
}

function vTalent() {
  return (
    `<div class="hero"><h1>Find talent</h1><p>Invite skilled freelancers to your projects.</p></div><div class="grid">` +
    (allTalents().length
      ? ''
      : '<div class="empty" style="grid-column:1/-1">No freelancers have a public profile yet. Add a professional title in your profile to appear here.</div>') +
    allTalents()
      .map(t => {
        const inv = S.invites.includes(t.id);
        return `<div class="card"><div class="tal"><div class="av">${esc(
          t.name
            .split(' ')
            .filter(Boolean)
            .map(w => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
        )}</div><div><h3>${esc(t.name)}</h3><p class="t">${esc(t.title)}</p></div></div>
  <div class="meta" style="margin-top:10px"><span><b>${t.rate ? '$' + esc(t.rate) + '/hr' : 'Rate not set'}</b></span><span>${esc(t.loc)}</span><span>${t.jss ? t.jss + '% job success' : 'New on Workly'}</span>${starsOf(t)}</div><p>${esc(t.bio)}</p>
  <div class="chips" style="margin-bottom:12px">${t.skills.map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>
  <button class="btn sm ${inv ? 'd' : ''}" data-invite="${t.id}" ${inv ? 'disabled' : ''}>${inv ? 'Invited' : 'Invite to job'}</button> <button class="btn o sm" data-msg="${esc(t.id)}">Message</button></div>`;
      })
      .join('') +
    '</div>'
  );
}

function vMine() {
  if (S.role === 'freelancer') {
    const ps = S.props.filter(p => p.uid === S.session).sort((a, b) => b.ts - a.ts);
    return (
      `<h2>My proposals</h2>` +
      (ps.length
        ? ps
            .map(p => {
              const j = S.jobs.find(x => x.id === p.jobId);
              return j
                ? `<div class="card job" data-job="${j.id}" role="button" tabindex="0"><div class="top"><h3>${esc(j.title)}</h3><span class="stat ${p.status}">${p.status}</span></div><div class="meta">Submitted ${ago(p.ts)} · Your ${j.type === 'hourly' ? 'rate' : 'bid'}: <b>$${p.bid}${j.type === 'hourly' ? '/hr' : ''}</b></div><p class="desc">${esc(p.letter)}</p>${p.status === 'accepted' ? msList(j, false) + revBlock(j, false) : ''}</div>`
                : '';
            })
            .join('')
        : '<div class="empty">You haven’t submitted any proposals yet.<br><br><button class="btn" data-nav="jobs">Find work</button></div>')
    );
  }
  const js = S.jobs.filter(j => j.uid === S.session).sort((a, b) => b.ts - a.ts);
  return (
    `<h2>My jobs</h2>` +
    (js.length
      ? js
          .map(j => {
            const ps = S.props.filter(p => p.jobId === j.id);
            return `<div class="card"><div class="top"><div><h3 style="margin:0">${esc(j.title)}</h3><div class="meta">Posted ${ago(j.ts)} · ${money(j)} · ${j.status === 'filled' ? 'Filled' : 'Open'}</div></div><button class="btn d sm" data-del="${j.id}">Delete</button></div>
  <h4 style="margin:12px 0 0">Proposals (${ps.length})</h4>${ps.length ? ps.map(p => `<div class="prop"><div class="top"><b>${esc(p.name)}</b><span class="stat ${p.status}">${p.status}</span></div><div class="meta">Bid: $${p.bid}${j.type === 'hourly' ? '/hr' : ''}</div><p style="margin:4px 0 8px">${esc(p.letter)}</p>${p.status === 'pending' ? `<button class="btn sm" data-hire="${p.id}">Hire</button> <button class="btn o sm" data-msg="${esc(p.uid)}">Message</button> <button class="btn d sm" data-decline="${p.id}">Decline</button>` : ''}</div>`).join('') : '<p class="meta">No proposals yet.</p>'}${j.status === 'filled' ? msList(j, true) + revBlock(j, true) : ''}</div>`;
          })
          .join('')
      : '<div class="empty">You haven’t posted a job yet.<br><br><button class="btn" data-nav="post">Post a job</button></div>')
  );
}

function vPost() {
  return `<h2>Post a job</h2><form id="postf" class="card"><div class="f"><label for="t">Job title</label><input id="t" required maxlength="100" placeholder="e.g. Build a landing page for my bakery"></div>
<div class="two"><div class="f"><label for="c">Category</label><select id="c">${CATS.map(c => `<option>${c}</option>`).join('')}</select></div><div class="f"><label for="l">Experience level</label><select id="l"><option>Entry</option><option selected>Intermediate</option><option>Expert</option></select></div></div>
<div class="f"><label for="d">Description</label><textarea id="d" rows="6" required placeholder="Describe the work, deliverables and timeline."></textarea></div>
<div class="f"><label for="s">Skills (comma-separated)</label><input id="s" placeholder="React, CSS, Figma"></div>
<div class="two"><div class="f"><label for="ty">Payment type</label><select id="ty"><option value="fixed">Fixed-price</option><option value="hourly">Hourly</option></select></div><div class="f"><label for="a">Budget or rate ($)</label><input id="a" type="number" min="1" required></div></div>
<button class="btn">Post job</button></form>`;
}
