"use client";

interface MacroRingProps {
  label: string;
  current: number;
  goal: number;
  color: string;
  unit?: string;
}

export default function MacroRing({
  label,
  current,
  goal,
  color,
  unit = "g",
}: MacroRingProps) {
  const percentage = Math.min((current / goal) * 100, 100);
  const radius = 40;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const remaining = Math.max(goal - current, 0);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg
          className="w-full h-full -rotate-90"
          viewBox="0 0 96 96"
        >
          {/* Background track */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="var(--card-border)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-foreground leading-none">
            {remaining}
          </span>
          <span className="text-xs text-muted leading-none mt-0.5">
            {unit} left
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-muted uppercase tracking-wide">
        {label}
      </span>
      <span className="text-xs text-muted">
        {current} / {goal}
        {unit}
      </span>
    </div>
  );
}
