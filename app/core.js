// core.js: the learning logic, no DOM. Used by the app (build.py inlines it) and by app/tests.
// Scheduling is ported from the kids' app (~/Documents/quizzes/src/engine.js): boxes 1 to 9, own interval
// and ease per card, a forgotten sure card falls back two boxes, problem cards stay in box 2.
// Differences: every day is a practice day (Mike, 1 Oct 2026), the round is limited by time, not by card count,
// and the grade comes from two buttons (Again / Got it), because the app cannot hear you.

const INTERVAL = {1: 1, 2: 2, 3: 4, 4: 8, 5: 15, 6: 30, 7: 60, 8: 120, 9: 240};   // in days
const MAX_BOX = 9, SURE_BOX = 4, RECALL_BOX = 3, DRILL_DONE_BOX = 4;
const LEECH_MISS = 5, LEECH_OK = 3;
const MINUTES = [10, 15, 20, 30], MIN_DEFAULT = 15;   // Mike 2026-10-01: every day, 15 minutes, changeable on the home screen
const NEW_MAX = 6;                     // never more new sentences in one day, however much time is left
const NEW_SHARE = 0.4;                 // new sentences take at most 40 % of the time, so the reviews they cause later still fit
const budgetMs = S => ((S.cfg && S.cfg.min) || MIN_DEFAULT) * 60000;
const REQUEUE_GAP = 4;
const MAX_RETRIES = 2;                 // at most two more tries of one card in a round
const MS_CAP = 120000;                 // time counted per card at most                 // "Again" brings the card back four cards later
const EST0 = {new: 75000, echo: 25000, recall: 25000, drill: 20000};

// ----- days -----
function dayOf(ms) { const d = new Date(ms); return Math.floor((ms - d.getTimezoneOffset() * 60000) / 86400000); }
const dow = d => ((d + 3) % 7 + 7) % 7;                       // 0 = Monday ... 6 = Sunday
// Every day counts (Mike, 1 Oct 2026). The names stay from the time of five practice days a week.
const practiceDay = d => d;
const addPractice = (d, n) => d + n;
const practiceBetween = (a, b) => Math.max(0, b - a);
const monday = d => d - dow(d);
function isoDate(d) { return new Date(d * 86400000).toISOString().slice(0, 10); }

// ----- cards -----
function isLeech(c) { return !!c && (c.miss || 0) >= LEECH_MISS && (c.ok || 0) < LEECH_OK; }
function planCard(c, t, easy) {
  c.ease = c.ease || 2.5;
  const prev = c.iv || INTERVAL[Math.max(1, (c.box || 1) - 1)] || 1;
  const elapsed = c.last != null ? practiceBetween(c.last, t) : prev;
  let iv;
  if ((c.box || 0) <= 3) iv = INTERVAL[c.box] || 1;                       // learning phase: 1, 2, 4 days
  else iv = Math.max(Math.max(prev, (prev + elapsed) / 2) * c.ease * (easy ? 1.3 : 1), prev + 1);   // Easy: 30 % further, as "easy" in the kids' engine
  iv = Math.min(365, Math.max(1, Math.round(iv)));
  if (iv >= 4 && c.box > 3) { const f = Math.max(1, Math.round(iv * 0.05)); iv = Math.min(365, iv + Math.floor(Math.random() * (2 * f + 1)) - f); }   // spread a little, no clumps
  if (isLeech(c)) iv = Math.min(iv, 2);
  c.iv = iv; c.last = t; c.due = addPractice(t, iv);
}
function lapseCard(c, t) { c.ease = Math.max(1.3, (c.ease || 2.5) - 0.2); c.iv = Math.max(1, Math.round((c.iv || 1) * 0.3)); c.last = t; c.due = addPractice(t, 1); }
function newCard(t) { return {box: 0, ease: 2.5, miss: 0, ok: 0, n: 0, ag: 0, born: t, due: t}; }   // due: an interrupted first meeting comes back

