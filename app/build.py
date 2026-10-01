#!/usr/bin/env python3
"""Build the app: index.html (the site root) and version.json, from app/shell.html, app/core.js, app/ui.js,
sentences.csv and lessons/lNN.md. Runs the checks and the tests first; on any error nothing is written.

    python3 app/build.py

The version number lives in BUILD (format YYYY-MM-DD-N). Count it up before every deploy.
"""
import html
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from common import load_sentences, load_schedule, AUDIO_DIR  # noqa: E402

APP = ROOT / "app"
LESSONS = ROOT / "lessons"
errors = []


def err(msg):
    errors.append(msg)


# ---------- a small markdown converter: headings, paragraphs, lists, tables, bold, italics, code, @@play ----------
def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<i>\1</i>", s)
    s = re.sub(r"`(.+?)`", r"<code>\1</code>", s)
    return s


def md(text, sent):
    out, para, lst, table = [], [], [], []

    def flush():
        nonlocal para, lst, table
        if para:
            out.append("<p>" + inline(" ".join(para)) + "</p>")
        if lst:
            out.append("<ul>" + "".join("<li>" + inline(x) + "</li>" for x in lst) + "</ul>")
        if table:
            rows = [r for r in table if not re.fullmatch(r"\|?\s*:?-{2,}.*", r)]
            cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
            h = "<tr>" + "".join("<th>" + inline(c) + "</th>" for c in cells[0]) + "</tr>"
            b = "".join("<tr>" + "".join("<td>" + inline(c) + "</td>" for c in r) + "</tr>" for r in cells[1:])
            out.append('<div class="tw"><table>' + h + b + "</table></div>")
        para, lst, table = [], [], []

    for line in text.splitlines():
        s = line.rstrip()
        if not s.strip():
            flush()
        elif s.startswith("@@play"):
            flush()
            ids = s.split()[1:]
            for i in ids:
                if i not in sent:
                    err(f"@@play: unknown id {i}")
            out.append("<p>" + "".join(f'<button class="pl" data-id="{i}"></button>' for i in ids) + "</p>")
        elif s.startswith("### ") or s.startswith("## "):
            flush()
            out.append("<h3>" + inline(s.lstrip("#").strip()) + "</h3>")
        elif s.startswith("|"):
            if para or lst:
                flush()
            table.append(s)
        elif re.match(r"^\s*[-*] ", s):
            if para or table:
                flush()
            lst.append(re.sub(r"^\s*[-*] ", "", s))
        elif lst and s.startswith("  "):
            lst[-1] += " " + s.strip()
        else:
            if lst or table:
                flush()
            para.append(s.strip())
    flush()
    return "\n".join(out)


# ---------- lessons ----------
def expand(spec, all_ids):
    """'s0001-s0010, s0120' -> ids, ranges in csv order."""
    order = list(all_ids)
    ids = []
    for part in [p.strip() for p in spec.split(",") if p.strip()]:
        if "-" in part:
            a, b = part.split("-")
            if a not in all_ids or b not in all_ids:
                err(f"range {part}: unknown id")
                continue
            na, nb = int(a[1:]), int(b[1:])
            ids += [i for i in order if na <= int(i[1:]) <= nb]
        else:
            if part not in all_ids:
                err(f"unknown id {part}")
            ids.append(part)
    return ids


def parse_lesson(path, sent):
    text = path.read_text(encoding="utf-8")
    head, *pages = re.split(r"^== ", text, flags=re.M)
    m = re.match(r"#\s*Lesson\s+(\d+):\s*(.+)", head.strip())
    if not m:
        err(f"{path.name}: first line must be '# Lesson N: Title'")
        return None
    n, title = int(m.group(1)), m.group(2).strip()
    meta = dict(re.findall(r"^(\w+):\s*(.+)$", head, flags=re.M))
    ids = expand(meta.get("ids", ""), sent)
    drills = set(expand(meta.get("drills", ""), sent))
    for d in drills:
        if d not in ids:
            err(f"{path.name}: drill {d} is not in ids")
    L = {"key": f"l{n:02d}", "n": n, "title": title, "ids": ids, "drills": sorted(drills), "pages": [], "tandem": ""}
    for p in pages:
        t, _, body = p.partition("\n")
        t = t.strip()
        if t.lower() == "tandem":
            L["tandem"] = md(body, sent)
        else:
            L["pages"].append({"t": t, "h": md(body, sent)})
    if not L["pages"]:
        err(f"{path.name}: no pages")
    if not L["tandem"]:
        err(f"{path.name}: no '== Tandem' page")
    if meta.get("start") == "schedule":   # lesson 1: studied on paper first, start days from the old booklet
        days = {r["id"]: r["day"] for r in load_schedule(week=n) if r["new"]}
        L["startDay"] = {i: days.get(i, 5) for i in ids}
    return L


