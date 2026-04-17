import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

export const AppShell = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-w-0 px-4 md:px-8 py-6 pb-24 md:pb-8 max-w-[1400px] mx-auto w-full">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};
