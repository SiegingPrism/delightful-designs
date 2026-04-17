import { NavLink } from "react-router-dom";
import { Home, ListChecks, Timer, Trophy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/tasks", icon: ListChecks, label: "Tasks" },
  { to: "/focus", icon: Timer, label: "Focus" },
  { to: "/rewards", icon: Trophy, label: "Rewards" },
  { to: "/coach", icon: Sparkles, label: "AI" },
];

export const BottomNav = () => (
  <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t rounded-t-2xl px-2 py-2 flex items-center justify-around">
    {items.map(({ to, icon: Icon, label }) => (
      <NavLink
        key={to}
        to={to}
        end={to === "/"}
        className={({ isActive }) =>
          cn(
            "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-smooth text-xs font-medium",
            isActive ? "text-primary bg-primary/10" : "text-muted-foreground",
          )
        }
      >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
      </NavLink>
    ))}
  </nav>
);
