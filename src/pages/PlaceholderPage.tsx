import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { Sparkles } from "lucide-react";

export const PlaceholderPage = ({ title, eyebrow, subtitle }: { title: string; eyebrow: string; subtitle: string }) => (
  <AppShell>
    <TopBar eyebrow={eyebrow} title={title} subtitle={subtitle} />
    <div className="glass-card p-10 md:p-16 text-center max-w-2xl mx-auto">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elevated mb-4 animate-float">
        <Sparkles className="w-7 h-7 text-primary-foreground" />
      </div>
      <h2 className="text-2xl font-display font-bold mb-2">Coming next</h2>
      <p className="text-muted-foreground">
        The design system and dashboard are live. This page is wired up and ready — full functionality lands in the next iteration.
      </p>
    </div>
  </AppShell>
);

export default PlaceholderPage;
