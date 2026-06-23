import { useEffect, useRef } from "react";
import { Mic, Square, Volume2, Heart, Loader2, Trash2 } from "lucide-react";
import { storage, useStore } from "@/lib/storage";
import { useKunjappanVoice } from "@/hooks/use-kunjappan-voice";
import { triggerEmergencyAlert } from "@/lib/emergency";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VoiceChat() {
  const store = useStore();
  const { status, recording, toggle, replay } = useKunjappanVoice({
    onEmergency: (reason) => triggerEmergencyAlert(reason),
  });
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [store.messages.length, status]);

  const busy = status !== "idle";

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {store.messages.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-sage shadow-soft">
              <Heart className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-3xl font-display text-foreground">നമസ്കാരം!</h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              ഞാൻ കുഞ്ഞപ്പൻ. താഴെയുള്ള മൈക്ക് അമർത്തി എന്നോട് സംസാരിക്കൂ.
            </p>
          </div>
        )}
        {store.messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-3xl px-5 py-3 text-lg leading-relaxed shadow-soft",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card text-card-foreground rounded-bl-md border border-border",
              )}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
              {m.role === "assistant" && (
                <button
                  onClick={() => replay(m.content)}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent transition"
                >
                  <Volume2 className="w-4 h-4" /> വീണ്ടും കേൾക്കാം
                </button>
              )}
            </div>
          </div>
        ))}
        {status === "thinking" && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-3xl rounded-bl-md px-5 py-3 shadow-soft">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border bg-card/60 backdrop-blur-sm px-6 py-6">
        <div className="flex items-center justify-center gap-6">
          {store.messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => storage.clearMessages()}
              className="text-muted-foreground"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          )}

          <button
            onClick={toggle}
            disabled={busy && !recording}
            className={cn(
              "relative w-24 h-24 rounded-full flex items-center justify-center transition-all text-primary-foreground disabled:opacity-60",
              recording
                ? "bg-emergency animate-pulse-ring"
                : "bg-primary shadow-mic hover:scale-105 active:scale-95",
            )}
          >
            {recording ? <Square className="w-10 h-10 fill-current" /> : <Mic className="w-10 h-10" />}
          </button>

          <div className="w-12">
            {status === "listening" && (
              <div className="flex items-end gap-1 h-8">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 bg-primary rounded-full bar-listening"
                    style={{ height: "100%", animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4 min-h-5">
          {status === "idle" && "സംസാരിക്കാൻ മൈക്ക് അമർത്തുക"}
          {status === "listening" && "കേൾക്കുന്നു..."}
          {status === "thinking" && "ആലോചിക്കുന്നു..."}
          {status === "speaking" && "സംസാരിക്കുന്നു..."}
        </p>
      </div>
    </div>
  );
}
