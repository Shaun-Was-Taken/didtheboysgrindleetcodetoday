"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function OpenAIJobs() {
  const jobs = useQuery(api.openai.getJobs);

  return <JobBoard companyName="OpenAI" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=openai.com&sz=128" maxHeight="max-h-[400px]" />;
}