// What the card asks for. Drills are only ever repeated after the voice; sentences from box 3 on are said from the meaning.
function modeOf(item, c) {
  if (!c || !c.box) return "new";
  if (item.kind === "d") return "drill";
  return c.box >= RECALL_BOX ? "recall" : "echo";
}

// ----- lessons -----
// Sound drills (kind "d") are never practised (Mike, 1 Oct 2026: no more sound drills). They stay in the data
// for the play buttons on the lesson pages and in the sentence list.
const practised = (D, L) => L.ids.filter(id => D.sent[id] && D.sent[id].kind !== "d");
// The current lesson is the first one that still has sentences you have not met.
function currentLesson(S, D) {
  for (const L of D.lessons) if (practised(D, L).some(id => !S.cards[id])) return L;
  return D.lessons[D.lessons.length - 1];
}
function nextNew(S, D) { return practised(D, currentLesson(S, D)).filter(id => !S.cards[id]); }

// ----- the daily round -----
function estOf(S, m) { return (S.avg && S.avg[m]) || EST0[m]; }
// A card costs its own time plus, with the share of first answers that were Again, one more listen-and-repeat.
function costOf(S, m) { return estOf(S, m) + (S.ar == null ? 0.12 : S.ar) * estOf(S, "echo"); }
function buildRound(S, D, T) {
  const items = [], BUDGET = budgetMs(S); let est = 0, backlog = 0;
  const due = Object.keys(S.cards).filter(id => D.sent[id] && D.sent[id].kind !== "d" && !S.cards[id].ret && S.cards[id].due <= T)
    .sort((a, b) => (S.cards[a].box > 2) - (S.cards[b].box > 2) || S.cards[a].due - S.cards[b].due || S.cards[a].box - S.cards[b].box || (a < b ? -1 : 1));   // cards still being learned first, then the oldest
  for (const id of due) {
    const m = modeOf(D.sent[id], S.cards[id]), e = costOf(S, m);
    if (est + e <= BUDGET) { items.push({id, m}); est += e; } else backlog++;
  }
  let fresh = 0;
  const L = currentLesson(S, D);
  if (!backlog && (S.introRead || {})[L.key]) {      // new sentences only when the reviews fit and the lesson intro has been read
    const room = Math.min(BUDGET - est, BUDGET * NEW_SHARE);   // as many as fit
    let used = 0;
    for (const id of nextNew(S, D)) {
      if (fresh >= NEW_MAX) break;
      const e = costOf(S, "new"); if (used + e > room) break;
      used += e;
      items.push({id, m: "new"}); est += e; fresh++;
    }
  }
  return {day: T, lesson: L.key, items, pos: 0, est, backlog, ms: 0, tandem: null};
}
function roundDone(R) { return !!R && R.pos >= R.items.length; }

