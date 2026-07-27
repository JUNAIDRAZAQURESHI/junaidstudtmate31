import { useRouter, useLocation, Link } from "@tanstack/react-router";
import { ArrowLeft, LayoutDashboard } from "lucide-react";

export function BackBar({ title }: { title?: string }) {
  const router = useRouter();
  const location = useLocation();
  // Hide on the dashboard itself (root of authed area)
  if (location.pathname === "/dashboard" || location.pathname === "/") return null;

  function goBack() {
    if (window.history.length > 1) router.history.back();
    else router.navigate({ to: "/dashboard" });
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <button
        onClick={goBack}
        className="glass inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/10"
        aria-label="Back"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      {title ? (
        <span className="truncate text-xs font-medium text-muted-foreground">{title}</span>
      ) : null}
      <Link
        to="/dashboard"
        className="glass inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/10"
      >
        <LayoutDashboard className="h-4 w-4" /> Dashboard
      </Link>
    </div>
  );
}
