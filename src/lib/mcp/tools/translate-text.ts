import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callLovableAI, enforceDailyLimitViaUser, logUsage, requireAuth, saveStudyItem } from "./_shared";

export default defineTool({
  name: "translate_text",
  title: "Translate text",
  description: "Translate text into a target language, preserving meaning and formatting. Saves the result to history.",
  inputSchema: {
    input: z.string().min(1).max(60000).describe("Text to translate."),
    language: z.string().min(2).max(60).describe("Target language, e.g. 'Spanish', 'Urdu'."),
    title: z.string().max(120).optional(),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async ({ input, language, title }, ctx) => {
    requireAuth(ctx);
    await enforceDailyLimitViaUser(ctx);
    const output = await callLovableAI([
      { role: "system", content: `You are a professional translator. Translate the provided text into ${language} accurately, preserving meaning, tone, and formatting. Return only the translation in Markdown.` },
      { role: "user", content: input },
    ]);
    const saved = await saveStudyItem(ctx, {
      kind: "translation",
      title: title || `Translation → ${language}`,
      source_text: input,
      output,
      metadata: { language },
    });
    await logUsage(ctx, "translation", { language });
    return { content: [{ type: "text", text: output }], structuredContent: { id: saved.id, output } };
  },
});
