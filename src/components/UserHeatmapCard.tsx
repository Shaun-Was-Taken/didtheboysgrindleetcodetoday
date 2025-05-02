"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import CalendarHeatmap from "react-calendar-heatmap";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import "react-calendar-heatmap/dist/styles.css";
import { useState } from "react";
import { Badge } from "./ui/badge";

type SubmissionData = CalendarHeatmap.ReactCalendarHeatmapValue<string> & {
  date: string;
  count: number;
  problemTitles?: string[];
  difficulties?: string[];
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
  const [tooltipData, setTooltipData] = useState<SubmissionData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

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
      const { submissionDate, problemTitle, difficulty } = submission;

      if (!acc[submissionDate]) {
        acc[submissionDate] = {
          date: submissionDate,
          count: 0,
          problemTitles: [],
          difficulties: [],
        };
      }

      acc[submissionDate].count += 1;
      acc[submissionDate].problemTitles?.push(problemTitle);
      if (difficulty) {
        acc[submissionDate].difficulties?.push(difficulty);
      }

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

  // Handle tooltip
  const handleMouseOver = (
    event: React.MouseEvent,
    value: CalendarHeatmap.ReactCalendarHeatmapValue<string> | undefined
  ) => {
    const submissionValue = value as SubmissionData;
    if (submissionValue?.count > 0) {
      setTooltipData(submissionValue);
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    } else {
      setTooltipData(null);
    }
  };

  const handleMouseLeave = () => {
    setTooltipData(null);
  };

  // Color scale function
  const getClassForValue = (
    value: CalendarHeatmap.ReactCalendarHeatmapValue<string> | undefined
  ) => {
    if (!value?.count || value.count === 0) return "fill-muted";
    if (value.count === 1) return "fill-green-300";
    if (value.count === 2) return "fill-green-500";
    return "fill-green-700";
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

  // Calculate streak and total submissions
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
            onMouseOver={handleMouseOver}
            onMouseLeave={handleMouseLeave}
            tooltipDataAttrs={() => ({})}
          />

          {tooltipData && (
            <div
              className="absolute z-10 p-2 bg-popover text-popover-foreground rounded-md shadow-md text-sm w-64"
              style={{
                left: `${tooltipPosition.x + 10}px`,
                top: `${tooltipPosition.y + 10}px`,
                transform: "translateY(-100%)",
              }}
            >
              <div className="font-medium">
                {format(parseISO(tooltipData.date), "MMMM d, yyyy")}
              </div>
              <div className="mt-1">
                {tooltipData.count} submission
                {tooltipData.count !== 1 ? "s" : ""}
              </div>
              {tooltipData.problemTitles &&
                tooltipData.problemTitles.length > 0 && (
                  <div className="mt-2">
                    <div className="font-medium mb-1">Problems:</div>
                    <ul className="space-y-1">
                      {tooltipData.problemTitles.map((title, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between"
                        >
                          <span className="truncate">{title}</span>
                          {tooltipData.difficulties &&
                            tooltipData.difficulties[i] && (
                              <Badge
                                variant="outline"
                                className={`ml-2 text-xs ${getDifficultyColor(tooltipData.difficulties[i])}`}
                              >
                                {tooltipData.difficulties[i]}
                              </Badge>
                            )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
