"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import ProgressView from "@/components/ProgressView";
import { useGameStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useHydrated } from "@/lib/useHydrated";
import { fetchLeaderboard } from "@/lib/ranking";

export default function DashboardScreen() {
  const hydrated = useHydrated();
  const records = useGameStore((s) => s.records);
  const saved = useGameStore((s) => s.progress);
  const { user, ready } = useAuth();
  const [rank, setRank] = useState<number | null>(null);

  // Where the learner stands among everyone (signed-in learners only).
  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetchLeaderboard().then(({ rows }) => {
      const i = rows.findIndex((r) => r.user_id === user.id);
      if (alive) setRank(i >= 0 ? i + 1 : null);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  return (
    <AppShell title="MY PROGRESS" th="คะแนน พัฒนาการ และกิจกรรมที่ทำไปแล้ว" wide>
      {hydrated && ready ? <ProgressView records={records} saved={saved} rank={user ? rank : null} /> : null}
    </AppShell>
  );
}
