// Reading English aloud with the browser's built-in voices (Web Speech API).

// Voice names that hint at gender across macOS, Windows and Chrome.
const MALE_VOICES = /\b(male|daniel|alex|fred|aaron|arthur|gordon|rishi|tom|oliver|david|mark|guy|james|george|ryan)\b/i;
const FEMALE_VOICES = /\b(female|samantha|karen|moira|tessa|victoria|fiona|serena|martha|nicky|kate|susan|zira|aria|jenny|libby|sonia|hazel)\b/i;

function pickVoice(gender: "male" | "female", variant: number) {
  const english = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  const wanted = english.filter((v) => (gender === "male" ? MALE_VOICES : FEMALE_VOICES).test(v.name) && !(gender === "male" ? /female/i : /\bmale\b/i).test(v.name));
  const pool = wanted.length ? wanted : english;
  return pool.length ? pool[variant % pool.length] : null;
}

export function speak(text: string, { gender = "female", variant = 0, rate = 0.92 }: { gender?: "male" | "female"; variant?: number; rate?: number } = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const voice = pickVoice(gender, variant);
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = rate; // slightly slower for learners
  // If no gendered voice exists, nudge pitch so male and female characters still sound different.
  const matched = voice && (gender === "male" ? MALE_VOICES : FEMALE_VOICES).test(voice.name);
  utter.pitch = matched ? 1 : gender === "male" ? 0.75 : 1.25;
  if (voice) utter.voice = voice;
  synth.speak(utter);
}

export const stopSpeaking = () => {
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
};
