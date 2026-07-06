"use client";

import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import CalendarHeatmap from "react-calendar-heatmap";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import "react-calendar-heatmap/dist/styles.css";
import { useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type SubmissionData = {
  date: string;
  count: number;
  problemTitles?: string[];
  difficulties?: string[];
};

export default function LeetcodeHeatmap() {
  const { user, isSignedIn } = useUser();
  const [tooltipData, setTooltipData] = useState<SubmissionData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Get all submissions from Convex
  const submissions = useQuery(
    api.leetcode.getSubmissionsByUser,
    isSignedIn ? { userId: user?.id || "" } : "skip"
  );

  // Years that have submission data (always include the current year)
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const availableYears = Array.from(
    new Set([
      currentYear,
      ...(submissions?.map((sub) =>
        parseInt(sub.submissionDate.slice(0, 4), 10)
      ) ?? []),
    ])
  ).sort((a, b) => b - a);

  // Calculate date range for heatmap (selected calendar year)
  const startDate = new Date(selectedYear, 0, 1); // January 1st
  const endDate = new Date(selectedYear, 11, 31); // December 31st

  // Format data for heatmap
  const submissionsByDate = submissions?.reduce(
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
  const values = submissionsByDate ? Object.values(submissionsByDate) : [];

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
    event: React.MouseEvent<SVGRectElement, MouseEvent>,
    value: CalendarHeatmap.ReactCalendarHeatmapValue<string> | undefined
  ) => {
    const submissionValue = value as SubmissionData;
    if (submissionValue && submissionValue.count > 0) {
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
    if (!value || !value.count || value.count === 0) return "fill-muted";
    if (value.count === 1) return "fill-grind-1";
    if (value.count === 2) return "fill-grind-2";
    return "fill-grind-3";
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

  if (!isSignedIn) {
    return (
      <div className="text-center p-4">
        Sign in to track your LeetCode progress
      </div>
    );
  }

  return (
    <div className="w-full p-4 relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Your LeetCode Grinding History</h2>
        <Select
          value={String(selectedYear)}
          onValueChange={(year) => setSelectedYear(parseInt(year, 10))}
        >
          <SelectTrigger className="w-[90px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-full overflow-x-auto">
        <CalendarHeatmap
          startDate={startDate}
          endDate={endDate}
          values={emptyValues}
          classForValue={getClassForValue}
          onMouseOver={handleMouseOver}
          onMouseLeave={handleMouseLeave}
          titleForValue={(value) => {
            return value && value.count > 0
              ? `${format(parseISO(value.date), "MMM d, yyyy")}: ${value.count} submission${value.count !== 1 ? "s" : ""}`
              : "No submissions";
          }}
        />
      </div>

      {tooltipData && tooltipData.count > 0 && (
        <Card
          className="absolute bg-card p-3 rounded shadow-lg z-10 max-w-xs"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 40,
          }}
        >
          <div className="font-medium mb-1">
            {format(parseISO(tooltipData.date), "MMMM d, yyyy")}
          </div>
          <div className="text-sm mb-2">
            {tooltipData.count} problem{tooltipData.count !== 1 ? "s" : ""}{" "}
            solved
          </div>

          {tooltipData.problemTitles &&
            tooltipData.problemTitles.length > 0 && (
              <div className="text-xs space-y-1 mt-2">
                {tooltipData.problemTitles.map((title, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="truncate">{title}</span>
                    {tooltipData.difficulties?.[i] && (
                      <Badge
                        className={`ml-2 text-xs ${getDifficultyColor(tooltipData.difficulties[i])}`}
                        variant="outline"
                      >
                        {tooltipData.difficulties[i]}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
        </Card>
      )}

      <div className="flex items-center justify-end mt-2 text-sm text-muted-foreground">
        <span className="mr-1">Less</span>
        <div className="w-3 h-3 rounded-[3px] bg-secondary mr-1"></div>
        <div className="w-3 h-3 rounded-[3px] bg-[var(--grind-1)] mr-1"></div>
        <div className="w-3 h-3 rounded-[3px] bg-[var(--grind-2)] mr-1"></div>
        <div className="w-3 h-3 rounded-[3px] bg-[var(--grind-3)] mr-1"></div>
        <span>More</span>
      </div>
    </div>
  );
}
