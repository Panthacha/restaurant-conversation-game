"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Check, X, ChevronRight, Lightbulb } from "lucide-react";
import type { Question } from "@/lib/types";
import { arrange, SKILL_LABEL } from "@/lib/quiz";
import { speak } from "@/lib/tts";
import { sfx } from "@/lib/sfx";
import IngredientPicture from "./IngredientPicture";
import { CefrBadge } from "./AppShell";

export interface QuizAnswer {
  id: string;
  choice: string;
  correct: boolean;
}

// Runs a list of questions one at a time. Practice shows right/wrong and the explanation after each
// answer; a test only moves on, so the learner sees the results at the end.
export default function QuizRunner({ questions, seed, mode, onFinish }: { questions: Question[]; seed: string; mode: "practice" | "test"; onFinish: (answers: QuizAnswer[]) => void }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const q = questions[index];
  const shown = useMemo(() => (q ? arrange(q, seed) : null), [q, seed]);
  const reveal = mode === "practice" && picked !== null;

  // Listening questions play their sentence as they appear.
  useEffect(() => {
    if (q?.audio) speak(q.audio, { rate: 0.85 });
  }, [q]);

  const choose = (i: number) => {
    if (picked !== null && mode === "practice") return;
    setPicked(i);
    if (mode === "practice" && shown) {
      if (i === shown.answer) sfx.success();
      else sfx.fail();
    } else sfx.pop();
  };

  const next = () => {
    if (picked === null || !q || !shown) return;
    const all = [...answers, { id: q.id, choice: shown.choices[picked], correct: picked === shown.answer }];
    setAnswers(all);
    setPicked(null);
    if (index + 1 >= questions.length) onFinish(all);
    else setIndex(index + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (shown && n >= 1 && n <= shown.choices.length) choose(n - 1);
      if (e.key === "Enter" && picked !== null) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!q || !shown) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <span className="font-mitr text-sm text-stone-500 shrink-0">ข้อ {index + 1}/{questions.length}</span>
        <div className="flex-1 h-3 bg-white rounded-full overflow-hidden border-2 border-white shadow-inner">
          <motion.div className="h-full bg-gradient-to-r from-orange-400 to-amber-300" initial={{ width: 0 }} animate={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={q.id + index} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="bg-white rounded-[1.75rem] border-4 border-white shadow-[0_8px_0_#F3E3CF] p-5 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-mitr text-xs font-semibold px-3 py-1 rounded-full bg-orange-100 text-orange-700">{SKILL_LABEL[q.skill]}</span>
            <CefrBadge level={q.cefr} />
          </div>

          {q.ingredient && (
            <div className="mx-auto mb-4 w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-[#f8f0e3] border-4 border-[#d4bca3] overflow-hidden">
              <IngredientPicture id={q.ingredient} className="w-full h-full scale-125" />
            </div>
          )}
          {q.audio && (
            <button onClick={() => speak(q.audio!, { rate: 0.85 })} className="mx-auto mb-4 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-mitr px-6 py-3 rounded-2xl shadow-[0_5px_0_#9a3412] active:translate-y-1 active:shadow-none">
              <Volume2 size={22} /> ฟังอีกครั้ง
            </button>
          )}
          <p className="text-xl md:text-2xl font-semibold text-stone-800 leading-relaxed mb-6 whitespace-pre-line">{q.prompt}</p>

          <div className="grid gap-3">
            {shown.choices.map((choice, i) => {
              const isRight = reveal && i === shown.answer;
              const isWrong = reveal && i === picked && i !== shown.answer;
              const isPicked = !reveal && i === picked;
              return (
                <button
                  key={i}
                  onClick={() => choose(i)}
                  className={`flex items-center gap-3 text-left px-4 py-3.5 rounded-2xl border-2 font-semibold text-base md:text-lg transition-colors ${
                    isRight ? "bg-green-50 border-green-400 text-green-800" : isWrong ? "bg-red-50 border-red-400 text-red-700" : isPicked ? "bg-orange-100 border-orange-400 text-orange-900" : "bg-orange-50/60 border-orange-100 hover:border-orange-300 text-stone-700"
                  }`}
                >
                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${isRight ? "bg-green-500 text-white" : isWrong ? "bg-red-500 text-white" : "bg-white border-2 border-orange-200 text-orange-500"}`}>
                    {isRight ? <Check size={16} strokeWidth={4} /> : isWrong ? <X size={16} strokeWidth={4} /> : i + 1}
                  </span>
                  <span>{choice}</span>
                </button>
              );
            })}
          </div>

          {reveal && q.explain && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-5 rounded-2xl p-4 border-2 ${picked === shown.answer ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
              <p className="flex items-center gap-1.5 font-mitr text-sm font-semibold text-amber-700 mb-1"><Lightbulb size={16} /> {picked === shown.answer ? "ถูกต้อง!" : "เฉลย"}</p>
              <p className="font-mitr text-stone-700 whitespace-pre-line">{q.explain}</p>
            </motion.div>
          )}

          <button
            onClick={next}
            disabled={picked === null}
            className="mt-6 ml-auto flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 disabled:shadow-none text-white font-mitr text-lg px-8 py-3 rounded-2xl shadow-[0_5px_0_#9a3412] transition-colors"
          >
            {index + 1 >= questions.length ? "ดูผลลัพธ์" : "ข้อต่อไป"} <ChevronRight size={20} strokeWidth={3} />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
