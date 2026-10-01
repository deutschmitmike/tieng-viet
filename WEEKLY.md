# Building the next lesson

The recipe for one lesson of the course, written for Claude Code running on Mike's Mac in this folder.
Mike starts it with one sentence, for example "baue die nächste Lektion nach WEEKLY.md". He never types
commands; everything below is yours to run. Read CLAUDE.md first, it holds the hard rules.

A lesson is one line of plan.md under Lessons (lNN), with the notes from the review below the list, about 30 new sentences, met in the app at as many a
day as fit into Mike's minutes (15 minutes: about 3 a day, a lesson in a bit more than a week). There is no day plan and no recycling schedule:
the app's spaced repetition brings old sentences back by itself.

## 0. Before anything

Check the tools once per session: `python3 --version`, `node --version`. ffmpeg is no longer needed (only
the retired booklet scripts used it). The ElevenLabs key is in `scripts/.env`. Never print it.

## 1. Read and decide

Run `python3 app/pull_checkin.py`. It reads Mike's app state (read only), writes new Friday check-ins into
`checkin.md` and prints the check-ins, the cards he needed "Again" for most, the problem cards and his totals.

Stop condition: if there is no check-in for the week in which the current lesson ran, Mike has not finished
it. Build nothing, change nothing, tell him you are waiting for his check-in. He can also give the check-in to
you in the chat: then write it into checkin.md yourself, in the format the script uses, and go on.

Reference books, on Mike's Mac only, never in the repo and never copied (copyrighted, and Northern at the core):
`~/Downloads/Elementary Vietnamese.pdf` (Binh Ngo; the clearest grammar explanations; a scan, read pages as images),
`~/Downloads/colloquial-vietnamese-the-complete-course-for-beginners.pdf` (Bac Hoai Tran; has a text layer and marks
Southern variants with (S), so grep it with `pdftotext` to check that no Northern word slips in), and
`~/Downloads/Tieng Viet for Foreigners.pdf` (Lê Thị Hiệp; a scan, Hanoi). Use them for the grammar of the lesson and as
a cross-check, never as a source of sentences.

Then read plan.md (the line for lesson N+1 is the brief), checkin.md, sentences.csv, `words.csv` and the
previous lesson file `lessons/lNN.md`.

## 2. Write the lesson

Follow plan.md and CLAUDE.md exactly. The short version of what matters most:

- Saigon only, careful Saigon as the production target: qu keeps its k, v stays v, s/x and tr/ch apart,
  r retroflex. The Southern system never changes: d and gi are y, five tones with hỏi = ngã, the Southern
  finals as lesson 1 describes them (page "Final consonants"), and -nh/-ch after i and ê become -n/-t with a
  trace in the vowel (tinh = tưn).
- Every pron_note: what he says, then what he will hear in Saigon, then what Hanoi does. The last two are
  recognition only. The voice warnings no longer need to be written into pron_note: the app dots r, tr, s
  and the palatal finals automatically. A pron_note is for what the dot does not say.
- Persona: German teacher living in Germany, Chinese students, Vietnamese father, Chinese mother.
  Countries: Germany, Vietnam, China. No Taiwan, no Portugal, no daughter.
- About 30 sentences, 3 to 12 syllables each, something a Saigon speaker in their twenties says to a friend.
  Neutral colloquial register; youth slang only as recognition items tagged `recog`.
- Vocabulary grows slowly out of the sentences: each new sentence brings at most one or two words that are
  not yet in `words.csv` and otherwise recombines known ones. Add the new words to `words.csv`
  (`word|en|zh|first_id`, pipe-separated; create it from lessons 1 and 2 when lesson 2 is built).
- Whatever the check-in and the "Again" list flag as hard comes back as new sentences that use it in a new
  combination (new ids, never copies). A tandem correction beats your judgement on Saigon naturalness: fix the
  sentence in sentences.csv under its old id and regenerate its mp3 with `--force --ids`.
- Glosses in English plus Taiwan-register 繁體 (Chinese comma ， inside Chinese text, 你 never 您).
  hanzi only where the Sino-Vietnamese etymology is certain. From lesson 6 on, the Hán Việt items the plan asks for.
- No em dashes anywhere.
- Ids continue the sequence, never reuse. Rows go into sentences.csv (8 columns), exact existing format,
  tts column empty.
- Write `lessons/lNN.md` in the format of lessons/l01.md: first line `# Lesson N: Title`, then `ids:` in the
  order they should be met (whole sentences only; no sound drills, Mike's decision of 1 Oct 2026), then
  pages starting with `== Page title`, and a `== Tandem` page with the task Mike sees after every round.
  Pages: short, English, in the tone of lesson 1; together no longer than about 800 words. No commands and no
  file names for Mike. `@@play s0123 s0124` renders play buttons.
- Lesson 2 also brings Telex typing (plan.md, week 2): a page on setting up the Vietnamese Telex keyboard on
  the Mac and the iPhone, and the typing cards in the app (not built yet; see app/README.md, "Typing").

## 3. Validate and build

`python3 scripts/generate_audio.py --lesson N --dry-run` first, so the number of new files is seen before
credits are spent, then without `--dry-run`. Count `BUILD` up, then `python3 app/build.py`. It stops on
unknown ids, missing audio, em dashes, ASCII commas in Chinese, missing glosses, respelled forms in the
text, and failing tests. Also check by hand that sentences.csv has no simplified characters.

Look at the new lesson in the local preview (it is test mode there, nothing reaches Mike's state).

## 4. Review

Spawn one subagent with fresh context to review the new lesson strictly: Vietnamese correctness and Saigon
naturalness, phonology claims, glosses, hanzi, dialect labels, consistency with earlier lessons. Fix what it
finds and rebuild.

## 5. Publish

`git status` first: scripts/.env, checkin.md and backups must not appear. Then commit and push. The site
updates one or two minutes later at https://deutschmitmike.github.io/tieng-viet/ ; check that `version.json`
shows the new build.

Tell Mike in two sentences what the lesson covers, that it is online, and the new version number. In the app
the lesson starts with its introduction the next time he opens it.
