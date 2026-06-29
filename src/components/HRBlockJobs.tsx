"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function HRBlockJobs() {
  const jobs = useQuery(api.hrblock.getJobs);

  return <JobBoard companyName="H&R Block" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=hrblock.com&sz=128" maxHeight="max-h-[400px]" />;
}
