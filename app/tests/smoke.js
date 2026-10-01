// Smoke test: runs the built page script with a stub DOM and walks through every screen.
// A throw here would mean a blank page or a dead button for Mike. Run by app/build.py.
const fs = require("fs"), vm = require("vm"), path = require("path");
const code = fs.readFileSync(process.argv[2], "utf8");
const els = {}, listeners = {}, store = {};
const el = id => els[id] = els[id] || {id, innerHTML: "", value: "", style: {}, textContent: "", classList: {toggle() {}, add() {}, remove() {}}, dataset: {}};
const sb = {
  console, Math, Date, JSON, Object, Array, String, Number, Set, Map, RegExp, Error, Promise, parseInt,
  location: {search: "", hostname: "localhost", reload() {}},
  localStorage: {getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; }},
  document: {getElementById: el, querySelector: () => null, querySelectorAll: () => [], visibilityState: "visible",
    addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); }},
  window: {scrollTo() {}},
  fetch: () => Promise.reject(new Error("offline")),
  Audio: class { constructor() { this.paused = true; } addEventListener() {} play() { return Promise.resolve(); } pause() {} },
  setTimeout: () => 0, clearTimeout() {},
};
sb.globalThis = sb; vm.createContext(sb);
new vm.Script(code + `
;globalThis.T = {show, startRound, rate: r => { if (cs) { cs.readyAt = 0; cs.revealed = true; } rate(r); }, cur: () => cur, S: () => S};`).runInContext(sb);
const T = sb.T, fail = m => { console.error("SMOKE FAILED: " + m); process.exit(1); };
if (!/Tiếng Việt/.test(els.home.innerHTML)) fail("home did not render");
T.startRound();
let n = 0;
while (T.cur() === "card" && n < 500) { T.rate(n % 5 === 2 ? "again" : "ok"); n++; }
if (T.cur() !== "tandem" && T.cur() !== "home") fail("round did not end, screen " + T.cur());
const S1 = T.S(); S1.round.day -= 1; const old = S1.round.day; T.show("home");
if (!(S1.days[old] && S1.days[old].done) || S1.round.tandem !== "open") fail("an unticked round of yesterday must count for yesterday");
S1.round.day += 1; S1.round.tandem = "done"; T.show("home");
if (!/Done for today/.test(els.home.innerHTML)) fail("home after a finished day");
for (const s of ["tandem", "checkin", "listen", "library", "lessons", "home"]) T.show(s);
T.show("page", {key: "l01", i: 0}); T.show("page", {key: "l01", i: 7});
for (const f of listeners.click || []) f({target: {closest: () => null}, stopPropagation() {}, stopImmediatePropagation() {}});
console.log("  smoke: every screen renders, a round of " + n + " answers runs through");
