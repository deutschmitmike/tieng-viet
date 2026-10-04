# Building the next lesson

The recipe for one lesson of the course, written for Claude Code running on Mike's Mac in this folder.
Mike starts it with one sentence, for example "baue die nächste Lektion nach WEEKLY.md". He never types
commands; everything below is yours to run. Read CLAUDE.md first, it holds the hard rules.

A lesson is one line of plan.md under Lessons (lNN; the review notes below that list apply to all lessons). It has
about 30 new sentences. The app introduces as many a day as fit into Mike's minutes (at 15 minutes about 3 a day,
so a lesson takes a bit more than a week). There is no day plan and no recycling schedule:
the app's spaced repetition brings old sentences back by itself.

## 0. Before anything

Check the tools once per session: `python3 --version`, `node --version`. ffmpeg is no longer needed (only
the retired booklet scripts used it). The ElevenLabs key is in `scripts/.env`. Never print it.

## 1. Read and decide

Run `python3 app/pull_checkin.py`. It reads Mike's app state (read only) and prints how many sentences of each
lesson he has met, the cards he needed "Again" for most, the problem cards and his totals. (It would also copy old
Friday check-ins into `checkin.md`; there are none since 1 Oct 2026.)

When to build: there is no check-in any more (Mike, 1 Oct 2026). The rule is one lesson ahead: the lesson after the
one Mike is currently learning should always exist. Mike asks for it ("nächste Lektion"), usually when a new lesson
has just started in the app. Build lesson N+1 when lesson N exists; never more than one lesson ahead of the one he is
learning, so that the app data of the current lesson can still shape the next. If Mike sends tandem corrections in the
chat, write them into `checkin.md` under a "## Chat check-in YYYY-MM-DD, lesson N" heading and use them.

Reference books, on Mike's Mac only, never in the repo and never copied (copyrighted, and Northern at the core):
`~/Downloads/Elementary Vietnamese.pdf` (Binh Ngo; the clearest grammar explanations; a scan, read pages as images),
`~/Downloads/colloquial-vietnamese-the-complete-course-for-beginners.pdf` (Bac Hoai Tran; has a text layer and marks
Southern variants with (S), so grep it with `pdftotext` to check that no Northern word slips in), and
`~/Downloads/Tieng Viet for Foreigners.pdf` (Lê Thị Hiệp; a scan, Hanoi). Use them for the grammar of the lesson and as
a cross-check, never as a source of sentences.

Then read plan.md (the line for lesson N+1 is the brief), checkin.md (tandem corrections, if any), sentences.csv, `words.csv` (when building
lesson 2 it does not exist yet: create it first, see step 2) and the
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
- Persona: German teacher living in Germany, Chinese students, Vietnamese father, Chinese mother, an older sister
  (chị), a cat. No partner is defined: ask Mike before writing about one.
  Countries: Germany, Vietnam, China. No Taiwan, no Portugal, no daughter.
- About 30 sentences, 3 to 12 syllables each, something a Saigon speaker in their twenties says to a friend.
  Neutral colloquial register. No recognition items in the app (there is no recognition card type); slang goes
  into the lesson pages only.
- Vocabulary grows slowly out of the sentences: each new sentence brings at most one or two words that are
  not yet in `words.csv` and otherwise recombines known ones. Add the new words to `words.csv`
  while writing. Format `word|en|zh|first_id`, pipe-separated, with a header line. A word is a dictionary entry:
  compounds count as one (cà phê, tiếng Việt, Sài Gòn), and so do fixed particles (nha, hả) and contractions
  (cổ, ảnh). One row per word and meaning: ba|three and ba|dad are two rows, and so is a new sense of a known word
  (đi as a softening particle). first_id is the sentence where Mike first meets it, in the order of the lesson's
  `ids:` line (ăn: s0120, not s0089). Names (Mike) are not words. Before writing lesson 2, create the file from the
  62 practised sentences of lesson 1, including the numbers row s0088 (not from the sound drills). build.py checks
  the file's format, its Chinese and that every first_id exists.
- Whatever the "Again" list and the problem cards flag as hard comes back as new sentences that use it in a new
  combination (new ids, never copies). A tandem correction beats your judgement on Saigon naturalness: fix the
  sentence in sentences.csv under its old id and regenerate its mp3 with `--force --ids`.
