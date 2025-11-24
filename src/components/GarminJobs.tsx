"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function GarminJobs() {
  const jobs = useQuery(api.garmin.getJobs);

  return <JobBoard companyName="Garmin" jobs={jobs} fetchInterval="every hour" />;
}
