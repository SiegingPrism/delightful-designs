import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { applyTheme, getTheme } from "@/lib/theme";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import PlaceholderPage from "./pages/PlaceholderPage.tsx";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    applyTheme(getTheme());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/tasks" element={<PlaceholderPage eyebrow="Plan" title="Tasks" subtitle="Capture, prioritize, and ship." />} />
            <Route path="/focus" element={<PlaceholderPage eyebrow="Deep Work" title="Focus Mode" subtitle="One task. No distractions." />} />
            <Route path="/habits" element={<PlaceholderPage eyebrow="Daily" title="Habits" subtitle="Streaks and consistency." />} />
            <Route path="/calendar" element={<PlaceholderPage eyebrow="Planning" title="Calendar" subtitle="Monthly view with task signals." />} />
            <Route path="/rewards" element={<PlaceholderPage eyebrow="Gamification" title="Rewards" subtitle="Glow, badges, and unlocks." />} />
            <Route path="/coach" element={<PlaceholderPage eyebrow="Smart Layer" title="AI Coach" subtitle="Suggestions and adaptive guidance." />} />
            <Route path="/insights" element={<PlaceholderPage eyebrow="Analytics" title="Insights" subtitle="Patterns from your data." />} />
            <Route path="/settings" element={<PlaceholderPage eyebrow="You" title="Settings" subtitle="Profile, theme, and integrations." />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
