"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, RotateCcw, X, Volume2 } from "lucide-react";
import { Card, CefrBadge } from "@/components/AppShell";
import IngredientPicture from "@/components/IngredientPicture";
import { useContent, builtInQuestions } from "@/lib/content";
import { saveContent, resetContent } from "@/lib/admin";
import { SKILL_LABEL } from "@/lib/quiz";
import { speak } from "@/lib/tts";
import ingredientsData from "@/data/ingredients.json";
import grammarData from "@/data/grammar.json";
import type { Question, Skill } from "@/lib/types";

const FORMS: { id: Question["form"]; th: string }[] = [
  { id: "pre", th: "Pre-test" },
  { id: "post", th: "Post-test" },
  { id: "practice", th: "แบบฝึก" },
];
const SKILLS: Skill[] = ["vocab", "listening", "conversation", "grammar"];
const CEFR = ["A1", "A2", "B1", "B2", "C1"];
const foods = ingredientsData.filter((i) => !("action" in i && i.action));

export default function QuestionsAdmin() {
  const { questions, edited, ready } = useContent();
  const [form, setForm] = useState<Question["form"]>("pre");
  const [editing, setEditing] = useState<Question | null>(null);
  const [error, setError] = useState("");
  const isBuiltIn = (id: string) => builtInQuestions.some((b) => b.id === id);
  const list = questions.filter((q) => q.form === form);
  const removed = Object.values(edited.question).filter((q) => q.deleted && q.form === form);

  const remove = async (q: Question) => {
    if (!confirm(`ลบข้อ "${q.prompt}"?`)) return;
    // A built-in question can't be deleted from the files, so it is hidden with an override instead.
    const problem = isBuiltIn(q.id) ? await saveContent("question", q.id, { ...q, deleted: true }) : await resetContent("question", q.id);
    setError(problem ?? "");
  };
  const restore = async (id: string) => setError((await resetContent("question", id)) ?? "");

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {FORMS.map((f) => (
          <button key={f.id} onClick={() => setForm(f.id)} className={`font-mitr text-sm px-4 py-2 rounded-2xl border-2 ${form === f.id ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-stone-200 text-stone-600"}`}>
            {f.th} ({questions.filter((q) => q.form === f.id).length})
          </button>
        ))}
        <button
          onClick={() => setEditing({ id: `t-${Date.now().toString(36)}`, form, skill: "vocab", cefr: "A2", prompt: "", choices: ["", "", "", ""], answer: 0, explain: "" })}
          className="ml-auto flex items-center gap-1.5 font-mitr text-sm px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          <Plus size={16} /> เพิ่มโจทย์
        </button>
      </div>
      {form !== "practice" && (
        <p className="font-mitr text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-3">
          ถ้าแก้ Pre-test หลังนักเรียนทำไปแล้ว ผลก่อน/หลังเรียนจะเทียบกันได้ไม่ตรง ควรแก้ Pre-test และ Post-test ให้ยากเท่ากันเสมอ
        </p>
      )}
      {error && <p className="font-mitr text-sm text-red-600 mb-3">{error}</p>}
      {!ready && <p className="font-mitr text-stone-400">กำลังโหลด…</p>}

      <ol className="space-y-2">
        {list.map((q, i) => {
          const changed = !!edited.question[q.id];
          return (
            <li key={q.id} className="flex items-start gap-3 rounded-2xl border-2 border-stone-100 p-3">
              <span className="shrink-0 w-7 text-right font-bold text-stone-400 tabular-nums">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="font-mitr text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">{SKILL_LABEL[q.skill]}</span>
                  <CefrBadge level={q.cefr} />
                  {changed && <span className="font-mitr text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">{isBuiltIn(q.id) ? "แก้ไขแล้ว" : "เพิ่มโดยครู"}</span>}
                </div>
                <p className="text-stone-800">{q.prompt}{q.audio && <span className="text-stone-400"> 🔊 “{q.audio}”</span>}</p>
                <p className="text-sm text-stone-500">
                  {q.choices.map((c, k) => (
                    <span key={k} className={k === q.answer ? "text-green-700 font-semibold" : ""}>{k > 0 ? " · " : ""}{c}</span>
                  ))}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <IconButton title="แก้ไข" onClick={() => setEditing(q)}><Pencil size={16} /></IconButton>
                {changed && isBuiltIn(q.id) && <IconButton title="กลับเป็นต้นฉบับ" onClick={() => restore(q.id)}><RotateCcw size={16} /></IconButton>}
                <IconButton title="ลบ" onClick={() => remove(q)}><Trash2 size={16} /></IconButton>
              </div>
            </li>
          );
        })}
      </ol>

      {removed.length > 0 && (
        <div className="mt-5">
          <p className="font-mitr text-sm text-stone-500 mb-2">ข้อที่ลบไป</p>
          {removed.map((q) => (
            <div key={q.id} className="flex items-center gap-2 text-sm text-stone-400 py-1">
              <span className="flex-1 line-through">{q.prompt}</span>
              <button onClick={() => restore(q.id)} className="font-mitr text-sky-700 hover:underline">นำกลับมา</button>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editing && <QuestionEditor key={editing.id} initial={editing} onClose={() => setEditing(null)} />}
      </AnimatePresence>
    </Card>
  );
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick} className="p-2 rounded-xl text-stone-500 hover:bg-orange-100 hover:text-orange-700">
      {children}
    </button>
  );
}

function QuestionEditor({ initial, onClose }: { initial: Question; onClose: () => void }) {
  const [q, setQ] = useState<Question>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (patch: Partial<Question>) => setQ((old) => ({ ...old, ...patch }));
  const problems = [
    !q.prompt.trim() && "ใส่คำถาม",
    q.choices.some((c) => !c.trim()) && "ใส่ตัวเลือกให้ครบ",
    new Set(q.choices.map((c) => c.trim())).size < q.choices.length && "ตัวเลือกต้องไม่ซ้ำกัน",
    q.skill === "listening" && !q.audio?.trim() && "ข้อการฟังต้องมีประโยคที่จะอ่านออกเสียง",
  ].filter(Boolean) as string[];

  const save = async () => {
    setSaving(true);
    const clean: Question = { ...q, prompt: q.prompt.trim(), choices: q.choices.map((c) => c.trim()) };
    for (const key of ["audio", "ingredient", "explain", "grammar", "cefr"] as const) if (!clean[key]) delete clean[key];
    const problem = await saveContent("question", q.id, clean);
    setSaving(false);
    if (problem) setError(problem);
    else onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-white rounded-3xl p-5 md:p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-mitr text-xl text-stone-800">{builtInQuestions.some((b) => b.id === q.id) ? "แก้ไขโจทย์" : "โจทย์ใหม่"} <span className="text-sm text-stone-400">({q.id})</span></p>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-100 text-stone-500"><X size={22} /></button>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <Field label="ชุด">
            <select value={q.form} onChange={(e) => set({ form: e.target.value as Question["form"] })} className={INPUT}>
              {FORMS.map((f) => <option key={f.id} value={f.id}>{f.th}</option>)}
            </select>
          </Field>
          <Field label="ทักษะ">
            <select value={q.skill} onChange={(e) => set({ skill: e.target.value as Skill })} className={INPUT}>
              {SKILLS.map((s) => <option key={s} value={s}>{SKILL_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="ระดับ CEFR">
            <select value={q.cefr ?? ""} onChange={(e) => set({ cefr: e.target.value })} className={INPUT}>
              <option value="">-</option>
              {CEFR.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label="คำถาม (ใช้ ____ แทนช่องว่าง)">
          <textarea value={q.prompt} onChange={(e) => set({ prompt: e.target.value })} rows={2} className={INPUT} />
        </Field>
        {q.skill === "listening" && (
          <Field label="ประโยคที่จะอ่านออกเสียง">
            <div className="flex gap-2">
              <input value={q.audio ?? ""} onChange={(e) => set({ audio: e.target.value })} className={INPUT} />
              <button type="button" onClick={() => q.audio && speak(q.audio, { rate: 0.85 })} className="shrink-0 p-2.5 rounded-xl bg-orange-100 text-orange-700"><Volume2 size={18} /></button>
            </div>
          </Field>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="รูปภาพ (ไม่บังคับ)">
            <div className="flex gap-2 items-center">
              <select value={q.ingredient ?? ""} onChange={(e) => set({ ingredient: e.target.value || undefined })} className={INPUT}>
                <option value="">ไม่มีรูป</option>
                {foods.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {q.ingredient && <div className="shrink-0 w-11 h-11 rounded-lg bg-[#f8f0e3] overflow-hidden"><IngredientPicture id={q.ingredient} className="w-full h-full" /></div>}
            </div>
          </Field>
          {q.skill === "grammar" && (
            <Field label="หัวข้อไวยากรณ์">
              <select value={q.grammar ?? ""} onChange={(e) => set({ grammar: e.target.value || undefined })} className={INPUT}>
                <option value="">-</option>
                {grammarData.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </Field>
          )}
        </div>

        <p className="font-mitr text-sm text-stone-600 mt-2 mb-1">ตัวเลือก (เลือกวงกลมหน้าคำตอบที่ถูก · ระบบจะสลับลำดับให้นักเรียนเอง)</p>
        <div className="space-y-2 mb-3">
          {q.choices.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="answer" checked={q.answer === i} onChange={() => set({ answer: i })} className="w-5 h-5 accent-green-600" />
              <input value={c} onChange={(e) => set({ choices: q.choices.map((x, k) => (k === i ? e.target.value : x)) })} className={`${INPUT} ${q.answer === i ? "border-green-300 bg-green-50" : ""}`} />
            </div>
          ))}
        </div>
        <Field label="คำอธิบายเฉลย (ไม่บังคับ)">
          <textarea value={q.explain ?? ""} onChange={(e) => set({ explain: e.target.value })} rows={2} className={INPUT} />
        </Field>

        {problems.length > 0 && <p className="font-mitr text-sm text-amber-700 mt-3">ยังบันทึกไม่ได้: {problems.join(" · ")}</p>}
        {error && <p className="font-mitr text-sm text-red-600 mt-3">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="font-mitr px-5 py-2.5 rounded-2xl text-stone-600 hover:bg-stone-100">ยกเลิก</button>
          <button disabled={saving || problems.length > 0} onClick={save} className="font-mitr px-6 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white disabled:bg-stone-300">
            {saving ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const INPUT = "w-full rounded-xl border-2 border-stone-200 focus:border-orange-400 focus:outline-none px-3 py-2 bg-white text-stone-800";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block font-mitr text-sm text-stone-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
