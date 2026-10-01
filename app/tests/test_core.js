// Tests for app/core.js. Run by app/build.py (which writes tests/data.json first), or: node app/tests/test_core.js
const assert = require("assert");
const path = require("path");
const C = require("../core.js");
const D = require(path.join(__dirname, "data.json"));

let n = 0;
function t(name, f) { try { f(); n++; } catch (e) { console.error("FAIL " + name + ": " + e.message); process.exitCode = 1; } }
const MON = 20731;   // Monday 2026-10-05
assert.strictEqual(C.dow(MON), 0, "MON must be a Monday");
const ids = D.lessons[0].ids;
function migrated(T) { const S = C.freshState(); C.migrateLesson1(S, D, T); return S; }
function fakeLesson(nNew) {   // lesson 2 with nNew sentences, borrowing lesson-1 sentence data
  const sent = Object.assign({}, D.sent), L2 = {key: "l02", n: 2, title: "x", ids: [], pages: [{t: "p", h: ""}], tandem: ""};
  for (let i = 0; i < nNew; i++) { const id = "x" + i; sent[id] = {vi: "Anh khỏe.", en: "e", zh: "z", kind: "s"}; L2.ids.push(id); }
  return {sent, lessons: [D.lessons[0], L2]};
}

// ---- days ----
t("every day counts, weekends too", () => { assert.strictEqual(C.practiceDay(MON + 5), MON + 5); assert.strictEqual(C.addPractice(MON + 4, 1), MON + 5); assert.strictEqual(C.practiceBetween(MON, MON + 7), 7); });
t("minutes a day: 10 by default, changeable", () => { const S = C.freshState(); assert.strictEqual(C.budgetMs(S), 600000); S.cfg = {min: 20}; assert.strictEqual(C.budgetMs(S), 1200000); });

// ---- data ----
t("lesson 1 has 121 items, drills and sentences", () => {
  assert.strictEqual(ids.length, 121);
  const d = ids.filter(i => D.sent[i].kind === "d").length;
  assert.ok(d > 50 && d < 80, "drills: " + d);
  assert.strictEqual(D.sent.s0088.kind, "s", "numbers are a sentence");
  assert.strictEqual(D.sent.s0001.kind, "s");
});
t("every lesson has pages and a tandem task", () => { for (const L of D.lessons) { assert.ok(L.pages.length); assert.ok(L.tandem.length > 20); } });

// ---- migration ----
t("lesson 1 migrates as met, spread over five days", () => {
  const S = migrated(MON);
  assert.strictEqual(Object.keys(S.cards).length, 121);
  assert.ok(S.introRead.l01);
  const dues = new Set(Object.values(S.cards).map(c => c.due));
  assert.deepStrictEqual([...dues].sort(), [MON, MON + 1, MON + 2, MON + 3, MON + 4]);
  assert.ok(Object.values(S.cards).every(c => c.box === 1));
  assert.strictEqual(S.cards.s0001.due, MON);
  assert.strictEqual(S.cards.s0097.due, MON + 4, "persona sentences were day 5");
});

