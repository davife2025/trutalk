import { AppHeader } from "@/components/AppHeader";
import { NavBar } from "@/components/NavBar";
import { AssessmentFlow } from "@/components/AssessmentFlow";

export default function Phq9Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6 pb-20">
      <AppHeader />
      <h1 className="text-xl font-semibold">PHQ-9 Depression Screening</h1>
      <AssessmentFlow type="phq9" title="PHQ-9" />
      <NavBar />
    </main>
  );
}
