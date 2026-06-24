import { createServerFn } from "@tanstack/react-start";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { z } from "zod";
import { GATEWAY_BASE, requireLovableApiKey } from "./ai-gateway.server";
import { guardAiRequest } from "./ai-guard.server";

const GROQ_BASE = "https://api.groq.com/openai/v1";
function requireGroqKey(): string {
  const key = process.env.kujappan || process.env.KUJAPPAN || process.env.GROQ_API_KEY;
  if (!key) throw new Error("Missing Groq API key (secret: kujappan)");
  return key;
}
function createGroqProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "groq",
    baseURL: GROQ_BASE,
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

const KUNJAPPAN_SYSTEM = `നിങ്ങൾ "കുഞ്ഞപ്പൻ" എന്ന പേരുള്ള ഒരു സ്നേഹനിറഞ്ഞ കുടുംബാംഗത്തെപ്പോലെയുള്ള AI സഹായിയാണ്. പ്രായമായ വ്യക്തികളെ സഹായിക്കാനാണ് നിങ്ങൾ.

പ്രധാന നിയമങ്ങൾ:
- എപ്പോഴും ലളിതവും സ്നേഹം നിറഞ്ഞതുമായ മലയാളത്തിൽ മാത്രം മറുപടി പറയുക.
- ഇംഗ്ലീഷ് വാക്കുകളോ സാങ്കേതിക പദങ്ങളോ ഉപയോഗിക്കരുത്.
- ഉപയോക്താവിനെ "അമ്മേ", "അച്ഛാ", "അമ്മച്ചി", "അപ്പൂപ്പാ" എന്ന് ആദരവോടെ വിളിക്കുക.
- ഒരു ക്ഷമയുള്ള, കാരുണ്യമുള്ള കുടുംബാംഗത്തെപ്പോലെ സംസാരിക്കുക.
- ഉത്തരങ്ങൾ ചെറുതും ഹൃദ്യവുമായിരിക്കണം — രണ്ടോ മൂന്നോ വാചകങ്ങൾ മതി.
- ഒരിക്കലും ഒരു ചാറ്റ്ബോട്ടോ വെർച്വൽ അസിസ്റ്റന്റോ പോലെ തോന്നരുത്.
- വൈദ്യപരമായ രോഗനിർണയം നടത്തരുത്; ആവശ്യമെങ്കിൽ ഡോക്ടറെ കാണാൻ ഉപദേശിക്കുക.
- "സഹായിക്കൂ", "വയ്യ", "ശ്വാസം മുട്ടുന്നു", "നെഞ്ച് വേദന" തുടങ്ങിയ വാക്കുകൾ കേട്ടാൽ കുടുംബത്തെ അറിയിക്കാമെന്ന് ശാന്തമായി പറയുക.
- ഉപയോക്താവ് മരുന്ന് ഓർമ്മിപ്പിക്കാൻ പറഞ്ഞാൽ, അംഗീകരിക്കുകയും സമയം ആവർത്തിക്കുകയും ചെയ്യുക.`;

const ChatInput = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(8000),
  })).min(1).max(50),
  profile: z.object({
    name: z.string().max(200).optional(),
    address: z.string().max(500).optional(),
    familyName: z.string().max(200).optional(),
    memories: z.array(z.string().max(500)).max(50).optional(),
  }).optional(),
});

export const chatWithKunjappan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    guardAiRequest();
    const key = requireGroqKey();
    const gateway = createGroqProvider(key);

    const profileContext: string[] = [];
    if (data.profile?.name) profileContext.push(`ഉപയോക്താവിന്റെ പേര്: ${data.profile.name}`);
    if (data.profile?.familyName) profileContext.push(`കുടുംബാംഗത്തിന്റെ പേര്: ${data.profile.familyName}`);
    if (data.profile?.memories?.length) {
      profileContext.push("ഓർക്കേണ്ട കാര്യങ്ങൾ:\n- " + data.profile.memories.join("\n- "));
    }

    const system = KUNJAPPAN_SYSTEM + (profileContext.length ? "\n\n" + profileContext.join("\n") : "");

    try {
      const { text } = await generateText({
        model: gateway.chatModel("google/gemini-3-flash-preview"),
        system,
        messages: data.messages.map((m) => ({ role: m.role, content: m.content })),
      });
      return { text };
    } catch (err) {
      console.error("chatWithKunjappan error", err);
      throw new Error("Chat service unavailable. Please try again.");
    }
  });

