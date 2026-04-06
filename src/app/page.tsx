"use client";

import { useStore } from "@/lib/store";
import { format } from "date-fns";
import MacroRing from "@/components/MacroRing";
import MealSection from "@/components/MealSection";
import FrequentFoods from "@/components/FrequentFoods";
import { MealType } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { goals, getEntriesForDate, getDailyTotals, getFrequentFoods, addEntry, removeEntry } =
    useStore();
  const [activeMeal, setActiveMeal] = useState<MealType>("breakfast");

  const entries = getEntriesForDate(today);
  const totals = getDailyTotals(today);
  const frequentFoods = getFrequentFoods(10);

  const meals: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

  const mealEntries = (meal: MealType) =>
    entries.filter((e) => e.meal === meal);

  const caloriePercent = Math.min(
    Math.round((totals.calories / goals.calories) * 100),
    100
  );

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">FuelTrack</h1>
            <p className="text-muted text-sm">
              {format(new Date(), "EEEE, MMMM d")}
            </p>
          </div>
          <Link
            href="/scan"
            className="bg-accent text-black font-semibold px-4 py-2 rounded-full text-sm hover:brightness-110 transition"
          >
            + Add Food
          </Link>
        </div>
      </header>

      {/* Calorie Summary */}
      <section className="px-5 py-4">
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-3xl font-bold">{Math.round(totals.calories)}</p>
              <p className="text-muted text-sm">
                of {goals.calories} cal
              </p>
            </div>
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-card-border"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-accent"
                  strokeDasharray={`${caloriePercent * 2.136} 213.6`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
                {caloriePercent}%
              </span>
            </div>
          </div>

          {/* Macro rings */}
          <div className="grid grid-cols-3 gap-3">
            <MacroRing
              label="Protein"
              current={Math.round(totals.protein)}
              goal={goals.protein}
              color="#3b82f6"
              unit="g"
            />
            <MacroRing
              label="Carbs"
              current={Math.round(totals.carbs)}
              goal={goals.carbs}
              color="#f59e0b"
              unit="g"
            />
            <MacroRing
              label="Fat"
              current={Math.round(totals.fat)}
              goal={goals.fat}
              color="#ef4444"
              unit="g"
            />
          </div>
        </div>
      </section>

      {/* Frequent Foods */}
      {frequentFoods.length > 0 && (
        <section className="px-5 py-2">
          <h2 className="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">
            Quick Add
          </h2>
          <FrequentFoods
            foods={frequentFoods}
            onAdd={(item, meal) => addEntry(item, meal)}
            currentMeal={activeMeal}
          />
        </section>
      )}

      {/* Meal Sections */}
      <section className="px-5 py-2 flex-1">
        {meals.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            entries={mealEntries(meal)}
            onRemoveEntry={removeEntry}
            onAddFood={(m) => {
              setActiveMeal(m);
              window.location.href = `/scan?meal=${m}`;
            }}
          />
        ))}
      </section>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border px-5 py-3 flex justify-around items-center">
        <Link href="/" className="flex flex-col items-center text-accent">
          <span className="text-xl">📊</span>
          <span className="text-xs mt-0.5">Today</span>
        </Link>
        <Link
          href="/scan"
          className="flex flex-col items-center text-muted hover:text-foreground transition"
        >
          <span className="text-xl">📷</span>
          <span className="text-xs mt-0.5">Scan</span>
        </Link>
        <Link
          href="/log"
          className="flex flex-col items-center text-muted hover:text-foreground transition"
        >
          <span className="text-xl">📋</span>
          <span className="text-xs mt-0.5">History</span>
        </Link>
      </nav>
    </div>
  );
}
