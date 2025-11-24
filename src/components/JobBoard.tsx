"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Job {
  _id: string;
  _creationTime: number;
  jobId: string;
  title: string;
  link: string;
  location?: string;
  firstSeen: string;
}

interface JobBoardProps {
  companyName: string;
  jobs: Job[] | undefined;
  fetchInterval?: string;
}

export default function JobBoard({ companyName, jobs, fetchInterval = "every hour" }: JobBoardProps) {
  if (!jobs) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{companyName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading jobs...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{companyName}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <p className="text-sm text-muted-foreground">Fetching {fetchInterval}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No relevant jobs found yet.</p>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {jobs.map((job) => (
              <Card key={job.jobId} className="hover:shadow-md transition-shadow border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2">
                    <h3 className="font-semibold text-base leading-tight" title={job.title}>
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {job.location && (
                        <Badge variant="outline" className="text-xs">
                          📍 {job.location}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Listed: {new Date(job.firstSeen).toLocaleDateString()}
                      </span>
                    </div>
                    <Link
                      href={job.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm font-medium inline-flex items-center gap-1 w-fit"
                    >
                      View Job →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
