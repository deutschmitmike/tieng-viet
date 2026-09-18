#!/usr/bin/env python3
"""Write the week booklet as one HTML page with built-in audio players: weeks/wNN/wNN.html

  python3 scripts/render_week_html.py --week 1

Double-click the file, it opens in the browser, every sentence has a play button, a loop toggle and a
slow button; the two daily tracks sit at the top of each day. Works offline, no server, no app.
Same sources as the docx: sentences.csv, schedule.csv, notes/*.md, brief.md.
"""
import argparse
import base64
import html
import re

from common import AUDIO_DIR, load_schedule, load_sentences, week_dir

EMBED = True           # the sentence mp3s are baked into the page, so it plays anywhere
PAGES = False          # --pages: the version that gets published, written to weeks/wNN/index.html

CSS = """
:root{--orange:#EA5206;--grey:#555;--light:#f4f4f4;--blue:#1155CC;--btn:#e8f0fe;--line:#ddd}
*{box-sizing:border-box}
body{font-family:-apple-system,"Helvetica Neue",Arial,"PingFang TC","Microsoft JhengHei",sans-serif;font-size:15px;line-height:1.5;color:#222;margin:0;background:#fff}
main{max-width:980px;margin:0 auto;padding:24px 28px 80px}
h1{color:var(--orange);font-size:30px;margin:36px 0 10px}
h2{font-size:21px;margin:26px 0 8px;color:#222}
h3{font-size:17px;margin:20px 0 6px;color:var(--grey)}
p{margin:8px 0}
code{font-family:Menlo,monospace;font-size:13px;color:var(--grey);background:var(--light);padding:1px 4px;border-radius:3px}
pre{background:var(--light);padding:10px 12px;border-radius:6px;font-size:13px;overflow-x:auto}
table{border-collapse:collapse;width:100%;margin:10px 0 16px}
th,td{border:1px solid var(--line);padding:7px 9px;vertical-align:top;text-align:left}
th{background:var(--light);font-size:13px}
td.vi{font-size:20px;font-weight:700;width:34%}
td.mean{width:34%}
td.notes{font-size:12.5px;color:var(--grey);width:22%}
td.num{font-size:12px;color:#888;white-space:nowrap;width:1%}
td.num .id{display:block;font-size:10px;color:#aaa}
.zh{display:block;color:#333}
.hanzi{display:block;color:#222;margin-bottom:3px}
.rec{color:var(--orange)}
td.play{white-space:nowrap;width:1%}
button{font:inherit;cursor:pointer;border:1px solid #c9d7f5;background:var(--btn);color:var(--blue);border-radius:6px;padding:5px 9px;margin:0 2px 2px 0;font-weight:600}
button:hover{background:#d7e3fb}
button.on{background:var(--blue);color:#fff}
button.big{font-size:16px;padding:9px 14px}
.tracks{display:flex;gap:14px;flex-wrap:wrap;margin:10px 0 6px}
.track{flex:1 1 320px;background:var(--btn);border:1px solid #c9d7f5;border-radius:8px;padding:10px 12px}
.track b{display:block;color:var(--blue);margin-bottom:6px}
.track audio{width:100%}
.track .sub{display:block;font-size:12.5px;color:var(--grey);margin-top:6px}
button.dayrun{width:100%;padding:9px 12px;font:inherit;font-weight:600;cursor:pointer;
  background:#fff;border:1px solid #c9d7f5;border-radius:7px;color:var(--blue)}
button.dayrun.on{background:var(--orange);border-color:var(--orange);color:#fff}
.hint{font-size:12.5px;color:var(--grey)}
nav{position:sticky;top:0;background:#fff;border-bottom:1px solid var(--line);padding:8px 28px;z-index:5;font-size:14px}
nav a{margin-right:14px;color:var(--blue);text-decoration:none;font-weight:600}
.cover{margin-top:40px}
.cover .sub{color:var(--grey)}

"""

