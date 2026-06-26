"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { Check, Loader2, Zap } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * Lets a user link their LeetCode username so solves sync automatically — no
 * screenshots. Validates the username against the public profile, then kicks off
 * an immediate first sync server-side.
 */
export default function ConnectLeetcode() {
  const { user, isSignedIn } = useUser();
  const linked = useQuery(
    api.leetcodeSync.getLeetcodeUsername,
    isSignedIn && user?.id ? { clerkId: user.id } : "skip"
  );
  const setUsername = useAction(api.leetcodeSync.setLeetcodeUsername);

  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justLinked, setJustLinked] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!isSignedIn) return null;

  const handleSubmit = async () => {
    if (!user?.id) return;
    setError(null);
    setBusy(true);
    try {
      await setUsername({ clerkId: user.id, username: value });
      setJustLinked(true);
      setEditing(false);
      setValue("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not link that username."
      );
    } finally {
      setBusy(false);
    }
  };

  const isConnected = Boolean(linked) && !editing;

  return (
    <Card className="relative overflow-hidden p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-accent/40 blur-3xl"
      />
      <div className="relative">
        <div className="mb-1 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">
            Auto-sync from LeetCode
          </h2>
        </div>

        {isConnected ? (
          <>
            <p className="text-sm text-muted-foreground">
              Connected as{" "}
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Check className="h-3.5 w-3.5 text-primary" />
                {linked}
              </span>
              . New accepted solves land on your heatmap automatically — no
              screenshots needed.
            </p>
            {justLinked && (
              <p className="mt-2 text-sm text-primary">
                Linked! Your recent solves are syncing now.
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setEditing(true);
                setJustLinked(false);
              }}
            >
              Change username
            </Button>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Enter your LeetCode username and we&apos;ll track your accepted
              solves for you. Make sure your recent submissions are public in
              LeetCode privacy settings.
            </p>
            <div className="space-y-2">
              <Label htmlFor="lc-username">LeetCode username</Label>
              <div className="flex gap-2">
                <Input
                  id="lc-username"
                  placeholder="e.g. neetcode"
                  value={value}
                  maxLength={40}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && value.trim() && !busy)
                      handleSubmit();
                  }}
                />
                <Button onClick={handleSubmit} disabled={busy || !value.trim()}>
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Linking…
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
