import HeroSection from "@/components/HeroSection";
import GarminJobs from "@/components/GarminJobs";

export default function Home() {
  return (
    <div className="min-h-screen">
      <main className="flex flex-col gap-14 p-4 md:p-8">
        
        <HeroSection />
        <GarminJobs />
        {/* Add the leaderboard component */}
      </main>
    </div>
  );
}
