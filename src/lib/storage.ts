import { useEffect, useState } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
};

export type Medicine = {
  id: string;
  name: string;
  dosage: string;
  time: string; // HH:MM
  notes?: string;
  createdAt: number;
  log: { date: string; status: "taken" | "missed" }[];
};

export type SavedReport = {
  id: string;
  title: string;
  summary: string;
  imageDataUrl?: string;
  createdAt: number;
};

export type Profile = {
  name: string;
  address: string;
  familyName: string;
  familyPhone: string;
  doctorPhone: string;
  memories: string[];
};

const KEY = "kunjappan/v1";

type Store = {
  profile: Profile;
  messages: ChatMessage[];
  medicines: Medicine[];
  reports: SavedReport[];
};

const defaultStore = (): Store => ({
  profile: {
    name: "",
    address: "",
    familyName: "",
    familyPhone: "",
    doctorPhone: "",
    memories: [],
  },
  messages: [],
  medicines: [],
  reports: [],
});

function read(): Store {
  if (typeof window === "undefined") return defaultStore();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultStore();
    return { ...defaultStore(), ...JSON.parse(raw) };
  } catch {
    return defaultStore();
  }
}

function write(s: Store) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("kunjappan:update"));
}

export function useStore() {
  const [store, setStore] = useState<Store>(() => read());
  useEffect(() => {
    const onUpdate = () => setStore(read());
    window.addEventListener("kunjappan:update", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("kunjappan:update", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);
  return store;
}

export const storage = {
  get: read,
  set: write,
  updateProfile(patch: Partial<Profile>) {
    const s = read();
    s.profile = { ...s.profile, ...patch };
    write(s);
  },
  addMemory(text: string) {
    const s = read();
    if (!s.profile.memories.includes(text)) s.profile.memories.push(text);
    write(s);
  },
  addMessage(m: ChatMessage) {
    const s = read();
    s.messages.push(m);
    if (s.messages.length > 200) s.messages = s.messages.slice(-200);
    write(s);
  },
  clearMessages() {
    const s = read();
    s.messages = [];
    write(s);
  },
  addMedicine(m: Omit<Medicine, "id" | "createdAt" | "log">) {
    const s = read();
    s.medicines.push({ ...m, id: crypto.randomUUID(), createdAt: Date.now(), log: [] });
    write(s);
  },
  removeMedicine(id: string) {
    const s = read();
    s.medicines = s.medicines.filter((m) => m.id !== id);
    write(s);
  },
  markMedicine(id: string, status: "taken" | "missed") {
    const s = read();
    const date = new Date().toISOString().slice(0, 10);
    const med = s.medicines.find((m) => m.id === id);
    if (med) {
      med.log = med.log.filter((l) => l.date !== date);
      med.log.push({ date, status });
    }
    write(s);
  },
  addReport(r: Omit<SavedReport, "id" | "createdAt">) {
    const s = read();
    s.reports.unshift({ ...r, id: crypto.randomUUID(), createdAt: Date.now() });
    if (s.reports.length > 30) s.reports = s.reports.slice(0, 30);
    write(s);
  },
  removeReport(id: string) {
    const s = read();
    s.reports = s.reports.filter((r) => r.id !== id);
    write(s);
  },
};

const EMERGENCY_KEYWORDS = [
  "സഹായിക്കൂ", "സഹായം", "വയ്യ", "ശ്വാസം മുട്ട", "ശ്വാസം മുട്ടുന്നു",
  "നെഞ്ച് വേദന", "നെഞ്ചുവേദന", "തല ചുറ്റു", "തലചുറ്റു", "ബോധം",
  "വീണു", "എനിക്ക് വയ്യ",
];

export function isEmergency(text: string): boolean {
  const t = text.trim();
  return EMERGENCY_KEYWORDS.some((k) => t.includes(k));
}
