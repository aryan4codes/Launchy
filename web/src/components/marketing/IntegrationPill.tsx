import { CompanyLogo } from "@/components/CompanyLogo";

export function IntegrationPill({
  label,
  domain,
  tint,
  accent,
}: {
  label: string;
  domain: string;
  tint?: string;
  accent?: string;
}) {
  return (
    <div
      className="group relative inline-flex min-w-[150px] items-center gap-3 overflow-hidden rounded-full border border-zinc-200/80 bg-white py-2 pl-2 pr-5 text-zinc-900 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] ring-1 ring-zinc-950/5 transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-12px_rgba(0,0,0,0.22)]"
      title={label}
      style={tint ? { background: `linear-gradient(120deg, ${tint} 0%, #ffffff 70%)` } : undefined}
    >
      <CompanyLogo
        domain={domain}
        label={label}
        size={40}
        round
        className="shrink-0 ring-2 ring-white shadow-md"
        imgClassName="opacity-100"
      />
      <span className="truncate text-left text-sm font-semibold text-zinc-900">{label}</span>
      {accent ? (
        <span
          aria-hidden
          className="absolute right-3 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full"
          style={{ background: accent, boxShadow: `0 0 0 4px ${accent}1A` }}
        />
      ) : null}
    </div>
  );
}
