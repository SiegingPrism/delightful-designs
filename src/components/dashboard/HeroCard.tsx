import { motion } from "framer-motion";
import { ArrowRight, Flame, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { levelFromXp } from "@/lib/gamification";
import { format } from "date-fns";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Late night flow";
};

const productivityState = (score: number) => {
  if (score >= 80) return { label: "On fire", tone: "warning" as const };
  if (score >= 50) return { label: "Steady", tone: "primary" as const };
  if (score >= 20) return { label: "Warming up", tone: "accent" as const };
  return { label: "Just begun", tone: "muted" as const };
};

export const HeroCard = () => {
  const tasks = useAppStore((s) => s.tasks);
  const focusSessions = useAppStore((s) => s.focusSessions);
  const totalXP = useAppStore((s) => s.totalXP);
  const userName = useAppStore((s) => s.userName);
  const dailyStats = useAppStore((s) => s.dailyStats);
  const currentStreak = useAppStore((s) => s.currentStreak);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todays = tasks.filter((t) => (t.dueDate ?? "").startsWith(todayStr) || !t.dueDate);
  const completed = todays.filter((t) => t.completed).length;
  const focusToday = focusSessions
    .filter((s) => s.completedAt.startsWith(todayStr))
    .reduce((acc, s) => acc + s.durationMin, 0);

  const todayStat = dailyStats.find((d) => d.date === todayStr);
  // Server-computed score is the source of truth; fall back to a quick approximation
  // if the row hasn't been written yet (e.g. brand-new user, no actions today).
  const score = todayStat?.productivityScore ?? 0;
  const state = productivityState(score);
  const info = levelFromXp(totalXP);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="glass-card relative overflow-hidden p-6 md:p-8 lg:col-span-2"
    >
      {/* Local theme-aware glow accents — driven entirely by primary token */}
      <div
        aria-hidden
        className="absolute -bottom-40 -right-32 w-[28rem] h-[28rem] rounded-full pointer-events-none blur-3xl opacity-60"
        style={{
          background:
            "radial-gradient(circle at center, hsl(var(--primary) / 0.55) 0%, hsl(var(--primary) / 0.18) 40%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -top-24 -left-16 w-72 h-72 rounded-full pointer-events-none blur-3xl opacity-40"
        style={{
          background:
            "radial-gradient(circle at center, hsl(var(--accent) / 0.45) 0%, transparent 70%)",
        }}
      />
      {/* Thin orbital ring echo */}
      <div className="absolute -bottom-48 -right-40 w-[32rem] h-[32rem] rounded-full border border-primary/15 pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> FlowSphere
          </p>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-balance">
            <span className="gradient-text">{greeting().split(" ")[0]}</span>{" "}
            {greeting().split(" ").slice(1).join(" ")},
            <br />
            {userName}
          </h2>
          <p className="text-muted-foreground mt-3 max-w-md">
            {completed === 0
              ? "Ready to make progress? Start with one task."
              : `You've completed ${completed} of ${todays.length} task${todays.length === 1 ? "" : "s"} today. Keep the momentum.`}
          </p>
          <div className="flex items-center gap-3 mt-5 flex-wrap">
            <Link
              to="/focus"
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold shadow-elevated hover:shadow-glow transition-smooth"
            >
              Start focus
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-smooth" />
            </Link>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold bg-${state.tone}/15 text-${state.tone === "muted" ? "muted-foreground" : state.tone}`}
            >
              {state.label}
            </span>
            {currentStreak > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-warning/15 text-warning inline-flex items-center gap-1">
                <Flame className="w-3 h-3" />
                {currentStreak}d streak
              </span>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 pt-5 border-t border-border/40">
          <Stat label="Score" value={score.toString()} sub={`Today · ${todayStat?.tasksCompleted ?? completed}/${todayStat?.tasksPlanned ?? todays.length} tasks`} />
          <Stat label="Focus" value={`${focusToday}m`} sub="today" />
          <Stat
            label={`Level ${info.level}`}
            value={totalXP.toString()}
            sub={`${info.xpInLevel}/${info.xpForNext - info.xpForCurrent} XP → L${info.level + 1}`}
          />
        </div>
      </div>
    </motion.section>
  );
};

const Stat = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <div>
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">{label}</p>
    <p className="number-display text-2xl md:text-3xl">{value}</p>
    <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
  </div>
);
