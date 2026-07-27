import { BackBar } from "@/components/BackBar";
import { createFileRoute } from "@tanstack/react-router";
import { GeneratorPanel } from "@/components/GeneratorPanel";

export const Route = createFileRoute("/_authenticated/notes")({ component: NotesPage });

function NotesPage() {
  return (
    <GeneratorPanel
      kind="notes"
      title="Notes Generator"
      subtitle="Turn any topic or content into structured study notes."
      placeholder="Paste your topic, text, or lecture content here…"
    />
  );
}
