"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function MicrosoftJobs() {
  const jobs = useQuery(api.microsoft.getJobs);

  return <JobBoard companyName="Microsoft" jobs={jobs} fetchInterval="every hour" />;
}
