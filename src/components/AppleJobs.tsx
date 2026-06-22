"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function AppleJobs() {
  const jobs = useQuery(api.apple.getJobs);

  return <JobBoard companyName="Apple" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=apple.com&sz=128" maxHeight="max-h-[400px]" />;
}