// rating: "ok" or "again". ms: time on the card.
function answer(S, D, R, rating, T, ms) {
  const it = R.items[R.pos], id = it.id, item = D.sent[id];
  let c = S.cards[id]; if (!c) c = S.cards[id] = newCard(T);
  const log = dayLog(S, T);
  ms = Math.min(Math.max(0, ms || 0), MS_CAP);   // a phone left lying on a card must not count as an hour of practice
  // a card counts once a day: if the other device already rated it today (rounds built separately, then merged),
  // a second answer neither promotes it again nor lapses it again
  const retry = it.retry || c.rv === T;
  if (!retry) c.rv = T;
  if (!retry) {
    if (ms > 0) { S.avg = S.avg || {}; const old = estOf(S, it.m); S.avg[it.m] = Math.round(0.85 * old + 0.15 * Math.max(4000, ms)); }
    if (it.m === "new" && !c.n) log.fresh++;
    c.n = (c.n || 0) + 1; log.n++;
    S.ar = Math.round(1000 * (0.95 * (S.ar == null ? 0.12 : S.ar) + 0.05 * (rating === "again" ? 1 : 0))) / 1000;   // running share of Again
  }
  if (ms > 0) { R.ms += ms; log.ms += ms; }
  if (rating === "ok" || rating === "easy") {
    // Easy (Mike, 2 Oct 2026): a sentence so easy that reviewing it wastes time. A new one skips a step (back in 2 days),
    // one in the learning phase jumps two boxes, a sure one goes 30 % further and counts as easier from now on.
    // On a retry or a problem card Easy counts as Got it.
    const easy = rating === "easy" && !retry && !isLeech(c);
    if (!c.box) { c.box = easy ? 2 : 1; c.iv = INTERVAL[c.box]; c.last = T; c.due = addPractice(T, c.iv); }
    else if (!retry) {
      const wasLeech = isLeech(c);   // a problem card stays in box 2 until it sits three times in a row (as in the kids' engine)
      c.box = Math.min(c.box + (easy && c.box < 3 ? 2 : 1), wasLeech ? 2 : MAX_BOX); c.ok = (c.ok || 0) + 1;
      if (!wasLeech) c.miss = Math.max(0, (c.miss || 0) - 1);
      if (easy && c.box > 3) c.ease = Math.min(3, (c.ease || 2.5) + 0.15);
      else if (c.box > 4) c.ease = Math.min(2.5, (c.ease || 2.5) + 0.05);   // without Easy, ease could only fall; let it recover slowly
      planCard(c, T, easy && c.box > 3);
      if (item.kind === "d" && c.box >= DRILL_DONE_BOX) c.ret = 1;      // sound drills run out
    }
  } else {
    if (!retry) {
      c.ag = (c.ag || 0) + 1; log.ag.push(id);
      if (c.box) { c.box = (!isLeech(c) && c.box >= SURE_BOX) ? c.box - 2 : 1; c.ok = 0; c.miss = (c.miss || 0) + 1; lapseCard(c, T); }
    }
    const m = c.box ? (item.kind === "d" ? "drill" : "echo") : "new";       // the retry is always listen and repeat
    const tries = R.items.filter(x => x.id === id && x.retry).length;
    if (tries < MAX_RETRIES) R.items.splice(Math.min(R.pos + 1 + REQUEUE_GAP, R.items.length), 0, {id, m, retry: true});   // then it waits for tomorrow
  }
  R.pos++;
}
// Undo of the last rating (Mike, 2 Oct 2026): a snapshot of everything answer() can change, taken just before it.
function undoPoint(S, R, T) {
  const it = R.items[R.pos], days = S.days || {};
  return JSON.parse(JSON.stringify({id: it.id, card: S.cards[it.id] || null, round: R, T, day: days[T] || null, ar: S.ar == null ? null : S.ar, avg: S.avg || {}}));
}
function applyUndo(S, u) {
  if (u.card) S.cards[u.id] = u.card; else delete S.cards[u.id];
  S.round = u.round; S.days = S.days || {};
  if (u.day) S.days[u.T] = u.day; else delete S.days[u.T];
  if (u.ar == null) delete S.ar; else S.ar = u.ar;
  S.avg = u.avg;
}
// Free practice (not the daily round): Again makes a card due tomorrow at the latest, nothing else changes.
function practiceAgain(S, id, T) {
  const c = S.cards[id]; if (!c || !c.box) return false;
  if (c.due > T + 1) { c.due = T + 1; return true; }
  return false;
}
function dayLog(S, T) {
  S.days = S.days || {};
  const g = S.days[T] = S.days[T] || {n: 0, fresh: 0, ms: 0, ag: [], done: false};
  if (!g.ag) g.ag = [];
  return g;
}

