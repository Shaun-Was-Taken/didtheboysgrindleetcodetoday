"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Minus, Plus, Target } from "lucide-react";
import { api } from "../../convex/_generated/api";

/**
 * The daily-goal block shown on the groups page: a labeled number with real
 * − / + controls when the viewer may change it (group owner, or a solo user),
 * read-only otherwise. Uses groups.setDailyGoal, which scopes itself.
 */
export default function DailyGoalControl({
  goal,
  canEdit,
  caption,
}: {
  goal: number;
  canEdit: boolean;
  caption: string;
}) {
  const setGoal = useMutation(api.groups.setDailyGoal);
  const [busy, setBusy] = useState(false);

  const adjust = async (delta: number) => {
    const next = goal + delta;
    if (next < 1 || next > 50) return;
    setBusy(true);
    try {
      await setGoal({ goal: next });
    } catch {
      // Permission/validation failures leave the goal unchanged.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/40 px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Target className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">Daily goal</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>
      </div>

      {canEdit ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => adjust(-1)}
            disabled={busy || goal <= 1}
            aria-label="Lower daily goal"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center font-mono text-xl font-bold tabular-nums">
            {goal}
          </span>
          <button
            type="button"
            onClick={() => adjust(1)}
            disabled={busy || goal >= 50}
            aria-label="Raise daily goal"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <span className="font-mono text-xl font-bold tabular-nums">
          {goal}
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            / day
          </span>
        </span>
      )}
    </div>
  );
}
