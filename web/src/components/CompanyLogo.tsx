import { useState } from "react";

import { cn } from "@/lib/utils";
import { logoDevImgUrl } from "@/lib/logoDev";

export function CompanyLogo({
  domain,
  label,
  size = 48,
  className,
  imgClassName,
  round,
}: {
  domain: string;
  label: string;
  size?: number;
  className?: string;
  imgClassName?: string;
  /** Pill / avatar style (matches marketing “logo in circle” look) */
  round?: boolean;
}) {
  const url = logoDevImgUrl(domain);
  const letter = label.trim().charAt(0).toUpperCase() || "?";
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center bg-muted text-sm font-bold text-foreground",
          round ? "rounded-full" : "rounded-2xl",
          className,
        )}
        style={{ width: size, height: size }}
        aria-hidden
      >
        {letter}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden bg-white",
        round ? "rounded-full" : "rounded-2xl",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn("max-h-full max-w-full object-contain p-1.5", round && "p-1", imgClassName)}
      />
    </div>
  );
}
