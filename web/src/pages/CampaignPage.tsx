import {
  ArrowLeft,
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
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { MarkdownProse } from "@/components/MarkdownProse";
import { CompanyLogo } from "@/components/CompanyLogo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getWorkflowRun } from "@/lib/api";
import {
  extractCampaignDisplay,
  parseRunMeta,
  type CampaignDisplayModel,
  type EvidenceItemDisplay,
  type PlatformAssetDisplay,
  type TrendOpportunityDisplay,
} from "@/lib/runPayloadDisplay";
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

function CampaignWorkspace({ model, runId }: { model: CampaignDisplayModel; runId: string }) {
  const defaultTab = model.platformAssets.length ? `${model.platformAssets[0].platform}-0` : "campaign";
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
  const [payload, setPayload] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) {
      setErr("Missing run id");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void getWorkflowRun(runId)
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Could not load this campaign.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const meta = useMemo(() => parseRunMeta(payload), [payload]);
  const model = useMemo(() => extractCampaignDisplay(payload), [payload]);

  if (loading) {
    return (
      <div className="min-h-full bg-background">
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
      <div className="min-h-full bg-background px-4 py-14">
        <div className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">{err ?? "Nothing to show yet."}</p>
          <Link className="mt-6 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline" to="/campaigns">
            Back to campaigns
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#fbfaf6] pb-16 dark:bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <Link to="/campaigns" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              Campaigns
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight md:text-xl">Creator campaign workspace</h1>
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
            <Link to="/studio" className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm">
              Studio
            </Link>
          </div>
        </div>
      </header>
      <CampaignWorkspace model={model} runId={runId} />
    </div>
  );
}
