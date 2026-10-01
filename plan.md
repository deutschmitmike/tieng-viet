# Tiếng Việt Sài Gòn: master plan

Start: Monday 21 September 2026, decided on 18 Sep 2026 (the first planned week went by while the voice was still being fixed). Target: conversational B1 by 1 July 2027, measured as a 30-minute casual conversation with a Saigon tandem partner in their twenties, following their normal speed, and a comfortable conversation with your father. 40 weeks (in the app since 1 October 2026: lessons instead of weeks, 30 minutes Monday to Friday, see below), no passive listening, no tutor for now. Week 40 ends Friday 25 June 2027, so the last checkpoint sits just before the target date. The week that was given up came out of the old buffer week, not out of the teaching weeks.

Progress is counted in week numbers, not calendar weeks. If you skip a week, the next generated week is still the next week number; nothing is lost, the end date moves.

## Fixed decisions

- Saigon only. Strict Saigon pronunciation from day one, also where it contradicts the spelling. No Northern module.
- Register: neutral colloquial Saigon for production. Youth slang appears only in the recognition layer (what tandems write to you), never in the echo tracks.
- Persona in all material: a German teacher living in Germany, Chinese students, Vietnamese father, Chinese mother. Countries that come up: Germany, Vietnam, China.
- Glosses: English, plus Chinese (繁體) wherever Mandarin is the closer analogue. 漢字 on every word that has a Sino-Vietnamese etymology. From week 6 a small correspondence track (Mandarin sound to Hán Việt sound) runs alongside.
- Since 1 October 2026 (Mike's decision): the course runs in an app with spaced repetition. Each plan week below is one lesson of about 30 new sentences; the app brings old sentences back by itself, so there is no recycling schedule and no day plan. Whole sentences, lots of listening and repeating, vocabulary growing slowly out of the sentences (at most one or two new words per sentence). With 30 minutes a day the app fits about six new sentences a day, so a lesson takes about a week and all 40 topics stay, each one leaner. How a lesson is built: WEEKLY.md; how the app works: app/README.md.
- Audio: ElevenLabs only, one file per sentence, generated once, reused every time the sentence comes back. The app plays them on a button press only, never by itself.
- Feedback loop: the Friday check-in in the app (what was hard, what you used with the tandems, what the tandem said), plus the app's own count of which sentences needed "Again". `app/pull_checkin.py` writes both into `checkin.md`; the next lesson is built from it. Tandem corrections fix the sentence itself.

## The daily half hour

One round in the app, about 30 minutes, Monday to Friday. First the sentences that are due, then up to six new ones. Each card: play, say it in the pause, play again and say it on top of the voice, as often as you like, then Again or Got it. After three Got its a sentence comes as its meaning only: say it from memory, then check against the voice. Whole sentences only, no sound drills (decided 1 October 2026). After the round, the tandem task of the lesson (a few messages using what you have). Friday adds the check-in.

Shadowing means matching the voice, not translating. Pitch, length, the cut at the end of stopped syllables, the lip closure after o, ô, u. Meaning comes from the gloss, not from the shadowing.

(Until 30 September 2026 the course ran as an hour a day with week booklets and cut daily tracks: listen, shadow, echo from gloss, output, preview. Lesson 1 was studied that way.)

## Checkpoints

Every eighth week. Record a two-minute monologue on the checkpoint topic, then hold a timed conversation with a tandem and ask them the same three questions afterwards: what did you not understand, what sounded wrong, what did I say that a Saigon person would say differently. Keep the recordings; you'll want to hear week 8 again in week 40.

| week | conversation length | monologue topic |
|---|---|---|
| 8 | 5 min | who I am, my family, why I learn Vietnamese |
| 16 | 10 min | my week, my work, what I like doing |
| 24 | 15 min | a story from the past, with opinions |
| 32 | 20 min | Germany and Vietnam and China compared |
| 40 | 30 min | free conversation, your topics |

## Phases and weeks

### Phase 0, weeks 1 to 2: the Saigon sound system

- w01 Tones (five, as Saigon has them), vowels, initials with their Saigon values (d/gi = y, r retroflex, tr vs ch, qu = w, v stays v), finals and what Saigon does with them: -t turns into -c after rounded vowels (một = mộc, a true merger), while the palatal -nh and -ch give up their consonant but leave a trace in the vowel (anh = ăn, tinh = tưn, so tin and tinh stay two different words), unreleased stops, lip closure after rounded vowels. Greetings, pronouns anh/em, first persona sentences on Friday.
- w02 Saigon contractions (ổng, bả, cổ, ảnh, chỉ, ngoải, trỏng), sentence-final particles (nha, nghen, hen, hả, hông, á, đó, luôn), the top 100 function words, numbers, time of day, days of the week, Telex typing on Mac and phone, first structured texting with the tandems.

### Phase 1, weeks 3 to 10: A1, survival and small talk

- w03 Self-introduction and family in the persona. là, không phải là, có, không có. Kinship terms ba, má, anh, chị, em, ông, bà. Ages and jobs.
- w04 Questions. gì, đâu, ai, nào, mấy, bao nhiêu, sao, khi nào / chừng nào (Saigon). Yes/no with có ... không, ... chưa, ... hả, ... phải không. Answering with dạ, ừ, hông, chưa.
- w05 Daily routine and time. mấy giờ, sáng / trưa / chiều / tối, thường, mỗi ngày, hôm nay / hôm qua / ngày mai. Aspect: đang, đã, sẽ, rồi, chưa, mới, vừa. Mandarin bridge: 了 / 在 / 剛.
- w06 Food and coffee in Saigon. Ordering, classifiers ly, tô, dĩa, cái, con, chiếc, cục, miếng. quán, gọi món, tính tiền. Hán Việt track begins: the first sound correspondences (學 → học, 國 → quốc, 時 → thời).
- w07 Places and getting around. ở đâu, đi, tới, về, gần, xa, quẹo (Saigon for turn), Grab, xe máy, hẻm, quận. Directions in a Saigon street.
- w08 Checkpoint 1. Shopping and money: mắc, rẻ, bao nhiêu tiền, trả giá, bớt, numbers to millions, ngàn (Saigon for nghìn).
- w09 Likes, wants, preferences. thích, muốn, ghét, thích ... hơn, mê. Gym, coffee, Korean dramas as the topics.
- w10 Past and plans. hôm qua, tuần trước, hồi đó, đã ... rồi, định, tính (Saigon for planning), sẽ. Telling a weekend in ten sentences.

### Phase 2, weeks 11 to 22: A2, talking about your life

- w11 Work as a teacher. dạy, học trò / học sinh, lớp, online, lịch dạy, giờ dạy, bận, rảnh. Explaining what you do to a tandem.
- w12 Germany, Vietnam, China. Countries, languages, người Đức / người Việt / người Hoa, tiếng Đức / tiếng Việt / tiếng Hoa. Comparison: hơn, nhất, bằng, giống, khác. Hán Việt: 德 / 越 / 華 / 國 / 語.
- w13 Family and kinship in depth. bên nội / bên ngoại, cô, dì, chú, bác, cậu, mợ, thím, dượng. Talking about your father's family in Cần Thơ without yet talking to them.
- w14 Describing people. Appearance, character, tính tình, hiền, dễ thương, khó tính, vui tính. Southern intensifiers: dữ, quá trời, hết sức.
- w15 Body, health, gym. đau, mệt, bịnh, tập gym, tập tạ, ăn uống, ngủ, khỏe lên.
- w16 Checkpoint 2. Barbershop and skincare: cắt tóc, uốn, nhuộm, da, mụn, kem chống nắng, dưỡng da.
- w17 Korean dramas and entertainment. phim, tập, diễn viên, coi (Saigon for xem), hay, dở, cảm động, hài.
- w18 Reasons and consequences. tại vì, vì, nên, cho nên, mà, thì, tại. Mandarin bridge: 因為 / 所以 / 才.
- w19 Requests, suggestions, invitations. giúp, nhờ, đi ... không?, hay là, thôi, được không, ráng (Saigon for cố gắng).
- w20 Texting register. Abbreviations (k, ko, hông, dc, đc, ntn, j, ms, r), emoji habits, openers and closers, how tandems actually write. Recognition layer, plus a clean version for your own messages.
- w21 Housing and daily life in Saigon. thuê nhà, phòng, hẻm, quận, điện nước, tiếng ồn, kẹt xe, mưa.
- w22 Travel in Vietnam. Đà Nẵng, Huế, Cần Thơ, miền Tây, đi chơi, đặt phòng, chuyến bay, xe khách.

### Phase 3, weeks 23 to 34: B1, extended turns

- w23 Storytelling I. Sequencing: đầu tiên, rồi, sau đó, cuối cùng, lúc đó, hồi đó, tự nhiên. A story in twenty sentences.
- w24 Checkpoint 3. Opinions: theo anh, anh nghĩ, anh thấy, đồng ý, không đồng ý, có lẽ, chắc, chắc chắn.
- w25 Connectors. tuy ... nhưng, mặc dù, không những ... mà còn, càng ... càng, vừa ... vừa, hoặc ... hoặc, vừa mới ... đã.
- w26 Conditionals and hypotheticals. nếu ... thì, lỡ, giá mà, phải chi, miễn là. Mandarin bridge: 如果 / 要是 / 萬一.
- w27 Reported speech. nói là, hỏi là, kêu (Saigon for bảo), nói ... rằng, hỏi ... có ... không.
- w28 Hán Việt at scale I. Society, work, education: xã hội, kinh nghiệm, quyết định, giáo dục, cơ hội, vấn đề, ý kiến, văn hóa. Decoding new words from 漢字.
- w29 Germany, Vietnam, China compared. Culture, food, punctuality, family, cost of living, what Vietnamese people ask a German about Germany.
- w30 Feelings and relationships. buồn, vui, lo, nhớ, giận, ghen, hẹn hò, độc thân, register-safe versions for the tandems.
- w31 Emergencies and light bureaucracy. bệnh viện, thuốc, giấy tờ, visa, ngân hàng, sim, mất đồ.
- w32 Checkpoint 4. Hán Việt at scale II: technology, environment, city life, economy without politics.
- w33 Saigon idiom and speech habits. quá trời, dữ, hết sức, bao ... (bao ngon, bao rẻ), ... gì đâu, ... luôn, xạo, quẹo lựa, chảnh. Production versions and recognition-only versions.
- w34 Listening at speed. Fast tracks, reduced forms, ellipsis, repair: ủa, hả, sao, cái gì, nói lại đi.

### Phase 4, weeks 35 to 40: consolidation

- w35 Monologues. Two-minute talks on five topics, recorded, compared with the model tracks.
- w36 Long conversation simulations I. Scripted 15-minute dialogues in two voices, you take one side.
- w37 Family register for your father. con / ba, hỏi thăm, thưa, dạ, Cần Thơ and miền Tây topics, the respectful particles, what to say and what not to ask.
- w38 Long conversation simulations II.
- w39 Repair and fluency. Paraphrasing, hedging, fillers (thì, là, kiểu, cái, tức là), buying time without switching to English.
- w40 Checkpoint 5, 30 minutes. Gaps week: whatever the check-ins and corrections flagged most. Ends Friday 25 June 2027.

## Conventions for the material

- One sentence per row in `sentences.csv`, 3 to 12 syllables, always something a Saigon speaker in their twenties would actually say to a friend.
- Every Southern-specific word is marked in `pron_note` with its Northern equivalent once, so you recognise the Hanoi word when it turns up, but never produce it.
- `pron_note` is filled only where the Saigon pronunciation contradicts the spelling or a Mandarin or German habit would interfere. Empty means: read it as written.
- 漢字 only where the etymology is certain. Doubtful cases stay blank rather than guessing.
- Three layers in `pron_note`, in this order: what you say, what you will hear in Saigon, and what Hanoi does. The last two are recognition only and never enter the echo tracks.
- The production target throughout is careful Saigon, not fast Saigon: qu keeps its k (quá, never wá), v stays v (về, never yề), s and x stay apart, tr and ch stay apart, r stays retroflex. This is a matter of care, not of dialect. Where the careful Saigon form happens to match Hanoi, as with qu, that is a coincidence of care and no reason to avoid it.
- What is Southern in the system itself is never touched, whatever "standard" is said to mean: d and gi are y and never z, r is retroflex and never z, the five tones stay with hỏi = ngã, and the Southern finals stay: -t becomes -c after rounded vowels (một = mộc), and the palatal -nh and -ch become -n and -t. That last one is not a full merger, because the vowel keeps the trace: anh is ăn, tinh is tưn, chính is chứn, so tin and tinh remain two words and careful speech keeps them apart. Undoing any of this would not be careful speech, it would be Northern speech, where the difference sits in the final consonant instead.
- Chinese glosses in Taiwan-register 繁體 with the Chinese comma, 你 not 您.
- When a tandem's correction and this material disagree on how something is said in Saigon, the tandem wins. Note it in `checkin.md`; the sentence gets fixed.

## How the audio is made

- Voice: your own v3 voice, `2vKhvfp40Pq0JeXGdL7F`, model `eleven_v3`, stability 1.0. Decided 18 Sep 2026 after a head to head against Minh and Anh PM from the library.
- Stability 1.0, not 0.5: at 0.5 the voice glued "cho anh" into one word. 1.0 keeps the syllables apart. v3 accepts only 0.0, 0.5 and 1.0.
- Saigon respelling: at the start of a syllable, d becomes y and gi becomes y before the voice sees the text. dạ is read as yạ, giờ as yờ. đ and gh are never touched, so đúng stays đúng and ghi stays ghi. The rule lives in `scripts/common.py`, function `saigon_respell`, and runs on every sentence automatically. The booklet always shows the correct spelling.
- The r is the one sound no voice on ElevenLabs gets right: every Vietnamese voice says a z there, and unlike d and gi there is no second letter in the alphabet that carries the retroflex value, so respelling cannot fix it. The three r drills carry the warning in their note: you hear z, you say the Mandarin 日.
- Every sentence file is generated once and reused when the sentence comes back in a later week, so nothing is paid for twice. v3 varies between generations, so a regenerated file sounds slightly different.

## Output format

- The app at the site root, decided 30 September 2026, replacing the week booklets. Phone first, English interface, progress synced between phone and Mac. Lesson introductions, notes, the searchable list of all sentences met, a listening mode started by hand, the tandem task and the check-in all live in it.
- The old HTML week booklet of week 1 stays online at /weeks/w01/ as an archive. The docx renderer and the booklet scripts are out of the routine.
