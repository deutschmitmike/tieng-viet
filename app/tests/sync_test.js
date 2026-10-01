// Two-device sync test (adapted from the review of 1 Oct 2026): the built page runs in two Node vm contexts against a
// fake Firebase with ETags (412 on a stale if-match), with manual network, timers and clocks. The invariant: after
// both devices have synced, no answer given on either device is lost. Run by app/build.py with the page script path.
const fs = require("fs"), vm = require("vm");
const code = fs.readFileSync(process.argv[2], "utf8");
const cloud = {data: null, tag: 1};
const dropEmpty = o => { if (o && typeof o === "object") { for (const k of Object.keys(o)) { o[k] = dropEmpty(o[k]); if (o[k] == null || (typeof o[k] === "object" && !Object.keys(o[k]).length)) delete o[k]; } } return o; };
let clock = Date.UTC(2026, 9, 5, 8, 0, 0);
function device(name, skew = 0, src = code) {
  const els = {}, listeners = {}, timers = [], net = [], store = {};
  const el = id => els[id] = els[id] || {id, innerHTML: "", value: "", style: {}, textContent: "", classList: {toggle() {}}, dataset: {}};
  const FakeDate = class extends Date { constructor(...a) { if (!a.length) super(clock + skew); else super(...a); } static now() { return clock + skew; } };
  const doc = {getElementById: el, querySelector: () => null, querySelectorAll: () => [], visibilityState: "visible", addEventListener: (t, f) => (listeners[t] = listeners[t] || []).push(f)};
  const sb = {console, Math, Date: FakeDate, JSON, Object, Array, String, Number, Set, Map, RegExp, Error, Promise, parseInt,
    Blob: class { constructor(p) { this.size = Buffer.byteLength(p.join("")); } },
    location: {search: "", hostname: "deutschmitmike.github.io", reload() {}},
    localStorage: {getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; }},
    document: doc, window: {scrollTo() {}},
    fetch: (url, opt = {}) => /firebasedatabase/.test(url) ? new Promise((res, rej) => net.push({method: opt.method || "GET", body: opt.body, headers: opt.headers || {}, res, rej})) : new Promise(() => {}),
    Audio: class { addEventListener() {} play() { return Promise.resolve(); } pause() {} },
    setTimeout: f => { timers.push(f); return timers.length; }, clearTimeout: i => { if (i) timers[i - 1] = null; },
  };
  sb.globalThis = sb; vm.createContext(sb);
  new vm.Script(src + `;globalThis.T = {synced: () => synced, etag: () => etag, startRound, rate: r => { if (cs) { cs.readyAt = 0; cs.revealed = true; } rate(r); }, cur: () => cur, S: () => S};`).runInContext(sb);
  const hdr = v => ({get: k => (k.toLowerCase() === "etag" ? v : null)});
  const d = {name, T: sb.T, net, els,
    serve() { const r = net.shift(); if (!r) return;
      if (r.method === "PUT") {
        if (r.headers["if-match"] !== "t" + cloud.tag) return r.res({ok: false, status: 412, headers: hdr("t" + cloud.tag)});
        cloud.data = dropEmpty(JSON.parse(r.body)); cloud.tag++; r.res({ok: true, status: 200, headers: hdr("t" + cloud.tag)});
      } else { const v = cloud.data ? JSON.parse(JSON.stringify(cloud.data)) : null; r.res({ok: true, status: 200, headers: hdr("t" + cloud.tag), json: () => Promise.resolve(v)}); } },
    fire() { timers.splice(0).forEach(f => f && f()); },
    hide() { doc.visibilityState = "hidden"; listeners.visibilitychange.forEach(f => f()); },
    wake() { doc.visibilityState = "visible"; listeners.visibilitychange.forEach(f => f()); },
    answer(n) { if (d.T.cur() !== "card") d.T.startRound(); for (let i = 0; i < n && d.T.cur() === "card"; i++) d.T.rate("ok"); },
    seen() { return new Set(Object.entries(d.T.S().cards).filter(([, c]) => c.n).map(([id]) => id)); },   // cards rated on this device or merged in
  };
  return d;
}
const settle = async () => { for (let k = 0; k < 30; k++) await new Promise(r => setImmediate(r)); };
// each round every device comes to the front once (as when Mike opens the app), so all of them get to read the cloud
async function sync(...devs) { for (let k = 0; k < 6; k++) { for (const d of devs) { d.wake(); d.fire(); await settle(); while (d.net.length) { d.serve(); await settle(); } } } }
const cloudSeen = () => new Set(cloud.data ? Object.entries(cloud.data.cards).filter(([, c]) => c.n).map(([id]) => id) : []);
// every card rated on any device before the sync must end up rated in the cloud and on both devices
function check(label, before, ...devs) {
  const want = new Set(before.flatMap(x => [...x]));
  for (const [where, got] of [["cloud", cloudSeen()], ...devs.map(d => [d.name, d.seen()])])
    for (const id of want) if (!got.has(id)) fail(label + ": " + id + " rated but missing in " + where);
}
const fail = m => { console.error("SYNC TEST FAILED: " + m); process.exit(1); };
const reset = () => { cloud.data = null; cloud.tag = 1; };

