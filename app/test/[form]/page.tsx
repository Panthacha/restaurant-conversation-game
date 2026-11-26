"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ClipboardCheck, Lock, Check, X, TrendingUp } from "lucide-react";
import AppShell, { Card } from "@/components/AppShell";
import QuizRunner, { type QuizAnswer } from "@/components/QuizRunner";
import { useContent } from "@/lib/content";
import { useGameStore, LEVEL_ORDER } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { saveTest } from "@/lib/records";
import { scoreBySkill, SKILL_LABEL } from "@/lib/quiz";
import { sfx } from "@/lib/sfx";
import type { Question, Skill, TestForm, TestResult } from "@/lib/types";

const INFO: Record<TestForm, { title: string; th: string }> = {
  pre: { title: "PRE-TEST", th: "แบบทดสอบก่อนเรียน: วัดระดับก่อนเริ่มเล่น" },
  post: { title: "POST-TEST", th: "แบบทดสอบหลังเรียน: ดูว่าพัฒนาขึ้นแค่ไหน" },
};
const SKILLS: Skill[] = ["vocab", "listening", "conversation", "grammar"];

export default function TestScreen() {
  const form = useParams().form as string;
  const hydrated = useHydrated();
  const { questions, ready } = useContent();
  const { records, progress } = useGameStore();
  const [running, setRunning] = useState(false);

  if (form !== "pre" && form !== "post") {
    return (
      <AppShell title="TEST" th="ไม่พบแบบทดสอบนี้">
        <Link href="/menu" className="font-mitr text-orange-600 underline">กลับเมนูหลัก</Link>
      </AppShell>
    );
  }
  const info = INFO[form];
  if (!hydrated || !ready) return <AppShell title={info.title} th={info.th}><div /></AppShell>;

  const items = questions.filter((q) => q.form === form);
  const done = [...records.tests].reverse().find((t) => t.form === form);
  const pre = [...records.tests].reverse().find((t) => t.form === "pre");
  const levelsDone = LEVEL_ORDER.filter((id) => (progress[id]?.stars ?? 0) > 0).length;
  const locked = form === "post" && levelsDone < LEVEL_ORDER.length;

  const finish = (answers: QuizAnswer[]) => {
    const correct = answers.map((a) => a.correct);
    const score = correct.filter(Boolean).length;
    sfx.success();
    void saveTest({ form, score, total: items.length, by_skill: scoreBySkill(items, correct), answers });
    setRunning(false);
  };

  if (running) {
    return (
      <AppShell title={info.title} th={`${info.th} (ทำให้ครบทุกข้อ ไม่มีเฉลยระหว่างทำ)`} back={`/test/${form}`} backLabel="ออก">
        <QuizRunner questions={items} seed={form} mode="test" onFinish={finish} />
      </AppShell>
    );
  }

  return (
    <AppShell title={info.title} th={info.th}>
      {done ? (
        <Results result={done} questions={items} pre={form === "post" ? pre : undefined} />
      ) : locked ? (
        <Card className="text-center py-10">
          <Lock size={48} className="mx-auto text-stone-400 mb-3" />
          <p className="font-mitr text-lg text-stone-700">แบบทดสอบหลังเรียนจะเปิดเมื่อผ่านครบทั้ง {LEVEL_ORDER.length} ร้าน</p>
          <p className="font-mitr text-stone-400 mb-5">ตอนนี้ผ่านแล้ว {levelsDone}/{LEVEL_ORDER.length} ร้าน</p>
          <Link href="/select" className="font-mitr bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl shadow-[0_4px_0_#9a3412]">ไปเล่นเกมต่อ</Link>
        </Card>
      ) : (
        <Card className="text-center py-8 md:py-10 max-w-2xl mx-auto">
          <ClipboardCheck size={56} className="mx-auto text-orange-500 mb-3" />
          <p className="font-mitr text-xl text-stone-800 mb-4">{items.length} ข้อ · 4 ทักษะ</p>
          <div className="flex flex-wrap justify-center gap-2 mb-5">
            {SKILLS.map((s) => (
              <span key={s} className="font-mitr text-sm px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                {SKILL_LABEL[s]} {items.filter((q) => q.skill === s).length} ข้อ
              </span>
            ))}
          </div>
          <ul className="font-mitr text-sm text-stone-500 space-y-1 mb-6">
            <li>• ข้อการฟังจะเล่นเสียงให้ฟัง กดฟังซ้ำได้</li>
            <li>• ระหว่างทำจะไม่บอกว่าถูกหรือผิด ดูเฉลยได้ตอนจบ</li>
            <li>• ทำได้ครั้งเดียว ตั้งใจทำให้เต็มที่นะ</li>
          </ul>
          <button onClick={() => setRunning(true)} className="font-luckiest-guy text-2xl tracking-wider bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-full shadow-[0_6px_0_#9a3412]">
            START
          </button>
        </Card>
      )}
    </AppShell>
  );
}

