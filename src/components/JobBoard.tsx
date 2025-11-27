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
  logoUrl?: string;
  maxHeight?: string;
}

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function JobBoard({ companyName, jobs, fetchInterval = "every hour", logoUrl, maxHeight = "max-h-[600px]" }: JobBoardProps) {
  const [imageError, setImageError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);

  useEffect(() => {
    setImageError(false);
  }, [logoUrl]);

  useEffect(() => {
    if (jobs) {
      const filtered = jobs.filter(job => 
        job.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredJobs(filtered);
    }
  }, [jobs, searchQuery]);

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
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {logoUrl && !imageError ? (
                <div className="w-10 h-10 rounded-md overflow-hidden bg-white border border-border flex items-center justify-center p-1 shrink-0">
                  <img 
                    src={logoUrl} 
                    alt={`${companyName} logo`} 
                    className="w-full h-full object-contain"
                    onError={() => setImageError(true)}
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-primary">{companyName.charAt(0)}</span>
                </div>
              )}
              <CardTitle className="text-2xl">{companyName}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <p className="text-sm text-muted-foreground">Fetching {fetchInterval}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"}
          </Badge>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search jobs..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredJobs.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            {jobs.length === 0 ? "No relevant jobs found yet." : "No jobs match your search."}
          </p>
        ) : (
          <div className={`space-y-3 ${maxHeight} overflow-y-auto pr-2`}>
            {filteredJobs.map((job) => (
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
