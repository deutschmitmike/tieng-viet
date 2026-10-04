// ui.js: screens, audio, storage and sync. Uses CORE (core.js) and D (the data from build.py).
// Rules from Mike (2026-09-30): sound only on a button press, never autoplay. English interface. Phone first.

const {practised, practiceAgain, undoPoint, applyUndo, dayOf, dow, practiceDay, monday, isoDate, buildRound, roundDone, answer, dayLog, currentLesson, nextNew,
  migrateLesson1, freshState, fixState, MINUTES, MIN_DEFAULT, syncAction, mergeStates, voiceMarks, fold, sureCount, weekAgain, SURE_BOX} = CORE;

// Test mode, nothing goes to the cloud: ?local, and always anywhere except the published site (a local preview must never touch Mike's state)
const LOCAL = /[?&]local\b/.test(location.search) || location.hostname !== "deutschmitmike.github.io";
const KEY = LOCAL ? "tv_local_v1" : "tv_mike_v1";
const SYNC_URL = LOCAL ? "" : "https://ddd-spiel-default-rtdb.europe-west1.firebasedatabase.app/save/__tieng_viet/mike.json";
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[<>&"]/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;"}[c]));
const today = () => practiceDay(dayOf(Date.now()));
const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

// ================= storage and sync =================
// S.ts changes only with a real change (save). Each device remembers the cloud ts it last synced with, so a tab
// that changed nothing never uploads, and two devices that both changed something are merged card by card.
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.cards) return fixState(s); } catch (e) {} return freshState(); }
let S = load();
const SYNCED_KEY = KEY + "_synced";
let synced = 0; try { synced = +localStorage.getItem(SYNCED_KEY) || 0; } catch (e) {}
let syncInfo = {ok: null, at: 0}, lastCloudAt = 0, saveTimer = 0, syncing = false, syncAgain = false, etag = null, staleRuns = 0;
function persist() { S.build = APP_BUILD; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function save() { S.ts = Math.max(Date.now(), synced + 1, (S.ts || 0) + 1); persist();   // always above anything synced, whatever the clocks say
  clearTimeout(saveTimer); saveTimer = setTimeout(cloudSync, 800); }
function setSynced(ts) { synced = ts || 0; try { localStorage.setItem(SYNCED_KEY, String(synced)); } catch (e) {} }
function setSync(ok) { syncInfo = {ok, at: Date.now()}; const el = $("sync"); if (el) el.textContent = syncText(); }
function syncText() {
  if (LOCAL) return "test mode, not synced";
  if (syncInfo.ok === null) return "connecting";
  if (!syncInfo.ok) return "not synced";
  return "synced " + new Date(syncInfo.at).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
}
// Writes are conditional (Firebase ETag): a PUT only lands if the cloud is still exactly what this device last read.
// If another device wrote in between, the PUT fails with 412, nothing is lost (it is all in localStorage), and the
// next sync reads again and merges.
function cloudGet() {
  return fetch(SYNC_URL + "?t=" + Date.now(), {headers: {"X-Firebase-ETag": "true"}})
    .then(r => { if (!r.ok) throw 0; const tag = r.headers.get("ETag"); return r.json().then(o => { etag = tag; lastCloudAt = Date.now(); return o; }); });   // the tag only counts once the body arrived
}
function cloudPut(leaving) {
  if (!etag) return Promise.reject("stale");   // never write blind
  const body = JSON.stringify(S), ts = S.ts, keep = !!leaving && new Blob([body]).size < 60000;   // keepalive bodies over 64 KB are refused
  const tag = etag; etag = null;
  return fetch(SYNC_URL, {method: "PUT", body, keepalive: keep, headers: {"if-match": tag, "X-Firebase-ETag": "true"}})
    .then(r => { if (r.status === 412) throw "stale"; if (!r.ok) throw 0; etag = r.headers.get("ETag") || null; setSynced(ts); setSync(true); });
}
function adopt(o) { S = fixState(o); persist(); setSynced(S.ts); UNDO = null; }
function afterReplace() {   // the state came from the cloud: keep the open screen consistent with it
  if (cur === "home") show("home");
  else if (cur === "card") { const R = S.round; if (R && R.day === today() && !roundDone(R)) { cs = null; renderCard(); } else show("home"); }
  else if (cur === "tandem") { if (!S.round || !roundDone(S.round) || S.round.tandem) show("home"); }
}
const buildKey = b => String(b || "0").split("-").map(x => x.padStart(4, "0")).join("-");   // 2026-10-01-10 after 2026-10-01-9
let leavingPut = null;   // the upload started when the page was hidden; a new sync waits for it, so answers cannot cross
function cloudSync() {
  if (!SYNC_URL) return;
  if (leavingPut) { syncAgain = true; return; }
  if (syncing) { syncAgain = true; return; }
  syncing = true;
  cloudGet().then(o => {
    let act = syncAction(S, o, synced);
    if (act === "adopt" && o && buildKey(o.build) < buildKey(APP_BUILD) && (o.resetAt || 0) <= (S.resetAt || 0)) act = "merge";   // a tab on an older build: merge, never take it wholesale
    if (act === "adopt") { adopt(o); setSync(true); afterReplace(); }
    else if (act === "merge") { UNDO = null; S = mergeStates(S, o); S.ts = Math.max(Date.now(), (o.ts || 0) + 1, (S.ts || 0) + 1); persist(); afterReplace(); return cloudPut(); }
    else if (act === "upload") return cloudPut();
    else setSync(true);
  }).then(() => { staleRuns = 0; }, e => {
    if (e === "stale" && ++staleRuns <= 3) syncAgain = true;   // someone wrote in between: read again and merge (never loop forever)
    else { staleRuns = 0; setSync(false); }
    etag = null;   // after any failure, write only after a fresh read
  }).then(() => { syncing = false; if (syncAgain) { syncAgain = false; cloudSync(); } });
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {   // leaving with changes not yet uploaded: upload now, iOS freezes the page otherwise
    persist();
    if (SYNC_URL && (S.ts || 0) > synced && etag && !syncing && !leavingPut) {   // conditional: lands only if nobody wrote since the last read
      clearTimeout(saveTimer);
      leavingPut = cloudPut(true).catch(() => {}).then(() => { leavingPut = null; if (syncAgain) { syncAgain = false; cloudSync(); } });
    }
  } else { if (cs) cs.shownAt = Date.now(); if (cur === "home") renderHome(); cloudSync(); checkVersion(); }   // the app may wake on a new day
});
function checkVersion() {
  if (LOCAL) return;
  fetch("version.json?t=" + Date.now()).then(r => r.json()).then(v => { if (v && v.build && v.build !== APP_BUILD) { $("update").style.display = "block"; document.body.classList.add("banner"); } }).catch(() => {});
}

