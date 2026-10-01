# Tiếng Việt Sài Gòn: master plan

Start: Monday 21 September 2026, decided on 18 Sep 2026 (the first planned week went by while the voice was still being fixed). Target: conversational B1 (originally by 1 July 2027; since the app the date follows Mike's minutes a day, about early 2028 at 15 minutes), measured as a 30-minute casual conversation with a Saigon tandem partner in their twenties, following their normal speed, and a comfortable conversation with your father. 50 lessons (in the app since 1 October 2026: lessons instead of weeks, every day, 15 minutes; the date follows the pace, see Lessons), no passive listening, no tutor for now.

Progress is counted in lessons. A skipped day loses nothing; the end date moves.

## Fixed decisions

- Saigon only. Strict Saigon pronunciation from day one, also where it contradicts the spelling. No Northern module.
- Register: neutral colloquial Saigon for production. Youth slang appears only in the lesson pages for recognition (what tandems write to you), never in the sentences practised in the app.
- Persona in all material: a German teacher living in Germany, Chinese students, Vietnamese father, Chinese mother. Countries that come up: Germany, Vietnam, China.
- Glosses: English and Chinese (繁體) on every sentence. 漢字 on every word that has a Sino-Vietnamese etymology. From lesson 9 a small correspondence track (Mandarin sound to Hán Việt sound) runs alongside.
- Since 1 October 2026 (Mike's decision): the course runs in an app with spaced repetition. Each line under Lessons below is one lesson of about 30 new sentences; the app brings old sentences back by itself, so there is no recycling schedule and no day plan. Whole sentences, lots of listening and repeating, vocabulary growing slowly out of the sentences (at most one or two new words per sentence). Simulated 1 October 2026, every day: 10 minutes fit about 2 new sentences a day (14 a week, a lesson in about two weeks), 15 minutes about 3, 20 minutes about 4, 30 minutes about 6. All topics stay in 50 lessons (see Lessons), each one leaner; the pace follows the minutes Mike chooses. How a lesson is built: WEEKLY.md; how the app works: app/README.md.
- Audio: ElevenLabs only, one file per sentence, generated once, reused every time the sentence comes back. The app plays them on a button press only, never by itself.
- Feedback loop: the Friday check-in in the app (what was hard, what you used with the tandems, what the tandem said), plus the app's own count of which sentences needed "Again". `app/pull_checkin.py` writes both into `checkin.md`; the next lesson is built from it. Tandem corrections fix the sentence itself.

## The daily round

One round in the app every day, as many minutes as Mike sets (15). First the sentences that are due, then as many new ones as fit. Each card: play, say it in the pause, play again and say it on top of the voice, as often as you like, then Again or Got it. After three Got its a sentence comes as its meaning only: say it from memory, then check against the voice. Whole sentences only, no sound drills (decided 1 October 2026). After the round, the tandem task of the lesson (a few messages using what you have). Friday adds the check-in.

Shadowing means matching the voice, not translating. Pitch, length, the cut at the end of stopped syllables, the lip closure after o, ô, u. Meaning comes from the gloss, not from the shadowing.

(Until 30 September 2026 the course ran as an hour a day with week booklets and cut daily tracks: listen, shadow, echo from gloss, output, preview. Lesson 1 was studied that way.)

## Checkpoints

Lessons 10, 20, 30, 40 and 50. The checkpoint lesson is a normal lesson; on top, record a two-minute monologue on your phone on the checkpoint topic, then hold a timed conversation with a tandem and ask them the same three questions afterwards: what did you not understand, what sounded wrong, what did I say that a Saigon person would say differently. Keep the recordings; you'll want to hear lesson 10 again at lesson 50.

| lesson | conversation length | monologue topic |
|---|---|---|
| 10 | 5 min | who I am, my family, why I learn Vietnamese |
| 20 | 10 min | my week, my work, what I like doing |
| 30 | 15 min | a story from the past, with opinions |
| 40 | 20 min | work and money in Germany, Vietnam and China |
| 50 | 30 min | free conversation, your topics |

## Lessons

Restructured on 1 October 2026 (Mike approved): 50 lessons instead of 40 weeks, each about 30 whole sentences with a clear grammar core, reviewed by a subagent against the three textbooks below. The pace follows Mike's minutes a day: at 15 minutes about 20 new sentences a week, so lesson 50 around February or March 2028; at 20 minutes around late 2027. Emergencies and bureaucracy were taken out (Mike); sport, pets, work and money were added (Mike). Each line: topic | grammar core. Constructions are always taught in their Saigon form.

### Phase 1, lessons 1 to 14: A1, survival and small talk

- l01 (done) The Saigon sound system, greetings, the persona sentences | anh / em
- l02 Particles, asking back, Telex typing | nha, á, luôn, vậy, nè, đi, ủa; hả, hông; repair phrases in new combinations (s0073, s0096 and s0115 already exist): nói lại đi, nghĩa là gì?, cái này tiếng Việt nói sao?
- l03 Numbers to 100, clock time, times of day | mấy vs bao nhiêu; Saigon number forms mốt (21), lăm (15, 25; nhăm is Northern), hăm (hăm mốt) for recognition; giờ, phút, rưỡi, mấy giờ rồi?, mười giờ thiếu năm (thiếu, never Northern kém); sáng, trưa, chiều, tối
- l04 Me, my family, pronouns | là, không phải là, có; tui, mình, tụi mình, tụi em, nó, tụi nó, bạn (tao / mày recognition only); the contractions ổng, bả, cổ, ảnh, chỉ only as review (they came in lesson 1); của, này / đó / kia; a few con / ba sentences for the father right away. The persona has no defined siblings or partner: ask Mike before inventing family members
- l05 Questions and answers | gì, đâu, ai, nào, sao as how (thấy sao?, sao rồi?; why comes in l06), chừng nào (future) / hồi nào (past); có … không, chưa, hả, phải không; answers dạ, ừ, phải, hông, chưa. Chat abbreviations (k, ko, dc, r) in the lesson notes only, never as audio
- l06 Why? Giving reasons | sao, tại sao, vì, tại vì, nên, cho nên, để (so that); nhưng. The first tandem question: why do you learn Vietnamese?
- l07 Daily routine, days of the week | đang, sẽ, rồi first, đã optional (đã … rồi ≈ 已經…了; Saigon mostly just says rồi), chưa; trước khi, sau khi; đi với ai
- l08 Dates, birthday, weather | ngày, tháng, năm, hôm nay ngày mấy, sinh nhật; nóng, mưa, nắng, mùa mưa, mùa khô; từ … tới, bao lâu rồi, vẫn / còn; tuần rồi, hôm bữa, hai ngày nữa
- l09 Food and coffee, the Hán Việt track begins (學 → học, 國 → quốc, 時 → thời) | classifiers ly, tô, dĩa, chén, muỗng; cho anh …; A hay B? (nóng hay đá?); thêm … nữa
- l10 CHECKPOINT 1. Shopping and money | chỉ … thôi (and the clash with the contraction chỉ), hết; vài, mấy (a few), chút xíu, nửa, mỗi; trăm lẻ (never linh), ngàn, triệu, năm chục ngàn, 50k for recognition; classifiers cái, trái, cuốn; để anh trả, cho anh hỏi chút
- l11 Getting around | đi, về, tới, vô, ra, qua, lên, xuống with the geography (ra Hà Nội, lên Đà Lạt, xuống Cần Thơ, về quê); trên, dưới, trong, ngoài, giữa, trước, sau, kế bên (bên cạnh for recognition), đối diện; quẹo, Grab, hẻm, quận; cách … bao xa
- l12 Likes, ability, a first opinion | muốn, cần, phải, nên; V được / V hông được and biết + V (more common in Saigon than có thể); thích … hơn, mê; anh thấy …, em thấy sao?
- l13 The weekend, plans, the past | xong, sắp (快要), vừa mới, mới (才, only then); đã … rồi; tính, định; hồi nhỏ, hồi đó
- l14 Requests, invitations, apologies | nhờ, giùm, đi … không?, hay là, được không, đừng, ráng, khỏi (khỏi lo); nếu … thì; xin lỗi, hông sao đâu, có gì đâu; gặp nhau

### Phase 2, lessons 15 to 32: A2, talking about your life

- l15 Talking with my father | con / ba, dạ to open every answer, ạ less often; thưa as the ritual greeting (thưa ba con đi); nghen, warmer and older, fits the father; asking after health and family
- l16 Work as a German teacher | dạy, học trò, lớp, online, bận, rảnh; cho, với; experience with từng, chưa bao giờ, lần nào chưa (過 / 曾經)
- l17 Germany, Vietnam, China | countries and languages; hơn, nhất, bằng, giống, khác; người Hoa (ethnic Chinese in Vietnam) vs người Trung Quốc (people from China), important for describing the mother; 德 越 華 國 語
- l18 Kinship, the father's family in Cần Thơ | bên nội / bên ngoại, cô, dì, chú, bác, cậu, mợ; birth-order names (anh Hai is the eldest, chú Tư, cô Út); kinship terms as pronouns
- l19 Describing people | appearance and character, hiền, dễ thương, khó tính; reduplication (vui vẻ, sạch sẽ, nho nhỏ); hơi, khá, lắm, dữ, quá trời; ốm means thin in Saigon, mập; hông có đâu, emphatic … mà (em nói rồi mà)
- l20 CHECKPOINT 2. Body and health | đau, mệt, thuốc; bị / được (bị bệnh, được nghỉ); bệnh is the production form everywhere, bịnh for recognition
- l21 Doing sport | tập gym, tập tạ, chạy bộ, đá banh, bơi; verbs tập, chơi, đánh; frequency mỗi tuần mấy lần, thường, hay, ít khi
- l22 Barber, skincare, clothes | hớt tóc, uốn, nhuộm, da, kem chống nắng; làm cho; cái for clothes (cái áo, cái quần), bộ (bộ đồ); chiếc mainly for vehicles
- l23 Series and music | coi phim, diễn viên, hay, dở, cảm động; relative clauses with mà and without (phim mà em coi, cái áo em mua)
- l24 Phone, apps, social media | Zalo, Facebook, TikTok, voice messages, nhắn tin, gọi; Saigon idioms that tandems use, for recognition
- l25 Pets | nuôi, con chó, con mèo, dắt đi dạo, cho … ăn; classifier con; dễ thương, cưng
- l26 Housing and daily life in Saigon | thuê nhà, phòng, kẹt xe, tiếng ồn; càng ngày càng, thành (not bookish trở nên); classifiers căn, đứa
- l27 Travel in Vietnam | Đà Nẵng, Huế, Cần Thơ, miền Tây, đặt phòng, xe khách (xe đò for recognition); đều, cả / tất cả / mọi / từng; ai cũng, gì cũng, đâu cũng
- l28 Tết and holidays | về quê, lì xì, family customs; lúc / khi, trong khi; kịp, trễ
- l29 Storytelling I | đầu tiên, rồi, sau đó, cuối cùng, tự nhiên
- l30 CHECKPOINT 3. Opinions, agreeing, disagreeing | theo anh, chắc, có lẽ, chứ; đúng rồi, hông phải vậy, thiệt hả
- l31 What others said | nói là, hỏi là, kêu (Saigon for bảo); hỏi … có … không
- l32 Wishes and conditions | lỡ, phải chi (要是…就好了), miễn là (只要), nếu … thì in longer turns

### Phase 3, lessons 33 to 43: B1, extended turns

- l33 Connectors | mặc dù … nhưng, vừa … vừa, không chỉ … mà còn, càng … càng, hay / hay là for production; tuy … nhưng and hoặc for recognition (bookish)
- l34 Result and direction | được, xong, hết, nổi, kịp, ra, thấy, lên (ăn hông nổi, nghĩ ra, đứng lên)
- l35 What happened to me | bị / được with an agent (bị má la, được thầy khen)
- l36 Hán Việt I: society, work, education | xã hội, kinh nghiệm, quyết định, giáo dục, cơ hội, vấn đề, ý kiến, văn hóa; decoding new words from 漢字, always inside whole sentences
- l37 Childhood and memories | extended past narration, using hồi nhỏ, hồi đó (l13) and từng (l16) as known items; also for the father
- l38 Feelings | buồn, vui, lo, nhớ, giận, ghen
- l39 Friendship and relationships | hẹn hò, độc thân, what to ask and how
- l40 CHECKPOINT 4. Work and money | lương, tiết kiệm, xài tiền, đi làm thêm, tốn; đủ / thiếu
- l41 Food culture of the Mekong delta, cooking | để / cho (let, leave it to)
- l42 Learning languages | the tandem's favourite topic: mistakes, practice, tức là, nghĩa là
- l43 Hán Việt II: technology, environment, city life | compounds and loanwords, word formation

### Phase 4, lessons 44 to 50: B1 in conversation

- l44 Germany, Vietnam, China compared, and what Vietnamese people ask about Germany | longer answers
- l45 Saigon idiom | for production: quá trời, dữ, hết sức, … gì đâu, … luôn; slang for recognition only (lesson pages, never practised): bao ngon, xạo, chảnh
- l46 Paraphrasing, buying time, repairing | thì, là, kiểu, cái, tức là, ý anh là
- l47 Storytelling II | a story with an opinion
- l48 Father II: family history, Cần Thơ and miền Tây | what to ask and what not
- l49 Plans and dreams | mong, ước gì, hy vọng, sẽ
- l50 CHECKPOINT 5, 30 minutes. Free conversation; whatever the check-ins flagged most.

### Notes from the review of 1 October 2026, for writing the lessons

- mấy has three uses (how many, for small numbers; a few; the colloquial plural, mấy đứa); các is the more formal plural.
- để: so that (l06), leave it to me (để anh trả); cho: a request or permission (cho anh hỏi); làm cho: make someone feel or do. Keep them apart in the notes.
- nghen reads older or Mekong; tandems in their twenties mostly write nha.
- Avoid bookish forms in production: thành rather than trở nên, không chỉ … mà còn rather than không những … mà còn.
- không and hông: negation in practised sentences stays không (careful speech); hông appears as the question-final particle (… hông?), which is ordinary Saigon speech, and in chat. Decided 1 Oct 2026, change it if a tandem disagrees.
- Open question for a tandem before lessons 10, 11 and 28 assert anything: do ên / êt follow -ng / -c in Saigon (lên like lơng, Tết like tấc)? Standard descriptions say yes; lesson 1 says the rule skips ê. Also whether tin and tinh really stay apart in careful speech.
- Mandarin bridges worth using: 已經 đã, 才 mới, 快要 sắp, 過 / 曾經 từng, 只要 miễn là, 要是…就好了 phải chi, 如果 / 萬一 nếu / lỡ.
- Texting abbreviations and Hán Việt decoding go into the lesson notes; the app only ever has whole spoken sentences.

Grammar coverage was checked against the tables of contents of three textbooks: Elementary Vietnamese (Binh Ngo, Tuttle), Colloquial Vietnamese (Bac Hoai Tran, Routledge) and Tiếng Việt cho người nước ngoài (Lê Thị Hiệp). Mike: grammar constructions are always welcome. All three are Northern at the core; every construction is taught in its Saigon form.

## Conventions for the material

- One sentence per row in `sentences.csv`, 3 to 12 syllables, always something a Saigon speaker in their twenties would actually say to a friend.
- Every Southern-specific word is marked in `pron_note` with its Northern equivalent once, so you recognise the Hanoi word when it turns up, but never produce it.
- `pron_note` is filled only where the Saigon pronunciation contradicts the spelling or a Mandarin or German habit would interfere. Empty means: read it as written.
- 漢字 only where the etymology is certain. Doubtful cases stay blank rather than guessing.
- Three layers in `pron_note`, in this order: what you say, what you will hear in Saigon, and what Hanoi does. The last two are recognition only and never enter the sentences practised in the app.
- The production target throughout is careful Saigon, not fast Saigon: qu keeps its k (quá, never wá), v stays v (về, never yề), s and x stay apart, tr and ch stay apart, r stays retroflex. This is a matter of care, not of dialect. Where the careful Saigon form happens to match Hanoi, as with qu, that is a coincidence of care and no reason to avoid it.
- What is Southern in the system itself is never touched, whatever "standard" is said to mean: d and gi are y and never z, r is retroflex and never z, the five tones stay with hỏi = ngã, and the Southern finals stay: -t becomes -c after rounded vowels (một = mộc), and the palatal -nh and -ch become -n and -t. That last one is not a full merger, because the vowel keeps the trace: anh is ăn, tinh is tưn, chính is chứn, so tin and tinh remain two words and careful speech keeps them apart. Undoing any of this would not be careful speech, it would be Northern speech, where the difference sits in the final consonant instead.
- Chinese glosses in Taiwan-register 繁體 with the Chinese comma, 你 not 您.
- When a tandem's correction and this material disagree on how something is said in Saigon, the tandem wins. Note it in `checkin.md`; the sentence gets fixed.

## How the audio is made

- Voice: your own v3 voice, `2vKhvfp40Pq0JeXGdL7F`, model `eleven_v3`, stability 1.0. Decided 18 Sep 2026 after a head to head against Minh and Anh PM from the library.
- Stability 1.0, not 0.5: at 0.5 the voice glued "cho anh" into one word. 1.0 keeps the syllables apart. v3 accepts only 0.0, 0.5 and 1.0.
- Saigon respelling: at the start of a syllable, d becomes y and gi becomes y before the voice sees the text. dạ is read as yạ, giờ as yờ. đ and gh are never touched, so đúng stays đúng and ghi stays ghi. The rule lives in `scripts/common.py`, function `saigon_respell`, and runs on every sentence automatically. The app always shows the correct spelling.
- Four sounds are beyond every voice on ElevenLabs (tested 19 Sep 2026): r comes out as z, tr and ch merge, s and x merge, and the vowel trace of the palatal finals after i and ê is missing. Respelling cannot fix them, because the alphabet has no second letter with the target value. The app dots every syllable with one of them and says on tap what you say instead.
- Every sentence file is generated once and reused when the sentence comes back in a later review, so nothing is paid for twice. v3 varies between generations, so a regenerated file sounds slightly different.

## Output format

- The app at the site root, decided 30 September 2026, replacing the week booklets. Phone first, English interface, progress synced between phone and Mac. Lesson introductions, notes, the searchable list of all sentences met, a listening mode started by hand, the tandem task and the check-in all live in it.
- The old HTML week booklet of week 1 stays online at /weeks/w01/ as an archive. The docx renderer and the booklet scripts are out of the routine.
