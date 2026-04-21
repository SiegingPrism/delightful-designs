import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type ActionSource,
  type Branch,
  branchOf,
  computeXp,
  currentStreak,
  levelFromXp,
} from "./gamification";

export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskCategory = "work" | "personal" | "health" | "learning" | "other";
export type PrimaryGoal = "ship" | "fit" | "learn" | "recover";

export interface Task {
  id: string;
  title: string;
  notes?: string;
  priority: Priority;
  category: TaskCategory;
  durationMin: number;
  xp: number;
  dueDate?: string; // ISO
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string; // semantic color name
  targetPerWeek: number;
  history: string[]; // ISO date strings (YYYY-MM-DD) when checked off
  createdAt: string;
  category?: TaskCategory;
}

export interface FocusSession {
  id: string;
  taskId?: string;
  durationMin: number;
  completedAt: string;
}

export interface HealthLog {
  date: string; // YYYY-MM-DD
  waterMl: number;
  steps: number;
  mood?: 1 | 2 | 3 | 4 | 5;
  workouts: number;
  sleepHours?: number;
}

export interface XPEvent {
  id: string;
  amount: number;
  reason: string;
  branch: Branch;
  sourceType: "task" | "habit" | "focus" | "health" | "login";
  at: string;
}

interface AppState {
  tasks: Task[];
  habits: Habit[];
  focusSessions: FocusSession[];
  healthLogs: HealthLog[];
  xpHistory: XPEvent[];
  totalXP: number;
  userName: string;

  // Onboarding / preferences
  onboardedAt?: string;
  primaryGoal?: PrimaryGoal;
  dailyFocusTargetMin: number;

  // Tasks
  addTask: (t: Omit<Task, "id" | "createdAt" | "completed" | "xp"> & { xp?: number }) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;

  // Habits
  addHabit: (h: Omit<Habit, "id" | "createdAt" | "history">) => void;
  toggleHabitToday: (id: string) => void;
  removeHabit: (id: string) => void;

  // Focus
  logFocusSession: (s: Omit<FocusSession, "id" | "completedAt">) => void;

  // Health
  logHealth: (patch: Partial<HealthLog> & { date?: string }) => void;
  setMood: (mood: 1 | 2 | 3 | 4 | 5) => void;

  // XP — internal-ish but exposed for callers that already know their source
  awardFor: (source: ActionSource, reason: string) => number;

  // Onboarding
  completeOnboarding: (data: {
    userName: string;
    primaryGoal: PrimaryGoal;
    dailyFocusTargetMin: number;
    starterHabits: Array<Omit<Habit, "id" | "createdAt" | "history">>;
  }) => void;
  resetOnboarding: () => void;

  // User
  setUserName: (name: string) => void;
  setDailyFocusTarget: (min: number) => void;

  // Dev / debug
  grantDebugXp: (amount: number, reason?: string) => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 11);

const seedTasks = (): Task[] => {
  const now = new Date().toISOString();
  return [
    { id: uid(), title: "Review weekly priorities", priority: "high", category: "work", durationMin: 25, xp: 20, completed: false, createdAt: now, dueDate: today() },
    { id: uid(), title: "30-min focused walk", priority: "medium", category: "health", durationMin: 30, xp: 10, completed: false, createdAt: now, dueDate: today() },
    { id: uid(), title: "Read 10 pages", priority: "low", category: "learning", durationMin: 15, xp: 5, completed: true, completedAt: now, createdAt: now, dueDate: today() },
  ];
};

const seedHabits = (): Habit[] => {
  const now = new Date().toISOString();
  return [
    { id: uid(), name: "Drink water", emoji: "💧", color: "accent", targetPerWeek: 7, history: [today()], createdAt: now, category: "health" },
    { id: uid(), name: "Workout", emoji: "🏋️", color: "primary", targetPerWeek: 4, history: [], createdAt: now, category: "health" },
    { id: uid(), name: "Read", emoji: "📚", color: "success", targetPerWeek: 5, history: [today()], createdAt: now, category: "learning" },
  ];
};

