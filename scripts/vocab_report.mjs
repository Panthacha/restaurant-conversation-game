// Shows which CEFR levels each restaurant's conversation uses, checked against the vocabulary bank
// (คลังคำศัพท์_ทั้งหมด_ง่าย-ปานกลาง-ยาก.xlsx: Oxford 3000/5000 + Cambridge B1 Preliminary, sheet "รวมทั้งหมด").
//
// For every level it prints the share of distinct words at each CEFR level, the B2/C1 words in the
// customer lines and replies, the words the bank doesn't list (dish names, "ciao", "howdy"…), and the
// CEFR level of each highlighted `vocab` word. Run it while writing a level's dialogue to check that
// the level is as hard as intended. Character names are skipped. Word forms are matched loosely
// (served → serve, chilies → chili), taking the easiest level a form could belong to.
//
// The bank is read straight from the Excel file rather than copied into data/: the word lists belong
// to Oxford University Press and Cambridge, and this repository is public.
//
// With --update-vocab it also fills in data/vocab.json (the game's own word list): each entry's CEFR
// level and part of speech from the bank, and an example sentence from the dialogue when it has none.
//
// Run:  npm run vocab-report        (or: node scripts/vocab_report.mjs [--update-vocab] [path/to/bank.xlsx])

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const UPDATE_VOCAB = args.includes("--update-vocab");
const BANK = args.find((a) => !a.startsWith("--")) ?? path.join(ROOT, "คลังคำศัพท์_ทั้งหมด_ง่าย-ปานกลาง-ยาก.xlsx");
const SHEET = "รวมทั้งหมด";
const LEVELS = ["A1", "A2", "B1", "B2", "C1"]; // "B1 (Cambridge)" counts as B1

// --- reading the .xlsx (a zip of XML files) without extra packages ---------------------------------

function unzip(file) {
  const buf = fs.readFileSync(file);
  let end = buf.length - 22;
  while (end >= 0 && buf.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error(`${file} is not an .xlsx file`);
  const files = new Map();
  let p = buf.readUInt32LE(end + 16);
  for (let n = buf.readUInt16LE(end + 10); n > 0; n--) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    files.set(name, { method, data: buf.subarray(start, start + size) });
    p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return (name) => {
    const f = files.get(name);
    if (!f) return "";
    return (f.method === 8 ? zlib.inflateRawSync(f.data) : f.data).toString("utf8");
  };
}

const unescape = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, "&");
const textOf = (xml) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescape(m[1])).join("");
const column = (ref) => [...ref.replace(/\d+/g, "")].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

function readSheet(file, sheetName) {
  const read = unzip(file);
  const shared = [...read("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));
  const targets = Object.fromEntries(
    [...read("xl/_rels/workbook.xml.rels").matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]])
  );
  const sheets = [...read("xl/workbook.xml").matchAll(/<sheet name="([^"]+)"[^>]*r:id="([^"]+)"/g)].map((m) => [unescape(m[1]), m[2]]);
  const sheet = sheets.find(([name]) => name === sheetName);
  if (!sheet) throw new Error(`no sheet "${sheetName}" in ${file} (sheets: ${sheets.map(([n]) => n).join(", ")})`);
  const xml = read("xl/" + targets[sheet[1]].replace(/^\/?xl\//, ""));
  return [...xml.matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)].map((row) => {
    const cells = [];
    for (const [, ref, attrs, body = ""] of row[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const type = attrs.match(/t="([^"]+)"/)?.[1];
      const value = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      cells[column(ref)] = type === "s" ? shared[+value] : type === "inlineStr" ? textOf(body) : unescape(value ?? "");
    }
    return Array.from(cells, (c) => c ?? "");
  });
}

// --- the bank: word -> easiest CEFR level ------------------------------------------------------

const [header, ...rows] = readSheet(BANK, SHEET);
const col = (label) => {
  const i = header.indexOf(label);
  if (i === -1) throw new Error(`column "${label}" not found in sheet "${SHEET}"`);
  return i;
};
const WORD = col("คำศัพท์ (Word)");
const BRITISH = col("ตัวสะกดแบบบริติช");
const CEFR = col("ระดับ CEFR");
const POS = col("ชนิดคำ (POS)");

const rank = (level) => LEVELS.indexOf(level);
const words = new Map();
const phrases = new Map();
const posOf = new Map();
for (const row of rows) {
  const level = row[CEFR].replace(/\s*\(.*\)/, "");
  for (const form of `${row[WORD]},${row[BRITISH]}`.split(",")) {
    const w = form.replace(/\(.*?\)/g, "").trim().toLowerCase();
    if (!w) continue;
    const into = w.includes(" ") ? phrases : words;
    if (!into.has(w) || rank(level) < rank(into.get(w))) {
      into.set(w, level);
      posOf.set(w, row[POS]);
    }
  }
}

// --- matching the game's words to the bank -------------------------------------------------------

const IRREGULAR = {
  am: "be", is: "be", are: "be", was: "be", were: "be", been: "be", has: "have", had: "have", does: "do", did: "do",
  done: "do", went: "go", gone: "go", ate: "eat", made: "make", took: "take", got: "get", came: "come", saw: "see",
  said: "say", thought: "think", brought: "bring", bought: "buy", told: "tell", gave: "give", felt: "feel", left: "leave",
  kept: "keep", children: "child", men: "man", women: "woman", better: "good", best: "good", me: "i", my: "i", us: "we",
  our: "we", him: "he", his: "he", her: "she", them: "they", their: "they", ca: "can", wo: "will", chose: "choose",
  knew: "know", found: "find", heard: "hear", paid: "pay", meant: "mean", understood: "understand", wrote: "write",
  sat: "sit",
};

// Every form a token could be the inflection of, e.g. "tried" -> try, "chilies" -> chili.
function candidates(t) {
  const out = [t, IRREGULAR[t]];
  const strip = (suffix, ...endings) => t.endsWith(suffix) && endings.forEach((e) => out.push(t.slice(0, -suffix.length) + e));
  strip("ies", "y");
  strip("es", "");
  strip("s", "");
  strip("ied", "y");
  strip("ed", "", "e");
  strip("ing", "", "e");
  strip("er", "", "e");
  strip("est", "", "e");
  strip("ly", "", "le");
  // doubled final consonant: stopped -> stop, bigger -> big
  for (const suffix of ["ed", "ing", "er", "est"]) if (t.endsWith(suffix) && t.at(-suffix.length - 1) === t.at(-suffix.length - 2)) out.push(t.slice(0, -suffix.length - 1));
  return out.filter(Boolean);
}

function levelOf(token) {
  const found = candidates(token).filter((c) => words.has(c));
  if (!found.length) return null;
  return found.map((c) => words.get(c)).sort((a, b) => rank(a) - rank(b))[0];
}

const tokens = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’‘]/g, "'").toLowerCase()
    .replace(/n't\b/g, " not").replace(/'(m|re|s|ll|ve|d)\b/g, " ")
    .split(/[^a-z']+/).map((w) => w.replace(/^'+|'+$/g, "")).filter(Boolean);

// A highlighted word or phrase: the bank's phrase entry if there is one, else its hardest word.
function phraseLevel(text) {
  const p = phrases.get(text.toLowerCase());
  if (p) return p;
  const levels = tokens(text).filter((t) => !["a", "an", "the", "to"].includes(t)).map(levelOf);
  if (levels.some((l) => l === null)) return null;
  return levels.sort((a, b) => rank(b) - rank(a))[0];
}

// --- report ------------------------------------------------------------------------------------

const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));
const restaurants = read("restaurants.json");
const dialogues = read("dialogues.json");
const pct = (n, total) => `${Math.round((n / total) * 100)}%`.padStart(5);

