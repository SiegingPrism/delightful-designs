import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { applyTheme, getTheme } from "@/lib/theme";
import { useAppStore } from "@/lib/store";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { ThemeUnlockWatcher } from "@/components/shared/ThemeUnlockWatcher";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Tasks from "./pages/Tasks.tsx";
import Focus from "./pages/Focus.tsx";
import Habits from "./pages/Habits.tsx";
import Calendar from "./pages/Calendar.tsx";
import Rewards from "./pages/Rewards.tsx";
import Insights from "./pages/Insights.tsx";
import Settings from "./pages/Settings.tsx";
import Coach from "./pages/Coach.tsx";
import SkillTree from "./pages/SkillTree.tsx";

const queryClient = new QueryClient();

const App = () => {
  const onboardedAt = useAppStore((s) => s.onboardedAt);

  useEffect(() => {
    applyTheme(getTheme());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {!onboardedAt ? (
          <OnboardingWizard />
        ) : (
          <BrowserRouter>
            <ThemeUnlockWatcher />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/focus" element={<Focus />} />
              <Route path="/habits" element={<Habits />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/skill-tree" element={<SkillTree />} />
              <Route path="/coach" element={<Coach />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
