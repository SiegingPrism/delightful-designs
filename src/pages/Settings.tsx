import { useEffect, useState } from "react";
import { Moon, Sun, Download, Upload, Trash2, User } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { Chip, FadeIn } from "@/components/shared/UI";
import { useAppStore } from "@/lib/store";
import { applyTheme, getTheme, type Theme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const SettingsPage = () => {
  const { userName, setUserName, totalXP, tasks, habits, focusSessions, healthLogs, xpHistory } = useAppStore();
  const [name, setName] = useState(userName);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => { setTheme(getTheme()); }, []);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ tasks, habits, focusSessions, healthLogs, xpHistory, totalXP, userName }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `flowsphere-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported");
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        const persisted = JSON.parse(localStorage.getItem("flowsphere-store") ?? "{}");
        persisted.state = { ...persisted.state, ...json };
        localStorage.setItem("flowsphere-store", JSON.stringify(persisted));
        toast.success("Data imported. Reloading…");
        setTimeout(() => window.location.reload(), 800);
      } catch { toast.error("Invalid file"); }
    };
    reader.readAsText(file);
  };

  const resetAll = () => {
    if (!confirm("This will erase all your tasks, habits, and progress. Continue?")) return;
    localStorage.removeItem("flowsphere-store");
    toast.success("Reset complete. Reloading…");
    setTimeout(() => window.location.reload(), 800);
  };

  const switchTheme = (t: Theme) => { setTheme(t); applyTheme(t); };

  return (
    <AppShell>
      <TopBar eyebrow="You" title="Settings" subtitle="Profile, theme, and data." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <FadeIn className="glass-card">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary text-primary-foreground font-display font-bold text-2xl flex items-center justify-center shadow-elevated">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Profile</p>
              <h2 className="text-xl font-display font-bold">{userName}</h2>
              <Chip tone="primary" className="mt-1">{totalXP} XP</Chip>
            </div>
          </div>
          <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><User className="w-3 h-3" /> Display name</label>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={() => { setUserName(name.trim() || "Friend"); toast.success("Name updated"); }} className="bg-gradient-primary">Save</Button>
          </div>
        </FadeIn>

        <FadeIn delay={0.05} className="glass-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Appearance</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => switchTheme("light")}
              className={`p-4 rounded-xl border-2 transition-smooth flex flex-col items-center gap-2 ${theme === "light" ? "border-primary bg-primary/10 shadow-glow" : "border-border/40 hover:border-primary/30"}`}
            >
              <Sun className="w-6 h-6" />
              <span className="text-sm font-semibold">Light</span>
            </button>
            <button
              onClick={() => switchTheme("dark")}
              className={`p-4 rounded-xl border-2 transition-smooth flex flex-col items-center gap-2 ${theme === "dark" ? "border-primary bg-primary/10 shadow-glow" : "border-border/40 hover:border-primary/30"}`}
            >
              <Moon className="w-6 h-6" />
              <span className="text-sm font-semibold">Dark</span>
            </button>
          </div>
        </FadeIn>

        <FadeIn delay={0.1} className="glass-card lg:col-span-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Your data</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Stat label="Tasks" value={tasks.length} />
            <Stat label="Habits" value={habits.length} />
            <Stat label="Focus sessions" value={focusSessions.length} />
            <Stat label="Health logs" value={healthLogs.length} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportData}><Download className="w-4 h-4 mr-1" />Export</Button>
            <label>
              <input type="file" accept="application/json" className="hidden" onChange={importData} />
              <Button variant="outline" asChild><span className="cursor-pointer"><Upload className="w-4 h-4 mr-1" />Import</span></Button>
            </label>
            <Button variant="destructive" onClick={resetAll} className="ml-auto"><Trash2 className="w-4 h-4 mr-1" />Reset all data</Button>
          </div>
        </FadeIn>

        <FadeIn delay={0.15} className="glass-card lg:col-span-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">About</p>
          <h3 className="text-lg font-display font-bold">FlowSphere</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your productivity, beautifully tracked. Tasks, focus, habits, wellbeing, and an AI coach — all local-first, all yours.
          </p>
        </FadeIn>
      </div>
    </AppShell>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="p-3 rounded-xl bg-muted/40">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="number-display text-xl mt-0.5">{value}</p>
  </div>
);

export default SettingsPage;
