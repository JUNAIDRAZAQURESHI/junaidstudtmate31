import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

type SB = SupabaseClient<Database>;

async function assertAdmin(supabase: SB, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden — admin only.");
}

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: !!data };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("claim_first_admin");
    if (error) throw new Error(error.message);
    return { claimed: !!data };
  });

export const listPendingPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("payment_requests")
      .select("id, user_id, plan_id, method, sender_name, sender_number, amount_usd, status, admin_notes, screenshot_path, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { requests: data ?? [] };
  });

export const decidePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approve", "reject"]),
        notes: z.string().max(500).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: req, error: rErr } = await context.supabase
      .from("payment_requests")
      .select("id, user_id, plan_id, status")
      .eq("id", data.id)
      .single();
    if (rErr) throw new Error(rErr.message);
    if (req.status !== "pending") throw new Error("Already decided.");

    const newStatus = data.decision === "approve" ? "approved" : "rejected";
    const { error: uErr } = await context.supabase
      .from("payment_requests")
      .update({ status: newStatus, admin_notes: data.notes ?? null })
      .eq("id", data.id);
    if (uErr) throw new Error(uErr.message);

    if (data.decision === "approve") {
      const months = req.plan_id === "pro_yearly" ? 12 : 1;
      const expires = new Date();
      expires.setMonth(expires.getMonth() + months);
      // Expire prior active subs for this user
      await context.supabase
        .from("user_subscriptions")
        .update({ status: "cancelled" })
        .eq("user_id", req.user_id)
        .eq("status", "active");
      const { error: sErr } = await context.supabase.from("user_subscriptions").insert({
        user_id: req.user_id,
        plan_id: req.plan_id,
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: expires.toISOString(),
      });
      if (sErr) throw new Error(sErr.message);
    }
    return { ok: true };
  });

export const listContactMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("contact_messages")
      .select("id, name, email, subject, message, status, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { messages: data ?? [] };
  });
