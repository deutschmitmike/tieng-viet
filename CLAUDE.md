# Tiếng Việt Sài Gòn: project rules

Mike's own Southern Vietnamese self-study course. Target: B1 by about July 2027, able to hold a
30 minute casual conversation with a Saigon tandem partner. Since 1 October 2026 the course runs as an app
(the site root, deutschmitmike.github.io/tieng-viet): 30 minutes Monday to Friday, whole sentences, lots of
listening and repeating, spaced repetition instead of a day plan. No tutor for now (Mike finds a native
speaker himself, maybe in a year; do not raise it).

Read `plan.md` first (syllabus, audio, fixed decisions), then `WEEKLY.md` (how a lesson is built) and
`app/README.md` (how the app works). This file only summarises what must never be got wrong.

## Hard rules

- The ElevenLabs API key lives in `scripts/.env` and must never be committed. It is in `.gitignore`
  together with `*.env`. Check `git status` before any push. Never `git add -f` it. If it ever lands in a
  commit, say so immediately: the key has to be replaced at ElevenLabs.
- Saigon only, in every sentence and every note. Never a Northern production form; the Northern
  equivalent may be named once in `pron_note` for recognition.
- The production target is careful Saigon, not fast Saigon: qu keeps its k (quá, not wá), v stays v,
  s and x stay apart, tr and ch stay apart, r stays retroflex. Care is not the same as dialect, and the
  Southern system itself never changes: d and gi are y and never z, five tones with hỏi = ngã, and the
  Southern finals stay. Note that the palatal finals are not a full merger: -nh becomes -n but the vowel
  keeps the trace (anh = ăn, tinh = tưn), so tin and tinh are still two words. `pron_note` gives what you say, then what you hear in Saigon, then what Hanoi does.
- No em dashes anywhere, in any language. Chinese is Taiwan-register 繁體 with the Chinese comma ，
  and 你, never 您 and never simplified characters.
- Do not edit `voices.json`. Voice and stability 1.0 were decided on 18 Sep 2026 after a blind test.
- Leave the `tts` column in `sentences.csv` empty. The Saigon respelling runs automatically in
  `scripts/common.py`, function `saigon_respell`: at the start of a syllable d becomes y and gi becomes y,
  while đ and gh are never touched. The app always shows the correct spelling; only the voice sees the
  respelling. Use the column only as a hand override for a single sentence.
- Four sounds are beyond the voice, established by testing on 19 Sep 2026 across four models and four
  voices, and by respelling attempts. Do not hunt them again. The app dots every syllable with one of them
  automatically (`voiceMarks` in `app/core.js`) and explains it on tap; lesson 1 has a page on them:
  r comes out as z (Mike says the Mandarin 日); tr and ch merge; s and x merge; and the vowel trace of the
  palatal finals is missing, so chín and chính sound the same (Mike pulls the vowel toward ư, and toward ơ
  after ê). Respelling works only where the alphabet has a letter with the target value, which is why d and
  gi become y and nothing else does: ư and ơ were tried for the vowel trace and did not take.
- Sentence mp3s are generated once and reused. Regenerate with
  `python3 scripts/generate_audio.py --force --ids s0123`, never by deleting files.
- Ids never change and are never reused: the app stores Mike's progress per sentence id. Changing the text
  of a sentence keeps its id (and its progress); a sentence that is wrong beyond repair stays in the csv and
  is taken out of its lesson's `ids:` line.

## The app (details in app/README.md)

- Sources: `app/core.js` (learning logic, tested), `app/ui.js` (screens), `app/shell.html` (page and style),
  `sentences.csv`, `lessons/lNN.md`. `python3 app/build.py` checks, tests and writes `index.html` and
  `version.json`. Count `BUILD` up (YYYY-MM-DD-N) before every deploy and tell Mike the new number; he sees
  it at the bottom right.
- Mike's progress is in Firebase at `save/__tieng_viet/mike` (same database as the kids' apps in
  ~/Documents/quizzes, whose rules allow only `lb/` and `save/`). Never change that path. The app syncs only
  on deutschmitmike.github.io; any local preview is automatically test mode. Never write test data there.
  `python3 app/pull_checkin.py` reads it (read only) and writes the Friday check-ins into `checkin.md`.
- Mike's decisions (30 Sep and 1 Oct 2026): sound only on a button press, never autoplay; no record button;
  English interface; phone first; 30 minutes, five days; at most six new sentences a day; rating with two
  buttons, Again and Got it, which wake after two plays; from box 3 a sentence is said from its meaning;
  sound drills only listened to and repeated, they run out at box 4; Friday check-in in the app; typing
  (Telex) comes with lesson 2, slowly, only for sure sentences, as its own track that never pushes a
  speaking card back.
- The old week booklets (`scripts/render_*`, `build_day.py`, `schedule.csv`, `weeks/`) are out of the
  routine. Do not run them. `weeks/w01/index.html` stays online as an archive for now.

## GitHub

Public repo at github.com/deutschmitmike/tieng-viet, published at deutschmitmike.github.io/tieng-viet from the
root of the main branch. The repo is public, which is why the key, `checkin.md` with its raw tandem messages,
and the test recordings stay out of it. Check `git status` before every push. Commit sources, the
per-sentence mp3s, `index.html` and `version.json`.

## Where things stand

- Lesson 1 (s0001 to s0121, the sound system) was studied from the booklet from 21 September 2026 and moved
  into the app on 1 October 2026 as already met. Next is lesson 2, as soon as Mike's check-in is in.
- To build a lesson, follow WEEKLY.md. Lessons are built on request, never by a scheduled task: the
  sentences are the course and they are not written unsupervised.
- Work from a Claude Code session started in `~/Documents/tieng-viet`, so that this file is loaded.
  If something is not written down in plan.md, WEEKLY.md, app/README.md or here, ask Mike rather than guess.
