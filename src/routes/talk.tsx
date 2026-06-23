import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { VoiceChat } from "@/components/VoiceChat";

export const Route = createFileRoute("/talk")({
  head: () => ({
    meta: [
      { title: "സംസാരം — Kunjappan" },
      { name: "description", content: "Full Malayalam voice conversation with Kunjappan." },
    ],
  }),
  component: () => (
    <PageShell title="സംസാരം" subtitle="കുഞ്ഞപ്പനോട് സംസാരിക്കാം">
      <VoiceChat />
    </PageShell>
  ),
});