// ================= audio: only ever on a button press =================
const A = new Audio(); A.preload = "auto";
let playing = null, playingSlow = false, onEnd = null;
const src = id => "audio/sentences/" + id + ".mp3";
function play(id, slow, done) {
  stopAudio();
  playing = id; playingSlow = !!slow; onEnd = done || null;
  A.src = src(id); A.preservesPitch = true; A.webkitPreservesPitch = true;
  A.defaultPlaybackRate = A.playbackRate = slow ? 0.75 : 1;
  A.play().catch(() => { if (LS.on) { stopListen(); renderListen(); } });
  markPlaying();
}
function stopAudio() { playing = null; onEnd = null; try { A.pause(); } catch (e) {} markPlaying(); }
// a pause nobody asked for (a call, Siri, the lock screen) ends playback cleanly, so Listen does not hang on "Stop"
A.addEventListener("pause", () => { if (playing && !A.ended) { playing = null; onEnd = null; markPlaying(); if (LS.on) { stopListen(); renderListen(); } } });
A.addEventListener("loadedmetadata", () => { if (A.playbackRate !== A.defaultPlaybackRate) A.playbackRate = A.defaultPlaybackRate; });
A.addEventListener("error", () => { playing = null; onEnd = null; markPlaying(); if (LS.on) { stopListen(); renderListen(); } });
A.addEventListener("ended", () => { const f = onEnd; playing = null; onEnd = null; markPlaying(); f && f(); });
function markPlaying() { document.querySelectorAll("[data-play]").forEach(b => b.classList.toggle("on", b.dataset.play === playing && (b.dataset.slow === "1") === playingSlow)); }
function preload(id) { if (!id) return; try { fetch(src(id)).catch(() => {}); } catch (e) {} }   // warms the HTTP cache; an unplayed Audio loads only metadata on iOS

