"use client";

import { Users, ClipboardCheck, UtensilsCrossed, Dumbbell } from "lucide-react";
import { Card } from "@/components/AppShell";
import Bars from "@/components/Bars";
import { recordsOf, type ClassData } from "@/lib/admin";
import { progressFromAttempts } from "@/lib/store";
import { builtInQuestions, useContent } from "@/lib/content";
import { SKILL_LABEL } from "@/lib/quiz";
import restaurantsData from "@/data/restaurants.json";
import type { DbProfile, Skill, TestResult } from "@/lib/types";

// Categorical slots 1 and 2 of the validated chart palette.
const BLUE = "#2a78d6";
const ORANGE = "#eb6834";
const SKILLS: Skill[] = ["vocab", "listening", "conversation", "grammar"];
const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function Overview({ data, students }: { data: ClassData; students: DbProfile[] }) {
  const { questions } = useContent();
  const ids = new Set(students.map((s) => s.id));
  const latest = (form: TestResult["form"]) => {
    const m = new Map<string, TestResult>();
    for (const t of data.tests) if (t.form === form && ids.has(t.user_id)) m.set(t.user_id, t);
    return m;
  };
  const pre = latest("pre");
  const post = latest("post");
  const paired = [...post.keys()].filter((id) => pre.has(id));
  const progress = students.map((s) => progressFromAttempts(recordsOf(data, s.id).attempts));
  const attempts = data.attempts.filter((a) => ids.has(a.user_id));
  const practice = data.practice.filter((p) => ids.has(p.user_id));

  // Average share right per skill, over the students who took both tests.
  const skillShare = (tests: Map<string, TestResult>, skill: Skill) => {
    let c = 0;
    let t = 0;
    for (const id of paired) {
      const s = tests.get(id)?.by_skill[skill];
      if (s) {
        c += s.correct;
        t += s.total;
      }
    }
    return t ? c / t : null;
  };
  const avg = (tests: Map<string, TestResult>, idsIn: string[]) => (idsIn.length ? idsIn.reduce((s, id) => s + tests.get(id)!.score / tests.get(id)!.total, 0) / idsIn.length : 0);

  // Questions most students got wrong.
  const misses = new Map<string, { wrong: number; total: number }>();
  for (const t of [...pre.values(), ...post.values()]) {
    for (const a of t.answers) {
      const m = misses.get(a.id) ?? { wrong: 0, total: 0 };
      m.total++;
      if (!a.correct) m.wrong++;
      misses.set(a.id, m);
    }
  }
  const hardest = [...misses].filter(([, m]) => m.total >= 2).sort((a, b) => b[1].wrong / b[1].total - a[1].wrong / a[1].total).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Tile icon={Users} label="นักเรียน" value={String(students.length)} note={`เข้าเล่นแล้ว ${new Set(attempts.map((a) => a.user_id)).size} คน`} />
        <Tile icon={ClipboardCheck} label="ทำ Pre / Post-test" value={`${pre.size} / ${post.size}`} note={`ทำครบทั้งสองแบบ ${paired.length} คน`} />
        <Tile icon={UtensilsCrossed} label="รอบที่เล่นเกม" value={String(attempts.length)} note={`ตอบไป ${attempts.reduce((s, a) => s + a.guests.reduce((g, x) => g + x.replies.length, 0), 0)} ครั้ง`} />
        <Tile icon={Dumbbell} label="รอบที่ฝึก" value={String(practice.length)} note={`ตอบถูก ${pct(practice.reduce((s, p) => s + p.correct, 0) / Math.max(1, practice.reduce((s, p) => s + p.total, 0)))}`} />
      </div>

      <Card>
        <p className="font-mitr text-lg text-stone-800">พัฒนาการ: ก่อนเรียน vs หลังเรียน</p>
        <p className="font-mitr text-sm text-stone-400 mb-4">
          {paired.length
            ? `เฉลี่ยจากนักเรียน ${paired.length} คนที่ทำครบทั้งสองแบบ · ก่อนเรียน ${pct(avg(pre, paired))} → หลังเรียน ${pct(avg(post, paired))}`
            : "ยังไม่มีนักเรียนที่ทำครบทั้ง Pre-test และ Post-test"}
        </p>
        {paired.length > 0 && (
          <Bars
            max={1}
            series={[{ name: "ก่อนเรียน", color: BLUE }, { name: "หลังเรียน", color: ORANGE }]}
            rows={SKILLS.map((s) => {
              const a = skillShare(pre, s);
              const b = skillShare(post, s);
              return { label: SKILL_LABEL[s], values: [a, b], texts: [a === null ? "-" : pct(a), b === null ? "-" : pct(b)] };
            })}
          />
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <p className="font-mitr text-lg text-stone-800">ดาวเฉลี่ยของแต่ละร้าน</p>
          <p className="font-mitr text-sm text-stone-400 mb-4">ดาวสูงสุดของนักเรียนแต่ละคน เฉลี่ยทั้งห้อง (เต็ม 3)</p>
          <Bars
            max={3}
            series={[{ name: "ดาวเฉลี่ย", color: BLUE }]}
            rows={restaurantsData.map((r) => {
              const v = progress.length ? progress.reduce((s, p) => s + p[r.id].stars, 0) / progress.length : 0;
              const passed = progress.filter((p) => p[r.id].stars > 0).length;
              return { label: r.name, values: [v], texts: [`${v.toFixed(1)} ดาว · ผ่าน ${passed} คน`] };
            })}
          />
        </Card>
        <Card>
          <p className="font-mitr text-lg text-stone-800">ตอบอย่างสุภาพ (แยกตามร้าน)</p>
          <p className="font-mitr text-sm text-stone-400 mb-4">สัดส่วนคำตอบที่สุภาพ (+) จากทุกคำตอบในร้านนั้น</p>
          <Bars
            max={1}
            series={[{ name: "ตอบสุภาพ", color: BLUE }]}
            rows={restaurantsData.map((r) => {
              const replies = attempts.filter((a) => a.level_id === r.id).flatMap((a) => a.guests.flatMap((g) => g.replies));
              const v = replies.length ? replies.filter((x) => x.moodChange > 0).length / replies.length : null;
              return { label: r.name, values: [v], texts: [v === null ? "ยังไม่มีข้อมูล" : `${pct(v)} จาก ${replies.length} คำตอบ`] };
            })}
          />
        </Card>
      </div>

      <Card>
        <p className="font-mitr text-lg text-stone-800 mb-3">ข้อสอบที่นักเรียนตอบผิดมากที่สุด</p>
        {hardest.length ? (
          <ol className="space-y-2">
            {hardest.map(([id, m]) => {
              const q = questions.find((x) => x.id === id) ?? builtInQuestions.find((x) => x.id === id);
              return (
                <li key={id} className="flex items-start gap-3">
                  <span className="shrink-0 font-bold text-red-600 tabular-nums w-14">{pct(m.wrong / m.total)}</span>
                  <span className="text-stone-700">{q?.prompt ?? id} <span className="font-mitr text-xs text-stone-400">({id} · ผิด {m.wrong}/{m.total} คน)</span></span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="font-mitr text-stone-400">ยังมีข้อมูลไม่พอ</p>
        )}
      </Card>
    </div>
  );
}

function Tile({ icon: Icon, label, value, note }: { icon: typeof Users; label: string; value: string; note: string }) {
  return (
    <Card className="!p-4 md:!p-5">
      <p className="font-mitr text-sm text-stone-500 flex items-center gap-1.5"><Icon size={16} className="text-orange-500" /> {label}</p>
      <p className="text-3xl md:text-4xl font-bold text-stone-800 mt-1 tabular-nums">{value}</p>
      <p className="font-mitr text-xs text-stone-400 mt-1">{note}</p>
    </Card>
  );
}
