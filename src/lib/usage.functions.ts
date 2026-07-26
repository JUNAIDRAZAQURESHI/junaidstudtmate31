import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const KINDS = [
  "chat",
  "pdf_summary",
  "notes",
  "mcq",
  "quiz",
  "translation",
  "resume",
  "portfolio",
  "grammar",
] as const;

export type UsageKind = (typeof KINDS)[number];

async function getActivePlanId(
  supabase: Awaited<ReturnType<typeof requireSupabaseAuth.server>>["context"]["supabase"],
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("user_subscriptions")
    .select("plan_id, status, expires_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return "free";
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return "free";
  return data.plan_id;
}

export const logUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ kind: z.enum(KINDS), metadata: z.record(z.string(), z.unknown()).optional() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await context.supabase.from("usage_events").insert({
      user_id: context.userId,
      kind: data.kind,
      metadata: JSON.parse(JSON.stringify(data.metadata ?? {})),
    });
    return { ok: true };
  });

/** Throws if the user has exhausted their daily free credits. Returns remaining count. */
export async function enforceDailyLimit(
  supabase: Awaited<ReturnType<typeof requireSupabaseAuth.server>>["context"]["supabase"],
  userId: string,
): Promise<{ used: number; limit: number; remaining: number; planId: string }> {
  const planId = await getActivePlanId(supabase, userId);
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("daily_credits")
    .eq("id", planId)
    .maybeSingle();
  const limit = plan?.daily_credits ?? 10;

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());
  const used = count ?? 0;
  if (used >= limit) {
    throw new Error(
      `Daily limit reached (${used}/${limit}). Upgrade to Pro for more credits.`,
    );
  }
  return { used, limit, remaining: Math.max(0, limit - used - 1), planId };
}

export const getMyUsageSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const planId = await getActivePlanId(context.supabase, context.userId);
    const { data: plan } = await context.supabase
      .from("subscription_plans")
      .select("id, name, daily_credits, price_usd, interval")
      .eq("id", planId)
      .maybeSingle();

    const since = new Date();
    since.setHours(0, 0, 0, 0);

    // All-time counts by kind
    const { data: allEvents } = await context.supabase
      .from("usage_events")
      .select("kind, created_at")
      .eq("user_id", context.userId)
      .limit(5000);
    const totals: Record<string, number> = {};
    const today: Record<string, number> = {};
    let todayCount = 0;
    for (const e of allEvents ?? []) {
      totals[e.kind] = (totals[e.kind] ?? 0) + 1;
      if (new Date(e.created_at as string).getTime() >= since.getTime()) {
        today[e.kind] = (today[e.kind] ?? 0) + 1;
        todayCount++;
      }
    }
    const dailyCredits = plan?.daily_credits ?? 10;
    return {
      plan: plan ?? { id: "free", name: "Free", daily_credits: 10, price_usd: 0, interval: "month" },
      totals,
      today,
      todayUsed: todayCount,
      remaining: Math.max(0, dailyCredits - todayCount),
    };
  });
