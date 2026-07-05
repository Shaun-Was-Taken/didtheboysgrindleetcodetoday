"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function DuolingoJobs() {
  const jobs = useQuery(api.duolingo.getJobs);

  return <JobBoard companyName="Duolingo" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=duolingo.com&sz=128" maxHeight="max-h-[400px]" />;
}
