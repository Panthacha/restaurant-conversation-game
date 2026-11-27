import type { GrammarCheckResult } from "./types";

// Calls app/api/check-grammar. Never throws: a failure comes back as { error }, same as a rejection.
export async function checkGrammar(text: string): Promise<{ result: GrammarCheckResult | null; error: string | null }> {
  try {
    const res = await fetch("/api/check-grammar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) return { result: null, error: data?.error ?? "ตรวจไวยากรณ์ไม่สำเร็จ ลองใหม่อีกครั้ง" };
    return { result: data as GrammarCheckResult, error: null };
  } catch {
    return { result: null, error: "เชื่อมต่อไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่" };
  }
}
