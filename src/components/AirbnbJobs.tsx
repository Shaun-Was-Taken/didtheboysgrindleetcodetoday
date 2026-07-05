"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function AirbnbJobs() {
  const jobs = useQuery(api.airbnb.getJobs);

  return <JobBoard companyName="Airbnb" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=airbnb.com&sz=128" maxHeight="max-h-[400px]" />;
}
