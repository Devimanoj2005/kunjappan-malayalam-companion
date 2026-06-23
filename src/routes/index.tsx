import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircle, Pill, FileText, Settings } from "lucide-react";
import { Toaster } from "sonner";
import { VoiceChat } from "@/components/VoiceChat";
import { MedicineManager } from "@/components/MedicineManager";
import { ReportAnalyzer } from "@/components/ReportAnalyzer";
import { ProfileSettings } from "@/components/ProfileSettings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "കുഞ്ഞപ്പൻ — Kunjappan" },
      { name: "description", content: "Malayalam-first AI companion for elderly care: voice chat, medicine reminders, and medical report analysis." },
      { property: "og:title", content: "കുഞ്ഞപ്പൻ — Kunjappan" },
      { property: "og:description", content: "Malayalam-first AI companion for elderly care." },
    ],
  }),
  component: Index,
});

type Tab = "talk" | "meds" | "reports" | "settings";

const TABS: { id: Tab; label: string; icon: typeof MessageCircle }[] = [
  { id: "talk", label: "സംസാരം", icon: MessageCircle },
  { id: "meds", label: "മരുന്ന്", icon: Pill },
  { id: "reports", label: "റിപ്പോർട്ട്", icon: FileText },
  { id: "settings", label: "ക്രമീകരണം", icon: Settings },
];

function Index() {
  const [tab, setTab] = useState<Tab>("talk");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster position="top-center" richColors closeButton />

      <header className="border-b border-border bg-card/70 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-hero flex items-center justify-center text-primary-foreground font-display text-xl">
            കു
          </div>
          <div>
            <h1 className="text-xl font-display leading-none">കുഞ്ഞപ്പൻ</h1>
            <p className="text-xs text-muted-foreground mt-1">നിങ്ങളുടെ സ്നേഹം നിറഞ്ഞ കൂട്ടുകാരൻ</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto flex flex-col min-h-0">
        {tab === "talk" && <VoiceChat />}
        {tab === "meds" && <MedicineManager />}
        {tab === "reports" && <ReportAnalyzer />}
        {tab === "settings" && <ProfileSettings />}
      </main>

      <nav className="sticky bottom-0 border-t border-border bg-card/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto grid grid-cols-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-col items-center gap-1 py-3 transition",
                tab === id ? "text-accent" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("w-6 h-6 transition", tab === id && "scale-110")} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
