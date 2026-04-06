"use client";

import { FoodLogEntry, MealType } from "@/lib/types";
import FoodLogCard from "./FoodLogCard";

interface MealSectionProps {
  meal: MealType;
  entries: FoodLogEntry[];
  onRemoveEntry: (id: string) => void;
  onAddFood: (meal: MealType) => void;
}

const mealMeta: Record<MealType, { icon: string; label: string }> = {
  breakfast: { icon: "\u2600\uFE0F", label: "Breakfast" },
  lunch: { icon: "\u26C5", label: "Lunch" },
  dinner: { icon: "\uD83C\uDF19", label: "Dinner" },
  snack: { icon: "\uD83C\uDF6A", label: "Snack" },
};

export default function MealSection({
  meal,
  entries,
  onRemoveEntry,
  onAddFood,
}: MealSectionProps) {
  const { icon, label } = mealMeta[meal];
  const totalCalories = entries.reduce(
    (sum, e) => sum + Math.round(e.foodItem.nutrition.calories * e.servings),
    0
  );

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label={label}>
            {icon}
          </span>
          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        </div>
        <span className="text-sm font-medium text-muted">
          {totalCalories} cal
        </span>
      </div>

      {/* Entries */}
      {entries.length > 0 && (
        <div className="space-y-1.5">
          {entries.map((entry) => (
            <FoodLogCard
              key={entry.id}
              entry={entry}
              onRemove={onRemoveEntry}
            />
          ))}
        </div>
      )}

      {/* Add Food Button */}
      <button
        onClick={() => onAddFood(meal)}
        className="w-full rounded-lg border border-dashed border-card-border py-2 text-sm text-muted hover:text-accent hover:border-accent transition-colors"
      >
        + Add Food
      </button>
    </div>
  );
}