// ================= rendering helpers =================
const MARK_TEXT = {
  r: "The voice says z here. You say a curled-back r, like the Mandarin 日.",
  tr: "The voice says ch here. You curl the tongue back: tr like the Mandarin 知.",
  s: "The voice says x here. You curl the tongue back: s like the Mandarin 師.",
  pal: "The voice keeps the vowel clear here. You pull it toward ư, after ê toward ơ: tinh sounds like tưn, bệnh close to bợn."
};
function viHtml(vi) {
  return esc(vi).split(/(\s+)/).map(tok => {
    if (/^\s+$/.test(tok) || !tok) return tok;
    const m = voiceMarks(tok);
    return m.length ? '<span class="vm" data-m="' + m.join(" ") + '">' + tok + "</span>" : tok;
  }).join("");
}
function hasMarks(vi) { return vi.split(/\s+/).some(t => voiceMarks(t).length); }
// The sentence word by word (Mike, 4 Oct 2026): each Vietnamese word with its Chinese gloss underneath and, for
// Sino-Vietnamese words, the Hán Việt characters; then the whole sentence in Chinese and English.
function glossHtml(item, small) {
  if (!item.g) return '<div class="vi' + (small ? " s" : "") + '">' + viHtml(item.vi) + "</div>";
  return '<div class="gl' + (small ? " s" : "") + '">' + item.g.map(u => '<span class="u"><span class="v">' + viHtml(u[0]) + '</span><span class="z">' + esc(u[1]) + "</span>" +
    (u[2] ? '<span class="h">' + esc(u[2]) + "</span>" : "") + "</span>").join("") + "</div>";
}
function sentenceHtml(item, small) {   // words, then the whole sentence in Chinese and English
  return glossHtml(item, small) + (!small && hasMarks(item.vi) ? '<p class="hint small">The voice is off on the dotted syllable. Tap it.</p>' : "") + '<div class="markinfo"></div>' +
    '<div class="zh' + (small ? " s" : "") + '">' + esc(item.zh) + '</div><div class="meaning' + (small ? " s" : "") + '">' + esc(item.en) + "</div>";
}
function noteHtml(item) {
  let h = "";
  if (item.x) h += '<div class="x">' + esc(item.x) + "</div>";
  if (item.hz && !(item.g && item.g.some(u => u[2]))) h += '<div class="hz">' + esc(item.hz) + "</div>";   // the words already show their Hán Việt
  if (item.note) h += '<div class="note">' + esc(item.note) + "</div>";
  return h;
}
const playBtn = (id, label) => '<button class="btn play" data-play="' + id + '" data-act="play" data-id="' + id + '">' + ICON.play + (label ? "<span>" + label + "</span>" : "") + "</button>";
document.addEventListener("click", e => {
  const vm = e.target.closest(".vm");
  if (vm && !vm.closest('[data-act="play"]')) {   // inside a play button the tap plays; in a closed list row it opens the row
    const box = vm.closest(".card, .row, .page")?.querySelector(".markinfo");
    if (box) { box.innerHTML = vm.dataset.m.split(" ").map(k => "<p>" + esc(MARK_TEXT[k]) + "</p>").join(""); box.style.display = "block"; e.stopImmediatePropagation(); return; }
  }
  const b = e.target.closest("[data-act]"); if (!b) return;
  const a = b.dataset.act;
  if (a === "play") { play(b.dataset.id, b.dataset.slow === "1"); e.stopPropagation(); }
  else if (a === "go") show(b.dataset.to);
});

// ================= screens =================
let cur = "home";
function onCard() { return cur === "card"; }
function show(name, arg) {
  if (name !== "listen") stopListen();
  if (name !== cur) stopAudio();
  cur = name;
  document.querySelectorAll("section").forEach(s => s.classList.toggle("on", s.id === name));
  ({home: renderHome, card: renderCard, tandem: renderTandem, practice: renderPractice, listen: renderListen, library: renderLibrary, lessons: renderLessons, page: renderPage})[name](arg);
  window.scrollTo(0, 0);
}

