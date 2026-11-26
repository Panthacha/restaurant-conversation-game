"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BookA, Image as ImageIcon, Headphones, MessagesSquare, PenLine, RotateCcw, Star } from "lucide-react";
import AppShell, { Card } from "@/components/AppShell";
import QuizRunner, { type QuizAnswer } from "@/components/QuizRunner";
import { useContent } from "@/lib/content";
import { makePractice, PRACTICE_KINDS, type PracticeKind } from "@/lib/quiz";
import { savePractice } from "@/lib/records";
import { sfx } from "@/lib/sfx";
import restaurantsData from "@/data/restaurants.json";
import type { Question } from "@/lib/types";

const ICONS: Record<PracticeKind, typeof BookA> = { meaning: BookA, picture: ImageIcon, listening: Headphones, reply: MessagesSquare, grammar: PenLine };
const POINTS_EACH = 10;

export default function PracticePage() {
  return (
    <Suspense>
      <PracticeScreen />
    </Suspense>
  );
}

function PracticeScreen() {
  const requested = useSearchParams().get("level");
  const { dialogues, questions, ready } = useContent();
  const [levels, setLevels] = useState<string[]>(() =>
    requested && restaurantsData.some((r) => r.id === requested) ? [requested] : restaurantsData.map((r) => r.id)
  );
  const [session, setSession] = useState<{ kind: PracticeKind; seed: string; questions: Question[] } | null>(null);
  const [result, setResult] = useState<{ kind: PracticeKind; correct: number; total: number } | null>(null);
  const [empty, setEmpty] = useState("");

  const start = (kind: PracticeKind) => {
    const seed = `${kind}-${Date.now()}`;
    const list = makePractice(kind, levels, dialogues, questions, seed);
    if (list.length < 3) {
      setEmpty("ร้านที่เลือกยังมีโจทย์แบบนี้ไม่พอ ลองเลือกร้านอื่นหรือทุกร้าน");
      return;
    }
    setEmpty("");
    setResult(null);
    setSession({ kind, seed, questions: list });
  };

  const finish = (answers: QuizAnswer[]) => {
    if (!session) return;
    const correct = answers.filter((a) => a.correct).length;
    void savePractice({ kind: session.kind, correct, total: answers.length, points: correct * POINTS_EACH });
    sfx.ding();
    setResult({ kind: session.kind, correct, total: answers.length });
    setSession(null);
  };

  const allSelected = levels.length === restaurantsData.length;

  if (session) {
    const info = PRACTICE_KINDS.find((k) => k.kind === session.kind)!;
    return (
      <AppShell title={info.title.toUpperCase()} th={info.th} back="/practice" backLabel="เลือกแบบฝึก">
        <QuizRunner questions={session.questions} seed={session.seed} mode="practice" onFinish={finish} />
      </AppShell>
    );
  }

  return (
    <AppShell title="PRACTICE" th="ฝึกคำศัพท์ การฟัง บทสนทนา และไวยากรณ์ รอบละ 10 ข้อ ได้ข้อละ 10 คะแนน">
      {result && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="mb-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <Star key={i} size={36} className={result.correct / result.total > i / 3 + 0.01 ? "text-yellow-400 fill-yellow-400" : "text-stone-200 fill-stone-200"} />
              ))}
            </div>
            <div className="flex-1">
              <p className="font-luckiest-guy text-3xl text-stone-800 tracking-wide">{result.correct}/{result.total} CORRECT</p>
              <p className="font-mitr text-stone-500">ได้ {result.correct * POINTS_EACH} คะแนน · {result.correct === result.total ? "เยี่ยมมาก! ถูกทุกข้อ" : "ลองอีกรอบเพื่อทำให้ดีขึ้น"}</p>
            </div>
            <button onClick={() => start(result.kind)} className="flex items-center gap-2 font-mitr bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-2xl shadow-[0_4px_0_#9a3412]">
              <RotateCcw size={18} /> ฝึกอีกรอบ
            </button>
          </Card>
        </motion.div>
      )}

      <h2 className="font-mitr text-lg text-orange-800 mb-2">1. เลือกร้าน</h2>
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setLevels(restaurantsData.map((r) => r.id))}
          className={`px-4 py-2 rounded-2xl border-2 font-mitr text-sm ${allSelected ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-white text-stone-600"}`}
        >
          ทุกร้าน
        </button>
        {restaurantsData.map((r, i) => {
          const on = !allSelected && levels.includes(r.id);
          return (
            <button
              key={r.id}
              onClick={() => setLevels([r.id])}
              className={`px-4 py-2 rounded-2xl border-2 font-mitr text-sm ${on ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-white text-stone-600"}`}
            >
              {i + 1}. {r.name}
            </button>
          );
        })}
      </div>

      <h2 className="font-mitr text-lg text-orange-800 mb-2">2. เลือกแบบฝึก</h2>
      {empty && <p className="font-mitr text-sm text-red-600 mb-3">{empty}</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PRACTICE_KINDS.map(({ kind, title, th }, i) => {
          const Icon = ICONS[kind];
          return (
            <motion.button
              key={kind}
              disabled={!ready}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => start(kind)}
              className="text-left bg-white rounded-[1.75rem] border-4 border-white shadow-[0_8px_0_#F3E3CF] hover:shadow-[0_4px_0_#F3E3CF] hover:translate-y-1 transition-all p-5 flex items-center gap-4 disabled:opacity-60"
            >
              <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-400 flex items-center justify-center">
                <Icon size={28} className="text-white" />
              </div>
              <div>
                <p className="font-luckiest-guy text-xl tracking-wide text-stone-800">{title}</p>
                <p className="font-mitr text-sm text-stone-500">{th}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </AppShell>
  );
}