JS = """
let current=null, loops=new Set();
function play(id, rate){
  const a=document.getElementById('a_'+id);
  if(current && current!==a){current.pause();current.currentTime=0;}
  current=a; a.playbackRate=rate||1; a.loop=loops.has(id); a.currentTime=0; a.play();
}
function toggleLoop(id, btn){
  if(loops.has(id)){loops.delete(id);btn.classList.remove('on');}else{loops.add(id);btn.classList.add('on');}
  const a=document.getElementById('a_'+id); a.loop=loops.has(id); if(a.paused){play(id,1);}
}
let dayRun=null;
function wait(ms){return new Promise(r=>{dayRun.timer=setTimeout(r,ms);});}
function once(a){return new Promise(r=>{a.onended=r;a.currentTime=0;a.playbackRate=1;a.play();});}
async function runDay(btn, ids, echo){
  if(dayRun){                                 // laeuft schon: aus
    const old=dayRun; dayRun=null;
    clearTimeout(old.timer); if(old.audio){old.audio.pause();old.audio.onended=null;}
    old.btn.textContent='Start'; old.btn.classList.remove('on');
    if(old.btn===btn) return;
  }
  const run={btn:btn,audio:null,timer:null}; dayRun=run;
  btn.textContent='Stop'; btn.classList.add('on');
  for(const id of ids){
    if(dayRun!==run) return;
    const a=document.getElementById('a_'+id); run.audio=a;
    const row=a.closest('tr'); if(row) row.scrollIntoView({block:'center',behavior:'smooth'});
    await once(a); if(dayRun!==run) return;
    if(echo){
      const gap=(a.duration||2)*1200+500;     // deine Sprechpause, etwas laenger als der Satz
      await wait(gap); if(dayRun!==run) return;
      await once(a); if(dayRun!==run) return;
      await wait(gap);
    } else { await wait(250); }
    if(dayRun!==run) return;
  }
  if(dayRun===run){dayRun=null;btn.textContent='Start';btn.classList.remove('on');}
}
function toggleVi(btn){
  const box=btn.closest('.gloss'); box.classList.toggle('vihidden');
  btn.textContent=box.classList.contains('vihidden')?'Show Vietnamese':'Hide Vietnamese';
}
"""


def esc(t):
    return html.escape(t, quote=False)