(async () => {
  // 1: the hide upload of a stale tab (review case s3)
  reset(); let A = device("phone"), B = device("mac"); await sync(A, B);
  A.answer(3); await sync(A);
  B.answer(4); B.hide(); await settle(); while (B.net.length) { B.serve(); await settle(); }
  let before = [A.seen(), B.seen()];
  B.wake(); A.wake(); await sync(A, B); await sync(A, B);
  check("case 1, hide upload of a stale tab", before, A, B);

  // 2: two uploads land out of order (review case s1)
  reset(); A = device("phone"); B = device("mac"); await sync(A, B);
  A.answer(3); B.answer(5); before = [A.seen(), B.seen()]; A.fire(); B.fire(); await settle();
  A.serve(); B.serve(); await settle();            // both GET the same cloud
  B.serve(); await settle(); A.serve(); await settle();   // the PUTs land in reverse order: the second must be refused
  await sync(A, B); await sync(A, B);
  check("case 2, out-of-order writes", before, A, B);

  // 3: clocks 20 s apart (review case s2)
  reset(); A = device("phone"); B = device("mac", 20000); await sync(A, B);
  B.answer(4); await sync(B); A.wake(); await sync(A);
  A.answer(3); const a3 = A.seen(); await sync(A, B); clock += 5000; B.answer(1); before = [a3, B.seen()]; await sync(A, B); await sync(A, B);
  check("case 3, clocks 20 s apart", before, A, B);

  // 4: rounds built separately on the same day: a card counts once a day
  reset(); A = device("phone"); B = device("mac"); await sync(A, B);
  A.answer(2); B.answer(2); await sync(A, B); await sync(A, B);
  const boxes = Object.values(A.T.S().cards).filter(c => c.n).map(c => c.box);
  if (boxes.some(b => b > 2)) fail("case 4: a card was promoted twice on one day");

  // 5: a device without local state waits for the cloud
  reset(); const N = device("new"); await settle(); N.net.shift().rej(0); await settle();
  if (Object.keys(N.T.S().cards).length) fail("case 5: a course was created before the cloud answered");
  // 6: an adopted state refreshes the open home screen
  reset(); A = device("phone"); B = device("mac"); await sync(A, B);
  A.answer(500); await sync(A, B);
  if (!/Round finished|Done for today/.test(B.els.home.innerHTML)) fail("case 6: home not refreshed after adopt");
  // 7: a state written by an older build is merged, never adopted wholesale
  reset(); A = device("phone"); await sync(A);
  const st = A.T.S(); st.cfg = {min: 20}; st.cfgTs = 5;
  cloud.data = JSON.parse(JSON.stringify(st)); delete cloud.data.cfg; delete cloud.data.cfgTs; cloud.data.build = "2000-01-01-1"; cloud.data.ts = st.ts + 5; cloud.tag++;
  await sync(A);
  if (!A.T.S().cfg || A.T.S().cfg.min !== 20) fail("case 7: an older build's state was adopted wholesale");
  console.log("  sync: seven two-device cases, no answer lost");
})().catch(e => fail(e && e.stack || e));
