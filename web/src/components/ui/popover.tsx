import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/** Above React Flow’s internal layers (~1001) & transformed/composited canvases. */
const STUDIO_POPOVER_Z = 2_147_483_647
const POPOVER_ROOT_ID = "studio-popover-root"

function studioPopoverMount(): HTMLElement {
  let el = document.getElementById(POPOVER_ROOT_ID)
  if (!el) {
    el = document.createElement("div")
    el.id = POPOVER_ROOT_ID
    el.dataset.studioPopoverMount = ""
    /** Full-viewport stacking shell — avoids losing to app layers that use backdrop-blur / isolate */
    Object.assign(el.style, {
      position: "fixed",
      inset: "0",
      zIndex: String(STUDIO_POPOVER_Z),
      pointerEvents: "none",
      overflow: "visible",
    })
    document.body.appendChild(el)
  }
  return el
}

interface Ctx {
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
}

const PopoverCtx = React.createContext<Ctx | null>(null);

export function usePopover() {
  const ctx = React.useContext(PopoverCtx);
  if (!ctx) throw new Error("usePopover must be used inside <Popover>");
  return { open: ctx.open, setOpen: ctx.setOpen };
}

export function Popover({
  children,
  defaultOpen = false,
  open: controlled,
  onOpenChange,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = controlled ?? uncontrolled;
  const setOpen = React.useCallback(
    (v: boolean) => {
      if (controlled === undefined) setUncontrolled(v);
      onOpenChange?.(v);
    },
    [controlled, onOpenChange],
  );
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const value = React.useMemo(() => ({ open, setOpen, triggerRef }), [open, setOpen]);
  return <PopoverCtx.Provider value={value}>{children}</PopoverCtx.Provider>;
}

export function PopoverTrigger({
  children,
  className,
  onClick,
  type = "button",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(PopoverCtx);
  if (!ctx) throw new Error("PopoverTrigger must be inside <Popover>");
  return (
    <button
      ref={ctx.triggerRef}
      type={type}
      className={className}
      aria-expanded={ctx.open}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        ctx.setOpen(!ctx.open);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function PopoverContent({
  className,
  align = "start",
  children,
}: {
  className?: string;
  align?: "start" | "end" | "center";
  children: React.ReactNode;
}) {
  const ctx = React.useContext(PopoverCtx);
  if (!ctx) throw new Error("PopoverContent must be inside <Popover>");
  const ref = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  React.useLayoutEffect(() => {
    if (!ctx.open || !ctx.triggerRef.current) return;

    const place = () => {
      const t = ctx.triggerRef.current;
      const panel = ref.current;
      if (!t) return;

      const r = t.getBoundingClientRect();
      const gap = 8;
      const pad = 8;
      let left = r.left;

      const w = panel?.offsetWidth || 280;
      if (align === "end") left = r.right - w;
      else if (align === "center") left = r.left + r.width / 2 - w / 2;

      left = Math.max(pad, Math.min(left, window.innerWidth - w - pad));

      setPosition({ top: r.bottom + gap, left });
    };

    place();
    const id = window.requestAnimationFrame(place);
    return () => window.cancelAnimationFrame(id);
  }, [ctx.open, ctx, align]);

  React.useEffect(() => {
    if (!ctx.open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (ctx.triggerRef.current?.contains(target)) return;
      ctx.setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ctx.setOpen(false);
    };
    window.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [ctx.open, ctx]);

  if (!ctx.open) return null;

  const node = (
    <div
      ref={ref}
      role="dialog"
      className={cn(
        "min-w-[14rem] rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-xl",
        className,
      )}
      style={{
        position: "fixed",
        pointerEvents: "auto",
        top: position.top,
        left: position.left,
        zIndex: STUDIO_POPOVER_Z,
        maxHeight: `min(420px, calc(100vh - ${position.top + 16}px))`,
      }}
    >
      {children}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(node, studioPopoverMount());
}

export function PopoverAnchor({ children }: { children: React.ReactNode }) {
  return <div className={cn("relative z-30 inline-flex shrink-0")}>{children}</div>;
}
