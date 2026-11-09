'use strict';
const http = require('http'),
  fs = require('fs'),
  path = require('path');
const PORT = +process.env.PORT || 3000;
const { routes } = require('./server/routes');
const { bad } = require('./server/validate');
const { clients } = require('./server/live');
const { cookies, authUser } = require('./server/auth');
/* server */
const SEC = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:",
};
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
  },
  PUB = path.join(__dirname, 'public');
function serveStatic(p, res) {
  const f = path.normalize(path.join(PUB, p === '/' ? 'index.html' : p)),
    ext = path.extname(f);
  if (!f.startsWith(PUB + path.sep) || !MIME[ext] || !fs.existsSync(f) || !fs.statSync(f).isFile())
    return false;
  res.writeHead(200, { 'Content-Type': MIME[ext], 'Cache-Control': 'no-cache', ...SEC });
  res.end(fs.readFileSync(f));
  return true;
}
const send = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...SEC });
  res.end(JSON.stringify(obj));
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x'),
        p = url.pathname;
      if (req.method === 'GET' && serveStatic(p, res)) return;
      if (p === '/healthz') return send(res, 200, { ok: 1 });
      if (p === '/api/events') {
        const u = authUser(req);
        if (!u) return send(res, 401, { error: 'Log in first.' });
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
          ...SEC,
        });
        res.write(': ok\n\n');
        if (!clients.has(u.id)) clients.set(u.id, new Set());
        clients.get(u.id).add(res);
        return req.on('close', () => {
          const s = clients.get(u.id);
          if (s) {
            s.delete(res);
            if (!s.size) clients.delete(u.id);
          }
        });
      }
      for (const r of routes) {
        const m = r.m === req.method && p.match(r.re);
        if (!m) continue;
        if (req.method === 'POST' && !/^application\/json/.test(req.headers['content-type'] || ''))
          bad('JSON required.', 415);
        const u = authUser(req);
        if (!u && !r.open) bad('Please log in.', 401);
        let b = {};
        if (req.method === 'POST') {
          let d = '',
            n = 0;
          for await (const c of req) {
            n += c.length;
            if (n > 1e5) bad('Request too large.', 413);
            d += c;
          }
          try {
            b = d ? JSON.parse(d) : {};
          } catch {
            bad('Bad JSON.');
          }
          if (typeof b !== 'object' || !b) b = {};
        }
        return send(res, 200, await r.fn({ u, b, p: m.slice(1), req, res }));
      }
      send(res, 404, { error: 'Not found.' });
    } catch (e) {
      if (e && e.status) return send(res, e.status, { error: e.error });
      console.error(e);
      send(res, 500, { error: 'Server error.' });
    }
  })
  .listen(PORT, () => console.log('Workly running on http://localhost:' + PORT));
