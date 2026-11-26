"use client";

import { useState } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import AppShell, { Card } from "@/components/AppShell";
import Leaderboard from "@/components/Leaderboard";
import { useAuth } from "@/lib/auth";
import { useGameStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";

export default function RankingScreen() {
  const hydrated = useHydrated();
  const { configured, ready, user } = useAuth();
  const classroom = useGameStore((s) => s.profile.classroom);
  const [mine, setMine] = useState(false);

  return (
    <AppShell title="RANKING" th="อันดับเรียงตามดาว แล้วตามคะแนน (คะแนนจากเกม + แบบฝึก)">
      {!hydrated || !ready ? null : !configured || !user ? (
        <Card className="text-center py-10">
          <p className="font-mitr text-lg text-stone-700 mb-2">ต้องเข้าสู่ระบบก่อนจึงจะดูและขึ้นอันดับได้</p>
          <p className="font-mitr text-stone-400 mb-5">{configured ? "เข้าสู่ระบบด้วย Google เพื่อบันทึกคะแนน" : "ระบบสมาชิกยังไม่ได้ตั้งค่า"}</p>
          {configured && (
            <Link href="/login" className="inline-flex items-center gap-2 font-mitr bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl shadow-[0_4px_0_#9a3412]">
              <LogIn size={18} /> เข้าสู่ระบบ
            </Link>
          )}
        </Card>
      ) : (
        <Card>
          <div className="flex gap-2 mb-4">
            <Tab on={!mine} onClick={() => setMine(false)}>ทุกห้อง</Tab>
            {classroom && <Tab on={mine} onClick={() => setMine(true)}>ห้อง {classroom}</Tab>}
          </div>
          <Leaderboard classroom={mine ? classroom : undefined} highlight={user.id} />
        </Card>
      )}
    </AppShell>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`font-mitr text-sm px-4 py-2 rounded-2xl border-2 ${on ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-stone-200 text-stone-600"}`}>
      {children}
    </button>
  );
}
