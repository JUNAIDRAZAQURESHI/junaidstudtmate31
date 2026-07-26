import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Phone, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { submitContactMessage } from "@/lib/billing.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — AI StudyMate Pro" },
      { name: "description", content: "Get in touch with the AI StudyMate Pro team for support, feedback, or partnerships." },
      { property: "og:title", content: "Contact AI StudyMate Pro" },
      { property: "og:description", content: "We reply within 24 hours." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const submit = useServerFn(submitContactMessage);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await submit({ data: form });
      toast.success("Message sent — we'll get back to you soon.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-aurora relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-3d opacity-30" />
      <PublicNav />

      <section className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-16 md:grid-cols-2">
        <div>
          <h1 className="text-5xl font-bold">
            Let's <span className="text-gradient">talk</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Questions, feedback, or partnership ideas — we'd love to hear from you.
          </p>
          <div className="mt-8 space-y-3 text-sm">
            <div className="glass flex items-center gap-3 rounded-2xl p-4">
              <Mail className="h-5 w-5 text-primary" />
              <a href="mailto:junaidrazaqureshi28@gmail.com" className="hover:underline">
                junaidrazaqureshi28@gmail.com
              </a>
            </div>
            <div className="glass flex items-center gap-3 rounded-2xl p-4">
              <Phone className="h-5 w-5 text-primary" />
              <a href="tel:+923114918835" className="hover:underline">+92 311 4918835</a>
            </div>
            <div className="glass flex items-center gap-3 rounded-2xl p-4">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span>Typical reply within 24 hours</span>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="glass-strong rounded-3xl p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              required minLength={2} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
              className="glass rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/60"
            />
            <input
              required type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              className="glass rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/60"
            />
          </div>
          <input
            required minLength={2} value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Subject"
            className="glass mt-3 w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/60"
          />
          <textarea
            required minLength={5} value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Your message"
            rows={6}
            className="glass mt-3 w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/60"
          />
          <button
            disabled={busy}
            className="btn-glow mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold hover:btn-glow-hover disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> {busy ? "Sending…" : "Send message"}
          </button>
        </form>
      </section>

      <Footer />
    </div>
  );
}
