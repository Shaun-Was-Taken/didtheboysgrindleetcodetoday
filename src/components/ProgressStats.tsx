"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { Card } from "./ui/card";
import { parseISO, format, isToday, differenceInDays } from "date-fns";
import { Trophy, Calendar, Flame, Code } from "lucide-react";
import ShareProgress from "./ShareProgress";

export default function ProgressStats() {
  const { user, isSignedIn } = useUser();
  
  const submissions = useQuery(
    api.leetcode.getSubmissionsByUser,
    isSignedIn ? { userId: user?.id || "" } : "skip"
  );

  if (!isSignedIn) {
    return null;
  }

  if (!submissions || submissions.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-2">Your Progress</h2>
        <p className="text-muted-foreground">
          You haven&apos;t submitted any LeetCode solutions yet. Start grinding!
        </p>
      </Card>
    );
  }

  // Calculate total problems solved
  const totalSolved = submissions.length;
  
  // Sort submissions by date (newest first)
  const sortedSubmissions = [...submissions].sort((a, b) => 
    new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()
  );

  // Check if user solved a problem today
  const solvedToday = sortedSubmissions.some(sub => 
    isToday(parseISO(sub.submissionDate))
  );

  // Calculate current streak
  let currentStreak = 0;
  const uniqueDates = new Set(sortedSubmissions.map(sub => sub.submissionDate));
  const uniqueDatesSorted = Array.from(uniqueDates).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );
  
  // If solved today, include today in streak
  if (solvedToday) {
    currentStreak = 1;
    
    // Check consecutive days before today
    const today = new Date();
    let checkDate = today;
    
    for (let i = 1; i < uniqueDatesSorted.length; i++) {
      checkDate = new Date(checkDate);
      checkDate.setDate(checkDate.getDate() - 1);
      
      const formattedCheckDate = format(checkDate, 'yyyy-MM-dd');
      if (uniqueDatesSorted.includes(formattedCheckDate)) {
        currentStreak += 1;
      } else {
        break;
      }
    }
  } else if (uniqueDatesSorted.length > 0) {
    // If not solved today, check if solved yesterday to continue streak
    const mostRecentDate = parseISO(uniqueDatesSorted[0]);
    const today = new Date();
    const daysSinceLastSubmission = differenceInDays(today, mostRecentDate);
    
    if (daysSinceLastSubmission === 1) {
      // Last submission was yesterday, streak is still active
      currentStreak = 1;
      
      // Check consecutive days before yesterday
      let checkDate = mostRecentDate;
      
      for (let i = 1; i < uniqueDatesSorted.length; i++) {
        checkDate = new Date(checkDate);
        checkDate.setDate(checkDate.getDate() - 1);
        
        const formattedCheckDate = format(checkDate, 'yyyy-MM-dd');
        if (uniqueDatesSorted.includes(formattedCheckDate)) {
          currentStreak += 1;
        } else {
          break;
        }
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let currentLongestStreak = 0;
  let prevDate: Date | null = null;

  uniqueDatesSorted.reverse().forEach(dateStr => {
    const date = parseISO(dateStr);
    
    if (prevDate === null) {
      // First date
      currentLongestStreak = 1;
    } else {
      // Check if consecutive
      const diffDays = differenceInDays(date, prevDate);
      
      if (diffDays === 1) {
        // Consecutive day
        currentLongestStreak += 1;
      } else {
        // Break in streak
        currentLongestStreak = 1;
      }
    }
    
    // Update longest streak if current is longer
    if (currentLongestStreak > longestStreak) {
      longestStreak = currentLongestStreak;
    }
    
    prevDate = date;
  });

  // Count difficulties
  const difficultyCounts = {
    Easy: 0,
    Medium: 0,
    Hard: 0
  };
  
  submissions.forEach(sub => {
    if (sub.difficulty) {
      difficultyCounts[sub.difficulty as keyof typeof difficultyCounts] += 1;
    }
  });

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Your Progress</h2>
        <ShareProgress />
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex flex-col items-center justify-center p-3 border rounded-md bg-background/50">
          <div className="flex items-center mb-1">
            <Code className="h-4 w-4 mr-1 text-primary" />
            <span className="text-sm font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold">{totalSolved}</p>
          <p className="text-xs text-muted-foreground">problems solved</p>
        </div>
        
        <div className="flex flex-col items-center justify-center p-3 border rounded-md bg-background/50">
          <div className="flex items-center mb-1">
            <Flame className="h-4 w-4 mr-1 text-orange-500" />
            <span className="text-sm font-medium">Streak</span>
          </div>
          <p className="text-2xl font-bold">{currentStreak}</p>
          <p className="text-xs text-muted-foreground">day{currentStreak !== 1 ? 's' : ''} current</p>
        </div>
        
        <div className="flex flex-col items-center justify-center p-3 border rounded-md bg-background/50">
          <div className="flex items-center mb-1">
            <Trophy className="h-4 w-4 mr-1 text-yellow-500" />
            <span className="text-sm font-medium">Best</span>
          </div>
          <p className="text-2xl font-bold">{longestStreak}</p>
          <p className="text-xs text-muted-foreground">day{longestStreak !== 1 ? 's' : ''} streak</p>
        </div>
        
        <div className="flex flex-col items-center justify-center p-3 border rounded-md bg-background/50">
          <div className="flex items-center mb-1">
            <Calendar className="h-4 w-4 mr-1 text-primary" />
            <span className="text-sm font-medium">Today</span>
          </div>
          <p className="text-2xl font-bold">{solvedToday ? '✓' : '✗'}</p>
          <p className="text-xs text-muted-foreground">{solvedToday ? 'complete' : 'incomplete'}</p>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center p-2 border rounded-md bg-green-50 dark:bg-green-900/20">
          <p className="text-sm font-medium text-green-700 dark:text-green-300">Easy</p>
          <p className="text-lg font-bold">{difficultyCounts.Easy}</p>
        </div>
        
        <div className="flex flex-col items-center p-2 border rounded-md bg-yellow-50 dark:bg-yellow-900/20">
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Medium</p>
          <p className="text-lg font-bold">{difficultyCounts.Medium}</p>
        </div>
        
        <div className="flex flex-col items-center p-2 border rounded-md bg-red-50 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">Hard</p>
          <p className="text-lg font-bold">{difficultyCounts.Hard}</p>
        </div>
      </div>
    </Card>
  );
}
