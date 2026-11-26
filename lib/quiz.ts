import vocabData from "@/data/vocab.json";
import grammarData from "@/data/grammar.json";
import restaurantsData from "@/data/restaurants.json";
import type { DialogueTree, GrammarPoint, Question, Skill, SkillScore, VocabEntry } from "./types";

export const vocab = vocabData as VocabEntry[];

export const SKILL_LABEL: Record<Skill, string> = {
  vocab: "คำศัพท์",
  listening: "การฟัง",
  conversation: "บทสนทนา",
  grammar: "ไวยากรณ์",
};

// A repeatable random sequence, so a question keeps its choice order while it is on screen.
export function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], seed: string): T[] {
  const rand = seeded(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// The question's choices in display order, and where the right one ended up.
export function arrange(q: Question, seed: string) {
  const order = shuffle(q.choices.map((_, i) => i), `${seed}:${q.id}`);
  return { choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer) };
}

// Totals per skill for a finished quiz.
export function scoreBySkill(questions: Question[], correct: boolean[]) {
  const by: Partial<Record<Skill, SkillScore>> = {};
  questions.forEach((q, i) => {
    const s = (by[q.skill] ??= { correct: 0, total: 0 });
    s.total++;
    if (correct[i]) s.correct++;
  });
  return by;
}

// --- practice questions made from the game's own words and conversations ------------------------

export type PracticeKind = "meaning" | "listening" | "picture" | "reply" | "grammar";

export const PRACTICE_KINDS: { kind: PracticeKind; title: string; th: string; skill: Skill }[] = [
  { kind: "meaning", title: "Word Meaning", th: "ความหมายคำศัพท์", skill: "vocab" },
  { kind: "picture", title: "Picture Match", th: "จับคู่ภาพกับคำ", skill: "vocab" },
  { kind: "listening", title: "Listen & Choose", th: "ฟังแล้วเลือกคำ", skill: "listening" },
  { kind: "reply", title: "Best Reply", th: "เลือกคำตอบที่สุภาพที่สุด", skill: "conversation" },
  { kind: "grammar", title: "Grammar", th: "ไวยากรณ์", skill: "grammar" },
];

const levelIndex = (id: string) => restaurantsData.findIndex((r) => r.id === id);

function pickOthers<T>(pool: T[], exclude: T, n: number, seed: string, key: (t: T) => string) {
  const seen = new Set([key(exclude)]);
  const out: T[] = [];
  for (const t of shuffle(pool, seed)) {
    if (seen.has(key(t))) continue;
    seen.add(key(t));
    out.push(t);
    if (out.length === n) break;
  }
  return out;
}

// Ten questions of one kind from the given levels. `extra` are the teacher's own practice questions.
export function makePractice(kind: PracticeKind, levels: string[], dialogues: Record<string, DialogueTree>, extra: Question[], seed: string): Question[] {
  const inLevels = vocab.filter((v) => levels.includes(v.level));
  const all = vocab;
  const skill = PRACTICE_KINDS.find((k) => k.kind === kind)!.skill;
  const own = extra.filter((q) => q.form === "practice" && q.skill === skill);
  let made: Question[] = [];

  if (kind === "meaning") {
    made = inLevels.map((v) => {
      const others = pickOthers(all, v, 3, `${seed}${v.word}`, (x) => x.th).map((x) => x.th);
      return { id: `m-${v.word}`, form: "practice", skill, cefr: v.cefr ?? undefined, prompt: `What does "${v.word}" mean?`, choices: [v.th, ...others], answer: 0, explain: `${v.word} = ${v.th}${v.example ? `\n“${v.example}”` : ""}` } satisfies Question;
    });
  }
  if (kind === "picture") {
    const pictured = all.filter((v) => v.ingredient);
    made = inLevels.filter((v) => v.ingredient).map((v) => {
      const others = pickOthers(pictured, v, 3, `${seed}${v.word}`, (x) => x.word).map((x) => x.word);
      return { id: `p-${v.word}`, form: "practice", skill, cefr: v.cefr ?? undefined, prompt: "What is this?", ingredient: v.ingredient, choices: [v.word, ...others], answer: 0, explain: `${v.word} = ${v.th}` } satisfies Question;
    });
  }
  if (kind === "listening") {
    made = inLevels.map((v) => {
      const others = pickOthers(all, v, 3, `${seed}${v.word}`, (x) => x.word).map((x) => x.word);
      return { id: `l-${v.word}`, form: "practice", skill, cefr: v.cefr ?? undefined, prompt: "Listen. Which word do you hear?", audio: v.word, choices: [v.word, ...others], answer: 0, explain: `${v.word} = ${v.th}` } satisfies Question;
    });
  }
  if (kind === "reply") {
    for (const r of restaurantsData.filter((r) => levels.includes(r.id))) {
      for (const c of r.customers) {
        const tree = dialogues[c.dialogue];
        if (!tree) continue;
        for (const [nodeId, node] of Object.entries(tree)) {
          const choices = node.choices ?? [];
          const best = [...choices].sort((a, b) => b.moodChange - a.moodChange)[0];
          // Only lines with one clearly best reply.
          if (choices.length < 2 || !best || best.moodChange <= 0 || choices.filter((ch) => ch.moodChange === best.moodChange).length > 1) continue;
          made.push({
            id: `r-${c.dialogue}-${nodeId}`, form: "practice", skill, cefr: r.cefr,
            prompt: `${c.name}: “${node.text}”`, choices: [best.text, ...choices.filter((ch) => ch !== best).map((ch) => ch.text)], answer: 0, explain: best.tip,
          });
        }
      }
    }
  }
  if (kind === "grammar") made = own.filter((q) => !q.grammar || levelsForGrammar(q.grammar).some((l) => levels.includes(l)));

  const pool = kind === "grammar" ? made : [...made, ...own];
  return shuffle(pool, seed).slice(0, 10);
}

const levelsForGrammar = (id: string) => (grammarData as GrammarPoint[]).find((g) => g.id === id)?.levels ?? [];

export const sortByLevel = (ids: string[]) => [...ids].sort((a, b) => levelIndex(a) - levelIndex(b));
