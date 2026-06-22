"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function WellSkyJobs() {
  const jobs = useQuery(api.wellsky.getJobs);

  return <JobBoard companyName="WellSky" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=wellsky.com&sz=128" maxHeight="max-h-[400px]" />;
}