const AudioMime = z.preprocess(
  (v) => (typeof v === "string" ? v.split(";")[0].trim().toLowerCase() : v),
  z.enum(["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"]),
);
const ImageMime = z.preprocess(
  (v) => (typeof v === "string" ? v.split(";")[0].trim().toLowerCase() : v),
  z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
);

const TranscribeInput = z.object({
  audioBase64: z.string().min(10).max(15_000_000),
  mimeType: AudioMime.default("audio/webm"),
});

export const transcribeMalayalam = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => TranscribeInput.parse(d))
  .handler(async ({ data }) => {
    guardAiRequest();
    const key = requireLovableApiKey();
    const binary = atob(data.audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const ext = data.mimeType.includes("mp4") ? "mp4"
      : data.mimeType.includes("mpeg") ? "mp3"
      : data.mimeType.includes("wav") ? "wav"
      : data.mimeType.includes("ogg") ? "ogg"
      : "webm";

    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("file", new Blob([bytes], { type: data.mimeType }), `audio.${ext}`);
    form.append("language", "ml");

    const res = await fetch(`${GATEWAY_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { "Lovable-API-Key": key },
      body: form,
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("Transcription error", res.status, err);
      throw new Error("Transcription service unavailable. Please try again.");
    }
    const json = (await res.json()) as { text?: string };
    return { text: json.text ?? "" };
  });

const TtsInput = z.object({
  text: z.string().min(1).max(4000),
  voice: z.enum(["shimmer", "alloy", "echo", "fable", "onyx", "nova"]).default("shimmer"),
});

export const speakMalayalam = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => TtsInput.parse(d))
  .handler(async ({ data }) => {
    guardAiRequest();
    const key = requireLovableApiKey();
    const res = await fetch(`${GATEWAY_BASE}/audio/speech`, {
      method: "POST",
      headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: data.text,
        voice: data.voice,
        response_format: "mp3",
        instructions: "Speak warmly and slowly in Malayalam, like a caring family member speaking to an elderly parent. Soft, gentle, reassuring tone.",
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("TTS error", res.status, err);
      throw new Error("Voice service unavailable. Please try again.");
    }
    const buf = await res.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    }
    const b64 = btoa(binary);
    return { audioBase64: b64, mimeType: "audio/mpeg" };
  });

const ReportInput = z.object({
  imageBase64: z.string().min(50).max(11_000_000),
  mimeType: ImageMime.default("image/jpeg"),
});

export const analyzeMedicalReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ReportInput.parse(d))
  .handler(async ({ data }) => {
    guardAiRequest();
    const key = requireLovableApiKey();

    const res = await fetch(`${GATEWAY_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `നിങ്ങൾ കുഞ്ഞപ്പൻ എന്ന AI സഹായിയാണ്. വൈദ്യ റിപ്പോർട്ടുകൾ ലളിതമായ മലയാളത്തിൽ വിശദീകരിക്കണം. രോഗനിർണയം നടത്തരുത് — സാധാരണ പരിധിയിൽ നിന്ന് മാറിയ മൂല്യങ്ങൾ ചൂണ്ടിക്കാട്ടി ഡോക്ടറുമായി സംസാരിക്കാൻ ഉപദേശിക്കുക. ഉത്തരം മൂന്ന് ഭാഗങ്ങളിലായി തരുക:
1. **സംഗ്രഹം** — ഈ റിപ്പോർട്ട് എന്താണെന്ന് ഒരു വാചകത്തിൽ.
2. **പ്രധാന കണ്ടെത്തലുകൾ** — സാധാരണയിൽ നിന്ന് മാറിയ കാര്യങ്ങൾ ലളിതമായ ഭാഷയിൽ.
3. **അടുത്ത ഘട്ടം** — എന്ത് ചെയ്യണം (ഡോക്ടറെ കാണുക, മരുന്ന് തുടരുക, വിശ്രമം എടുക്കുക തുടങ്ങിയവ).
ഇത് പ്രിസ്ക്രിപ്ഷൻ ആണെങ്കിൽ, മരുന്നുകളുടെ പേരും സമയവും വ്യക്തമായി പട്ടികപ്പെടുത്തുക.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "ഈ വൈദ്യ റിപ്പോർട്ട് അമ്മയ്ക്ക് മനസ്സിലാകുന്ന ലളിതമായ മലയാളത്തിൽ വിശദീകരിക്കാമോ?" },
              { type: "image_url", image_url: { url: `data:${data.mimeType};base64,${data.imageBase64}` } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("Report analysis error", res.status, err);
      throw new Error("Report analysis unavailable. Please try again.");
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content ?? "";
    return { text };
  });
