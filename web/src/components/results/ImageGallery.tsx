import { CopyTextButton } from "@/components/CopyTextButton";
import type { DisplayImageBlock } from "@/lib/runPayloadDisplay";

export function ImageGallery({ images }: { images: DisplayImageBlock[] }) {
  if (images.length === 0) return null;

  return (
    <div className="px-5 py-4">
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {images.map((im) => (
          <figure
            key={`${im.path}-${im.nodeLabel}`}
            className="overflow-hidden rounded-xl border border-border bg-muted/20 shadow-sm"
          >
            <a
              href={im.href}
              target="_blank"
              rel="noreferrer"
              className="block p-3"
            >
              <img
                src={im.href}
                alt=""
                className="mx-auto max-h-[min(48vh,400px)] w-auto max-w-full rounded-lg object-contain"
              />
            </a>
            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-3 py-2.5">
              <p className="flex-1 text-[11px] text-muted-foreground">
                Source: <span className="font-medium text-foreground">{im.nodeLabel}</span>
              </p>
              <CopyTextButton text={im.copyHref} label="Copy URL" size="sm" variant="ghost" />
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}
