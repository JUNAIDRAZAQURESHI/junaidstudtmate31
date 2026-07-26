import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
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

export function PublicNav() {
  const authed = useAuthed();
  return (
    <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
      <Link to="/" className="flex items-center gap-2">
        <div className="relative h-9 w-9">
          <div className="absolute inset-0 rounded-xl btn-glow" />
          <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold">
          AI StudyMate <span className="text-gradient">Pro</span>
        </span>
      </Link>
      <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
        <Link to="/about" className="hover:text-foreground">About</Link>
        <Link to="/contact" className="hover:text-foreground">Contact</Link>
      </nav>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {authed ? (
          <Link to="/dashboard" className="btn-glow rounded-xl px-4 py-2 text-sm font-medium hover:btn-glow-hover">
            Dashboard
          </Link>
        ) : (
          <>
            <Link to="/auth" className="glass rounded-xl px-4 py-2 text-sm">Sign in</Link>
            <Link to="/auth" search={{ mode: "signup" }} className="btn-glow rounded-xl px-4 py-2 text-sm font-medium hover:btn-glow-hover">
              Get started
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
