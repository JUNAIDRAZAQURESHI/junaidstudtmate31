import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function requireAuth(ctx: ToolContext) {
  if (!ctx.isAuthenticated()) {
    throw new Error("Not authenticated. Sign in to AI StudyMate Pro to use this tool.");
  }
}

export function supabaseForUser(ctx: ToolContext): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env not configured on the server.");
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function callLovableAI(messages: ChatMessage[], model = "google/gemini-3.6-flash"): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY on the server.");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, stream: false }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limit exceeded. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI request failed [${res.status}]: ${text}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function enforceDailyLimitViaUser(ctx: ToolContext): Promise<void> {
  const sb = supabaseForUser(ctx);
  const userId = ctx.getUserId();
  // Look up active plan
  const { data: sub } = await sb
    .from("user_subscriptions")
    .select("plan_id, status, current_period_end")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  let dailyLimit = 20;
  if (sub?.plan_id) {
    const { data: plan } = await sb
      .from("subscription_plans")
      .select("daily_limit")
      .eq("id", sub.plan_id)
      .maybeSingle();
    if (plan?.daily_limit != null) dailyLimit = plan.daily_limit;
  }
  if (dailyLimit <= 0) return; // unlimited
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await sb
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if ((count ?? 0) >= dailyLimit) {
    throw new Error(`Daily limit reached (${dailyLimit}/day). Upgrade to Pro for more.`);
  }
}

export async function logUsage(ctx: ToolContext, kind: string, metadata: Record<string, unknown> = {}) {
  const sb = supabaseForUser(ctx);
  await sb.from("usage_events").insert({ user_id: ctx.getUserId(), kind, metadata });
}

export async function saveStudyItem(
  ctx: ToolContext,
  row: { kind: string; title: string; source_text: string; output: string; metadata?: Record<string, unknown> },
) {
  const sb = supabaseForUser(ctx);
  const { data, error } = await sb
    .from("study_items")
    .insert({
      user_id: ctx.getUserId(),
      kind: row.kind,
      title: row.title.slice(0, 120),
      source_text: row.source_text.slice(0, 20000),
      output: row.output,
      metadata: row.metadata ?? {},
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
