import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callLovableAI, enforceDailyLimitViaUser, logUsage, requireAuth, saveStudyItem } from "./_shared";

export default defineTool({
  name: "generate_quiz",
  title: "Generate a mixed quiz",
  description: "Create a mixed-format quiz (short answer, true/false, fill-in-the-blank) with an answer key.",
  inputSchema: {
    input: z.string().min(1).max(60000),
    count: z.number().int().min(1).max(30).default(10),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
    title: z.string().max(120).optional(),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async ({ input, count, difficulty, title }, ctx) => {
    requireAuth(ctx);
    await enforceDailyLimitViaUser(ctx);
    const sys = `Create a comprehensive quiz with ${count} mixed questions (short answer, true/false, fill-in-the-blank) at ${difficulty} difficulty. Format in Markdown. Include an **Answer Key** section at the end.`;
    const output = await callLovableAI([
      { role: "system", content: sys },
      { role: "user", content: input },
    ]);
    const saved = await saveStudyItem(ctx, {
      kind: "quiz",
      title: title || `Quiz · ${new Date().toLocaleString()}`,
      source_text: input,
      output,
      metadata: { count, difficulty },
    });
    await logUsage(ctx, "quiz", { count, difficulty });
    return { content: [{ type: "text", text: output }], structuredContent: { id: saved.id, output } };
  },
});
