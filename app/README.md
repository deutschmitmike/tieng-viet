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
  stays within 30 minutes, then up to six new sentences from the current lesson, but only if nothing due was
  left out and the lesson's introduction has been read. Leftover due cards wait for the next day.
- The time per card is measured (moving average per card type), so the estimate fits Mike's real pace.
- Card types: `new` (text, meaning and notes visible), `echo` (listen and repeat), `recall` (from box 3:
  meaning only, say it, then Check reveals and plays), `drill` (sound drills, only ever listen and repeat).
- Nothing plays by itself. Again and Got it are always active (Mike, 1 Oct 2026: no play needed to go on); on a recall card they appear after Check, which reveals and plays.
- Again: the card comes back four cards later as listen and repeat; the retry does not count as a review.
- After the last card the tandem task of the lesson; the day counts as done when it is ticked (Done or Not
  today). On Fridays (and at the weekend) the check-in follows if it is not filled in yet.
- Saturday and Sunday count as Friday: an open Friday round can be finished, nothing new becomes due.

## Scheduling (ported from ~/Documents/quizzes/src/engine.js)

Boxes 1 to 9, intervals 1, 2, 4 practice days in the learning phase, then interval times ease (2.5 at the
start, minus 0.2 per lapse). Practice days are Monday to Friday. A forgotten card in box 4 or higher falls back
two boxes, otherwise to box 1. Problem cards (5 open misses, fewer than 3 successes in a row) stay within
2 days. Sound drills retire at box 4. "Sure" = box 4 or higher.

The simulation in the tests (30 weeks, 88 % Got it) gives about 32 minutes a day and about 29 new
sentences a week. That is why lessons have about 30 sentences.

## Storage and sync

- localStorage key `tv_mike_v1`, Firebase `save/__tieng_viet/mike` (database of the kids' apps). Never change
  either: Mike's progress is stored under them.
- Rules as in the kids' app: a state with fewer cards never replaces one with more; same number, the newer
  wins; `resetAt` (not used yet) would win everywhere. Leaving the page uploads at once.
- Firebase drops empty objects and arrays; `fixState` fills them in again.
- The app only syncs on deutschmitmike.github.io. Anywhere else, and with `?local`, it is test mode with its
  own localStorage key and no cloud.
- Daily backup: `~/Desktop/claude cowork/backups/backup.js` saves all of `save/`, this state included.
  The state has no `playerName`, so the kids' weekly report skips it.

## Voice marks

`voiceMarks` in core.js dots r, tr, s at the start of a syllable and -nh/-ch after i and ê, the four sounds
the voice gets wrong (CLAUDE.md). Tapping a dotted syllable shows what Mike says instead.

## Typing (planned for lesson 2)

Telex typing as its own track: a typing card only for sentences that are sure (box 4+), at most three a round
at first, graded by the app (exact spelling, Unicode NFC, case and punctuation ignored), the wrong syllable
marked, and a note where Saigon pronunciation hides the spelling (hỏi/ngã, d/gi, final t/c, n/ng). A typing
mistake never moves the speaking card. Its own box per sentence.
