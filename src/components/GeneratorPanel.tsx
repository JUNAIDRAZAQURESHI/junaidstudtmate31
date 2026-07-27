import { useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles, Save } from "lucide-react";
import { Markdown, CopyButton, DownloadButton } from "@/components/Markdown";
import { BackBar } from "@/components/BackBar";
import { generateStudyItem } from "@/lib/study.functions";

type Kind = "summary" | "notes" | "mcq" | "quiz" | "translation";

export function GeneratorPanel({
  kind, title, subtitle, placeholder, defaultCount, showDifficulty, showLanguage, extraControls,
}: {
  kind: Kind;
  title: string;
  subtitle: string;
  placeholder: string;
  defaultCount?: number;
  showDifficulty?: boolean;
  showLanguage?: boolean;
  extraControls?: ReactNode;
}) {
  const genFn = useServerFn(generateStudyItem);
  const [input, setInput] = useState("");
  const [count, setCount] = useState(defaultCount ?? 10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [language, setLanguage] = useState("Spanish");
  const [output, setOutput] = useState("");
  const [itemTitle, setItemTitle] = useState("");

  const gen = useMutation({
    mutationFn: async (save: boolean) =>
      genFn({
        data: {
          kind,
          input,
          save,
          options: {
            count: showDifficulty ? count : undefined,
            difficulty: showDifficulty ? difficulty : undefined,
            language: showLanguage ? language : undefined,
            title: itemTitle || `${title} · ${new Date().toLocaleString()}`,
          },
        },
      }),
    onSuccess: (res, saved) => {
      setOutput(res.output);
      if (saved) toast.success("Saved to history");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <BackBar title={title} />
      <div className="glass-strong rounded-3xl p-6 pop-in sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass rounded-3xl p-6">
          <label className="text-sm font-medium">Your content</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            rows={12}
            className="glass mt-2 w-full resize-y rounded-xl bg-transparent p-4 text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Title (optional)</label>
              <input
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                placeholder="e.g. Chapter 3 review"
                className="glass mt-1 w-full rounded-xl bg-transparent px-3 py-2 text-sm outline-none"
              />
            </div>
            {showDifficulty && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Count</label>
                  <input
                    type="number" min={1} max={30}
                    value={count} onChange={(e) => setCount(Number(e.target.value))}
                    className="glass mt-1 w-full rounded-xl bg-transparent px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
                    className="glass mt-1 w-full rounded-xl bg-transparent px-3 py-2 text-sm outline-none"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            )}
            {showLanguage && (
              <div>
                <label className="text-xs text-muted-foreground">Target language</label>
                <input
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g. Spanish, Urdu, French"
                  className="glass mt-1 w-full rounded-xl bg-transparent px-3 py-2 text-sm outline-none"
                />
              </div>
            )}
          </div>
          {extraControls}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => gen.mutate(false)}
              disabled={!input.trim() || gen.isPending}
              className="btn-glow inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold hover:btn-glow-hover disabled:opacity-50"
            >
              {gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate
            </button>
            <button
              onClick={() => gen.mutate(true)}
              disabled={!input.trim() || gen.isPending}
              className="glass inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> Generate & Save
            </button>
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium">Output</label>
            {output && (
              <div className="flex gap-2">
                <CopyButton text={output} />
                <DownloadButton text={output} filename={`${kind}-${Date.now()}.md`} />
              </div>
            )}
          </div>
          <div className="max-h-[65vh] min-h-[300px] overflow-y-auto rounded-xl bg-black/10 p-4 dark:bg-white/5">
            {output ? (
              <Markdown>{output}</Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">Your generated content will appear here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
