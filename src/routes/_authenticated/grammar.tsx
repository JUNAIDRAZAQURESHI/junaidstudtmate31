import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SpellCheck, Loader2 } from "lucide-react";
import { checkGrammar } from "@/lib/tools.functions";
import { Markdown, CopyButton } from "@/components/Markdown";

export const Route = createFileRoute("/_authenticated/grammar")({
  component: GrammarPage,
});

function GrammarPage() {
  const gen = useServerFn(checkGrammar);
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const res = await gen({ data: { text, language: language || undefined } });
      setOutput(res.output);
      toast.success("Grammar check complete");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="glass-strong rounded-3xl p-6 pop-in">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl btn-glow"><SpellCheck className="h-5 w-5 text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold">Grammar Checker</h1>
            <p className="text-sm text-muted-foreground">Fix grammar, punctuation and clarity in any language.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={run} className="glass-strong rounded-3xl p-6 space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Language (optional)</span>
            <input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Auto-detect" className="glass w-full rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/60" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Your text</span>
            <textarea required minLength={1} rows={14} value={text} onChange={(e) => setText(e.target.value)} className="glass w-full rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/60" />
          </label>
          <button disabled={busy || !text.trim()} className="btn-glow mt-1 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold hover:btn-glow-hover disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SpellCheck className="h-4 w-4" />}
            {busy ? "Checking…" : "Check grammar"}
          </button>
        </form>

        <div className="glass-strong rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Result</h2>
            {output && <CopyButton text={output} />}
          </div>
          <div className="mt-3 min-h-[300px] rounded-2xl bg-white/5 p-4">
            {output ? <Markdown>{output}</Markdown> : <p className="text-sm text-muted-foreground">Corrections and explanations will appear here.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
