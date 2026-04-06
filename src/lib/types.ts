export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize?: string;
  servingsPerContainer?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  nutrition: NutritionInfo;
  imageUrl?: string;
  source: "barcode" | "label" | "usda" | "manual";
  createdAt: string;
}

export interface FoodLogEntry {
  id: string;
  foodItem: FoodItem;
  servings: number;
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  date: string; // YYYY-MM-DD
  timestamp: string;
}

export interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
