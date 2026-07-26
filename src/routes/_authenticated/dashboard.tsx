import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  MessageSquare, FileText, BookOpen, ListChecks, GraduationCap, Languages,
  ArrowRight, Sparkles, Zap, FileUser, Globe, SpellCheck, TrendingUp,
} from "lucide-react";
import { getMyUsageSummary } from "@/lib/usage.functions";
import { getMySubscription } from "@/lib/billing.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const TOOLS = [
  { to: "/chat", title: "AI Chat", desc: "Talk with your Gemini-powered tutor.", icon: MessageSquare },
  { to: "/pdf", title: "PDF Summary", desc: "Upload a PDF and summarize it.", icon: FileText },
  { to: "/notes", title: "Notes Generator", desc: "Turn any topic into clean notes.", icon: BookOpen },
  { to: "/mcq", title: "MCQ Generator", desc: "Generate multiple-choice questions.", icon: ListChecks },
  { to: "/quiz", title: "Quiz Generator", desc: "Build a full mixed quiz.", icon: GraduationCap },
  { to: "/translate", title: "Translation", desc: "Translate text into any language.", icon: Languages },
  { to: "/resume", title: "Resume Builder", desc: "ATS-friendly resume in seconds.", icon: FileUser },
  { to: "/portfolio", title: "Portfolio Site", desc: "Generate a live portfolio site.", icon: Globe },
  { to: "/grammar", title: "Grammar Checker", desc: "Polish your writing.", icon: SpellCheck },
] as const;

function Dashboard() {
  const fUsage = useServerFn(getMyUsageSummary);
  const fSub = useServerFn(getMySubscription);
  const { data: usage } = useQuery({ queryKey: ["usage-summary"], queryFn: () => fUsage() });
  const { data: sub } = useQuery({ queryKey: ["my-sub"], queryFn: () => fSub() });

  const t = usage?.totals ?? {};
  const stats = [
    { label: "Total Chats", value: t.chat ?? 0, icon: MessageSquare },
    { label: "PDFs Summarized", value: t.pdf_summary ?? 0, icon: FileText },
    { label: "Notes Generated", value: t.notes ?? 0, icon: BookOpen },
    { label: "MCQs Created", value: t.mcq ?? 0, icon: ListChecks },
    { label: "Resumes Built", value: t.resume ?? 0, icon: FileUser },
    { label: "Portfolios Built", value: t.portfolio ?? 0, icon: Globe },
  ];

  const planName = sub?.plan?.name ?? "Free";
  const isFree = (sub?.plan?.id ?? "free") === "free";
  const remaining = usage?.remaining ?? 0;
  const limit = usage?.plan?.daily_credits ?? 10;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="glass-strong rounded-3xl p-6 md:p-8 pop-in">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back 👋</p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
              Your <span className="text-gradient">AI workspace</span>
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Plan: <span className="font-semibold text-foreground">{planName}</span> ·{" "}
              <span className="font-semibold text-foreground">{remaining}</span> / {limit} credits left today
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/chat" className="btn-glow inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold hover:btn-glow-hover">
              Start new chat <ArrowRight className="h-4 w-4" />
            </Link>
            {isFree && (
              <Link to="/payment" className="glass inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold hover:bg-white/10">
                <Zap className="h-4 w-4 text-primary" /> Upgrade to Pro
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <s.icon className="h-3.5 w-3.5" /> {s.label}
            </div>
            <div className="mt-1 text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Usage progress */}
      <div className="glass-strong mt-6 rounded-3xl p-6">
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="font-semibold">Today's usage</span>
          <span className="text-muted-foreground">· {usage?.todayUsed ?? 0} / {limit}</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full btn-glow transition-all" style={{ width: `${Math.min(100, ((usage?.todayUsed ?? 0) / Math.max(1, limit)) * 100)}%` }} />
        </div>
        {isFree && (
          <p className="mt-3 text-xs text-muted-foreground">
            Need more? <Link to="/payment" className="text-primary hover:underline">Upgrade to Pro</Link> for 500 credits/day.
          </p>
        )}
      </div>

      {/* Tools */}
      <div className="mt-6 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold">Your AI tools</h2>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <Link key={t.to} to={t.to} className="glass group rounded-3xl p-6 transition-transform hover:-translate-y-1">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl btn-glow">
              <t.icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold">{t.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm text-primary group-hover:gap-2 transition-all">
              Open <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
