# The app

One page, `index.html` at the site root, built by `python3 app/build.py` from:

- `app/core.js`: the learning logic, no DOM. Tested by `app/tests/test_core.js` (run by build.py).
- `app/ui.js`: screens, audio, storage, sync.
- `app/shell.html`: page, style, the placeholders build.py fills.
- `sentences.csv` and `lessons/lNN.md`: the content.

build.py writes `index.html`, `version.json` and `app/tests/data.json` (test input, not committed). It writes
nothing if a check or a test fails.

## How a day works

- A round is built when Mike starts it: first everything due (oldest first), as long as the estimated time
  stays within Mike's minutes (`S.cfg.min`, 10, 15, 20 or 30, set on the home screen, 15 by default), then as many
  new sentences from the current lesson as fit into what is left, at most 40 % of the day's minutes and at most six, but only if nothing due was
  left out and the lesson's introduction has been read. Leftover due cards wait for the next day.
- The time per card is measured (moving average per card type), so the estimate fits Mike's real pace.
- Card types: `new` (text, meaning and notes visible), `echo` (listen and repeat), `recall` (from box 3:
  meaning only, say it, then Check reveals and plays). Sound drills (`drills:` in lesson 1, kind `d`) are
  never practised since 1 Oct 2026; they stay as reference in the sentence list and on the lesson pages.
- Three ratings: Again, Got it, Easy (Easy added 2 Oct 2026, for sentences so easy that reviewing them wastes time: a new card skips a step and comes back in 2 days, a learning card jumps two boxes, a sure card goes 30 % further and its ease rises by 0.15 up to 3.0; on a retry or a problem card Easy counts as Got it; keys 1, 2, 3 on the Mac). Free practice keeps two buttons.
- Undo (Mike, 2 Oct 2026): a link in the top bar of the card and of the tandem step takes back the last rating exactly (`undoPoint` / `applyUndo` snapshot card, round, day log and averages); one step, gone when a new round starts or the cloud replaces the state. Free practice has its own undo. No delay or lockout on the buttons (Mike: not wanted).
- Nothing plays by itself. Again, Got it and Easy are always active (Mike, 1 Oct 2026: no play needed to go on); on a recall card they appear after Check, which reveals and plays.
- Again: the card comes back four cards later as listen and repeat, at most twice per round; the retry does not count as a review. The time estimate per card includes the expected retries (the running share of Again, `S.ar`). Cards still being learned (box 1 and 2) come first, then the oldest due. A problem card (5 open misses) stays in box 2 until it sits three times in a row.
- After the last card the tandem task of the lesson; the day counts as done when it is ticked (Done or Not
  today). There is no check-in (Mike, 1 Oct 2026); the app's own data is the feedback.
- Free practice (home tile "Practise"): any lesson, its met sentences shuffled. Got it changes nothing; Again makes
  the card due tomorrow at the latest (`practiceAgain`). It does not count as a round, a day or minutes.
- Every day is a practice day (Mike, 1 Oct 2026). Intervals are in days.

## Scheduling (ported from ~/Documents/quizzes/src/engine.js)

Boxes 1 to 9, intervals 1, 2, 4 days in the learning phase, then interval times ease (2.5 at the
start, minus 0.2 per lapse). A forgotten card in box 4 or higher falls back
two boxes, otherwise to box 1. Problem cards (5 open misses, fewer than 3 successes in a row) stay within
2 days. "Sure" = box 4 or higher.

The simulation in the tests (30 weeks, every day, 88 % Got it): at 10 minutes about 11 minutes a day and 14 new
sentences a week; at 30 minutes about 33 minutes and 41 a week.

## Storage and sync

- localStorage key `tv_mike_v1`, Firebase `save/__tieng_viet/mike` (database of the kids' apps). Never change
  either: Mike's progress is stored under them.
- Sync (builds 2026-10-01-6 and -7, after two code reviews): `S.ts` changes only with a real change (`save()`) and
  always lands above the last synced ts, whatever the device clocks say. Each device stores the cloud ts it last
  synced with (`tv_mike_v1_synced`). Cloud ts different from that: the cloud changed. Only the cloud changed: adopt
  (but a state from an older build is merged, never adopted). Only this device changed: upload. Both: `mergeStates`
  card by card (the card answered more often wins, then the later one; day logs field by field), then upload.
- Every write is conditional: GET with `X-Firebase-ETag: true`, PUT with `if-match`. If another device wrote in
  between, Firebase answers 412, nothing is lost (it is all in localStorage) and the next sync reads and merges.
  A device never writes without a fresh ETag. Leaving the page uploads at once (keepalive only under 60 KB).
- A card counts once a day (`c.rv` = day of its last rating): rounds built separately on two devices cannot promote
  a card twice. A device with no local state starts only after the cloud has answered.
- `app/tests/sync_test.js` runs the built page on two simulated devices against a fake Firebase with ETags (hide
  upload of a stale tab, out-of-order writes, clock skew, separate rounds on one day). build.py runs it.
- Firebase drops empty objects and arrays; `fixState` fills them in again.
- The app only syncs on deutschmitmike.github.io. Anywhere else, and with `?local`, it is test mode with its
  own localStorage key and no cloud.
- Daily backup: `~/Desktop/claude cowork/backups/backup.js` saves all of `save/`, this state included.
  The state has no `playerName`, so the kids' weekly report skips it.

## Word by word (gloss.json)

`D.sent[id].g` = units `[vi, zh, hv?]`, `.x` = explanation, from gloss.json via build.py (sound drills get units
from their own vi/zh lists). `glossHtml` / `sentenceHtml` in ui.js render them on cards, lesson pages, the tandem
step, the sentence list (opened row), Listen and free practice; on recall cards only after Check. build.py adds a
"Words in this lesson" page per lesson from words.csv, with Hán Việt taken from gloss.json.

## Voice marks

`voiceMarks` in core.js dots r, tr, s at the start of a syllable and -nh/-ch after i and ê, the four sounds
the voice gets wrong (CLAUDE.md). Tapping a dotted syllable shows what Mike says instead.

## Typing (planned for lesson 2)

Telex typing as its own track: a typing card only for sentences that are sure (box 4+), at most three a round
at first, graded by the app (exact spelling, Unicode NFC, case and punctuation ignored), the wrong syllable
marked, and a note where Saigon pronunciation hides the spelling (hỏi/ngã, d/gi, final t/c, n/ng). A typing
mistake never moves the speaking card. Its own box per sentence.
Notes from the review of 1 Oct 2026 for whoever builds it: compare after normalising tone-mark placement too (Telex
can produce khoẻ, sentences.csv writes khỏe), not only NFC; the typing box needs its own field per card (e.g.
`c.tb`, `c.tdue`) and must be added to `mergeStates` (card merge by count) and `fixState`; since lesson 1 cards
start in box 1, the first typing cards appear about a week after the track is switched on.
