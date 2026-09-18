# tieng-viet: how the folder works

Everything you study comes out of two files: `sentences.csv` (every sentence ever written, one per row) and `schedule.csv` (which sentence is played on which day, and whether it is new or recycled). The scripts turn those into audio and readable day files. Never edit `weeks/wNN/dD.md` by hand; edit the CSV or the notes file and rerun `render_day.py`.

## Layout

```
plan.md                  master plan, 41 weeks
checkin.md               your Friday two lines; the next week's generation reads it
sentences.csv            id|vi|tts|pron_note|hanzi|en|zh|tags
schedule.csv             week|day|pos|id|new
voices.json              ElevenLabs voice IDs and settings
audio/sentences/         one mp3 per sentence id, generated once, reused forever
scripts/                 generate_audio.py, build_day.py, render_day.py, common.py, .env
weeks/w01/
  brief.md               what this week is about, the tandem tasks, the checklist
  notes/d1.md ... d5.md  hand-written notes per day (input for render_day.py)
  w01.html               generated: the week booklet with built-in players. Double-click, it opens in the browser. Open this one.
  w01.docx               generated: the same booklet as Word file (links to the audio files; needs Word, not Google Docs)
  d1.md ... d5.md        generated: same content as plain text, one file per day
  d1_gloss.md ...        generated: English and Chinese only, for the echo-from-gloss block
  audio/                 w01_d1_listen.mp3, w01_d1_echo.mp3, ...
```

## One-time setup

1. `ffmpeg` must be installed (`brew install ffmpeg`). Python 3 from macOS is enough, no packages needed.
2. Copy `scripts/.env.example` to `scripts/.env` and put your ElevenLabs key in it. The file is already there if Claude created it for you.
3. `cd scripts && npm install` for the booklet renderer (Node is required; you have it for the reel tooling).

## Every week, four commands

From inside the folder (`cd ~/Documents/tieng-viet`):

```
python3 scripts/generate_audio.py --week 1
python3 scripts/build_day.py --week 1
node scripts/render_week_docx.js --week 1
python3 scripts/render_week_html.py --week 1
```

The first one generates the missing per-sentence files (recycled sentences are skipped, so later weeks are cheaper). The second one assembles the ten daily tracks. The third one writes the week booklet `weeks/w01/w01.docx`; it needs the npm package `docx`, installed once with `cd scripts && npm install`. The weekly scheduled task runs all three for you; the commands are here for when you change something by hand. Add `--day 3` to either command to do a single day. `--dry-run` on `generate_audio.py` lists what would be generated without spending credits.

If you change a sentence's text or `tts` column, delete its mp3 in `audio/sentences/` (or run with `--force --ids s0042`) and rebuild the day.

## The `tts` column

Normally empty. If the voice mispronounces a word, write in `tts` the spelling that makes the voice say it right; the readable files still show the correct `vi`. Example: a Northern-leaning voice reads `dạ` as "zạ"; putting `yạ` in `tts` usually fixes it. Test on a few sentences before doing it at scale.

## Voices

`voices.json` holds the primary voice. Add a second voice under `alternate` and it will be used on even weeks. `copy_tracks_to` copies the finished daily tracks to another folder (for example inside My Drive) so they reach your phone; the hundreds of per-sentence files stay local.

## The repo and the published version

This folder is also the repository. Two rules keep it safe and small.

The key never goes in. `scripts/.env` holds the ElevenLabs API key and is listed in `.gitignore`,
together with `*.env`. If it ever lands in a commit, the key has to be replaced at ElevenLabs,
so check `git status` before the first push and never use `git add -f` on it.

Only sources and the recordings go in. In the repo: `sentences.csv`, `schedule.csv`, `plan.md`,
`checkin.md`, `voices.json`, `scripts/`, the per-week `brief.md` and `notes/`, the per-sentence mp3s in
`audio/sentences/`, and the published booklets `weeks/wNN/index.html`. Out of the repo, because they are
rebuilt from those in one command: the cut daily tracks in `weeks/wNN/audio/` (about 30 MB a week),
the self-contained booklet `weeks/wNN/wNN.html` (4.4 MB a week), the day markdown files, and the docx.

Two booklets, one source. `python3 scripts/render_week_html.py --week N` writes `wNN.html` with the
audio baked in: that is the file for the Mac and for sending through a chat, it plays with no folder and
no paths. `--pages` writes `weeks/wNN/index.html` instead, which streams the mp3s over the web and
replaces the two track mp3s with a button that walks the whole day, once plain for listening and once
with a pause after every sentence for echoing. `python3 scripts/render_index.py` writes the front page
that lists the published weeks.

On GitHub Pages, serve the repository root of the main branch. The front page is then at the root of the
site and a week is at `/weeks/w01/`. That is the version to open on the phone.
