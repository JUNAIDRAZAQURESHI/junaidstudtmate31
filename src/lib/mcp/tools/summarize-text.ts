import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callLovableAI, enforceDailyLimitViaUser, logUsage, requireAuth, saveStudyItem } from "./_shared";

export default defineTool({
  name: "summarize_text",
  title: "Summarize text",
  description: "Produce a structured Markdown summary (Overview, Key Points, Terms, Takeaways) and save it to history.",
  inputSchema: {
    input: z.string().min(1).max(60000).describe("Text to summarize."),
    title: z.string().max(120).optional(),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async ({ input, title }, ctx) => {
    requireAuth(ctx);
    await enforceDailyLimitViaUser(ctx);
    const output = await callLovableAI([
      { role: "system", content: "You are an expert study assistant. Produce a clear, structured summary in Markdown with sections: **Overview**, **Key Points** (bulleted), **Important Terms**, **Takeaways**." },
      { role: "user", content: input },
    ]);
    const saved = await saveStudyItem(ctx, {
      kind: "summary",
      title: title || `Summary · ${new Date().toLocaleString()}`,
      source_text: input,
      output,
    });
    await logUsage(ctx, "pdf_summary");
    return { content: [{ type: "text", text: output }], structuredContent: { id: saved.id, output } };
  },
});
