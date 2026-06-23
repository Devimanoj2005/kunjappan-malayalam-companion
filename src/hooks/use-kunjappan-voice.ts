import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { chatWithKunjappan, speakMalayalam, transcribeMalayalam } from "@/lib/kunjappan.functions";
import { isEmergency, storage, type ChatMessage } from "@/lib/storage";

export type VoiceStatus = "idle" | "listening" | "thinking" | "speaking";

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

const EMERGENCY_KEYWORD_HINT = "സഹായം ആവശ്യമാണ്";

export function useKunjappanVoice(options?: { onEmergency?: (reason: string) => void }) {
  const chat = useServerFn(chatWithKunjappan);
  const transcribe = useServerFn(transcribeMalayalam);
  const speak = useServerFn(speakMalayalam);

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  function toggle() {
    if (recording) stopRecording();
    else void startRecording();
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
      await sendText(text);
    } catch (e) {
      console.error(e);
      toast.error("ശബ്ദം മനസ്സിലാക്കാൻ കഴിഞ്ഞില്ല");
      setStatus("idle");
    }
  }

  async function sendText(text: string) {
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text, ts: Date.now() };
    storage.addMessage(userMsg);

    if (isEmergency(text)) {
      options?.onEmergency?.(text || EMERGENCY_KEYWORD_HINT);
    }

    setStatus("thinking");
    try {
      const store = storage.get();
      const history = store.messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));
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
      } catch {
        setStatus("idle");
      }
    } catch (e) {
      console.error(e);
      toast.error("ക്ഷമിക്കണം, ഒരു പ്രശ്നം ഉണ്ടായി");
      setStatus("idle");
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

  return { status, recording, toggle, startRecording, stopRecording, replay, sendText };
}

function learnMemoryFrom(text: string) {
  if (/എന്റെ\s+\S+(\s+\S+)?\s+(പേര്|നമ്പർ|വയസ്സ്)/.test(text) && text.length < 120) {
    storage.addMemory(text.trim());
  }
}
