import { NextResponse } from "next/server";
import type { GrammarCheckResult } from "@/lib/types";

// Checks a learner's own English sentence with an LLM (advisor feedback 6.1). Grading and all
// built-in content stay local; this is the only route that calls out to a third party, and only
// with the sentence the learner typed, never their name or email.

const MODEL = "gemini-flash-lite-latest";
const MAX_LEN = 300;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    correct: { type: "BOOLEAN", description: "true if the sentence has no grammar or spelling errors" },
    corrected: { type: "STRING", description: "the sentence rewritten correctly (unchanged if already correct)" },
    errors: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          issue: { type: "STRING", description: "the specific mistake, in English, e.g. \"subject-verb agreement\"" },
          explainTh: { type: "STRING", description: "a short, friendly explanation in Thai for a Thai high-school student" },
        },
        required: ["issue", "explainTh"],
      },
    },
  },
  required: ["correct", "corrected", "errors"],
};

const prompt = (text: string) => `You are a patient English teacher for Thai high-school students (CEFR A2-B1).
A student wrote this sentence for a restaurant role-play game:

"${text}"

Check it for grammar, spelling and word-choice mistakes. Keep feedback encouraging and simple.
Reply with JSON matching the given schema only: no markdown, no extra commentary.`;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า AI ตรวจไวยากรณ์ (GEMINI_API_KEY)" }, { status: 503 });
  }

  let text: string;
  try {
    const body = await request.json();
    text = String(body?.text ?? "").trim();
  } catch {
    return NextResponse.json({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: "พิมพ์ประโยคก่อนนะ" }, { status: 400 });
  if (text.length > MAX_LEN) return NextResponse.json({ error: `ประโยคยาวเกินไป (สูงสุด ${MAX_LEN} ตัวอักษร)` }, { status: 400 });

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt(text) }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
      }),
      // A loaded or newly-released model can hang far longer than a learner will wait.
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      console.error("Gemini grammar check failed:", res.status, await res.text());
      return NextResponse.json({ error: "ตรวจไวยากรณ์ไม่สำเร็จ ลองใหม่อีกครั้ง" }, { status: 502 });
    }
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return NextResponse.json({ error: "ตรวจไวยากรณ์ไม่สำเร็จ ลองใหม่อีกครั้ง" }, { status: 502 });
    const result = JSON.parse(raw) as GrammarCheckResult;
    return NextResponse.json(result);
  } catch (err) {
    console.error("Gemini grammar check error:", err);
    return NextResponse.json({ error: "ตรวจไวยากรณ์ไม่สำเร็จ ลองใหม่อีกครั้ง" }, { status: 502 });
  }
}
