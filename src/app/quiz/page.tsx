"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Brain, ArrowLeft, Shuffle } from "lucide-react";
import Link from "next/link";
import leetcodeData from "@/neetcode_allNC.json";

interface Problem {
  title: string;
  url: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

interface LeetcodeData {
  [category: string]: Problem[];
}

const typedLeetcodeData = leetcodeData as LeetcodeData;

const categories = Object.keys(typedLeetcodeData);
const difficulties = ["Easy", "Medium", "Hard"] as const;

export default function QuizPage() {
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([
    "Easy",
  ]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    categories[0],
  ]);
  const [generatedQuiz, setGeneratedQuiz] = useState<Problem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDifficultyChange = (
    difficulty: string,
    checked: boolean | string
  ) => {
    const isChecked = checked === true;
    if (isChecked) {
      setSelectedDifficulties([...selectedDifficulties, difficulty]);
    } else {
      setSelectedDifficulties(
        selectedDifficulties.filter((d) => d !== difficulty)
      );
    }
  };

  const handleCategoryChange = (
    category: string,
    checked: boolean | string
  ) => {
    const isChecked = checked === true;
    if (isChecked) {
      setSelectedCategories([...selectedCategories, category]);
    } else {
      setSelectedCategories(selectedCategories.filter((c) => c !== category));
    }
  };

  const generateQuiz = () => {
    setIsGenerating(true);

    // Filter problems based on selected criteria
    const filteredProblems: Problem[] = [];

    selectedCategories.forEach((category) => {
      const categoryProblems = typedLeetcodeData[category] || [];
      const validProblems = categoryProblems.filter((problem) =>
        selectedDifficulties.includes(problem.difficulty)
      );
      filteredProblems.push(...validProblems);
    });

    // Shuffle and select the requested number of questions
    const shuffled = [...filteredProblems].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(numQuestions, shuffled.length));

    setGeneratedQuiz(selected);
    setIsGenerating(false);
  };

  const canGenerate =
    selectedDifficulties.length > 0 &&
    selectedCategories.length > 0 &&
    numQuestions > 0;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">
              LeetCode Quiz Generator
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quiz Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Quiz Configuration</CardTitle>
              <CardDescription>
                Customize your quiz by selecting the number of questions,
                difficulty levels, and problem categories.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Number of Questions */}
              <div className="space-y-2">
                <Label htmlFor="numQuestions">Number of Questions</Label>
                <Input
                  id="numQuestions"
                  type="number"
                  min="1"
                  max="50"
                  value={numQuestions}
                  onChange={(e) =>
                    setNumQuestions(parseInt(e.target.value) || 1)
                  }
                  className="w-full"
                />
              </div>

              {/* Difficulty Selection */}
              <div className="space-y-3">
                <Label>Difficulty Levels</Label>
                <div className="grid grid-cols-3 gap-4">
                  {difficulties.map((difficulty) => (
                    <div
                      key={difficulty}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={difficulty}
                        checked={selectedDifficulties.includes(difficulty)}
                        onCheckedChange={(checked) =>
                          handleDifficultyChange(difficulty, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={difficulty}
                        className={`text-sm font-medium ${
                          difficulty === "Easy"
                            ? "text-green-600"
                            : difficulty === "Medium"
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {difficulty}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Selection */}
              <div className="space-y-3">
                <Label>Problem Categories</Label>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                  {categories.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={category}
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={(checked) =>
                          handleCategoryChange(category, checked as boolean)
                        }
                      />
                      <Label htmlFor={category} className="text-sm">
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateQuiz}
                disabled={!canGenerate || isGenerating}
                className="w-full"
                size="lg"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                {isGenerating ? "Generating..." : "Generate Quiz"}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Quiz */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Quiz</CardTitle>
              <CardDescription>
                {generatedQuiz.length > 0
                  ? `${generatedQuiz.length} problems selected for your quiz`
                  : "Configure your preferences and generate a quiz to see problems here"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedQuiz.length > 0 ? (
                <div className="space-y-4">
                  {generatedQuiz.map((problem, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm md:text-base mb-2">
                            {index + 1}. {problem.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${
                                problem.difficulty === "Easy"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                  : problem.difficulty === "Medium"
                                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                    : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                              }`}
                            >
                              {problem.difficulty}
                            </span>
                          </div>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <a
                            href={problem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Solve
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No quiz generated yet</p>
                  <p className="text-sm">
                    Configure your preferences and click "Generate Quiz"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
