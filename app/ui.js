// ui.js: screens, audio, storage and sync. Uses CORE (core.js) and D (the data from build.py).
// Rules from Mike (2026-09-30): sound only on a button press, never autoplay. English interface. Phone first.

const {dayOf, dow, practiceDay, monday, isoDate, buildRound, roundDone, answer, dayLog, currentLesson, nextNew,
  migrateLesson1, freshState, fixState, nCards, cloudWins, mayUpload, voiceMarks, fold, sureCount, weekAgain, modeOf, SURE_BOX} = CORE;

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
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.cards) return fixState(s); } catch (e) {} return freshState(); }
let S = load();
let syncInfo = {ok: null, at: 0}, lastCloudN = null, lastCloudAt = 0, saveTimer = 0;
function saveLocal() { S.ts = Date.now(); S.build = APP_BUILD; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function save() { saveLocal(); clearTimeout(saveTimer); saveTimer = setTimeout(cloudSave, 800); }
function setSync(ok) { syncInfo = {ok, at: Date.now()}; const el = $("sync"); if (el) el.textContent = syncText(); }
function syncText() {
  if (LOCAL) return "test mode, not synced";
  if (syncInfo.ok === null) return "connecting";
  if (!syncInfo.ok) return "not synced";
  return "synced " + new Date(syncInfo.at).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
}
function cloudGet() { return fetch(SYNC_URL + "?t=" + Date.now()).then(r => { if (!r.ok) throw 0; return r.json(); }).then(o => { lastCloudN = nCards(o, D); lastCloudAt = Date.now(); return o; }); }
function cloudPut() { lastCloudN = nCards(S, D); return fetch(SYNC_URL, {method: "PUT", body: JSON.stringify(S), keepalive: true}).then(r => { if (!r.ok) throw 0; setSync(true); }); }
function adopt(o) { S = fixState(o); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function cloudSave() {
  if (!SYNC_URL) return;
  cloudGet().then(o => {
    if (cloudWins(S, o, D)) { adopt(o); setSync(true); if (cur === "home") show("home"); return; }   // another device is further: take its state
    if (mayUpload(S, o, D)) return cloudPut();
  }).catch(() => setSync(false));
}
function cloudSync(after) {
  if (!SYNC_URL) { after && after(); return; }
  cloudGet().then(o => { if (cloudWins(S, o, D)) adopt(o); setSync(true); after && after(o); })
    .catch(() => { setSync(false); after && after(); });
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {   // leaving: upload at once if the cloud was read recently (iOS freezes the page otherwise)
    saveLocal();
    if (SYNC_URL && lastCloudN != null && nCards(S, D) >= lastCloudN && Date.now() - lastCloudAt < 20 * 60000) cloudPut().catch(() => {});
  } else { cloudSync(() => { if (cur === "home") show("home"); }); checkVersion(); }
});
function checkVersion() {
  if (LOCAL) return;
  fetch("version.json?t=" + Date.now()).then(r => r.json()).then(v => { if (v && v.build && v.build !== APP_BUILD) $("update").style.display = "block"; }).catch(() => {});
}

// ================= audio: only ever on a button press =================
const A = new Audio(); A.preload = "auto";
let playing = null, onEnd = null;
const src = id => "audio/sentences/" + id + ".mp3";
function play(id, slow, done) {
  stopAudio();
  playing = id; onEnd = done || null;
  A.src = src(id); A.preservesPitch = true; A.webkitPreservesPitch = true;
  A.defaultPlaybackRate = A.playbackRate = slow ? 0.75 : 1;
  A.play().catch(() => {});
  markPlaying();
}
function stopAudio() { try { A.pause(); } catch (e) {} playing = null; onEnd = null; markPlaying(); }
A.addEventListener("loadedmetadata", () => { if (A.playbackRate !== A.defaultPlaybackRate) A.playbackRate = A.defaultPlaybackRate; });
A.addEventListener("ended", () => { const f = onEnd; playing = null; onEnd = null; markPlaying(); f && f(); });
function markPlaying() { document.querySelectorAll("[data-play]").forEach(b => b.classList.toggle("on", b.dataset.play === playing)); }
function preload(id) { if (!id) return; const a = new Audio(); a.preload = "auto"; a.src = src(id); }

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
function noteHtml(item) {
  let h = "";
  if (item.hz) h += '<div class="hz">' + esc(item.hz) + "</div>";
  if (item.note) h += '<div class="note">' + esc(item.note) + "</div>";
  return h;
}
const playBtn = (id, label) => '<button class="btn play" data-play="' + id + '" data-act="play" data-id="' + id + '">' + ICON.play + (label ? "<span>" + label + "</span>" : "") + "</button>";
document.addEventListener("click", e => {
  const vm = e.target.closest(".vm");
  if (vm) { const box = vm.closest(".card, .row, .page")?.querySelector(".markinfo"); if (box) { box.innerHTML = vm.dataset.m.split(" ").map(k => "<p>" + esc(MARK_TEXT[k]) + "</p>").join(""); box.style.display = "block"; } return; }
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
  ({home: renderHome, card: renderCard, tandem: renderTandem, checkin: renderCheckin, listen: renderListen, library: renderLibrary, lessons: renderLessons, page: renderPage})[name](arg);
  window.scrollTo(0, 0);
}

// ----- home -----
function weekSnapshot(t) {
  const mo = monday(t), sure = sureCount(S, D);
  if (!S.wk || S.wk.w !== mo) { const prevGain = S.wk && S.wk.w === mo - 7 ? sure - S.wk.start : null; S.wk = {w: mo, start: sure, prev: prevGain}; saveLocal(); }
  return {sure, gain: sure - S.wk.start, prev: S.wk.prev};
}
function weekDots(t) {
  const real = dayOf(Date.now()), mo = monday(real), names = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const first = Math.min(...Object.values(S.cards).map(c => c.born).filter(x => x != null), real);   // days before the app existed are not missed
  let n = 0;
  const dots = names.map((nm, i) => {
    const d = mo + i, log = (S.days || {})[d], ok = log && log.done, missed = !ok && d < real && d >= first;
    if (ok) n++;
    return '<div class="dot"><span class="' + (ok ? "ok" : missed ? "miss" : "") + '">' + (ok ? "✓" : missed ? "✕" : "") + "</span><small" + (d === real ? ' class="now"' : "") + ">" + nm + "</small></div>";
  }).join("");
  return {html: '<div class="dots">' + dots + "</div>", n};
}
function renderHome() {
  const t = today(), real = dayOf(Date.now()), L = currentLesson(S, D), R = S.round && S.round.day === t ? S.round : null;
  const pending = nextNew(S, D).length, introNeeded = pending && !(S.introRead || {})[L.key];
  let main = "";
  if (introNeeded) {
    main = '<div class="kicker">New lesson</div><h2>' + esc(L.title) + '</h2><p>Read the introduction first, then the new sentences start.</p>' +
      '<button class="btn primary big" data-act="lesson" data-key="' + L.key + '">Read the introduction</button>';
  }
  if (R && roundDone(R) && R.tandem) {
    const nc = R.items.filter(x => !x.retry).length, mn = Math.max(1, Math.round(R.ms / 60000));
    main += '<div class="kicker">Today</div><h2>Done for today.</h2><p>' + nc + (nc === 1 ? " card in " : " cards in ") + mn + (mn === 1 ? " minute." : " minutes.") + (dow(real) >= 5 ? " Enjoy the weekend, the next round is on Monday." : " Next round tomorrow.") + "</p>";
  } else if (R && roundDone(R)) {
    main += '<div class="kicker">Today</div><h2>Round finished.</h2><p>One thing left: the tandem task.</p><button class="btn primary big" data-act="go" data-to="tandem">Tandem task</button>';
  } else if (R) {
    main += '<div class="kicker">Today</div><h2>Round in progress</h2><p>Card ' + (R.pos + 1) + " of " + R.items.length + ".</p>" +
      '<button class="btn primary big" data-act="start">Continue</button>';
  } else {
    const P = buildRound(S, D, t), nNew = P.items.filter(x => x.m === "new").length, nRev = P.items.length - nNew, min = Math.max(1, Math.round(P.est / 60000));
    if (!P.items.length) main += '<div class="kicker">Today</div><h2>Nothing due today.</h2><p>' + (pending ? "" : "All sentences of this lesson are in. The next lesson comes after your Friday check-in.") + "</p>";
    else main += '<div class="kicker">' + (dow(real) >= 5 ? "Friday's round, still open" : "Today") + "</div><h2>About " + min + " minutes</h2><p>" +
      nRev + (nRev === 1 ? " review" : " reviews") + (nNew ? ", " + nNew + " new" : "") + (P.backlog ? ". " + P.backlog + " more are waiting, new sentences pause until they are through." : ".") + "</p>" +
      '<button class="btn primary big" data-act="start">Start</button>';
  }
  if (!pending && !introNeeded && D.lessons.indexOf(L) === D.lessons.length - 1) main += '<p class="muted">Lesson ' + L.n + " is fully in. Lesson " + (L.n + 1) + " comes after your Friday check-in.</p>";
  const w = weekSnapshot(t), dots = weekDots(t);
  const wk = '<div class="kicker">This week</div>' + dots.html + '<p class="muted">' + dots.n + " of 5 days. " + w.sure + " sentences sure" +
    (w.gain > 0 ? ", " + w.gain + " more than on Monday" : "") + (w.prev != null ? ". Last week: " + (w.prev >= 0 ? "+" : "") + w.prev + "." : ".") + "</p>";
  const ci = S.checkins && S.checkins[isoDate(monday(t))];
  $("home").innerHTML =
    '<header><h1>Tiếng Việt</h1><div class="sub">Lesson ' + L.n + ": " + esc(L.title) + "</div></header>" +
    '<div class="panel">' + main + "</div>" +
    '<div class="panel">' + wk + "</div>" +
    '<div class="grid">' +
    '<button class="btn tile" data-act="go" data-to="listen">Listen<small>current lesson, with pauses</small></button>' +
    '<button class="btn tile" data-act="go" data-to="library">Sentences<small>everything you have met</small></button>' +
    '<button class="btn tile" data-act="go" data-to="lessons">Lessons<small>introductions and notes</small></button>' +
    '<button class="btn tile" data-act="go" data-to="checkin">Check-in<small>' + (ci ? "done this week" : dow(real) >= 4 ? "Friday: due today" : "on Fridays") + "</small></button>" +
    "</div>" +
    '<footer><span id="sync">' + syncText() + "</span><span>v " + APP_BUILD + "</span></footer>";
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  if (b.dataset.act === "start") startRound();
  if (b.dataset.act === "lesson") show("page", {key: b.dataset.key, i: 0});
});

// ----- the round -----
let cs = null;   // card state: {plays, revealed, shownAt, notes}
function startRound() {
  const t = today();
  if (!S.round || S.round.day !== t) { S.round = buildRound(S, D, t); save(); }
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
    body = '<div class="vi">' + viHtml(item.vi) + "</div>" +
      (hasMarks(item.vi) ? '<p class="hint small">The voice is off on the dotted syllable. Tap it.</p>' : "") +
      '<div class="markinfo"></div>' +
      '<div class="meaning">' + esc(item.en) + '</div><div class="zh">' + esc(item.zh) + "</div>" +
      ((item.note || item.hz) ? (cs.notes ? '<div class="notes">' + noteHtml(item) + "</div>" : '<button class="link" data-act="notes">Notes</button>') : "") +
      '<div class="plays">' +
      '<button class="btn play big" data-play="' + it.id + '" data-act="cplay">' + ICON.play + "<span>Play</span></button>" +
      '<button class="btn play" data-act="cplay" data-slow="1">' + ICON.play + "<span>Slow</span></button></div>" +
      (it.m === "new" ? '<p class="hint small">Play it, say it, play it again. Then rate yourself.</p>' : "") +
      '<div class="rate"><button class="btn again" data-act="rate" data-r="again"' + (ready ? "" : " disabled") + ">Again</button>" +
      '<button class="btn ok" data-act="rate" data-r="ok"' + (ready ? "" : " disabled") + ">Got it</button></div>";
  }
  $("card").innerHTML =
    '<div class="top"><button class="icon" data-act="go" data-to="home" aria-label="Back">' + ICON.back + '</button><div class="bar"><i style="width:' + pct + '%"></i></div><span class="count">' + (R.pos + 1) + "/" + R.items.length + "</span></div>" +
    '<div class="card"><div class="kicker">' + MODE_LABEL[it.m] + (it.retry ? ", once more" : "") + "</div>" + body + "</div>";
  const nxt = R.items[R.pos + 1]; if (nxt) preload(nxt.id);
}
function cardPlay(slow) {
  const it = S.round.items[S.round.pos];
  play(it.id, slow, () => { if (cur === "card" && cs) { cs.plays++; renderCard(); } });
}
function rate(r) {
  const R = S.round, ms = Date.now() - cs.shownAt;
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
document.addEventListener("keydown", e => {   // on the Mac: space play, s slow, enter check, 1 again, 2 got it
  if (cur !== "card" || e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
  const q = s => document.querySelector("#card " + s);
  if (e.key === " ") { e.preventDefault(); if (cs && cs.revealed) cardPlay(false); }
  else if (e.key === "s") { if (cs && cs.revealed) cardPlay(true); }
  else if (e.key === "Enter") { const b = q('[data-act="reveal"]'); if (b) b.click(); }
  else if (e.key === "1") { const b = q('[data-r="again"]'); if (b && !b.disabled) rate("again"); }
  else if (e.key === "2") { const b = q('[data-r="ok"]'); if (b && !b.disabled) rate("ok"); }
});

// ----- tandem task: the round counts once this is ticked -----
function renderTandem() {
  const L = currentLesson(S, D);
  $("tandem").innerHTML = '<div class="top"><button class="icon" data-act="go" data-to="home" aria-label="Back">' + ICON.back + "</button></div>" +
    '<div class="panel page"><div class="kicker">Tandem task, lesson ' + L.n + "</div>" + L.tandem + "</div>" +
    '<div class="rate"><button class="btn again" data-act="tandem" data-v="skip">Not today</button><button class="btn ok" data-act="tandem" data-v="done">Done</button></div>';
}
document.addEventListener("click", e => {
  const b = e.target.closest('[data-act="tandem"]'); if (!b) return;
  const t = today(); if (!S.round || S.round.day !== t) return;
  S.round.tandem = b.dataset.v; const log = dayLog(S, t); log.done = true; log.tandem = b.dataset.v; save();
  const ci = S.checkins && S.checkins[isoDate(monday(t))];
  show(dow(dayOf(Date.now())) >= 4 && !ci ? "checkin" : "home");
});

// ----- Friday check-in -----
function renderCheckin() {
  const t = today(), key = isoDate(monday(t)), ci = (S.checkins || {})[key] || {}, L = currentLesson(S, D);
  const hard = weekAgain(S, t).slice(0, 8);
  const list = hard.length ? "<ul class=\"hardlist\">" + hard.map(([id, n]) => "<li><span>" + esc(D.sent[id] ? D.sent[id].vi : id) + "</span><small>" + n + "× again</small></li>").join("") + "</ul>"
    : '<p class="muted">No “Again” this week yet.</p>';
  $("checkin").innerHTML = '<div class="top"><button class="icon" data-act="go" data-to="home" aria-label="Back">' + ICON.back + "</button></div>" +
    '<header><h1>Check-in</h1><div class="sub">Week of ' + key + ", lesson " + L.n + ". The next lesson is built from this.</div></header>" +
    '<div class="panel"><div class="kicker">Hardest this week, counted by the app</div>' + list + "</div>" +
    '<div class="panel form">' +
    '<label>What was hard?<textarea id="ci_hard" rows="3">' + esc(ci.hard) + "</textarea></label>" +
    '<label>What did you actually use with your tandems?<textarea id="ci_used" rows="3">' + esc(ci.used) + "</textarea></label>" +
    '<label>What did the tandem say? Paste corrections or replies.<textarea id="ci_tandem" rows="5">' + esc(ci.tandem) + "</textarea></label>" +
    '<button class="btn primary big" data-act="cisave">' + (ci.ts ? "Update" : "Save") + "</button></div>";
}
document.addEventListener("click", e => {
  const b = e.target.closest('[data-act="cisave"]'); if (!b) return;
  const t = today(), key = isoDate(monday(t));
  S.checkins = S.checkins || {};
  S.checkins[key] = {hard: $("ci_hard").value.trim(), used: $("ci_used").value.trim(), tandem: $("ci_tandem").value.trim(), ts: Date.now(),
    lesson: currentLesson(S, D).n, again: weekAgain(S, t).slice(0, 12)};
  save(); show("home");
});

// ----- listen: the current lesson in a row, started and stopped by hand -----
let LS = {on: false, i: 0, slow: false, echo: true, timer: 0, list: []};
function listenList() {
  const L = currentLesson(S, D);
  let ids = L.ids.filter(id => S.cards[id] && S.cards[id].box);
  if (!ids.length) { const prev = D.lessons[D.lessons.indexOf(L) - 1]; if (prev) ids = prev.ids.filter(id => S.cards[id]); }
  return ids;
}
function renderListen() {
  LS.list = listenList(); if (LS.i >= LS.list.length) LS.i = 0;
  const id = LS.list[LS.i], item = id && D.sent[id];
  $("listen").innerHTML = '<div class="top"><button class="icon" data-act="go" data-to="home" aria-label="Back">' + ICON.back + "</button></div>" +
    '<header><h1>Listen</h1><div class="sub">' + LS.list.length + " sentences you have met in this lesson. Each one plays, then a pause to say it" + (LS.echo ? ", then once more." : ".") + "</div></header>" +
    '<div class="card">' + (item ? '<div class="kicker">' + (LS.i + 1) + " of " + LS.list.length + '</div><div class="vi">' + viHtml(item.vi) + '</div><div class="markinfo"></div><div class="meaning">' + esc(item.en) + "</div>" : "<p>Nothing to play yet.</p>") + "</div>" +
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
      const it = D.sent[id], c = S.cards[id], st = it.kind === "d" ? (c.ret ? "done" : "drill") : c.box >= SURE_BOX ? "sure" : c.box ? "learning" : "new";
      h += '<div class="row" data-row="' + id + '">' + playBtn(id) + '<div class="rt"><div class="vi s">' + viHtml(it.vi) + '</div><div class="meaning s">' + esc(it.en) + '</div>' +
        (libOpen === id ? '<div class="markinfo"></div><div class="zh s">' + esc(it.zh) + '</div><div class="notes">' + noteHtml(it) + "</div>" : "") + '</div><span class="tag ' + st + '">' + st + "</span></div>";
    }
  }
  $("liblist").innerHTML = h || '<p class="muted">Nothing found.</p>';
}
document.addEventListener("input", e => { if (e.target.id === "q") { libQuery = e.target.value; renderLibList(); } });
document.addEventListener("click", e => {
  if (cur !== "library" || e.target.closest("[data-act]") || e.target.closest(".vm")) return;
  const r = e.target.closest("[data-row]"); if (!r) return;
  libOpen = libOpen === r.dataset.row ? null : r.dataset.row; renderLibList();
});

