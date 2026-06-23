import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2, Heart, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { chatWithKunjappan, speakMalayalam, transcribeMalayalam } from "@/lib/kunjappan.functions";
import { isEmergency, storage, useStore, type ChatMessage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export function VoiceChat() {
  const store = useStore();
  const chat = useServerFn(chatWithKunjappan);
  const transcribe = useServerFn(transcribeMalayalam);
  const speak = useServerFn(speakMalayalam);

  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [partial, setPartial] = useState<string>("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [store.messages.length, status]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 1200) {
          toast.error("അല്പം നേരം കൂടി സംസാരിക്കൂ");
          setStatus("idle");
          return;
        }
        await handleAudio(blob);
      };
      rec.start();
      mediaRef.current = rec;
      setRecording(true);
      setStatus("listening");
    } catch (e) {
      console.error(e);
      toast.error("മൈക്ക് ഉപയോഗിക്കാൻ അനുമതി ആവശ്യമാണ്");
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    mediaRef.current = null;
    setRecording(false);
  }

  async function sendText(text: string) {
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text, ts: Date.now() };
    storage.addMessage(userMsg);

    if (isEmergency(text)) {
      triggerEmergencyAlert(text);
    }

    setStatus("thinking");
    try {
      const history = [...storage.get().messages].slice(-12).map((m) => ({ role: m.role, content: m.content }));
      const res = await chat({
        data: {
          messages: history,
          profile: {
            name: store.profile.name,
            familyName: store.profile.familyName,
            address: store.profile.address,
            memories: store.profile.memories,
          },
        },
      });
      const reply = res.text.trim();
      storage.addMessage({ id: crypto.randomUUID(), role: "assistant", content: reply, ts: Date.now() });
      learnMemoryFrom(text);

      setStatus("speaking");
      try {
        const tts = await speak({ data: { text: reply } });
        const audio = new Audio(`data:${tts.mimeType};base64,${tts.audioBase64}`);
        audioRef.current = audio;
        audio.onended = () => setStatus("idle");
        audio.onerror = () => setStatus("idle");
        await audio.play();
      } catch (e) {
        console.error(e);
        setStatus("idle");
      }
    } catch (e) {
      console.error(e);
      toast.error("ക്ഷമിക്കണം, ഒരു പ്രശ്നം ഉണ്ടായി");
      setStatus("idle");
    } finally {
      setPartial("");
    }
  }

  async function handleAudio(blob: Blob) {
    setStatus("thinking");
    try {
      const b64 = await blobToBase64(blob);
      const result = await transcribe({ data: { audioBase64: b64, mimeType: blob.type || "audio/webm" } });
      const text = (result.text ?? "").trim();
      if (!text) {
        toast.error("ശബ്ദം മനസ്സിലായില്ല");
        setStatus("idle");
        return;
      }
      setPartial(text);
      await sendText(text);
    } catch (e) {
      console.error(e);
      toast.error("ശബ്ദം മനസ്സിലാക്കാൻ കഴിഞ്ഞില്ല");
      setStatus("idle");
    }
  }

  function triggerEmergencyAlert(reason: string) {
    if (!navigator.geolocation) {
      sendSmsAlert(reason, null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => sendSmsAlert(reason, { lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => sendSmsAlert(reason, null),
      { timeout: 5000 },
    );
  }

  function sendSmsAlert(reason: string, loc: { lat: number; lng: number } | null) {
    const phone = store.profile.familyPhone?.trim();
    const name = store.profile.name || "നിങ്ങളുടെ കുടുംബാംഗം";
    const link = loc ? `https://maps.google.com/?q=${loc.lat},${loc.lng}` : "";
    const body = `അടിയന്തര അലേർട്ട്: ${name}ക്ക് സഹായം ആവശ്യമാണ്. കാരണം: "${reason}". ${link ? `സ്ഥാനം: ${link}` : ""}`;
    if (phone) {
      const sms = `sms:${phone}?body=${encodeURIComponent(body)}`;
      window.open(sms, "_blank");
      toast.warning("അടിയന്തര അലേർട്ട് കുടുംബത്തിന് അയക്കാം", { duration: 6000 });
    } else {
      toast.warning("അടിയന്തര വാക്കുകൾ കേട്ടു — കുടുംബ ഫോൺ ക്രമീകരണത്തിൽ ചേർക്കൂ", { duration: 6000 });
    }
  }

  function learnMemoryFrom(text: string) {
    // Naive: store sentences that look like declarative memory facts
    const patterns = [
      /എന്റെ\s+\S+(\s+\S+)?\s+(പേര്|നമ്പർ|വയസ്സ്)/,
    ];
    if (patterns.some((p) => p.test(text)) && text.length < 120) {
      storage.addMemory(text.trim());
    }
  }

  async function replay(text: string) {
    try {
      setStatus("speaking");
      const tts = await speak({ data: { text } });
      const audio = new Audio(`data:${tts.mimeType};base64,${tts.audioBase64}`);
      audio.onended = () => setStatus("idle");
      await audio.play();
    } catch {
      setStatus("idle");
    }
  }

  const busy = status !== "idle";

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {store.messages.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-warm shadow-soft">
              <Heart className="w-12 h-12 text-accent" />
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
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
            </div>
          </div>
        )}
        {partial && status === "thinking" && (
          <div className="flex justify-end opacity-60">
            <div className="bg-primary/70 text-primary-foreground rounded-3xl rounded-br-md px-5 py-3 text-lg">{partial}</div>
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
            onClick={recording ? stopRecording : startRecording}
            disabled={busy && !recording}
            className={cn(
              "relative w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-soft text-primary-foreground disabled:opacity-60",
              recording
                ? "bg-emergency animate-pulse-ring"
                : "bg-gradient-hero hover:scale-105 active:scale-95",
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
                    className="w-1.5 bg-accent rounded-full bar-listening"
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
        {!store.profile.familyPhone && (
          <p className="text-center text-xs text-warm-foreground mt-3 flex items-center justify-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            ക്രമീകരണത്തിൽ കുടുംബ ഫോൺ നമ്പർ ചേർക്കാൻ മറക്കരുത്
          </p>
        )}
      </div>
    </div>
  );
}
