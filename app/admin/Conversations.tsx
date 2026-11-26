"use client";

import { useState } from "react";
import { Plus, Trash2, Save, RotateCcw, AlertTriangle, CircleAlert, CheckCircle2, ChefHat, MessageSquare } from "lucide-react";
import { Card } from "@/components/AppShell";
import { useContent, builtInDialogues } from "@/lib/content";
import { saveContent, resetContent } from "@/lib/admin";
import { checkDialogue, recipeIds, recipeName } from "@/lib/dialogueCheck";
import restaurantsData from "@/data/restaurants.json";
import type { DialogueChoice, DialogueNode, DialogueTree } from "@/lib/types";

const MOODS = [
  { value: 1, th: "+1 สุภาพ" },
  { value: 0, th: "0 พอใช้" },
  { value: -1, th: "-1 ไม่สุภาพ" },
  { value: -2, th: "-2 หยาบมาก" },
];
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const INPUT = "w-full rounded-xl border-2 border-stone-200 focus:border-orange-400 focus:outline-none px-3 py-2 bg-white text-stone-800";

export default function ConversationsAdmin() {
  const { dialogues, edited, ready } = useContent();
  const [levelId, setLevelId] = useState(restaurantsData[0].id);
  const level = restaurantsData.find((r) => r.id === levelId)!;
  const [treeId, setTreeId] = useState(level.customers[0].dialogue);

  const pickLevel = (id: string) => {
    setLevelId(id);
    setTreeId(restaurantsData.find((r) => r.id === id)!.customers[0].dialogue);
  };

  if (!ready) return <Card><p className="font-mitr text-stone-400">กำลังโหลด…</p></Card>;

  return (
    <div className="space-y-4">
      <Card className="!p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {restaurantsData.map((r, i) => (
            <button key={r.id} onClick={() => pickLevel(r.id)} className={`font-mitr text-sm px-3 py-1.5 rounded-xl border-2 ${r.id === levelId ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-stone-200 text-stone-600"}`}>
              {i + 1}. {r.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {level.customers.map((c) => (
            <button key={c.dialogue} onClick={() => setTreeId(c.dialogue)} className={`font-mitr text-sm px-3 py-1.5 rounded-xl border-2 ${c.dialogue === treeId ? "bg-stone-800 border-stone-800 text-white" : "bg-white border-stone-200 text-stone-600"}`}>
              ลูกค้า: {c.name} {edited.dialogue[c.dialogue] && "✎"}
            </button>
          ))}
        </div>
      </Card>
      <TreeEditor key={treeId} treeId={treeId} source={dialogues[treeId] ?? {}} isEdited={!!edited.dialogue[treeId]} />
    </div>
  );
}

function TreeEditor({ treeId, source, isEdited }: { treeId: string; source: DialogueTree; isEdited: boolean }) {
  const [draft, setDraft] = useState<DialogueTree>(() => clone(source));
  const [saved, setSaved] = useState<DialogueTree>(() => clone(source));
  const [selected, setSelected] = useState("start");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [edited, setEdited] = useState(isEdited);

  const ids = Object.keys(draft);
  const node = draft[selected];
  const { errors, warnings } = checkDialogue(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const updateNode = (patch: Partial<DialogueNode>) => setDraft((d) => ({ ...d, [selected]: { ...d[selected], ...patch } }));
  const updateChoice = (i: number, patch: Partial<DialogueChoice>) =>
    updateNode({ choices: (node.choices ?? []).map((c, k) => (k === i ? { ...c, ...patch } : c)) });

  const addNode = () => {
    const id = prompt("ตั้งชื่อบรรทัดใหม่ (ภาษาอังกฤษ ตัวเล็ก ไม่มีเว้นวรรค เช่น ask_drink)")?.trim();
    if (!id) return;
    if (!/^[a-z0-9_-]+$/.test(id)) return alert("ใช้ได้เฉพาะ a-z, 0-9, _ และ -");
    if (draft[id]) return alert("มีชื่อนี้แล้ว");
    setDraft((d) => ({ ...d, [id]: { text: "", choices: [{ text: "", next: "start", moodChange: 1, tip: "" }] } }));
    setSelected(id);
  };

  const deleteNode = () => {
    const usedBy = ids.filter((id) => draft[id].choices?.some((c) => c.next === selected));
    if (!confirm(`ลบบรรทัด "${selected}"?${usedBy.length ? `\nมีคำตอบจาก ${usedBy.join(", ")} ชี้มาที่บรรทัดนี้ ต้องแก้ไขต่อ` : ""}`)) return;
    setDraft((d) => {
      const next = { ...d };
      delete next[selected];
      return next;
    });
    setSelected("start");
  };

  const setTerminal = (terminal: boolean) =>
    updateNode(
      terminal
        ? { choices: [], action: "start_cooking", recipeId: node.recipeId ?? recipeIds[0] }
        : { choices: [{ text: "", next: "start", moodChange: 1, tip: "" }], action: undefined, recipeId: undefined }
    );

  const save = async () => {
    setBusy(true);
    // Drop empty fields so the saved conversation looks like the built-in ones.
    const clean: DialogueTree = {};
    for (const [id, n] of Object.entries(draft)) {
      const out: DialogueNode = { text: n.text.trim() };
      if (n.vocab?.length) out.vocab = n.vocab.filter((v) => v.word.trim()).map((v) => ({ word: v.word.trim(), meaning: v.meaning.trim() }));
      out.choices = (n.choices ?? []).map((c) => ({ text: c.text.trim(), next: c.next, moodChange: c.moodChange, ...(c.tip?.trim() ? { tip: c.tip.trim() } : {}) }));
      if (!out.choices.length) {
        out.action = "start_cooking";
        out.recipeId = n.recipeId;
      }
      clean[id] = out;
    }
    const problem = await saveContent("dialogue", treeId, clean);
    setBusy(false);
    if (problem) setMessage({ ok: false, text: `บันทึกไม่สำเร็จ: ${problem}` });
    else {
      setSaved(clone(clean));
      setDraft(clone(clean));
      setEdited(true);
      setMessage({ ok: true, text: "บันทึกแล้ว นักเรียนจะเห็นบทสนทนาใหม่ตั้งแต่รอบถัดไป" });
    }
  };

  const reset = async () => {
    if (!confirm("ลบการแก้ไขทั้งหมดของบทสนทนานี้ แล้วกลับไปใช้ต้นฉบับ?")) return;
    setBusy(true);
    const problem = await resetContent("dialogue", treeId);
    setBusy(false);
    if (problem) return setMessage({ ok: false, text: problem });
    const original = clone(builtInDialogues[treeId] ?? {});
    setDraft(original);
    setSaved(clone(original));
    setEdited(false);
    setSelected("start");
    setMessage({ ok: true, text: "กลับเป็นต้นฉบับแล้ว" });
  };

  return (
    <div className="grid lg:grid-cols-[16rem_1fr] gap-4">
      <Card className="!p-3 h-fit">
        <p className="font-mitr text-sm text-stone-500 px-1 mb-2">บรรทัดในบทสนทนา</p>
        <div className="space-y-1">
          {ids.map((id) => {
            const n = draft[id];
            const terminal = !(n.choices ?? []).length;
            return (
              <button key={id} onClick={() => setSelected(id)} className={`w-full text-left rounded-xl px-2.5 py-2 border-2 ${id === selected ? "border-orange-400 bg-orange-50" : "border-transparent hover:bg-stone-50"}`}>
                <span className="flex items-center gap-1.5 text-xs font-bold text-stone-500">
                  {terminal ? <ChefHat size={13} /> : <MessageSquare size={13} />} {id}
                </span>
                <span className="block text-sm text-stone-700 truncate">{n.text || "(ยังไม่มีข้อความ)"}</span>
              </button>
            );
          })}
        </div>
        <button onClick={addNode} className="mt-2 w-full flex items-center justify-center gap-1.5 font-mitr text-sm py-2 rounded-xl border-2 border-dashed border-stone-300 text-stone-500 hover:border-orange-300 hover:text-orange-600">
          <Plus size={16} /> เพิ่มบรรทัด
        </button>
      </Card>

      <div className="space-y-4">
        {node && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <p className="font-mitr text-lg text-stone-800">บรรทัด “{selected}”</p>
              {selected !== "start" && (
                <button onClick={deleteNode} className="flex items-center gap-1 font-mitr text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl"><Trash2 size={15} /> ลบบรรทัด</button>
              )}
            </div>

            <label className="block font-mitr text-sm text-stone-600 mb-1">ลูกค้าพูดว่า</label>
            <textarea value={node.text} onChange={(e) => updateNode({ text: e.target.value })} rows={2} className={`${INPUT} mb-4`} />

            <p className="font-mitr text-sm text-stone-600 mb-1">คำศัพท์ที่ไฮไลต์ (ต้องเป็นคำที่อยู่ในประโยคของลูกค้า)</p>
            <div className="space-y-2 mb-2">
              {(node.vocab ?? []).map((v, i) => (
                <div key={i} className="flex gap-2">
                  <input value={v.word} placeholder="คำ" onChange={(e) => updateNode({ vocab: node.vocab!.map((x, k) => (k === i ? { ...x, word: e.target.value } : x)) })} className={`${INPUT} sm:w-48`} />
                  <input value={v.meaning} placeholder="ความหมาย (ภาษาอังกฤษง่าย ๆ)" onChange={(e) => updateNode({ vocab: node.vocab!.map((x, k) => (k === i ? { ...x, meaning: e.target.value } : x)) })} className={INPUT} />
                  <button onClick={() => updateNode({ vocab: node.vocab!.filter((_, k) => k !== i) })} className="shrink-0 p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => updateNode({ vocab: [...(node.vocab ?? []), { word: "", meaning: "" }] })} className="font-mitr text-sm text-orange-600 hover:underline mb-5">+ เพิ่มคำศัพท์</button>

            <div className="flex gap-2 mb-3">
              <button onClick={() => setTerminal(false)} className={`font-mitr text-sm px-3 py-2 rounded-xl border-2 ${(node.choices ?? []).length ? "bg-stone-800 border-stone-800 text-white" : "bg-white border-stone-200 text-stone-600"}`}>
                มีคำตอบให้ผู้เล่น
              </button>
              <button onClick={() => setTerminal(true)} className={`font-mitr text-sm px-3 py-2 rounded-xl border-2 ${!(node.choices ?? []).length ? "bg-stone-800 border-stone-800 text-white" : "bg-white border-stone-200 text-stone-600"}`}>
                จบบทสนทนา → เข้าครัว
              </button>
            </div>

            {(node.choices ?? []).length === 0 ? (
              <label className="block">
                <span className="block font-mitr text-sm text-stone-600 mb-1">เมนูที่ต้องทำ</span>
                <select value={node.recipeId ?? ""} onChange={(e) => updateNode({ recipeId: e.target.value, action: "start_cooking" })} className={INPUT}>
                  {recipeIds.map((id) => <option key={id} value={id}>{recipeName(id)} ({id})</option>)}
                </select>
              </label>
            ) : (
              <div className="space-y-3">
                {node.choices!.map((c, i) => (
                  <div key={i} className="rounded-2xl border-2 border-stone-100 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mitr text-sm text-stone-500">คำตอบที่ {i + 1}</span>
                      <button onClick={() => updateNode({ choices: node.choices!.filter((_, k) => k !== i) })} disabled={node.choices!.length <= 1} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"><Trash2 size={15} /></button>
                    </div>
                    <input value={c.text} placeholder="ประโยคที่ผู้เล่นตอบ (ภาษาอังกฤษ)" onChange={(e) => updateChoice(i, { text: e.target.value })} className={`${INPUT} mb-2`} />
                    <div className="grid sm:grid-cols-2 gap-2 mb-2">
                      <select value={c.moodChange} onChange={(e) => updateChoice(i, { moodChange: Number(e.target.value) })} className={INPUT}>
                        {MOODS.map((m) => <option key={m.value} value={m.value}>อารมณ์ลูกค้า {m.th}</option>)}
                      </select>
                      <select value={c.next} onChange={(e) => updateChoice(i, { next: e.target.value })} className={INPUT}>
                        {ids.map((id) => <option key={id} value={id}>ไปต่อที่ “{id}”</option>)}
                      </select>
                    </div>
                    <textarea value={c.tip ?? ""} placeholder="คำแนะนำภาษา (tip) ที่แสดงหลังตอบ" onChange={(e) => updateChoice(i, { tip: e.target.value })} rows={2} className={INPUT} />
                  </div>
                ))}
                {node.choices!.length < 4 && (
                  <button onClick={() => updateNode({ choices: [...node.choices!, { text: "", next: selected === "start" ? ids[1] ?? "start" : selected, moodChange: 0, tip: "" }] })} className="font-mitr text-sm text-orange-600 hover:underline">
                    + เพิ่มคำตอบ
                  </button>
                )}
              </div>
            )}
          </Card>
        )}

        <Card>
          {errors.length === 0 && warnings.length === 0 && <p className="flex items-center gap-2 font-mitr text-green-700"><CheckCircle2 size={18} /> บทสนทนาถูกต้อง ใช้เล่นได้</p>}
          {errors.map((e) => <p key={e} className="flex items-start gap-2 font-mitr text-sm text-red-600"><CircleAlert size={16} className="shrink-0 mt-0.5" /> {e}</p>)}
          {warnings.map((w) => <p key={w} className="flex items-start gap-2 font-mitr text-sm text-amber-700"><AlertTriangle size={16} className="shrink-0 mt-0.5" /> {w}</p>)}

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button onClick={save} disabled={busy || !dirty || errors.length > 0} className="flex items-center gap-1.5 font-mitr px-5 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white disabled:bg-stone-300">
              <Save size={18} /> บันทึก
            </button>
            {dirty && <button onClick={() => setDraft(clone(saved))} className="font-mitr px-4 py-2.5 rounded-2xl text-stone-600 hover:bg-stone-100">ยกเลิกการแก้ไข</button>}
            {edited && (
              <button onClick={reset} disabled={busy} className="flex items-center gap-1.5 font-mitr px-4 py-2.5 rounded-2xl text-stone-600 hover:bg-stone-100">
                <RotateCcw size={16} /> กลับเป็นต้นฉบับ
              </button>
            )}
            <span className="font-mitr text-xs text-stone-400 ml-auto">{edited ? "ตอนนี้ใช้เวอร์ชันที่ครูแก้ไข" : "ตอนนี้ใช้ต้นฉบับ"}{dirty ? " · มีการแก้ไขที่ยังไม่บันทึก" : ""}</span>
          </div>
          {message && <p className={`font-mitr text-sm mt-3 ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>}
        </Card>
      </div>
    </div>
  );
}
