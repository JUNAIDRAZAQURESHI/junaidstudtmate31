// Client-side text extraction helpers for PDF, TXT, and generic text-like files.
// DOCX best-effort: attempts to read text runs from XML if the file is a docx.

export async function extractPdfText(file: File, maxChars = 180000): Promise<string> {
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
  return parts.join("\n\n").slice(0, maxChars);
}

export async function extractDocxText(file: File, maxChars = 180000): Promise<string> {
  // Minimal DOCX text extraction: unzip via DecompressionStream, read word/document.xml
  // Falls back to raw text if the browser lacks DecompressionStream.
  try {
    const JSZipMod = await import(/* @vite-ignore */ "jszip").catch(() => null);
    if (JSZipMod) {
      const JSZip = (JSZipMod as { default: typeof import("jszip") }).default;
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const doc = zip.file("word/document.xml");
      if (!doc) return "";
      const xml = await doc.async("string");
      const text = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return text.slice(0, maxChars);
    }
  } catch { /* fall through */ }
  // Fallback: read as text (works OK for plain docs)
  return (await file.text()).slice(0, maxChars);
}

export async function extractAnyText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return extractPdfText(file);
  if (name.endsWith(".docx")) return extractDocxText(file);
  // txt, md, csv, json, log, code, etc.
  return (await file.text()).slice(0, 180000);
}
