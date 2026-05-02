import { useCallback, useState, type ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyBtnProps = {
  text: string;
  label?: string;
  className?: string;
  size?: ComponentProps<typeof Button>["size"];
};

export function CopyTextButton({
  text,
  label = "Copy",
  className,
  variant = "outline",
  size = "sm",
}: CopyBtnProps & { variant?: ComponentProps<typeof Button>["variant"] }) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [text]);

  return (
    <Button
      type="button"
      variant={copied ? "secondary" : variant}
      size={size}
      className={cn("shrink-0 gap-1.5 font-medium", className)}
      onClick={() => void onCopy()}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}
