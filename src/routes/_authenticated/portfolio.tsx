import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Globe, Loader2, Download, ExternalLink, Upload, X, Wand2 } from "lucide-react";
import { generatePortfolio } from "@/lib/tools.functions";
import { BackBar } from "@/components/BackBar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/portfolio")({
  component: PortfolioPage,
});

type Form = {
  fullName: string; role: string; tagline: string; about: string;
  skills: string; projects: string; email: string; socials: string; themeColor: string;
  designPrompt: string; profileImageUrl: string;
};
const EMPTY: Form = {
  fullName: "", role: "", tagline: "", about: "", skills: "", projects: "",
  email: "", socials: "", themeColor: "electric violet",
  designPrompt: "", profileImageUrl: "",
};

const DESIGN_PRESETS = [
  "Futuristic 3D Glassmorphism",
  "Apple-style Minimal",
  "Cyberpunk Neon",
  "Elegant Editorial",
  "Playful Gradient Bento",
  "Dark Terminal / Developer",
];

function PortfolioPage() {
  const gen = useServerFn(generatePortfolio);
  const [form, setForm] = useState<Form>(EMPTY);
  const [html, setHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  function set<K extends keyof Form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function onPickPhoto(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image too large (max 5 MB)."); return; }
    setUploading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");
      const ext = file.name.split(".").pop() || "png";
      const path = `${uid}/portfolio/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("documents")
        .createSignedUrl(path, 60 * 60 * 24 * 30); // 30 days
      if (sErr) throw sErr;
      set("profileImageUrl", signed.signedUrl);
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

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
      <BackBar title="Portfolio Generator" />
      <div className="glass-strong rounded-3xl p-6 pop-in">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl btn-glow"><Globe className="h-5 w-5 text-white" /></div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold sm:text-2xl">AI Portfolio Generator</h1>
            <p className="text-sm text-muted-foreground">Generate a single-file website you can export or host.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={onGen} className="glass-strong rounded-3xl p-4 sm:p-6 space-y-3">
          {/* Profile photo */}
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl glass">
              {form.profileImageUrl ? (
                <img src={form.profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No photo</div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)} />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="glass inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Uploading…" : "Upload profile photo"}
                </button>
                {form.profileImageUrl && (
                  <button type="button" onClick={() => set("profileImageUrl", "")}
                    className="glass inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs hover:bg-white/10">
                    <X className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Shown in the hero of your generated site (JPG/PNG, up to 5 MB).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Full name" value={form.fullName} onChange={(v) => set("fullName", v)} required minLength={2} />
            <Input label="Role" value={form.role} onChange={(v) => set("role", v)} required minLength={2} />
            <Input label="Tagline" value={form.tagline} onChange={(v) => set("tagline", v)} />
            <Input label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} required />
            <Input label="Socials (comma-separated URLs)" value={form.socials} onChange={(v) => set("socials", v)} />
            <Input label="Theme accent" value={form.themeColor} onChange={(v) => set("themeColor", v)} />
          </div>

          {/* Design prompt */}
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-gradient" />
              <span className="text-xs text-muted-foreground">Design direction (describe the style you want)</span>
            </div>
            <textarea
              value={form.designPrompt}
              onChange={(e) => set("designPrompt", e.target.value)}
              rows={3}
              placeholder="e.g., Futuristic 3D glassmorphism with floating cards, aurora gradients, subtle grain, Space Grotesk headings"
              className="glass w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/60"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {DESIGN_PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => set("designPrompt", p)}
                  className="glass rounded-full px-3 py-1 text-[11px] hover:bg-white/10">{p}</button>
              ))}
            </div>
          </div>

          <Area label="About you" value={form.about} onChange={(v) => set("about", v)} rows={4} required />
          <Area label="Skills" value={form.skills} onChange={(v) => set("skills", v)} rows={2} required />
          <Area label="Projects (title — description per line)" value={form.projects} onChange={(v) => set("projects", v)} rows={6} required />
          <button disabled={busy} className="btn-glow mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold hover:btn-glow-hover disabled:opacity-60 sm:w-auto">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            {busy ? "Generating…" : "Generate portfolio"}
          </button>
        </form>

        <div className="glass-strong rounded-3xl p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
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
              <iframe title="Portfolio preview" srcDoc={html} sandbox="allow-same-origin" className="h-[420px] w-full sm:h-[560px]" />
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
