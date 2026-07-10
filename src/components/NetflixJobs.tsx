"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function NetflixJobs() {
  const jobs = useQuery(api.netflix.getJobs);

  return <JobBoard companyName="Netflix" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=netflix.com&sz=128" maxHeight="max-h-[400px]" />;
}
