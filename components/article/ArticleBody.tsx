"use client";

import { useMemo } from "react";
import type { ArticleBlock } from "@/lib/types/article";
import {
  isLikelyHtml,
  normalizeArticleContentHtml,
} from "@/lib/articles/html-content";
import { ArticleHtmlBody } from "@/components/article/ArticleHtmlBody";
import { TwitterEmbedPlaceholder } from "@/components/article/embeds/TwitterEmbedPlaceholder";
import { YouTubeEmbedPlaceholder } from "@/components/article/embeds/YouTubeEmbedPlaceholder";

type Props = {
  blocks?: ArticleBlock[];
  contentHtml?: string;
};

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-trnet-text">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return (
        <em key={i} className="italic text-trnet-text/90">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function renderParagraph(text: string, key: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("### ")) {
    return (
      <h3 key={key} className="mb-4 mt-8 font-display text-xl font-semibold text-trnet-text">
        {renderInlineMarkdown(trimmed.slice(4))}
      </h3>
    );
  }
  if (trimmed.startsWith("## ")) {
    return (
      <h2 key={key} className="mb-4 mt-10 font-display text-2xl font-semibold text-trnet-text">
        {renderInlineMarkdown(trimmed.slice(3))}
      </h2>
    );
  }
  if (trimmed.startsWith("# ")) {
    return (
      <h1 key={key} className="mb-4 mt-10 font-display text-3xl font-semibold text-trnet-text">
        {renderInlineMarkdown(trimmed.slice(2))}
      </h1>
    );
  }

  if (/^[-*]\s+/.test(trimmed)) {
    const items = trimmed.split("\n").filter((line) => /^[-*]\s+/.test(line.trim()));
    return (
      <ul key={key} className="mb-6 list-disc space-y-2 pl-6 text-lg leading-loose text-trnet-text">
        {items.map((line, index) => (
          <li key={`${key}-${index}`}>{renderInlineMarkdown(line.replace(/^[-*]\s+/, ""))}</li>
        ))}
      </ul>
    );
  }

  return (
    <p key={key} className="mb-6 text-lg leading-loose text-trnet-text last:mb-0">
      {renderInlineMarkdown(trimmed)}
    </p>
  );
}

function LegacyArticleBody({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className="article-prose mx-auto max-w-3xl px-4 pb-12 pt-0 sm:px-6 md:max-w-4xl sm:pb-14">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "paragraph":
            return renderParagraph(block.text, `p-${index}`);
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

export function ArticleBody({ blocks = [], contentHtml }: Props) {
  const htmlForRender = useMemo(() => {
    const raw = contentHtml?.trim() ?? "";
    if (!raw) return "";
    return normalizeArticleContentHtml(raw);
  }, [contentHtml]);

  if (htmlForRender) {
    return <ArticleHtmlBody html={htmlForRender} />;
  }

  const raw = contentHtml?.trim() ?? "";
  if (raw && (isLikelyHtml(raw) || /<[a-z!/]/i.test(raw))) {
    return <ArticleHtmlBody html={raw} />;
  }

  if (blocks.length > 0) {
    return <LegacyArticleBody blocks={blocks} />;
  }

  return null;
}
