import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Rocket, Shield, Brain, Users, Award } from "lucide-react";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — AI StudyMate Pro" },
      { name: "description", content: "AI StudyMate Pro is the all-in-one AI learning workspace: chat, PDF summaries, notes, quizzes, resume builder, portfolio generator and more." },
      { property: "og:title", content: "About AI StudyMate Pro" },
      { property: "og:description", content: "Built to make learning faster and more personal with AI." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="bg-aurora relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-3d opacity-30" />
      <PublicNav />

      <section className="relative z-10 mx-auto max-w-5xl px-6 py-16 text-center">
        <div className="glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5" /> Our mission
        </div>
        <h1 className="text-5xl font-bold sm:text-6xl">
          Learning, <span className="text-gradient">reimagined</span> with AI
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          AI StudyMate Pro brings every study tool a student needs into one premium
          workspace — powered by real Gemini AI, secured by Supabase, designed to feel
          effortless on every device.
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { icon: Brain, title: "Built for depth", desc: "Every tool goes beyond a demo — real analysis, real memory, real outputs you can download." },
            { icon: Shield, title: "Privacy first", desc: "Row-level security on every table. Your work stays yours, isolated by default." },
            { icon: Rocket, title: "Startup-grade UX", desc: "Fluid animations, glass surfaces, and 3D depth that make studying feel like magic." },
            { icon: Users, title: "For every learner", desc: "Students, jobseekers, and creators — from resumes to research summaries." },
            { icon: Award, title: "Made in Pakistan", desc: "Crafted with care by Junaid Raza Qureshi and shipped to the world." },
            { icon: Sparkles, title: "Always improving", desc: "New AI tools ship monthly — voice, vision, and beyond." },
          ].map((c) => (
            <div key={c.title} className="glass rounded-3xl p-6">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl btn-glow">
                <c.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold">{c.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24 text-center">
        <div className="glass-strong rounded-3xl p-10">
          <h2 className="text-3xl font-bold">Ready to try it?</h2>
          <p className="mt-2 text-muted-foreground">Free forever core plan. No card required.</p>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="btn-glow mt-6 inline-flex items-center gap-2 rounded-2xl px-7 py-3 text-sm font-semibold hover:btn-glow-hover"
          >
            Create your account
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
