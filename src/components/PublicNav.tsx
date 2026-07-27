import { Link } from "@tanstack/react-router";
import { Sparkles, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

export function useAuthed() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
  }, []);
  return authed;
}

export function BrandBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`glass hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:inline-flex ${className}`}
      title="Built by Junaid Raza Qureshi"
    >
      <Sparkles className="h-3 w-3 text-gradient" />
      Built by <span className="text-gradient font-semibold">Junaid Raza Qureshi</span>
    </span>
  );
}

export function PublicNav() {
  const authed = useAuthed();
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-20 mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <div className="relative h-9 w-9 shrink-0">
            <div className="absolute inset-0 rounded-xl btn-glow" />
            <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-white" />
          </div>
          <span className="truncate text-base font-bold sm:text-lg">
            AI StudyMate <span className="text-gradient">Pro</span>
          </span>
          <BrandBadge className="ml-2" />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link to="/about" className="hover:text-foreground">About</Link>
          <Link to="/contact" className="hover:text-foreground">Contact</Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {authed ? (
            <Link to="/dashboard" className="btn-glow rounded-xl px-3 py-2 text-xs font-medium hover:btn-glow-hover sm:px-4 sm:text-sm">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/auth" className="glass hidden rounded-xl px-4 py-2 text-sm sm:inline-flex">Sign in</Link>
              <Link to="/auth" search={{ mode: "signup" }} className="btn-glow rounded-xl px-3 py-2 text-xs font-medium hover:btn-glow-hover sm:px-4 sm:text-sm">
                Get started
              </Link>
            </>
          )}
          <button
            className="glass rounded-xl p-2 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="glass mt-3 flex flex-col gap-1 rounded-2xl p-2 text-sm lg:hidden">
          <Link to="/" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-white/10">Home</Link>
          <Link to="/pricing" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-white/10">Pricing</Link>
          <Link to="/about" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-white/10">About</Link>
          <Link to="/contact" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-white/10">Contact</Link>
          {!authed && (
            <Link to="/auth" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-white/10">Sign in</Link>
          )}
        </nav>
      )}
    </header>
  );
}
