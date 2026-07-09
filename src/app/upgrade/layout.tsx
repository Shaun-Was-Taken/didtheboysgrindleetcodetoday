import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Premium",
  description:
    "Upgrade for premium job alerts — get emailed the moment a tracked company posts a new software engineer role.",
  alternates: { canonical: "/upgrade" },
};

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
