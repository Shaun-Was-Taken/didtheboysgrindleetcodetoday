"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function GoogleJobs() {
  const jobs = useQuery(api.google.getJobs);

  return <JobBoard companyName="Google" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=google.com&sz=128" maxHeight="max-h-[400px]" />;
}
