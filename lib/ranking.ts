import { getSupabase } from "./supabase";

// One row of the leaderboard (public.leaderboard() in supabase/schema.sql). Only names, classes and
// totals are shared with other learners, never emails or answers.
export interface RankRow {
  user_id: string;
  display_name: string;
  avatar: string | null;
  classroom: string;
  stars: number;
  points: number;
  levels_done: number;
}

export async function fetchLeaderboard(classroom?: string): Promise<{ rows: RankRow[]; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { rows: [], error: "offline" };
  const { data, error } = await sb.rpc("leaderboard", { p_classroom: classroom || null });
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as RankRow[], error: null };
}
