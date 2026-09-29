# Tiếng Việt Sài Gòn: project rules

Mike's own Southern Vietnamese self-study course. Target: B1 by 1 July 2027, able to hold a
30 minute casual conversation with a Saigon tandem partner. One hour Monday to Friday, all active:
shadowing, echoing, mimicking. No apps, no flashcards, no tutor.

Read `plan.md` first. It holds the 41 week syllabus, the daily hour, how the audio is made, and the
output format. `README.md` holds the folder mechanics and the repo rules. Both are authoritative;
this file only summarises what must never be got wrong.

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
  while đ and gh are never touched. The booklet always shows the correct spelling; only the voice sees the
  respelling. Use the column only as a hand override for a single sentence.
- Four sounds are beyond the voice, established by testing on 19 Sep 2026 across four models and four
  voices, and by respelling attempts. Do not hunt them again; mark them. Every sentence that contains one
  carries the standing warning in `pron_note`, the way s0049, s0051, s0054 and s0078 do, and the week's
  brief repeats the four in one block:
  r comes out as z (Mike says the Mandarin 日); tr and ch merge; s and x merge; and the vowel trace of the
  palatal finals is missing, so chín and chính sound the same (Mike pulls the vowel toward ư, and toward ơ
  after ê). Respelling works only where the alphabet has a letter with the target value, which is why d and
  gi become y and nothing else does: ư and ơ were tried for the vowel trace and did not take.
- HTML is the only booklet format. Do not run `scripts/render_week_docx.js`.
- Sentence mp3s are generated once and reused. Regenerate with
  `python3 scripts/generate_audio.py --force --ids s0123`, never by deleting files.

## Build a week

From the folder root, with N as the week number:

```
python3 scripts/render_day.py --week N
python3 scripts/generate_audio.py --week N
python3 scripts/build_day.py --week N
python3 scripts/render_week_html.py --week N            # wNN.html, audio baked in, for the Mac
python3 scripts/render_week_html.py --week N --pages    # weeks/wNN/index.html, the web version
python3 scripts/render_index.py                         # the front page listing the weeks
```

Weeks are built here, in this folder, from a Claude Code session started in `~/Documents/tieng-viet` so
that this file is loaded. Building a week means writing the new sentences into `sentences.csv`, the
recycling rows into `schedule.csv`, then `brief.md` and `notes/d1.md` to `d5.md`, then the commands above,
then the commit and the push. Decided 26 Sep 2026: no scheduled task, the week is built on request. The
sentences are the course and they are not written unsupervised. Run
`python3 scripts/generate_audio.py --week N --dry-run` before the real run, so the number of new files is
seen before credits are spent.

## GitHub

Public repo at github.com/deutschmitmike/tieng-viet, published at deutschmitmike.github.io/tieng-viet.
GitHub Pages is served from the root of the main branch, so the front page is the site root and a week is
at `/weeks/w01/`. The repo is public, which is why the key, `checkin.md` with its raw tandem messages, and
the test recordings all stay out of it. Check `git status` before every push. Commit sources, the per-sentence mp3s and the `index.html` booklets. The cut
daily tracks, the self-contained `wNN.html` and the day markdown files stay out; they are rebuilt in one
command and would run into gigabytes over 41 weeks.

## Where things stand

- Built so far: week 1 (s0001 to s0121), studied from Monday 21 September 2026. Next is week 2, as soon as
  Mike's week 1 check-in is in checkin.md.
- To build a week, follow WEEKLY.md. That file replaces the Cowork scheduled task that used to do it.
- Here in Claude Code git works normally: commit and push after every change that should reach the site.
- The course was designed and set up in a long Cowork session in September 2026. Everything decided there is
  in plan.md, README.md, this file and WEEKLY.md. If something is not written down in one of them, ask Mike
  rather than guess.
