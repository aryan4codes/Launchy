import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type LocalStorageConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` — warm destructive gradient; `neutral` — primary-style confirm */
  tone?: "danger" | "neutral";
};

export type LocalStoragePromptOptions = {
  title: string;
  message?: React.ReactNode;
  /** Short label above the input */
  fieldLabel?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmState = LocalStorageConfirmOptions & {
  kind: "confirm";
  resolve: (v: boolean) => void;
};

type PromptState = LocalStoragePromptOptions & {
  kind: "prompt";
  resolve: (v: string | null) => void;
};

type DialogState = ConfirmState | PromptState | null;

const LocalStorageDialogsContext = React.createContext<{
  confirmAction: (opts: LocalStorageConfirmOptions) => Promise<boolean>;
  promptText: (opts: LocalStoragePromptOptions) => Promise<string | null>;
} | null>(null);

function supersedePrevious(prev: DialogState) {
  if (prev?.kind === "confirm") prev.resolve(false);
  if (prev?.kind === "prompt") prev.resolve(null);
}

export function LocalStorageDialogsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>(null);
  const stateRef = React.useRef<DialogState>(null);
  const skipDismissRef = React.useRef(false);
  stateRef.current = state;

  const confirmAction = React.useCallback((opts: LocalStorageConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState((prev) => {
        supersedePrevious(prev);
        return { kind: "confirm", ...opts, resolve };
      });
    });
  }, []);

  const promptText = React.useCallback((opts: LocalStoragePromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setState((prev) => {
        supersedePrevious(prev);
        return { kind: "prompt", ...opts, resolve };
      });
    });
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (open) return;
    if (skipDismissRef.current) {
      skipDismissRef.current = false;
      return;
    }
    const s = stateRef.current;
    if (s?.kind === "confirm") s.resolve(false);
    if (s?.kind === "prompt") s.resolve(null);
    setState(null);
  }, []);

  const resolveConfirm = React.useCallback((value: boolean) => {
    const s = stateRef.current;
    if (s?.kind === "confirm") s.resolve(value);
    skipDismissRef.current = true;
    setState(null);
  }, []);

  const resolvePrompt = React.useCallback((value: string | null) => {
    const s = stateRef.current;
    if (s?.kind === "prompt") s.resolve(value);
    skipDismissRef.current = true;
    setState(null);
  }, []);

  return (
    <LocalStorageDialogsContext.Provider value={{ confirmAction, promptText }}>
      {children}
      <Dialog open={state !== null} onOpenChange={handleOpenChange}>
        {state?.kind === "confirm" ? (
          <ConfirmBody state={state} onResolve={resolveConfirm} />
        ) : null}
        {state?.kind === "prompt" ? (
          <PromptBody state={state} onResolve={resolvePrompt} />
        ) : null}
      </Dialog>
    </LocalStorageDialogsContext.Provider>
  );
}

function ConfirmBody({
  state,
  onResolve,
}: {
  state: ConfirmState;
  onResolve: (v: boolean) => void;
}) {
  const tone = state.tone ?? "neutral";
  return (
    <DialogContent
      hideClose
      className={cn(
        "max-w-md overflow-hidden rounded-[1.75rem] border-fuchsia-200/90 bg-gradient-to-br from-fuchsia-50/95 via-white to-amber-50/90 p-0 text-zinc-950 shadow-2xl shadow-fuchsia-200/40 dark:border-border dark:from-card dark:via-card dark:to-card dark:text-foreground dark:shadow-none",
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-fuchsia-300/35 blur-3xl dark:opacity-30" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-amber-300/30 blur-3xl dark:opacity-25" />
      <div className="relative p-6 sm:p-7">
        <DialogHeader>
          <div className="inline-flex w-fit rounded-full border border-amber-200/90 bg-amber-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            Confirm
          </div>
          <DialogTitle className="font-display mt-4 text-balance text-xl font-semibold italic tracking-tight sm:text-2xl">
            {state.title}
          </DialogTitle>
          {state.description ? (
            <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-muted-foreground">{state.description}</p>
          ) : null}
        </DialogHeader>
        <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-zinc-200 bg-white/90 dark:border-border dark:bg-background"
            onClick={() => onResolve(false)}
          >
            {state.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            type="button"
            className={cn(
              "rounded-full font-semibold text-white shadow-lg",
              tone === "danger"
                ? "bg-gradient-to-r from-rose-500 to-orange-500 shadow-rose-400/35 hover:opacity-95"
                : "bg-gradient-to-r from-fuchsia-500 to-violet-600 shadow-fuchsia-400/30 hover:opacity-95",
            )}
            onClick={() => onResolve(true)}
          >
            {state.confirmLabel ?? "Continue"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function PromptBody({
  state,
  onResolve,
}: {
  state: PromptState;
  onResolve: (v: string | null) => void;
}) {
  const [value, setValue] = React.useState(state.defaultValue ?? "");

  React.useEffect(() => {
    setValue(state.defaultValue ?? "");
  }, [state]);

  const submit = React.useCallback(() => {
    onResolve(value.trim().length ? value.trim() : null);
  }, [value, onResolve]);

  return (
    <DialogContent
      hideClose
      className="max-w-md overflow-hidden rounded-[1.75rem] border-violet-200/90 bg-gradient-to-br from-violet-50/95 via-white to-sky-50/90 p-0 text-zinc-950 shadow-2xl shadow-violet-200/40 dark:border-border dark:from-card dark:via-card dark:to-card dark:text-foreground dark:shadow-none"
    >
      <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-violet-300/35 blur-3xl dark:opacity-30" />
      <div className="pointer-events-none absolute -bottom-14 left-0 h-44 w-44 rounded-full bg-sky-300/28 blur-3xl dark:opacity-25" />
      <div className="relative p-6 sm:p-7">
        <DialogHeader>
          <div className="inline-flex w-fit rounded-full border border-violet-200/90 bg-violet-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-100">
            Save locally
          </div>
          <DialogTitle className="font-display mt-4 text-balance text-xl font-semibold italic tracking-tight sm:text-2xl">
            {state.title}
          </DialogTitle>
          {state.message ? (
            <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-muted-foreground">{state.message}</p>
          ) : null}
        </DialogHeader>
        <label className="mt-6 grid gap-2 text-sm font-medium text-zinc-900 dark:text-foreground">
          <span>{state.fieldLabel ?? "Label"}</span>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            className="rounded-xl border-violet-200 bg-white dark:border-border dark:bg-background"
            autoFocus
            autoComplete="off"
          />
        </label>
        <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-zinc-200 bg-white/90 dark:border-border dark:bg-background"
            onClick={() => onResolve(null)}
          >
            {state.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            type="button"
            className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 font-semibold text-white shadow-lg shadow-fuchsia-400/30 hover:opacity-95"
            onClick={submit}
          >
            {state.confirmLabel ?? "Save"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

export function useLocalStorageDialogs() {
  const ctx = React.useContext(LocalStorageDialogsContext);
  if (!ctx) {
    throw new Error("useLocalStorageDialogs must be used within LocalStorageDialogsProvider");
  }
  return ctx;
}
