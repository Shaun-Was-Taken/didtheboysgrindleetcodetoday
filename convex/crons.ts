import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "garmin-job-monitor",
  { hours: 1 },
  internal.garmin.fetchGarminJobs
);

export default crons;
