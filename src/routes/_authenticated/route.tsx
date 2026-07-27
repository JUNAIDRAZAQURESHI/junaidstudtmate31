import { createFileRoute, Outlet, redirect, Link, useRouter, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, MessageSquare, FileText, BookOpen, ListChecks, GraduationCap,
  Languages, History, Settings, User, LogOut, Menu, X,
  FileUser, Globe, SpellCheck, CreditCard, ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { amIAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: Sparkles },
  { to: "/chat", label: "AI Chat", icon: MessageSquare },
  { to: "/pdf", label: "PDF Summary", icon: FileText },
  { to: "/notes", label: "Notes", icon: BookOpen },
  { to: "/mcq", label: "MCQ Generator", icon: ListChecks },
  { to: "/quiz", label: "Quiz Generator", icon: GraduationCap },
  { to: "/translate", label: "Translation", icon: Languages },
  { to: "/resume", label: "Resume Builder", icon: FileUser },
  { to: "/portfolio", label: "Portfolio", icon: Globe },
  { to: "/grammar", label: "Grammar", icon: SpellCheck },
  { to: "/history", label: "History", icon: History },
  { to: "/payment", label: "Upgrade", icon: CreditCard },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AuthenticatedLayout() {
  const router = useRouter();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string>("");
  const fAdmin = useServerFn(amIAdmin);
  const { data: admin } = useQuery({ queryKey: ["am-admin"], queryFn: () => fAdmin() });
  const isAdmin = admin?.isAdmin ?? false;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="bg-aurora relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 grid-3d opacity-25" />

      {/* Mobile top bar */}
      <div className="relative z-30 flex items-center justify-between gap-2 px-4 py-3 md:hidden">
        <Link to="/dashboard" className="flex min-w-0 items-center gap-2">
          <div className="relative h-8 w-8 shrink-0"><div className="absolute inset-0 rounded-lg btn-glow" /><Sparkles className="absolute inset-0 m-auto h-4 w-4 text-white" /></div>
          <span className="truncate font-bold">StudyMate <span className="text-gradient">Pro</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setOpen(!open)} className="glass rounded-xl p-2" aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-72 transform p-4 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="glass-strong flex h-full flex-col rounded-3xl p-4">
            <Link to="/dashboard" className="mb-2 hidden items-center gap-2 px-2 md:flex">
              <div className="relative h-9 w-9 shrink-0"><div className="absolute inset-0 rounded-xl btn-glow" /><Sparkles className="absolute inset-0 m-auto h-5 w-5 text-white" /></div>
              <div className="min-w-0">
                <div className="truncate font-bold leading-tight">StudyMate <span className="text-gradient">Pro</span></div>
                <div className="text-[10px] text-muted-foreground">AI Learning Suite</div>
              </div>
            </Link>
            <div className="mb-4 hidden px-2 md:block">
              <span className="glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3 text-gradient" />
                Built by <span className="text-gradient font-semibold">Junaid Raza Qureshi</span>
              </span>
            </div>


            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
              {NAV.map((n) => {
                const active = location.pathname === n.to || location.pathname.startsWith(n.to + "/");
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      active ? "btn-glow font-semibold" : "hover:bg-white/5"
                    }`}
                  >
                    <n.icon className="h-4 w-4" />
                    {n.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link to="/admin" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${location.pathname.startsWith("/admin") ? "btn-glow font-semibold" : "hover:bg-white/5"}`}>
                  <ShieldCheck className="h-4 w-4" /> Admin
                </Link>
              )}
            </nav>


            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between gap-2 px-2">
                <div className="min-w-0">
                  <div className="truncate text-xs text-muted-foreground">Signed in as</div>
                  <div className="truncate text-sm font-medium">{email}</div>
                </div>
                <ThemeToggle className="hidden md:inline-flex" />
              </div>
              <button
                onClick={signOut}
                className="glass mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-destructive/20"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        </aside>

        {open && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setOpen(false)} />}

        <main className="min-w-0 flex-1 p-4 md:p-8">
          <Outlet />
          <Footer />
        </main>
      </div>
    </div>
  );
}
