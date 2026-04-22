import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

export const AppShell = ({ children }: { children: ReactNode }) => {
  return (
    <div className="relative min-h-screen flex">
      {/* Global ambient ember field — anchors every page in the Amber Cosmos aesthetic */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div
          className="absolute top-[8%] right-[-12%] w-[42rem] h-[42rem] rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(circle at center, hsl(28 100% 55% / 0.45) 0%, hsl(15 95% 45% / 0.18) 40%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute bottom-[-15%] left-[-10%] w-[36rem] h-[36rem] rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle at center, hsl(38 100% 55% / 0.35) 0%, hsl(22 100% 45% / 0.15) 40%, transparent 70%)",
            filter: "blur(70px)",
          }}
        />
      </div>

      <Sidebar />
      <main className="flex-1 min-w-0 px-4 md:px-8 py-6 pb-24 md:pb-8 max-w-[1400px] mx-auto w-full">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};
