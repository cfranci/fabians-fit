"use client";

import { FoodItem, MealType } from "@/lib/types";

interface FrequentFoodsProps {
  foods: { item: FoodItem; count: number }[];
  onAdd: (item: FoodItem, meal: MealType) => void;
  currentMeal: MealType;
}

export default function FrequentFoods({
  foods,
  onAdd,
  currentMeal,
}: FrequentFoodsProps) {
  if (foods.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted">
        No frequent foods yet
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1">
      {foods.map(({ item, count }) => (
        <div
          key={item.id}
          className="flex-shrink-0 w-32 rounded-lg bg-card border border-card-border p-2.5 flex flex-col gap-1"
        >
          <span className="text-xs font-medium text-foreground truncate">
            {item.name}
          </span>
          <span className="text-xs text-muted">
            {item.nutrition.calories} cal
          </span>
          <div className="flex items-center justify-between mt-auto pt-1">
            <span className="text-[10px] text-muted">
              {count}x logged
            </span>
            <button
              onClick={() => onAdd(item, currentMeal)}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-accent/15 text-accent text-sm font-bold hover:bg-accent/25 transition-colors"
              aria-label={`Quick add ${item.name}`}
            >
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
