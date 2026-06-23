import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Toaster } from "sonner";
import type { ReactNode } from "react";

export function PageShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-cream">
      <Toaster position="top-center" richColors closeButton />
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-4">
          <Link
            to="/"
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-primary hover:bg-sage transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-display leading-none text-primary">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto flex flex-col min-h-0">{children}</main>
    </div>
  );
}
