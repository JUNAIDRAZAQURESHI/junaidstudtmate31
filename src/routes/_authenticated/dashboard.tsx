import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare, FileText, BookOpen, ListChecks, GraduationCap, Languages, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const TOOLS = [
  { to: "/chat", title: "AI Chat", desc: "Chat with your AI study companion.", icon: MessageSquare },
  { to: "/pdf", title: "PDF Summary", desc: "Upload a PDF and summarize it.", icon: FileText },
  { to: "/notes", title: "Notes Generator", desc: "Create clean study notes.", icon: BookOpen },
  { to: "/mcq", title: "MCQ Generator", desc: "Generate multiple-choice questions.", icon: ListChecks },
  { to: "/quiz", title: "Quiz Generator", desc: "Build a full mixed quiz.", icon: GraduationCap },
  { to: "/translate", title: "Translation", desc: "Translate text into any language.", icon: Languages },
] as const;

function Dashboard() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="glass-strong rounded-3xl p-8 pop-in">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back 👋</p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
              Your <span className="text-gradient">AI study workspace</span>
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Pick a tool below or jump into a chat. Every result is saved to your history.
            </p>
          </div>
          <Link to="/chat" className="btn-glow flex items-center gap-2 self-start rounded-2xl px-6 py-3 text-sm font-semibold hover:btn-glow-hover md:self-auto">
            Start new chat <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="glass group rounded-3xl p-6 transition-transform hover:-translate-y-1"
          >
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
