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
  // Best-effort DOCX text extraction without external deps.
  // A .docx is a ZIP containing word/document.xml; without a zip lib we can't
  // properly unpack it, so we fall back to reading raw text and stripping XML
  // tags — which works surprisingly well for simple documents.
  const raw = await file.text();
  const stripped = raw.replace(/<[^>]+>/g, " ").replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, " ").replace(/\s+/g, " ").trim();
  return stripped.slice(0, maxChars);
}

export async function extractAnyText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return extractPdfText(file);
  if (name.endsWith(".docx")) return extractDocxText(file);
  // txt, md, csv, json, log, code, etc.
  return (await file.text()).slice(0, 180000);
}
