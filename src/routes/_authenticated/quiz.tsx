import { createFileRoute } from "@tanstack/react-router";
import { GeneratorPanel } from "@/components/GeneratorPanel";

export const Route = createFileRoute("/_authenticated/quiz")({ component: QuizPage });

function QuizPage() {
  return (
    <GeneratorPanel
      kind="quiz"
      title="Quiz Generator"
      subtitle="Build a full mixed-format quiz with answer key."
      placeholder="Paste content or topic to build your quiz around…"
      showDifficulty
      defaultCount={10}
    />
  );
}
