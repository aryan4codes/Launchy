import { Link, useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";

const link =
  "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-emerald-500";

export function AppNav({ className }: { className?: string }) {
  const loc = useLocation();
  const twinActive = loc.pathname === "/twin" || loc.pathname === "/voice";
  return (
    <nav className={cn("flex flex-wrap items-center gap-4", className)} aria-label="Main">
      <Link to="/" className={link} title="Marketing home" aria-current={loc.pathname === "/" ? "page" : undefined}>
        Home
      </Link>
      <Link
        to="/twin"
        className={link}
        title="Train your voice and chat with your Digital Twin"
        aria-current={twinActive ? "page" : undefined}
      >
        Digital Twin
      </Link>
      <Link to="/campaigns" className={link} title="Run a campaign" aria-current={loc.pathname.startsWith("/campaigns") ? "page" : undefined}>
        Campaigns
      </Link>
      <Link to="/studio" className={link} title="Workflow Studio" aria-current={loc.pathname === "/studio" ? "page" : undefined}>
        Studio
      </Link>
    </nav>
  );
}
