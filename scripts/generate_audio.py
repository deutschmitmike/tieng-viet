#!/usr/bin/env python3
"""Generate one mp3 per sentence with ElevenLabs.

Usage:
  python3 scripts/generate_audio.py --lesson 2          # all sentences of lessons/l02.md (the normal case)
  python3 scripts/generate_audio.py --lesson 2 --dry-run  # show what would be generated, spend nothing
  python3 scripts/generate_audio.py --week 1            # old: all sentences scheduled in week 1
  python3 scripts/generate_audio.py --week 1 --day 3    # one day
  python3 scripts/generate_audio.py --ids s0001 s0002   # specific ids
  python3 scripts/generate_audio.py --week 1 --dry-run  # show what would be generated
  python3 scripts/generate_audio.py --week 1 --force    # regenerate even if the file exists

Existing files are skipped, so a sentence is never paid for twice.
The API key is read from scripts/.env (ELEVENLABS_API_KEY=...).
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

from common import (AUDIO_DIR, load_env, load_lesson_ids, load_schedule, load_sentences,
                    load_voices, sentence_audio, tts_text, voice_for_week)

API = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"


def synthesize(text, voice, api_key):
    settings = {
        "stability": voice.get("stability", 0.5),
        "similarity_boost": voice.get("similarity_boost", 0.75),
        "style": voice.get("style", 0.0),
        "use_speaker_boost": voice.get("use_speaker_boost", True),
    }
    if "speed" in voice:          # eleven_v3 rejects speed; only send it when asked for
        settings["speed"] = voice["speed"]
    body = {
        "text": text,
        "model_id": voice.get("model_id", "eleven_multilingual_v2"),
        "voice_settings": settings,
    }
    # language_code is only accepted by the Turbo/Flash v2.5 models; multilingual_v2 rejects it.
    if voice.get("language_code"):
        body["language_code"] = voice["language_code"]
    req = urllib.request.Request(
        API.format(voice_id=voice["voice_id"]),
        data=json.dumps(body).encode("utf-8"),
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lesson", type=int, help="all ids of lessons/lNN.md")
    ap.add_argument("--week", type=int)
    ap.add_argument("--day", type=int)
    ap.add_argument("--ids", nargs="*")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--sleep", type=float, default=0.4, help="pause between requests in seconds")
    args = ap.parse_args()

    load_env()
    sentences = load_sentences()
    voices = load_voices()

    if args.ids:
        ids = args.ids
        week = args.week or args.lesson or 1
    elif args.lesson:
        ids = load_lesson_ids(args.lesson)
        week = args.lesson
    elif args.week:
        ids = [s["id"] for s in load_schedule(args.week, args.day)]
        week = args.week
    else:
        sys.exit("give --lesson N, --week N or --ids ...")

    # keep order, drop duplicates (a sentence recycled on two days of the same week)
    seen, todo = set(), []
    for sid in ids:
        if sid in seen:
            continue
        seen.add(sid)
        if sid not in sentences:
            sys.exit(f"{sid} is in the lesson or schedule but not in sentences.csv")
        if sentence_audio(sid).exists() and not args.force:
            continue
        todo.append(sid)

    voice = voice_for_week(voices, week)
    print(f"{len(seen)} sentences scheduled, {len(todo)} to generate, voice {voice.get('name', voice['voice_id'])}")
    if args.dry_run:
        for sid in todo:
            print(f"  {sid}  {tts_text(sentences[sid])}")
        return

    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        sys.exit("ELEVENLABS_API_KEY not found. Put it in scripts/.env")

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    for i, sid in enumerate(todo, 1):
        text = tts_text(sentences[sid])
        out = sentence_audio(sid)
        for attempt in range(3):
            try:
                data = synthesize(text, voice, api_key)
                out.write_bytes(data)
                print(f"[{i}/{len(todo)}] {sid}  {text}")
                break
            except urllib.error.HTTPError as e:
                msg = e.read().decode("utf-8", "replace")[:300]
                print(f"  HTTP {e.code} on {sid}: {msg}")
                if e.code in (401, 402, 422):
                    sys.exit("stopping: fix the key, credits or request and rerun")
                time.sleep(3 * (attempt + 1))
            except Exception as e:  # network hiccup
                print(f"  error on {sid}: {e}")
                time.sleep(3 * (attempt + 1))
        else:
            print(f"  gave up on {sid}, rerun later")
        time.sleep(args.sleep)


if __name__ == "__main__":
    main()
