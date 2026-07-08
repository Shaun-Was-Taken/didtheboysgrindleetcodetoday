"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { todayStr } from "@/lib/today";

const formSchema = z.object({
  problemTitle: z.string().min(3, "Problem title is required"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function SubmissionForm() {
  const { isSignedIn } = useUser();
  const addSubmission = useMutation(api.leetcode.addSubmission);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    if (!isSignedIn) return;

    setIsSubmitting(true);
    setMessage(null);
    try {
      await addSubmission({
        problemTitle: data.problemTitle,
        submissionDate: todayStr(),
        difficulty: data.difficulty || undefined,
      });
      reset();
      setMessage("Solve logged. Keep grinding!");
    } catch (error) {
      setMessage(
        error instanceof ConvexError
          ? (error.data as string)
          : "Something went wrong. Try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="text-center p-4">
        Sign in to submit your LeetCode solutions
      </div>
    );
  }

  return (
    <Card className="p-6 w-full max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Log a Solve Manually</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="problemTitle">Problem Title</Label>
          <Input
            id="problemTitle"
            placeholder="Two Sum"
            {...register("problemTitle")}
          />
          {errors.problemTitle && (
            <p className="text-sm text-red-500">
              {errors.problemTitle.message}
            </p>
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Log Solve"}
        </Button>

        {message && (
          <p className="text-sm text-center text-muted-foreground">
            {message}
          </p>
        )}
      </form>
    </Card>
  );
}
