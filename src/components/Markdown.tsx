import ReactMarkdown from "react-markdown";
import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-chat text-sm leading-relaxed">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast.success("Copied to clipboard");
        } catch { toast.error("Copy failed"); }
      }}
      className="glass inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs hover:bg-white/10"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {label}
    </button>
  );
}

export function DownloadButton({ text, filename, label = "Download" }: { text: string; filename: string; label?: string }) {
  return (
    <button
      onClick={() => {
        const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      }}
      className="glass inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs hover:bg-white/10"
    >
      {label}
    </button>
  );
}
