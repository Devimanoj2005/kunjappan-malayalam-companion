import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, Square, Settings as SettingsIcon, AlertCircle, Phone, MapPin, Stethoscope, Pill, Home as HomeIcon, Volume2, Heart, Loader2 } from "lucide-react";
import { Toaster, toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/storage";
import { useKunjappanVoice } from "@/hooks/use-kunjappan-voice";
import { callFamily, shareLocationWithFamily, triggerEmergencyAlert } from "@/lib/emergency";
import { cn } from "@/lib/utils";
import ammaPortrait from "@/assets/amma-portrait.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ammammakku Oru Koottu — കുഞ്ഞപ്പൻ" },
      { name: "description", content: "A loving Malayalam-first voice companion for elderly parents — chat, medicine reminders, medical reports, and emergency alerts." },
      { property: "og:title", content: "Ammammakku Oru Koottu — കുഞ്ഞപ്പൻ" },
      { property: "og:description", content: "A loving Malayalam-first voice companion for elderly parents." },
    ],
  }),
  component: Index,
});

function Index() {
  const store = useStore();
  const { status, recording, toggle, replay } = useKunjappanVoice({
    onEmergency: (reason) => triggerEmergencyAlert(reason),
  });

  const lastAssistant = [...store.messages].reverse().find((m) => m.role === "assistant");
  const greeting = lastAssistant?.content
    ?? (store.profile.name ? `Hello ${store.profile.name},\nHow are you feeling today?` : "Hello Amma,\nHow are you feeling today?");
  const pendingMeds = store.medicines.filter((m) => {
    const today = new Date().toISOString().slice(0, 10);
    return !m.log.find((l) => l.date === today && l.status === "taken");
  }).length;

  function onSOS() {
    toast.warning("SOS — കുടുംബത്തിന് അലേർട്ട് അയക്കുന്നു");
    triggerEmergencyAlert("SOS button pressed");
  }

  return (
    <div className="min-h-screen bg-gradient-cream">
      <Toaster position="top-center" richColors closeButton />

      <div className="max-w-6xl mx-auto px-5 md:px-8 py-5 md:py-8">
        <Header onSOS={onSOS} />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">
          {/* Left: portrait + status pills */}
          <div className="lg:col-span-5 space-y-4">
            <PortraitCard greeting={greeting} onReplay={() => lastAssistant && replay(lastAssistant.content)} status={status} />
            <div className="flex flex-wrap gap-2">
              <StatusPill color="success" label="Safe & Connected" />
              <StatusPill color="primary" label="Voice Assistant Active" />
            </div>
          </div>

          {/* Right: mic + actions + tiles */}
          <div className="lg:col-span-7 space-y-5">
            <TapToSpeak status={status} recording={recording} onToggle={toggle} />

            <section>
              <h2 className="text-sm font-medium text-primary/70 px-1 mb-3">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <QuickAction
                  variant="emergency"
                  icon={AlertCircle}
                  label="I Need Help"
                  onClick={onSOS}
                />
                <QuickAction
                  variant="peach"
                  icon={Phone}
                  label={store.profile.familyName ? `Call ${store.profile.familyName}` : "Call Family"}
                  onClick={callFamily}
                />
                <QuickAction
                  variant="peach"
                  icon={MapPin}
                  label="Share My Location"
                  onClick={shareLocationWithFamily}
                />
                <QuickAction
                  variant="sage"
                  icon={Stethoscope}
                  label="Report Analysis"
                  to="/reports"
                />
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SummaryTile
                to="/medicines"
                icon={Pill}
                title="Medicines"
                subtitle={pendingMeds > 0 ? `${pendingMeds} pending reminders today` : "All done for today"}
              />
              <SummaryTile
                to="/settings"
                icon={HomeIcon}
                title="My Place"
                subtitle={store.profile.address ? `Safe at ${store.profile.address}` : "Add your address in Settings"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ onSOS }: { onSOS: () => void }) {
  return (
    <header className="flex items-center justify-between">
      <Link to="/settings" className="flex items-center gap-3 group">
        <div className="w-11 h-11 rounded-2xl bg-card border border-border flex items-center justify-center text-primary group-hover:bg-sage transition shadow-card">
          <SettingsIcon className="w-5 h-5" />
        </div>
        <h1 className="text-xl md:text-2xl font-display text-primary tracking-tight">
          Ammammakku Oru Koottu
        </h1>
      </Link>
      <button
        onClick={onSOS}
        className="inline-flex items-center gap-2 bg-emergency text-emergency-foreground px-5 py-2.5 rounded-full font-semibold shadow-soft hover:scale-[1.03] active:scale-95 transition"
      >
        <span className="text-lg leading-none">✻</span>
        <span className="text-sm tracking-wide">SOS</span>
      </button>
    </header>
  );
}

function PortraitCard({ greeting, onReplay, status }: { greeting: string; onReplay: () => void; status: string }) {
  return (
    <div className="relative rounded-[2rem] overflow-hidden bg-card shadow-soft border border-border aspect-[4/5] sm:aspect-[5/6] lg:aspect-[4/5]">
      <img
        src={ammaPortrait}
        alt="A loving grandmother by the window"
        width={896}
        height={1024}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/35 via-transparent to-transparent" />
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 220, damping: 24 }}
        className="absolute left-4 right-4 bottom-4 bg-card/95 backdrop-blur-md rounded-2xl px-5 py-4 shadow-card flex items-start gap-3 border border-border"
      >
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg leading-snug text-foreground whitespace-pre-line break-words">{greeting}</p>
        </div>
        <button
          onClick={onReplay}
          className={cn(
            "shrink-0 w-11 h-11 rounded-full bg-sage text-sage-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition",
            status === "speaking" && "animate-mic-glow",
          )}
          aria-label="Replay greeting"
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </motion.div>
    </div>
  );
}

