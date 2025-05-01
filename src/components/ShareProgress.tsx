"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Share2, Twitter, Copy, Check } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function ShareProgress() {
  const { user, isSignedIn } = useUser();
  const [copied, setCopied] = useState(false);
  
  const submissions = useQuery(
    api.leetcode.getSubmissionsByUser,
    isSignedIn ? { userId: user?.id || "" } : "skip"
  );

  if (!isSignedIn || !submissions || submissions.length === 0) {
    return null;
  }

  // Calculate streaks and total problems solved
  const totalSolved = submissions.length;
  
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

  // Create share text
  const shareText = `I've solved ${totalSolved} LeetCode problems! 💪
${difficultyCounts.Easy} Easy, ${difficultyCounts.Medium} Medium, ${difficultyCounts.Hard} Hard
Check out my progress at didtheboysgrindleetcodetoday.com`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTweet = () => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(tweetUrl, '_blank');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1.5 bg-background hover:bg-background/80"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>Share</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share your LeetCode progress</DialogTitle>
          <DialogDescription>
            Let your friends know about your LeetCode grinding achievements!
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-4 border rounded-md bg-muted/30 mt-4">
          <p className="whitespace-pre-line text-sm">{shareText}</p>
        </div>
        
        <div className="flex gap-4 mt-4">
          <Button 
            className="flex-1 gap-2" 
            variant="outline" 
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Text
              </>
            )}
          </Button>
          
          <Button 
            className="flex-1 gap-2 bg-[#1DA1F2] hover:bg-[#1a8cd8]" 
            onClick={handleTweet}
          >
            <Twitter className="h-4 w-4" />
            Tweet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}