import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth, supabaseForUser } from "./_shared";

export default defineTool({
  name: "list_recent_items",
  title: "List recent study items",
  description: "List the signed-in user's recent study items (notes, summaries, MCQs, quizzes, translations, grammar checks).",
  inputSchema: {
    kind: z.enum(["summary", "notes", "mcq", "quiz", "translation", "grammar", "resume", "portfolio"]).optional(),
    limit: z.number().int().min(1).max(100).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ kind, limit }, ctx) => {
    requireAuth(ctx);
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("study_items")
      .select("id, kind, title, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (kind) q = q.eq("kind", kind);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const items = data ?? [];
    const text = items.length
      ? items.map((i) => `- [${i.kind}] ${i.title} (${new Date(i.created_at).toLocaleString()})`).join("\n")
      : "No items yet.";
    return { content: [{ type: "text", text }], structuredContent: { items } };
  },
});
