"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function RobloxJobs() {
  const jobs = useQuery(api.roblox.getJobs);

  return <JobBoard companyName="Roblox" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=roblox.com&sz=128" maxHeight="max-h-[400px]" />;
}
