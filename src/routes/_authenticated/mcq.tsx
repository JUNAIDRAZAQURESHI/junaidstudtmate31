import { createFileRoute } from "@tanstack/react-router";
import { GeneratorPanel } from "@/components/GeneratorPanel";

export const Route = createFileRoute("/_authenticated/mcq")({ component: MCQPage });

function MCQPage() {
  return (
    <GeneratorPanel
      kind="mcq"
      title="MCQ Generator"
      subtitle="Generate multiple-choice questions from any content."
      placeholder="Paste study material here — a chapter, article, or notes…"
      showDifficulty
      defaultCount={10}
    />
  );
}
