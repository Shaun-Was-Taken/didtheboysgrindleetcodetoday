"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import JobBoard from "./JobBoard";

export default function StripeJobs() {
  const jobs = useQuery(api.stripe_jobs.getJobs);

  return <JobBoard companyName="Stripe" jobs={jobs} fetchInterval="every hour" logoUrl="https://www.google.com/s2/favicons?domain=stripe.com&sz=128" maxHeight="max-h-[400px]" />;
}
