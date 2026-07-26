import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const listPlans = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id, name, price_usd, interval, daily_credits, features, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return { plans: data ?? [] };
});

export const getPaymentSettings = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase
    .from("payment_settings")
    .select("account_name, account_number, contact_number, support_email, methods, instructions")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { settings: data };
});

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_subscriptions")
      .select("id, plan_id, status, started_at, expires_at")
      .eq("user_id", context.userId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    let planId = data?.plan_id ?? "free";
    if (data?.expires_at && new Date(data.expires_at).getTime() < Date.now()) planId = "free";
    const { data: plan } = await context.supabase
      .from("subscription_plans")
      .select("id, name, price_usd, interval, daily_credits, features")
      .eq("id", planId)
      .maybeSingle();
    return { subscription: data, plan };
  });

export const submitPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        planId: z.enum(["pro_monthly", "pro_yearly"]),
        method: z.string().min(1).max(40),
        senderName: z.string().min(2).max(120),
        senderNumber: z.string().min(6).max(40),
        amountUsd: z.number().positive().max(1000),
        screenshotPath: z.string().min(1).max(500).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("payment_requests")
      .insert({
        user_id: context.userId,
        plan_id: data.planId,
        method: data.method,
        sender_name: data.senderName,
        sender_number: data.senderNumber,
        amount_usd: data.amountUsd,
        screenshot_path: data.screenshotPath ?? null,
      })
      .select("id, status, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { request: row };
  });

export const listMyPaymentRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("payment_requests")
      .select("id, plan_id, method, sender_name, sender_number, amount_usd, status, admin_notes, screenshot_path, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { requests: data ?? [] };
  });

export const signedScreenshotUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ path: z.string().min(1) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("payment-screenshots")
      .createSignedUrl(data.path, 60 * 60);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        name: z.string().min(2).max(120),
        email: z.string().email(),
        subject: z.string().min(2).max(200),
        message: z.string().min(5).max(4000),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error } = await supabase.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