- Glosses in English plus Taiwan-register 繁體 (Chinese comma ， inside Chinese text, 你 never 您).
  hanzi only where the Sino-Vietnamese etymology is certain. From lesson 9 on, the Hán Việt items the plan asks for.
- No em dashes anywhere.
- Ids continue the sequence: next id = highest number in sentences.csv + 1 (the rows are not sorted; after lesson 1
  the next is s0122). Never reuse an id. Rows go into sentences.csv (8 columns), exact existing format,
  tts column empty.
- The app is Mike's teacher and coursebook (Mike, 4 Oct 2026), so every sentence is fully explained. For each new
  sentence add an entry to `gloss.json`: `"w"` = the words in order, each `[Vietnamese as written incl. punctuation,
  short Chinese gloss, Hán Việt characters only if Sino-Vietnamese and certain]` (compounds such as cà phê, tiếng Việt,
  cái này, hôm nay as one unit; the units joined by spaces must spell the sentence exactly), and `"x"` = one or two
  lines in English on how the sentence is built, with the Mandarin parallel in Chinese (Chinese items separated by
  、). build.py refuses a practised sentence without an entry. The app shows the words with the Chinese underneath,
  the Hán Việt in small, then the whole sentence in Chinese and English, everywhere a sentence appears.
- Every lesson gets a grammar page in textbook style: each construction of the lesson with the rule, the Mandarin
  comparison and examples. Examples always as `@@play` lines (they render with words and translations), never as
  bare Vietnamese in the running text; a Vietnamese phrase that is not a sentence of the course gets its
  translation in brackets. The "Words in this lesson" page is generated by build.py from words.csv.
- Write `lessons/lNN.md` in the format of lessons/l01.md, without its `drills:` and `start:` lines (lesson 1 only): first line `# Lesson N: Title`, then `ids:` in the
  order they should be met (whole sentences only; no sound drills, Mike's decision of 1 Oct 2026), then
  pages starting with `== Page title`, and a `== Tandem` page with the task Mike sees after every round.
  Pages: short, English, in the tone of lesson 1; together no longer than about 800 words. No commands and no
  file names for Mike. `@@play s0123 s0124` renders play buttons.
- Lesson 2 also brings Telex typing (plan.md, l02): a page on setting up the Vietnamese Telex keyboard on
  the Mac and the iPhone, which you write and publish with the lesson. The typing cards in the app are separate app
  work (spec in app/README.md, "Typing"): ask Mike whether to build them now; the answer never blocks publishing
  the lesson. Until they exist, the Telex page must not mention typing cards.

## 3. Validate and build

`python3 scripts/generate_audio.py --lesson N --dry-run` first, so the number of new files is seen before
credits are spent, then without `--dry-run`. Count `BUILD` up, then `python3 app/build.py`. It stops on
unknown ids, missing audio, missing glosses, failing tests, a page script that does not run (smoke test), em
dashes and 您 anywhere in sentences.csv and the lessons, ASCII punctuation inside Chinese text, common
simplified characters (a list, not all of them: still read the zh yourself), respelled forms on the lesson pages,
and from lesson 2 on any sentence outside 3 to 12 syllables.

Look at the new lesson locally: `python3 -m http.server 8790` from the repo root, then http://localhost:8790 (every
address except deutschmitmike.github.io is test mode, nothing reaches Mike's state). Port 8767 may already be
served by the desktop app's preview; whatever port you use, check that `/version.json` there shows the BUILD you
just built.

## 4. Review

Spawn one subagent with fresh context to review the new lesson strictly: Vietnamese correctness and Saigon
naturalness, phonology claims, glosses, hanzi, dialect labels, consistency with earlier lessons. Fix what it
finds and rebuild. If a sentence's vi text changes, regenerate its mp3 with
`python3 scripts/generate_audio.py --force --ids sNNNN`. Count BUILD up only once per deploy.

## 5. Publish

`git status` first: scripts/.env, checkin.md and backups must not appear. Then commit and push. The site
updates one or two minutes later at https://deutschmitmike.github.io/tieng-viet/ ; check that `version.json`
shows the new build.

Update the status: in CLAUDE.md "Where things stand" and in plan.md mark the lesson as built (`- l02 (built)`).

Tell Mike in two sentences what the lesson covers, that it is online, and the new version number. In the app
the lesson starts with its introduction the next time he opens it.
