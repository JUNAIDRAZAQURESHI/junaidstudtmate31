import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Sparkles, Zap, Crown } from "lucide-react";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { listPlans } from "@/lib/billing.functions";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — AI StudyMate Pro" },
      { name: "description", content: "Simple, affordable pricing. Start free, upgrade to Pro for $1/month or $10/year." },
      { property: "og:title", content: "AI StudyMate Pro — Pricing" },
      { property: "og:description", content: "Free plan available. Pro for just $1/month." },
    ],
  }),
  component: PricingPage,
});

const PLAN_ICONS: Record<string, typeof Sparkles> = {
  free: Sparkles,
  pro_monthly: Zap,
  pro_yearly: Crown,
};

function PricingPage() {
  const fetchPlans = useServerFn(listPlans);
  const { data } = useQuery({ queryKey: ["plans"], queryFn: () => fetchPlans() });
  const plans = data?.plans ?? [];

  return (
    <div className="bg-aurora relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-3d opacity-30" />
      <PublicNav />

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-16 text-center">
        <h1 className="text-5xl font-bold sm:text-6xl">
          Simple, <span className="text-gradient">affordable</span> pricing
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Start free. Upgrade any time. Cancel any time.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((p) => {
            const Icon = PLAN_ICONS[p.id] ?? Sparkles;
            const highlight = p.id === "pro_yearly";
            const features = (p.features as string[] | null) ?? [];
            return (
              <div
                key={p.id}
                className={`glass-strong relative rounded-3xl p-8 text-left transition-transform hover:-translate-y-1 ${highlight ? "ring-2 ring-primary/60" : ""}`}
              >
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full btn-glow px-3 py-1 text-xs font-semibold">
                    Best value · Save 17%
                  </div>
                )}
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl btn-glow">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold">{p.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${Number(p.price_usd)}</span>
                  <span className="text-sm text-muted-foreground">/ {p.interval}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {p.daily_credits} AI credits / day
                </p>
                <ul className="mt-6 space-y-2 text-sm">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={p.id === "free" ? "/auth" : "/payment"}
                  search={p.id === "free" ? { mode: "signup" } : { plan: p.id }}
                  className={`mt-8 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold ${highlight ? "btn-glow hover:btn-glow-hover" : "glass hover:bg-white/10"}`}
                >
                  {p.id === "free" ? "Get started free" : `Upgrade — $${Number(p.price_usd)}`}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Payments accepted via EasyPaisa, JazzCash, and NayaPay. Instant activation after admin verification.
        </p>
      </section>

      <Footer />
    </div>
  );
}