// ----- the first start: lesson 1 was studied from 21 Sep 2026 on paper, so it counts as introduced -----
// Its cards come back as reviews, spread over five practice days in the order of the old booklet days.
function migrateLesson1(S, D, T) {
  const L = D.lessons[0]; if (!L || !L.startDay) return;
  for (const id of L.ids) {
    if (S.cards[id]) continue;
    const c = S.cards[id] = newCard(T); c.box = 1; c.iv = 1; c.last = T;
    c.due = addPractice(T, (L.startDay[id] || 1) - 1);
  }
  S.introRead = S.introRead || {}; S.introRead[L.key] = true;
}

function freshState() { return {v: 1, cards: {}, introRead: {}, days: {}, checkins: {}, avg: {}, round: null, ts: 0, resetAt: 0}; }
// Firebase drops empty objects and arrays, so a state that comes back from the cloud is filled up again here.
function fixState(o) {
  const S = Object.assign(freshState(), o || {});
  for (const k of ["cards", "introRead", "days", "checkins", "avg"]) if (!S[k] || typeof S[k] !== "object") S[k] = {};
  for (const d in S.days) { const g = S.days[d] || {}; S.days[d] = Object.assign({n: 0, fresh: 0, ms: 0, done: false}, g, {ag: g.ag || []}); }
  if (S.round && !Array.isArray(S.round.items)) S.round.items = [];
  return S;
}

// ----- sync between phone and Mac -----
// Every device remembers the cloud ts it last synced with ("synced"). Then: only the cloud changed -> adopt it;
// only this device changed -> upload; both changed -> merge card by card, then upload. A device that changed
// nothing never uploads, so a stale tab cannot overwrite newer progress (review of 1 Oct 2026).
function syncAction(L, o, synced) {
  const localChanged = (L.ts || 0) > synced;
  if (!o || typeof o !== "object" || !o.cards) return localChanged || Object.keys(L.cards || {}).length ? "upload" : "none";
  if ((o.resetAt || 0) > (L.resetAt || 0)) return "adopt";
  const cloudChanged = (o.ts || 0) !== synced;   // "different", not "newer": writes can land out of order, clocks differ
  if (cloudChanged && localChanged) return "merge";
  if (cloudChanged) return "adopt";
  if (localChanged) return "upload";
  return "none";
}
// The "Again" list of a day: per card the higher count of the two devices (never growing by merging twice).
function mergeCounts(x, y) {
  const cx = {}, cy = {}; for (const id of x) cx[id] = (cx[id] || 0) + 1; for (const id of y) cy[id] = (cy[id] || 0) + 1;
  const out = []; for (const id of new Set([...x, ...y])) for (let i = 0; i < Math.max(cx[id] || 0, cy[id] || 0); i++) out.push(id);
  return out;
}
// Card by card: the card that was answered more often wins, on a tie the one answered later.
function mergeStates(local, cloud) {
  const L = fixState(JSON.parse(JSON.stringify(local))), M = fixState(JSON.parse(JSON.stringify(cloud)));
  const more = (a, b) => (a.n || 0) > (b.n || 0) || ((a.n || 0) === (b.n || 0) && (a.last || 0) > (b.last || 0));
  for (const id in L.cards) { const a = L.cards[id], b = M.cards[id]; if (!b || more(a, b)) M.cards[id] = a; }
  for (const d in L.days) {   // field by field: a day done on either device stays done
    const a = L.days[d], b = M.days[d];
    M.days[d] = !b ? a : {n: Math.max(a.n || 0, b.n || 0), fresh: Math.max(a.fresh || 0, b.fresh || 0), ms: Math.max(a.ms || 0, b.ms || 0),
      ag: mergeCounts(a.ag || [], b.ag || []), done: !!(a.done || b.done), tandem: a.tandem || b.tandem || undefined, free: a.free || b.free || undefined};
  }
  for (const k in L.checkins) {   // field by field: a text written on one device is never dropped for an empty one
    const a = L.checkins[k], b = M.checkins[k]; if (!b) { M.checkins[k] = a; continue; }
    const newer = (a.ts || 0) > (b.ts || 0) ? a : b, older = newer === a ? b : a, out = Object.assign({}, older, newer);
    for (const f of ["hard", "used", "tandem"]) if (!out[f] && older[f]) out[f] = older[f];
    M.checkins[k] = out;
  }
  for (const k in L.introRead) if (L.introRead[k]) M.introRead[k] = true;
  if ((L.cfgTs || 0) > (M.cfgTs || 0)) { M.cfg = L.cfg; M.cfgTs = L.cfgTs; }
  M.avg = Object.assign({}, M.avg, L.avg);
  const ra = L.round, rb = M.round;
  if (ra && (!rb || ra.day > rb.day || (ra.day === rb.day && (ra.pos > rb.pos || (ra.pos === rb.pos && ra.tandem && !rb.tandem))))) M.round = ra;
  if (L.wk && (!M.wk || L.wk.w > M.wk.w)) M.wk = L.wk;
  M.resetAt = Math.max(L.resetAt || 0, M.resetAt || 0);
  M.ts = Math.max(L.ts || 0, M.ts || 0) + 1;
  return M;
}

