#!/usr/bin/env python3
"""Read Mike's app state from Firebase (read only) and bring the Friday check-ins into checkin.md.

    python3 app/pull_checkin.py

New check-ins are added at the top of checkin.md (newest first, the file stays local, it is in .gitignore).
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
from common import load_sentences  # noqa: E402

URL = "https://ddd-spiel-default-rtdb.europe-west1.firebasedatabase.app/save/__tieng_viet/mike.json"
CHECKIN = ROOT / "checkin.md"


def main():
    with urllib.request.urlopen(URL, timeout=20) as r:
        S = json.loads(r.read().decode("utf-8")) or {}
    sent = load_sentences()
    vi = lambda i: sent[i]["vi"] if i in sent else i
    cards = S.get("cards") or {}
    checkins = S.get("checkins") or {}

    text = CHECKIN.read_text(encoding="utf-8") if CHECKIN.exists() else "# Friday check-in\n\n---\n"
    added = []
    for key in sorted(checkins):
        if f"## Week of {key}" in text:
            continue
        c = checkins[key]
        again = ", ".join(f"{vi(i)} ({n})" for i, n in (c.get("again") or [])[:8]) or "none"
        entry = (f"## Week of {key}, lesson {c.get('lesson', '?')}\n"
                 f"hard: {c.get('hard', '').strip()}\n"
                 f"used: {c.get('used', '').strip()}\n"
                 f"tandem said: {c.get('tandem', '').strip()}\n"
                 f"app, most Again: {again}\n\n")
        added.append((key, entry))
    if added:
        head, sep, rest = text.partition("\n---\n")
        if not sep:
            head, sep, rest = text, "\n---\n", ""
        new = "".join(e for _, e in sorted(added, reverse=True))
        CHECKIN.write_text(head + sep + "\n" + new + rest.lstrip("\n"), encoding="utf-8")
    print(f"check-ins in the app: {len(checkins)}, newly written to checkin.md: {[k for k, _ in added] or 'none'}")

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
    print(f"\npractice days done: {len(done)}, minutes in total: {mins:.0f}, sentences met: {len(cards)}, sure (box 4+): {sum(1 for c in cards.values() if c.get('box', 0) >= 4)}")


if __name__ == "__main__":
    main()
