import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAuth, supabaseForUser } from "./_shared";

export default defineTool({
  name: "get_item",
  title: "Get a study item",
  description: "Fetch the full output of a saved study item by ID for the signed-in user.",
  inputSchema: { id: z.string().uuid() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    requireAuth(ctx);
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("study_items")
      .select("id, kind, title, output, metadata, created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { content: [{ type: "text", text: "Not found." }], isError: true };
    return {
      content: [{ type: "text", text: `# ${data.title}\n\n${data.output}` }],
      structuredContent: data,
    };
  },
});
