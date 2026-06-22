"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function DatabricksJobs() {
  const jobs = useQuery(api.databricks.getJobs);

  return <JobBoard companyName="Databricks" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=databricks.com&sz=128" maxHeight="max-h-[400px]" />;
}
