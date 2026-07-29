import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callLovableAI, enforceDailyLimitViaUser, logUsage, requireAuth, saveStudyItem } from "./_shared";

export default defineTool({
  name: "generate_notes",
  title: "Generate study notes",
  description: "Turn raw source text into well-structured Markdown study notes and save them to the user's history.",
  inputSchema: {
    input: z.string().min(1).max(60000).describe("Source content to convert into notes."),
    title: z.string().max(120).optional().describe("Optional title for the saved item."),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async ({ input, title }, ctx) => {
    requireAuth(ctx);
    await enforceDailyLimitViaUser(ctx);
    const output = await callLovableAI([
      { role: "system", content: "You are an expert note-taker. Generate detailed study notes in Markdown with headings, bullets, and **bold** key terms. Include examples where helpful." },
      { role: "user", content: input },
    ]);
    const saved = await saveStudyItem(ctx, {
      kind: "notes",
      title: title || `Notes · ${new Date().toLocaleString()}`,
      source_text: input,
      output,
    });
    await logUsage(ctx, "notes");
    return {
      content: [{ type: "text", text: output }],
      structuredContent: { id: saved.id, output },
    };
  },
});
