import { useEffect, useMemo, useSyncExternalStore } from "react";
import dialoguesData from "@/data/dialogues.json";
import questionsData from "@/data/questions.json";
import { getSupabase } from "./supabase";
import type { DialogueTree, Question } from "./types";

// Conversations and quiz questions: the built-in ones from data/, with the teacher's edits from the
// Supabase `content` table laid over them. An edited conversation replaces the built-in one with
// the same id; an edited question replaces its namesake, a new id adds a question, and
// `deleted: true` hides one.

export const builtInDialogues = dialoguesData as unknown as Record<string, DialogueTree>;
export const builtInQuestions = questionsData as Question[];

interface Overrides {
  dialogue: Record<string, DialogueTree>;
  question: Record<string, Question>;
}

const NONE: Overrides = { dialogue: {}, question: {} };
type Snapshot = { overrides: Overrides | null };
const SERVER: Snapshot = { overrides: null };

let snapshot: Snapshot = { overrides: null };
let loading = false;
const listeners = new Set<() => void>();

async function fetchOverrides(): Promise<Overrides> {
  const sb = getSupabase();
  if (!sb) return NONE;
  const { data, error } = await sb.from("content").select("kind, id, data");
  if (error) {
    console.error("Could not load edited content:", error.message);
    return NONE;
  }
  const out: Overrides = { dialogue: {}, question: {} };
  for (const row of data ?? []) {
    if (row.kind === "dialogue") out.dialogue[row.id] = row.data as DialogueTree;
    if (row.kind === "question") out.question[row.id] = { ...(row.data as Question), id: row.id };
  }
  return out;
}

function ensureLoaded() {
  if (snapshot.overrides || loading) return;
  loading = true;
  fetchOverrides().then((overrides) => {
    loading = false;
    snapshot = { overrides };
    listeners.forEach((l) => l());
  });
}

// After the teacher saves an edit: fetch the content again everywhere it is shown.
export function reloadContent() {
  snapshot = { overrides: null };
  listeners.forEach((l) => l());
  ensureLoaded();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function mergeQuestions(overrides: Record<string, Question>) {
  const merged = builtInQuestions.map((q) => overrides[q.id] ?? q);
  const added = Object.values(overrides).filter((q) => !builtInQuestions.some((b) => b.id === q.id));
  return [...merged, ...added].filter((q) => !q.deleted);
}

export function useContent() {
  const current = useSyncExternalStore(subscribe, () => snapshot, () => SERVER);
  useEffect(ensureLoaded, [current]);
  return useMemo(() => {
    const o = current.overrides ?? NONE;
    return {
      ready: current.overrides !== null,
      dialogues: { ...builtInDialogues, ...o.dialogue } as Record<string, DialogueTree>,
      questions: mergeQuestions(o.question),
      edited: o,
    };
  }, [current]);
}
