#!/usr/bin/env node
/**
 * Build the primary (小学) and junior (初中) vocabularies from the curriculum
 * word lists in ../data-src.
 *
 * Words already present in the open atlas keep their id, entry, level, topic and
 * media (the image/audio files are hard-linked into the new dataset, falling back
 * to a copy).  New words get a compact entry in the same shape, with text only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.resolve(root, "..", "data-src");
const OPEN = path.join(root, "public/atlas");

const SPECS = [
  { dir: "atlas-primary", id: "word-atlas-primary", name: "小学词库", cefr: "A1", file: "primary.json", license: "词表：人教版 PEP 小学英语（整理）· 媒体：CC BY 4.0 word-atlas" },
  { dir: "atlas-junior", id: "word-atlas-junior", name: "初中词库", cefr: "A2", file: "junior.json", license: "词表：中考必备词汇（整理）· 媒体：CC BY 4.0 word-atlas" },
];

const norm = (w) => String(w || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const slug = (w) => {
  const s = String(w)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || `w-${norm(w).slice(0, 40) || "word"}`;
};

/* ---------- open atlas ---------- */

const openIndex = readJson(path.join(OPEN, "index.json"));
const openEntries = new Map();
for (let n = 0; n * openIndex.chunk < openIndex.count; n++) {
  for (const e of readJson(path.join(OPEN, `entries/${n}.json`))) openEntries.set(e.id, e);
}
/** Normalised headword -> index row. First occurrence wins. */
const openByWord = new Map();
for (const row of openIndex.words) if (!openByWord.has(norm(row[1]))) openByWord.set(norm(row[1]), row);

/* ---------- sources ---------- */

