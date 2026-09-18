#!/usr/bin/env python3
"""Assemble the daily tracks from the per-sentence files with ffmpeg.

Usage:
  python3 scripts/build_day.py --week 1            # all five days
  python3 scripts/build_day.py --week 1 --day 2    # one day

Per day two files land in weeks/wNN/audio/:
  wNN_dD_listen.mp3   every sentence once, short gap. For the 10-minute listen-only block.
  wNN_dD_echo.mp3     sentence, pause (1.2 x its length + 0.5 s) for your echo, sentence again, pause again, gap.
                      For the shadowing and echo blocks.

Needs ffmpeg and ffprobe on the PATH. Sentences with no audio file yet are reported and skipped.
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

from common import load_schedule, load_sentences, load_voices, sentence_audio, week_dir


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


def build(items, out_path, mode):
    """items: list of (id, path, duration). mode: 'listen' or 'echo'."""
    inputs = []      # ffmpeg -i arguments
    labels = []      # filter labels in order
    filters = []

    def add_file(p):
        idx = len(inputs)
        inputs.append(["-i", str(p)])
        filters.append(f"[{idx}:a]aformat=sample_rates=44100:channel_layouts=mono[a{idx}]")
        labels.append(f"[a{idx}]")

    def add_silence(sec):
        idx = len(inputs)
        inputs.append(["-f", "lavfi", "-t", f"{sec:.2f}", "-i", "anullsrc=r=44100:cl=mono"])
        filters.append(f"[{idx}:a]aformat=sample_rates=44100:channel_layouts=mono[a{idx}]")
        labels.append(f"[a{idx}]")

    add_silence(1.0)  # lead-in
    for sid, p, dur in items:
        if mode == "listen":
            add_file(p)
            add_silence(0.9)
        else:
            add_file(p)
            add_silence(dur * 1.2 + 0.5)   # first echo
            add_file(p)
            add_silence(dur * 1.2 + 0.5)   # second echo, now matching what you just heard
            add_silence(0.6)

    concat = "".join(labels) + f"concat=n={len(labels)}:v=0:a=1[out]"
    filter_complex = ";".join(filters + [concat])
    cmd = ["ffmpeg", "-y", "-v", "error"]
    for i in inputs:
        cmd += i
    cmd += ["-filter_complex", filter_complex, "-map", "[out]",
            "-c:a", "libmp3lame", "-b:a", "128k", "-ar", "44100", "-ac", "1", str(out_path)]
    subprocess.run(cmd, check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--week", type=int, required=True)
    ap.add_argument("--day", type=int)
    args = ap.parse_args()

    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        sys.exit("ffmpeg/ffprobe not found on PATH (brew install ffmpeg)")

    sentences = load_sentences()
    voices = load_voices()
    days = [args.day] if args.day else [1, 2, 3, 4, 5]
    out_dir = week_dir(args.week) / "audio"
    out_dir.mkdir(parents=True, exist_ok=True)
    copy_to = voices.get("copy_tracks_to")

    for day in days:
        sched = load_schedule(args.week, day)
        if not sched:
            print(f"week {args.week} day {day}: nothing scheduled")
            continue
        items, missing = [], []
        for s in sched:
            p = sentence_audio(s["id"])
            if not p.exists():
                missing.append(s["id"])
                continue
            items.append((s["id"], p, duration(p)))
        if missing:
            print(f"week {args.week} day {day}: missing audio for {', '.join(missing)} (run generate_audio.py)")
        if not items:
            continue
        for mode in ("listen", "echo"):
            out = out_dir / f"w{args.week:02d}_d{day}_{mode}.mp3"
            build(items, out, mode)
            total = duration(out)
            print(f"wrote {out.relative_to(out.parents[3])}  {total/60:.1f} min, {len(items)} sentences")
            if copy_to:
                dest = Path(copy_to).expanduser()
                dest.mkdir(parents=True, exist_ok=True)
                shutil.copy2(out, dest / out.name)


if __name__ == "__main__":
    main()