console.log(`Vocabulary bank: ${rows.length} entries from ${path.basename(BANK)}\n`);
console.log("level  difficulty  words     A1    A2    B1    B2    C1  not in bank");
const details = [];
for (const r of restaurants) {
  const customers = r.customers ?? [r.customer];
  const names = new Set(customers.flatMap((c) => tokens(c.name)));
  const nodes = customers.flatMap((c) => Object.values(dialogues[c.dialogue ?? r.id] ?? {}));
  const text = nodes.flatMap((n) => [n.text, ...(n.choices ?? []).map((ch) => ch.text)]).join(" ");

  const seen = new Map();
  for (const t of tokens(text)) if (!names.has(t) && !seen.has(t)) seen.set(t, levelOf(t));
  const count = (level) => [...seen.values()].filter((l) => l === level).length;
  console.log(
    `${r.id.padEnd(6)} ${String(r.difficulty).padStart(10)} ${String(seen.size).padStart(6)} ` +
      LEVELS.map((l) => pct(count(l), seen.size)).join(" ") + pct(count(null), seen.size).padStart(13)
  );

  const hard = [...seen].filter(([, l]) => l === "B2" || l === "C1").map(([w, l]) => `${w} (${l})`);
  const missing = [...seen].filter(([, l]) => l === null).map(([w]) => w);
  const vocab = nodes.flatMap((n) => n.vocab ?? []).map((v) => `${v.word} (${phraseLevel(v.word) ?? "not in bank"})`);
  details.push(
    `\n${r.id} ${r.name}\n` +
      `  B2/C1 words:        ${hard.join(", ") || "-"}\n` +
      `  not in bank:        ${missing.join(", ") || "-"}\n` +
      `  highlighted vocab:  ${[...new Set(vocab)].join(", ") || "-"}`
  );
}
console.log(details.join("\n"));

// --- data/vocab.json ---------------------------------------------------------------------------

if (UPDATE_VOCAB) {
  const vocabFile = path.join(ROOT, "data", "vocab.json");
  const vocab = read("vocab.json");
  const lines = restaurants.flatMap((r) =>
    (r.customers ?? [r.customer]).flatMap((c) =>
      Object.values(dialogues[c.dialogue ?? r.id] ?? {}).flatMap((n) => [n.text, ...(n.choices ?? []).filter((ch) => ch.moodChange > 0).map((ch) => ch.text)])
    )
  );
  for (const entry of vocab) {
    const key = entry.word.toLowerCase();
    entry.cefr = phraseLevel(entry.word);
    const pos = posOf.get(key) ?? posOf.get(candidates(key).find((c) => posOf.has(c)) ?? "");
    if (pos) entry.pos = pos;
    else delete entry.pos;
    if (!entry.example) {
      const re = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
      const line = lines.find((l) => re.test(l));
      if (line) entry.example = line;
    }
  }
  fs.writeFileSync(vocabFile, JSON.stringify(vocab, null, 2) + "\n");
  console.log(`\nUpdated ${vocab.length} entries in data/vocab.json (${vocab.filter((e) => !e.cefr).length} not in the bank).`);
}
