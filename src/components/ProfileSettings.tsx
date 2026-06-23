import { storage, useStore } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import { Trash2, Plus } from "lucide-react";

export function ProfileSettings() {
  const store = useStore();
  const [memory, setMemory] = useState("");

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-display text-foreground">ക്രമീകരണം</h1>
        <p className="text-muted-foreground mt-1">കുഞ്ഞപ്പന് നിങ്ങളെ കുറിച്ച് അറിയിക്കാം</p>
      </div>

      <section className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-soft">
        <h2 className="text-xl font-display">എന്റെ വിവരങ്ങൾ</h2>
        <div>
          <Label className="text-base">എന്റെ പേര്</Label>
          <Input
            className="h-12 text-lg mt-1.5"
            value={store.profile.name}
            onChange={(e) => storage.updateProfile({ name: e.target.value })}
            placeholder="മറിയാമ്മ"
          />
        </div>
        <div>
          <Label className="text-base">വിലാസം</Label>
          <Input
            className="h-12 text-lg mt-1.5"
            value={store.profile.address}
            onChange={(e) => storage.updateProfile({ address: e.target.value })}
            placeholder="വീട്ടുപേര്, സ്ഥലം"
          />
        </div>
      </section>

      <section className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-soft">
        <h2 className="text-xl font-display">കുടുംബാംഗം</h2>
        <p className="text-sm text-muted-foreground -mt-2">അടിയന്തര സാഹചര്യങ്ങളിൽ ഈ നമ്പറിലേക്ക് അലേർട്ട് അയക്കും</p>
        <div>
          <Label className="text-base">പേര്</Label>
          <Input
            className="h-12 text-lg mt-1.5"
            value={store.profile.familyName}
            onChange={(e) => storage.updateProfile({ familyName: e.target.value })}
            placeholder="ലിസി (മകൾ)"
          />
        </div>
        <div>
          <Label className="text-base">ഫോൺ നമ്പർ</Label>
          <Input
            className="h-12 text-lg mt-1.5"
            type="tel"
            value={store.profile.familyPhone}
            onChange={(e) => storage.updateProfile({ familyPhone: e.target.value })}
            placeholder="9876543210"
          />
        </div>
        <div>
          <Label className="text-base">ഡോക്ടറുടെ ഫോൺ</Label>
          <Input
            className="h-12 text-lg mt-1.5"
            type="tel"
            value={store.profile.doctorPhone}
            onChange={(e) => storage.updateProfile({ doctorPhone: e.target.value })}
            placeholder="9876543210"
          />
        </div>
      </section>

      <section className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-soft">
        <h2 className="text-xl font-display">കുഞ്ഞപ്പൻ ഓർക്കേണ്ടവ</h2>
        <div className="flex gap-2">
          <Input
            className="h-12 text-lg"
            value={memory}
            onChange={(e) => setMemory(e.target.value)}
            placeholder="എന്റെ മകളുടെ പേര് ലിസി ആണ്"
          />
          <Button
            size="lg"
            className="rounded-2xl"
            onClick={() => {
              if (memory.trim()) {
                storage.addMemory(memory.trim());
                setMemory("");
                toast.success("ഓർമ്മയിൽ ചേർത്തു");
              }
            }}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        <ul className="space-y-2">
          {store.profile.memories.map((m) => (
            <li key={m} className="flex items-center justify-between bg-warm rounded-2xl px-4 py-3">
              <span className="text-warm-foreground">{m}</span>
              <button
                onClick={() => storage.updateProfile({ memories: store.profile.memories.filter((x) => x !== m) })}
                className="text-warm-foreground/60 hover:text-emergency transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
          {store.profile.memories.length === 0 && (
            <li className="text-sm text-muted-foreground">ഇതുവരെ ഓർമ്മകൾ ഒന്നും ചേർത്തിട്ടില്ല</li>
          )}
        </ul>
      </section>
    </div>
  );
}
