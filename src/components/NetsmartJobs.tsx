"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function NetsmartJobs() {
  const jobs = useQuery(api.netsmart.getJobs);

  return <JobBoard companyName="Netsmart" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=ntst.com&sz=128" maxHeight="max-h-[400px]" />;
}
