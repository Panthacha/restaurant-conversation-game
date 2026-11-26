import recipesData from "@/data/recipes.json";
import type { DialogueTree } from "./types";

const recipes = recipesData as Record<string, { targetDishName: string }>;
export const recipeIds = Object.keys(recipes);
export const recipeName = (id: string) => recipes[id]?.targetDishName ?? id;

// Problems that would break the game (errors) or that are probably mistakes (warnings).
export function checkDialogue(tree: DialogueTree) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!tree.start) errors.push('ต้องมีบรรทัดแรกชื่อ "start"');

  for (const [id, node] of Object.entries(tree)) {
    if (!node.text?.trim()) errors.push(`"${id}": ยังไม่มีประโยคของลูกค้า`);
    const choices = node.choices ?? [];
    if (choices.length === 0) {
      if (node.action !== "start_cooking" || !node.recipeId) errors.push(`"${id}": บรรทัดสุดท้ายต้องเลือกเมนูที่จะทำ`);
      else if (!recipes[node.recipeId]) errors.push(`"${id}": ไม่มีเมนู "${node.recipeId}"`);
    }
    choices.forEach((ch, i) => {
      if (!ch.text.trim()) errors.push(`"${id}" คำตอบที่ ${i + 1}: ยังไม่มีข้อความ`);
      if (!tree[ch.next]) errors.push(`"${id}" คำตอบที่ ${i + 1}: ไปต่อที่ "${ch.next}" ซึ่งไม่มีอยู่`);
      if (!ch.tip?.trim()) warnings.push(`"${id}" คำตอบที่ ${i + 1}: ยังไม่มีคำแนะนำ (tip)`);
    });
    if (choices.length > 0 && !choices.some((ch) => ch.moodChange > 0)) warnings.push(`"${id}": ไม่มีคำตอบที่สุภาพ (+)`);
    for (const v of node.vocab ?? []) {
      if (!node.text.toLowerCase().includes(v.word.toLowerCase())) errors.push(`"${id}": คำศัพท์ "${v.word}" ไม่อยู่ในประโยค`);
    }
  }

  // Every path must end in the kitchen without going round in circles.
  const reachable = new Set<string>();
  const visit = (id: string, path: string[]) => {
    if (path.includes(id)) {
      errors.push(`บทสนทนาวนกลับมาที่ "${id}" (${[...path, id].join(" → ")})`);
      return;
    }
    if (!tree[id] || reachable.has(id)) return;
    reachable.add(id);
    for (const ch of tree[id].choices ?? []) visit(ch.next, [...path, id]);
  };
  if (tree.start) visit("start", []);
  const unreachable = Object.keys(tree).filter((id) => !reachable.has(id));
  if (unreachable.length) warnings.push(`ไม่มีทางไปถึง: ${unreachable.join(", ")}`);

  return { errors: [...new Set(errors)], warnings };
}
