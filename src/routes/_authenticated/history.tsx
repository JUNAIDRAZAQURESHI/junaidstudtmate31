import { BackBar } from "@/components/BackBar";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Search, Trash2, FileText } from "lucide-react";
import { Markdown, CopyButton, DownloadButton } from "@/components/Markdown";
import { listStudyItems, deleteStudyItem } from "@/lib/study.functions";

export const Route = createFileRoute("/_authenticated/history")({ component: HistoryPage });

const KIND_LABEL: Record<string, string> = {
  summary: "Summary", notes: "Notes", mcq: "MCQs", quiz: "Quiz", translation: "Translation",
};

function HistoryPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listStudyItems);
  const delFn = useServerFn(deleteStudyItem);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  const itemsQ = useQuery({ queryKey: ["study-items"], queryFn: () => listFn() });
  const filtered = useMemo(() => {
    const items = itemsQ.data?.items ?? [];
    return items.filter((it) => {
      if (kind !== "all" && it.kind !== kind) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return it.title.toLowerCase().includes(s) || it.output.toLowerCase().includes(s);
    });
  }, [itemsQ.data, q, kind]);

  const active = filtered.find((i) => i.id === activeId) ?? filtered[0];

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["study-items"] }); toast.success("Deleted"); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <BackBar />
      <div className="glass-strong rounded-3xl p-8 pop-in">
        <h1 className="text-3xl font-bold">History</h1>
        <p className="mt-1 text-muted-foreground">All your saved summaries, notes, quizzes, and translations.</p>
      </div>

      <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-3">
        <div className="glass flex flex-1 items-center gap-2 rounded-xl px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search title or content…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={kind} onChange={(e) => setKind(e.target.value)}
          className="glass rounded-xl bg-transparent px-3 py-2 text-sm outline-none"
        >
          <option value="all">All types</option>
          <option value="summary">Summaries</option>
          <option value="notes">Notes</option>
          <option value="mcq">MCQs</option>
          <option value="quiz">Quizzes</option>
          <option value="translation">Translations</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div className="glass max-h-[70vh] overflow-y-auto rounded-3xl p-3">
          {filtered.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">No items match.</p>
          )}
          {filtered.map((it) => (
            <div
              key={it.id}
              onClick={() => setActiveId(it.id)}
              className={`group cursor-pointer rounded-xl px-3 py-3 text-sm ${
                (active?.id === it.id) ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="mb-1 inline-flex items-center gap-1.5 rounded-full glass px-2 py-0.5 text-[10px] uppercase">
                    <FileText className="h-3 w-3" />
                    {KIND_LABEL[it.kind] ?? it.kind}
                  </div>
                  <p className="truncate font-medium">{it.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(it.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); del.mutate(it.id); }}
                  className="opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="glass rounded-3xl p-6">
          {active ? (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{active.title}</h2>
                <div className="flex gap-2">
                  <CopyButton text={active.output} />
                  <DownloadButton text={active.output} filename={`${active.title}.md`} />
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto rounded-xl bg-black/10 p-4 dark:bg-white/5">
                <Markdown>{active.output}</Markdown>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select an item to view it.</p>
          )}
        </div>
      </div>
    </div>
  );
}
