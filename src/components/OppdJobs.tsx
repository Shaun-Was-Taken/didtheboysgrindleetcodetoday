"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function OppdJobs() {
  const jobs = useQuery(api.oppd.getJobs);

  return <JobBoard companyName="OPPD" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=oppd.com&sz=128" />;
}
