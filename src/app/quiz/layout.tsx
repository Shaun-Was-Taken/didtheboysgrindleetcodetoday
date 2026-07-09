import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LeetCode Practice Quiz",
  description:
    "Generate a custom LeetCode practice set from NeetCode problems — pick your topics and difficulty, get a randomized quiz to grind.",
  alternates: { canonical: "/quiz" },
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
