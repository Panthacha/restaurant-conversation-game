import { useGameStore } from "./store";
import { getSupabase, currentUserId } from "./supabase";
import type { LevelAttempt, PracticeResult, Records, TestResult } from "./types";

// Saving and loading what a learner has done. Everything is kept on the device (so guests have a
// dashboard too) and, when signed in, also stored in Supabase for the teacher, the ranking and other devices.

const now = () => new Date().toISOString();

async function insert(table: string, row: object) {
  const sb = getSupabase();
  const userId = await currentUserId();
  if (!sb || !userId) return;
  const { error } = await sb.from(table).insert({ ...row, user_id: userId });
  if (error) console.error(`Could not save to ${table}:`, error.message);
}

export async function saveLevelAttempt(attempt: Omit<LevelAttempt, "created_at">) {
  const row = { ...attempt, created_at: now() };
  useGameStore.getState().addAttempt(row);
  await insert("level_attempts", attempt);
}

export async function savePractice(result: Omit<PracticeResult, "created_at">) {
  useGameStore.getState().addPractice({ ...result, created_at: now() });
  await insert("practice_results", result);
}

export async function saveTest(result: Omit<TestResult, "created_at">) {
  useGameStore.getState().addTest({ ...result, created_at: now() });
  await insert("test_results", result);
}

// A learner's whole history from Supabase (used when they sign in, and by the teacher's view).
export async function fetchRecords(userId: string): Promise<Records | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const [attempts, practice, tests] = await Promise.all([
    sb.from("level_attempts").select("level_id, stars, score, guests, created_at").eq("user_id", userId).order("created_at"),
    sb.from("practice_results").select("kind, correct, total, points, created_at").eq("user_id", userId).order("created_at"),
    sb.from("test_results").select("form, score, total, by_skill, answers, created_at").eq("user_id", userId).order("created_at"),
  ]);
  const error = attempts.error ?? practice.error ?? tests.error;
  if (error) {
    console.error("Could not load records:", error.message);
    return null;
  }
  return {
    attempts: (attempts.data ?? []) as LevelAttempt[],
    practice: (practice.data ?? []) as PracticeResult[],
    tests: (tests.data ?? []) as TestResult[],
  };
}

// Points for one level attempt: 100 per star, 10 per polite reply, 5 more for each reply said
// or typed without opening the hint.
export function attemptScore(guests: LevelAttempt["guests"]) {
  return guests.reduce(
    (sum, g) =>
      sum + g.stars * 100 + g.replies.reduce((s, r) => s + (r.moodChange > 0 ? 10 : 0) + (r.mode !== "choose" && !r.hint ? 5 : 0), 0),
    0
  );
}

export const preTestDone = (records: Records) => records.tests.some((t) => t.form === "pre");
export const postTestDone = (records: Records) => records.tests.some((t) => t.form === "post");
