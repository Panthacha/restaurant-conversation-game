"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ShieldCheck, Mic, Keyboard, MousePointerClick, Lightbulb, RotateCcw } from "lucide-react";
import { Card } from "@/components/AppShell";
import ProgressView, { summarize } from "@/components/ProgressView";
import { recordsOf, setRole, deleteTestResult, type ClassData } from "@/lib/admin";
import { recipeName } from "@/lib/dialogueCheck";
import restaurantsData from "@/data/restaurants.json";
import type { DbProfile, Records } from "@/lib/types";

const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }) : "-");

export default function Students({ data, people, onChanged }: { data: ClassData; people: DbProfile[]; onChanged: () => void }) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const shown = people.filter((p) => !q || `${p.display_name} ${p.email} ${p.classroom}`.toLowerCase().includes(q));
  const open = people.find((p) => p.id === openId) ?? null;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4 bg-stone-50 border-2 border-stone-100 rounded-2xl px-3">
        <Search size={18} className="text-stone-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาชื่อ อีเมล หรือห้อง" className="flex-1 bg-transparent py-2.5 focus:outline-none" />
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="font-mitr text-xs text-stone-400 border-b-2 border-stone-100">
              <th className="py-2 pl-2">ชื่อ</th>
              <th className="py-2">ห้อง</th>
              <th className="py-2 text-right">ร้านที่ผ่าน</th>
              <th className="py-2 text-right">ดาว</th>
              <th className="py-2 text-right">คะแนน</th>
              <th className="py-2 text-right">ตอบสุภาพ</th>
              <th className="py-2 text-right">Pre</th>
              <th className="py-2 text-right">Post</th>
              <th className="py-2 pr-2 text-right">ล่าสุด</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => {
              const records = recordsOf(data, p.id);
              const s = summarize(records);
              const last = [...records.attempts, ...records.practice, ...records.tests].map((r) => r.created_at).sort().at(-1);
              return (
                <tr key={p.id} onClick={() => setOpenId(p.id)} className="border-b border-stone-100 hover:bg-orange-50 cursor-pointer">
                  <td className="py-2.5 pl-2">
                    <p className="font-semibold text-stone-800 flex items-center gap-1.5">
                      {p.display_name || "ไม่มีชื่อ"} {p.role === "admin" && <ShieldCheck size={14} className="text-amber-600" />}
                    </p>
                    <p className="text-xs text-stone-400">{p.email}</p>
                  </td>
                  <td className="py-2.5 font-mitr text-stone-600">{p.classroom || "-"}</td>
                  <td className="py-2.5 text-right tabular-nums">{s.levelsDone}/{restaurantsData.length}</td>
                  <td className="py-2.5 text-right tabular-nums">{s.stars}</td>
                  <td className="py-2.5 text-right tabular-nums font-semibold">{s.points.toLocaleString()}</td>
                  <td className="py-2.5 text-right tabular-nums">{s.replies ? `${Math.round(s.politeRate * 100)}%` : "-"}</td>
                  <td className="py-2.5 text-right tabular-nums">{s.pre ? `${s.pre.score}/${s.pre.total}` : "-"}</td>
                  <td className="py-2.5 text-right tabular-nums">{s.post ? `${s.post.score}/${s.post.total}` : "-"}</td>
                  <td className="py-2.5 pr-2 text-right font-mitr text-xs text-stone-500">{date(last)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!shown.length && <p className="font-mitr text-stone-400 text-center py-6">ไม่พบนักเรียน</p>}
      </div>

      <AnimatePresence>
        {open && <StudentDrawer person={open} records={recordsOf(data, open.id)} onClose={() => setOpenId(null)} onChanged={onChanged} />}
      </AnimatePresence>
    </Card>
  );
}

