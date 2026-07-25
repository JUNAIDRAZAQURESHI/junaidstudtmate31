import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callLovableAI, type ChatMessage } from "./ai.server";
import { z } from "zod";

const GenSchema = z.object({
  kind: z.enum(["summary", "notes", "mcq", "quiz", "translation"]),
  input: z.string().min(1).max(60000),
  options: z
    .object({
      count: z.number().int().min(1).max(30).optional(),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      language: z.string().optional(),
      title: z.string().optional(),
    })
    .optional(),
  save: z.boolean().optional(),
  documentId: z.string().uuid().optional(),
});

function systemFor(kind: string, opts: Record<string, unknown> = {}) {
  const count = (opts.count as number) ?? 10;
  const difficulty = (opts.difficulty as string) ?? "medium";
  const language = (opts.language as string) ?? "English";
  switch (kind) {
    case "summary":
      return "You are an expert study assistant. Produce a clear, structured summary in Markdown with sections: **Overview**, **Key Points** (bulleted), **Important Terms**, **Takeaways**. Be precise and comprehensive.";
    case "notes":
      return "You are an expert note-taker. Generate detailed study notes in Markdown with headings, bullet points, and highlighted key terms in **bold**. Include examples where useful.";
    case "mcq":
      return `Create exactly ${count} multiple-choice questions (difficulty: ${difficulty}) from the given content. Return Markdown formatted like:\n\n**1. Question**\n- A) option\n- B) option\n- C) option\n- D) option\n\n**Answer:** B — brief explanation.\n\nEnsure exactly one correct answer per question.`;
    case "quiz":
      return `Create a comprehensive quiz with ${count} mixed questions (short answer, true/false, and fill-in-the-blank) at ${difficulty} difficulty. Format in Markdown. Include an **Answer Key** section at the end.`;
    case "translation":
      return `You are a professional translator. Translate the provided text into ${language} accurately, preserving meaning, tone, and formatting. Return only the translation in Markdown.`;
    default:
      return "You are a helpful assistant.";
  }
}

export const generateStudyItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => GenSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const messages: ChatMessage[] = [
      { role: "system", content: systemFor(data.kind, data.options ?? {}) },
      { role: "user", content: data.input },
    ];
    const output = await callLovableAI(messages);

    if (data.save) {
      const title =
        data.options?.title?.slice(0, 120) ||
        `${data.kind.toUpperCase()} · ${new Date().toLocaleString()}`;
      const { error } = await context.supabase.from("study_items").insert({
        user_id: context.userId,
        kind: data.kind,
        title,
        source_text: data.input.slice(0, 20000),
        output,
        metadata: (data.options ?? {}) as Record<string, unknown>,
        document_id: data.documentId ?? null,
      });
      if (error) throw new Error(error.message);
    }

    return { output };
  });

export const listStudyItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("study_items")
      .select("id, kind, title, output, metadata, created_at, document_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const deleteStudyItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("study_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
