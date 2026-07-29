import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callLovableAI, enforceDailyLimitViaUser, logUsage, requireAuth, saveStudyItem } from "./_shared";

export default defineTool({
  name: "check_grammar",
  title: "Check grammar",
  description: "Return a corrected version of the text plus a list of changes with brief explanations.",
  inputSchema: {
    text: z.string().min(1).max(20000).describe("Text to proofread."),
    language: z.string().max(60).optional().describe("Language hint, defaults to auto-detect."),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async ({ text, language }, ctx) => {
    requireAuth(ctx);
    await enforceDailyLimitViaUser(ctx);
    const output = await callLovableAI([
      { role: "system", content: "You are a professional editor. Return Markdown with two sections:\n\n### Corrected\nThe fully corrected text.\n\n### Changes\nA bulleted list of every change with a short explanation (grammar, punctuation, style, clarity). Preserve the original language unless a different target language is specified." },
      { role: "user", content: `Language: ${language ?? "auto-detect"}\n\nText:\n${text}` },
    ]);
    const saved = await saveStudyItem(ctx, {
      kind: "grammar",
      title: `Grammar check · ${new Date().toLocaleString()}`,
      source_text: text,
      output,
      metadata: { language: language ?? null },
    });
    await logUsage(ctx, "grammar");
    return { content: [{ type: "text", text: output }], structuredContent: { id: saved.id, output } };
  },
});
