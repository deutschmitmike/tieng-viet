"""Shared helpers for the tieng-viet pipeline. Stdlib only."""
import csv
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SENTENCES = ROOT / "sentences.csv"
SCHEDULE = ROOT / "schedule.csv"
VOICES = ROOT / "voices.json"
ENV = ROOT / "scripts" / ".env"
AUDIO_DIR = ROOT / "audio" / "sentences"
WEEKS_DIR = ROOT / "weeks"


def load_env():
    """Read KEY=VALUE lines from scripts/.env into os.environ (no dependency on python-dotenv)."""
    if not ENV.exists():
        return
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def read_pipe_csv(path):
    with open(path, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f, delimiter="|"))


def load_sentences():
    rows = read_pipe_csv(SENTENCES)
    by_id = {}
    for r in rows:
        sid = r["id"].strip()
        if not sid:
            continue
        if sid in by_id:
            sys.exit(f"duplicate id in sentences.csv: {sid}")
        by_id[sid] = {k: (v or "").strip() for k, v in r.items()}
    return by_id


def load_schedule(week=None, day=None):
    rows = read_pipe_csv(SCHEDULE)
    out = []
    for r in rows:
        w = int(r["week"])
        d = int(r["day"])
        if week is not None and w != week:
            continue
        if day is not None and d != day:
            continue
        out.append({
            "week": w,
            "day": d,
            "pos": int(r["pos"]),
            "id": r["id"].strip(),
            "new": r["new"].strip() == "1",
        })
    out.sort(key=lambda x: (x["week"], x["day"], x["pos"]))
    return out


def load_voices():
    if not VOICES.exists():
        sys.exit("voices.json missing")
    return json.loads(VOICES.read_text(encoding="utf-8"))


def voice_for_week(voices, week):
    """Primary voice by default; alternate voice on the weeks named in voices.json."""
    alt = voices.get("alternate")
    if alt and alt.get("voice_id"):
        rule = voices.get("alternate_weeks", "even")
        if rule == "even" and week % 2 == 0:
            return alt
        if rule == "odd" and week % 2 == 1:
            return alt
    return voices["primary"]


def week_dir(week):
    return WEEKS_DIR / f"w{week:02d}"


def sentence_audio(sid):
    return AUDIO_DIR / f"{sid}.mp3"


# --- Saigon respelling for the TTS -------------------------------------------
# Every Vietnamese voice on ElevenLabs reads d and gi the northern way, as a
# German z. In the South both are [j], the y in "ja". y is a real Vietnamese
# letter with exactly that value, so writing yA where the spelling has dA makes
# the voice say it correctly. Only the voice ever sees this string; the booklet
# always shows the correct spelling from the vi column.
#
# r cannot be fixed this way. The retroflex Saigon r has no second letter in
# the alphabet, so the voice keeps saying z there. That is a known deviation,
# noted in the daily briefs: you hear z, you say the Mandarin 日.

_I_LETTERS = "iíìỉĩị"          # i with every tone mark
_VOWEL_BASES = set("aăâeêioôơuưy")


def _base_letter(ch):
    """Strip the tone/diacritic layer: ấ -> a, ữ -> u, đ stays đ."""
    return unicodedata.normalize("NFD", ch)[0].lower()


def _is_vowel(ch):
    return _base_letter(ch) in _VOWEL_BASES


def _respell_token(tok):
    first = tok[0]
    low = first.lower()
    # đ is a different letter and never changes.
    if low == "d":
        y = "Y" if first.isupper() else "y"
        return y + tok[1:]
    if low == "g" and len(tok) > 1 and tok[1] in _I_LETTERS:
        # gh is untouched: its second letter is h, not i.
        y = "Y" if first.isupper() else "y"
        # gio, gia, giu: the i is only the digraph, the vowel follows -> drop it.
        if tok[1] == "i" and len(tok) > 2 and _is_vowel(tok[2]):
            return y + tok[2:]
        # gi, gin: the i carries the tone and is the vowel -> keep it.
        return y + tok[1:]
    return tok


_TOKEN = re.compile(r"[^\W\d_]+", re.UNICODE)


def saigon_respell(text):
    """dA -> yA and giA -> yA at the start of every syllable. Nothing else moves."""
    return _TOKEN.sub(lambda m: _respell_token(m.group(0)), text)


# --- keeping two syllables apart ----------------------------------------------
# v3 sometimes swallows the boundary between a syllable ending in a vowel and the
# next one starting with a vowel: "cho anh" came out as one word, "choang". The
# setting does not fix it reliably, because v3 varies between generations of the
# same text. A comma does, and only the voice ever sees it: the booklet keeps the
# sentence as written. Add a pair here when you hear one glued together.

# Empty on purpose, decided 18 Sep 2026: the plain sentence was good enough once it
# was recorded again, so the material keeps its natural phrasing. If a sentence comes
# out glued, first regenerate it with --force; only if it stays glued add the pair here.
_GLUE_FIXES = []


def split_glue(text):
    """Put a comma inside the syllable pairs the voice tends to glue together."""
    for pair, fixed in _GLUE_FIXES:
        for src, dst in ((pair, fixed), (pair.capitalize(), fixed.capitalize())):
            text = text.replace(src, dst)
    return text


def tts_text(s):
    """Text sent to the TTS: the tts column wins, otherwise the respelled vi."""
    override = s.get("tts")
    if override:
        return override
    return split_glue(saigon_respell(s["vi"]))
