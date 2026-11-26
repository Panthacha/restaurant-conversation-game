"use client";

import { Star, Check, MessageCircleHeart, Trophy, Award, ClipboardCheck, Dumbbell, UtensilsCrossed } from "lucide-react";
import { Card } from "./AppShell";
import { progressFromAttempts, type RestaurantProgress } from "@/lib/store";
import { PRACTICE_KINDS, SKILL_LABEL } from "@/lib/quiz";
import restaurantsData from "@/data/restaurants.json";
import type { Records, Skill, TestResult } from "@/lib/types";

// A learner's progress, worked out from their records. Used by the learner's own dashboard and by
// the teacher's view of one student, so both always agree.

const SKILLS: Skill[] = ["vocab", "listening", "conversation", "grammar"];
// Categorical slots 1 and 2 of the validated chart palette (pre-test, post-test).
const PRE = "#2a78d6";
const POST = "#eb6834";

// `saved` is the progress kept on this device, which can include stars won before attempts were recorded.
export function summarize(records: Records, saved?: Record<string, RestaurantProgress>) {
  const progress = progressFromAttempts(records.attempts);
  for (const [id, p] of Object.entries(saved ?? {})) {
    if (!progress[id]) continue;
    progress[id] = { unlocked: progress[id].unlocked || p.unlocked, stars: Math.max(progress[id].stars, p.stars), score: Math.max(progress[id].score, p.score) };
  }
  const replies = records.attempts.flatMap((a) => a.guests.flatMap((g) => g.replies));
  const polite = replies.filter((r) => r.moodChange > 0).length;
  const spoken = replies.filter((r) => r.mode !== "choose").length;
  const levelPoints = Object.values(progress).reduce((s, p) => s + p.score, 0);
  const practicePoints = records.practice.reduce((s, p) => s + p.points, 0);
  return {
    progress,
    stars: Object.values(progress).reduce((s, p) => s + p.stars, 0),
    maxStars: restaurantsData.length * 3,
    levelsDone: Object.values(progress).filter((p) => p.stars > 0).length,
    points: levelPoints + practicePoints,
    replies: replies.length,
    politeRate: replies.length ? polite / replies.length : 0,
    spokenRate: replies.length ? spoken / replies.length : 0,
    pre: [...records.tests].reverse().find((t) => t.form === "pre"),
    post: [...records.tests].reverse().find((t) => t.form === "post"),
  };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const day = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function ProgressView({ records, rank, saved }: { records: Records; rank?: number | null; saved?: Record<string, RestaurantProgress> }) {
  const s = summarize(records, saved);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Tile icon={Star} label="ดาวทั้งหมด" value={`${s.stars}/${s.maxStars}`} note={`ผ่าน ${s.levelsDone}/${restaurantsData.length} ร้าน`} />
        <Tile icon={Award} label="คะแนนรวม" value={s.points.toLocaleString()} note="เกม + แบบฝึก" />
        <Tile icon={Trophy} label="อันดับ" value={rank ? `#${rank}` : "-"} note={rank ? "จากนักเรียนทั้งหมด" : "ต้องเข้าสู่ระบบ"} />
        <Tile icon={MessageCircleHeart} label="ตอบอย่างสุภาพ" value={s.replies ? pct(s.politeRate) : "-"} note={`จาก ${s.replies} คำตอบ · พูดตอบ ${pct(s.spokenRate)}`} />
      </div>

      <TestCompare pre={s.pre} post={s.post} />

      <Card>
        <p className="font-mitr text-lg text-stone-800 mb-4 flex items-center gap-2"><UtensilsCrossed size={20} className="text-orange-500" /> ความก้าวหน้าแต่ละร้าน</p>
        <div className="divide-y divide-stone-100">
          {restaurantsData.map((r, i) => {
            const p = s.progress[r.id];
            const tries = records.attempts.filter((a) => a.level_id === r.id);
            const served = new Set(tries.flatMap((a) => a.guests.filter((g) => g.stars > 0).map((g) => g.customer)));
            return (
              <div key={r.id} className="py-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <div className="md:w-56 shrink-0">
                  <p className="font-semibold text-stone-800">{i + 1}. {r.name}</p>
                  <p className="font-mitr text-xs text-stone-400">{tries.length ? `เล่น ${tries.length} ครั้ง · คะแนนสูงสุด ${p.score}` : p.unlocked ? "ยังไม่ได้เล่น" : "ยังล็อกอยู่"}</p>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {[0, 1, 2].map((k) => <Star key={k} size={20} className={k < p.stars ? "text-yellow-400 fill-yellow-400" : "text-stone-200 fill-stone-200"} />)}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {r.customers.map((c) => (
                    <span key={c.name} className={`inline-flex items-center gap-1 font-mitr text-xs px-2 py-0.5 rounded-full border ${served.has(c.name) ? "bg-green-50 border-green-200 text-green-700" : "bg-stone-50 border-stone-200 text-stone-400"}`}>
                      {served.has(c.name) && <Check size={12} strokeWidth={3} />} คุยกับ {c.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <PracticeSummary records={records} />

      <Card>
        <p className="font-mitr text-lg text-stone-800 mb-3">กิจกรรมล่าสุด</p>
        <Recent records={records} />
      </Card>
    </div>
  );
}

function Tile({ icon: Icon, label, value, note }: { icon: typeof Star; label: string; value: string; note: string }) {
  return (
    <Card className="!p-4 md:!p-5">
      <p className="font-mitr text-sm text-stone-500 flex items-center gap-1.5"><Icon size={16} className="text-orange-500" /> {label}</p>
      <p className="text-3xl md:text-4xl font-bold text-stone-800 mt-1 tabular-nums">{value}</p>
      <p className="font-mitr text-xs text-stone-400 mt-1">{note}</p>
    </Card>
  );
}

// Pre-test vs post-test per skill: two short bars per skill on one shared 0–100% scale.
function TestCompare({ pre, post }: { pre?: TestResult; post?: TestResult }) {
  if (!pre) {
    return (
      <Card className="flex items-center gap-3">
        <ClipboardCheck className="text-orange-500 shrink-0" />
        <p className="font-mitr text-stone-600">ยังไม่ได้ทำแบบทดสอบก่อนเรียน ทำ Pre-test ก่อน แล้วค่อยเทียบกับ Post-test เพื่อดูพัฒนาการ</p>
      </Card>
    );
  }
  const series = [{ name: "ก่อนเรียน", color: PRE, test: pre }, ...(post ? [{ name: "หลังเรียน", color: POST, test: post }] : [])];
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <p className="font-mitr text-lg text-stone-800">ผลแบบทดสอบ{post ? "ก่อนและหลังเรียน" : "ก่อนเรียน"}</p>
        <div className="flex gap-4 font-mitr text-sm text-stone-600">
          {series.map((x) => (
            <span key={x.name} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: x.color }} /> {x.name} {x.test.score}/{x.test.total}
            </span>
          ))}
        </div>
      </div>
      <p className="font-mitr text-sm text-stone-400 mb-4">
        {post ? `พัฒนาขึ้น ${post.score - pre.score >= 0 ? "+" : ""}${post.score - pre.score} ข้อ` : "ผ่านครบทุกร้านแล้วทำ Post-test เพื่อเทียบพัฒนาการ"}
      </p>
      <div className="space-y-4">
        {SKILLS.map((skill) => (
          <div key={skill} className="grid grid-cols-[5.5rem_1fr] gap-3 items-center">
            <span className="font-mitr text-sm text-stone-600">{SKILL_LABEL[skill]}</span>
            <div className="flex flex-col gap-[2px]">
              {series.map((x) => {
                const sc = x.test.by_skill[skill];
                const share = sc && sc.total ? sc.correct / sc.total : 0;
                return (
                  <div key={x.name} className="group relative flex items-center gap-2 h-3.5">
                    <div className="h-3 rounded-r-[4px] min-w-[2px] transition-[width]" style={{ width: `calc(${share * 100}% - 3rem)`, background: x.color }} />
                    <span className="text-xs text-stone-500 tabular-nums">{sc ? `${sc.correct}/${sc.total}` : "-"}</span>
                    <span className="pointer-events-none absolute left-0 -top-8 z-10 hidden group-hover:block whitespace-nowrap rounded-lg bg-stone-800 text-white text-xs font-mitr px-2 py-1">
                      {x.name} · {SKILL_LABEL[skill]}: {sc ? `${sc.correct}/${sc.total} (${pct(share)})` : "-"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Accuracy per practice kind, one series on a 0–100% scale.
function PracticeSummary({ records }: { records: Records }) {
  const rows = PRACTICE_KINDS.map((k) => {
    const sessions = records.practice.filter((p) => p.kind === k.kind);
    const correct = sessions.reduce((s, p) => s + p.correct, 0);
    const total = sessions.reduce((s, p) => s + p.total, 0);
    return { ...k, sessions: sessions.length, share: total ? correct / total : 0, total };
  });
  return (
    <Card>
      <p className="font-mitr text-lg text-stone-800 mb-1 flex items-center gap-2"><Dumbbell size={20} className="text-orange-500" /> ความแม่นยำในแบบฝึก</p>
      <p className="font-mitr text-sm text-stone-400 mb-4">ตอบถูกกี่เปอร์เซ็นต์ในแต่ละแบบฝึก (รวมทุกรอบ)</p>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.kind} className="grid grid-cols-[8.5rem_1fr] gap-3 items-center">
            <span className="font-mitr text-sm text-stone-600 truncate">{r.th}</span>
            <div className="group relative flex items-center gap-2 h-4">
              {r.total > 0 && <div className="h-3 rounded-r-[4px] min-w-[2px]" style={{ width: `calc(${r.share * 100}% - 6rem)`, background: PRE }} />}
              <span className="text-xs text-stone-500 tabular-nums whitespace-nowrap">{r.total ? `${pct(r.share)} · ${r.sessions} รอบ` : "ยังไม่ได้ฝึก"}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Recent({ records }: { records: Records }) {
  const items = [
    ...records.attempts.map((a) => ({ at: a.created_at, icon: UtensilsCrossed, text: `เล่น ${restaurantsData.find((r) => r.id === a.level_id)?.name ?? a.level_id} ได้ ${a.stars} ดาว (${a.score} คะแนน)` })),
    ...records.practice.map((p) => ({ at: p.created_at, icon: Dumbbell, text: `ฝึก${PRACTICE_KINDS.find((k) => k.kind === p.kind)?.th ?? p.kind} ถูก ${p.correct}/${p.total}` })),
    ...records.tests.map((t) => ({ at: t.created_at, icon: ClipboardCheck, text: `${t.form === "pre" ? "แบบทดสอบก่อนเรียน" : "แบบทดสอบหลังเรียน"} ได้ ${t.score}/${t.total}` })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 10);
  if (!items.length) return <p className="font-mitr text-stone-400">ยังไม่มีกิจกรรม เริ่มจาก Pre-test หรือเล่นร้านแรกได้เลย</p>;
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-3 font-mitr text-sm text-stone-600">
          <it.icon size={16} className="text-orange-400 shrink-0" />
          <span className="flex-1">{it.text}</span>
          <span className="text-xs text-stone-400 shrink-0">{day(it.at)}</span>
        </li>
      ))}
    </ul>
  );
}

