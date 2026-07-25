import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("conversations")
      .select("id, title, updated_at, created_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { conversations: data ?? [] };
  });

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ title: z.string().optional() }).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const { data: conv, error } = await context.supabase
      .from("conversations")
      .insert({ user_id: context.userId, title: data.title ?? "New chat" })
      .select("id, title, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { conversation: conv };
  });

export const renameConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid(), title: z.string().min(1).max(200) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("conversations")
      .update({ title: data.title })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("conversations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getConversationMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: msgs, error } = await context.supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", data.id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { messages: msgs ?? [] };
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        conversationId: z.string().uuid().nullable().optional(),
        content: z.string().min(1).max(20000),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    // Ensure conversation exists
    let convId = data.conversationId ?? null;
    let createdNew = false;
    if (!convId) {
      const { data: conv, error } = await context.supabase
        .from("conversations")
        .insert({ user_id: context.userId, title: data.content.slice(0, 60) })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      convId = conv.id;
      createdNew = true;
    }

    // Insert user message
    const { error: umErr } = await context.supabase.from("messages").insert({
      conversation_id: convId!,
      user_id: context.userId,
      role: "user",
      content: data.content,
    });
    if (umErr) throw new Error(umErr.message);

    // Fetch full history for memory
    const { data: history, error: hErr } = await context.supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", convId!)
      .order("created_at", { ascending: true });
    if (hErr) throw new Error(hErr.message);

    // Call AI
    const { callLovableAI } = await import("./ai.server");
    const messages = [
      {
        role: "system" as const,
        content:
          "You are StudyMate Pro, a helpful AI study assistant. Answer in clear, well-structured Markdown. Use headings, lists, and code blocks when helpful. Be concise but thorough.",
      },
      ...(history ?? []).map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];
    const answer = await callLovableAI(messages);

    // Insert assistant message
    const { error: amErr } = await context.supabase.from("messages").insert({
      conversation_id: convId!,
      user_id: context.userId,
      role: "assistant",
      content: answer,
    });
    if (amErr) throw new Error(amErr.message);

    // Touch conversation updated_at (auto title if new)
    await context.supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convId!);

    return { conversationId: convId!, answer, createdNew };
  });
