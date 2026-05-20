import { Play } from "lucide-react";

type Props = {
  embedId: string;
};

/** CLS: 16:9 video alanı rezervi */
export function YouTubeEmbedPlaceholder({ embedId }: Props) {
  return (
    <figure
      className="my-10 overflow-hidden rounded-2xl border border-black/[0.08] bg-trnet-black shadow-lg"
      aria-label="YouTube videosu yer tutucu"
      data-embed-id={embedId}
    >
      <div className="relative aspect-video w-full bg-neutral-900">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-neutral-800 to-neutral-950" aria-hidden />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur">
            <Play className="h-7 w-7 fill-white text-white" aria-hidden />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent" aria-hidden />
      </div>
      <figcaption className="sr-only">YouTube videosu yüklenecek: {embedId}</figcaption>
    </figure>
  );
}
