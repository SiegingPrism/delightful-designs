import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { Activity, CheckCircle2, Flame, Lightbulb, Target, TrendingUp, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { Chip, FadeIn } from "@/components/shared/UI";
import { useAppStore, type DailyStat } from "@/lib/store";
import { useAchievementCatalog } from "@/hooks/use-achievements";
import { cn } from "@/lib/utils";

const InsightsPage = () => {
  const tasks = useAppStore((s) => s.tasks);
  const focusSessions = useAppStore((s) => s.focusSessions);
  const habits = useAppStore((s) => s.habits);
  const dailyStats = useAppStore((s) => s.dailyStats);
  const totalXP = useAppStore((s) => s.totalXP);
  const level = useAppStore((s) => s.level);
  const currentStreak = useAppStore((s) => s.currentStreak);
  const longestStreak = useAppStore((s) => s.longestStreak);
  const tasksCompletedTotal = useAppStore((s) => s.tasksCompletedTotal);
  const unlocked = useAppStore((s) => s.unlockedAchievements);
  const catalog = useAchievementCatalog();

  // ---- 7-day rolling window from daily_stats ----
  const last7: DailyStat[] = useMemo(() => {
    const byDate = new Map(dailyStats.map((d) => [d.date, d]));
    return [...Array(7)].map((_, i) => {
      const d = subDays(new Date(), 6 - i);
      const key = format(d, "yyyy-MM-dd");
      return (
        byDate.get(key) ?? {
          date: key,
          tasksCompleted: 0,
          tasksPlanned: 0,
          focusMinutes: 0,
          xpEarned: 0,
          productivityScore: 0,
          streakKept: false,
        }
      );
    });
  }, [dailyStats]);

  const last30: DailyStat[] = useMemo(() => {
    const byDate = new Map(dailyStats.map((d) => [d.date, d]));
    return [...Array(30)].map((_, i) => {
      const d = subDays(new Date(), 29 - i);
      const key = format(d, "yyyy-MM-dd");
      return (
        byDate.get(key) ?? {
          date: key,
          tasksCompleted: 0,
          tasksPlanned: 0,
          focusMinutes: 0,
          xpEarned: 0,
          productivityScore: 0,
          streakKept: false,
        }
      );
    });
  }, [dailyStats]);

  const weeklyAvgScore = Math.round(
    last7.reduce((a, d) => a + d.productivityScore, 0) / last7.length,
  );
  const weeklyXP = last7.reduce((a, d) => a + d.xpEarned, 0);
  const totalFocusMin = focusSessions.reduce((a, s) => a + s.durationMin, 0);
  const completionRate =
    tasks.length > 0 ? Math.round((tasksCompletedTotal / tasks.length) * 100) : 0;

  // ---- Priority breakdown ----
  const byPriority = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0, urgent: 0 };
    tasks.forEach((t) => counts[t.priority]++);
    return counts;
  }, [tasks]);

  const priorityData = [
    { name: "Urgent", value: byPriority.urgent, fill: "hsl(var(--destructive))" },
    { name: "High", value: byPriority.high, fill: "hsl(var(--warning))" },
    { name: "Medium", value: byPriority.medium, fill: "hsl(var(--primary))" },
    { name: "Low", value: byPriority.low, fill: "hsl(var(--muted-foreground))" },
  ].filter((d) => d.value > 0);

  // ---- Pattern insights ----
  const insights = useMemo(() => buildInsights(tasks, focusSessions, last7, currentStreak), [
    tasks,
    focusSessions,
    last7,
    currentStreak,
  ]);

  const habitConsistency =
    habits.length === 0
      ? 0
      : Math.round(
          habits.reduce((a, h) => {
            const set = new Set(h.history);
            const last7days = [...Array(7)].map((_, i) =>
              format(subDays(new Date(), i), "yyyy-MM-dd"),
            );
            return a + (last7days.filter((d) => set.has(d)).length / 7) * 100;
          }, 0) / habits.length,
        );

  const unlockedSet = new Set(unlocked.map((u) => u.achievementId));
  const unlockedAt = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));

  return (
    <AppShell>
      <TopBar eyebrow="Analytics" title="Insights" subtitle="What your data is telling you." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <StatCard label="Today's score" value={last7[6]?.productivityScore ?? 0} suffix="" icon={Target} tone="primary" />
        <StatCard label="7-day avg" value={weeklyAvgScore} suffix="" icon={TrendingUp} tone="accent" />
        <StatCard label="Streak" value={currentStreak} suffix="d" icon={Flame} tone="warning" sub={`Best ${longestStreak}d`} />
        <StatCard label="Level" value={level} suffix="" icon={Trophy} tone="success" sub={`${totalXP} XP`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <FadeIn className="glass-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-display font-bold">Productivity score</h2>
              <p className="text-xs text-muted-foreground">Last 30 days · target 60+</p>
            </div>
            <Chip tone="primary">{weeklyXP} XP this week</Chip>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={last30.map((d) => ({ ...d, label: format(parseISO(d.date), "MMM d") }))}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border) / 0.4)" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} interval={4} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="productivityScore"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#scoreGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </FadeIn>

        <FadeIn delay={0.1} className="glass-card">
          <h2 className="text-xl font-display font-bold mb-1">Tasks by priority</h2>
          <p className="text-xs text-muted-foreground mb-4">{tasks.length} total</p>
          {priorityData.length === 0 ? (
            <EmptyState message="No tasks yet" />
          ) : (
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={priorityData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {priorityData.map((d) => (
                      <Cell key={d.name} fill={d.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </FadeIn>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <FadeIn className="glass-card">
          <h2 className="text-xl font-display font-bold mb-1">Last 7 days</h2>
          <p className="text-xs text-muted-foreground mb-4">Tasks completed vs focus minutes</p>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={last7.map((d) => ({ ...d, label: format(parseISO(d.date), "EEE") }))}>
                <CartesianGrid stroke="hsl(var(--border) / 0.4)" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="tasksCompleted" name="Tasks" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="focusMinutes" name="Focus min" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FadeIn>

        <FadeIn delay={0.1} className="glass-card">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-warning" />
            <h2 className="text-xl font-display font-bold">Patterns we noticed</h2>
          </div>
          {insights.length === 0 ? (
            <EmptyState message="Log a few more days and patterns will appear here." />
          ) : (
            <ul className="space-y-3">
              {insights.map((ins, i) => (
                <li key={i} className="flex gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
                  <span className="text-xl shrink-0">{ins.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold">{ins.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ins.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </FadeIn>
      </div>

      <FadeIn className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-display font-bold">Achievements</h2>
            <p className="text-xs text-muted-foreground">
              {unlocked.length} of {catalog.length} unlocked
            </p>
          </div>
          <Chip tone="success">
            <Trophy className="w-3 h-3 inline mr-1" />
            {unlocked.length}
          </Chip>
        </div>
        {catalog.length === 0 ? (
          <EmptyState message="Loading achievements…" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {catalog.map((a) => {
              const isUnlocked = unlockedSet.has(a.id);
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-4 rounded-xl border transition-smooth",
                    isUnlocked
                      ? "bg-primary/5 border-primary/30 shadow-sm"
                      : "bg-muted/30 border-border/40 opacity-50",
                  )}
                >
                  <div className="text-2xl mb-2">{a.icon}</div>
                  <p className="font-semibold text-sm leading-tight">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                  {isUnlocked && unlockedAt.get(a.id) && (
                    <p className="text-[10px] text-primary mt-2 font-medium">
                      ✓ {format(parseISO(unlockedAt.get(a.id)!), "MMM d")}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </FadeIn>

      {/* Stats footer */}
      <div className="grid grid-cols-3 gap-4 mt-5">
        <SmallStat icon={CheckCircle2} label="Tasks done (all-time)" value={tasksCompletedTotal} />
        <SmallStat icon={TrendingUp} label="Focus minutes (all-time)" value={totalFocusMin} suffix="m" />
        <SmallStat icon={Activity} label="Habit consistency (7d)" value={habitConsistency} suffix="%" />
      </div>
    </AppShell>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-40 text-sm text-muted-foreground text-center px-4">
    {message}
  </div>
);

const StatCard = ({
  label,
  value,
  icon: Icon,
  tone,
  suffix = "",
  sub,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "accent" | "success" | "warning";
  suffix?: string;
  sub?: string;
}) => {
  const toneBg = {
    primary: "bg-primary/15 text-primary",
    accent: "bg-accent/15 text-accent",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
  }[tone];
  return (
    <FadeIn className="glass-card">
      <div className="flex items-center gap-3">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", toneBg)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold truncate">
            {label}
          </p>
          <p className="number-display text-2xl mt-0.5">
            {value}
            {suffix}
          </p>
          {sub && <p className="text-[10px] text-muted-foreground -mt-0.5">{sub}</p>}
        </div>
      </div>
    </FadeIn>
  );
};

const SmallStat = ({
  icon: Icon,
  label,
  value,
  suffix = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
}) => (
  <div className="glass-card flex items-center gap-3">
    <Icon className="w-4 h-4 text-muted-foreground" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display font-bold text-lg">
        {value}
        {suffix}
      </p>
    </div>
  </div>
);

interface Insight {
  emoji: string;
  title: string;
  description: string;
}

function buildInsights(
  tasks: ReturnType<typeof useAppStore.getState>["tasks"],
  focus: ReturnType<typeof useAppStore.getState>["focusSessions"],
  last7: DailyStat[],
  streak: number,
): Insight[] {
  const out: Insight[] = [];

  // Peak hour from completed tasks
  const completed = tasks.filter((t) => t.completedAt);
  if (completed.length >= 3) {
    const hours = new Array(24).fill(0);
    completed.forEach((t) => {
      const h = new Date(t.completedAt!).getHours();
      hours[h]++;
    });
    const peak = hours.indexOf(Math.max(...hours));
    const window = peak < 6 ? "early morning" : peak < 12 ? "morning" : peak < 18 ? "afternoon" : "evening";
    out.push({
      emoji: "🌅",
      title: `You ship most in the ${window}`,
      description: `Around ${peak}:00 is your peak hour — try scheduling deep work then.`,
    });
  }

  // Low days
  const lowDays = last7.filter((d) => d.tasksPlanned > 0 && d.productivityScore < 40);
  if (lowDays.length >= 3) {
    out.push({
      emoji: "📉",
      title: "Several light days this week",
      description: "Try one tiny task tomorrow to rebuild momentum without pressure.",
    });
  }

  // Streak warnings
  if (streak === 0 && last7.some((d) => d.streakKept)) {
    out.push({
      emoji: "🔄",
      title: "Streak just reset",
      description: "Pick the smallest possible task today and check it off — that restarts the streak.",
    });
  } else if (streak >= 7) {
    out.push({
      emoji: "🔥",
      title: `${streak}-day streak going strong`,
      description: "Protect this. Even 1 task tomorrow keeps it alive.",
    });
  }

  // Focus signal
  const totalFocus = last7.reduce((a, d) => a + d.focusMinutes, 0);
  if (totalFocus >= 200) {
    out.push({
      emoji: "🎯",
      title: "Deep work champion",
      description: `${totalFocus} focus minutes this week — that's the top decile.`,
    });
  } else if (focus.length === 0 && tasks.length > 5) {
    out.push({
      emoji: "💡",
      title: "Try a focus session",
      description: "You log tasks but no focus blocks. Even 25 minutes compounds fast.",
    });
  }

  return out.slice(0, 4);
}

export default InsightsPage;
