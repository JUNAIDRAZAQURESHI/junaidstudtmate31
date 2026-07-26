import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileText, Download, Loader2 } from "lucide-react";
import { generateResume } from "@/lib/tools.functions";
import { Markdown, CopyButton, DownloadButton } from "@/components/Markdown";

export const Route = createFileRoute("/_authenticated/resume")({
  component: ResumePage,
});

type Form = {
  fullName: string; title: string; email: string; phone: string; location: string;
  targetRole: string; summary: string; skills: string; experience: string; projects: string; education: string;
};

const EMPTY: Form = {
  fullName: "", title: "", email: "", phone: "", location: "",
  targetRole: "", summary: "", skills: "", experience: "", projects: "", education: "",
};

function ResumePage() {
  const gen = useServerFn(generateResume);
  const [form, setForm] = useState<Form>(EMPTY);
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);

  function set<K extends keyof Form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await gen({ data: form });
      setOutput(res.output);
      toast.success("Resume generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function printResume() {
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${form.fullName || "Resume"}</title>
      <style>
        body{font-family:'Inter',system-ui,sans-serif;color:#111;max-width:820px;margin:40px auto;padding:0 30px;line-height:1.5;}
        h1{font-size:28px;margin:0 0 4px;} h2{font-size:16px;border-bottom:1px solid #ccc;margin-top:24px;padding-bottom:4px;text-transform:uppercase;letter-spacing:.05em;}
        h3{font-size:14px;margin:14px 0 2px;} ul{margin:6px 0 12px 20px;padding:0;} li{margin:2px 0;}
        p{margin:6px 0;} @media print{ body{margin:0;} }
      </style></head><body>${mdToHtml(output)}<script>window.print()</script></body></html>`;
    w.document.write(html); w.document.close();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="glass-strong rounded-3xl p-6 pop-in">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl btn-glow"><FileText className="h-5 w-5 text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold">AI Resume Builder</h1>
            <p className="text-sm text-muted-foreground">ATS-friendly. Download as PDF.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={onGenerate} className="glass-strong rounded-3xl p-6 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Full name" value={form.fullName} onChange={(v) => set("fullName", v)} required minLength={2} />
            <Input label="Current title" value={form.title} onChange={(v) => set("title", v)} required minLength={2} />
            <Input label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} required />
            <Input label="Phone" value={form.phone} onChange={(v) => set("phone", v)} required minLength={3} />
            <Input label="Location" value={form.location} onChange={(v) => set("location", v)} />
            <Input label="Target role" value={form.targetRole} onChange={(v) => set("targetRole", v)} />
          </div>
          <Area label="Professional summary (optional)" value={form.summary} onChange={(v) => set("summary", v)} rows={3} />
          <Area label="Skills (comma-separated)" value={form.skills} onChange={(v) => set("skills", v)} rows={2} required />
          <Area label="Experience" value={form.experience} onChange={(v) => set("experience", v)} rows={6} required />
          <Area label="Projects (optional)" value={form.projects} onChange={(v) => set("projects", v)} rows={4} />
          <Area label="Education" value={form.education} onChange={(v) => set("education", v)} rows={3} required />

          <button disabled={busy} className="btn-glow mt-2 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold hover:btn-glow-hover disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {busy ? "Generating…" : "Generate resume"}
          </button>
        </form>

        <div className="glass-strong rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Preview</h2>
            {output && (
              <div className="flex gap-2">
                <CopyButton text={output} />
                <DownloadButton text={output} filename={`${form.fullName || "resume"}.md`} />
                <button onClick={printResume} className="glass inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs hover:bg-white/10">
                  <Download className="h-3.5 w-3.5" /> PDF
                </button>
              </div>
            )}
          </div>
          <div className="mt-3 min-h-[300px] rounded-2xl bg-white/5 p-4">
            {output ? <Markdown>{output}</Markdown> : <p className="text-sm text-muted-foreground">Your generated resume will appear here.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className="glass w-full rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/60" />
    </label>
  );
}
function Area({ label, value, onChange, rows = 3, required = false }: { label: string; value: string; onChange: (v: string) => void; rows?: number; required?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <textarea required={required} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="glass w-full rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/60" />
    </label>
  );
}

function mdToHtml(md: string): string {
  // very small markdown → html for print (headings, bullets, bold, paragraphs)
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  const lines = md.split(/\r?\n/);
  let html = ""; let inList = false;
  for (const raw of lines) {
    const line = raw.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
    if (/^# /.test(raw)) { if (inList) { html += "</ul>"; inList = false; } html += `<h1>${esc(raw.slice(2))}</h1>`; continue; }
    if (/^## /.test(raw)) { if (inList) { html += "</ul>"; inList = false; } html += `<h2>${esc(raw.slice(3))}</h2>`; continue; }
    if (/^### /.test(raw)) { if (inList) { html += "</ul>"; inList = false; } html += `<h3>${esc(raw.slice(4))}</h3>`; continue; }
    if (/^[-*] /.test(raw)) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${line.slice(2)}</li>`; continue; }
    if (!raw.trim()) { if (inList) { html += "</ul>"; inList = false; } html += ""; continue; }
    if (inList) { html += "</ul>"; inList = false; }
    html += `<p>${line}</p>`;
  }
  if (inList) html += "</ul>";
  return html;
}
