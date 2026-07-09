"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function AdobeJobs() {
  const jobs = useQuery(api.adobe.getJobs);

  return <JobBoard companyName="Adobe" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=adobe.com&sz=128" maxHeight="max-h-[400px]" />;
}
