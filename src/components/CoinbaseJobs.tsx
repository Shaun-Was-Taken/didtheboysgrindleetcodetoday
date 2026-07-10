"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function CoinbaseJobs() {
  const jobs = useQuery(api.coinbase.getJobs);

  return <JobBoard companyName="Coinbase" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=coinbase.com&sz=128" maxHeight="max-h-[400px]" />;
}
