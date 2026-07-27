import { BackBar } from "@/components/BackBar";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Moon, Sun, Loader2 } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { updateSettings } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const updFn = useServerFn(updateSettings);
  const save = useMutation({
    mutationFn: (t: "dark" | "light") => updFn({ data: { theme: t } }),
    onSuccess: () => toast.success("Preferences saved"),
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="glass-strong rounded-3xl p-8 pop-in">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Personalize your experience.</p>
      </div>

      <div className="glass rounded-3xl p-6">
        <h2 className="mb-3 text-lg font-semibold">Appearance</h2>
        <div className="flex gap-3">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTheme(t); save.mutate(t); }}
              className={`glass inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm ${theme === t ? "btn-glow" : ""}`}
            >
              {t === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {t === "dark" ? "Dark" : "Light"}
              {save.isPending && theme === t && <Loader2 className="h-4 w-4 animate-spin" />}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-3xl p-6">
        <h2 className="mb-1 text-lg font-semibold">About</h2>
        <p className="text-sm text-muted-foreground">
          AI StudyMate Pro is powered by real Gemini AI models. All your data is stored securely with row-level security.
        </p>
      </div>
    </div>
  );
}
