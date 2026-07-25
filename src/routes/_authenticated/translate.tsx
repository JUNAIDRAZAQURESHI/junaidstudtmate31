import { createFileRoute } from "@tanstack/react-router";
import { GeneratorPanel } from "@/components/GeneratorPanel";

export const Route = createFileRoute("/_authenticated/translate")({ component: TranslatePage });

function TranslatePage() {
  return (
    <GeneratorPanel
      kind="translation"
      title="Translation"
      subtitle="Translate any text into your target language, preserving tone and meaning."
      placeholder="Paste the text to translate…"
      showLanguage
    />
  );
}
