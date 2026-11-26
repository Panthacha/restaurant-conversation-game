import { getSupabase } from "./supabase";
import { reloadContent } from "./content";
import type { DbProfile, LevelAttempt, PracticeResult, Records, TestResult } from "./types";

// Data for the teacher's pages. Row-level security (supabase/schema.sql) only returns everyone's
// rows to accounts whose profile has role = 'admin'; anyone else just sees their own.

type WithUser<T> = T & { user_id: string };

export interface ClassData {
  profiles: DbProfile[];
  attempts: WithUser<LevelAttempt>[];
  practice: WithUser<PracticeResult>[];
  tests: WithUser<TestResult>[];
}

// Supabase returns at most 1,000 rows per request, so whole tables are read a page at a time.
const PAGE = 1000;
async function readAll<T>(table: string, columns: string, order: string): Promise<{ rows: T[]; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { rows: [], error: "ยังไม่ได้ตั้งค่า Supabase" };
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from(table).select(columns).order(order).order("id").range(from, from + PAGE - 1);
    if (error) return { rows, error: error.message };
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return { rows, error: null };
  }
}

export async function fetchClassData(): Promise<{ data: ClassData | null; error: string | null }> {
  if (!getSupabase()) return { data: null, error: "ยังไม่ได้ตั้งค่า Supabase" };
  const [profiles, attempts, practice, tests] = await Promise.all([
    readAll<DbProfile>("profiles", "*", "display_name"),
    readAll<WithUser<LevelAttempt>>("level_attempts", "user_id, level_id, stars, score, guests, created_at", "created_at"),
    readAll<WithUser<PracticeResult>>("practice_results", "user_id, kind, correct, total, points, created_at", "created_at"),
    readAll<WithUser<TestResult>>("test_results", "user_id, form, score, total, by_skill, answers, created_at", "created_at"),
  ]);
  const error = profiles.error ?? attempts.error ?? practice.error ?? tests.error;
  if (error) return { data: null, error };
  return { data: { profiles: profiles.rows, attempts: attempts.rows, practice: practice.rows, tests: tests.rows }, error: null };
}

// One student's records out of the class data.
export function recordsOf(data: ClassData, userId: string): Records {
  return {
    attempts: data.attempts.filter((a) => a.user_id === userId),
    practice: data.practice.filter((p) => p.user_id === userId),
    tests: data.tests.filter((t) => t.user_id === userId),
  };
}

export async function setRole(userId: string, role: DbProfile["role"]) {
  const sb = getSupabase();
  if (!sb) return "ยังไม่ได้ตั้งค่า Supabase";
  const { error } = await sb.from("profiles").update({ role }).eq("id", userId);
  return error?.message ?? null;
}

// Lets a student take a test again by removing their result (for example after a technical problem).
export async function deleteTestResult(userId: string, form: TestResult["form"]) {
  const sb = getSupabase();
  if (!sb) return "ยังไม่ได้ตั้งค่า Supabase";
  const { error } = await sb.from("test_results").delete().eq("user_id", userId).eq("form", form);
  return error?.message ?? null;
}

// --- editing conversations and questions -------------------------------------------------------

export async function saveContent(kind: "dialogue" | "question", id: string, data: object) {
  const sb = getSupabase();
  if (!sb) return "ยังไม่ได้ตั้งค่า Supabase";
  const { error } = await sb.from("content").upsert({ kind, id, data, updated_at: new Date().toISOString() });
  if (!error) reloadContent();
  return error?.message ?? null;
}

// Removes the teacher's version, so the built-in one (if any) is used again.
export async function resetContent(kind: "dialogue" | "question", id: string) {
  const sb = getSupabase();
  if (!sb) return "ยังไม่ได้ตั้งค่า Supabase";
  const { error } = await sb.from("content").delete().eq("kind", kind).eq("id", id);
  if (!error) reloadContent();
  return error?.message ?? null;
}
