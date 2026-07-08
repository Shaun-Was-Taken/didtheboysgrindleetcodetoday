"use client";

import React from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useIsOwner } from "@/hooks/useIsOwner";
import { APP_TZ, todayStr, addDaysStr } from "@/lib/today";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

const CHART_DAYS = 14;

// Bucket a unix-ms timestamp into the app's canonical calendar day.
const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-display">{value}</CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="pt-0 text-xs text-muted-foreground">
          {hint}
        </CardContent>
      )}
    </Card>
  );
}

function MiniBarChart({
  data,
}: {
  data: { date: string; value: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const BAR_AREA_PX = 88; // tallest bar, leaving room for the count label
  return (
    <div>
      <div className="flex items-end gap-1 h-28">
        {data.map((d) => (
          <div
            key={d.date}
            className="flex-1 flex flex-col items-center justify-end gap-1"
            title={`${d.date}: ${d.value}`}
          >
            <span className="text-[10px] text-muted-foreground leading-none">
              {d.value > 0 ? d.value : ""}
            </span>
            <div
              className="w-full rounded-t bg-primary/80"
              style={{
                height: `${Math.max(
                  Math.round((d.value / max) * BAR_AREA_PX),
                  d.value > 0 ? 4 : 1
                )}px`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function difficultyVariant(difficulty: string | null) {
  switch (difficulty?.toLowerCase()) {
    case "easy":
      return "secondary" as const;
    case "hard":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export default function AdminDashboard() {
  const { isLoaded } = useUser();
  const owner = useIsOwner();
  const today = todayStr();

  const overview = useQuery(api.admin.overview, owner ? { today } : "skip");
  const activity = useQuery(
    api.admin.dailyActivity,
    owner ? { today, days: CHART_DAYS } : "skip"
  );
  const users = useQuery(api.admin.allUsers, owner ? {} : "skip");
  const groups = useQuery(api.admin.allGroups, owner ? {} : "skip");
  const solves = useQuery(
    api.admin.recentSubmissions,
    owner ? { limit: 25 } : "skip"
  );

  if (!isLoaded) return null;

  if (!owner) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        <p className="font-display text-2xl mb-2">404</p>
        <p className="text-sm">This page does not exist.</p>
      </div>
    );
  }

  // Client-side signup series: bucket each user's creation time into app-days.
  const signupSeries = (() => {
    const counts = new Map<string, number>();
    for (const u of users ?? []) {
      const day = dayFmt.format(new Date(u.createdAt));
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    const series = [];
    for (let i = CHART_DAYS - 1; i >= 0; i--) {
      const date = addDaysStr(today, -i);
      series.push({ date, value: counts.get(date) ?? 0 });
    }
    return series;
  })();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Admin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          What&apos;s going on across the app. Only you can see this.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Users"
          value={overview?.totalUsers ?? "…"}
          hint={
            overview ? `+${overview.newUsersThisWeek} this week` : undefined
          }
        />
        <StatCard
          label="Active today"
          value={overview?.activeToday ?? "…"}
          hint={overview ? `${overview.problemsToday} problems` : undefined}
        />
        <StatCard
          label="Total solves"
          value={overview?.totalSubmissions ?? "…"}
          hint={overview ? `${overview.submissionsToday} today` : undefined}
        />
        <StatCard label="Premium" value={overview?.premiumUsers ?? "…"} />
        <StatCard label="Groups" value={overview?.totalGroups ?? "…"} />
        <StatCard
          label="LeetCode linked"
          value={overview?.linkedLeetcode ?? "…"}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signups</CardTitle>
            <CardDescription>Last {CHART_DAYS} days</CardDescription>
          </CardHeader>
          <CardContent>
            {users ? (
              <MiniBarChart data={signupSeries} />
            ) : (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Problems solved</CardTitle>
            <CardDescription>Last {CHART_DAYS} days</CardDescription>
          </CardHeader>
          <CardContent>
            {activity ? (
              <MiniBarChart
                data={activity.map((d) => ({
                  date: d.date,
                  value: d.problems,
                }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">
            Users {users ? `(${users.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="groups">
            Groups {groups ? `(${groups.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="solves">Recent solves</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-2 pr-4 font-medium">User</th>
                    <th className="pb-2 pr-4 font-medium">Joined</th>
                    <th className="pb-2 pr-4 font-medium">LeetCode</th>
                    <th className="pb-2 pr-4 font-medium">Group</th>
                    <th className="pb-2 pr-4 font-medium">Solves</th>
                    <th className="pb-2 pr-4 font-medium">Last solve</th>
                    <th className="pb-2 font-medium">Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {(users ?? []).map((u) => (
                    <tr key={u.email} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={u.imageUrl} />
                            <AvatarFallback>
                              {u.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{u.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">
                        {formatDistanceToNow(u.createdAt, { addSuffix: true })}
                      </td>
                      <td className="py-2.5 pr-4">
                        {u.leetcodeUsername ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        {u.groupName ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">{u.totalSolves}</td>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">
                        {u.lastSolveDate ?? "never"}
                      </td>
                      <td className="py-2.5">
                        {u.premium ? (
                          <Badge>Premium</Badge>
                        ) : (
                          <Badge variant="outline">Free</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users && users.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">
                  No users yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Members</th>
                    <th className="pb-2 pr-4 font-medium">Owner</th>
                    <th className="pb-2 pr-4 font-medium">Daily goal</th>
                    <th className="pb-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(groups ?? []).map((g, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{g.name}</td>
                      <td className="py-2.5 pr-4">{g.memberCount}</td>
                      <td className="py-2.5 pr-4">
                        <div>{g.ownerName}</div>
                        {g.ownerEmail && (
                          <div className="text-xs text-muted-foreground">
                            {g.ownerEmail}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">{g.dailyGoal}/day</td>
                      <td className="py-2.5 whitespace-nowrap text-muted-foreground">
                        {formatDistanceToNow(new Date(g.createdAt), {
                          addSuffix: true,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {groups && groups.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">
                  No groups yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="solves">
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-2 pr-4 font-medium">Problem</th>
                    <th className="pb-2 pr-4 font-medium">Difficulty</th>
                    <th className="pb-2 pr-4 font-medium">User</th>
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {(solves ?? []).map((s, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">
                        {s.problemTitle}
                      </td>
                      <td className="py-2.5 pr-4">
                        {s.difficulty ? (
                          <Badge variant={difficultyVariant(s.difficulty)}>
                            {s.difficulty}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        <div>{s.userName}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.userEmail}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 whitespace-nowrap">
                        {s.submissionDate}
                      </td>
                      <td className="py-2.5">
                        <Badge variant="outline">{s.source}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {solves && solves.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">
                  No solves yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
