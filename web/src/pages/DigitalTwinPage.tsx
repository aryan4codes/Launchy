import { MessageCircle, Mic, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";

import TwinChatView from "@/components/creator/TwinChatView";
import VoiceStudioView from "@/components/creator/VoiceStudioView";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Unified creator surface: train voice (Instagram + text) and Twin chat with one active profile. */
export default function DigitalTwinPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam === "train" ? "train" : "chat";

  useEffect(() => {
    if (tabParam && tabParam !== "train") {
      setSearchParams({}, { replace: true });
    }
  }, [tabParam, setSearchParams]);

  const onTabChange = (v: string) => {
    if (v === "train") {
      setSearchParams({ tab: "train" }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#fdf7ee] text-foreground dark:bg-background">
      <div className="pointer-events-none fixed inset-0 -z-20 dark:opacity-50">
        <div className="absolute -top-28 left-[-8%] h-[460px] w-[460px] rounded-full bg-fuchsia-300/35 blur-[140px]" />
        <div className="absolute top-16 right-[-10%] h-[500px] w-[500px] rounded-full bg-amber-300/35 blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[12%] h-[400px] w-[400px] rounded-full bg-emerald-300/28 blur-[140px]" />
      </div>

      <header className="relative z-40 mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 text-white shadow-md shadow-rose-300/40">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="truncate">
            Launchy{" "}
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent">
              Digital Twin
            </span>
          </span>
        </Link>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
          <ThemeToggle />
          <Link
            to="/campaigns"
            className="hidden h-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-3 text-xs font-semibold text-zinc-900 shadow-sm backdrop-blur sm:inline-flex dark:border-border dark:bg-card dark:text-foreground"
          >
            Campaigns
          </Link>
          <Link
            to="/studio"
            className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-3 text-xs font-semibold text-zinc-900 shadow-sm backdrop-blur dark:border-border dark:bg-card dark:text-foreground"
          >
            Studio
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-6">
        <div className="relative overflow-hidden rounded-[2.75rem] border border-white/70 bg-gradient-to-br from-white/95 via-fuchsia-50/40 to-amber-50/35 px-6 py-8 text-center shadow-xl shadow-fuchsia-200/25 dark:border-border dark:from-card dark:via-fuchsia-950/25 dark:to-amber-950/15 dark:shadow-none sm:py-9">
          <div className="pointer-events-none absolute -left-20 top-0 h-40 w-40 rounded-full bg-fuchsia-300/30 blur-3xl dark:opacity-40" />
          <div className="pointer-events-none absolute -bottom-16 -right-12 h-44 w-44 rounded-full bg-amber-300/30 blur-3xl dark:opacity-35" />
          <div className="relative">
            <div className="inline-flex items-center justify-center rounded-full border border-amber-200/80 bg-amber-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800 shadow-sm dark:border-amber-500/40 dark:bg-amber-950/50 dark:text-amber-200">
              One hub
            </div>
            <h1 className="font-display mt-4 text-balance text-3xl font-semibold italic tracking-tight text-zinc-950 dark:text-foreground sm:text-4xl">
              Your voice in the room.
              <span className="mt-1 block bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 bg-clip-text not-italic text-transparent sm:mt-0 sm:inline sm:px-2">
                Your twin on demand.
              </span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-zinc-600 dark:text-muted-foreground">
              Train your tone — then ask for hooks, rewrites, and launches.
            </p>
          </div>
        </div>
      </section>

      <Tabs value={defaultTab} onValueChange={onTabChange} className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-8 min-h-0">
        <TabsList className="mx-auto mb-8 grid h-auto w-full max-w-lg grid-cols-2 gap-1 rounded-full border border-white/80 bg-white/90 p-1.5 shadow-lg shadow-fuchsia-200/30 backdrop-blur-md dark:border-border dark:bg-card/95 dark:shadow-none">
          <TabsTrigger
            value="train"
            className="rounded-full px-3 py-3 text-sm font-semibold transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-fuchsia-500 data-[state=active]:to-orange-400 data-[state=active]:text-white data-[state=inactive]:text-zinc-600 data-[state=inactive]:dark:text-muted-foreground"
          >
            <Mic className="mr-1.5 inline h-4 w-4" />
            Train voice
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="rounded-full px-3 py-3 text-sm font-semibold transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-sky-500 data-[state=active]:text-white data-[state=inactive]:text-zinc-600 data-[state=inactive]:dark:text-muted-foreground"
          >
            <MessageCircle className="mr-1.5 inline h-4 w-4" />
            Twin chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="train" className="mt-0 min-h-0 flex-1 focus-visible:outline-none">
          <VoiceStudioView embedded twinTabLink="?tab=chat" />
        </TabsContent>

        <TabsContent value="chat" className="mt-0 flex min-h-[56dvh] min-w-0 flex-1 flex-col focus-visible:outline-none">
          <TwinChatView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
