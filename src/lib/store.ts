import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FoodItem, FoodLogEntry, DailyGoals, MealType, NutritionInfo } from "./types";
import { format } from "date-fns";

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

interface FitnessStore {
  // Food log
  entries: FoodLogEntry[];
  addEntry: (foodItem: FoodItem, meal: MealType, servings?: number) => void;
  removeEntry: (id: string) => void;

  // Saved foods (scanned/added items)
  savedFoods: FoodItem[];
  saveFoodItem: (item: FoodItem) => void;
  removeFoodItem: (id: string) => void;

  // Goals
  goals: DailyGoals;
  setGoals: (goals: DailyGoals) => void;

  // Helpers
  getEntriesForDate: (date: string) => FoodLogEntry[];
  getDailyTotals: (date: string) => NutritionInfo;
  getFrequentFoods: (limit?: number) => { item: FoodItem; count: number }[];
}

export const useStore = create<FitnessStore>()(
  persist(
    (set, get) => ({
      entries: [],
      savedFoods: [],
      goals: {
        calories: 2000,
        protein: 150,
        carbs: 250,
        fat: 65,
      },

      addEntry: (foodItem, meal, servings = 1) => {
        const today = format(new Date(), "yyyy-MM-dd");
        const entry: FoodLogEntry = {
          id: generateId(),
          foodItem,
          servings,
          meal,
          date: today,
          timestamp: new Date().toISOString(),
        };
        // Also save the food item if not already saved
        const existing = get().savedFoods.find(
          (f) => f.barcode === foodItem.barcode && foodItem.barcode
        );
        if (!existing) {
          set((state) => ({
            entries: [...state.entries, entry],
            savedFoods: [...state.savedFoods, foodItem],
          }));
        } else {
          set((state) => ({
            entries: [...state.entries, entry],
          }));
        }
      },

      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),

      saveFoodItem: (item) =>
        set((state) => ({
          savedFoods: [...state.savedFoods, item],
        })),

      removeFoodItem: (id) =>
        set((state) => ({
          savedFoods: state.savedFoods.filter((f) => f.id !== id),
        })),

      setGoals: (goals) => set({ goals }),

      getEntriesForDate: (date) => {
        return get().entries.filter((e) => e.date === date);
      },

      getDailyTotals: (date) => {
        const dayEntries = get().entries.filter((e) => e.date === date);
        return dayEntries.reduce(
          (totals, entry) => ({
            calories:
              totals.calories +
              entry.foodItem.nutrition.calories * entry.servings,
            protein:
              totals.protein +
              entry.foodItem.nutrition.protein * entry.servings,
            carbs:
              totals.carbs + entry.foodItem.nutrition.carbs * entry.servings,
            fat: totals.fat + entry.foodItem.nutrition.fat * entry.servings,
            fiber:
              (totals.fiber || 0) +
              (entry.foodItem.nutrition.fiber || 0) * entry.servings,
            sugar:
              (totals.sugar || 0) +
              (entry.foodItem.nutrition.sugar || 0) * entry.servings,
            sodium:
              (totals.sodium || 0) +
              (entry.foodItem.nutrition.sodium || 0) * entry.servings,
          }),
          {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
          } as NutritionInfo
        );
      },

      getFrequentFoods: (limit = 10) => {
        const entries = get().entries;
        const countMap = new Map<string, { item: FoodItem; count: number }>();

        for (const entry of entries) {
          const key = entry.foodItem.id;
          const existing = countMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            countMap.set(key, { item: entry.foodItem, count: 1 });
          }
        }

        return Array.from(countMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
      },
    }),
    {
      name: "fitness-tracker-storage",
    }
  )
);
