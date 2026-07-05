"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function PinterestJobs() {
  const jobs = useQuery(api.pinterest.getJobs);

  return <JobBoard companyName="Pinterest" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=pinterest.com&sz=128" maxHeight="max-h-[400px]" />;
}
