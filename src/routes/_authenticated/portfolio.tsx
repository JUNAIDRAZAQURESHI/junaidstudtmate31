import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Globe, Loader2, Download, ExternalLink } from "lucide-react";
import { generatePortfolio } from "@/lib/tools.functions";

export const Route = createFileRoute("/_authenticated/portfolio")({
  component: PortfolioPage,
});

type Form = {
  fullName: string; role: string; tagline: string; about: string;
  skills: string; projects: string; email: string; socials: string; themeColor: string;
};
const EMPTY: Form = { fullName: "", role: "", tagline: "", about: "", skills: "", projects: "", email: "", socials: "", themeColor: "electric violet" };

function PortfolioPage() {
  const gen = useServerFn(generatePortfolio);
  const [form, setForm] = useState<Form>(EMPTY);
  const [html, setHtml] = useState("");
  const [busy, setBusy] = useState(false);
  function set<K extends keyof Form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function onGen(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const res = await gen({ data: form });
      setHtml(res.html);
      toast.success("Portfolio ready");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); }
  }

  function download() {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${form.fullName || "portfolio"}.html`; a.click();
    URL.revokeObjectURL(url);
  }
  function openNew() {
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (w) { w.document.write(html); w.document.close(); }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="glass-strong rounded-3xl p-6 pop-in">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl btn-glow"><Globe className="h-5 w-5 text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold">AI Portfolio Generator</h1>
            <p className="text-sm text-muted-foreground">Generate a single-file website you can export or host.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={onGen} className="glass-strong rounded-3xl p-6 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Full name" value={form.fullName} onChange={(v) => set("fullName", v)} required minLength={2} />
            <Input label="Role" value={form.role} onChange={(v) => set("role", v)} required minLength={2} />
            <Input label="Tagline" value={form.tagline} onChange={(v) => set("tagline", v)} />
            <Input label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} required />
            <Input label="Socials (comma-separated URLs)" value={form.socials} onChange={(v) => set("socials", v)} />
            <Input label="Theme accent" value={form.themeColor} onChange={(v) => set("themeColor", v)} />
          </div>
          <Area label="About you" value={form.about} onChange={(v) => set("about", v)} rows={4} required />
          <Area label="Skills" value={form.skills} onChange={(v) => set("skills", v)} rows={2} required />
          <Area label="Projects (title — description per line)" value={form.projects} onChange={(v) => set("projects", v)} rows={6} required />
          <button disabled={busy} className="btn-glow mt-2 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold hover:btn-glow-hover disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            {busy ? "Generating…" : "Generate portfolio"}
          </button>
        </form>

        <div className="glass-strong rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Live preview</h2>
            {html && (
              <div className="flex gap-2">
                <button onClick={openNew} className="glass inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs hover:bg-white/10">
                  <ExternalLink className="h-3.5 w-3.5" /> Open
                </button>
                <button onClick={download} className="glass inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs hover:bg-white/10">
                  <Download className="h-3.5 w-3.5" /> Export .html
                </button>
              </div>
            )}
          </div>
          <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white">
            {html ? (
              <iframe title="Portfolio preview" srcDoc={html} sandbox="allow-same-origin" className="h-[560px] w-full" />
            ) : (
              <div className="p-6 text-sm text-black/70">Your generated site will appear here.</div>
            )}
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
