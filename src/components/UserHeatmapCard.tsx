"use client";

import Image from "next/image"; // Add this import
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import CalendarHeatmap from "react-calendar-heatmap";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import "react-calendar-heatmap/dist/styles.css";
import { useState } from "react";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"; // Import Dialog components

type SubmissionData = CalendarHeatmap.ReactCalendarHeatmapValue<string> & {
  date: string;
  count: number;
  submissions: {
    problemTitle: string;
    difficulty?: string;
    screenshotUrl: string;
  }[];
};

interface UserHeatmapCardProps {
  userId: string;
  userName?: string | null;
  userImage?: string;
}

export default function UserHeatmapCard({
  userId,
  userName,
  userImage,
}: UserHeatmapCardProps) {
  // State for managing the popup/dialog
  const [selectedDateData, setSelectedDateData] =
    useState<SubmissionData | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // Get user's submissions from Convex
  const submissions =
    useQuery(api.leetcode.getSubmissionsByUser, { userId }) || [];

  // Get user's profile if not provided via props
  const userProfile = useQuery(
    api.user.getUserProfile,
    userName === undefined && userId ? { userId } : "skip"
  ) || { name: "User", imageUrl: "" };

  // Calculate date range for heatmap (current calendar year)
  const currentYear = new Date().getFullYear();
  const startDate = new Date(currentYear, 0, 1); // January 1st
  const endDate = new Date(currentYear, 11, 31); // December 31st

  // Format data for heatmap
  const submissionsByDate = submissions.reduce(
    (acc: Record<string, SubmissionData>, submission) => {
      const { submissionDate, problemTitle, difficulty, screenshotUrl } =
        submission;

      if (!acc[submissionDate]) {
        acc[submissionDate] = {
          date: submissionDate,
          count: 0,
          submissions: [],
        };
      }

      acc[submissionDate].count += 1;
      acc[submissionDate].submissions.push({
        problemTitle,
        difficulty,
        screenshotUrl,
      });

      return acc;
    },
    {}
  );

  // Convert to array format required by the heatmap component
  const values = Object.values(submissionsByDate);

  // Add all dates in the range for proper display
  const allDates = eachDayOfInterval({ start: startDate, end: endDate });
  const emptyValues = allDates.map((date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const existingEntry = values.find((v) => v.date === dateStr);

    return (
      existingEntry || {
        date: dateStr,
        count: 0,
      }
    );
  });

  // Handle click on heatmap cell
  const handleClick = (
    value: CalendarHeatmap.ReactCalendarHeatmapValue<string> | undefined
  ) => {
    const submissionValue = value as SubmissionData;
    if (submissionValue?.count > 0) {
      setSelectedDateData(submissionValue);
      setIsPopupOpen(true);
    } else {
      setSelectedDateData(null);
      setIsPopupOpen(false);
    }
  };

  // Color scale function
  const getClassForValue = (
    value: CalendarHeatmap.ReactCalendarHeatmapValue<string> | undefined
  ) => {
    if (!value?.count || value.count === 0) return "fill-muted cursor-default"; // Add cursor-default for empty cells
    // Add cursor-pointer for clickable cells
    if (value.count === 1) return "fill-green-300 cursor-pointer";
    if (value.count === 2) return "fill-green-500 cursor-pointer";
    return "fill-green-700 cursor-pointer";
  };

  // Helper to get badge color based on difficulty
  const getDifficultyColor = (difficulty: string) => {
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

  // Calculate total submissions
  const totalSubmissions = submissions?.length || 0;

  // Use profile data from query or from props
  const displayName = userName || (userProfile ? userProfile.name : "User");
  const displayImage = userImage || (userProfile ? userProfile.imageUrl : "");

  // Get the initials for avatar fallback
  const getInitials = () => {
    if (!displayName) return "U";
    return displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-muted">
            <AvatarImage src={displayImage} alt={displayName} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{displayName}</h3>
            <p className="text-xs text-muted-foreground">
              {totalSubmissions} submissions
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="relative">
          <CalendarHeatmap
            startDate={startDate}
            endDate={endDate}
            values={emptyValues}
            classForValue={getClassForValue}
            onClick={handleClick} // Add onClick handler
            // Remove tooltip handlers and attrs
            // onMouseOver={handleMouseOver}
            // onMouseLeave={handleMouseLeave}
            // tooltipDataAttrs={() => ({})}
          />

          {/* Remove Tooltip Div */}
          {/* {tooltipData && (...)} */}
        </div>
      </CardContent>

      {/* Dialog for displaying submission details */}
      <Dialog open={isPopupOpen} onOpenChange={setIsPopupOpen}>
        <DialogContent className="sm:max-w-[425px]">
          {selectedDateData && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Submissions on{" "}
                  {format(parseISO(selectedDateData.date), "MMMM d, yyyy")}
                </DialogTitle>
                <DialogDescription>
                  {selectedDateData.count} submission
                  {selectedDateData.count !== 1 ? "s" : ""} by {displayName}
                </DialogDescription>
              </DialogHeader>
              {selectedDateData.submissions &&
                selectedDateData.submissions.length > 0 && (
                  <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                    <h4 className="font-medium mb-2">Problems Solved:</h4>
                    <ul className="space-y-4">
                      {selectedDateData.submissions.map((sub, i) => (
                        <li
                          key={i}
                          className="text-sm border-b pb-4 last:border-b-0"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium truncate mr-2">
                              {sub.problemTitle}
                            </span>
                            {sub.difficulty && (
                              <Badge
                                variant="outline"
                                className={`ml-auto text-xs ${getDifficultyColor(sub.difficulty)}`}
                              >
                                {sub.difficulty}
                              </Badge>
                            )}
                          </div>
                          <Image
                            src={sub.screenshotUrl}
                            alt={`Screenshot for ${sub.problemTitle}`}
                            width={400}
                            height={200}
                            className="rounded-md border object-contain w-full h-auto"
                            unoptimized
                            onError={(e) => {
                              const imgElement = e.target as HTMLImageElement;
                              imgElement.src =
                                "https://via.placeholder.com/400x200?text=Error+Loading+Image";
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
