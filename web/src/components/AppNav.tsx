import { Link, useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";

const link =
  "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-emerald-500";

export function AppNav({ className }: { className?: string }) {
  const loc = useLocation();
  return (
    <nav className={cn("flex flex-wrap items-center gap-4", className)} aria-label="Main">
      <Link to="/" className={link} title="Visual workflow canvas" aria-current={loc.pathname === "/" ? "page" : undefined}>
        Studio
      </Link>
      <Link to="/voice" className={link} title="Train brand tone from your writing" aria-current={loc.pathname === "/voice" ? "page" : undefined}>
        Voice
      </Link>
      <Link to="/twin" className={link} title="Chat assistant with tools & workflows" aria-current={loc.pathname === "/twin" ? "page" : undefined}>
        Twin
      </Link>
    </nav>
  );
}
