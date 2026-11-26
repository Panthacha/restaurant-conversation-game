"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Volume2, Dumbbell, UtensilsCrossed, Lock } from "lucide-react";
import AppShell, { Card, CefrBadge } from "@/components/AppShell";
import IngredientPicture from "@/components/IngredientPicture";
import { useGameStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { speak } from "@/lib/tts";
import { vocab } from "@/lib/quiz";
import restaurantsData from "@/data/restaurants.json";
import grammarData from "@/data/grammar.json";
import type { GrammarPoint } from "@/lib/types";

const grammar = grammarData as GrammarPoint[];
const TOPIC_TH = { phrase: "คำและสำนวนในบทสนทนา", food: "วัตถุดิบ", cooking: "คำกริยาในการทำอาหาร" } as const;

export default function LearnScreen() {
  const hydrated = useHydrated();
  const progress = useGameStore((s) => s.progress);
  const [levelId, setLevelId] = useState(restaurantsData[0].id);
  const level = restaurantsData.find((r) => r.id === levelId)!;
  const unlocked = hydrated && progress[levelId]?.unlocked;
  const words = vocab.filter((v) => v.level === levelId);
  const points = grammar.filter((g) => level.grammar.includes(g.id));

  return (
    <AppShell title="LESSONS" th="บทเรียนคำศัพท์และไวยากรณ์ของแต่ละร้าน อ่านก่อนเล่นจะช่วยให้ตอบได้ดีขึ้น">
      <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 mb-6">
        {restaurantsData.map((r, i) => (
          <button
            key={r.id}
            onClick={() => setLevelId(r.id)}
            className={`shrink-0 px-4 py-2 rounded-2xl border-2 font-mitr text-sm transition-colors ${r.id === levelId ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-white text-stone-600 hover:border-orange-200"}`}
          >
            ร้านที่ {i + 1} · {r.name}
          </button>
        ))}
      </div>

      <Card className="mb-6 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <p className="font-luckiest-guy text-3xl text-stone-800 tracking-wide">{level.name}</p>
          <p className="font-mitr text-stone-500">
            {level.cuisine} · คำศัพท์ระดับ {level.cefr} · {level.answerMode === "speak" ? "ด่านนี้ต้องพูดตอบ" : "ด่านนี้เลือกคำตอบ"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/practice?level=${levelId}`} className="flex items-center gap-2 font-mitr bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-[0_4px_0_#047857]">
            <Dumbbell size={18} /> ฝึกคำศัพท์ร้านนี้
          </Link>
          {unlocked ? (
            <Link href={`/play/${levelId}`} className="flex items-center gap-2 font-mitr bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-2xl shadow-[0_4px_0_#9a3412]">
              <UtensilsCrossed size={18} /> เล่นร้านนี้
            </Link>
          ) : (
            <span className="flex items-center gap-2 font-mitr bg-stone-200 text-stone-500 px-4 py-2.5 rounded-2xl">
              <Lock size={16} /> ยังไม่ปลดล็อก
            </span>
          )}
        </div>
      </Card>

      <h2 className="font-mitr text-xl text-orange-800 mb-3">ไวยากรณ์ที่ใช้ในร้านนี้</h2>
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {points.map((g) => (
          <Card key={g.id}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-bold text-lg text-stone-800">{g.title}</p>
              <CefrBadge level={g.cefr} />
            </div>
            <p className="font-mitr text-orange-700 mb-2">{g.th}</p>
            <p className="font-mitr text-sm text-stone-600 leading-relaxed mb-3">{g.explain}</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {g.patterns.map((p) => (
                <code key={p} className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-2 py-1">{p}</code>
              ))}
            </div>
            <ul className="space-y-1.5">
              {g.examples.map((ex) => (
                <li key={ex} className="flex items-start gap-2 text-stone-700">
                  <button onClick={() => speak(ex)} className="shrink-0 mt-0.5 p-1 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200" title="Listen">
                    <Volume2 size={14} />
                  </button>
                  <span>{ex}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {(["phrase", "food", "cooking"] as const).map((topic) => {
        const list = words.filter((w) => w.topic === topic);
        if (!list.length) return null;
        return (
          <section key={topic} className="mb-8">
            <h2 className="font-mitr text-xl text-orange-800 mb-3">{TOPIC_TH[topic]} <span className="text-sm text-stone-400">({list.length} คำ)</span></h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((w, i) => (
                <motion.div key={w.word} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }} className="bg-white rounded-2xl border-2 border-white shadow-[0_4px_0_#F3E3CF] p-3 flex gap-3">
                  {w.ingredient && (
                    <div className="shrink-0 w-16 h-16 rounded-xl bg-[#f8f0e3] overflow-hidden">
                      <IngredientPicture id={w.ingredient} className="w-full h-full scale-125" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button onClick={() => speak(w.word, { rate: 0.8 })} className="font-bold text-stone-800 hover:text-orange-600 flex items-center gap-1">
                        {w.word} <Volume2 size={14} className="text-orange-400" />
                      </button>
                      <CefrBadge level={w.cefr} />
                      {w.pos && <span className="text-[10px] text-stone-400">{w.pos}</span>}
                    </div>
                    <p className="font-mitr text-orange-700 text-sm">{w.th}</p>
                    {w.example && topic === "phrase" && <p className="text-xs text-stone-400 mt-1 line-clamp-2">“{w.example}”</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        );
      })}
    </AppShell>
  );
}
