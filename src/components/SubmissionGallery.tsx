"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { Card } from "./ui/card";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { Badge } from "./ui/badge";
import Image from "next/image";

export default function SubmissionGallery() {
  const { user, isSignedIn } = useUser();

  const submissions = useQuery(
    api.leetcode.getSubmissionsByUser,
    isSignedIn ? { userId: user?.id || "" } : "skip"
  );

  if (!isSignedIn) {
    return (
      <div className="text-center p-4">Sign in to view your submissions</div>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <Card className="p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Your Submissions</h2>
        <p className="text-muted-foreground">
          You haven&apos;t submitted any LeetCode solutions yet. Upload your
          first solution above to start building your collection!
        </p>
        <div className="flex justify-center mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 opacity-30">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-video bg-muted rounded-md animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // Sort submissions by date (newest first)
  const sortedSubmissions = [...submissions].sort(
    (a, b) =>
      new Date(b.submissionDate).getTime() -
      new Date(a.submissionDate).getTime()
  );

  const getDifficultyColor = (difficulty: string | undefined) => {
    if (!difficulty) return "bg-gray-100 text-gray-800";

    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-4">Your Recent Submissions</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedSubmissions.map((submission) => (
          <Card
            key={submission._id}
            className="overflow-hidden group hover:shadow-md transition-all"
          >
            <Dialog>
              <DialogTrigger className="w-full text-left">
                <div className="relative aspect-video w-full overflow-hidden">
                  <Image
                    src={submission.screenshotUrl}
                    alt={submission.problemTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    width={400}
                    height={200}
                    unoptimized
                    onError={(e) => {
                      const imgElement = e.target as HTMLImageElement;
                      imgElement.src = "https://via.placeholder.com/400x200?text=Error+Loading+Image";
                    }}
                  />
                  {submission.difficulty && (
                    <Badge
                      className={`absolute top-2 right-2 ${getDifficultyColor(submission.difficulty)}`}
                      variant="outline"
                    >
                      {submission.difficulty}
                    </Badge>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium line-clamp-1">
                    {submission.problemTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(
                      parseISO(submission.submissionDate),
                      "MMMM d, yyyy"
                    )}
                  </p>
                </div>
              </DialogTrigger>

              <DialogContent className="max-w-4xl">
                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      {submission.problemTitle}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Submitted on{" "}
                      {format(
                        parseISO(submission.submissionDate),
                        "MMMM d, yyyy"
                      )}
                    </p>
                    {submission.difficulty && (
                      <Badge
                        className={getDifficultyColor(submission.difficulty)}
                        variant="outline"
                      >
                        {submission.difficulty}
                      </Badge>
                    )}
                  </div>

                  <div className="overflow-hidden rounded-md border">
                    <Image
                      src={submission.screenshotUrl}
                      alt={submission.problemTitle}
                      className="w-full h-auto"
                      width={800}
                      height={600}
                      unoptimized
                      onError={(e) => {
                        const imgElement = e.target as HTMLImageElement;
                        imgElement.src = "https://via.placeholder.com/800x600?text=Error+Loading+Image";
                      }}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </Card>
        ))}
      </div>
    </div>
  );
}
