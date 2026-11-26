// Speaking answers: the browser's own speech recogniser (free, in Chrome and Edge) turns what the
// learner says into text, and `matchReply` works out which of the replies they meant. There is no
// pronunciation scoring here: the match only shows how much of the reply was recognised.

interface RecognitionResult {
  0: { transcript: string };
  length: number;
  isFinal: boolean;
  [index: number]: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [index: number]: RecognitionResult };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const canRecognizeSpeech = () => recognitionCtor() !== null;

export const SPEECH_ERRORS: Record<string, string> = {
  "not-allowed": "เบราว์เซอร์ไม่อนุญาตให้ใช้ไมโครโฟน กดอนุญาตที่แถบที่อยู่ แล้วลองอีกครั้ง",
  "service-not-allowed": "เบราว์เซอร์ไม่อนุญาตให้ใช้ไมโครโฟน กดอนุญาตที่แถบที่อยู่ แล้วลองอีกครั้ง",
  "no-speech": "ไม่ได้ยินเสียง ลองพูดใกล้ไมโครโฟนอีกครั้ง",
  "audio-capture": "ไม่พบไมโครโฟน ตรวจสอบว่าเสียบไมโครโฟนแล้ว",
  network: "การรับเสียงต้องใช้อินเทอร์เน็ต ตรวจสอบการเชื่อมต่อ",
};

// Listens once. `onText` gets the words heard so far (and the alternatives when done); returns a stop function.
export function listen(handlers: {
  onText: (text: string, final: boolean, alternatives: string[]) => void;
  onError: (code: string) => void;
  onEnd: () => void;
}): () => void {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    handlers.onError("unsupported");
    handlers.onEnd();
    return () => {};
  }
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  rec.continuous = false;
  rec.onresult = (e) => {
    let text = "";
    let final = false;
    let alternatives: string[] = [];
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      text += r[0].transcript;
      if (r.isFinal) {
        final = true;
        alternatives = Array.from({ length: r.length }, (_, k) => r[k].transcript);
      }
    }
    handlers.onText(text.trim(), final, alternatives);
  };
  rec.onerror = (e) => handlers.onError(e.error);
  rec.onend = handlers.onEnd;
  rec.start();
  return () => rec.abort();
}

// --- matching what was said to a reply ---------------------------------------------------------

const CONTRACTIONS: [RegExp, string][] = [
  [/\bcan't\b/g, "can not"], [/\bwon't\b/g, "will not"], [/n't\b/g, " not"], [/'ll\b/g, " will"], [/'re\b/g, " are"],
  [/'m\b/g, " am"], [/'ve\b/g, " have"], [/'d\b/g, " would"], [/\b(it|that|there|what|here|he|she)'s\b/g, "$1 is"],
];
const NUMBERS: Record<string, string> = { "1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "10": "ten", "11": "eleven", "12": "twelve" };

export function words(text: string) {
  let t = text.toLowerCase().replace(/[’‘]/g, "'");
  for (const [re, to] of CONTRACTIONS) t = t.replace(re, to);
  return t
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .map((w) => NUMBERS[w] ?? w.replace(/'/g, ""))
    .filter(Boolean);
}

// How closely `said` matches `reply`, from 0 to 1 (word overlap, weighing the reply's words).
export function similarity(said: string, reply: string) {
  const a = words(said);
  const b = words(reply);
  if (!a.length || !b.length) return 0;
  const pool = new Map<string, number>();
  for (const w of a) pool.set(w, (pool.get(w) ?? 0) + 1);
  let common = 0;
  for (const w of b) {
    const n = pool.get(w) ?? 0;
    if (n > 0) {
      common++;
      pool.set(w, n - 1);
    }
  }
  const recall = common / b.length;
  const precision = common / a.length;
  return recall + precision === 0 ? 0 : (2 * recall * precision) / (recall + precision);
}

// The reply the learner most likely meant, or null when nothing is close enough or two are too close to tell apart.
export function matchReply<T extends { text: string }>(heard: string[], replies: T[]) {
  const scored = replies
    .map((reply) => ({ reply, score: Math.max(...heard.map((h) => similarity(h, reply.text))) }))
    .sort((x, y) => y.score - x.score);
  const [best, second] = scored;
  if (!best || best.score < 0.45) return { match: null, score: best?.score ?? 0 };
  if (second && best.score - second.score < 0.08) return { match: null, score: best.score };
  return { match: best.reply, score: best.score };
}