// ----- home -----
function weekSnapshot(t) {
  const mo = monday(t), sure = sureCount(S, D);
  if (!S.wk || S.wk.w !== mo) { const prevGain = S.wk && S.wk.w === mo - 7 ? sure - S.wk.start : null; S.wk = {w: mo, start: sure, prev: prevGain}; persist(); }
  return {sure, gain: sure - S.wk.start, prev: S.wk.prev};
}
function weekDots(t) {
  const real = dayOf(Date.now()), mo = monday(real), names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const first = Math.min(...Object.values(S.cards).map(c => c.born).filter(x => x != null), real);   // days before the app existed are not missed
  let n = 0;
  const dots = names.map((nm, i) => {
    const d = mo + i, log = (S.days || {})[d], ok = log && log.done, missed = !ok && d < real && d >= first;
    if (ok) n++;
    return '<div class="dot"><span class="' + (ok ? "ok" : missed ? "miss" : "") + '">' + (ok ? "✓" : missed ? "✕" : "") + "</span><small" + (d === real ? ' class="now"' : "") + ">" + nm + "</small></div>";
  }).join("");
  return {html: '<div class="dots">' + dots + "</div>", n};
}
// A finished round from an earlier day whose tandem step was never ticked still counts as a practice day.
function settleOldRound(t) {
  const R = S.round;
  if (R && R.day < t && roundDone(R) && !R.tandem) { R.tandem = "open"; dayLog(S, R.day).done = true; save(); }
}
function roundLesson() { return (S.round && D.lessons.find(x => x.key === S.round.lesson)) || currentLesson(S, D); }
function renderHome() {
  const t = today(); settleOldRound(t);
  const real = dayOf(Date.now()), L = currentLesson(S, D), R = S.round && S.round.day === t ? S.round : null;
  const pending = nextNew(S, D).length, introNeeded = pending && !(S.introRead || {})[L.key];
  let main = "";
  if (introNeeded) {
    main = '<div class="kicker">New lesson</div><h2>' + esc(L.title) + '</h2><p>Read the introduction first, then the new sentences start.</p>' +
      '<button class="btn primary big" data-act="lesson" data-key="' + L.key + '">Read the introduction</button><hr class="sep">';
  }
  if (R && roundDone(R) && R.tandem) {
    const nc = R.items.filter(x => !x.retry).length, mn = Math.max(1, Math.round(R.ms / 60000));
    main += '<div class="kicker">Today</div><h2>Done for today.</h2><p>' + nc + (nc === 1 ? " card in " : " cards in ") + mn + (mn === 1 ? " minute." : " minutes.") + " Next round tomorrow.</p>";
  } else if (R && roundDone(R)) {
    main += '<div class="kicker">Today</div><h2>Round finished.</h2><p>One thing left: the tandem task.</p><button class="btn primary big" data-act="go" data-to="tandem">Tandem task</button>';
  } else if (R) {
    main += '<div class="kicker">Today</div><h2>Round in progress</h2><p>Card ' + (R.pos + 1) + " of " + R.items.length + ".</p>" +
      '<button class="btn primary big" data-act="start">Continue</button>';
  } else {
    const P = buildRound(S, D, t), nNew = P.items.filter(x => x.m === "new").length, nRev = P.items.length - nNew, min = Math.max(1, Math.round(P.est / 60000));
    if (!P.items.length) {   // nothing to do counts as a done day, not as a missed one
      const log = dayLog(S, t); if (!log.done && !introNeeded) { log.done = true; log.free = true; save(); }
      main += '<div class="kicker">Today</div><h2>Nothing due today.</h2>';
    }
    else main += '<div class="kicker">Today</div><h2>About ' + min + (min === 1 ? " minute" : " minutes") + "</h2><p>" +
      nRev + (nRev === 1 ? " review" : " reviews") + (nNew ? ", " + nNew + " new" : "") + (P.backlog ? ". " + P.backlog + " more are waiting, new sentences pause until they are through." : ".") + "</p>" +
      '<button class="btn primary big" data-act="start">Start</button>';
  }
  if (!pending && !introNeeded && D.lessons.indexOf(L) === D.lessons.length - 1) main += '<p class="muted">Lesson ' + L.n + " is fully in. Lesson " + (L.n + 1) + " comes after your Friday check-in.</p>";
  const w = weekSnapshot(t), dots = weekDots(t);
  const wk = '<div class="kicker">This week</div>' + dots.html + '<p class="muted">' + dots.n + " of 7 days. " + w.sure + " sentences sure" +
    (w.gain > 0 ? ", " + w.gain + " more than on Monday" : "") + (w.prev != null ? ". Last week: " + (w.prev >= 0 ? "+" : "") + w.prev + "." : ".") + "</p>";
  const ci = S.checkins && S.checkins[isoDate(monday(t))], mins = (S.cfg && S.cfg.min) || MIN_DEFAULT;
  $("home").innerHTML =
    '<header><h1>Tiếng Việt</h1><div class="sub">Lesson ' + L.n + ": " + esc(L.title) + "</div></header>" +
    '<div class="panel">' + main + "</div>" +
    '<div class="panel">' + wk + "</div>" +
    '<div class="grid">' +
    '<button class="btn tile" data-act="go" data-to="listen">Listen<small>current lesson, with pauses</small></button>' +
    '<button class="btn tile" data-act="go" data-to="library">Sentences<small>everything you have met</small></button>' +
    '<button class="btn tile" data-act="go" data-to="lessons">Lessons<small>introductions and notes</small></button>' +
    '<button class="btn tile" data-act="go" data-to="practice">Practise<small>any lesson, freely</small></button>' +
    "</div>" +
    '<div class="panel minutes"><span>Minutes a day</span><span class="seg">' + MINUTES.map(m => '<button class="btn' + (m === mins ? " on" : "") + '" data-act="mins" data-m="' + m + '">' + m + "</button>").join("") + "</span></div>" +
    '<footer><span id="sync">' + syncText() + "</span><span>v " + APP_BUILD + "</span></footer>";
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  if (b.dataset.act === "mins") { S.cfg = Object.assign({}, S.cfg, {min: +b.dataset.m}); S.cfgTs = Date.now(); save(); renderHome(); }   // takes effect with the next round that is built
  if (b.dataset.act === "start") startRound();
  if (b.dataset.act === "lesson") show("page", {key: b.dataset.key, i: 0});
});

