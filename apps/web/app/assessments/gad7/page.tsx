import { AppHeader } from "@/components/AppHeader";
import { NavBar } from "@/components/NavBar";
import { AssessmentFlow } from "@/components/AssessmentFlow";

export default function Gad7Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6 pb-20">
      <AppHeader />
      <h1 className="text-xl font-semibold">GAD-7 Anxiety Screening</h1>
      <AssessmentFlow type="gad7" title="GAD-7" />
      <NavBar />
    </main>
  );
}
