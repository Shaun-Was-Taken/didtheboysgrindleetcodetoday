import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New-Grad & SWE Job Board",
  description:
    "Live software engineer job board tracking Google, Apple, Microsoft, OpenAI, Uber, Adobe and more — pulled straight from careers pages, refreshed hourly, free.",
  alternates: { canonical: "/jobs" },
  openGraph: {
    title: "New-Grad & SWE Job Board",
    description:
      "Live software engineer job board tracking Google, Apple, Microsoft, OpenAI, Uber, Adobe and more — refreshed hourly, free.",
    url: "/jobs",
  },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
