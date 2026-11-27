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
  // Voices load asynchronously; on the very first call in the page they may not be ready yet, in
  // which case this speaks with the browser's own default voice rather than waiting (which could
  // wait forever on a browser that never fires voiceschanged because it has no voices at all).
  if (voice) utter.voice = voice;
  synth.speak(utter);
  // Chrome leaves the engine in a paused state after it has sat idle (or the tab lost focus),
  // which drops speak() calls with no error and no sound unless resume() is called right after.
  synth.resume();
}

export const stopSpeaking = () => {
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
};