def inline(t):
    t = esc(t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    return t


def md_to_html(md, sentences, skip_h1=False):
    out, lines, i = [], md.split("\n"), 0
    while i < len(lines):
        l = lines[i]
        if not l.strip():
            i += 1
            continue
        if l.startswith("```"):
            buf = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                buf.append(esc(lines[i]))
                i += 1
            i += 1
            out.append("<pre>" + "\n".join(buf) + "</pre>")
            continue
        m = re.match(r"^(#{1,3})\s+(.*)$", l)
        if m:
            lvl = len(m.group(1))
            if not (skip_h1 and lvl == 1):
                out.append(f"<h{lvl}>{inline(m.group(2))}</h{lvl}>")
            i += 1
            continue
        if l.startswith("@@play "):
            ids = l[7:].split()
            out.append(sentence_table([{"id": x, "new": True} for x in ids], sentences))
            i += 1
            continue
        if l.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append(lines[i])
                i += 1
            rows = [r for r in rows if not re.match(r"^\|\s*-+", r)]
            cells = [[c.strip() for c in r.strip("|").split("|")] for r in rows]
            t = ["<table>"]
            for ri, r in enumerate(cells):
                tag = "th" if ri == 0 else "td"
                t.append("<tr>" + "".join(f"<{tag}>{inline(c)}</{tag}>" for c in r) + "</tr>")
            t.append("</table>")
            out.append("".join(t))
            continue
        if re.match(r"^[-*]\s+", l):
            items = []
            while i < len(lines) and re.match(r"^[-*]\s+", lines[i]):
                item = re.sub(r"^[-*]\s+", "", lines[i])
                items.append("<li>" + inline(item) + "</li>")
                i += 1
            out.append("<ul>" + "".join(items) + "</ul>")
            continue
        buf = []
        while i < len(lines) and lines[i].strip() and not re.match(r"^(#{1,3})\s|^\||^[-*]\s|^```|^@@", lines[i]):
            buf.append(lines[i])
            i += 1
        out.append("<p>" + inline(" ".join(buf)) + "</p>")
    return "\n".join(out)


def audio_src(sid):
    """Relative path by default; with --embed the mp3 itself, so the page plays anywhere."""
    if not EMBED:
        return f"../../audio/sentences/{sid}.mp3"
    data = base64.b64encode((AUDIO_DIR / f"{sid}.mp3").read_bytes()).decode()
    return "data:audio/mpeg;base64," + data


_EMITTED = set()


def audio_tag(sid):
    """One audio element per sentence per page; a recycled sentence reuses it."""
    if sid in _EMITTED:
        return ""
    _EMITTED.add(sid)
    return f'<audio id="a_{sid}" preload="none" src="{audio_src(sid)}"></audio>'


def play_buttons(sid):
    return (f'<button onclick="play(\'{sid}\',1)">&#9654;&#xFE0E; Play</button>'
            f'<button onclick="play(\'{sid}\',0.8)" title="slower">0.8x</button>'
            f'<button onclick="toggleLoop(\'{sid}\',this)" title="repeat until you press again">Loop</button>')


def sentence_table(items, sentences, gloss=False):
    rows = []
    for n, it in enumerate(items, 1):
        s = sentences[it["id"]]
        rec = "" if it["new"] else ' <span class="rec">&#8635;</span>'
        notes = ""
        if s["hanzi"]:
            notes += f'<span class="hanzi">{esc(s["hanzi"])}</span>'
        if s["pron_note"]:
            notes += esc(s["pron_note"])
        zh = f'<span class="zh">{esc(s["zh"])}</span>' if s["zh"] else ""
        vi_cls = "vi"
        rows.append(
            f'<tr><td class="num">{n}{rec}<span class="id">{s["id"]}</span></td>'
            f'<td class="{vi_cls}">{esc(s["vi"])}</td>'
            f'<td class="mean">{esc(s["en"])}{zh}</td>'
            f'<td class="notes">{notes}</td>'
            f'<td class="play">{play_buttons(s["id"])}{audio_tag(s["id"])}</td></tr>')
    head = "<tr><th>#</th><th>Tiếng Việt</th><th>Meaning</th><th>Notes</th><th>Audio</th></tr>"
    return "<table>" + head + "".join(rows) + "</table>"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--week", type=int, required=True)
    ap.add_argument("--no-embed", action="store_true",
                    help="link the mp3s instead of baking them in: small file, plays only inside the week folder")
    ap.add_argument("--pages", action="store_true",
                    help="build the web version for GitHub Pages: weeks/wNN/index.html, mp3s streamed, "
                         "the two daily tracks replaced by a player that walks the day")
    args = ap.parse_args()
    global EMBED, PAGES
    PAGES = args.pages
    EMBED = not (args.no_embed or PAGES)
    week = args.week
    ww = f"{week:02d}"
    wdir = week_dir(week)
    sentences = load_sentences()
    sched = load_schedule(week)
    days = sorted({s["day"] for s in sched})

    brief_path = wdir / "brief.md"
    brief = brief_path.read_text(encoding="utf-8") if brief_path.exists() else f"# Week {week}"
    title = (re.search(r"^#\s+(.*)$", brief, re.M) or [None, f"Week {week}"])[1]

    parts = [f"<!doctype html><html lang='vi'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
             f"<title>Tiếng Việt Sài Gòn, week {week}</title><style>{CSS}</style></head><body>"]
    nav = "".join(f'<a href="#d{d}">Day {d}</a>' for d in days)
    parts.append(f'<nav><a href="#top">Week {week}</a>{nav}<a href="#gloss">Gloss only</a></nav><main id="top">')
    new_count = sum(1 for s in sched if s["new"])
    parts.append(f'<div class="cover"><div class="sub">Tiếng Việt Sài Gòn</div><h1>{esc(title)}</h1>'
                 f'<p class="sub">{len(sched)} sentence slots, {new_count} new. Every sentence has its own Play button; Loop repeats it until you press Loop again; 0.8x plays it slower.</p></div>')
    parts.append(md_to_html(brief, sentences, skip_h1=True))

    for d in days:
        items = [s for s in sched if s["day"] == d]
        notes_path = wdir / "notes" / f"d{d}.md"
        notes = notes_path.read_text(encoding="utf-8") if notes_path.exists() else f"# Week {week}, day {d}"
        dtitle = (re.search(r"^#\s+(.*)$", notes, re.M) or [None, f"Day {d}"])[1]
        parts.append(f'<h1 id="d{d}">{esc(dtitle)}</h1>')
        parts.append(md_to_html(notes, sentences, skip_h1=True))
        n_new = sum(1 for s in items if s["new"])
        parts.append(f"<h2>Sentences ({len(items)}: {n_new} new, {len(items) - n_new} recycled &#8635;)</h2>")
        if PAGES:
            ids = ",".join("'" + s["id"] + "'" for s in items)
            parts.append('<div class="tracks">'
                         f'<div class="track"><b>&#9654;&#xFE0E; LISTEN, whole of day {d}</b>'
                         f'<button class="dayrun" onclick="runDay(this,[{ids}],0)">Start</button>'
                         '<span class="sub">every sentence once, straight through</span></div>'
                         f'<div class="track"><b>&#9654;&#xFE0E; ECHO, whole of day {d}</b>'
                         f'<button class="dayrun" onclick="runDay(this,[{ids}],1)">Start</button>'
                         '<span class="sub">sentence, your turn, sentence again, your turn</span></div></div>')
        else:
            if EMBED:
                parts.append('<p class="sub">The two track players below only play when this file sits in its week folder. '
                             'The Play buttons on every sentence work anywhere, also on a phone.</p>')
            parts.append('<div class="tracks">'
                         f'<div class="track"><b>&#9654;&#xFE0E; LISTEN track, day {d}</b><audio controls preload="none" src="audio/w{ww}_d{d}_listen.mp3"></audio></div>'
                         f'<div class="track"><b>&#9654;&#xFE0E; ECHO track, day {d}</b><audio controls preload="none" src="audio/w{ww}_d{d}_echo.mp3"></audio></div></div>')
        parts.append(sentence_table(items, sentences))

    parts.append('<h1 id="gloss">Gloss only</h1><p>For the echo-from-gloss block: say the Vietnamese from the meaning, then press Play. The Vietnamese column is hidden; the button shows it when you want to check by eye.</p>')
    for d in days:
        items = [s for s in sched if s["day"] == d]
        parts.append(f'<div class="gloss vihidden"><h2>Day {d} <button onclick="toggleVi(this)">Show Vietnamese</button></h2>')
        parts.append(sentence_table(items, sentences, gloss=True))
        parts.append("</div>")

    parts.append(f"</main><script>{JS}</script></body></html>")
    if PAGES:
        out = wdir / "index.html"            # die URL wird damit .../weeks/wNN/
    else:
        out = wdir / (f"w{ww}.html" if EMBED else f"w{ww}_linked.html")
    html_text = "\n".join(parts)
    # hide the Vietnamese cells inside a .gloss.vihidden box
    html_text = html_text.replace("</style>", ".gloss.vihidden td.vi,.gloss.vihidden td.notes{color:transparent;user-select:none}\n</style>")
    out.write_text(html_text, encoding="utf-8")
    print(f"wrote weeks/w{ww}/{out.name} ({len(days)} days, {len(sched)} sentence slots, "
          f"{round(len(html_text.encode()) / 1e6, 2)} MB)")
    if not EMBED:
        return
    # macOS shortcut: double-click opens the booklet in the default browser, whatever .html files are set to open with
    base = None
    try:
        import json
        base = json.loads((wdir.parent.parent / "voices.json").read_text(encoding="utf-8")).get("docx_link_base")
    except Exception:
        pass
    if base:
        url = f"file://{base.rstrip('/')}/weeks/w{ww}/w{ww}.html"
        webloc = ('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" '
                  '"http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n\t<key>URL</key>\n\t<string>'
                  + url + '</string>\n</dict>\n</plist>\n')
        (wdir / f"Open week {week}.webloc").write_text(webloc, encoding="utf-8")
        print(f"wrote weeks/w{ww}/Open week {week}.webloc")


if __name__ == "__main__":
    main()