// ----- the round -----
let cs = null;   // card state: {plays, revealed, shownAt, notes}
function startRound() {
  const t = today();
  settleOldRound(t);
  if (!S.round || S.round.day !== t) { S.round = buildRound(S, D, t); UNDO = null; save(); }
  else {   // a round built before 1 Oct 2026 may still hold sound drills: drop the ones not yet answered
    const R = S.round, keep = R.items.filter((x, i) => i < R.pos || !D.sent[x.id] || D.sent[x.id].kind !== "d");
    if (keep.length !== R.items.length) { R.items = keep; save(); }
  }
  if (roundDone(S.round)) { show(S.round.tandem ? "home" : "tandem"); return; }
  cs = null; show("card");
}
const MODE_LABEL = {new: "New sentence", echo: "Listen and repeat", drill: "Sound drill", recall: "Say it from the meaning"};
function renderCard() {
  const R = S.round, it = R.items[R.pos], item = D.sent[it.id];
  if (!cs || cs.id !== it.id + ":" + R.pos) cs = {id: it.id + ":" + R.pos, plays: 0, revealed: it.m !== "recall", shownAt: Date.now(), notes: it.m === "new"};
  const ready = cs.revealed;   // Mike 2026-10-01: rating never waits for a play
  const pct = Math.round(100 * R.pos / R.items.length);
  let body = "";
  if (!cs.revealed) {
    body = '<div class="meaning big">' + esc(item.en) + '</div><div class="zh big">' + esc(item.zh) + "</div>" +
      '<p class="hint">Say it in Vietnamese, out loud. Then check.</p>' +
      '<button class="btn primary big" data-act="reveal">Check</button>';
  } else {
    body = sentenceHtml(item) +
      ((item.note || item.hz || item.x) ? (cs.notes ? '<div class="notes">' + noteHtml(item) + "</div>" : '<button class="link" data-act="notes">Notes</button>') : "") +
      '<div class="plays">' +
      '<button class="btn play big" data-play="' + it.id + '" data-act="cplay">' + ICON.play + "<span>Play</span></button>" +
      '<button class="btn play" data-play="' + it.id + '" data-act="cplay" data-slow="1">' + ICON.play + "<span>Slow</span></button></div>" +
      (it.m === "new" ? '<p class="hint small">Play it, say it, play it again. Then rate yourself.</p>' : "") +
      '<div class="rate"><button class="btn again" data-act="rate" data-r="again"' + (ready ? "" : " disabled") + ">Again</button>" +
      '<button class="btn ok" data-act="rate" data-r="ok"' + (ready ? "" : " disabled") + ">Got it</button>" +
      '<button class="btn easy" data-act="rate" data-r="easy"' + (ready ? "" : " disabled") + ">Easy</button></div>";
  }
  $("card").innerHTML =
    '<div class="top"><button class="icon" data-act="go" data-to="home" aria-label="Back">' + ICON.back + '</button><div class="bar"><i style="width:' + pct + '%"></i></div><span class="count">' + (R.pos + 1) + "/" + R.items.length + "</span>" + undoLink() + "</div>" +
    '<div class="card"><div class="kicker">' + MODE_LABEL[it.m] + (it.retry ? ", once more" : "") + "</div>" + body + "</div>";
  const nxt = R.items[R.pos + 1]; if (nxt) preload(nxt.id);
}
function cardPlay(slow) {
  const it = S.round.items[S.round.pos];
  play(it.id, slow, () => { if (cs) cs.plays++; });   // no redraw: an open explanation of a dotted syllable stays open
}
// Undo: one step back, the last rating of the round (Mike, 2 Oct 2026). Gone when the cloud replaces the state.
let UNDO = null;
const undoLink = () => UNDO ? '<button class="link undo" data-act="undo">Undo</button>' : "";
function undoLast() {
  if (!UNDO) return;
  applyUndo(S, UNDO); UNDO = null; cs = null; stopAudio(); save();
  if (S.round && !roundDone(S.round) && S.round.day === today()) show("card"); else show("home");
}
document.addEventListener("click", e => { if (e.target.closest('[data-act="undo"]')) { e.stopImmediatePropagation(); undoLast(); } }, true);
function rate(r) {
  const R = S.round, it = R && R.items[R.pos];
  if (!cs || !it || cs.id !== it.id + ":" + R.pos) { if (it) renderCard(); else show("home"); return; }   // the state changed under the card
  if (R.day !== today()) { show("home"); return; }   // the card stayed open past midnight: today gets its own round
  const ms = Date.now() - cs.shownAt;
  UNDO = undoPoint(S, R, today());
  answer(S, D, R, r, today(), ms); cs = null; stopAudio(); save();
  if (roundDone(R)) show("tandem"); else renderCard();
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || cur !== "card") return;
  const a = b.dataset.act;
  if (a === "cplay") { e.stopImmediatePropagation(); cardPlay(b.dataset.slow === "1"); }
  if (a === "reveal") { cs.revealed = true; cs.notes = false; cardPlay(false); renderCard(); }
  if (a === "notes") { cs.notes = true; renderCard(); }
  if (a === "rate" && !b.disabled) rate(b.dataset.r);
}, true);
document.addEventListener("keydown", e => {   // on the Mac: space play, s slow, enter check, 1 again, 2 got it, 3 easy
  if (cur !== "card" || e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
  const q = s => document.querySelector("#card " + s);
  if (e.key === " ") { e.preventDefault(); if (cs && cs.revealed) cardPlay(false); }
  else if (e.key === "s") { if (cs && cs.revealed) cardPlay(true); }
  else if (e.key === "Enter") { const b = q('[data-act="reveal"]'); if (b) b.click(); }
  else if (e.key === "1") { const b = q('[data-r="again"]'); if (b && !b.disabled) rate("again"); }
  else if (e.key === "2") { const b = q('[data-r="ok"]'); if (b && !b.disabled) rate("ok"); }
  else if (e.key === "3") { const b = q('[data-r="easy"]'); if (b && !b.disabled) rate("easy"); }
});

// ----- tandem task: the round counts once this is ticked -----
function renderTandem() {
  const L = roundLesson();
  $("tandem").innerHTML = '<div class="top"><button class="icon" data-act="go" data-to="home" aria-label="Back">' + ICON.back + '</button><span style="flex:1"></span>' + undoLink() + "</div>" +
    '<div class="panel page"><div class="kicker">Tandem task, lesson ' + L.n + "</div>" + L.tandem + "</div>" +
    '<div class="rate"><button class="btn again" data-act="tandem" data-v="skip">Not today</button><button class="btn ok" data-act="tandem" data-v="done">Done</button></div>';
  document.querySelectorAll("#tandem .pl").forEach(b => { const id = b.dataset.id, it = D.sent[id];
    b.outerHTML = '<div class="ex">' + playBtn(id) + '<div class="exb">' + (it ? sentenceHtml(it, true) : esc(id)) + "</div></div>"; });
}
document.addEventListener("click", e => {
  const b = e.target.closest('[data-act="tandem"]'); if (!b) return;
  const R = S.round, t = today(); if (!R || !roundDone(R) || (R.tandem && R.tandem !== "open")) { show("home"); return; }
  R.tandem = b.dataset.v; const log = dayLog(S, R.day); log.done = true; log.tandem = b.dataset.v; save();
  show("home");
});

// ----- free practice: any lesson, any time (Mike, 1 Oct 2026; replaces the Friday check-in) -----
// Got it changes nothing (reviewing early would push a card too far out); Again makes the card due tomorrow.
let PR = null;   // {key, items, pos, done, cs}
function renderPractice() {
  const back = '<div class="top"><button class="icon" data-act="' + (PR ? "prquit" : "go") + '" data-to="home" aria-label="Back">' + ICON.back + "</button>";
  if (!PR) {
    $("practice").innerHTML = back + "</div><header><h1>Practise</h1><div class=\"sub\">Go through a lesson freely. Got it changes nothing; Again brings the sentence into tomorrow's round.</div></header>" +
      D.lessons.map(L => { const n = practised(D, L).filter(id => S.cards[id] && S.cards[id].box).length;
        return n ? '<button class="btn tile wide" data-act="prstart" data-key="' + L.key + '">Lesson ' + L.n + ": " + esc(L.title) + "<small>" + n + (n === 1 ? " sentence" : " sentences") + "</small></button>" : ""; }).join("");
    return;
  }
  if (PR.pos >= PR.items.length) {
    $("practice").innerHTML = back + '<span style="flex:1"></span>' + (PR.undo ? '<button class="link undo" data-act="prundo">Undo</button>' : "") + '</div><div class="panel"><h2>Done.</h2><p>' + PR.done + (PR.done === 1 ? " sentence" : " sentences") + " practised." +
      (PR.again ? " " + PR.again + " of them come back in tomorrow's round." : "") + '</p><button class="btn primary big" data-act="prquit">Back</button></div>';
    return;
  }
  const id = PR.items[PR.pos], item = D.sent[id], c = S.cards[id] || {}, recall = c.box >= 3;
  if (!PR.cs || PR.cs.id !== id + ":" + PR.pos) PR.cs = {id: id + ":" + PR.pos, revealed: !recall, notes: false};
  const q = PR.cs, pct = Math.round(100 * PR.pos / PR.items.length);
  const body = !q.revealed
    ? '<div class="meaning big">' + esc(item.en) + '</div><div class="zh big">' + esc(item.zh) + '</div><p class="hint">Say it in Vietnamese, out loud. Then check.</p><button class="btn primary big" data-act="prreveal">Check</button>'
    : sentenceHtml(item) +
      ((item.note || item.hz || item.x) ? (q.notes ? '<div class="notes">' + noteHtml(item) + "</div>" : '<button class="link" data-act="prnotes">Notes</button>') : "") +
      '<div class="plays"><button class="btn play big" data-play="' + id + '" data-act="play" data-id="' + id + '">' + ICON.play + "<span>Play</span></button>" +
      '<button class="btn play" data-play="' + id + '" data-act="play" data-id="' + id + '" data-slow="1">' + ICON.play + "<span>Slow</span></button></div>" +
      '<div class="rate"><button class="btn again" data-act="prrate" data-r="again">Again</button><button class="btn ok" data-act="prrate" data-r="ok">Got it</button></div>';
  $("practice").innerHTML = back + '<div class="bar"><i style="width:' + pct + '%"></i></div><span class="count">' + (PR.pos + 1) + "/" + PR.items.length + "</span>" + (PR.undo ? '<button class="link undo" data-act="prundo">Undo</button>' : "") + "</div>" +
    '<div class="card"><div class="kicker">Free practice, lesson ' + PR.n + (recall ? ", say it from the meaning" : ", listen and repeat") + "</div>" + body + "</div>";
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || cur !== "practice") return;
  const a = b.dataset.act;
  if (a === "prstart") {
    const L = D.lessons.find(x => x.key === b.dataset.key), ids = practised(D, L).filter(id => S.cards[id] && S.cards[id].box);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }   // shuffled
    PR = {key: L.key, n: L.n, items: ids, pos: 0, done: 0, again: 0, cs: null}; renderPractice();
  }
  if (a === "prquit") { PR = null; stopAudio(); show("home"); }
  if (a === "prundo" && PR && PR.undo) {
    const u = PR.undo; Object.assign(PR, {pos: u.pos, items: u.items, done: u.done, again: u.again, undo: null, cs: null});
    if (S.cards[u.id] && u.due != null && S.cards[u.id].due !== u.due) { S.cards[u.id].due = u.due; save(); }
    stopAudio(); renderPractice();
  }
  if (a === "prreveal") { PR.cs.revealed = true; play(PR.items[PR.pos], false); renderPractice(); }
  if (a === "prnotes") { PR.cs.notes = true; renderPractice(); }
  if (a === "prrate") {
    const id = PR.items[PR.pos];
    PR.undo = {pos: PR.pos, items: PR.items.slice(), done: PR.done, again: PR.again, id, due: S.cards[id] ? S.cards[id].due : null};
    if (b.dataset.r === "again") {
      if (practiceAgain(S, id, today())) save();
      if (PR.items.indexOf(id, PR.pos + 1) < 0) PR.items.splice(Math.min(PR.pos + 5, PR.items.length), 0, id);   // once more, a few cards later
      PR.again += PR.items.indexOf(id) === PR.pos ? 1 : 0;
    } else PR.done++;
    stopAudio(); PR.pos++; PR.cs = null; renderPractice();
  }
});

