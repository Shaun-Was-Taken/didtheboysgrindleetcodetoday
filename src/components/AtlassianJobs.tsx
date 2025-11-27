"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function AtlassianJobs() {
  const jobs = useQuery(api.atlassian.getJobs);

  return <JobBoard companyName="Atlassian" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=atlassian.com&sz=128" maxHeight="max-h-[400px]" />;
}
