import { useMemo, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput, EventClickArg, EventDropArg } from "@fullcalendar/core";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useAppStore } from "@/lib/store";
import "@/styles/fullcalendar.css";

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "hsl(var(--destructive))",
  high: "hsl(var(--warning))",
  medium: "hsl(var(--primary))",
  low: "hsl(var(--muted-foreground))",
};

const CalendarPage = () => {
  const tasks = useAppStore((s) => s.tasks);
  const focusSessions = useAppStore((s) => s.focusSessions);
  const updateTask = useAppStore((s) => s.updateTask);
  const calRef = useRef<FullCalendar | null>(null);

  const events = useMemo<EventInput[]>(() => {
    const taskEvents: EventInput[] = tasks
      .filter((t) => t.dueDate || t.completedAt)
      .map((t) => {
        const dateOnly = (t.dueDate ?? t.completedAt!).slice(0, 10);
        return {
          id: `task-${t.id}`,
          title: t.title,
          start: dateOnly,
          allDay: true,
          backgroundColor: PRIORITY_COLOR[t.priority] ?? PRIORITY_COLOR.medium,
          borderColor: "transparent",
          textColor: "hsl(var(--primary-foreground))",
          classNames: t.completed ? ["fc-task-done"] : ["fc-task"],
          extendedProps: { kind: "task", taskId: t.id, completed: t.completed },
        };
      });
    const focusEvents: EventInput[] = focusSessions.slice(0, 200).map((f) => ({
      id: `focus-${f.id}`,
      title: `🎯 Focus ${f.durationMin}m`,
      start: f.completedAt,
      end: new Date(new Date(f.completedAt).getTime() + f.durationMin * 60_000).toISOString(),
      backgroundColor: "hsl(var(--accent))",
      borderColor: "transparent",
      textColor: "hsl(var(--accent-foreground))",
      classNames: ["fc-focus"],
      extendedProps: { kind: "focus" },
    }));
    return [...taskEvents, ...focusEvents];
  }, [tasks, focusSessions]);

  const handleEventDrop = (arg: EventDropArg) => {
    const kind = arg.event.extendedProps.kind;
    const taskId = arg.event.extendedProps.taskId as string | undefined;
    if (kind !== "task" || !taskId || !arg.event.start) {
      arg.revert();
      return;
    }
    const newDate = arg.event.start.toISOString().slice(0, 10);
    updateTask(taskId, { dueDate: newDate });
    toast.success("Task rescheduled");
  };

  const handleEventClick = (arg: EventClickArg) => {
    const kind = arg.event.extendedProps.kind;
    if (kind === "task") {
      toast(arg.event.title, { description: "Open Tasks page to edit." });
    } else {
      toast(arg.event.title, { description: "Focus session" });
    }
  };

  return (
    <AppShell>
      <TopBar
        eyebrow="Planning"
        title="Calendar"
        subtitle="Drag tasks to reschedule. Focus sessions show as energy blocks."
      />
      <div className="glass-card p-3 md:p-5">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={events}
          editable
          droppable
          eventDrop={handleEventDrop}
          eventClick={handleEventClick}
          height="auto"
          dayMaxEvents={3}
          firstDay={1}
          nowIndicator
        />
      </div>
    </AppShell>
  );
};

export default CalendarPage;
