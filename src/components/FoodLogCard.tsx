"use client";

import { FoodLogEntry } from "@/lib/types";

interface FoodLogCardProps {
  entry: FoodLogEntry;
  onRemove: (id: string) => void;
}

export default function FoodLogCard({ entry, onRemove }: FoodLogCardProps) {
  const { foodItem, servings } = entry;
  const cals = Math.round(foodItem.nutrition.calories * servings);
  const protein = Math.round(foodItem.nutrition.protein * servings);
  const carbs = Math.round(foodItem.nutrition.carbs * servings);
  const fat = Math.round(foodItem.nutrition.fat * servings);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-card border border-card-border px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {foodItem.name}
          </span>
          {foodItem.brand && (
            <span className="text-xs text-muted truncate flex-shrink-0">
              {foodItem.brand}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-muted">
            {cals} cal
          </span>
          <span className="text-xs text-blue-400">
            P {protein}g
          </span>
          <span className="text-xs text-amber-400">
            C {carbs}g
          </span>
          <span className="text-xs text-rose-400">
            F {fat}g
          </span>
          {servings !== 1 && (
            <span className="text-xs text-muted">
              x{servings}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onRemove(entry.id)}
        className="text-muted hover:text-rose-400 transition-colors p-1 flex-shrink-0"
        aria-label={`Remove ${foodItem.name}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>
    </div>
  );
}
