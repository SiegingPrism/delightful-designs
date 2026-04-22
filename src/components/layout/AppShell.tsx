import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

export const AppShell = ({ children }: { children: ReactNode }) => {
  return (
    <div className="relative min-h-screen flex">
      {/* Dynamic ambient ember field — three drifting orbs driven by theme tokens */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div
          className="ember-orb ember-orb-1"
          style={{ top: "5%", right: "-12%", width: "44rem", height: "44rem" }}
        />
        <div
          className="ember-orb ember-orb-2"
          style={{ bottom: "-15%", left: "-12%", width: "38rem", height: "38rem" }}
        />
        <div
          className="ember-orb ember-orb-3"
          style={{ top: "40%", left: "30%", width: "30rem", height: "30rem" }}
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