// ---- rounds ----
t("round stays within its minutes and puts reviews first", () => {
  const S = migrated(MON); for (const id of ids) S.cards[id].due = MON;
  let R = C.buildRound(S, D, MON);
  assert.ok(R.est <= C.budgetMs(S) && R.backlog > 0, "62 sentences do not fit into 10 minutes");
  S.cfg = {min: 30}; R = C.buildRound(S, D, MON);
  assert.strictEqual(R.items.length, 62, "all 62 sentences of lesson 1 fit into 30 minutes");
  const DD = fakeLesson(200), S2 = migrated(MON); S2.introRead.l02 = true;
  for (let i = 0; i < 150; i++) { const c = S2.cards["x" + i] = C.newCard(MON - 10); c.box = 2; c.due = MON; }
  for (const id of ids) S2.cards[id].due = MON;
  const R2 = C.buildRound(S2, DD, MON);
  assert.ok(R2.est <= C.budgetMs(S2) && R2.backlog > 0, "212 due cards do not fit");
  assert.ok(R2.items.every(x => x.m !== "new"), "no new cards while reviews wait");
});
t("new sentences: as many as fit, at most six, only after the intro is read", () => {
  const DD = fakeLesson(30), S = migrated(MON); S.cfg = {min: 30};
  for (const id of ids) { S.cards[id].due = MON + 100; S.cards[id].box = 5; }
  let R = C.buildRound(S, DD, MON);
  assert.strictEqual(R.items.length, 0, "lesson 2 intro not read yet");
  S.introRead.l02 = true;
  R = C.buildRound(S, DD, MON);
  assert.strictEqual(R.items.filter(x => x.m === "new").length, C.NEW_MAX);
  assert.deepStrictEqual(R.items.map(x => x.id), ["x0", "x1", "x2", "x3", "x4", "x5"], "in lesson order");
  S.cfg = {min: 10}; R = C.buildRound(S, DD, MON);
  assert.strictEqual(R.items.length, 3, "10 minutes: new sentences take at most 4 minutes");
});
t("modes: drill, echo, recall from box 3", () => {
  assert.strictEqual(C.modeOf({kind: "d"}, {box: 5}), "drill");
  assert.strictEqual(C.modeOf({kind: "s"}, {box: 2}), "echo");
  assert.strictEqual(C.modeOf({kind: "s"}, {box: 3}), "recall");
  assert.strictEqual(C.modeOf({kind: "s"}, {box: 0}), "new");
  assert.strictEqual(C.modeOf({kind: "s"}, undefined), "new");
});

// ---- answers ----
t("Got it moves a card up, learning phase 1, 2, 4 days", () => {
  const S = migrated(MON), c = S.cards.s0001;
  let R = {items: [{id: "s0001", m: "echo"}], pos: 0, ms: 0};
  C.answer(S, D, R, "ok", MON, 20000);
  assert.strictEqual(c.box, 2); assert.strictEqual(c.due, MON + 2);
  R = {items: [{id: "s0001", m: "echo"}], pos: 0, ms: 0};
  C.answer(S, D, R, "ok", MON + 2, 20000);
  assert.strictEqual(c.box, 3); assert.strictEqual(c.due, MON + 6);
});
t("Again requeues four cards later and the retry is listen and repeat", () => {
  const S = migrated(MON); S.cards.s0003.box = 3;
  const R = {items: ["s0001", "s0002", "s0003", "s0004", "s0005", "s0006", "s0007", "s0008"].map(id => ({id, m: "echo"})), pos: 2, ms: 0};
  R.items[2].m = "recall";
  C.answer(S, D, R, "again", MON, 30000);
  assert.strictEqual(R.items[7].id, "s0003"); assert.ok(R.items[7].retry); assert.strictEqual(R.items[7].m, "echo");
  assert.strictEqual(S.cards.s0003.box, 1); assert.strictEqual(S.cards.s0003.due, MON + 1);
  assert.deepStrictEqual(S.days[MON].ag, ["s0003"]);
});
t("a retry that works does not promote", () => {
  const S = migrated(MON); S.cards.s0003.box = 2;
  const R = {items: [{id: "s0003", m: "echo"}], pos: 0, ms: 0};
  C.answer(S, D, R, "again", MON, 1000);
  C.answer(S, D, R, "ok", MON, 1000);
  assert.strictEqual(S.cards.s0003.box, 1); assert.ok(C.roundDone(R));
});
t("a forgotten sure card falls back two boxes", () => {
  const S = migrated(MON), c = S.cards.s0001; c.box = 6; c.iv = 20;
  C.answer(S, D, {items: [{id: "s0001", m: "recall"}], pos: 0, ms: 0}, "again", MON, 1000);
  assert.strictEqual(c.box, 4);
});
t("problem cards stay close", () => {
  const S = migrated(MON), c = S.cards.s0001; c.box = 3; c.miss = 6; c.ok = 0;
  C.answer(S, D, {items: [{id: "s0001", m: "recall"}], pos: 0, ms: 0}, "ok", MON, 1000);
  assert.ok(c.iv <= 2, "leech interval " + c.iv);
});
t("sound drills are never in a round, never new, never keep a lesson open", () => {
  const S = migrated(MON); for (const id of ids) S.cards[id].due = MON;
  assert.ok(!C.buildRound(S, D, MON).items.some(x => D.sent[x.id].kind === "d"));
  const T = C.freshState(); T.introRead.l01 = true;
  for (const id of ids) if (D.sent[id].kind === "s") T.cards[id] = C.newCard(MON + 100);
  assert.deepStrictEqual(C.nextNew(T, D), [], "only drills left: nothing new");
  assert.strictEqual(C.practised(D, D.lessons[0]).length, 62);
});
t("a new card that was interrupted comes back", () => {
  const DD = fakeLesson(3), S = migrated(MON); S.introRead.l02 = true;
  for (const id of ids) S.cards[id].due = MON + 100;
  const R = C.buildRound(S, DD, MON);
  C.answer(S, DD, R, "again", MON, 1000);   // x0 met but not finished
  const R2 = C.buildRound(S, DD, MON + 1);
  assert.ok(R2.items.some(x => x.id === "x0" && x.m === "new"));
});

