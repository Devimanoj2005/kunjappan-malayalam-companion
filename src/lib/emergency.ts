import { storage } from "@/lib/storage";
import { toast } from "sonner";

export function triggerEmergencyAlert(reason: string) {
  const send = (loc: { lat: number; lng: number } | null) => {
    const profile = storage.get().profile;
    const phone = profile.familyPhone?.trim();
    const name = profile.name || "നിങ്ങളുടെ കുടുംബാംഗം";
    const link = loc ? `https://maps.google.com/?q=${loc.lat},${loc.lng}` : "";
    const body = `അടിയന്തര അലേർട്ട്: ${name}ക്ക് സഹായം ആവശ്യമാണ്. കാരണം: "${reason}". ${link ? `സ്ഥാനം: ${link}` : ""}`;
    if (phone) {
      window.open(`sms:${phone}?body=${encodeURIComponent(body)}`, "_blank");
      toast.warning("അടിയന്തര അലേർട്ട് കുടുംബത്തിന് അയക്കുന്നു", { duration: 6000 });
    } else {
      toast.warning("കുടുംബ ഫോൺ നമ്പർ ക്രമീകരണത്തിൽ ചേർക്കൂ", { duration: 6000 });
    }
  };

  if (!navigator.geolocation) return send(null);
  navigator.geolocation.getCurrentPosition(
    (pos) => send({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    () => send(null),
    { timeout: 5000 },
  );
}

export function shareLocationWithFamily() {
  const profile = storage.get().profile;
  const phone = profile.familyPhone?.trim();
  if (!profile.familyPhone) {
    toast.warning("ആദ്യം ക്രമീകരണത്തിൽ കുടുംബ ഫോൺ ചേർക്കൂ");
    return;
  }
  if (!navigator.geolocation) {
    toast.error("GPS ലഭ്യമല്ല");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const link = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
      const body = `എന്റെ നിലവിലെ സ്ഥാനം: ${link}`;
      window.open(`sms:${phone}?body=${encodeURIComponent(body)}`, "_blank");
      toast.success("സ്ഥാനം പങ്കുവെച്ചു");
    },
    () => toast.error("സ്ഥാനം കണ്ടെത്താൻ കഴിഞ്ഞില്ല"),
    { timeout: 6000 },
  );
}

export function callFamily() {
  const phone = storage.get().profile.familyPhone?.trim();
  if (!phone) {
    toast.warning("ആദ്യം ക്രമീകരണത്തിൽ കുടുംബ ഫോൺ ചേർക്കൂ");
    return;
  }
  window.open(`tel:${phone}`, "_self");
}