function StatusPill({ color, label }: { color: "success" | "primary"; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-3.5 py-1.5 text-sm text-foreground shadow-card">
      <span className={cn(
        "w-2 h-2 rounded-full",
        color === "success" ? "bg-success" : "bg-primary",
      )} />
      {label}
    </span>
  );
}

function TapToSpeak({ status, recording, onToggle }: { status: string; recording: boolean; onToggle: () => void }) {
  const isBusy = status !== "idle";
  return (
    <button
      onClick={onToggle}
      disabled={isBusy && !recording}
      className="group w-full bg-card rounded-[2rem] border border-border shadow-soft px-6 py-10 md:py-12 text-center hover:bg-sage/40 transition disabled:opacity-90"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className={cn(
            "relative w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center text-primary-foreground transition-transform",
            recording
              ? "bg-emergency animate-pulse-ring scale-105"
              : "bg-primary shadow-mic group-hover:scale-105 animate-mic-glow",
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {recording ? (
              <motion.div key="stop" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
                <Square className="w-12 h-12 fill-current" />
              </motion.div>
            ) : status === "thinking" ? (
              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 className="w-12 h-12 animate-spin" />
              </motion.div>
            ) : status === "speaking" ? (
              <motion.div key="speak" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
                <Volume2 className="w-12 h-12" />
              </motion.div>
            ) : (
              <motion.div key="mic" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
                <Mic className="w-12 h-12" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="space-y-1">
          <div className="text-xl md:text-2xl font-display text-foreground">
            {status === "idle" && "Tap to Speak"}
            {status === "listening" && "Listening…"}
            {status === "thinking" && "Thinking…"}
            {status === "speaking" && "Speaking…"}
          </div>
          <div className="text-sm text-accent">
            Talk naturally in Malayalam to ask for anything
          </div>
        </div>
      </div>
    </button>
  );
}

type QuickActionVariant = "emergency" | "peach" | "sage";

function QuickAction({
  variant,
  icon: Icon,
  label,
  onClick,
  to,
}: {
  variant: QuickActionVariant;
  icon: typeof AlertCircle;
  label: string;
  onClick?: () => void;
  to?: string;
}) {
  const styles: Record<QuickActionVariant, string> = {
    emergency: "bg-emergency text-emergency-foreground hover:brightness-110",
    peach: "bg-peach text-peach-foreground hover:brightness-105",
    sage: "bg-sage text-sage-foreground hover:brightness-105",
  };
  const iconBg: Record<QuickActionVariant, string> = {
    emergency: "bg-emergency-foreground/15",
    peach: "bg-peach-foreground/15",
    sage: "bg-sage-foreground/15",
  };

  const inner = (
    <div className={cn("rounded-2xl p-4 h-full flex flex-col gap-3 shadow-card text-left transition active:scale-[0.98]", styles[variant])}>
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg[variant])}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-sm font-semibold leading-tight">{label}</span>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block h-full">
        {inner}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className="block h-full w-full">
      {inner}
    </button>
  );
}

function SummaryTile({ to, icon: Icon, title, subtitle }: { to: string; icon: typeof Pill; title: string; subtitle: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4 shadow-card hover:bg-sage/30 transition"
    >
      <div className="w-12 h-12 rounded-2xl bg-sage text-sage-foreground flex items-center justify-center shrink-0">
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <div className="font-display text-lg text-foreground leading-tight">{title}</div>
        <div className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</div>
      </div>
    </Link>
  );
}
