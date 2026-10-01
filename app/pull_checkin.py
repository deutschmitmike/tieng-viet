#!/usr/bin/env python3
"""Read Mike's app state from Firebase (read only) and bring the Friday check-ins into checkin.md.

    python3 app/pull_checkin.py

New check-ins are added to checkin.md (newest first, the file stays local, it is in .gitignore); a check-in that was
updated in the app later replaces its entry (the "saved:" line holds the app timestamp; hand-written entries have none).
Then it prints what the next lesson needs: the check-ins, the cards that needed "Again" most, the problem
cards, and how far each lesson is.
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from common import load_lesson_ids, load_sentences  # noqa: E402

URL = "https://ddd-spiel-default-rtdb.europe-west1.firebasedatabase.app/save/__tieng_viet/mike.json"
CHECKIN = ROOT / "checkin.md"


def main():
    with urllib.request.urlopen(URL, timeout=20) as r:
        S = json.loads(r.read().decode("utf-8")) or {}
    sent = load_sentences()
    vi = lambda i: sent[i]["vi"] if i in sent else i
    cards = S.get("cards") or {}
    checkins = S.get("checkins") or {}

    text = CHECKIN.read_text(encoding="utf-8") if CHECKIN.exists() else "# Check-ins\n\n---\n"
    head, sep, body = text.partition("\n---\n")
    if not sep:
        head, sep, body = text, "\n---\n", ""
    # existing entries by week key; an entry edited later in the app (newer ts) replaces the old one
    # every "## " block below the line: "## Week of DATE, lesson N" comes from the app and may be replaced;
    # "## Chat check-in DATE, lesson N" was written by hand from the chat and is never touched
    blocks = [x.strip("\n") for x in re.split(r"(?m)^(?=## )", body.strip("\n")) if x.strip()] if body.strip() else []
    entries, others = {}, []
    for b in blocks:
        m = re.match(r"## Week of (\S+?),", b)
        if m:
            entries[m.group(1)] = b
        else:
            others.append(b)
    changed = []
    for key in sorted(checkins):
        c = checkins[key]
        old = entries.get(key)
        if old:
            m = re.search(r"^saved: (\d+)", old, flags=re.M)
            if not m or int(m.group(1)) >= int(c.get("ts") or 0):
                continue   # written by hand, or nothing newer in the app
        again = ", ".join(f"{vi(i)} ({n})" for i, n in (c.get("again") or [])[:8]) or "none"
        entries[key] = (f"## Week of {key}, lesson {c.get('lesson', '?')}\n"
                        f"hard: {c.get('hard', '').strip()}\n"
                        f"used: {c.get('used', '').strip()}\n"
                        f"tandem said: {c.get('tandem', '').strip()}\n"
                        f"app, most Again: {again}\n"
                        f"saved: {int(c.get('ts') or 0)}")
        changed.append(key)
    if changed:
        date = lambda blk: (re.search(r"\d{4}-\d{2}-\d{2}", blk.split("\n", 1)[0]) or re.search("", "")).group(0)
        new_body = "\n\n".join(sorted(list(entries.values()) + others, key=date, reverse=True))
        CHECKIN.write_text(head + sep + "\n" + new_body + "\n", encoding="utf-8")
    print(f"check-ins in the app: {len(checkins)}, new or updated in checkin.md: {changed or 'none'}")

    # how far each lesson is (sound drills of lesson 1 are never practised and do not count)
    drills = set()
    l01 = ROOT / "lessons" / "l01.md"
    m = re.search(r"^drills:\s*(.+)$", l01.read_text(encoding="utf-8"), flags=re.M) if l01.exists() else None
    if m:
        order = list(sent)
        for part in [x.strip() for x in m.group(1).split(",") if x.strip()]:
            a, b = (int(x[1:]) for x in part.split("-")) if "-" in part else (int(part[1:]),) * 2
            drills |= {i for i in order if a <= int(i[1:]) <= b}
    print("\nlessons, sentences met / total:")
    for f in sorted((ROOT / "lessons").glob("l[0-9][0-9].md")):
        n = int(f.stem[1:])
        ids = [i for i in load_lesson_ids(n) if i not in drills]
        met = sum(1 for i in ids if i in cards)
        print(f"  lesson {n}: {met} / {len(ids)}" + ("  (complete)" if met == len(ids) else ""))

    for key in sorted(checkins, reverse=True)[:2]:
        c = checkins[key]
        print(f"\n== week of {key}\n  hard: {c.get('hard', '')}\n  used: {c.get('used', '')}\n  tandem said: {c.get('tandem', '')}")

    hard = sorted(((c.get("ag", 0), i) for i, c in cards.items() if c.get("ag")), reverse=True)[:15]
    print("\nmost Again overall:")
    for n, i in hard:
        print(f"  {i} {n}x  box {cards[i].get('box')}  {vi(i)}")
    leeches = [i for i, c in cards.items() if c.get("miss", 0) >= 5 and c.get("ok", 0) < 3]
    print("problem cards (5+ open misses):", ", ".join(f"{i} {vi(i)}" for i in leeches) or "none")
    days = S.get("days") or {}
    done = sorted(int(d) for d, g in days.items() if g and g.get("done"))
    mins = sum((g or {}).get("ms", 0) for g in days.values()) / 60000
    print(f"\ndays done: {len(done)}, minutes in total: {mins:.0f}, sentences met: {len(cards)}, sure (box 4+): {sum(1 for c in cards.values() if c.get('box', 0) >= 4)}")


if __name__ == "__main__":
    main()
