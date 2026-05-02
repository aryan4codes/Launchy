import * as React from "react";

import { Command as CmdkRoot } from "cmdk";

import { cn } from "@/lib/utils";

export function CommandPalette({
  className,
  ...props
}: React.ComponentProps<typeof CmdkRoot>) {
  return (
    <CmdkRoot
      className={cn(
        "overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-md",
        className,
      )}
      {...props}
    />
  );
}

export function CommandPaletteInput(props: React.ComponentProps<typeof CmdkRoot.Input>) {
  return (
    <div className="flex items-center border-b border-zinc-800 px-3" cmdk-input-wrapper="">
      <CmdkRoot.Input
        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-zinc-500 disabled:opacity-50"
        {...props}
      />
    </div>
  );
}

export function CommandPaletteList(props: React.ComponentProps<typeof CmdkRoot.List>) {
  return <CmdkRoot.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1" {...props} />;
}

export function CommandPaletteEmpty(props: React.ComponentProps<typeof CmdkRoot.Empty>) {
  return <CmdkRoot.Empty className="py-6 text-center text-sm text-zinc-500" {...props} />;
}

export function CommandPaletteGroup(props: React.ComponentProps<typeof CmdkRoot.Group>) {
  return (
    <CmdkRoot.Group
      className="overflow-hidden px-1 py-1 text-zinc-300 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500"
      {...props}
    />
  );
}

export function CommandPaletteItem({
  className,
  ...props
}: React.ComponentProps<typeof CmdkRoot.Item>) {
  return (
    <CmdkRoot.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-zinc-800 data-[selected=true]:text-zinc-50",
        className,
      )}
      {...props}
    />
  );
}
