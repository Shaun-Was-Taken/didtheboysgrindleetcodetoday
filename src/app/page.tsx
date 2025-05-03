import HeroSection from "@/components/HeroSection";

export default function Home() {
  return (
    <div className="min-h-screen">
      <main className="flex flex-col gap-14 p-4 md:p-8">
        <HeroSection />
        {/* Add the leaderboard component */}
      </main>
    </div>
  );
}
