import type { ArticleBlock } from "@/lib/types/article";
import { TwitterEmbedPlaceholder } from "@/components/article/embeds/TwitterEmbedPlaceholder";
import { YouTubeEmbedPlaceholder } from "@/components/article/embeds/YouTubeEmbedPlaceholder";

type Props = {
  blocks: ArticleBlock[];
};

export function ArticleBody({ blocks }: Props) {
  return (
    <div className="article-prose mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-14 lg:py-16">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p
                key={`p-${index}`}
                className="mb-6 text-lg leading-relaxed text-trnet-text last:mb-0"
              >
                {block.text}
              </p>
            );
          case "twitter":
            return <TwitterEmbedPlaceholder key={block.embedId} embedId={block.embedId} />;
          case "youtube":
            return <YouTubeEmbedPlaceholder key={block.embedId} embedId={block.embedId} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
