import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callLovableAI } from "./ai.server";
import { enforceDailyLimit } from "./usage.functions";
import { z } from "zod";

const ResumeSchema = z.object({
  fullName: z.string().min(2).max(120),
  title: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(3).max(40),
  location: z.string().max(120).optional(),
  summary: z.string().max(2000).optional(),
  skills: z.string().max(2000),
  experience: z.string().max(6000),
  education: z.string().max(3000),
  projects: z.string().max(4000).optional(),
  targetRole: z.string().max(200).optional(),
});

export const generateResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ResumeSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await enforceDailyLimit(context.supabase, context.userId);
    const sys = `You are an expert ATS-friendly resume writer. Produce a polished, one-page resume in clean Markdown using only standard headings (# Name, then sections: Summary, Skills, Experience, Projects, Education, Certifications). Use strong action verbs, quantified achievements, and concise bullets. Avoid tables, emojis, and columns so it passes ATS parsers.`;
    const user = `Create an ATS-optimized resume for:

Name: ${data.fullName}
Title: ${data.title}
Email: ${data.email}
Phone: ${data.phone}
Location: ${data.location ?? ""}
Target role: ${data.targetRole ?? data.title}

Professional summary (raw): ${data.summary ?? "(generate one based on the info)"}
Skills: ${data.skills}
Experience: ${data.experience}
Projects: ${data.projects ?? ""}
Education: ${data.education}

Rewrite everything cleanly, quantify where possible, and produce the final Markdown resume only.`;
    const output = await callLovableAI([
      { role: "system", content: sys },
      { role: "user", content: user },
    ]);
    await context.supabase.from("usage_events").insert({ user_id: context.userId, kind: "resume" });
    await context.supabase.from("study_items").insert({
      user_id: context.userId,
      kind: "resume",
      title: `Resume · ${data.fullName}`,
      source_text: JSON.stringify(data).slice(0, 20000),
      output,
      metadata: { targetRole: data.targetRole ?? null },
    });
    return { output };
  });

const PortfolioSchema = z.object({
  fullName: z.string().min(2).max(120),
  role: z.string().min(2).max(120),
  tagline: z.string().max(300).optional(),
  about: z.string().min(5).max(3000),
  skills: z.string().max(2000),
  projects: z.string().max(6000),
  email: z.string().email(),
  socials: z.string().max(600).optional(),
  themeColor: z.string().max(30).optional(),
  designPrompt: z.string().max(1000).optional(),
  profileImageUrl: z.string().url().max(2000).optional().or(z.literal("")),
});

export const generatePortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => PortfolioSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await enforceDailyLimit(context.supabase, context.userId);
    const sys = `You are a senior frontend designer. Output ONE complete, self-contained HTML5 document with inline <style> only (no external CSS, no external JS). You MAY reference remote https image URLs supplied by the user (e.g. profile photo). Build a beautiful, modern, single-page portfolio: hero (with the profile photo when provided), about, skills grid, projects grid with cards, contact section, footer. Responsive, dark theme by default, glassmorphism accents, smooth CSS animations, semantic HTML, accessible. Follow the user's "Design direction" faithfully. Return ONLY the raw HTML, no Markdown fences, no explanation.`;
    const user = `Build a portfolio website for:
Name: ${data.fullName}
Role: ${data.role}
Tagline: ${data.tagline ?? ""}
About: ${data.about}
Skills: ${data.skills}
Projects: ${data.projects}
Email: ${data.email}
Socials: ${data.socials ?? ""}
Theme accent color hint: ${data.themeColor ?? "electric violet"}
Design direction: ${data.designPrompt || "Premium futuristic 3D glassmorphism with aurora gradients and floating cards"}
${data.profileImageUrl ? `Profile photo URL (use as circular hero avatar): ${data.profileImageUrl}` : "No profile photo provided — use a stylized SVG monogram avatar instead."}

Use the accent color in gradients and buttons. Include real anchor navigation. Make it look like a $10k designer site.`;
    let output = await callLovableAI([
      { role: "system", content: sys },
      { role: "user", content: user },
    ]);
    // Strip accidental code fences
    output = output.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();
    await context.supabase.from("usage_events").insert({ user_id: context.userId, kind: "portfolio" });
    await context.supabase.from("study_items").insert({
      user_id: context.userId,
      kind: "portfolio",
      title: `Portfolio · ${data.fullName}`,
      source_text: JSON.stringify(data).slice(0, 20000),
      output,
      metadata: { themeColor: data.themeColor ?? null, designPrompt: data.designPrompt ?? null, hasPhoto: !!data.profileImageUrl },
    });
    return { html: output };
  });


const GrammarSchema = z.object({
  text: z.string().min(1).max(20000),
  language: z.string().max(60).optional(),
});

export const checkGrammar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => GrammarSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await enforceDailyLimit(context.supabase, context.userId);
    const sys = `You are a professional editor. Return Markdown with two sections:\n\n### Corrected\nThe fully corrected text.\n\n### Changes\nA bulleted list of every change with a short explanation (grammar, punctuation, style, clarity). Preserve the original language unless a different target language is specified.`;
    const output = await callLovableAI([
      { role: "system", content: sys },
      { role: "user", content: `Language: ${data.language ?? "auto-detect"}\n\nText:\n${data.text}` },
    ]);
    await context.supabase.from("usage_events").insert({ user_id: context.userId, kind: "grammar" });
    await context.supabase.from("study_items").insert({
      user_id: context.userId,
      kind: "grammar",
      title: `Grammar check · ${new Date().toLocaleString()}`,
      source_text: data.text.slice(0, 20000),
      output,
      metadata: { language: data.language ?? null },
    });
    return { output };
  });
