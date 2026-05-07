import {
  ArrowLeft,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Image,
  Lightbulb,
  Megaphone,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { MarkdownProse } from "@/components/MarkdownProse";
import { CompanyLogo } from "@/components/CompanyLogo";
import { HorizontalRunProgress } from "@/components/workflow/HorizontalRunProgress";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkflowRunLive } from "@/hooks/useWorkflowRunLive";
import { ImageGallery } from "@/components/results/ImageGallery";
import {
  extractCampaignDisplay,
  extractRunSections,
  type CampaignDisplayModel,
  type DisplayImageBlock,
  type EvidenceItemDisplay,
  type PlatformAssetDisplay,
  type TrendOpportunityDisplay,
} from "@/lib/runPayloadDisplay";
import {
  saveCampaignSnippet,
  savePersonaSnippet,
  summarizeCampaignFromDisplay,
  summarizePersonaFromDisplay,
} from "@/lib/creatorContextMemory";
import { platformLabelToLogoDomain } from "@/lib/logoDev";
import { cn } from "@/lib/utils";

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
      <div className="font-semibold text-foreground">{title}</div>
      <p className="mt-2 leading-6">{body}</p>
    </div>
  );
}

function TrendOpportunityCards({ trends }: { trends: TrendOpportunityDisplay[] }) {
  if (!trends.length) {
    return (
      <EmptyCard
        title="Trend opportunities will appear here"
        body="This run did not include structured trend cards yet. The campaign page will still show any usable draft outputs below."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {trends.map((trend, index) => (
        <article key={`${trend.title}-${index}`} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="outline" className="rounded-full text-[11px]">
              Opportunity {index + 1}
            </Badge>
            {trend.confidence ? <span className="text-xs font-semibold text-primary">{trend.confidence}</span> : null}
          </div>
          <h3 className="mt-4 text-lg font-semibold leading-7">{trend.title}</h3>
          {trend.whyNow ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{trend.whyNow}</p> : null}
          {trend.audience ? (
            <p className="mt-4 rounded-2xl bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
              Audience: {trend.audience}
            </p>
          ) : null}
          {trend.recommendedPlatforms.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {trend.recommendedPlatforms.map((platform) => {
                const d = platformLabelToLogoDomain(platform);
                return (
                  <span
                    key={platform}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold"
                  >
                    {d ? <CompanyLogo domain={d} label={platform} size={18} className="ring-1 ring-black/5" /> : null}
                    {platform}
                  </span>
                );
              })}
            </div>
          ) : null}
          {trend.risk ? <p className="mt-4 text-xs leading-5 text-muted-foreground">Watchout: {trend.risk}</p> : null}
        </article>
      ))}
    </div>
  );
}