function Results({ result, questions, pre }: { result: TestResult; questions: Question[]; pre?: TestResult }) {
  const pct = Math.round((result.score / result.total) * 100);
  return (
    <div className="space-y-6">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <Card className="text-center">
          <p className="font-mitr text-stone-500">คะแนนของคุณ</p>
          <p className="font-luckiest-guy text-6xl text-orange-500 tracking-wider">{result.score}/{result.total}</p>
          <p className="font-mitr text-stone-500">{pct}% · ทำเมื่อ {new Date(result.created_at).toLocaleDateString("th-TH")}</p>
          {pre && (
            <p className={`mt-3 inline-flex items-center gap-2 font-mitr px-4 py-2 rounded-full ${result.score >= pre.score ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
              <TrendingUp size={18} /> ก่อนเรียน {pre.score}/{pre.total} → หลังเรียน {result.score}/{result.total} ({result.score - pre.score >= 0 ? "+" : ""}{result.score - pre.score} ข้อ)
            </p>
          )}
        </Card>
      </motion.div>

      <Card>
        <p className="font-mitr text-lg text-stone-800 mb-4">คะแนนแยกตามทักษะ</p>
        <div className="space-y-3">
          {SKILLS.map((s) => {
            const now = result.by_skill[s];
            const before = pre?.by_skill[s];
            if (!now) return null;
            return (
              <div key={s}>
                <div className="flex justify-between font-mitr text-sm text-stone-600 mb-1">
                  <span>{SKILL_LABEL[s]}</span>
                  <span>{before ? `${before.correct}/${before.total} → ` : ""}{now.correct}/{now.total}</span>
                </div>
                <div className="relative h-3 rounded-full bg-stone-100 overflow-hidden">
                  {before && <div className="absolute inset-y-0 left-0 bg-stone-300 rounded-full" style={{ width: `${(before.correct / before.total) * 100}%` }} />}
                  <div className="absolute inset-y-0 left-0 bg-orange-400 rounded-full mix-blend-multiply" style={{ width: `${(now.correct / now.total) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        {pre && <p className="font-mitr text-xs text-stone-400 mt-3">แถบสีเทา = ก่อนเรียน · แถบสีส้ม = หลังเรียน</p>}
      </Card>

      <Card>
        <p className="font-mitr text-lg text-stone-800 mb-4">เฉลย</p>
        <ol className="space-y-3">
          {result.answers.map((a, i) => {
            const q = questions.find((x) => x.id === a.id);
            return (
              <li key={a.id} className={`rounded-2xl border-2 p-3 ${a.correct ? "border-green-100 bg-green-50/50" : "border-red-100 bg-red-50/50"}`}>
                <p className="font-semibold text-stone-700 flex gap-2">
                  {a.correct ? <Check size={18} className="shrink-0 text-green-600 mt-0.5" /> : <X size={18} className="shrink-0 text-red-500 mt-0.5" />}
                  <span>{i + 1}. {q?.prompt ?? a.id}{q?.audio ? ` (“${q.audio}”)` : ""}</span>
                </p>
                <p className="text-sm text-stone-500 ml-6">ตอบ: {a.choice}{!a.correct && q ? ` · ที่ถูก: ${q.choices[q.answer]}` : ""}</p>
                {q?.explain && <p className="font-mitr text-sm text-amber-700 ml-6 mt-1">{q.explain}</p>}
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
