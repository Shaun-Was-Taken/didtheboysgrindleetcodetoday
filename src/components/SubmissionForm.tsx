"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { format } from "date-fns";
import ScreenshotUploader from "./ScreenshotUploader";

const formSchema = z.object({
  problemTitle: z.string().min(3, "Problem title is required"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function SubmissionForm() {
  const { user, isSignedIn } = useUser();
  const addSubmission = useMutation(api.leetcode.addSubmission);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      problemTitle: "",
      difficulty: undefined,
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!isSignedIn || !user || !screenshotUrl) return;
    
    setIsSubmitting(true);
    try {
      await addSubmission({
        userId: user.id,
        problemTitle: data.problemTitle,
        submissionDate: format(new Date(), 'yyyy-MM-dd'),
        screenshotUrl: screenshotUrl,
        difficulty: data.difficulty,
      });
      
      reset();
      setScreenshotUrl(null);
    } catch (error) {
      console.error("Error submitting LeetCode solution:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadComplete = (url: string) => {
    setScreenshotUrl(url);
  };

  if (!isSignedIn) {
    return <div className="text-center p-4">Sign in to submit your LeetCode solutions</div>;
  }

  return (
    <Card className="p-6 w-full max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Submit Your LeetCode Solution</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="problemTitle">Problem Title</Label>
          <Input
            id="problemTitle"
            placeholder="Two Sum"
            {...register("problemTitle")}
          />
          {errors.problemTitle && (
            <p className="text-sm text-red-500">{errors.problemTitle.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="difficulty">Difficulty (optional)</Label>
          <select
            id="difficulty"
            className="w-full p-2 rounded-md border border-input bg-background"
            {...register("difficulty")}
          >
            <option value="">Select difficulty</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>Screenshot</Label>
          <ScreenshotUploader onUploadComplete={handleUploadComplete} />
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting || !screenshotUrl}
        >
          {isSubmitting ? "Submitting..." : "Submit Solution"}
        </Button>
      </form>
    </Card>
  );
}