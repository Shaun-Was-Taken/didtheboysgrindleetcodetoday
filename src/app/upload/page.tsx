import type { Metadata } from "next";
import ConnectLeetcode from "@/components/ConnectLeetcode";
import SubmissionForm from "@/components/SubmissionForm";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Log Your Grind",
  description:
    "Connect your LeetCode account for automatic solve tracking, or log problems manually to keep your streak alive.",
  alternates: { canonical: "/upload" },
};

export default function UploadPage() {
  return (
    <div className="min-h-screen py-10 px-4">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-3 text-center">
          Track Your LeetCode Progress
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-center text-muted-foreground">
          Connect your username for automatic syncing, or log a solve manually.
        </p>

        <div className="mx-auto mb-8 max-w-2xl">
          <ConnectLeetcode />
        </div>

        <div className="flex flex-col md:flex-row justify-between w-full gap-6">
          <div className="flex-1">
            <SubmissionForm />
          </div>
          <div className="flex-1">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                Why Track Your Progress?
              </h2>
              <p className="text-muted-foreground mb-4">
                Consistently tracking your LeetCode solutions helps you:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>Build a visual record of your dedication</li>
                <li>Stay motivated with streak tracking</li>
                <li>Share your progress with friends</li>
                <li>Identify patterns in your problem-solving journey</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
