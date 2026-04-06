"use client";

import { useStore } from "@/lib/store";
import { format, subDays } from "date-fns";
import Link from "next/link";
import { useState } from "react";

export default function LogPage() {
  const { entries, getDailyTotals, goals, removeEntry } = useStore();
  const [daysBack] = useState(7);

  const days = Array.from({ length: daysBack }, (_, i) => {
    const date = subDays(new Date(), i);
    return format(date, "yyyy-MM-dd");
  });

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <Link href="/" className="text-muted hover:text-foreground text-xl">
          &larr;
        </Link>
        <h1 className="text-xl font-bold">History</h1>
      </header>

      <div className="px-5 space-y-4">
        {days.map((date) => {
          const dayEntries = entries.filter((e) => e.date === date);
          const totals = getDailyTotals(date);
          if (dayEntries.length === 0) return null;

          const caloriePercent = Math.min(
            Math.round((totals.calories / goals.calories) * 100),
            100
          );

          return (
            <div
              key={date}
              className="bg-card border border-card-border rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold">
                    {date === format(new Date(), "yyyy-MM-dd")
                      ? "Today"
                      : format(new Date(date + "T12:00:00"), "EEE, MMM d")}
                  </p>
                  <p className="text-muted text-xs">
                    {dayEntries.length} item{dayEntries.length !== 1 && "s"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {Math.round(totals.calories)}
                  </p>
                  <p className="text-muted text-xs">
                    {caloriePercent}% of goal
                  </p>
                </div>
              </div>

              {/* Macro bar */}
              <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-card-border mb-3">
                {totals.protein > 0 && (
                  <div
                    className="bg-blue-500 rounded-full"
                    style={{
                      width: `${(totals.protein * 4 / totals.calories) * 100}%`,
                    }}
                  />
                )}
                {totals.carbs > 0 && (
                  <div
                    className="bg-amber-500 rounded-full"
                    style={{
                      width: `${(totals.carbs * 4 / totals.calories) * 100}%`,
                    }}
                  />
                )}
                {totals.fat > 0 && (
                  <div
                    className="bg-red-500 rounded-full"
                    style={{
                      width: `${(totals.fat * 9 / totals.calories) * 100}%`,
                    }}
                  />
                )}
              </div>

              <div className="flex gap-4 text-xs text-muted mb-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full inline-block" />
                  P: {Math.round(totals.protein)}g
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-amber-500 rounded-full inline-block" />
                  C: {Math.round(totals.carbs)}g
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />
                  F: {Math.round(totals.fat)}g
                </span>
              </div>

              {/* Entries */}
              <div className="space-y-1">
                {dayEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-1.5 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">
                        {entry.foodItem.name}
                      </span>
                      <span className="text-xs text-muted capitalize">
                        {entry.meal}
                        {entry.servings !== 1 &&
                          ` | ${entry.servings} serving${entry.servings !== 1 ? "s" : ""}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted text-xs">
                        {Math.round(
                          entry.foodItem.nutrition.calories * entry.servings
                        )}{" "}
                        cal
                      </span>
                      <button
                        onClick={() => removeEntry(entry.id)}
                        className="text-muted hover:text-red-400 text-xs"
                      >
                        x
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {days.every(
          (date) => entries.filter((e) => e.date === date).length === 0
        ) && (
          <div className="text-center py-12">
            <p className="text-muted">No entries yet</p>
            <Link href="/scan" className="text-accent text-sm mt-2 block">
              Start tracking
            </Link>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border px-5 py-3 flex justify-around items-center">
        <Link
          href="/"
          className="flex flex-col items-center text-muted hover:text-foreground transition"
        >
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
        <Link href="/log" className="flex flex-col items-center text-accent">
          <span className="text-xl">📋</span>
          <span className="text-xs mt-0.5">History</span>
        </Link>
      </nav>
    </div>
  );
}
