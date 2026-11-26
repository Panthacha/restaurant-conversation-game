# Restaurant Conversation Game — Project Overview

A browser game for practicing **English restaurant conversation**. The player is a chef who greets a customer, picks polite (or rude) replies in a visual-novel style dialogue, then picks the steps to make the ordered dish while the kitchen animates each one. Politeness raises the customer's mood, and mood decides the star rating.

Around the game sit the learning tools from the advisor's feedback: lessons (vocabulary with Thai meanings and CEFR levels, grammar points), practice games, a pre-test and post-test, a learner dashboard, a ranking, Google sign-in, and a teacher back office for following students and editing questions and conversations. AI checking of pronunciation and sentences (feedback item 2.7) is on hold.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js **16.3.5** (App Router). Per `AGENTS.md`, read `node_modules/next/dist/docs/` before changing Next-specific code, since this version has breaking changes |
| UI | React 19.2, Tailwind CSS v4 (`@import "tailwindcss"` + `@theme` in `app/globals.css`) |
| Animation | framer-motion |
| Icons | lucide-react |
| State | zustand (one store persisted to `localStorage`, one in-memory gameplay store) |
| Accounts & data | Supabase (`@supabase/ssr`): Google sign-in, Postgres with row-level security, `supabase/schema.sql`. Optional: without `.env.local` the game runs in guest mode |
| Speech | Web Speech API: speech synthesis reads lines aloud; speech recognition (Chrome/Edge) turns spoken replies into text in levels 2–5 |
| Fonts | Google: Inter, Noto Sans Thai, Mitr (Thai headings), Playfair Display, Luckiest Guy. Local: Roasted Ketchup, Avermont House (**personal-use-only license**, see `public/fonts/`) |
| Tooling script | `remove_bg.js` uses `@imgly/background-removal-node` to turn `avatar*.jpg` into transparent `avatar*.png` |

**Asset loading.** The game only references WebP images (`scripts/optimize_assets.mjs` makes them from the PNG/JPG originals, shrinking icons to 256px, level covers to 900px and avatars to 768px: 44MB → 4.3MB). `lib/preload.ts` lists each level's pictures from the data (`levelAssets`), and the play screen shows a loading bar until they're in (15s cap). The title screen prefetches the avatars, covers and level 1, and the select screen prefetches every unlocked level, at low priority, so levels usually open at once. `next.config.ts` lets browsers cache `/assets` for a day (Next serves `public/` with `max-age=0` otherwise). New images must be referenced as `.webp` after running the optimizer, and pictures named only in code (not data) belong in `EVERY_LEVEL` in `lib/preload.ts`.