// ----- listen: the current lesson in a row, started and stopped by hand -----
let LS = {on: false, i: 0, slow: false, echo: true, timer: 0, list: []};
function listenList() {
  const L = currentLesson(S, D);
  let ids = practised(D, L).filter(id => S.cards[id] && S.cards[id].box);
  LS.fromPrev = false;
  if (!ids.length) { const prev = D.lessons[D.lessons.indexOf(L) - 1]; if (prev) { ids = practised(D, prev).filter(id => S.cards[id]); LS.fromPrev = true; } }
  return ids;
}
function renderListen() {
  LS.list = listenList(); if (LS.i >= LS.list.length) LS.i = 0;
  const id = LS.list[LS.i], item = id && D.sent[id];
  $("listen").innerHTML = '<div class="top"><button class="icon" data-act="go" data-to="home" aria-label="Back">' + ICON.back + "</button></div>" +
    '<header><h1>Listen</h1><div class="sub">' + LS.list.length + " sentences you have met in " + (LS.fromPrev ? "the previous lesson" : "this lesson") + ". Each one plays, then a pause to say it" + (LS.echo ? ", then once more." : ".") + "</div></header>" +
    '<div class="card">' + (item ? '<div class="kicker">' + (LS.i + 1) + " of " + LS.list.length + '</div>' + sentenceHtml(item) : "<p>Nothing to play yet.</p>") + "</div>" +
    '<div class="plays"><button class="btn primary big" data-act="lstart">' + (LS.on ? ICON.stop + "<span>Stop</span>" : ICON.play + "<span>" + (LS.i ? "Go on" : "Start") + "</span>") + "</button></div>" +
    '<div class="toggles"><label><input type="checkbox" id="l_slow"' + (LS.slow ? " checked" : "") + "> slow</label>" +
    '<label><input type="checkbox" id="l_echo"' + (LS.echo ? " checked" : "") + "> play twice</label>" +
    (LS.i ? '<button class="link" data-act="lreset">from the start</button>' : "") + "</div>";
}
function stopListen() { LS.on = false; clearTimeout(LS.timer); if (cur === "listen") stopAudio(); }
function listenStep(second) {
  if (!LS.on) return;
  const id = LS.list[LS.i]; if (!id) { stopListen(); LS.i = 0; renderListen(); return; }
  renderListen();
  play(id, LS.slow, () => {
    const gap = Math.max(1500, (A.duration || 2) * 1000 * (LS.slow ? 1.6 : 1.2) + 1000);
    LS.timer = setTimeout(() => {
      if (!LS.on) return;
      if (LS.echo && !second) listenStep(true);
      else { LS.i++; if (LS.i >= LS.list.length) { LS.on = false; LS.i = 0; renderListen(); } else listenStep(false); }
    }, gap);
  });
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || cur !== "listen") return;
  if (b.dataset.act === "lstart") { if (LS.on) { stopListen(); renderListen(); } else { LS.on = true; listenStep(false); } }
  if (b.dataset.act === "lreset") { stopListen(); LS.i = 0; renderListen(); }
});
document.addEventListener("change", e => {
  if (e.target.id === "l_slow") LS.slow = e.target.checked;
  if (e.target.id === "l_echo") { LS.echo = e.target.checked; if (!LS.on) renderListen(); }
});

