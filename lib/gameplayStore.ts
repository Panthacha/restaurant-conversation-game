import { create } from 'zustand';
import type { ReplyRecord } from './types';

// Mood cut-offs shared by the face, the mood bar and the star rating.
export const MOOD_HAPPY = 75;
export const MOOD_OK = 40;

// 'serving' shows how one customer liked their dish; 'result' is the summary after the last customer.
type GamePhase = 'dialogue' | 'cooking' | 'serving' | 'result';

// One served order, kept so the summary can show every ticket and the attempt can be saved.
export interface ServedOrder {
  recipeId: string;
  stars: number;
  mood: number;
  replies: ReplyRecord[];
}

// A fresh customer: start their conversation with a neutral mood and an empty plate.
const NEW_CUSTOMER = {
  phase: 'dialogue' as GamePhase,
  currentNodeId: 'start',
  customerMood: 50,
  score: 0,
  currentRecipeId: null,
  assembledIngredients: [] as string[],
  replies: [] as ReplyRecord[],
};

interface GameplayState {
  currentRestaurantId: string | null;
  phase: GamePhase;
  currentNodeId: string;
  customerMood: number; // 0 to 100
  score: number; // stars earned for the current customer
  customerIndex: number; // which customer of the level is being served
  served: ServedOrder[];
  replies: ReplyRecord[]; // the current customer's conversation so far

  // Cooking state
  currentRecipeId: string | null;
  assembledIngredients: string[];

  // Actions
  startGame: (restaurantId: string) => void;
  makeChoice: (nextNodeId: string, moodChange: number, action?: string, recipeId?: string, reply?: ReplyRecord) => void;
  addIngredient: (ingredientId: string) => void;
  removeLastIngredient: () => void;
  clearIngredients: () => void;
  serveFood: (isCorrect: boolean) => void;
  nextCustomer: () => void;
  showSummary: () => void;
  resetGame: () => void;
}

export const useGameplayStore = create<GameplayState>((set) => ({
  currentRestaurantId: null,
  phase: 'dialogue',
  currentNodeId: 'start',
  customerMood: 50,
  score: 0,
  currentRecipeId: null,
  assembledIngredients: [],
  customerIndex: 0,
  served: [],
  replies: [],

  startGame: (restaurantId) => set({
    ...NEW_CUSTOMER,
    currentRestaurantId: restaurantId,
    customerIndex: 0,
    served: [],
  }),

  makeChoice: (nextNodeId, moodChange, action, recipeId, reply) => set((state) => {
    const newMood = Math.min(100, Math.max(0, state.customerMood + (moodChange * 25)));
    const replies = reply ? [...state.replies, reply] : state.replies;

    if (action === 'start_cooking') {
      return {
        currentNodeId: nextNodeId,
        customerMood: newMood,
        phase: 'cooking',
        currentRecipeId: recipeId,
        replies,
      };
    }

    return {
      currentNodeId: nextNodeId,
      customerMood: newMood,
      replies,
    };
  }),

  addIngredient: (ingredientId) => set((state) => ({
    assembledIngredients: [...state.assembledIngredients, ingredientId]
  })),

  removeLastIngredient: () => set((state) => ({
    assembledIngredients: state.assembledIngredients.slice(0, -1)
  })),

  clearIngredients: () => set({ assembledIngredients: [] }),

  // Each step only works from the phase before it, so a double click can't serve twice or skip a guest.
  serveFood: (isCorrect) => set((state) => {
    if (state.phase !== 'cooking') return {};
    let finalStars = 0;
    if (isCorrect) {
      if (state.customerMood >= MOOD_HAPPY) finalStars = 3;
      else if (state.customerMood >= MOOD_OK) finalStars = 2;
      else finalStars = 1;
    } else {
      finalStars = 0; // failed
    }

    return {
      phase: 'serving',
      score: finalStars,
      served: [...state.served, { recipeId: state.currentRecipeId ?? '', stars: finalStars, mood: state.customerMood, replies: state.replies }]
    };
  }),

  nextCustomer: () => set((state) => (state.phase === 'serving' ? { ...NEW_CUSTOMER, customerIndex: state.customerIndex + 1 } : {})),

  showSummary: () => set((state) => (state.phase === 'serving' ? { phase: 'result' } : {})),

  resetGame: () => set({
    ...NEW_CUSTOMER,
    currentRestaurantId: null,
    customerIndex: 0,
    served: [],
  })
}));
