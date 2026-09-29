# Building the next week

The recipe for one week of the course, written for Claude Code running on Mike's Mac in this folder.
Mike starts it with one sentence, for example "baue die nächste Woche nach WEEKLY.md". He never types
commands; everything below is yours to run. Read CLAUDE.md first, it holds the hard rules.

## 0. Before anything

Check the tools once per session: `python3 --version`, `ffmpeg -version`, `node --version`. The scripts
need python3 (stdlib only) and ffmpeg. If ffmpeg is missing and Homebrew exists, install it with
`brew install ffmpeg`; if Homebrew is missing too, say so and stop. The ElevenLabs key is in `scripts/.env`.
Never print it.

## 1. Read and decide

Read plan.md (one line per week: that line is the brief), checkin.md (Mike's Friday notes, newest at top),
sentences.csv, schedule.csv, and the previous week's brief.md and notes/d1.md to d5.md. The highest week in
schedule.csv is week N; you build week N+1.

Stop condition, before anything else: if checkin.md has no entry for week N, Mike has not finished week N.
Build nothing, change nothing, tell him you are waiting for his check-in. Mike can also give the check-in
to you in the chat: then write it into checkin.md yourself, in the format at the top of that file, and go on.

## 2. Write the week

Follow plan.md and CLAUDE.md exactly. The short version of what matters most:

- Saigon only, careful Saigon as the production target: qu keeps its k, v stays v, s/x and tr/ch apart,
  r retroflex. The Southern system never changes: d and gi are y, five tones with hỏi = ngã, -t becomes -c
  after rounded vowels and after ă and iê, -n becomes -ng after a, ă, â, and the palatal finals -nh/-ch
  become -n/-t with a trace in the vowel (anh = ăn, tinh = tưn).
- Every pron_note: what he says, then what he will hear in Saigon, then what Hanoi does. The last two are
  recognition only and never enter the echo tracks.
- Any sentence with r, tr/ch, s/x or a palatal final carries the standing voice warning, shaped like
  s0049, s0051, s0054 and s0078. The brief repeats the four deviations in one block with
  `@@play s0049 s0051 s0054 s0078`, as week 1 does.
- Persona: German teacher living in Germany, Chinese students, Vietnamese father, Chinese mother.
  Countries: Germany, Vietnam, China. No Taiwan, no Portugal, no daughter.
- 3 to 12 syllables per sentence, something a Saigon speaker in their twenties says to a friend.
  Neutral colloquial register; youth slang only as recognition items tagged `recog`.
- Glosses in English plus Taiwan-register 繁體 (Chinese comma ， inside Chinese text, 你 never 您).
  hanzi only where the Sino-Vietnamese etymology is certain. From week 6 on, the Hán Việt items the plan asks for.
- No em dashes anywhere.
- Monday to Thursday about 20 new sentences plus about 10 recycled from weeks N and N-1 (the same id again
  with new=0, never a copy). Friday about 30 recycled only, in dialogue order, no new ids.
- Whatever checkin.md flags as hard comes back as recycled or corrected material. A tandem correction beats
  your judgement on Saigon naturalness: fix the sentence and regenerate its mp3 with `--force --ids`.
- Ids continue the sequence, never reuse. Rows go into sentences.csv (8 columns) and schedule.csv
  (5 columns), pipe-separated, exact existing format. The tts column stays empty.
- Write weeks/wNN/notes/d1.md to d5.md (250 to 400 words each) and weeks/wNN/brief.md, in the tone and
  structure of week 1. No commands for Mike in any of them. `@@play s0123 s0124` renders play buttons.

## 3. Validate and build

Validate with Python: every schedule id exists in sentences.csv, every new id is scheduled exactly once with
new=1, column counts are right, no simplified Chinese characters, no em dashes. Then, from the folder root:

```
python3 scripts/render_day.py --week N
python3 scripts/generate_audio.py --week N
python3 scripts/build_day.py --week N
python3 scripts/render_week_html.py --week N
python3 scripts/render_week_html.py --week N --pages
python3 scripts/render_index.py
```

Check: ten mp3 files in weeks/wNN/audio, weeks/wNN/wNN.html several MB, weeks/wNN/index.html a few hundred KB,
the root index.html lists the new week, and no respelled form (yạ, yì, yờ and so on) appears in the visible
text of either page.

## 4. Review

Spawn one subagent with fresh context to review the new week strictly: Vietnamese correctness and Saigon
naturalness, phonology claims, glosses, hanzi, dialect labels, consistency. Fix what it finds and rebuild.

## 5. Publish

`git status` first: scripts/.env, checkin.md, the cut tracks, wNN.html and backups must not appear. Then
commit and push. The site updates one or two minutes later at https://deutschmitmike.github.io/tieng-viet/

Tell Mike in two sentences what the week covers and that it is online. The file he studies from on the Mac is
weeks/wNN/wNN.html, on the phone the site.
