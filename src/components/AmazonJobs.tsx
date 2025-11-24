"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function AmazonJobs() {
  const jobs = useQuery(api.amazon.getJobs);

  return <JobBoard companyName="Amazon" jobs={jobs} fetchInterval="every hour" />;
}
