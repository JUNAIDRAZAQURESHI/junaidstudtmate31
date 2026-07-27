import { BackBar } from "@/components/BackBar";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, Loader2, FileText, Trash2, Sparkles, BookOpen, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Markdown, CopyButton, DownloadButton } from "@/components/Markdown";
import {
  saveDocument, listDocuments, deleteDocument, getDocumentText,
} from "@/lib/documents.functions";
import { generateStudyItem } from "@/lib/study.functions";

export const Route = createFileRoute("/_authenticated/pdf")({ component: PDFPage });

async function extractPdfText(file: File): Promise<string> {
  // pdfjs-dist v6 ESM
  const pdfjs = await import("pdfjs-dist");
  const workerMod = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")) as { default: string };
  (pdfjs.GlobalWorkerOptions as { workerSrc: string }).workerSrc = workerMod.default;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  const maxPages = Math.min(doc.numPages, 200);
  for (let p = 1; p <= maxPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const text = content.items.map((i: unknown) => (i as { str?: string }).str ?? "").join(" ");
    parts.push(text);
  }
  return parts.join("\n\n").slice(0, 180000);
}

function PDFPage() {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveDocument);
  const listFn = useServerFn(listDocuments);
  const delFn = useServerFn(deleteDocument);
  const getTextFn = useServerFn(getDocumentText);
  const genFn = useServerFn(generateStudyItem);

  const [uploading, setUploading] = useState(false);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeText, setActiveText] = useState<string>("");
  const [activeName, setActiveName] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [action, setAction] = useState<"summary" | "notes" | "mcq" | null>(null);

  const docsQ = useQuery({ queryKey: ["documents"], queryFn: () => listFn() });

  useEffect(() => {
    if (!activeDocId) { setActiveText(""); setActiveName(""); return; }
    getTextFn({ data: { id: activeDocId } }).then((r) => {
      setActiveText(r.document?.extracted_text ?? "");
      setActiveName(r.document?.file_name ?? "");
    });
  }, [activeDocId, getTextFn]);

  const gen = useMutation({
    mutationFn: async (kind: "summary" | "notes" | "mcq") => {
      setAction(kind);
      return genFn({
        data: {
          kind,
          input: activeText,
          save: true,
          documentId: activeDocId ?? undefined,
          options: {
            title: `${kind.toUpperCase()} of ${activeName}`,
            count: kind === "mcq" ? 10 : undefined,
            difficulty: kind === "mcq" ? "medium" : undefined,
          },
        },
      });
    },
    onSuccess: (r) => { setOutput(r.output); toast.success("Saved to history"); },
    onError: (e) => { toast.error((e as Error).message); },
    onSettled: () => setAction(null),
  });

  async function handleFile(file: File) {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast.error("Please upload a PDF file"); return;
    }
    if (file.size > 20 * 1024 * 1024) { toast.error("Max 20MB"); return; }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, {
        contentType: "application/pdf", upsert: false,
      });
      if (upErr) throw upErr;
      toast.info("Extracting text…");
      const text = await extractPdfText(file);
      const res = await saveFn({
        data: { fileName: file.name, storagePath: path, sizeBytes: file.size, extractedText: text },
      });
      toast.success("PDF uploaded");
      qc.invalidateQueries({ queryKey: ["documents"] });
      setActiveDocId(res.document.id);
      setOutput("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function del(id: string) {
    await delFn({ data: { id } });
    if (activeDocId === id) setActiveDocId(null);
    qc.invalidateQueries({ queryKey: ["documents"] });
    toast.success("Deleted");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <BackBar />
      <div className="glass-strong rounded-3xl p-8 pop-in">
        <h1 className="text-3xl font-bold">PDF Summary & Tools</h1>
        <p className="mt-1 text-muted-foreground">Upload a PDF and generate summaries, notes, or quiz questions.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div className="glass rounded-3xl p-5">
          <label className="btn-glow flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold hover:btn-glow-hover">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Upload PDF"}
            <input
              type="file" accept="application/pdf" className="hidden" disabled={uploading}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          <div className="mt-4 space-y-1">
            <p className="mb-2 text-xs text-muted-foreground">Your PDFs</p>
            {(docsQ.data?.documents ?? []).map((d) => (
              <div
                key={d.id}
                className={`group flex items-center gap-2 rounded-xl px-2 py-2 text-sm cursor-pointer ${
                  activeDocId === d.id ? "bg-white/10" : "hover:bg-white/5"
                }`}
                onClick={() => setActiveDocId(d.id)}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 truncate">{d.file_name}</span>
                <button onClick={(e) => { e.stopPropagation(); del(d.id); }} className="opacity-0 group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            ))}
            {docsQ.data?.documents?.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">No PDFs yet</p>
            )}
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          {activeDocId ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Active document</p>
                  <h2 className="truncate text-lg font-semibold">{activeName}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => gen.mutate("summary")}
                    disabled={gen.isPending || !activeText}
                    className="btn-glow inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold hover:btn-glow-hover disabled:opacity-50"
                  >
                    {action === "summary" && gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Summary
                  </button>
                  <button
                    onClick={() => gen.mutate("notes")}
                    disabled={gen.isPending || !activeText}
                    className="glass inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                  >
                    {action === "notes" && gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />} Notes
                  </button>
                  <button
                    onClick={() => gen.mutate("mcq")}
                    disabled={gen.isPending || !activeText}
                    className="glass inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                  >
                    {action === "mcq" && gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />} MCQs
                  </button>
                </div>
              </div>

              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium">Output</p>
                {output && (
                  <div className="flex gap-2">
                    <CopyButton text={output} />
                    <DownloadButton text={output} filename={`${activeName}.md`} />
                  </div>
                )}
              </div>
              <div className="max-h-[60vh] min-h-[300px] overflow-y-auto rounded-xl bg-black/10 p-4 dark:bg-white/5">
                {output ? <Markdown>{output}</Markdown> :
                  <p className="text-sm text-muted-foreground">Pick an action above to generate content from this PDF.</p>}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-20 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-semibold">Upload a PDF to get started</p>
              <p className="text-sm text-muted-foreground">We'll extract the text and let you summarize it or turn it into notes and MCQs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