// ----- old sync rules (kept for the tests): a state with fewer cards never replaces one with more -----
function nCards(o, D) { return Object.keys((o && o.cards) || {}).filter(id => D.sent[id]).length; }
// Returns true if the cloud state o should replace the local state L.
function cloudWins(L, o, D) {
  if (!o || typeof o !== "object" || !o.cards) return false;
  const rl = L.resetAt || 0, rc = o.resetAt || 0;
  if (rl > rc) return false;
  const lp = nCards(L, D), cp = nCards(o, D);
  return rc > rl || cp > lp || (cp === lp && (o.ts || 0) > (L.ts || 0));
}
// May the local state be uploaded over the cloud state o?
function mayUpload(L, o, D) {
  if (!o || !o.cards) return true;
  if ((o.resetAt || 0) > (L.resetAt || 0)) return false;
  return !(nCards(o, D) > nCards(L, D));
}

// ----- the four sounds the voice gets wrong (CLAUDE.md, tested 19 Sep 2026) -----
// Marked on every appearance, because a note read ten times is no longer read.
const PAL = /[iíìỉĩịêếềểễệ](nh|ch)$/;
function voiceMarks(syl) {
  const s = syl.normalize("NFC").toLowerCase().replace(/[^\p{L}]/gu, ""), out = [];
  if (!s) return out;
  if (s.startsWith("tr")) out.push("tr");
  else if (s.startsWith("r")) out.push("r");
  else if (s.startsWith("s")) out.push("s");
  if (PAL.test(s)) out.push("pal");
  return out;
}

// ----- search without diacritics -----
function fold(s) { return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase(); }

// ----- the week -----
function sureCount(S, D) { return Object.keys(S.cards).filter(id => D.sent[id] && D.sent[id].kind === "s" && S.cards[id].box >= SURE_BOX).length; }
function weekAgain(S, T) {   // which cards needed "Again" most this week (for the Friday check-in)
  const mo = monday(T), cnt = {};
  for (const d in S.days || {}) if (+d >= mo && +d <= T) for (const id of S.days[d].ag || []) cnt[id] = (cnt[id] || 0) + 1;
  return Object.entries(cnt).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
}

const CORE = {INTERVAL, MAX_BOX, SURE_BOX, RECALL_BOX, DRILL_DONE_BOX, MINUTES, MIN_DEFAULT, budgetMs, NEW_MAX, NEW_SHARE, EST0, dayOf, dow, practiceDay, addPractice,
  practiceBetween, monday, isoDate, isLeech, planCard, lapseCard, newCard, modeOf, currentLesson, nextNew, buildRound, roundDone,
  practised, answer, practiceAgain, undoPoint, applyUndo, dayLog, syncAction, mergeStates, MS_CAP, migrateLesson1, freshState, fixState, nCards, cloudWins, mayUpload, voiceMarks, fold, sureCount, weekAgain};
if (typeof module !== "undefined") module.exports = CORE;
