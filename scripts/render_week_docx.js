#!/usr/bin/env node
/* Build the week booklet: weeks/wNN/wNN.docx
 *
 *   node scripts/render_week_docx.js --week 1
 *
 * Contents: brief, then per day the notes and the sentence table, then the gloss-only
 * pages (English and Chinese, no Vietnamese) for the echo-from-gloss block.
 * Source of truth is sentences.csv + schedule.csv + weeks/wNN/notes/*.md + brief.md.
 * Needs the npm package "docx": run `npm install` once inside scripts/.
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  AlignmentType, HeadingLevel, BorderStyle, ShadingType, PageBreak, LevelFormat,
  Footer, PageNumber, TableLayoutType, ExternalHyperlink,
} = require("docx");

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const wi = args.indexOf("--week");
if (wi < 0) { console.error("usage: node scripts/render_week_docx.js --week N"); process.exit(1); }
const WEEK = parseInt(args[wi + 1], 10);
const WW = String(WEEK).padStart(2, "0");
const WDIR = path.join(ROOT, "weeks", `w${WW}`);

// ---------- data ----------
function readPipe(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(l => l.trim());
  const head = lines[0].split("|");
  return lines.slice(1).map(l => {
    const f = l.split("|");
    const o = {};
    head.forEach((h, i) => (o[h] = (f[i] || "").trim()));
    return o;
  });
}
const sentences = {};
readPipe(path.join(ROOT, "sentences.csv")).forEach(r => (sentences[r.id] = r));
const schedule = readPipe(path.join(ROOT, "schedule.csv"))
  .filter(r => parseInt(r.week, 10) === WEEK)
  .map(r => ({ day: +r.day, pos: +r.pos, id: r.id, isNew: r.new === "1" }))
  .sort((a, b) => a.day - b.day || a.pos - b.pos);
const days = [...new Set(schedule.map(s => s.day))];

// Where the links in the booklet point. voices.json "docx_link_base" = absolute path of this folder on the
// machine where you open the booklet (e.g. /Users/mike/Documents/tieng-viet). Without it, links are relative
// to the docx, which Word resolves too as long as the folder structure is kept.
let LINK_BASE = null;
try {
  const v = JSON.parse(fs.readFileSync(path.join(ROOT, "voices.json"), "utf8"));
  if (v.docx_link_base) LINK_BASE = "file://" + v.docx_link_base.replace(/\/$/, "");
} catch (e) { /* no voices.json: relative links */ }
function audioLink(rel) {            // rel is relative to the course root, e.g. audio/sentences/s0001.mp3
  return LINK_BASE ? `${LINK_BASE}/${rel}` : `../../${rel}`;
}
const BLUE = "1155CC";
const BTN_BG = "E8F0FE";
function playCell(rel, width, label) {
  return new TableCell({
    children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [link(label, rel, { size: 22, bold: true, color: BLUE, noUnderline: true })] })],
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: BTN_BG, color: "auto" },
    margins: { top: 100, bottom: 100, left: 60, right: 60 },
    verticalAlign: "center",
  });
}
function trackButtons(d) {
  const W = [4800, 4800];
  const row = new TableRow({ cantSplit: true, children: [
    playCell(`weeks/w${WW}/audio/w${WW}_d${d}_listen.mp3`, W[0], `\u25B6\uFE0E  LISTEN track, day ${d}`),
    playCell(`weeks/w${WW}/audio/w${WW}_d${d}_echo.mp3`, W[1], `\u25B6\uFE0E  ECHO track, day ${d}`),
  ] });
  return new Table({ rows: [row], width: { size: 9600, type: WidthType.DXA }, columnWidths: W, borders, layout: TableLayoutType.FIXED });
}
function link(text, rel, opts = {}) {
  return new ExternalHyperlink({
    link: audioLink(rel),
    children: [new TextRun({ text, font: FONT, size: opts.size || BODY, bold: !!opts.bold, color: opts.color || "1155CC", underline: opts.noUnderline ? undefined : {} })],
  });
}

