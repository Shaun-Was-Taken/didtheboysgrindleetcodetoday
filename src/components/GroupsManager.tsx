"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { todayStr } from "@/lib/today";
import {
  Users,
  Plus,
  LogIn,
  Copy,
  Check,
  Crown,
  Trophy,
  UserMinus,
  Trash2,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import DailyGoalControl from "./DailyGoalControl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Convex throws ConvexError with the message on `.data`; fall back for the rest.
function errMessage(e: unknown): string {
  const data = (e as { data?: unknown })?.data;
  if (typeof data === "string") return data;
  return "Something went wrong. Please try again.";
}

export default function GroupsManager() {
  const { isSignedIn } = useUser();
  const today = todayStr();

  const myGroups = useQuery(api.groups.getMyGroups, isSignedIn ? {} : "skip");
  const inAnyGroup = (myGroups ?? []).length > 0;
  // Solo users set their personal goal here; reuse the leaderboard query,
  // which already resolves the effective goal for the signed-in user.
  const myBoard = useQuery(
    api.groups.getDailyLeaderboard,
    isSignedIn ? { date: today } : "skip"
  );
  const [selectedId, setSelectedId] = useState<Id<"groups"> | null>(null);
  const detail = useQuery(
    api.groups.getGroupDetail,
    selectedId ? { groupId: selectedId, date: today } : "skip"
  );

  const createGroup = useMutation(api.groups.createGroup);
  const joinByCode = useMutation(api.groups.joinByCode);
  const leaveGroup = useMutation(api.groups.leaveGroup);
  const deleteGroup = useMutation(api.groups.deleteGroup);
  const kickMember = useMutation(api.groups.kickMember);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Join dialog
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const [copied, setCopied] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreateErr(null);
    setCreating(true);
    try {
      const { groupId } = await createGroup({ name: newName });
      setNewName("");
      setCreateOpen(false);
      setSelectedId(groupId);
    } catch (e) {
      setCreateErr(errMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    setJoinErr(null);
    setJoining(true);
    try {
      const { groupId } = await joinByCode({ inviteCode: joinCode });
      setJoinCode("");
      setJoinOpen(false);
      setSelectedId(groupId);
    } catch (e) {
      setJoinErr(errMessage(e));
    } finally {
      setJoining(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
  };

  const handleLeave = async (groupId: Id<"groups">) => {
    await leaveGroup({ groupId });
    if (selectedId === groupId) setSelectedId(null);
  };

  const handleDelete = async (groupId: Id<"groups">) => {
    await deleteGroup({ groupId });
    if (selectedId === groupId) setSelectedId(null);
  };

  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-dashed p-10 text-center">
        <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary shadow-sm ring-1 ring-border">
          <Users className="h-7 w-7" />
        </span>
        <p className="mb-4 text-muted-foreground">
          Sign in to start a crew and keep each other honest on a private
          leaderboard.
        </p>
        <SignInButton mode="modal">
          <Button className="rounded-full">Sign in</Button>
        </SignInButton>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.18em] text-muted-foreground">
            ACCOUNTABILITY
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Your crew
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep each other honest. Free groups hold 3 members — Premium up to
            15.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setJoinOpen(true)}
            disabled={inAnyGroup}
            title={
              inAnyGroup
                ? "You're already in a group — leave it to join another."
                : undefined
            }
          >
            <LogIn className="h-4 w-4" /> Join
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={inAnyGroup}
            title={
              inAnyGroup
                ? "You're already in a group — leave it to create your own."
                : undefined
            }
          >
            <Plus className="h-4 w-4" /> Create group
          </Button>
        </div>
      </div>

      {/* Group list */}
      {myGroups === undefined ? (
        <p className="text-muted-foreground">Loading groups…</p>
      ) : myGroups.length === 0 ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <span className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary ring-1 ring-border">
              <Users className="h-6 w-6" />
            </span>
            <p className="font-display text-lg font-medium">No crew yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Create a group and share the invite code, or join one with a code
              a friend sent you.
            </p>
          </div>
          {myBoard?.scope === "self" && (
            <div className="mx-auto max-w-md">
              <DailyGoalControl
                goal={myBoard.dailyGoal}
                canEdit
                caption="Your solo pace — problems per day on Today's Grind. Joining a group switches you to its goal."
              />
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myGroups.map((g) => {
            const full = g.memberCount >= g.cap;
            return (
              <Card
                key={g._id}
                onClick={() => setSelectedId(g._id)}
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  selectedId === g._id ? "ring-2 ring-primary" : ""
                }`}
              >
                <CardContent className="p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold truncate">{g.name}</h3>
                    {g.isOwner && (
                      <Badge variant="secondary" className="gap-1">
                        <Crown className="h-3 w-3" /> Owner
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      {g.memberCount} / {g.cap} members
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <code className="rounded bg-muted px-2 py-1 text-xs font-mono tracking-wider">
                      {g.inviteCode}
                    </code>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyCode(g.inviteCode);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Copy invite code"
                    >
                      {copied === g.inviteCode ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {g.isOwner && full && g.cap === 3 && (
                    <Link
                      href="/upgrade"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
                    >
                      Group full — upgrade to invite up to 15 →
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Selected group leaderboard */}
      {selectedId && detail && (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">{detail.name}</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Today&apos;s leaderboard · {detail.memberCount} / {detail.cap}{" "}
                  members
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                  <code className="text-xs font-mono tracking-wider">
                    {detail.inviteCode}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyCode(detail.inviteCode)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Copy invite code"
                  >
                    {copied === detail.inviteCode ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                {detail.isOwner ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(detail._id)}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLeave(detail._id)}
                  >
                    <LogOut className="h-4 w-4" /> Leave
                  </Button>
                )}
              </div>
            </div>

            <div className="mb-4">
              <DailyGoalControl
                goal={detail.dailyGoal}
                canEdit={detail.isOwner}
                caption={
                  detail.isOwner
                    ? `Problems each member needs per day. Applies to everyone in ${detail.name}.`
                    : "Problems per day, set by the group owner."
                }
              />
            </div>

            <ul className="divide-y">
              {detail.members.map((m, i) => (
                <li
                  key={m.userId}
                  className="flex items-center gap-3 py-3"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      i === 0
                        ? "bg-accent text-accent-foreground"
                        : i === 1
                          ? "bg-secondary text-secondary-foreground"
                          : i === 2
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={m.imageUrl} alt={m.name} />
                    <AvatarFallback>
                      {m.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{m.name}</span>
                      {m.isOwner && (
                        <Crown className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {m.totalSolved} solved all-time
                    </span>
                  </div>
                  <Badge variant={m.todayCount > 0 ? "default" : "outline"}>
                    {m.todayCount} today
                  </Badge>
                  {detail.isOwner && !m.isOwner && (
                    <button
                      type="button"
                      onClick={() =>
                        kickMember({ groupId: detail._id, userId: m.userId })
                      }
                      className="text-muted-foreground hover:text-red-500"
                      aria-label={`Remove ${m.name}`}
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a group</DialogTitle>
            <DialogDescription>
              You&apos;ll get an invite code to share. Free groups hold up to 3
              members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="group-name">Group name</Label>
            <Input
              id="group-name"
              placeholder="The Grind Squad"
              value={newName}
              maxLength={40}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim() && !creating)
                  handleCreate();
              }}
            />
            {createErr && <p className="text-sm text-red-500">{createErr}</p>}
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
            >
              {creating ? "Creating…" : "Create group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a group</DialogTitle>
            <DialogDescription>
              Enter the invite code a friend shared with you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite code</Label>
            <Input
              id="invite-code"
              placeholder="ABC123"
              value={joinCode}
              maxLength={6}
              className="font-mono uppercase tracking-widest"
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter" && joinCode.trim() && !joining)
                  handleJoin();
              }}
            />
            {joinErr && <p className="text-sm text-red-500">{joinErr}</p>}
          </div>
          <DialogFooter>
            <Button onClick={handleJoin} disabled={joining || !joinCode.trim()}>
              {joining ? "Joining…" : "Join group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