function PlatformAssetCard({ asset }: { asset: PlatformAssetDisplay }) {
  const logoDomain = platformLabelToLogoDomain(asset.platform);
  return (
    <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {logoDomain ? (
            <CompanyLogo domain={logoDomain} label={asset.platform} size={36} className="ring-1 ring-black/5" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Megaphone className="h-4 w-4" />
            </span>
          )}
          <div>
            <h3 className="font-semibold">{asset.platform}</h3>
            {asset.format ? <p className="text-xs text-muted-foreground">{asset.format}</p> : null}
          </div>
        </div>
        <Badge variant="outline" className="rounded-full text-[11px]">Ready to adapt</Badge>
      </div>
      {asset.hook ? (
        <div className="mt-5 rounded-2xl bg-muted/40 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Hook</div>
          <p className="mt-2 text-sm font-semibold leading-6">{asset.hook}</p>
        </div>
      ) : null}
      <div className="mt-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Asset</div>
        <MarkdownProse content={asset.body} className="mt-2 text-sm" />
      </div>
      {asset.caption || asset.cta || asset.productionNotes ? (
        <dl className="mt-5 grid gap-3 border-t border-border pt-4 text-sm">
          {asset.caption ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Caption</dt>
              <dd className="mt-1 text-muted-foreground">{asset.caption}</dd>
            </div>
          ) : null}
          {asset.cta ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">CTA</dt>
              <dd className="mt-1 text-muted-foreground">{asset.cta}</dd>
            </div>
          ) : null}
          {asset.productionNotes ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Production notes</dt>
              <dd className="mt-1 text-muted-foreground">{asset.productionNotes}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </article>
  );
}

function EvidenceDrawer({ evidence }: { evidence: EvidenceItemDisplay[] }) {
  const [open, setOpen] = useState(false);
  if (!evidence.length) {
    return (
      <EmptyCard
        title="Evidence drawer"
        body="Structured source proof was not found in this run. Open workflow details to inspect raw research nodes."
      />
    );
  }

  return (
    <section className="rounded-3xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div>
          <h2 className="font-semibold">Why we think this works</h2>
          <p className="mt-1 text-sm text-muted-foreground">{evidence.length} source signals, collapsed for creator focus.</p>
        </div>
        <ChevronDown className={cn("h-5 w-5 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="grid gap-3 border-t border-border p-5 md:grid-cols-2">
          {evidence.map((item, index) => (
            <article key={`${item.title}-${index}`} className="rounded-2xl border border-border bg-background p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {item.source ?? "Source"}
                  </div>
                  <h3 className="mt-2 font-semibold leading-6">{item.title}</h3>
                </div>
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer" className="text-primary">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
              {item.metric ? <p className="mt-2 text-xs font-medium text-primary">{item.metric}</p> : null}
              {item.summary ? <p className="mt-3 leading-6 text-muted-foreground">{item.summary}</p> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CampaignWorkspace({
  model,
  runId,
  runStatus,
  generatedImages,
}: {
  model: CampaignDisplayModel;
  runId: string;
  runStatus?: string | null;
  generatedImages: DisplayImageBlock[];
}) {
  const defaultTab = model.platformAssets.length ? `${model.platformAssets[0].platform}-0` : "campaign";

  const onSavePersonaMemory = () => {
    const label = window.prompt("Label for this persona memory", model.topic ?? "My persona")?.trim();
    if (!label) return;
    savePersonaSnippet({ label, summary: summarizePersonaFromDisplay(model), sourceRunId: runId });
  };

  const onSaveCampaignMemory = () => {
    const label = window.prompt("Label for this campaign memory", model.topic ?? "My campaign")?.trim();
    if (!label) return;
    saveCampaignSnippet({ label, summary: summarizeCampaignFromDisplay(model), sourceRunId: runId });
  };

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-sm md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.13),transparent_45%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <Badge variant="outline" className="rounded-full bg-background/70">
              Creator campaign
            </Badge>
            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
              Your campaign{model.topic ? <> for <span className="text-primary">{model.topic}</span></> : null}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              {model.topRecommendation ??
                model.campaignBigIdea ??
                "Review the strongest campaign assets extracted from this workflow run."}
            </p>
            {model.selectedTrendTitle ? (
              <p className="mt-3 inline-flex rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-semibold text-muted-foreground">
                Selected trend: {model.selectedTrendTitle}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={`/results/${encodeURIComponent(runId)}`}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-semibold"
              >
                Workflow details
                <ExternalLink className="h-4 w-4" />
              </Link>
              <Link to="/campaigns" className="inline-flex h-10 items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background">
                Edit persona shell
              </Link>
              {runStatus === "completed" ? (
                <>
                  <button
                    type="button"
                    onClick={onSavePersonaMemory}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-900 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-100"
                  >
                    <Bookmark className="h-4 w-4" />
                    Save persona memory
                  </button>
                  <button
                    type="button"
                    onClick={onSaveCampaignMemory}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-50"
                  >
                    <Bookmark className="h-4 w-4" />
                    Save campaign memory
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-background/80 p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Written in your voice
            </div>
            {model.persona ? (
              <>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {model.persona.voiceSummary ?? "Persona profile detected for this campaign."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    ...model.persona.toneTraits,
                    ...model.persona.contentFormats.slice(0, 2),
                    ...(model.persona.audience ? [model.persona.audience] : []),
                  ]
                    .slice(0, 8)
                    .map((item) => (
                      <span key={item} className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                        {item}
                      </span>
                    ))}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                No structured persona was found yet. Use the onboarding shell to define tone, audience, and format preferences.
              </p>
            )}
          </div>
        </div>
      </section>

      {!model.hasCampaignShape ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
          This run does not contain the new campaign JSON contract yet, so Launchy is showing a creator-friendly fallback from
          existing workflow outputs.
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">Trend opportunities</h2>
        </div>
        <TrendOpportunityCards trends={model.trendOpportunities} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">Platform assets</h2>
        </div>
        {model.platformAssets.length ? (
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="h-auto max-w-full flex-wrap justify-start rounded-2xl bg-muted/50 p-1">
              {model.platformAssets.map((asset, index) => {
                const d = platformLabelToLogoDomain(asset.platform);
                return (
                  <TabsTrigger
                    key={`${asset.platform}-${index}`}
                    value={`${asset.platform}-${index}`}
                    className="flex items-center gap-2 rounded-xl"
                  >
                    {d ? <CompanyLogo domain={d} label={asset.platform} size={22} className="ring-1 ring-black/5" /> : null}
                    <span className="max-w-[10rem] truncate">{asset.platform}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {model.platformAssets.map((asset, index) => (
              <TabsContent key={`${asset.platform}-${index}`} value={`${asset.platform}-${index}`}>
                <PlatformAssetCard asset={asset} />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <EmptyCard title="No platform assets yet" body="Once campaign outputs use the structured contract, TikTok, Instagram, LinkedIn, and X assets will appear here." />
        )}
      </section>

      {generatedImages.length ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold tracking-tight">Generated images</h2>
          </div>
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <ImageGallery images={generatedImages} />
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold tracking-tight">Visual direction</h2>
          </div>
          {model.visualDirections.length ? (
            <div className="grid gap-4">
              {model.visualDirections.map((visual, index) => (
                <article key={`${visual.title}-${index}`} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="font-semibold">{visual.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{visual.prompt}</p>
                  {visual.notes.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {visual.notes.map((note) => (
                        <span key={note} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                          {note}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyCard title="Visual prompts coming next" body="Structured visual direction was not found in this run." />
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold tracking-tight">Posting sequence</h2>
          </div>
          {model.postingPlan.length ? (
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              {model.postingPlan.map((item, index) => (
                <div key={`${item.timing}-${index}`} className="flex gap-4 border-b border-border py-4 last:border-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">
                      {item.timing}
                      {item.channel ? <span className="text-muted-foreground"> · {item.channel}</span> : null}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.action}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyCard title="Schedule not included" body="The next campaign workflow pass can emit launch timing and repurposing steps here." />
          )}
        </div>
      </section>

      <EvidenceDrawer evidence={model.evidence} />
    </main>
  );
}

export default function CampaignPage() {
  const { runId = "" } = useParams<{ runId: string }>();
  const { payload, loading, err, runUi, nodeIdsOrdered, nodeTypesById, meta, busy } = useWorkflowRunLive(
    runId || undefined,
  );
  const model = useMemo(() => extractCampaignDisplay(payload), [payload]);
  const generatedImages = useMemo(() => extractRunSections(payload).images, [payload]);

  if (loading && !payload) {
    return (
      <div className="min-h-full overflow-hidden bg-[#fdf7ee] text-foreground dark:bg-background">
        <div className="pointer-events-none fixed inset-0 -z-20 dark:opacity-50">
          <div className="absolute -top-32 left-[-10%] h-[480px] w-[480px] rounded-full bg-fuchsia-300/40 blur-[140px]" />
          <div className="absolute top-0 right-[-10%] h-[520px] w-[520px] rounded-full bg-amber-300/40 blur-[160px]" />
        </div>
        <header className="relative z-30 mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-orange-400 to-amber-300 text-white shadow-md">
              <Sparkles className="h-4 w-4" />
            </span>
            Launchy
          </Link>
          <ThemeToggle />
        </header>
        <div className="mx-auto max-w-7xl px-4 py-12">
          <Skeleton className="h-8 w-56 rounded-md" />
          <Skeleton className="mt-8 h-72 rounded-[2rem]" />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-48 rounded-3xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (err || !payload) {
    return (
      <div className="min-h-full overflow-hidden bg-[#fdf7ee] px-4 py-14 dark:bg-background">
        <div className="mx-auto max-w-lg rounded-3xl border border-white/80 bg-white/90 p-6 text-center shadow-lg shadow-rose-200/30 dark:border-border dark:bg-card">
          <p className="text-sm text-muted-foreground">{err ?? "Nothing to show yet."}</p>
          <Link
            className="mt-6 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
            to="/campaigns"
          >
            Back to campaigns
          </Link>
        </div>
      </div>
    );
  }

  const showProgress = nodeIdsOrdered.length > 0;

  return (
    <div className="min-h-full overflow-hidden bg-[#fdf7ee] pb-16 font-sans text-foreground antialiased dark:bg-background">
      <div className="pointer-events-none fixed inset-0 -z-20 dark:opacity-50">
        <div className="absolute -top-32 left-[-10%] h-[480px] w-[480px] rounded-full bg-fuchsia-300/40 blur-[140px]" />
        <div className="absolute top-0 right-[-10%] h-[520px] w-[520px] rounded-full bg-amber-300/40 blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[20%] h-[420px] w-[420px] rounded-full bg-emerald-300/35 blur-[140px]" />
      </div>

      <header className="relative z-30 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5">
        <div className="min-w-0">
          <Link
            to="/campaigns"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600 hover:text-zinc-950 dark:text-muted-foreground dark:hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Campaigns
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-950 md:text-xl dark:text-foreground">
              Creator campaign workspace
            </h1>
            {meta.status ? (
              <Badge variant="outline" className="gap-1 rounded-full text-[11px]">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                {meta.status}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/"
            className="hidden h-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-4 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white sm:inline-flex dark:border-border dark:bg-card dark:text-foreground"
          >
            Home
          </Link>
          <Link
            to={`/studio?run=${encodeURIComponent(runId)}`}
            title="Open this campaign's workflow on the canvas with the same inputs and node settings"
            className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-4 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white dark:border-border dark:bg-card dark:text-foreground"
          >
            Studio
          </Link>
        </div>
      </header>

      {showProgress ? (
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-4">
          <div className="overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/85 shadow-lg shadow-rose-200/30 backdrop-blur dark:border-border dark:bg-card/95">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/60 px-3 py-2 dark:border-border">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-600">Run progress</span>
              {busy ? (
                <Badge variant="outline" className="animate-pulse border-primary/35 text-[10px] normal-case">
                  Running
                </Badge>
              ) : null}
              {meta.error ? (
                <span className="max-w-[min(320px,70vw)] truncate text-[11px] text-destructive" title={meta.error}>
                  {meta.error}
                </span>
              ) : null}
            </div>
            <HorizontalRunProgress
              nodeIdsOrdered={nodeIdsOrdered}
              nodeTypesById={nodeTypesById}
              nodeRunUi={runUi}
              busy={busy}
            />
          </div>
        </div>
      ) : null}

      <CampaignWorkspace model={model} runId={runId} runStatus={meta.status} generatedImages={generatedImages} />
    </div>
  );
}
