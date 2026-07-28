import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callLovableAI, enforceDailyLimitViaUser, logUsage, requireAuth, saveStudyItem } from "./_shared";

export default defineTool({
  name: "generate_mcq",
  title: "Generate multiple-choice questions",
  description: "Create MCQs from source content at a chosen difficulty and save them to history.",
  inputSchema: {
    input: z.string().min(1).max(60000).describe("Source content."),
    count: z.number().int().min(1).max(30).default(10).describe("How many questions."),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
    title: z.string().max(120).optional(),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async ({ input, count, difficulty, title }, ctx) => {
    requireAuth(ctx);
    await enforceDailyLimitViaUser(ctx);
    const sys = `Create exactly ${count} multiple-choice questions (difficulty: ${difficulty}) from the given content. Return Markdown formatted like:\n\n**1. Question**\n- A) option\n- B) option\n- C) option\n- D) option\n\n**Answer:** B — brief explanation.\n\nEnsure exactly one correct answer per question.`;
    const output = await callLovableAI([
      { role: "system", content: sys },
      { role: "user", content: input },
    ]);
    const saved = await saveStudyItem(ctx, {
      kind: "mcq",
      title: title || `MCQ · ${new Date().toLocaleString()}`,
      source_text: input,
      output,
      metadata: { count, difficulty },
    });
    await logUsage(ctx, "mcq", { count, difficulty });
    return { content: [{ type: "text", text: output }], structuredContent: { id: saved.id, output } };
  },
});