// ---------- styling ----------
const FONT = { ascii: "Arial", hAnsi: "Arial", eastAsia: "Microsoft JhengHei", cs: "Arial" };
const ORANGE = "EA5206";
const GREY = "555555";
const LIGHT = "F3F3F3";
const VI_SIZE = 26;   // half-points
const BODY = 20;
const SMALL = 18;

function run(text, opts = {}) {
  return new TextRun({ text, font: FONT, size: opts.size || BODY, bold: !!opts.bold, italics: !!opts.italics, color: opts.color });
}

// inline markdown: **bold**, `code`, plain
function inlineRuns(text, base = {}) {
  const runs = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) runs.push(run(text.slice(last, m.index), base));
    const tok = m[0];
    if (tok.startsWith("**")) runs.push(run(tok.slice(2, -2), { ...base, bold: true }));
    else runs.push(new TextRun({ text: tok.slice(1, -1), font: { ascii: "Menlo", hAnsi: "Menlo", eastAsia: "Microsoft JhengHei" }, size: (base.size || BODY) - 2, color: GREY }));
    last = m.index + tok.length;
  }
  if (last < text.length) runs.push(run(text.slice(last), base));
  return runs;
}

function para(text, opts = {}) {
  return new Paragraph({
    children: inlineRuns(text, opts),
    spacing: { after: opts.after ?? 120, line: 276 },
    alignment: opts.align,
    keepNext: opts.keepNext,
  });
}

function heading(text, level) {
  const map = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3 };
  return new Paragraph({ text, heading: map[level] || HeadingLevel.HEADING_3, spacing: { before: level === 1 ? 360 : 240, after: 120 }, keepNext: true });
}

