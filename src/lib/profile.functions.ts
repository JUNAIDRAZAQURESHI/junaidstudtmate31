import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, display_name, avatar_url, bio")
      .eq("id", context.userId)
      .maybeSingle();
    const { data: settings } = await context.supabase
      .from("user_settings")
      .select("theme, preferences")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { profile, settings, userId: context.userId };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        display_name: z.string().max(120).optional(),
        bio: z.string().max(500).optional(),
        avatar_url: z.string().url().optional().or(z.literal("")),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const payload: { display_name?: string; bio?: string; avatar_url?: string | null } = {};
    if (data.display_name !== undefined) payload.display_name = data.display_name;
    if (data.bio !== undefined) payload.bio = data.bio;
    if (data.avatar_url !== undefined) payload.avatar_url = data.avatar_url || null;
    const { error } = await context.supabase.from("profiles").update(payload).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        theme: z.enum(["dark", "light"]).optional(),
        preferences: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const payload: { theme?: "dark" | "light"; preferences?: import("@/integrations/supabase/types").Json; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };
    if (data.theme) payload.theme = data.theme;
    if (data.preferences) payload.preferences = JSON.parse(JSON.stringify(data.preferences));
    const { error } = await context.supabase
      .from("user_settings")
      .upsert({ user_id: context.userId, ...payload }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