def main():
    sent_rows = load_sentences()
    lessons = []
    for p in sorted(LESSONS.glob("l[0-9][0-9].md")):
        L = parse_lesson(p, sent_rows)
        if L:
            lessons.append(L)
    if not lessons:
        err("no lessons in lessons/")
    nums = [L["n"] for L in lessons]
    if nums != list(range(1, len(lessons) + 1)):
        err(f"lesson numbers must run 1, 2, 3 ...: {nums}")

    seen = {}
    for L in lessons:
        for i in L["ids"]:
            if i in seen:
                err(f"{i} is in lesson {seen[i]} and lesson {L['n']}")
            seen[i] = L["n"]
            if not (AUDIO_DIR / f"{i}.mp3").exists():
                err(f"{i}: no audio file audio/sentences/{i}.mp3 (run scripts/generate_audio.py)")

    drills = {d for L in lessons for d in L["drills"]}
    sent = {}
    for i in seen:
        r = sent_rows[i]
        sent[i] = {"vi": r["vi"], "note": r["pron_note"], "hz": r["hanzi"], "en": r["en"], "zh": r["zh"], "kind": "d" if i in drills else "s"}

    # visible text: no em dashes, Chinese comma inside Chinese text
    blob = json.dumps({"s": sent, "l": lessons}, ensure_ascii=False)
    if "—" in blob:
        err("em dash found in the visible text")
    for i, s in sent.items():
        if re.search(r"[一-鿿],|,[一-鿿]", s["zh"]):
            err(f"{i}: ASCII comma next to Chinese in zh")
        if not s["en"] or not s["zh"]:
            err(f"{i}: gloss missing")
    respelled = re.compile(r"\by[ạàảãáaờởớợơ]\b")
    for L in lessons:
        for p in L["pages"]:
            if respelled.search(re.sub("<[^>]+>", " ", p["h"])):
                err(f"lesson {L['n']}, page {p['t']}: respelled form in the text")

    build = (ROOT / "BUILD").read_text().strip()
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}-\d+", build):
        err(f"BUILD has the wrong format: {build}")

    if errors:
        print("BUILD STOPPED, nothing written:")
        for e in errors:
            print("  -", e)
        sys.exit(1)

    data = {"sent": sent, "lessons": lessons}
    (APP / "tests" / "data.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    t = subprocess.run(["node", str(APP / "tests" / "test_core.js")], capture_output=True, text=True)
    print(t.stdout.strip())
    if t.returncode != 0:
        print(t.stderr.strip())
        print("TESTS FAILED, nothing written.")
        sys.exit(1)

    core = (APP / "core.js").read_text(encoding="utf-8")
    ui = (APP / "ui.js").read_text(encoding="utf-8")
    shell = (APP / "shell.html").read_text(encoding="utf-8")
    page = (shell.replace("%%BUILD%%", build)
            .replace("%%DATA%%", json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"))
            .replace("%%CORE%%", "const CORE = (function () {\n" + core + "\nreturn CORE;\n})();")
            .replace("%%UI%%", ui))
    # the whole page script must parse, or Mike gets a blank page
    chk = APP / "tests" / "page_check.js"
    chk.write_text(page.split("<script>", 1)[1].rsplit("</script>", 1)[0], encoding="utf-8")
    r = subprocess.run(["node", "--check", str(chk)], capture_output=True, text=True)
    chk.unlink()
    if r.returncode != 0:
        print(r.stderr.strip())
        print("PAGE SCRIPT DOES NOT PARSE, nothing written.")
        sys.exit(1)
    (ROOT / "index.html").write_text(page, encoding="utf-8")
    (ROOT / "version.json").write_text(json.dumps({"build": build}) + "\n", encoding="utf-8")
    n_d = sum(1 for s in sent.values() if s["kind"] == "d")
    print(f"built {build}: {len(lessons)} lesson(s), {len(sent)} items ({len(sent) - n_d} sentences, {n_d} sound drills), index.html {len(page) // 1024} KB")


if __name__ == "__main__":
    main()