/** Youdao 中考 records: richer senses, example sentences and US phonetics. */
const zhongkao = new Map();
const zkFile = path.join(SRC, "raw/zhongkao.json");
if (fs.existsSync(zkFile)) {
  for (const line of fs.readFileSync(zkFile, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    const c = o.content?.word?.content;
    if (!c || !o.headWord) continue;
    const key = norm(o.headWord);
    if (!zhongkao.has(key)) zhongkao.set(key, c);
  }
}

/* ---------- text helpers ---------- */

const POS = /^(n|v|vt|vi|adj|adv|prep|pron|conj|num|art|int|aux|abbr|na)\.?$/i;
const posOf = (p) => {
  const s = String(p || "").trim();
  if (!POS.test(s)) return s;
  const k = s.replace(/\.$/, "").toLowerCase();
  return k === "na" ? "" : `${k}.`;
};

/** Trim dictionary-style Chinese into at most two short senses, tracking inline pos tags. */
function parseZh(text, word = "") {
  const raw = String(text || "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/（[^）]*）/g, "")
    .trim();
  const senses = [];
  let pos = "";
  for (let seg of raw.split(/[；;]/)) {
    seg = seg.trim();
    let m;
    while ((m = seg.match(/^([a-z]{1,4})\.\s*/i)) && POS.test(`${m[1]}.`)) {
      pos = posOf(m[1]);
      seg = seg.slice(m[0].length).trim();
    }
    seg = seg.split(/[，,]/)[0].trim();
    if (!seg) continue;
    senses.push({ pos, zh: seg, en: "" });
    if (senses.length >= 2) break;
  }
  if (!senses.length && raw) senses.push({ pos: "", zh: raw, en: "" });
  if (word.includes(" ")) for (const s of senses) if (!s.pos) s.pos = "phr.";
  return senses;
}

function sensesOf(word, zh) {
  const c = zhongkao.get(norm(word));
  if (c?.trans?.length) {
    const out = c.trans
      .filter((t) => t.tranCn)
      .slice(0, 2)
      .map((t) => ({
        pos: posOf(t.pos),
        zh: String(t.tranCn).replace(/\[[^\]]*\]/g, "").trim(),
        en: t.tranOther && String(t.tranOther).length <= 140 ? String(t.tranOther).trim() : "",
      }))
      .filter((s) => s.zh);
    if (out.length) {
      if (word.includes(" ")) for (const s of out) if (!s.pos) s.pos = "phr.";
      return out;
    }
  }
  return parseZh(zh, word);
}

const tidy = (s) =>
  String(s || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\(\s*=\s*/g, "(")
    .trim();

function examplesOf(word) {
  const c = zhongkao.get(norm(word));
  const ex = [];
  const col = [];
  if (!c?.sentence?.sentences) return { ex, col };
  const key = String(word).toLowerCase();
  const head = key.split(" ")[0];
  for (const s of c.sentence.sentences) {
    const en = tidy(s.sContent);
    const zh = tidy(s.sCn);
    if (!en || !zh || /[\u4e00-\u9fa5]/.test(en)) continue;
    const lower = en.toLowerCase();
    if (!lower.includes(key) && !(key.includes(" ") && lower.includes(head))) continue;
    const words = en.split(" ").length;
    if (words >= 4 && /[.!?]$/.test(en) && en.length <= 140) ex.push({ en, zh });
    else if (words <= 5 && en.length <= 48) col.push(`${en}｜${zh}`);
    if (ex.length >= 2) break;
  }
  return { ex, col };
}

/* ---------- topic heuristic ---------- */

const TOPICS = [
  ["education", /\b(school|class|classroom|teacher|student|pupil|book|pen|pencil|crayon|ruler|eraser|bag|desk|chair|lesson|study|learn|homework|math|maths|english|chinese|science|library|dictionary|notebook|exam|test|grade|course|university|college)\b/],
  ["sport", /\b(ball|football|basketball|volleyball|ping|pong|baseball|swim|swimming|run|running|jump|race|game|sport|team|player|coach|match|tennis|badminton)\b/],
  ["nature", /\b(animal|zoo|cat|dog|bird|fish|tiger|lion|panda|monkey|elephant|rabbit|horse|duck|pig|cow|sheep|tree|flower|grass|mountain|river|lake|sea|sky|sun|moon|star|rain|snow|wind|cloud|forest|earth|world|plant)\b/],
  ["travel", /\b(bus|car|bike|bicycle|train|plane|airplane|ship|boat|taxi|subway|ticket|map|hotel|trip|travel|holiday|beach|airport|station)\b/],
  ["city", /\b(city|town|street|road|park|shop|store|market|hospital|museum|restaurant|bank|supermarket|cinema)\b/],
  ["health", /\b(doctor|nurse|dentist|medicine|ill|sick|fever|cough|cold|headache|toothache|body|head|hair|face|eye|ear|nose|mouth|hand|arm|leg|foot|feet|tooth|teeth)\b/],
  ["emotion", /\b(happy|sad|angry|afraid|glad|sorry|love|like|hate|tired|excited|worried|laugh|cry|smile)\b/],
  ["technology", /\b(computer|phone|television|tv|radio|camera|internet|email|robot|screen|video)\b/],
  ["arts", /\b(music|song|sing|dance|draw|paint|picture|art|film|movie|story)\b/],
  ["economy", /\b(money|yuan|dollar|price|buy|sell|pay|cost|cheap|expensive|rich|poor)\b/],
  ["media", /\b(news|newspaper|report|program|channel)\b/],
];
const topicOf = (word) => {
  const tokens = String(word).toLowerCase().split(/[^a-z]+/).filter(Boolean);
  for (const [key, re] of TOPICS) if (tokens.some((t) => re.test(t))) return key;
  return "daily";
};

/* ---------- media ---------- */

const MEDIA_FILES = [
  [1, ["img/ID.webp", "thumb/ID.webp"]],
  [2, ["audio/uk/ID.mp3"]],
  [4, ["audio/us/ID.mp3"]],
  [8, ["audio/ex/ID.mp3"]],
  [16, ["audio/ex2/ID.mp3"]],
];

/** Hard-link (or copy) the media an entry needs; clears bits whose files are absent. */
function linkMedia(id, bits, outDir) {
  let m = bits;
  for (const [bit, rels] of MEDIA_FILES) {
    if (!(m & bit)) continue;
    const paths = rels.map((r) => r.replace("ID", id));
    if (paths.some((rel) => !fs.existsSync(path.join(OPEN, rel)))) {
      m &= ~bit;
      continue;
    }
    for (const rel of paths) {
      const from = path.join(OPEN, rel);
      const to = path.join(outDir, rel);
      if (fs.existsSync(to)) continue;
      fs.mkdirSync(path.dirname(to), { recursive: true });
      try {
        fs.linkSync(from, to);
      } catch {
        fs.copyFileSync(from, to);
      }
    }
  }
  return m;
}

/* ---------- build one dataset ---------- */

function build(spec) {
  const list = readJson(path.join(SRC, spec.file));
  const out = path.join(root, "public", spec.dir);
  // Media files are hard links and may be open in the dev server; only replace the JSON.
  fs.rmSync(path.join(out, "entries"), { recursive: true, force: true });
  fs.rmSync(path.join(out, "index.json"), { force: true });
  fs.mkdirSync(path.join(out, "entries"), { recursive: true });

  const cefrIdx = openIndex.cefr.indexOf(spec.cefr);
  const daily = Math.max(0, openIndex.topics.findIndex(([k]) => k === "daily"));
  const usedIds = new Set();
  const seen = new Set();
  const rows = [];
  const entries = [];
  let reused = 0;

  const uniqueId = (base) => {
    let id = base;
    for (let n = 2; usedIds.has(id); n++) id = `${base.slice(0, 56)}-${n}`;
    usedIds.add(id);
    return id;
  };

  for (const rec of list) {
    const word = String(rec.word || "").trim();
    const key = norm(word);
    if (!word || !key || seen.has(key)) continue;
    seen.add(key);

    const openRow = openByWord.get(key);
    if (openRow) {
      const entry = openEntries.get(openRow[0]);
      if (!entry || usedIds.has(openRow[0])) continue;
      usedIds.add(openRow[0]);
      const row = [...openRow];
      const m = linkMedia(openRow[0], openRow[6], out);
      row[6] = m;
      rows.push(row);
      entries.push({ ...entry, m });
      reused++;
      continue;
    }

    const id = uniqueId(slug(word));
    const senses = sensesOf(word, rec.zh);
    const { ex, col } = examplesOf(word);
    const topic = topicOf(word);
    const topicIdx = openIndex.topics.findIndex(([k]) => k === topic);
    const zh = senses.map((s) => `${s.pos} ${s.zh}`.trim()).join("；");
    const ipa = String(rec.ipa || "").trim();
    const usPhone = zhongkao.get(key)?.usphone;
    const us = usPhone ? `/${String(usPhone).replace(/^\/|\/$/g, "")}/` : "";

    rows.push([id, word, zh, ipa, cefrIdx >= 0 ? cefrIdx : 0, topicIdx >= 0 ? topicIdx : daily, 0]);
    entries.push({
      id,
      w: word,
      uk: ipa,
      us,
      senses,
      ex,
      col: col.slice(0, 4),
      fam: [],
      syn: [],
      ant: [],
      tip: "",
      cefr: spec.cefr,
      topic: topicIdx >= 0 ? topic : "daily",
      note: "",
      m: 0,
    });
  }

  const chunk = 100;
  for (let n = 0; n * chunk < rows.length; n++) {
    fs.writeFileSync(path.join(out, `entries/${n}.json`), JSON.stringify(entries.slice(n * chunk, (n + 1) * chunk)));
  }

  const examples = entries.reduce((n, e) => n + e.ex.length, 0);
  const illustrated = rows.filter((r) => r[6] & 1).length;
  const voiced = rows.filter((r) => r[6] & 2).length;
  const index = {
    id: spec.id,
    version: 1,
    name: spec.name,
    license: spec.license,
    count: rows.length,
    examples,
    illustrated,
    voiced,
    chunk,
    topics: openIndex.topics,
    cefr: openIndex.cefr,
    fields: openIndex.fields,
    words: rows,
  };
  fs.writeFileSync(path.join(out, "index.json"), JSON.stringify(index));
  console.log(
    `${spec.name.padEnd(6)} ${String(rows.length).padStart(4)} 词 · 复用 ${String(reused).padStart(4)} · 新增 ${String(rows.length - reused).padStart(3)} · 例句 ${examples} · 配图 ${illustrated} · 发音 ${voiced}`,
  );
}

for (const spec of SPECS) build(spec);
