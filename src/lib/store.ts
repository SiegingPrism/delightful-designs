import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskCategory = "work" | "personal" | "health" | "learning" | "other";

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

  // XP
  awardXP: (amount: number, reason: string) => void;

  // User
  setUserName: (name: string) => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 11);

const xpForPriority = (p: Priority): number =>
  ({ low: 5, medium: 10, high: 20, urgent: 35 }[p]);

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
    { id: uid(), name: "Drink water", emoji: "💧", color: "accent", targetPerWeek: 7, history: [today()], createdAt: now },
    { id: uid(), name: "Workout", emoji: "🏋️", color: "primary", targetPerWeek: 4, history: [], createdAt: now },
    { id: uid(), name: "Read", emoji: "📚", color: "success", targetPerWeek: 5, history: [today()], createdAt: now },
  ];
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: seedTasks(),
      habits: seedHabits(),
      focusSessions: [],
      healthLogs: [{ date: today(), waterMl: 500, steps: 3200, workouts: 0 }],
      xpHistory: [],
      totalXP: 0,
      userName: "Alex",

      addTask: (t) => {
        const xp = t.xp ?? xpForPriority(t.priority);
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
        if (willComplete) get().awardXP(task.xp, `Completed: ${task.title}`);
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
        if (!has) get().awardXP(8, `Habit: ${habit.name}`);
      },
      removeHabit: (id) => set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

      logFocusSession: (s) => {
        const session: FocusSession = {
          id: uid(),
          completedAt: new Date().toISOString(),
          ...s,
        };
        set((st) => ({ focusSessions: [session, ...st.focusSessions] }));
        get().awardXP(Math.round(s.durationMin / 5) * 5, `Focus: ${s.durationMin}m`);
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
      setMood: (mood) => get().logHealth({ mood }),

      awardXP: (amount, reason) =>
        set((s) => ({
          totalXP: s.totalXP + amount,
          xpHistory: [{ id: uid(), amount, reason, at: new Date().toISOString() }, ...s.xpHistory].slice(0, 50),
        })),

      setUserName: (name) => set({ userName: name }),
    }),
    { name: "flowsphere-store" },
  ),
);

// Derived helpers
export const getLevel = (xp: number) => {
  // 120 XP per level, scales by 1.15
  let level = 1;
  let needed = 120;
  let remaining = xp;
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = Math.round(needed * 1.15);
  }
  return { level, xpInLevel: remaining, xpToNext: needed };
};

export const todayKey = today;