// ----- sentences: everything met so far, searchable -----
let libQuery = "", libOpen = null;
function renderLibrary() {
  $("library").innerHTML = '<div class="top"><button class="icon" data-act="go" data-to="home" aria-label="Back">' + ICON.back + "</button></div>" +
    '<header><h1>Sentences</h1></header><input id="q" type="search" placeholder="Search Vietnamese, English or 中文" value="' + esc(libQuery) + '" autocomplete="off">' +
    '<div id="liblist"></div>';
  renderLibList();
}
function renderLibList() {
  const q = fold(libQuery.trim());
  let h = "";
  for (const L of D.lessons) {
    const ids = L.ids.filter(id => S.cards[id] && (!q || fold(D.sent[id].vi + " " + D.sent[id].en + " " + D.sent[id].zh).includes(q)));
    if (!ids.length) continue;
    h += '<div class="kicker sect">Lesson ' + L.n + ": " + esc(L.title) + "</div>";
    for (const id of ids) {
      const it = D.sent[id], c = S.cards[id], st = it.kind === "d" ? "sound" : c.box >= SURE_BOX ? "sure" : c.box ? "learning" : "new";
      h += '<div class="row" data-row="' + id + '">' + playBtn(id) + '<div class="rt">' + (libOpen === id ? sentenceHtml(it, true) + (noteHtml(it) ? '<div class="notes">' + noteHtml(it) + "</div>" : "")
          : '<div class="vi s">' + viHtml(it.vi) + '</div><div class="meaning s">' + esc(it.en) + "</div>") + '</div><span class="tag ' + st + '">' + st + "</span></div>";
    }
  }
  $("liblist").innerHTML = h || '<p class="muted">Nothing found.</p>';
}
document.addEventListener("input", e => {
  if (e.target.id === "q") { libQuery = e.target.value; renderLibList(); }
});
document.addEventListener("click", e => {
  if (cur !== "library" || e.target.closest("[data-act]")) return;
  const r = e.target.closest("[data-row]"); if (!r) return;
  libOpen = libOpen === r.dataset.row ? null : r.dataset.row; renderLibList();
});

