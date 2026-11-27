// Shapes shared by the game, the learner's records and the Supabase tables (see supabase/schema.sql).

export type AnswerMode = "choose" | "speak";

export interface DialogueChoice {
  text: string;
  next: string;
  moodChange: number;
  tip?: string;
  action?: string;
  recipeId?: string;
}

export interface DialogueNode {
  text: string;
  choices?: DialogueChoice[];
  vocab?: { word: string; meaning: string }[];
  action?: string; // "start_cooking" on the last line
  recipeId?: string;
  customerImage?: string;
}

// A conversation: node id -> node, starting at "start".
export type DialogueTree = Record<string, DialogueNode>;

export interface Customer {
  name: string;
  spriteColumn: number; // column in /assets/food/sushi/4.webp (0 = chef)
  gender?: "male" | "female";
  dialogue?: string; // dialogue tree id in dialogues.json (defaults to the restaurant id)
}
export type Skill = "vocab" | "listening" | "conversation" | "grammar";
export type TestForm = "pre" | "post";

// One reply in a conversation: what was picked, and how (tapped, spoken or typed, with or without the hint).
export interface ReplyRecord {
  node: string;
  text: string;
  moodChange: number;
  mode: "choose" | "speak" | "type";
  hint: boolean;
  heard?: string; // what the speech recogniser heard, or what was typed
}

// One customer served during a level.
export interface GuestRecord {
  customer: string;
  dialogue: string;
  recipeId: string;
  stars: number;
  mood: number;
  replies: ReplyRecord[];
}

export interface LevelAttempt {
  level_id: string;
  stars: number;
  score: number;
  guests: GuestRecord[];
  created_at: string;
}

export interface PracticeResult {
  kind: string;
  correct: number;
  total: number;
  points: number;
  created_at: string;
}

export interface SkillScore {
  correct: number;
  total: number;
}

export interface TestResult {
  form: TestForm;
  score: number;
  total: number;
  by_skill: Partial<Record<Skill, SkillScore>>;
  answers: { id: string; choice: string; correct: boolean }[];
  created_at: string;
}

export interface Records {
  attempts: LevelAttempt[];
  practice: PracticeResult[];
  tests: TestResult[];
}

// A row of public.profiles.
export interface DbProfile {
  id: string;
  email: string | null;
  display_name: string;
  avatar: string | null;
  classroom: string;
  role: "student" | "admin";
  created_at: string;
}

// A quiz question (pre/post tests, practice, or one the teacher added).
export interface Question {
  id: string;
  form: TestForm | "practice";
  skill: Skill;
  cefr?: string;
  prompt: string;
  audio?: string; // spoken aloud for listening questions
  ingredient?: string; // shows that ingredient's picture
  choices: string[];
  answer: number; // index of the right choice in `choices`
  explain?: string;
  grammar?: string;
  deleted?: boolean; // a teacher removed it (kept as an override so the built-in one stays hidden)
}

export interface VocabEntry {
  word: string;
  th: string;
  meaning?: string;
  level: string;
  topic: "phrase" | "food" | "cooking";
  cefr: string | null;
  pos?: string;
  example?: string;
  ingredient?: string;
}

export interface GrammarPoint {
  id: string;
  title: string;
  th: string;
  cefr: string;
  levels: string[];
  explain: string;
  patterns: string[];
  examples: string[];
}

// One AI grammar check of a learner's own sentence (app/api/check-grammar).
export interface GrammarCheckResult {
  correct: boolean;
  corrected: string;
  errors: { issue: string; explainTh: string }[];
}
