"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    // Set the competition date: May 19, 2025
    const competitionDate = new Date("2025-05-19T00:00:00");

    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = competitionDate.getTime() - now.getTime();

      if (difference <= 0) {
        // Competition has started
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Clean up the interval on component unmount
    return () => clearInterval(timer);
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto bg-card/50 backdrop-blur-sm border-primary/20 shadow-lg">
      <CardContent className="p-6">
        <h3 className="text-center text-lg font-medium mb-4">
          Competition Starts In:
        </h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold text-primary">
              {timeLeft.days}
            </div>
            <div className="text-xs text-muted-foreground">Days</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold text-primary">
              {timeLeft.hours}
            </div>
            <div className="text-xs text-muted-foreground">Hours</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold text-primary">
              {timeLeft.minutes}
            </div>
            <div className="text-xs text-muted-foreground">Minutes</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold text-primary">
              {timeLeft.seconds}
            </div>
            <div className="text-xs text-muted-foreground">Seconds</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
