#!/usr/bin/env python3
"""Write the front page of the published course: index.html at the folder root.

  python3 scripts/render_index.py

One card per week that has a published booklet (weeks/wNN/index.html). On GitHub Pages
this is the page you open on the phone; a week is then at /weeks/w01/.
"""
import re
from datetime import date, timedelta

from common import ROOT, WEEKS_DIR, load_schedule, load_sentences

START = date(2026, 9, 21)          # Monday of week 1, see plan.md

CSS = """
:root{--orange:#EA5206;--grey:#555;--line:#ddd;--bg:#fff}
*{box-sizing:border-box}
body{font-family:-apple-system,"Helvetica Neue",Arial,"PingFang TC","Microsoft JhengHei",sans-serif;
  font-size:16px;line-height:1.55;color:#222;background:var(--bg);margin:0}
main{max-width:720px;margin:0 auto;padding:32px 20px 80px}
h1{font-size:30px;margin:0 0 6px;color:var(--orange)}
.sub{color:var(--grey);font-size:14.5px}
p{max-width:60ch}
a.week{display:block;text-decoration:none;color:inherit;border:1px solid var(--line);
  border-radius:10px;padding:13px 15px;margin-bottom:9px}
a.week:hover{border-color:var(--orange)}
a.week b{color:var(--orange);font-size:17px}
a.week .meta{display:block;color:var(--grey);font-size:13.5px;margin-top:2px}
.soon{border:1px dashed var(--line);border-radius:10px;padding:13px 15px;color:var(--grey);font-size:14px}
footer{margin-top:28px;color:var(--grey);font-size:13.5px}
"""


def main():
    sentences = load_sentences()
    weeks = []
    for wdir in sorted(WEEKS_DIR.glob("w[0-9][0-9]")):
        if not (wdir / "index.html").exists():
            continue
        n = int(wdir.name[1:])
        sched = load_schedule(n)
        brief = wdir / "brief.md"
        title = f"Week {n}"
        if brief.exists():
            m = re.search(r"^#\s+(.*)$", brief.read_text(encoding="utf-8"), re.M)
            if m:
                title = m.group(1).strip()
        new = sum(1 for s in sched if s["new"])
        monday = START + timedelta(weeks=n - 1)
        weeks.append((n, title, len(sched), new, monday))

    cards = []
    for n, title, slots, new, monday in weeks:
        cards.append(f'<a class="week" href="weeks/w{n:02d}/"><b>{title}</b>'
                     f'<span class="meta">from Monday {monday.strftime("%d %b %Y")} &middot; '
                     f'{slots} sentence slots, {new} new</span></a>')
    if not cards:
        cards.append('<div class="soon">No week published yet.</div>')

    html = (
        "<!doctype html><html lang='en'><head><meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'>"
        "<title>Tiếng Việt Sài Gòn</title>"
        f"<style>{CSS}</style></head><body><main>"
        "<h1>Tiếng Việt Sài Gòn</h1>"
        "<p class='sub'>Mike's own course, Saigon accent only, Monday to Friday, one hour a day. "
        f"{len(sentences)} sentences recorded so far.</p>"
        "<p>Open a week and study from the page: every sentence has Play, 0.8x and Loop, "
        "and each day has a button that walks the whole day, once for listening and once for echoing "
        "with a pause for your turn.</p>"
        + "".join(cards) +
        "<footer>The r is the one sound the voice gets wrong: it says a z, you say the Mandarin 日. "
        "Everything else is Saigon, including the y in dạ and gì.</footer>"
        "</main></body></html>\n")
    out = ROOT / "index.html"
    out.write_text(html, encoding="utf-8")
    print(f"wrote index.html ({len(weeks)} week(s) published)")


if __name__ == "__main__":
    main()
