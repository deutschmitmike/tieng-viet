#!/usr/bin/env python3
"""Write the readable day files from sentences.csv + schedule.csv.

Usage:
  python3 scripts/render_day.py --week 1            # all days of week 1
  python3 scripts/render_day.py --week 1 --day 4

For each day it writes into weeks/wNN/:
  dD.md         the notes for the day (from weeks/wNN/notes/dD.md, if present) followed by the sentence list
  dD_gloss.md   English and Chinese only, no Vietnamese. For the echo-from-gloss block.

The notes file is the hand-written part, the sentence list is generated. Edit sentences.csv, not dD.md.
"""
import argparse

from common import load_schedule, load_sentences, week_dir


def render_sentence(n, s, new):
    mark = "" if new else "  ↺"
    lines = [f"{n}. **{s['vi']}**{mark}  `{s['id']}`"]
    lines.append(f"   {s['en']}")
    if s.get("zh"):
        lines.append(f"   {s['zh']}")
    extras = []
    if s.get("hanzi"):
        extras.append(f"漢字 {s['hanzi']}")
    if s.get("pron_note"):
        extras.append(f"🔊 {s['pron_note']}")
    if extras:
        lines.append("   " + "  ·  ".join(extras))
    return "\n".join(lines)


def render_gloss(n, s):
    zh = f"  ·  {s['zh']}" if s.get("zh") else ""
    return f"{n}. {s['en']}{zh}  `{s['id']}`"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--week", type=int, required=True)
    ap.add_argument("--day", type=int)
    args = ap.parse_args()

    sentences = load_sentences()
    wdir = week_dir(args.week)
    wdir.mkdir(parents=True, exist_ok=True)
    days = [args.day] if args.day else [1, 2, 3, 4, 5]

    for day in days:
        sched = load_schedule(args.week, day)
        if not sched:
            continue
        notes_path = wdir / "notes" / f"d{day}.md"
        notes = notes_path.read_text(encoding="utf-8").rstrip() + "\n\n" if notes_path.exists() else f"# Week {args.week}, day {day}\n\n"

        new_count = sum(1 for s in sched if s["new"])
        body = [notes, f"## Sentences ({len(sched)}, {new_count} new, {len(sched) - new_count} recycled ↺)\n",
                f"Audio: `audio/w{args.week:02d}_d{day}_listen.mp3` and `audio/w{args.week:02d}_d{day}_echo.mp3`. "
                f"Single sentences: `../../audio/sentences/<id>.mp3`.\n"]
        gloss = [f"# Week {args.week}, day {day}: gloss only\n",
                 "Say the Vietnamese out loud from the meaning, then check against the echo track.\n"]
        for n, item in enumerate(sched, 1):
            s = sentences.get(item["id"])
            if s is None:
                raise SystemExit(f"{item['id']} missing in sentences.csv")
            body.append(render_sentence(n, s, item["new"]))
            gloss.append(render_gloss(n, s))
        (wdir / f"d{day}.md").write_text("\n\n".join(body) + "\n", encoding="utf-8")
        (wdir / f"d{day}_gloss.md").write_text("\n".join(gloss) + "\n", encoding="utf-8")
        print(f"wrote weeks/w{args.week:02d}/d{day}.md and d{day}_gloss.md ({len(sched)} sentences)")


if __name__ == "__main__":
    main()
