import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { MedicineManager } from "@/components/MedicineManager";

export const Route = createFileRoute("/medicines")({
  head: () => ({
    meta: [
      { title: "മരുന്നുകൾ — Kunjappan" },
      { name: "description", content: "Medicine reminders and tracking for elderly parents in Malayalam." },
    ],
  }),
  component: () => (
    <PageShell title="മരുന്നുകൾ" subtitle="Medicines & reminders">
      <MedicineManager />
    </PageShell>
  ),
});
