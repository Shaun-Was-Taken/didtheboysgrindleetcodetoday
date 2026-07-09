import type { Metadata } from "next";
import GroupsManager from "@/components/GroupsManager";

export const metadata: Metadata = {
  title: "Accountability Groups",
  description:
    "Create a private group, invite your friends, and keep each other grinding LeetCode with a shared daily leaderboard.",
  alternates: { canonical: "/groups" },
};

export default function GroupsPage() {
  return (
    <div className="min-h-screen py-10 px-4">
      <div className="container mx-auto max-w-5xl">
        <GroupsManager />
      </div>
    </div>
  );
}
