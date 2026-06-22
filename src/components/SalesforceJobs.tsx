"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function SalesforceJobs() {
  const jobs = useQuery(api.salesforce.getJobs);

  return <JobBoard companyName="Salesforce" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=salesforce.com&sz=128" maxHeight="max-h-[400px]" />;
}
