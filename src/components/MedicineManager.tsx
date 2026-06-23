import { useEffect, useState } from "react";
import { Pill, Plus, Trash2, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { storage, useStore, type Medicine } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function todayStr() { return new Date().toISOString().slice(0, 10); }

function todayStatus(m: Medicine): "taken" | "missed" | "pending" {
  const t = todayStr();
  const entry = m.log.find((l) => l.date === t);
  if (entry) return entry.status;
  const [h, mm] = m.time.split(":").map(Number);
  const now = new Date();
  const scheduled = new Date(); scheduled.setHours(h, mm, 0, 0);
  return now > scheduled ? "missed" : "pending";
}

export function MedicineManager() {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [time, setTime] = useState("08:00");
  const [notes, setNotes] = useState("");

  // Browser notifications
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    const id = setInterval(() => {
      const t = new Date();
      const hhmm = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
      const today = todayStr();
      storage.get().medicines.forEach((m) => {
        if (m.time === hhmm && !m.log.find((l) => l.date === today)) {
          if (Notification.permission === "granted") {
            new Notification("കുഞ്ഞപ്പൻ", { body: `അമ്മേ, ${m.name} കഴിക്കാനുള്ള സമയം ആയി` });
          }
          toast(`${m.name} കഴിക്കാനുള്ള സമയം ആയി`, { duration: 8000 });
        }
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  function submit() {
    if (!name.trim()) return;
    storage.addMedicine({ name: name.trim(), dosage: dosage.trim(), time, notes: notes.trim() });
    toast.success("മരുന്ന് ചേർത്തു");
    setName(""); setDosage(""); setNotes(""); setTime("08:00");
    setOpen(false);
  }

  const sorted = [...store.medicines].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">മരുന്നുകൾ</h1>
          <p className="text-muted-foreground mt-1">ഇന്നത്തെ മരുന്നുകൾ</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-2xl gap-2">
              <Plus className="w-5 h-5" /> ചേർക്കുക
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">പുതിയ മരുന്ന്</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-base">പേര്</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="പ്രഷർ മരുന്ന്" className="h-12 text-lg mt-1.5" />
              </div>
              <div>
                <Label className="text-base">ഡോസ്</Label>
                <Input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="1 ഗുളിക" className="h-12 text-lg mt-1.5" />
              </div>
              <div>
                <Label className="text-base">സമയം</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-12 text-lg mt-1.5" />
              </div>
              <div>
                <Label className="text-base">കുറിപ്പ്</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ഭക്ഷണത്തിന് ശേഷം" className="h-12 text-lg mt-1.5" />
              </div>
              <Button onClick={submit} size="lg" className="w-full rounded-2xl">സംരക്ഷിക്കുക</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-warm">
            <Pill className="w-10 h-10 text-warm-foreground" />
          </div>
          <p className="text-lg text-muted-foreground">ഇതുവരെ മരുന്നുകൾ ഒന്നും ചേർത്തിട്ടില്ല</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((m) => {
            const status = todayStatus(m);
            return (
              <div key={m.id} className="bg-card border border-border rounded-3xl p-5 shadow-soft flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  status === "taken" ? "bg-success/15 text-success" :
                  status === "missed" ? "bg-emergency/15 text-emergency" :
                  "bg-warm text-warm-foreground"
                }`}>
                  <Pill className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xl font-medium truncate">{m.name}</div>
                  <div className="text-muted-foreground flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {m.time}</span>
                    {m.dosage && <span>· {m.dosage}</span>}
                  </div>
                  {m.notes && <div className="text-sm text-muted-foreground mt-1">{m.notes}</div>}
                </div>
                <div className="flex items-center gap-2">
                  {status !== "taken" && (
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => { storage.markMedicine(m.id, "taken"); toast.success("അടയാളപ്പെടുത്തി"); }}
                      className="rounded-full w-12 h-12 text-success border-success/30"
                    >
                      <Check className="w-5 h-5" />
                    </Button>
                  )}
                  {status === "taken" && (
                    <span className="text-success font-medium text-sm px-3">കഴിച്ചു</span>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => storage.removeMedicine(m.id)}
                    className="rounded-full w-12 h-12 text-muted-foreground"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
