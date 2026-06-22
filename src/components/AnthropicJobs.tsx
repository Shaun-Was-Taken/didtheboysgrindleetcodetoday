"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function AnthropicJobs() {
  const jobs = useQuery(api.anthropic.getJobs);

  return <JobBoard companyName="Anthropic" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=anthropic.com&sz=128" maxHeight="max-h-[400px]" />;
}
