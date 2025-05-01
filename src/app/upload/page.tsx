import SubmissionForm from "@/components/SubmissionForm";
import SubmissionGallery from "@/components/SubmissionGallery";
import { Card } from "@/components/ui/card";

export default function UploadPage() {
  return (
    <div className="min-h-screen py-10 px-4">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Upload Your LeetCode Progress
        </h1>

        <div className="flex flex-col md:flex-row justify-between w-full gap-6">
          <div className="flex-1">
            <SubmissionForm />
          </div>
          <div className="flex-1">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                Why Track Your Progress?
              </h2>
              <p className="text-muted-foreground mb-4">
                Consistently tracking your LeetCode solutions helps you:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>Build a visual record of your dedication</li>
                <li>Stay motivated with streak tracking</li>
                <li>Share your progress with friends</li>
                <li>Identify patterns in your problem-solving journey</li>
              </ul>
            </Card>
          </div>
        </div>

        <div className="w-full mt-10">
          <SubmissionGallery />
        </div>
      </div>
    </div>
  );
}