// ----- lessons and their introduction pages -----
function renderLessons() {
  $("lessons").innerHTML = '<div class="top"><button class="icon" data-act="go" data-to="home" aria-label="Back">' + ICON.back + "</button></div><header><h1>Lessons</h1></header>" +
    D.lessons.map(L => { const P = practised(D, L), met = P.filter(id => S.cards[id]).length;
      return '<button class="btn tile wide" data-act="lesson" data-key="' + L.key + '">Lesson ' + L.n + ": " + esc(L.title) + "<small>" + met + " of " + P.length + " sentences met, " + L.pages.length + " pages</small></button>"; }).join("");
}
function renderPage(arg) {
  const L = D.lessons.find(x => x.key === arg.key), i = arg.i, P = L.pages[i], last = i === L.pages.length - 1, unread = !(S.introRead || {})[L.key];
  $("page").innerHTML = '<div class="top"><button class="icon" data-act="go" data-to="' + (unread ? "home" : "lessons") + '" aria-label="Back">' + ICON.back + '</button><span class="count">' + (i + 1) + "/" + L.pages.length + "</span></div>" +
    '<div class="panel page"><div class="kicker">Lesson ' + L.n + "</div><h2>" + esc(P.t) + "</h2>" + P.h + '<div class="markinfo"></div></div>' +
    '<div class="rate">' + (i ? '<button class="btn" data-act="pg" data-k="' + L.key + '" data-i="' + (i - 1) + '">Back</button>' : "<span></span>") +
    (last ? (unread ? '<button class="btn ok" data-act="pgdone" data-k="' + L.key + '">Start learning</button>' : '<button class="btn" data-act="go" data-to="lessons">Done</button>')
      : '<button class="btn ok" data-act="pg" data-k="' + L.key + '" data-i="' + (i + 1) + '">Next</button>') + "</div>";
  // play buttons inside the text, as written in the lesson file with @@play
  document.querySelectorAll("#page .pl").forEach(b => { const id = b.dataset.id, it = D.sent[id];   // every example with its words and translations
    b.outerHTML = '<div class="ex">' + playBtn(id) + '<div class="exb">' + (it ? sentenceHtml(it, true) : esc(id)) + "</div></div>"; });
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  if (b.dataset.act === "pg") show("page", {key: b.dataset.k, i: +b.dataset.i});
  if (b.dataset.act === "pgdone") {
    S.introRead = S.introRead || {}; S.introRead[b.dataset.k] = true;
    // a round of reviews may already be under way or done today: the new sentences join it now, as the intro promised
    const t = today(), R = S.round;
    if (R && R.day === t) {
      const P = buildRound(S, D, t), have = new Set(R.items.map(x => x.id)), add = P.items.filter(x => x.m === "new" && !have.has(x.id));
      if (add.length) { R.items.push(...add); R.lesson = b.dataset.k; R.tandem = null; }
    }
    save(); show("home");
  }
});

// ================= start =================
// A device without any local state starts only after the cloud has answered: a failed request must never create
// a second, fresh course that could later be taken for real progress.
function boot() {
  checkVersion();
  if (!SYNC_URL || Object.keys(S.cards).length) {
    if (!Object.keys(S.cards).length) { migrateLesson1(S, D, today()); save(); }
    show("home"); cloudSync(); return;
  }
  $("home").innerHTML = '<header><h1>Tiếng Việt</h1></header><div class="panel"><p>Loading your progress …</p></div>';
  cloudGet().then(o => {
    if (o && o.cards) { adopt(o); setSync(true); show("home"); }
    else { migrateLesson1(S, D, today()); save(); show("home"); }
  }).catch(() => {
    setSync(false);
    $("home").innerHTML = '<header><h1>Tiếng Việt</h1></header><div class="panel"><p>Could not reach the server, so your progress could not be loaded.</p>' +
      '<button class="btn primary big" data-act="retry">Try again</button></div>';
  });
}
document.addEventListener("click", e => { if (e.target.closest('[data-act="retry"]')) boot(); });
boot();
