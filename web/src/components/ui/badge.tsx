import * as React from "react";

import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "muted";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const styles =
    variant === "outline"
      ? "border border-border text-foreground"
      : variant === "muted"
        ? "bg-muted text-muted-foreground"
        : "bg-primary/15 text-primary border border-primary/30";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        styles,
        className,
      )}
      {...props}
    />
  );
}