const TASK_BASE: Record<Priority, number> = { low: 5, medium: 10, high: 20, urgent: 35 };

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const award = (source: ActionSource, reason: string): number => {
        const state = get();
        const todayKey = today();
        const dailyStreak = currentStreak(
          Array.from(new Set(state.xpHistory.map((e) => e.at.slice(0, 10)))),
          todayKey,
        );
        const actionsToday = state.xpHistory.filter((e) => e.at.slice(0, 10) === todayKey).length;
        const userLevel = levelFromXp(state.totalXP).level;
        const amount = computeXp(source, { streakDays: dailyStreak, userLevel, actionsToday });
        const branch = branchOf(source);
        const event: XPEvent = {
          id: uid(),
          amount,
          reason,
          branch,
          sourceType: source.type,
          at: new Date().toISOString(),
        };
        set((s) => ({
          totalXP: s.totalXP + amount,
          xpHistory: [event, ...s.xpHistory].slice(0, 200),
        }));
        return amount;
      };

      return {
        tasks: seedTasks(),
        habits: seedHabits(),
        focusSessions: [],
        healthLogs: [{ date: today(), waterMl: 500, steps: 3200, workouts: 0 }],
        xpHistory: [],
        totalXP: 0,
        userName: "Alex",
        dailyFocusTargetMin: 50,

        addTask: (t) => {
          const xp = t.xp ?? TASK_BASE[t.priority];
          const task: Task = {
            id: uid(),
            createdAt: new Date().toISOString(),
            completed: false,
            xp,
            ...t,
          };
          set((s) => ({ tasks: [task, ...s.tasks] }));
        },
        toggleTask: (id) => {
          const task = get().tasks.find((t) => t.id === id);
          if (!task) return;
          const willComplete = !task.completed;
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === id
                ? { ...t, completed: willComplete, completedAt: willComplete ? new Date().toISOString() : undefined }
                : t,
            ),
          }));
          if (willComplete) {
            award(
              { type: "task", priority: task.priority, category: task.category },
              `Completed: ${task.title}`,
            );
          }
        },
        removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
        updateTask: (id, patch) =>
          set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

        addHabit: (h) =>
          set((s) => ({
            habits: [
              ...s.habits,
              { ...h, id: uid(), history: [], createdAt: new Date().toISOString() },
            ],
          })),
        toggleHabitToday: (id) => {
          const t = today();
          const habit = get().habits.find((h) => h.id === id);
          if (!habit) return;
          const has = habit.history.includes(t);
          set((s) => ({
            habits: s.habits.map((h) =>
              h.id === id
                ? { ...h, history: has ? h.history.filter((d) => d !== t) : [...h.history, t] }
                : h,
            ),
          }));
          if (!has) {
            award(
              { type: "habit", emoji: habit.emoji, category: habit.category },
              `Habit: ${habit.name}`,
            );
          }
        },
        removeHabit: (id) => set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

        logFocusSession: (s) => {
          const session: FocusSession = {
            id: uid(),
            completedAt: new Date().toISOString(),
            ...s,
          };
          set((st) => ({ focusSessions: [session, ...st.focusSessions] }));
          award({ type: "focus", durationMin: s.durationMin }, `Focus: ${s.durationMin}m`);
        },

        logHealth: (patch) => {
          const date = patch.date ?? today();
          set((s) => {
            const exists = s.healthLogs.find((l) => l.date === date);
            if (exists) {
              return {
                healthLogs: s.healthLogs.map((l) => (l.date === date ? { ...l, ...patch, date } : l)),
              };
            }
            return {
              healthLogs: [
                { date, waterMl: 0, steps: 0, workouts: 0, ...patch },
                ...s.healthLogs,
              ],
            };
          });
        },
        setMood: (mood) => {
          get().logHealth({ mood });
          award({ type: "health", kind: "mood" }, `Mood logged: ${mood}/5`);
        },

        awardFor: award,

        completeOnboarding: ({ userName, primaryGoal, dailyFocusTargetMin, starterHabits }) => {
          const now = new Date().toISOString();
          const habits: Habit[] = starterHabits.map((h) => ({
            ...h,
            id: uid(),
            history: [],
            createdAt: now,
          }));
          set((s) => ({
            userName,
            primaryGoal,
            dailyFocusTargetMin,
            onboardedAt: now,
            // append starter habits, keep any existing seeds the user may already have toggled
            habits: [...habits, ...s.habits],
          }));
          // Award the welcome login XP
          award({ type: "login" }, "Welcome to FlowSphere");
        },
        resetOnboarding: () => set({ onboardedAt: undefined }),

        setUserName: (name) => set({ userName: name }),
        setDailyFocusTarget: (min) => set({ dailyFocusTargetMin: min }),

        grantDebugXp: (amount, reason = "Debug XP grant") => {
          const event: XPEvent = {
            id: uid(),
            amount,
            reason,
            branch: "craft",
            sourceType: "login",
            at: new Date().toISOString(),
          };
          set((s) => ({
            totalXP: s.totalXP + amount,
            xpHistory: [event, ...s.xpHistory].slice(0, 200),
          }));
        },
      };
    },
    { name: "flowsphere-store", version: 2 },
  ),
);

// Re-export for backwards compatibility with components
export const todayKey = today;

/** @deprecated use levelFromXp from src/lib/gamification.ts */
export const getLevel = (xp: number) => {
  const info = levelFromXp(xp);
  // Match old shape: level, xpInLevel, xpToNext (but old API used level starting at 1)
  return {
    level: Math.max(1, info.level),
    xpInLevel: info.xpInLevel,
    xpToNext: info.xpForNext - info.xpForCurrent,
  };
};
