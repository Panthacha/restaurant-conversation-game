"use client";

import { useEffect, useState } from "react";
import { Star, Crown } from "lucide-react";
import { fetchLeaderboard, type RankRow } from "@/lib/ranking";

const MEDAL = ["bg-yellow-400 text-yellow-900", "bg-stone-300 text-stone-700", "bg-amber-600 text-amber-50"];

// Learners ordered by stars, then points. `classroom` limits it to one class.
export default function Leaderboard({ classroom, highlight }: { classroom?: string; highlight?: string }) {
  const [state, setState] = useState<{ key: string; rows: RankRow[]; error: string | null } | null>(null);
  const key = classroom ?? "";

  useEffect(() => {
    let alive = true;
    fetchLeaderboard(classroom).then(({ rows, error }) => alive && setState({ key, rows, error }));
    return () => {
      alive = false;
    };
  }, [classroom, key]);

  if (!state || state.key !== key) return <p className="font-mitr text-stone-400 py-6 text-center">กำลังโหลดอันดับ…</p>;
  if (state.error) return <p className="font-mitr text-red-600 py-6 text-center">โหลดอันดับไม่สำเร็จ: {state.error}</p>;
  if (!state.rows.length) return <p className="font-mitr text-stone-400 py-6 text-center">ยังไม่มีนักเรียนในอันดับ</p>;

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full min-w-[520px] text-left">
        <thead>
          <tr className="font-mitr text-xs text-stone-400 border-b-2 border-stone-100">
            <th className="py-2 pl-2 w-14">อันดับ</th>
            <th className="py-2">ชื่อ</th>
            <th className="py-2">ห้อง</th>
            <th className="py-2 text-right">ดาว</th>
            <th className="py-2 text-right">ร้านที่ผ่าน</th>
            <th className="py-2 pr-2 text-right">คะแนน</th>
          </tr>
        </thead>
        <tbody>
          {state.rows.map((r, i) => (
            <tr key={r.user_id} className={`border-b border-stone-100 ${r.user_id === highlight ? "bg-orange-50" : ""}`}>
              <td className="py-2.5 pl-2">
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black ${MEDAL[i] ?? "bg-stone-100 text-stone-500"}`}>
                  {i === 0 ? <Crown size={16} /> : i + 1}
                </span>
              </td>
              <td className="py-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative w-9 h-9 rounded-xl bg-amber-400 overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.avatar?.startsWith("/") ? r.avatar : "/assets/avatars/avatar1.webp"} alt="" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] max-w-none" />
                  </div>
                  <span className="font-semibold text-stone-700">{r.display_name || "ไม่มีชื่อ"}{r.user_id === highlight && <span className="font-mitr text-xs text-orange-600"> (คุณ)</span>}</span>
                </div>
              </td>
              <td className="py-2.5 font-mitr text-sm text-stone-500">{r.classroom || "-"}</td>
              <td className="py-2.5 text-right tabular-nums">
                <span className="inline-flex items-center gap-1 font-semibold text-stone-700"><Star size={14} className="text-yellow-400 fill-yellow-400" /> {r.stars}</span>
              </td>
              <td className="py-2.5 text-right tabular-nums text-stone-600">{r.levels_done}</td>
              <td className="py-2.5 pr-2 text-right tabular-nums font-bold text-stone-800">{r.points.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