// ----- lessons and their introduction pages -----
function renderLessons() {
  $("lessons").innerHTML = '<div class="top"><button class="icon" data-act="go" data-to="home" aria-label="Back">' + ICON.back + "</button></div><header><h1>Lessons</h1></header>" +
    D.lessons.map(L => { const met = L.ids.filter(id => S.cards[id]).length;
      return '<button class="btn tile wide" data-act="lesson" data-key="' + L.key + '">Lesson ' + L.n + ": " + esc(L.title) + "<small>" + met + " of " + L.ids.length + " met, " + L.pages.length + " pages</small></button>"; }).join("");
}
function renderPage(arg) {
  const L = D.lessons.find(x => x.key === arg.key), i = arg.i, P = L.pages[i], last = i === L.pages.length - 1, unread = !(S.introRead || {})[L.key];
  $("page").innerHTML = '<div class="top"><button class="icon" data-act="go" data-to="' + (unread ? "home" : "lessons") + '" aria-label="Back">' + ICON.back + '</button><span class="count">' + (i + 1) + "/" + L.pages.length + "</span></div>" +
    '<div class="panel page"><div class="kicker">Lesson ' + L.n + "</div><h2>" + esc(P.t) + "</h2>" + P.h + '<div class="markinfo"></div></div>' +
    '<div class="rate">' + (i ? '<button class="btn" data-act="pg" data-k="' + L.key + '" data-i="' + (i - 1) + '">Back</button>' : "<span></span>") +
    (last ? (unread ? '<button class="btn ok" data-act="pgdone" data-k="' + L.key + '">Start learning</button>' : '<button class="btn" data-act="go" data-to="lessons">Done</button>')
      : '<button class="btn ok" data-act="pg" data-k="' + L.key + '" data-i="' + (i + 1) + '">Next</button>') + "</div>";
  // play buttons inside the text, as written in the lesson file with @@play
  document.querySelectorAll("#page .pl").forEach(b => { const id = b.dataset.id; b.outerHTML = playBtn(id, viHtml(D.sent[id] ? D.sent[id].vi : id)); });
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  if (b.dataset.act === "pg") show("page", {key: b.dataset.k, i: +b.dataset.i});
  if (b.dataset.act === "pgdone") { S.introRead = S.introRead || {}; S.introRead[b.dataset.k] = true; save(); show("home"); }
});

// ================= start =================
function boot() {
  const go = () => {
    if (!Object.keys(S.cards).length) { migrateLesson1(S, D, today()); save(); }
    show("home");
  };
  if (SYNC_URL) cloudSync(() => { go(); cloudSave(); });
  else go();
  checkVersion();
}
boot();
