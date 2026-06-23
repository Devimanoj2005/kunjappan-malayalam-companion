import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { ReportAnalyzer } from "@/components/ReportAnalyzer";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "വൈദ്യ റിപ്പോർട്ടുകൾ — Kunjappan" },
      { name: "description", content: "Upload prescriptions and medical reports for a simple Malayalam explanation." },
    ],
  }),
  component: () => (
    <PageShell title="റിപ്പോർട്ടുകൾ" subtitle="Medical reports, in simple Malayalam">
      <ReportAnalyzer />
    </PageShell>
  ),
});