**Data.** Built-in content is static JSON in `data/`. The only server code is the Google sign-in callback (`app/auth/callback/route.ts`); everything else talks to Supabase from the browser, and the rules in `supabase/schema.sql` decide what each account may read or write (a learner: their own rows; a teacher, `profiles.role = 'admin'`: everyone's, plus the `content` table). Every result is also kept in the persisted store, so guests get a dashboard too, and on sign-in the device's progress is replaced by the account's. There is no test suite.

## Running

```bash
npm install      # required first; "next: command not found" means this was skipped
npm run dev      # http://localhost:3000
npm run build && npm start
npm run lint
npm run vocab-report   # CEFR profile of every level's dialogue (needs the vocabulary Excel file, see below)
node remove_bg.js   # optional: regenerate transparent avatar PNGs
npm run art         # cut art/generated sheets into public/assets/food, then make WebP copies
npm run optimize-assets   # re-encode every referenced image as WebP and point the code at it
```

Accounts need a Supabase project: follow `docs/SUPABASE_SETUP.md` (Thai), then copy `.env.example` to `.env.local`.

The vocabulary bank `คลังคำศัพท์_ทั้งหมด_ง่าย-ปานกลาง-ยาก.xlsx` (Oxford 3000/5000 + Cambridge B1 Preliminary, 5,831 words) is kept in the project folder but git-ignored, because the word lists belong to their publishers and the repository is public. `npm run vocab-report` reads it directly; `-- --update-vocab` also refreshes the CEFR level, part of speech and example in `data/vocab.json`.

## Directory layout

```
app/
  layout.tsx          Root layout, font variables, metadata
  globals.css         Tailwind v4 import, font theme tokens
  page.tsx            Title screen (tap → /login, /profile or /menu)
  login/page.tsx      Google sign-in, or play as a guest
  auth/callback/route.ts  Swaps Google's one-time code for a session cookie
  profile/page.tsx    Chef ID card: name, class, tap photo to cycle avatar, "APPROVED" stamp → /menu
  menu/page.tsx       Main menu: play, lessons, practice, pre/post-test, progress, ranking, teacher
  select/page.tsx     Level select grid: 5 restaurants, lock state, answer mode, CEFR band, best stars
  play/[id]/page.tsx  Main game: dialogue → cooking → result phases; saves the attempt; locked levels refuse to open
  play/[id]/DialogueScene.tsx  Immersive conversation screen (see below), incl. the speaking panel
  play/[id]/Dish.tsx  Plate stacking + finished-dish picture
  learn/page.tsx      Lessons: each restaurant's grammar points and vocabulary (Thai, CEFR, audio, pictures)
  practice/page.tsx   Practice rounds of 10: word meaning, picture match, listening, best reply, grammar
  test/[form]/page.tsx  Pre-test / post-test (20 questions, one try each), results and answer review
  dashboard/page.tsx  The learner's progress (components/ProgressView.tsx)
  ranking/page.tsx    Leaderboard, all or own class (signed-in only)
  admin/              Teacher back office: Overview, Students, ranking, Questions, Conversations
components/           AppShell (page frame), QuizRunner, ProgressView, Leaderboard, Bars, IngredientPicture
lib/
  store.ts            useGameStore (persisted as "restaurant-game-storage"): profile, progress, records, owner
  gameplayStore.ts    useGameplayStore (not persisted): phase, dialogue node, mood, recipe, plate contents, replies
  types.ts            Shared shapes: dialogue, records, questions, vocabulary, Supabase rows
  supabase.ts / auth.tsx  Supabase browser client; AuthProvider (session, profile, sign-in/out, account sync)
  records.ts          Save attempts/practice/tests locally and to Supabase; points formula
  content.ts          Built-in conversations and questions with the teacher's edits laid over them
  speech.ts / tts.ts  Speech recognition + reply matching; reading aloud
  quiz.ts             Practice question generation, choice shuffling, per-skill scoring
  dialogueCheck.ts    Validation for edited conversations (used by the teacher's editor)
  admin.ts / ranking.ts  Teacher data loading and edits; leaderboard call
data/
  restaurants.json    Level metadata (id, name, cuisine, difficulty, cover image, customers, answerMode, cefr, grammar)
  dialogues.json      Dialogue trees keyed by tree id → node id
  recipes.json        Recipe id → target dish name + correct ingredient order
  ingredients.json    Ingredients (sprite cell + plate layout) and the Roll / Cut tool steps
  assembly.json       How layers combine on the plate: merged images, Roll and Cut results
  vocab.json          The game's word list: Thai meaning, CEFR, part of speech, example, picture
  grammar.json        Grammar points: Thai explanation, patterns, examples, levels
  questions.json      Pre-test and post-test (20 each, parallel) and grammar practice questions
supabase/schema.sql   Tables, row-level security, sign-up trigger and leaderboard function
docs/SUPABASE_SETUP.md  Step-by-step Supabase + Google sign-in setup (Thai)
public/
  assets/             Backgrounds, avatars, customer photos, food covers, sushi sprite sheets (sushi/1–8.png)
  fonts/              Local fonts + license files
images_sushi/         Source AI-generated sprite images (not referenced by code)
0905.mov, Presentation_Script.docx   Demo video and presentation script
```

## Screen flow

```
/  (title) ──tap──▶ /login ──Google or guest──▶ /profile (first time) ──▶ /menu
                                                                          │
     /select ──unlocked card──▶ /play/[id] ──CONTINUE──▶ /select          ├─ /learn, /practice
     /test/pre (first), /test/post (after all 5 levels)                   ├─ /dashboard, /ranking
                                                                          └─ /admin (teachers)
```

## Gameplay model

### Persistent progress (`lib/store.ts`)
- `profile`: `{ name, avatar: { face, hair, outfit }, classroom }`. Only `face` is used (it holds an avatar image path).
- `progress[rId]`: `{ unlocked, score, stars }`. `r1` starts unlocked.
- `completeLevel(id, stars, score)` keeps the best stars and score and unlocks the next level in `restaurants.json` order. It is called when the result screen appears, only when stars > 0. `/play/[id]` shows a locked screen for levels that aren't unlocked.
- `records`: the last 100 level attempts (every guest's replies, how each was given, and what was heard), practice rounds and tests. `ownerId` is the Supabase user they belong to (null for guest play).
- **Points:** a level attempt scores 100 per star + 10 per polite reply + 5 per reply said or typed without the hint; a practice round 10 per right answer. The ranking orders by stars (best per level), then best level scores + practice points.

### Round state (`lib/gameplayStore.ts`)
A level serves its customers one at a time: `dialogue` → `cooking` → `serving` (that guest's stars) → next guest … → `result` (every ticket plus the level's stars, the rounded average). Each guest starts with mood 50. `restaurants.json` lists `customers` (r1: Daniel, Emma, Mrs. Sato), each with its own `dialogue` tree id in `dialogues.json`; levels that still have a single `customer` use the restaurant id as the tree.

1. **Dialogue:** start at node `start`. Each choice has `next` and `moodChange`. Mood starts at 50 and changes by `moodChange × 25`, clamped to 0–100. A node whose choice list is empty and has `action: "start_cooking"` + `recipeId` shows a "Go to Kitchen" button.
2. **Cooking:** the screen is split like a sushi bar: the dining room across the counter on top (the customer sits behind the counter edge and reacts to each step with a short English line and a face), and the top-down prep counter below (you are the chef, so no chef sprite is shown). The order ticket lists `recipe.correctSequence` and marks each slot green (right), red (wrong) or empty, plus any extra items in red. Clicking ingredient bins stacks them on the plate (`assembledIngredients`). Tool steps (Knead, Stretch, Roll, Boil, Bake, Grill, Cut…) sit in the same sequence. There are no mini-games: when a tool step or an ingredient with prep work is picked, the kitchen does it by itself as a short animation in a small card beside the plate (`app/play/[id]/StepAnimation.tsx`, about 1–3 s, tap the card to skip; other bins wait until it finishes), then the result goes on the plate. Animations are configured in `assembly.json`: `actions.<id>.anim` for steps, `prep.<id>.anim` for ingredients, and `anims` to pick a different one by what is on top of the plate. The nine kinds, drawn on a 100×75-unit stage from a single progress value:
   - **cook** (Boil, Bake, Flip, Grill, Fry): the food sits in a pot / oven / pan / grill / fryer and goes from pale/raw to cooked with steam; `sides: 2` flips it halfway. Its `hint` ("Juicy and brown!") pops up at the end.
   - **swipe** (Cut, slice fish/avocado/cucumber/tomato): the knife runs along each cut line in turn.
   - **spread** (rice on nori, sauce on dough, peel potato, season patty, parmesan, salt): the ingredient's tool zig-zags over the area, revealing the sauce/rice/seasoning behind it.
   - **scatter** (mozzarella, mushrooms, basil, berries): pieces drop onto their spots one by one.
   - **measure** (wasabi, roe, sauces, fish sauce, lime, palm sugar, batter, syrup): the bottle or spoon tips and pours; `look: "press"` shows hands shaping the rice instead.
   - **stir** (Knead, Toss pasta, Mix som tam, wrap the gunkan nori): a spoon or hand goes round the food.
   - **roll**: the bamboo mat rolls the sheet into a roll. **stretch**: a rolling pin spreads the dough out. **pound**: the pestle crushes each chunk in the mortar.

   Each finishes with a short label (`done`, e.g. "Golden!").

   **Sound effects** (`lib/sfx.ts`) are synthesised with the Web Audio API, so there are no audio files: each animation has an ongoing sound (bubbling pot, oven rumble, sizzling pan/grill, fryer, pouring, shaking, brushing, the mat rolling) and beats synced to it (a chop per knife cut, a thud per pestle hit, a pop per topping, a whoosh on a flip), ending with a bell. Placing a step pops (or buzzes when the order didn't ask for it there), and serving plays a happy jingle or a sad one. The speaker button in the kitchen's top bar mutes them; the choice is kept in `localStorage` (`sfx-muted`). A step that wouldn't change the food skips its animation. The name of each added item floats up over the plate. Undo removes the last step, Trash clears the plate. When the plate matches the recipe it is served as `recipe.final` (2 nigiri, 2 gunkan or 6 roll pieces) by `app/play/[id]/Dish.tsx`, and the result card shows the same dish.
3. **Result (`handleServe` → `serveFood`):** the plate must match `correctSequence` exactly (order and count). A correct dish gives 3★ if mood ≥ `MOOD_HAPPY` (75), 2★ if ≥ `MOOD_OK` (40), otherwise 1★. A wrong dish gives 0★ ("OH NO!"). The same two constants drive the customer's face and mood-bar colours.

### Data formats

```jsonc
// dialogues.json
{ "r1": { "start": {
    "text": "Customer line",
    "customerImage": "/path.jpg" | "bg-[url('/sprite.png')] bg-[length:X_Y] bg-[position:X_Y]",
    "choices": [ { "text": "Player reply", "next": "nodeId", "moodChange": 1,
                   "tip": "Grade 10 language tip shown after the player picks this reply" } ],
    "vocab": [ { "word": "familiar with", "meaning": "..." } ],   // must appear in "text"; becomes tappable
    "action": "start_cooking", "recipeId": "salmon_nigiri"   // terminal nodes only
} } }

// restaurants.json (per level)
{ "customers": [ { "name": "Daniel", "spriteColumn": 2, "gender": "male", "dialogue": "r1" }, … ] }   // column in sushi/4.png: 0 chef, 1 woman, 2 man, 3 grandma; gender picks the voice

// recipes.json  (final = how the finished dish is served: a sprite cell or an image, and how many pieces)
{ "salmon_nigiri": { "targetDishName": "Salmon Nigiri", "correctSequence": ["rice","wasabi","salmon"], "final": { "sprite": [0,3], "count": 2 } },
  "veggie_roll": { "correctSequence": ["nori_flat","rice_sheet","avocado","cucumber","roll","cut"], "final": { "sprite": [2,3], "count": 6 } } }

// assembly.json
// merges: two layers on top of each other become one picture (nori + rice sheet -> rice_on_nori, rice + nori_wrap -> gunkan_rice, + ikura -> gunkan_ikura)
// actions: a step with a "base" turns the base and what's on it into one dish, chosen by the first listed filling present
//          (roll: rice_on_nori -> roll_salmon / roll_veg; bake: pizza_sauced -> pizza_margherita / pizza_funghi, with an oven glow);
//          knead: dough -> dough_kneaded; stretch: dough_kneaded -> dough_flat; boil: spaghetti (dry) -> pasta_cooked;
//          toss_pasta: pasta_sauced -> pasta_tossed; season: patty_raw -> patty_seasoned; grill: (seasoned) patty -> patty;
//          peel: potato -> potato_peeled; cut: potato_peeled -> potato_sticks; fry: potato_sticks -> fries;
//          som tam: chili + chili merge into chili_2 / chili_3; pound: garlic + chilies -> paste_1..3 (redder with more chilies);
//          toss (Mix): any paste + toppings -> som_tam_poo / som_tam_thai / som_tam_thai_no_peanuts ("base" may list several ids)
//          a step with a "map" turns the top layer into its result (cut: rolls -> 6 pieces, pizzas -> sliced, with a knife chop)

// restaurants.json: "kitchen" picks the ingredient set, "scene" the pictures
{ "kitchen": "italian", "scene": { "dining": "…/dining.svg", "counter": "…/counter.svg", "mat": { "image", "size", "position" }, "plate": { … } } }

// ingredients.json
[ { "id": "rice", "name": "Sushi Rice", "icon": "<tailwind sprite classes for the bin>",
    "sprite": [0,0],                       // [col,row] in sushi/1.png (4x4)
    "plate": { "size": 36, "x": 0, "y": 4, "lift": 5 } } ]
// plate values are % of the plate area. Layers stack in the order they're added (last on top) and each
// rises by the "lift" of the layers below. "base": true wraps around earlier layers (gunkan nori);
// "side": true places a garnish beside the dish (ginger, soy sauce).
```

Sprites are cut from sheets with Tailwind arbitrary `bg-[length:…] bg-[position:…]` classes. When `customerImage` uses the `bg-` form, `play/[id]/page.tsx` regex-parses it into inline styles.

```jsonc
// restaurants.json (learning fields per level)
{ "answerMode": "speak", "cefr": "A2-B1", "grammar": ["recommend", "taste-adjectives"] }

// vocab.json: every highlighted word plus food and cooking words (cefr/pos/example filled by `npm run vocab-report -- --update-vocab`)
{ "word": "allergic", "th": "แพ้ (อาหาร/สิ่งของ)", "meaning": "having a bad reaction…", "level": "r3", "topic": "phrase",
  "cefr": null, "example": "Hi! Before I order…", "ingredient": "peanuts" }   // cefr null = not in the bank (topic word)

// grammar.json
{ "id": "polite-requests", "title": "Could you…? / Would it be possible…?", "th": "การขอร้องอย่างสุภาพ", "cefr": "A2",
  "levels": ["r2", "r4", "r5"], "explain": "(Thai)", "patterns": ["Could you + verb?"], "examples": ["Could you hold the lettuce?"] }

// questions.json (choices are shuffled when shown; `answer` is the index of the right one as written)
{ "id": "pre-l2", "form": "pre" | "post" | "practice", "skill": "vocab" | "listening" | "conversation" | "grammar",
  "cefr": "A2", "prompt": "Listen. What does the customer NOT want?", "audio": "I'd like the pizza, but no mushrooms, please.",
  "ingredient": "lime", "choices": ["mushrooms", "pizza", "cheese", "tomato sauce"], "answer": 0, "explain": "(Thai)", "grammar": "would-like" }
```

Teacher edits live in Supabase `content` (kind `dialogue` keyed by tree id, kind `question` keyed by question id; `deleted: true` hides a built-in question) and are merged over these files by `lib/content.ts`.

### Conversation screen (`DialogueScene.tsx`)
Built for grade 10 English learners:
- **Live expressions:** the customer's face (happy / neutral / upset rows of `sushi/4.png`) follows mood. The chef smiles after a polite reply.
- **Reactions:** a happy or angry bubble (`sushi/7.png`), a floating "+25 ♥" / "−50 ♥", and a hop or head-shake.
- **Typewriter text:** click, Enter or Space skips it. Replies appear only after the line finishes.
- **Voice:** the Web Speech API reads each customer line and the player's reply at a slightly slower rate. There's a "Listen" replay button and a mute toggle.
- **Vocabulary:** `vocab` words are highlighted. Tapping one shows a learner-friendly definition, plus the Thai meaning, CEFR level, part of speech, a listen button and the ingredient picture from `data/vocab.json`.
- **Language tip:** after each reply, a Polite / Okay / Could be better card explains why, using the choice's `tip`. Then the player presses Continue.
- **Shuffled replies:** choices are shuffled per node (deterministically), so the polite answer isn't always first. Keys 1–9 pick a reply.
- **Answer mode** (`restaurants.json` `answerMode`): level 1 is `choose` (tap a reply). Levels 2–5 are `speak`: the replies are hidden and the learner says the reply (microphone, Chrome/Edge) or types it; `lib/speech.ts` picks the closest reply by word overlap (contractions expanded) and shows how much of it matched. Too far from every reply, or too close to two, asks them to try again. "ดูตัวเลือกคำตอบ" reveals the replies as a hint. Each reply is saved with how it was given (`choose` / `speak` / `type`), whether the hint was open, and what was heard.
- **Sound effects:** a chime for a polite reply, a buzz for a rude one, a pop for an okay one, a blip when the microphone starts. The speaker button in the top bar mutes them.
- **Conversation log:** a side drawer shows the full transcript.
- **Ambience:** flickering lantern glow, a vignette and idle "breathing" on the characters.

### Content status

| Level | Restaurant | Guests | Dishes | Animated steps | Art |
|---|---|---|---|---|---|
| r1 | Sakura Sushi (Japanese) | Daniel, Emma, Mrs. Sato | nigiri ×3, ikura gunkan, salmon roll, avocado-cucumber roll | Shape rice, wasabi, slice fish/avocado/cucumber, wrap nori, spoon roe, spread rice, Roll, Cut | Real sprite sheets |
| r2 | Bella Trattoria (Italian) | Sofia, Nonna Lucia | Margherita, Mushroom Pizza, 2 spaghetti | Knead, Stretch, spread sauce, place toppings, Bake, Cut; Boil, ladle sauce, Toss, grate parmesan | Generated art (v1) |
| r3 | Spicy Market (Thai som tam shop) | Mr. Somchai, Mai | Som Tam Poo (3 chilies, salted crab), Som Tam Thai no peanuts (1 chili) | Pound, halve tomatoes, fish sauce, lime, palm sugar, Mix | Generated art (v1) |
| r4 | Lumière Café (Dessert) | Mrs. Dubois, Chloe | Berry Macaron Tower, Strawberry / Blueberry Pancakes | Pour batter, Flip (two sides, ×2), syrup, place berries | Generated art (v1) |
| r5 | Route 66 (American Diner) | Jess, Hank | Cheeseburger (± lettuce), French Fries (± salt) | Season, Grill (two sides), slice tomato; Peel, Cut, Fry, Salt | Generated art (v1) |

All five levels are playable end to end.

**Difficulty design (advisor feedback).** Level 1 keeps the original format (two replies per line, tap to answer). Level 2 adds speaking. Levels 3–5 have longer conversations with three replies per line (polite / okay / rude), harder situations (allergies, special requests, complaints, time pressure), and vocabulary aimed at the CEFR band in `restaurants.json` `cefr`: A1–A2, A2, A2–B1, B1, B1–B2 (grade 10 sits between the A2 and B1 targets for M.3 and M.6). Each level lists its `grammar` focus from `data/grammar.json`, shown in the lessons. Run `npm run vocab-report` after editing a dialogue to see its CEFR profile.

**Tests.** `data/questions.json` holds two parallel 20-question forms (`pre`, `post`): 6 vocabulary, 4 listening (read aloud by speech synthesis), 5 conversation and 5 grammar questions each, spread A1–B2 in the same pattern, so their scores compare. The pre-test is offered first; the post-test opens after every level has a star. Each can be taken once (a teacher can delete a result to allow a retake). Practice questions are generated from `vocab.json` and the dialogues, plus the grammar questions with `form: "practice"`.

Ingredients carry a `kitchen` (`sushi`, `italian`, `thai`, `cafe` or `diner`) and each restaurant shows only its own, plus shared tools (Cut). Sushi: rice, salmon, tuna, nori_flat, avocado, cucumber, ikura, wasabi, ginger, soy_sauce, nori_wrap, rice_sheet + Roll. Italian: dough, tomato_sauce, mozzarella, basil, mushroom, spaghetti, parmesan + Knead, Stretch, Boil, Bake, Toss. Diner tools: Season, Grill, Fry, Peel.

**r2–r5 art (v1)** comes from the sprite and background sheets in `art/generated/<kitchen>/` (`sprites-v1.png` plus a manifest, `backgrounds-v1.png` with the counter on top and the dining room below). `node scripts/extract_art.mjs` cuts them into `public/assets/food/<kitchen>/*.png` (and `counter.jpg` / `dining.jpg`): it drops near-invisible noise and fragments from neighbouring cells, then fits each sprite into the spot its mockup used (`art/mockup-refs/`, rendered from the SVGs), so plate layers still stack in the right place. The counter props in the generated backgrounds (macarons, papayas, rolling pin, grill tray) were drawn much larger than the food, so `COUNTER_PLAIN` keeps only the plain surface above them (mirrored downwards for the straight-plank counters so phones still get a sharp image). In the kitchen the counter picture covers only the area above the ingredient bar. Per-sprite sizing rules (`FIT`) live at the top of the script; re-run it after changing them or regenerating a sheet. **One mockup remains:** the Thai `plate.svg` (the clay mortar everything is pounded in), because the generated "plate" was a saucer. The old SVG mockups and `scripts/italian_mockups.py` / `scripts/more_mockups.py` are kept as the layout reference. Characters still come from the sushi sheet `sushi/4.png` for every level.

## Known issues / bugs

1. **Sushi recipes follow the sprite sheet.** Only dishes buildable from `sushi/1.png` and `sushi/steps/` exist. Ebi and tamago were removed because there is no art for them.
2. **Shared characters.** Every level uses the same chef and the 3 customers from `sushi/4.png`. Node-level `customerImage` is unused (removed from r2–r5).
3. **Tailwind classes stored in JSON.** Sprite classes in `data/*.json` only work if Tailwind v4's source detection scans those files. If sprites go missing after a build, add `@source "../data";` to `globals.css`.
4. `restaurants.json` objects don't share a typed interface with the code (the shapes in `lib/types.ts` cover dialogues, records and questions).
5. `restaurants.json` `themeColors` are defined but never used.
6. `npm install` reports 10 vulnerabilities (1 critical).
7. **Scores are computed in the browser.** The database only checks that values are in range, which is enough for a classroom but not cheat-proof.
8. **Speaking needs Chrome or Edge** (other browsers fall back to typing or the hint), and the recogniser sends audio to the browser vendor's service. It recognises words; it does not score pronunciation.
9. **Teacher edits to the pre/post-test** after students have taken it make the two scores less comparable; the editor warns about this.

## Suggested next steps

1. AI checking of pronunciation, accent and sentence correctness (advisor item 2.7, on hold): e.g. a pronunciation-assessment service for spoken replies and an LLM behind a server route for free-form sentences.
2. Replace the Thai mortar mockup (`thai/plate.svg`, a top-down clay krok) and give each restaurant its own chef and customer sprites.
3. Update `Presentation_Script.docx`: it predates multiple guests per level, the ID card, lessons, practice, tests, speaking mode and the teacher back office.
4. Use the existing `themeColors`.
5. Replace the personal-use-only Avermont font before any public or commercial release.
