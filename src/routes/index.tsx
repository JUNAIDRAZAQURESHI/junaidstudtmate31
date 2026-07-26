import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles, MessageSquare, FileText, ListChecks, Brain, Languages,
  ArrowRight, Zap, Shield, Cpu, BookOpen, FileUser, Globe, SpellCheck,
} from "lucide-react";
import { PublicNav, useAuthed } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI StudyMate Pro — Learn Smarter with AI" },
      { name: "description", content: "Chat with AI, summarize PDFs, generate notes, MCQs, quizzes, and translate — all in one futuristic study platform." },
      { property: "og:title", content: "AI StudyMate Pro" },
      { property: "og:description", content: "Your futuristic AI study companion." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: MessageSquare, title: "AI Chat", desc: "ChatGPT-style conversations with full memory and Markdown." },
  { icon: FileText, title: "PDF Summary", desc: "Upload PDFs and get instant, structured summaries." },
  { icon: BookOpen, title: "Notes Generator", desc: "Turn any topic into clean, exam-ready notes." },
  { icon: ListChecks, title: "MCQ & Quiz", desc: "Generate multiple-choice questions and full quizzes." },
  { icon: Languages, title: "Translation", desc: "Professional translation in dozens of languages." },
  { icon: FileUser, title: "Resume Builder", desc: "Craft ATS-friendly resumes ready to send." },
  { icon: Globe, title: "Portfolio Generator", desc: "Ship a live portfolio website in one click." },
  { icon: SpellCheck, title: "Grammar Checker", desc: "Polish your writing in any language." },
  { icon: Brain, title: "History + Memory", desc: "Every chat and item is saved & searchable." },
];

function Landing() {
  const authed = useAuthed();

  return (
    <div className="bg-aurora relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-3d opacity-40" />

      <PublicNav />

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-10 pb-24 text-center">
        <div className="glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium pop-in">
          <Zap className="h-3.5 w-3.5 text-gradient" />
          <span>Powered by Gemini · Real-time AI</span>
        </div>
        <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-tight sm:text-6xl md:text-7xl pop-in">
          Learn smarter with your <span className="text-gradient">AI Study Companion</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Chat, summarize PDFs, generate notes, MCQs, quizzes and translations —
          all in one premium AI workspace built for students.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to={authed ? "/dashboard" : "/auth"}
            search={authed ? undefined : { mode: "signup" }}
            className="btn-glow inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-base font-semibold hover:btn-glow-hover"
          >
            {authed ? "Open Dashboard" : "Start Learning Free"} <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#features" className="glass inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-base font-semibold">
            Explore features
          </a>
        </div>

        {/* 3D preview card */}
        <div className="relative mx-auto mt-20 max-w-5xl float">
          <div className="glass-strong rounded-3xl p-2">
            <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/0 p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400/70" />
                <span className="h-3 w-3 rounded-full bg-yellow-400/70" />
                <span className="h-3 w-3 rounded-full bg-green-400/70" />
                <span className="ml-3 text-xs text-muted-foreground">studymate.ai / chat</span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="glass rounded-2xl p-4 text-left">
                  <MessageSquare className="mb-2 h-5 w-5 text-gradient" />
                  <p className="text-sm font-medium">Explain photosynthesis</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Plants convert sunlight into chemical energy via chlorophyll…
                  </p>
                </div>
                <div className="glass rounded-2xl p-4 text-left">
                  <FileText className="mb-2 h-5 w-5 text-gradient" />
                  <p className="text-sm font-medium">Chapter 4 Summary</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Key concepts extracted from your uploaded PDF…
                  </p>
                </div>
                <div className="glass rounded-2xl p-4 text-left">
                  <ListChecks className="mb-2 h-5 w-5 text-gradient" />
                  <p className="text-sm font-medium">10 MCQs generated</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Difficulty: medium · Topic: cellular respiration
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -inset-10 -z-10 blur-3xl opacity-40 bg-gradient-to-r from-primary via-accent to-primary" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="mb-14 text-center">
          <h2 className="text-4xl font-bold">Everything you need to <span className="text-gradient">ace it</span></h2>
          <p className="mt-3 text-muted-foreground">Six premium tools. One unified workspace.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass rounded-3xl p-6 transition-transform hover:-translate-y-1">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl btn-glow">
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust row */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="glass-strong grid grid-cols-1 gap-6 rounded-3xl p-8 md:grid-cols-3">
          {[
            { icon: Cpu, title: "Real Gemini AI", desc: "Direct API calls, no mock data." },
            { icon: Shield, title: "Secure by default", desc: "Row-level security and encrypted storage." },
            { icon: Zap, title: "Streaming responses", desc: "Instant answers, always in sync." },
          ].map((s) => (
            <div key={s.title} className="flex items-start gap-4">
              <s.icon className="h-6 w-6 text-gradient" />
              <div>
                <p className="font-semibold">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24 text-center">
        <div className="glass-strong rounded-3xl p-12">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to <span className="text-gradient">supercharge</span> your studies?</h2>
          <p className="mt-3 text-muted-foreground">Join in seconds. Free forever core plan.</p>
          <Link
            to={authed ? "/dashboard" : "/auth"}
            search={authed ? undefined : { mode: "signup" }}
            className="btn-glow mt-8 inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-semibold hover:btn-glow-hover"
          >
            {authed ? "Open Dashboard" : "Create your account"} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