const thin = { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" };
const borders = { top: thin, bottom: thin, left: thin, right: thin, insideHorizontal: thin, insideVertical: thin };

function cell(children, width, opts = {}) {
  return new TableCell({
    children,
    width: { size: width, type: WidthType.DXA },
    shading: opts.shade ? { type: ShadingType.CLEAR, fill: opts.shade, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    verticalAlign: "top",
  });
}

// markdown table -> docx table
function mdTable(rows) {
  const parsed = rows
    .filter(r => !/^\|\s*-+/.test(r))
    .map(r => r.replace(/^\||\|$/g, "").split("|").map(c => c.trim()));
  const ncol = Math.max(...parsed.map(r => r.length));
  const total = 9600;
  const widths = parsed[0].map(() => Math.floor(total / ncol));
  const trs = parsed.map((r, ri) => new TableRow({
    cantSplit: true,
    tableHeader: ri === 0,
    children: r.map((c, ci) => cell([new Paragraph({ children: inlineRuns(c, { size: SMALL, bold: ri === 0 }), spacing: { after: 0 } })], widths[ci], { shade: ri === 0 ? LIGHT : undefined })),
  }));
  return new Table({ rows: trs, width: { size: total, type: WidthType.DXA }, columnWidths: widths, borders, layout: TableLayoutType.FIXED });
}

// minimal markdown -> docx blocks
function mdBlocks(md, opts = {}) {
  const out = [];
  const lines = md.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith("```")) {
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        out.push(new Paragraph({ children: [new TextRun({ text: lines[i], font: { ascii: "Menlo", hAnsi: "Menlo", eastAsia: "Microsoft JhengHei" }, size: SMALL, color: GREY })], spacing: { after: 0 }, indent: { left: 360 } }));
        i++;
      }
      i++;
      out.push(new Paragraph({ spacing: { after: 60 } }));
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(l);
    if (h) {
      const level = h[1].length + (opts.demote || 0);
      if (!(opts.skipH1 && h[1].length === 1)) out.push(heading(h[2], Math.min(level, 3)));
      i++; continue;
    }
    if (l.startsWith("@@play ")) {
      const ids = l.slice(7).trim().split(/\s+/);
      out.push(sentenceTable(ids.map(id => ({ id, isNew: true }))));
      out.push(new Paragraph({ spacing: { after: 60 } }));
      i++; continue;
    }
    if (l.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      out.push(mdTable(rows));
      out.push(new Paragraph({ spacing: { after: 60 } }));
      continue;
    }
    if (/^[-*]\s+/.test(l)) {
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        out.push(new Paragraph({ children: inlineRuns(lines[i].replace(/^[-*]\s+/, "")), numbering: { reference: "bullets", level: 0 }, spacing: { after: 60, line: 276 } }));
        i++;
      }
      continue;
    }
    // paragraph: join consecutive plain lines
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3})\s|^\||^[-*]\s|^```/.test(lines[i])) buf.push(lines[i++]);
    out.push(para(buf.join(" ")));
  }
  return out;
}

// ---------- sentence table ----------
function sentenceTable(items) {
  const W = [700, 2950, 2900, 1850, 1200]; // # | vi | meaning | notes | play  (sum 9600)
  const header = new TableRow({
    tableHeader: true, cantSplit: true,
    children: [
      cell([para("#", { size: SMALL, bold: true, after: 0 })], W[0], { shade: LIGHT }),
      cell([para("Tiếng Việt", { size: SMALL, bold: true, after: 0 })], W[1], { shade: LIGHT }),
      cell([para("Meaning", { size: SMALL, bold: true, after: 0 })], W[2], { shade: LIGHT }),
      cell([para("Notes", { size: SMALL, bold: true, after: 0 })], W[3], { shade: LIGHT }),
      cell([para("Audio", { size: SMALL, bold: true, after: 0, align: AlignmentType.CENTER })], W[4], { shade: LIGHT }),
    ],
  });
  const rows = items.map((it, n) => {
    const s = sentences[it.id];
    if (!s) throw new Error(`${it.id} missing in sentences.csv`);
    const notes = [];
    if (s.hanzi) notes.push(new Paragraph({ children: [run(s.hanzi, { size: SMALL })], spacing: { after: 40 } }));
    if (s.pron_note) notes.push(new Paragraph({ children: [run(s.pron_note, { size: SMALL, color: GREY })], spacing: { after: 0 } }));
    if (!notes.length) notes.push(new Paragraph({ spacing: { after: 0 } }));
    const meaning = [new Paragraph({ children: [run(s.en, { size: BODY })], spacing: { after: 40 } })];
    if (s.zh) meaning.push(new Paragraph({ children: [run(s.zh, { size: BODY, color: "333333" })], spacing: { after: 0 } }));
    return new TableRow({
      cantSplit: true,
      children: [
        cell([new Paragraph({ children: [run(String(n + 1), { size: SMALL, color: GREY }), run(it.isNew ? "" : " ↺", { size: SMALL, color: ORANGE })], spacing: { after: 20 } }),
               new Paragraph({ children: [run(it.id, { size: 14, color: "999999" })], spacing: { after: 0 } })], W[0]),
        cell([new Paragraph({ children: [link(s.vi, `audio/sentences/${it.id}.mp3`, { size: VI_SIZE, bold: true, color: "111111", noUnderline: true })], spacing: { after: 0 } })], W[1]),
        cell(meaning, W[2]),
        cell(notes, W[3]),
        playCell(`audio/sentences/${it.id}.mp3`, W[4], "\u25B6\uFE0E PLAY"),
      ],
    });
  });
  return new Table({ rows: [header, ...rows], width: { size: 9600, type: WidthType.DXA }, columnWidths: W, borders, layout: TableLayoutType.FIXED });
}

function glossTable(items) {
  const W = [700, 3850, 3850, 1200];
  const header = new TableRow({
    tableHeader: true, cantSplit: true,
    children: [
      cell([para("#", { size: SMALL, bold: true, after: 0 })], W[0], { shade: LIGHT }),
      cell([para("English", { size: SMALL, bold: true, after: 0 })], W[1], { shade: LIGHT }),
      cell([para("中文", { size: SMALL, bold: true, after: 0 })], W[2], { shade: LIGHT }),
      cell([para("Audio", { size: SMALL, bold: true, after: 0, align: AlignmentType.CENTER })], W[3], { shade: LIGHT }),
    ],
  });
  const rows = items.map((it, n) => {
    const s = sentences[it.id];
    return new TableRow({
      cantSplit: true,
      children: [
        cell([new Paragraph({ children: [run(String(n + 1), { size: SMALL, color: GREY })], spacing: { after: 0 } })], W[0]),
        cell([new Paragraph({ children: [run(s.en, { size: BODY })], spacing: { after: 0 } })], W[1]),
        cell([new Paragraph({ children: [run(s.zh, { size: BODY })], spacing: { after: 0 } })], W[2]),
        playCell(`audio/sentences/${it.id}.mp3`, W[3], "\u25B6\uFE0E PLAY"),
      ],
    });
  });
  return new Table({ rows: [header, ...rows], width: { size: 9600, type: WidthType.DXA }, columnWidths: W, borders, layout: TableLayoutType.FIXED });
}

// ---------- assemble ----------
const children = [];
const briefPath = path.join(WDIR, "brief.md");
const brief = fs.existsSync(briefPath) ? fs.readFileSync(briefPath, "utf8") : "";
const briefTitle = (/^#\s+(.*)$/m.exec(brief) || [])[1] || `Week ${WEEK}`;

children.push(new Paragraph({ children: [run("Tiếng Việt Sài Gòn", { size: 22, color: GREY })], spacing: { before: 2400, after: 120 } }));
children.push(new Paragraph({ children: [run(briefTitle, { size: 52, bold: true, color: ORANGE })], spacing: { after: 240 } }));
children.push(new Paragraph({ children: [run(`${schedule.length} sentence slots, ${schedule.filter(s => s.isNew).length} new. Audio in weeks/w${WW}/audio.`, { size: BODY, color: GREY })], spacing: { after: 200 } }));
children.push(...mdBlocks(brief, { skipH1: true }));

for (const d of days) {
  const items = schedule.filter(s => s.day === d);
  const notesPath = path.join(WDIR, "notes", `d${d}.md`);
  const notes = fs.existsSync(notesPath) ? fs.readFileSync(notesPath, "utf8") : `# Week ${WEEK}, day ${d}`;
  const title = (/^#\s+(.*)$/m.exec(notes) || [])[1] || `Day ${d}`;
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(heading(title, 1));
  children.push(...mdBlocks(notes, { skipH1: true }));
  const nNew = items.filter(s => s.isNew).length;
  children.push(heading(`Sentences (${items.length}: ${nNew} new, ${items.length - nNew} recycled ↺)`, 2));
  children.push(trackButtons(d));
  children.push(para("Blue boxes are buttons: the two above open the day's tracks, the PLAY box on each row opens that sentence alone. Word may ask once whether to open the file; say yes.", { size: SMALL, color: GREY }));
  children.push(sentenceTable(items));
}

children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading("Gloss only", 1));
children.push(para("For the echo-from-gloss block: say the Vietnamese out loud from the meaning, then press PLAY to hear the sentence. No Vietnamese on these pages on purpose."));
for (const d of days) {
  const items = schedule.filter(s => s.day === d);
  children.push(heading(`Day ${d}`, 2));
  children.push(glossTable(items));
  children.push(new Paragraph({ spacing: { after: 120 } }));
}

const doc = new Document({
  creator: "tieng-viet pipeline",
  title: `Tiếng Việt Sài Gòn, week ${WEEK}`,
  styles: {
    default: { document: { run: { font: FONT, size: BODY } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 34, bold: true, color: ORANGE }, paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 26, bold: true, color: "222222" }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 22, bold: true, color: GREY }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{
    properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run(`Tiếng Việt Sài Gòn · week ${WEEK} · `, { size: 16, color: GREY }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: GREY })] })] }) },
    children,
  }],
});

const out = path.join(WDIR, `w${WW}.docx`);
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(out, buf);
  console.log(`wrote weeks/w${WW}/w${WW}.docx (${days.length} days, ${schedule.length} sentence slots)`);
});
