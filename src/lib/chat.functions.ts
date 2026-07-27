import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { ChatMessage, ChatContentPart } from "./ai.server";

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

const SYSTEM_PROMPT =
  "You are StudyMate Pro, a helpful AI study assistant. Always detect the language of the user's latest message and reply in that same language. Format answers in clear Markdown with headings, lists, tables, and fenced code blocks (with language tags) when helpful. When an image is attached, analyze it carefully and answer about it. Be concise but thorough.";

function buildHistoryMessages(
  history: Array<{ role: string; content: string }>,
): ChatMessage[] {
  return history.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));
}

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        conversationId: z.string().uuid().nullable().optional(),
        content: z.string().min(1).max(20000),
        imageDataUrl: z.string().max(6_000_000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { enforceDailyLimit } = await import("./usage.functions");
    await enforceDailyLimit(context.supabase, context.userId);

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

    // Persist the user message (with a marker if an image was attached)
    const persistedText = data.imageDataUrl
      ? `${data.content}\n\n_[Image attached]_`
      : data.content;

    const { error: umErr } = await context.supabase.from("messages").insert({
      conversation_id: convId!,
      user_id: context.userId,
      role: "user",
      content: persistedText,
    });
    if (umErr) throw new Error(umErr.message);

    // Fetch prior history (excluding this new user message so we can attach the image inline)
    const { data: prior, error: hErr } = await context.supabase
      .from("messages")
      .select("role, content, created_at")
      .eq("conversation_id", convId!)
      .order("created_at", { ascending: true });
    if (hErr) throw new Error(hErr.message);

    const priorWithoutLast = (prior ?? []).slice(0, -1);
    const userTurn: ChatMessage = data.imageDataUrl
      ? {
          role: "user",
          content: [
            { type: "text", text: data.content },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ] as ChatContentPart[],
        }
      : { role: "user", content: data.content };

    const { callLovableAI } = await import("./ai.server");
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...buildHistoryMessages(priorWithoutLast),
      userTurn,
    ];
    const answer = await callLovableAI(messages);

    const { error: amErr } = await context.supabase.from("messages").insert({
      conversation_id: convId!,
      user_id: context.userId,
      role: "assistant",
      content: answer,
    });
    if (amErr) throw new Error(amErr.message);

    await context.supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convId!);

    await context.supabase.from("usage_events").insert({
      user_id: context.userId,
      kind: "chat",
      metadata: { conversationId: convId, hasImage: !!data.imageDataUrl },
    });

    return { conversationId: convId!, answer, createdNew };
  });

export const regenerateLastAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ conversationId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { enforceDailyLimit } = await import("./usage.functions");
    await enforceDailyLimit(context.supabase, context.userId);

    const { data: msgs, error } = await context.supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    if (!msgs || msgs.length === 0) throw new Error("No messages to regenerate.");

    // Remove trailing assistant message(s)
    const lastAssistants: string[] = [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "assistant") lastAssistants.push(msgs[i].id);
      else break;
    }
    if (lastAssistants.length > 0) {
      await context.supabase.from("messages").delete().in("id", lastAssistants);
    }

    const remaining = msgs.filter((m) => !lastAssistants.includes(m.id));
    const { callLovableAI } = await import("./ai.server");
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...buildHistoryMessages(remaining),
    ];
    const answer = await callLovableAI(messages);

    const { error: aErr } = await context.supabase.from("messages").insert({
      conversation_id: data.conversationId,
      user_id: context.userId,
      role: "assistant",
      content: answer,
    });
    if (aErr) throw new Error(aErr.message);

    await context.supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.conversationId);

    await context.supabase.from("usage_events").insert({
      user_id: context.userId,
      kind: "chat",
      metadata: { conversationId: data.conversationId, regenerated: true },
    });

    return { answer };
  });
