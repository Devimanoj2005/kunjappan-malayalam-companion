import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { ProfileSettings } from "@/components/ProfileSettings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "ക്രമീകരണം — Kunjappan" },
      { name: "description", content: "Profile, family contacts, and memories Kunjappan should remember." },
    ],
  }),
  component: () => (
    <PageShell title="ക്രമീകരണം" subtitle="Profile & family">
      <ProfileSettings />
    </PageShell>
  ),
});
