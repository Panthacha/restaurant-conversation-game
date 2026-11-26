import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import restaurantsData from '@/data/restaurants.json'
import type { Records, LevelAttempt, PracticeResult, TestResult } from './types'

export interface Avatar {
  face: string
  hair: string
  outfit: string
}

export interface Profile {
  name: string
  avatar: Avatar
  classroom: string
}

export interface RestaurantProgress {
  unlocked: boolean
  score: number
  stars: number
}

// Levels unlock in the order restaurants.json lists them.
export const LEVEL_ORDER = restaurantsData.map((r) => r.id)

// Keep this many of each record on the device (the full history lives in Supabase).
const KEEP = 100

const freshProgress = (): Record<string, RestaurantProgress> =>
  Object.fromEntries(LEVEL_ORDER.map((id, i) => [id, { unlocked: i === 0, score: 0, stars: 0 }]))

const emptyRecords = (): Records => ({ attempts: [], practice: [], tests: [] })

export interface GameState {
  profile: Profile
  progress: Record<string, RestaurantProgress>
  records: Records
  // Whose progress this is: a Supabase user id, or null for guest play on this device.
  ownerId: string | null
  updateProfile: (profile: Partial<Profile>) => void
  unlockRestaurant: (restaurantId: string) => void
  updateProgress: (restaurantId: string, progress: Partial<RestaurantProgress>) => void
  completeLevel: (restaurantId: string, stars: number, score?: number) => void
  addAttempt: (attempt: LevelAttempt) => void
  addPractice: (result: PracticeResult) => void
  addTest: (result: TestResult) => void
  // Replaces this device's progress with a signed-in learner's records from Supabase.
  loadOwner: (ownerId: string | null, records: Records) => void
}

// Best stars and score per level, and which levels are open, worked out from the attempts.
// The best attempt is picked as a whole (most stars, then highest score) so stars and score
// always come from the same attempt instead of mixing each field's best across different ones.
export function progressFromAttempts(attempts: LevelAttempt[]) {
  const progress = freshProgress()
  for (const a of attempts) {
    const p = progress[a.level_id]
    if (!p) continue
    if (a.stars > p.stars || (a.stars === p.stars && a.score > p.score)) {
      p.stars = a.stars
      p.score = a.score
    }
  }
  LEVEL_ORDER.forEach((id, i) => {
    if (i > 0 && progress[LEVEL_ORDER[i - 1]].stars > 0) progress[id].unlocked = true
  })
  return progress
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      profile: {
        name: '',
        avatar: { face: 'default', hair: 'default', outfit: 'default' },
        classroom: '',
      },
      progress: freshProgress(),
      records: emptyRecords(),
      ownerId: null,
      updateProfile: (profileData) => set((state) => ({
        profile: { ...state.profile, ...profileData }
      })),
      unlockRestaurant: (restaurantId) => set((state) => ({
        progress: {
          ...state.progress,
          [restaurantId]: { ...state.progress[restaurantId], unlocked: true }
        }
      })),
      updateProgress: (restaurantId, progressData) => set((state) => ({
        progress: {
          ...state.progress,
          [restaurantId]: { ...state.progress[restaurantId], ...progressData }
        }
      })),
      completeLevel: (restaurantId, stars, score = 0) => set((state) => {
        const nextId = LEVEL_ORDER[LEVEL_ORDER.indexOf(restaurantId) + 1]
        const current = state.progress[restaurantId]
        const currentStars = current?.stars || 0
        const currentScore = current?.score || 0
        // Keep this attempt's stars and score together (whichever attempt is best overall),
        // never mixing the best stars from one attempt with the best score from another.
        const keepNew = stars > currentStars || (stars === currentStars && score > currentScore)

        return {
          progress: {
            ...state.progress,
            [restaurantId]: {
              ...current,
              stars: keepNew ? stars : currentStars,
              score: keepNew ? score : currentScore,
            },
            ...(nextId ? { [nextId]: { ...state.progress[nextId], unlocked: true } } : {})
          }
        };
      }),
      addAttempt: (attempt) => set((state) => ({
        records: { ...state.records, attempts: [...state.records.attempts, attempt].slice(-KEEP) }
      })),
      addPractice: (result) => set((state) => ({
        records: { ...state.records, practice: [...state.records.practice, result].slice(-KEEP) }
      })),
      addTest: (result) => set((state) => ({
        records: { ...state.records, tests: [...state.records.tests, result].slice(-KEEP) }
      })),
      loadOwner: (ownerId, records) => set({
        ownerId,
        records: {
          attempts: records.attempts.slice(-KEEP),
          practice: records.practice.slice(-KEEP),
          tests: records.tests.slice(-KEEP),
        },
        progress: progressFromAttempts(records.attempts),
      }),
    }),
    {
      name: 'restaurant-game-storage',
      version: 1,
      // Saves from before records and classrooms existed: keep their name, avatar and progress.
      migrate: (saved) => {
        const old = (saved ?? {}) as Partial<GameState>
        return {
          ...old,
          profile: { name: '', avatar: { face: 'default', hair: 'default', outfit: 'default' }, ...old.profile, classroom: old.profile?.classroom ?? '' },
          progress: { ...freshProgress(), ...old.progress },
          records: old.records ?? emptyRecords(),
          ownerId: old.ownerId ?? null,
        } as GameState
      },
    }
  )
)
