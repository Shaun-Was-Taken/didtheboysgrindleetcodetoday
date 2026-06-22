"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function TMobileJobs() {
  const jobs = useQuery(api.tmobile.getJobs);

  return <JobBoard companyName="T-Mobile" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=t-mobile.com&sz=128" maxHeight="max-h-[400px]" />;
}