// ---- the load over months (why the round is limited by time, and new sentences by a share of it) ----
for (const min of [10, 30]) t("simulated load at " + min + " minutes", () => {
  const DD = fakeLesson(3000), S = migrated(MON); S.introRead.l02 = true; S.cfg = {min};
  let rnd = 1; const rand = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
  const mins = [];
  for (let d = MON; d < MON + 7 * 30; d++) {
    const R = C.buildRound(S, DD, d);
    while (!C.roundDone(R)) { const it = R.items[R.pos]; C.answer(S, DD, R, rand() < (it.m === "new" ? 0.8 : 0.88) ? "ok" : "again", d, C.EST0[it.m]); }
    mins.push(R.ms / 60000);
  }
  const last = mins.slice(-56), avg = last.reduce((a, b) => a + b, 0) / last.length, mx = Math.max(...mins);
  const met = DD.lessons[1].ids.filter(id => S.cards[id]).length;
  console.log("  simulation " + min + " min, 30 weeks: last 8 weeks " + avg.toFixed(1) + " min a day, max " + mx.toFixed(0) + ", " + (met / 30).toFixed(0) + " new sentences a week");
  assert.ok(avg <= min * 1.2, "average " + avg);
  assert.ok(met / 30 >= min * 1.2, "too few new sentences: " + met);
});

// ---- sync ----
t("sync: more cards win, then the newer state", () => {
  const a = migrated(MON), b = migrated(MON);
  a.ts = 5; b.ts = 9;
  assert.ok(C.cloudWins(a, b, D)); assert.ok(!C.cloudWins(b, a, D));
  const small = C.freshState(); small.ts = 99;
  assert.ok(!C.cloudWins(a, small, D), "an empty newer device never replaces a full one");
  assert.ok(!C.mayUpload(small, a, D));
  assert.ok(C.mayUpload(a, null, D));
});
t("sync: a reset wins everywhere", () => { const a = migrated(MON), r = C.freshState(); r.resetAt = 7; r.cards = {}; assert.ok(C.cloudWins(a, r, D)); });
t("fixState fills what Firebase drops", () => {
  const S = C.fixState({cards: {s0001: {box: 1}}, days: {"20731": {n: 3}}, round: {day: 1, pos: 0}});
  assert.deepStrictEqual(S.days["20731"].ag, []); assert.deepStrictEqual(S.round.items, []); assert.deepStrictEqual(S.checkins, {});
});

// ---- voice marks ----
t("voice marks", () => {
  assert.deepStrictEqual(C.voiceMarks("rồi"), ["r"]);
  assert.deepStrictEqual(C.voiceMarks("Trời"), ["tr"]);
  assert.deepStrictEqual(C.voiceMarks("chà,"), []);
  assert.deepStrictEqual(C.voiceMarks("sinh"), ["s", "pal"]);
  assert.deepStrictEqual(C.voiceMarks("xinh"), ["pal"]);
  assert.deepStrictEqual(C.voiceMarks("bệnh"), ["pal"]);
  assert.deepStrictEqual(C.voiceMarks("anh"), []);
  assert.deepStrictEqual(C.voiceMarks("sách"), ["s"]);
  assert.deepStrictEqual(C.voiceMarks("đi"), []);
});
t("fold", () => { assert.strictEqual(C.fold("Đức"), "duc"); assert.strictEqual(C.fold("người"), "nguoi"); });

console.log((process.exitCode ? "TESTS FAILED" : "all " + n + " tests passed"));
