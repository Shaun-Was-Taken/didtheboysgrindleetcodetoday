"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { format } from "date-fns";
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
  const today = format(new Date(), "yyyy-MM-dd");

  const myGroups = useQuery(api.groups.getMyGroups, isSignedIn ? {} : "skip");
  const ownsGroup = (myGroups ?? []).some((g) => g.isOwner);
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
      <div className="text-center rounded-lg border border-dashed p-10">
        <Users className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-4">
          Sign in to create friend groups and compete on private leaderboards.
        </p>
        <SignInButton mode="modal">
          <Button className="rounded-full">Sign In</Button>
        </SignInButton>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Your Groups</h1>
          <p className="text-sm text-muted-foreground">
            Keep your crew accountable. Free groups hold 3 members — Premium up
            to 15.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setJoinOpen(true)}>
            <LogIn className="h-4 w-4" /> Join
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={ownsGroup}
            title={
              ownsGroup
                ? "You already own a group — delete it to create a new one."
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
        <div className="text-center rounded-lg border border-dashed p-10">
          <p className="text-muted-foreground">
            No groups yet. Create one and share the invite code with friends.
          </p>
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

            <ul className="divide-y">
              {detail.members.map((m, i) => (
                <li
                  key={m.userId}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="w-6 text-center text-sm font-semibold text-muted-foreground">
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
