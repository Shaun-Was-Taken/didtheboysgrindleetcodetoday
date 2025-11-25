"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function MicrosoftJobs() {
  const jobs = useQuery(api.microsoft.getJobs);

  return <JobBoard companyName="Microsoft" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=microsoft.com&sz=128" />;
}