function StudentDrawer({ person, records, onClose, onChanged }: { person: DbProfile; records: Records; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const run = async (label: string, job: () => Promise<string | null>) => {
    setBusy(label);
    const problem = await job();
    setBusy("");
    if (problem) setError(problem);
    else onChanged();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28 }}
        className="w-full max-w-4xl h-full bg-[#FFF8E7] overflow-y-auto custom-scrollbar p-4 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <p className="font-luckiest-guy text-3xl text-stone-800 tracking-wide">{person.display_name || "ไม่มีชื่อ"}</p>
            <p className="font-mitr text-stone-500">{person.email} · ห้อง {person.classroom || "-"} · {person.role === "admin" ? "ครู/ผู้ดูแล" : "นักเรียน"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-orange-100 text-stone-500"><X size={24} /></button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            disabled={!!busy}
            onClick={() => run("role", () => setRole(person.id, person.role === "admin" ? "student" : "admin"))}
            className="flex items-center gap-1.5 font-mitr text-sm px-3 py-2 rounded-xl bg-white border-2 border-stone-200 hover:border-amber-400 disabled:opacity-50"
          >
            <ShieldCheck size={16} /> {person.role === "admin" ? "เปลี่ยนเป็นนักเรียน" : "ให้สิทธิ์ครู/ผู้ดูแล"}
          </button>
          {(["pre", "post"] as const).map((form) =>
            records.tests.some((t) => t.form === form) ? (
              <button
                key={form}
                disabled={!!busy}
                onClick={() => {
                  if (confirm(`ลบผล ${form === "pre" ? "Pre-test" : "Post-test"} ของ ${person.display_name} เพื่อให้ทำใหม่?`)) void run(form, () => deleteTestResult(person.id, form));
                }}
                className="flex items-center gap-1.5 font-mitr text-sm px-3 py-2 rounded-xl bg-white border-2 border-stone-200 hover:border-red-300 disabled:opacity-50"
              >
                <RotateCcw size={16} /> ให้ทำ {form === "pre" ? "Pre-test" : "Post-test"} ใหม่
              </button>
            ) : null
          )}
          {error && <p className="font-mitr text-sm text-red-600 self-center">{error}</p>}
        </div>

        <ProgressView records={records} />

        <Card className="mt-6">
          <p className="font-mitr text-lg text-stone-800 mb-1">บทสนทนาที่ผ่านมา</p>
          <p className="font-mitr text-sm text-stone-400 mb-4 flex flex-wrap gap-3">
            <span className="flex items-center gap-1"><MousePointerClick size={14} /> เลือกตอบ</span>
            <span className="flex items-center gap-1"><Mic size={14} /> พูดตอบ</span>
            <span className="flex items-center gap-1"><Keyboard size={14} /> พิมพ์ตอบ</span>
            <span className="flex items-center gap-1"><Lightbulb size={14} /> ใช้ตัวช่วย</span>
          </p>
          {records.attempts.length === 0 && <p className="font-mitr text-stone-400">ยังไม่ได้เล่น</p>}
          <div className="space-y-4">
            {[...records.attempts].reverse().slice(0, 15).map((a, i) => (
              <div key={i} className="rounded-2xl border-2 border-stone-100 p-3">
                <p className="font-semibold text-stone-800 mb-2">
                  {restaurantsData.find((r) => r.id === a.level_id)?.name} · {a.stars} ดาว · {a.score} คะแนน
                  <span className="font-mitr text-xs text-stone-400 font-normal"> · {date(a.created_at)}</span>
                </p>
                {a.guests.map((g, k) => (
                  <div key={k} className="mb-2 last:mb-0">
                    <p className="font-mitr text-sm text-stone-600">{g.customer} สั่ง {recipeName(g.recipeId)} · ได้ {g.stars} ดาว</p>
                    <ul className="mt-1 space-y-1">
                      {g.replies.map((r, j) => {
                        const Icon = r.mode === "speak" ? Mic : r.mode === "type" ? Keyboard : MousePointerClick;
                        return (
                          <li key={j} className={`flex items-start gap-2 text-sm rounded-lg px-2 py-1 ${r.moodChange > 0 ? "bg-green-50 text-green-800" : r.moodChange < 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>
                            <Icon size={14} className="shrink-0 mt-0.5" />
                            {r.hint && <Lightbulb size={14} className="shrink-0 mt-0.5" />}
                            <span>
                              {r.text}
                              {r.heard && r.heard !== r.text && <span className="block text-xs opacity-70">ได้ยิน/พิมพ์ว่า: “{r.heard}”</span>}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
        {busy && <p className="fixed bottom-4 right-4 font-mitr bg-stone-800 text-white px-4 py-2 rounded-xl">กำลังบันทึก…</p>}
      </motion.div>
    </motion.div>
  );
}
