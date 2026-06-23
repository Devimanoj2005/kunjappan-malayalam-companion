import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Upload, Volume2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { analyzeMedicalReport, speakMalayalam } from "@/lib/kunjappan.functions";
import { storage, useStore } from "@/lib/storage";
import { Button } from "@/components/ui/button";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function ReportAnalyzer() {
  const store = useStore();
  const analyze = useServerFn(analyzeMedicalReport);
  const speak = useServerFn(speakMalayalam);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("ദയവായി ഒരു ചിത്രം (JPG/PNG) അപ്‌ലോഡ് ചെയ്യൂ");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("ചിത്രം വളരെ വലുതാണ് (8MB വരെ മാത്രം)");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const base64 = dataUrl.split(",")[1] ?? "";
      const res = await analyze({ data: { imageBase64: base64, mimeType: file.type } });
      const text = res.text.trim();
      storage.addReport({ title: file.name, summary: text, imageDataUrl: dataUrl });
      toast.success("റിപ്പോർട്ട് വിശകലനം ചെയ്തു");
      try {
        const tts = await speak({ data: { text: text.slice(0, 2000) } });
        const audio = new Audio(`data:${tts.mimeType};base64,${tts.audioBase64}`);
        await audio.play();
      } catch { /* ignore tts errors */ }
    } catch (e) {
      console.error(e);
      toast.error("വിശകലനം ചെയ്യാൻ കഴിഞ്ഞില്ല");
    } finally {
      setBusy(false);
    }
  }

  async function replay(text: string) {
    try {
      const tts = await speak({ data: { text: text.slice(0, 2000) } });
      const audio = new Audio(`data:${tts.mimeType};base64,${tts.audioBase64}`);
      await audio.play();
    } catch { /* ignore */ }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-display text-foreground">വൈദ്യ റിപ്പോർട്ടുകൾ</h1>
        <p className="text-muted-foreground mt-1">പ്രിസ്ക്രിപ്ഷൻ, രക്തപരിശോധന അല്ലെങ്കിൽ സ്കാൻ റിപ്പോർട്ട് അപ്‌ലോഡ് ചെയ്യൂ</p>
      </div>

      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full border-2 border-dashed border-border rounded-3xl py-10 px-6 bg-card hover:bg-warm transition flex flex-col items-center gap-3 disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 className="w-12 h-12 text-accent animate-spin" />
            <span className="text-lg text-muted-foreground">വിശകലനം ചെയ്യുന്നു...</span>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-gradient-warm flex items-center justify-center">
              <Upload className="w-8 h-8 text-accent" />
            </div>
            <span className="text-lg font-medium">റിപ്പോർട്ടിന്റെ ഫോട്ടോ തിരഞ്ഞെടുക്കൂ</span>
            <span className="text-sm text-muted-foreground">JPG അല്ലെങ്കിൽ PNG</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ""; }}
      />

      <div className="space-y-4">
        {store.reports.map((r) => (
          <div key={r.id} className="bg-card border border-border rounded-3xl p-5 shadow-soft">
            <div className="flex items-start gap-4">
              {r.imageDataUrl && (
                <img src={r.imageDataUrl} alt={r.title} className="w-20 h-20 object-cover rounded-xl border border-border shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="truncate">{r.title}</span>
                </div>
                <div className="whitespace-pre-wrap text-foreground leading-relaxed">{r.summary}</div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => replay(r.summary)} className="rounded-full gap-1.5">
                    <Volume2 className="w-4 h-4" /> കേൾക്കാം
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => storage.removeReport(r.id)} className="rounded-full text-muted-foreground gap-1.5">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
