"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SafeImage } from "@/components/ui/SafeImage";
import { EDITORIAL_IMAGE_CLASS } from "@/lib/images/editorial-image";
const HOMEPAGE_SETTINGS_STORAGE_KEY = "trnethaber-homepage-settings";

type HomepageLayoutSettings = {
  topHeadline: { enabled: boolean; aiAuto: boolean };
  mostRead: { enabled: boolean; aiAuto: boolean };
};

const DEFAULT_HOMEPAGE_LAYOUT: HomepageLayoutSettings = {
  topHeadline: { enabled: true, aiAuto: false },
  mostRead: { enabled: true, aiAuto: false },
};

function readHomepageLayoutSettings(): HomepageLayoutSettings {
  if (typeof window === "undefined") return DEFAULT_HOMEPAGE_LAYOUT;
  try {
    const raw = window.localStorage.getItem(HOMEPAGE_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_HOMEPAGE_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<HomepageLayoutSettings>;
    return {
      topHeadline: {
        enabled: parsed.topHeadline?.enabled ?? DEFAULT_HOMEPAGE_LAYOUT.topHeadline.enabled,
        aiAuto: parsed.topHeadline?.aiAuto ?? DEFAULT_HOMEPAGE_LAYOUT.topHeadline.aiAuto,
      },
      mostRead: {
        enabled: parsed.mostRead?.enabled ?? DEFAULT_HOMEPAGE_LAYOUT.mostRead.enabled,
        aiAuto: parsed.mostRead?.aiAuto ?? DEFAULT_HOMEPAGE_LAYOUT.mostRead.aiAuto,
      },
    };
  } catch {
    return DEFAULT_HOMEPAGE_LAYOUT;
  }
}
import { BreakingTicker } from "@/components/layout/BreakingTicker";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AdSlotReserve } from "@/components/home/AdSlotReserve";
import { HomeHero } from "@/components/home/HomeHero";
import { NewsCard } from "@/components/home/NewsCard";
import Sidebar from "@/components/Sidebar";
import { coerceViewCount } from "@/lib/articles/view-count-db";
import { haberArticleHref, normalizeHomeCard } from "@/lib/articles/list-card";
import { safeSlug, safeText } from "@/lib/safe-display";
import { categoryHref } from "@/lib/data/nav-categories";
import { buildFeedDisplay } from "@/lib/home/feed-layout";
import { HOME_VISIBLE_H1 } from "@/lib/seo/site-metadata";
import { resolveCoverImageSrc } from "@/lib/images/cover";
import type { HomeCard, HomeHeroSlide } from "@/lib/types/home";

const PAGE_SIZE = 12;
/** Kategori başına son + 4 haber için yeterli veri */
const FEED_INITIAL_SIZE = 72;
const AUTO_REFRESH_MS = 180_000;

type FeedStatus = "idle" | "loading" | "ready" | "error";

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  spot_metni: string | null;
  kapak_gorseli: string | null;
  view_count?: number | null;
  is_breaking: boolean | null;
  published_at: string | null;
  created_at?: string | null;
  category_id: string | null;
  categories?:
    | { slug: string; name: string }
    | { slug: string; name: string }[]
    | null;
};

function coverAlt(title: string): string {
  return `${safeText(title, "Haber")} kapak görseli`;
}

function resolveCategoryName(row: ArticleRow): string {
  const embedded = row.categories;
  if (!embedded) return "";
  if (Array.isArray(embedded)) return embedded[0]?.name ?? "";
  return embedded.name ?? "";
}

function resolveCategorySlug(row: ArticleRow): string {
  const embedded = row.categories;
  if (!embedded) return "";
  if (Array.isArray(embedded)) return embedded[0]?.slug ?? "";
  return embedded.slug ?? "";
}

function toHomeCard(row: ArticleRow): HomeCard {
  const title = safeText(row.title, "Haber");
  return normalizeHomeCard({
    id: safeText(row.id, row.slug ?? "card"),
    slug: safeSlug(row.slug, "haber"),
    title,
    dek: safeText(row.spot_metni),
    category: resolveCategoryName(row) || "Gündem",
    categorySlug: resolveCategorySlug(row) || "gundem",
    viewCount: coerceViewCount(row.view_count),
    imageSrc: resolveCoverImageSrc(row.kapak_gorseli),
    imageAlt: coverAlt(title),
    hasCoverImage: Boolean(row.kapak_gorseli?.trim()),
  });
}

function hashSlug(slug: string): number {
  return slug.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function pickByViewCount(cards: HomeCard[], count: number, offset = 0): HomeCard[] {
  if (cards.length === 0) return [];
  const ranked = [...cards].sort(
    (a, b) =>
      b.viewCount - a.viewCount ||
      Number(b.hasCoverImage) - Number(a.hasCoverImage) ||
      hashSlug(b.slug) - hashSlug(a.slug),
  );
  return ranked.slice(offset, offset + count);
}

const MOST_READ_COUNT = 2;

function pickMostReadFallback(cards: HomeCard[]): HomeCard[] {
  if (cards.length === 0) return [];
  return pickByViewCount(cards, MOST_READ_COUNT, 0);
}

function mergeUniqueCards(existing: HomeCard[], incoming: HomeCard[]): HomeCard[] {
  const seen = new Set(existing.map((c) => c.id));
  const merged = [...existing];
  for (const card of incoming) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    merged.push(card);
  }
  return merged;
}

function prependUniqueCards(existing: HomeCard[], incoming: HomeCard[]): HomeCard[] {
  const seen = new Set(existing.map((c) => c.id));
  const prepended: HomeCard[] = [];
  for (const card of incoming) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    prepended.push(card);
  }
  return [...prepended, ...existing];
}

const FEED_FETCH_TIMEOUT_MS = 18_000;

async function fetchArticlePage(
  from: number,
  to: number,
): Promise<{ rows: ArticleRow[]; error: string | null }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<{ rows: ArticleRow[]; error: string }>((resolve) => {
    timer = setTimeout(
      () =>
        resolve({
          rows: [],
          error:
            "Haberler zaman aşımına uğradı. Sayfayı yenileyin veya biraz bekleyip tekrar deneyin.",
        }),
      FEED_FETCH_TIMEOUT_MS,
    );
  });

  const fetchApi = async (): Promise<{ rows: ArticleRow[]; error: string | null }> => {
    try {
      const params = new URLSearchParams({
        from: String(from),
        to: String(to),
      });
      const res = await fetch(`/api/home/feed?${params}`, { cache: "no-store" });
      if (!res.ok) {
        return { rows: [], error: `Akış yüklenemedi (${res.status})` };
      }
      const data = (await res.json()) as {
        rows?: ArticleRow[];
        error?: string | null;
      };
      return { rows: data.rows ?? [], error: data.error ?? null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bağlantı hatası";
      return { rows: [], error: message };
    }
  };

  const result = await Promise.race([fetchApi(), timeout]);
  if (timer) clearTimeout(timer);
  return result;
}

const TOP_HEADLINE_CARD_COUNT = 4;

function TopHeadlineStrip({ cards }: { cards: HomeCard[] }) {
  const displayCards = cards.slice(0, TOP_HEADLINE_CARD_COUNT);
  if (displayCards.length === 0) return null;

  return (
    <section
      className="mx-auto mb-6 max-w-7xl px-4 pt-4 pb-0 sm:px-6 md:mb-10 md:pt-5 lg:mb-12 lg:px-8"
      aria-label="Üst manşet"
    >
      <div className="flex flex-col gap-4 md:flex-row md:gap-3 lg:gap-4">
        {displayCards.map((card, index) => (
          <Link
            key={card.id}
            href={haberArticleHref(card.slug)}
            className="group flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-trnet-black shadow-[0_12px_32px_rgba(0,0,0,0.35)] transition hover:border-trnet-primary/40 md:flex-1"
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#1a1a1a] md:aspect-[16/10]">
              <SafeImage
                src={card.imageSrc}
                alt={card.imageAlt}
                fill
                placeholderVariant="dark"
                sizes="(min-width: 768px) 25vw, 100vw"
                className={`${EDITORIAL_IMAGE_CLASS} transition-transform duration-500 group-hover:scale-[1.04]`}
              />
              <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[11px] font-bold tabular-nums text-white/90">
                #{index + 1}
              </span>
            </div>
            <div className="flex flex-col p-4 md:p-2.5 lg:p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-trnet-primary md:text-[10px]">
                {card.category || "Gündem"}
              </span>
              <p className="mt-2 text-balance font-display text-base font-semibold leading-snug text-white group-hover:text-white/90 md:mt-1.5 md:line-clamp-2 md:text-sm">
                {card.title}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MostReadColumn({ cards }: { cards: HomeCard[] }) {
  const items = cards.slice(0, MOST_READ_COUNT);

  return (
    <aside
      className="flex w-full flex-col rounded-xl border border-white/10 bg-trnet-black p-4 shadow-[0_16px_40px_rgba(0,0,0,0.4)] md:h-full md:min-h-0 md:p-3"
      aria-label="En çok okunanlar"
    >
      <h2 className="shrink-0 border-b border-white/10 pb-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white/90 md:text-[10px]">
        En Çok Okunanlar
      </h2>
      <ol className="mt-4 flex flex-col gap-4 md:mt-3 md:min-h-0 md:flex-1 md:gap-3">
        {items.length > 0 ? (
          items.map((card, index) => (
            <li key={card.id} className="flex flex-col md:min-h-0 md:flex-1">
              <Link
                href={haberArticleHref(card.slug)}
                className="group flex flex-col overflow-hidden rounded-lg border border-white/10 bg-trnet-black transition hover:border-trnet-primary/40 md:h-full md:min-h-0"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#1a1a1a] md:min-h-[100px] md:flex-1 md:aspect-auto lg:min-h-[120px]">
                  <SafeImage
                    src={card.imageSrc}
                    alt={card.imageAlt}
                    fill
                    placeholderVariant="dark"
                    sizes="(min-width: 768px) 30vw, 100vw"
                    className={`${EDITORIAL_IMAGE_CLASS} transition-transform duration-500 group-hover:scale-[1.04]`}
                  />
                  <span className="absolute left-2 top-2 z-10 rounded bg-black/75 px-2 py-0.5 text-[11px] font-bold tabular-nums text-white">
                    #{index + 1}
                  </span>
                </div>
                <div className="p-4 md:shrink-0 md:p-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-trnet-primary">
                    {card.category || "Gündem"}
                  </span>
                  <p className="mt-2 text-balance font-display text-base font-semibold leading-snug text-white group-hover:text-white/90 md:mt-1 md:line-clamp-2 md:text-sm">
                    {card.title}
                  </p>
                </div>
              </Link>
            </li>
          ))
        ) : (
          <li className="text-xs text-white/45">Henüz veri yok.</li>
        )}
      </ol>
    </aside>
  );
}

export default function HomePageClient() {
  const [layout, setLayout] = useState<HomepageLayoutSettings>(DEFAULT_HOMEPAGE_LAYOUT);
  const [feedCards, setFeedCards] = useState<HomeCard[]>([]);
  const [mostReadCards, setMostReadCards] = useState<HomeCard[]>([]);
  const [heroSlides, setHeroSlides] = useState<HomeHeroSlide[]>([]);
  const [topHeadlineCards, setTopHeadlineCards] = useState<HomeCard[]>([]);
  const [breakingTicker, setBreakingTicker] = useState<string[]>([]);
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const pageRef = useRef(0);
  const loadMoreLock = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const syncLayoutSettings = useCallback(() => {
    try {
      setLayout(readHomepageLayoutSettings());
    } catch {
      setLayout(DEFAULT_HOMEPAGE_LAYOUT);
    }
  }, []);

  useEffect(() => {
    syncLayoutSettings();

    const onStorage = (event: StorageEvent) => {
      if (event.key === HOMEPAGE_SETTINGS_STORAGE_KEY) {
        syncLayoutSettings();
      }
    };

    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<HomepageLayoutSettings>).detail;
      if (detail) {
        setLayout(detail);
      } else {
        syncLayoutSettings();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("trnethaber-homepage-settings", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("trnethaber-homepage-settings", onCustom);
    };
  }, [syncLayoutSettings]);

  const loadVitrin = useCallback(async () => {
    try {
      const res = await fetch("/api/home/vitrin", { cache: "no-store" });
      if (!res.ok) {
        console.error("[home] vitrin API:", res.status, await res.text().catch(() => ""));
        return;
      }
      const data = (await res.json()) as {
        heroSlides?: HomeHeroSlide[];
        topHeadlineCards?: HomeCard[];
      };
      if (data.heroSlides?.length) setHeroSlides(data.heroSlides);
      if (data.topHeadlineCards?.length) setTopHeadlineCards(data.topHeadlineCards);
    } catch (err) {
      console.error("[home] vitrin yükleme:", err);
    }
  }, []);

  const applyFeedHeroFallback = useCallback((cards: HomeCard[]) => {
    if (cards.length === 0) return;
    setHeroSlides((prev) => {
      if (prev.length > 0) return prev;
      return cards
        .filter((c) => c.hasCoverImage)
        .slice(0, 3)
        .map((c) => ({
          id: c.id,
          slug: c.slug,
          title: c.title,
          category: c.category,
          imageSrc: c.imageSrc,
          imageAlt: c.imageAlt,
        }));
    });
    setTopHeadlineCards((prev) => {
      if (prev.length > 0) return prev;
      const heroIds = new Set(
        cards
          .filter((c) => c.hasCoverImage)
          .slice(0, 3)
          .map((c) => c.id),
      );
      const pool = cards.filter((c) => !heroIds.has(c.id));
      return (pool.length > 0 ? pool : cards).slice(0, 4);
    });
  }, []);

  const refreshMostRead = useCallback(async () => {
    if (!layout.mostRead.enabled) {
      setMostReadCards([]);
      return;
    }
    try {
      const res = await fetch(`/api/articles/most-read?limit=${MOST_READ_COUNT}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { cards?: HomeCard[] };
        if (data.cards?.length) {
          setMostReadCards(data.cards);
          return;
        }
      }
    } catch {
      /* API yoksa feed yedek */
    }
    setMostReadCards(pickMostReadFallback(feedCards));
  }, [feedCards, layout.mostRead.enabled]);

  useEffect(() => {
    void refreshMostRead();
  }, [refreshMostRead]);

  const feedExcludeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const slide of heroSlides) ids.add(slide.id);
    for (const card of topHeadlineCards) ids.add(card.id);
    for (const card of mostReadCards) ids.add(card.id);
    return ids;
  }, [heroSlides, topHeadlineCards, mostReadCards]);

  const feedDisplay = useMemo(
    () => buildFeedDisplay(feedCards, feedExcludeIds),
    [feedCards, feedExcludeIds],
  );

  const applyRows = useCallback((rows: ArticleRow[], mode: "replace" | "append") => {
    const cards = rows.map(toHomeCard);
    setFeedCards((prev) => (mode === "replace" ? cards : mergeUniqueCards(prev, cards)));

    const ticker = rows
      .filter((r) => r.is_breaking)
      .slice(0, 8)
      .map((r) => `SON DAKİKA · ${r.title}`);
    if (ticker.length > 0) {
      setBreakingTicker(ticker);
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(undefined);
    pageRef.current = 0;

    const { rows, error } = await fetchArticlePage(0, FEED_INITIAL_SIZE - 1);

    if (error && rows.length === 0) {
      setStatus("error");
      setErrorMessage(error);
      return;
    }

    const cards = rows.map(toHomeCard);
    applyRows(rows, "replace");
    void loadVitrin().finally(() => {
      applyFeedHeroFallback(cards);
    });
    setHasMore(rows.length >= FEED_INITIAL_SIZE);
    setStatus(rows.length > 0 ? "ready" : "error");
    if (rows.length === 0) {
      setErrorMessage("Henüz yayınlanmış haber bulunmuyor.");
    } else if (error) {
      setErrorMessage(error);
    }
    pageRef.current = Math.ceil(FEED_INITIAL_SIZE / PAGE_SIZE);
  }, [applyRows, loadVitrin, applyFeedHeroFallback]);

  const loadMore = useCallback(async () => {
    if (loadMoreLock.current || !hasMore || status !== "ready") return;
    loadMoreLock.current = true;
    setLoadingMore(true);

    const page = pageRef.current;
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { rows, error } = await fetchArticlePage(from, to);

    if (rows.length > 0) {
      applyRows(rows, "append");
      pageRef.current = page + 1;
      setHasMore(rows.length >= PAGE_SIZE);
    } else {
      setHasMore(false);
    }

    if (error) {
      setErrorMessage(error);
    }

    setLoadingMore(false);
    loadMoreLock.current = false;
  }, [applyRows, hasMore, status]);

  const refreshLatest = useCallback(async () => {
    if (status !== "ready") return;
    const { rows, error } = await fetchArticlePage(0, PAGE_SIZE - 1);
    if (rows.length > 0) {
      setFeedCards((prev) => prependUniqueCards(prev, rows.map(toHomeCard)));
      const ticker = rows
        .filter((r) => r.is_breaking)
        .map((r) => `SON DAKİKA · ${r.title}`);
      if (ticker.length > 0) setBreakingTicker(ticker);
    }

    void loadVitrin();

    if (error) {
      console.warn("[home] auto-refresh:", error);
    }
  }, [status, loadVitrin]);

  useEffect(() => {
    void loadInitial();
    void loadVitrin();
  }, [loadInitial, loadVitrin]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshLatest();
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refreshLatest]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const heroStatus =
    heroSlides.length > 0
      ? "ok"
      : status === "loading"
        ? "loading"
        : status === "error"
          ? "error"
          : "empty";

  const heroWidthClass = layout.mostRead.enabled ? "md:w-2/3" : "w-full";

  return (
    <>
      {breakingTicker.length > 0 ? <BreakingTicker items={breakingTicker} /> : null}
      <SiteHeader />
      <main className="bg-trnet-surface pb-16 pt-0">
        {layout.topHeadline.enabled ? <TopHeadlineStrip cards={topHeadlineCards} /> : null}

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className={
              layout.mostRead.enabled
                ? `${
                    layout.topHeadline.enabled && topHeadlineCards.length > 0 ? "mt-0" : "mt-4"
                  } grid grid-cols-1 gap-6 md:min-h-[34rem] md:grid-cols-3 md:items-stretch md:gap-4 lg:min-h-[36rem]`
                : layout.topHeadline.enabled && topHeadlineCards.length > 0
                  ? "mt-0"
                  : "mt-4"
            }
          >
            <div
              className={
                layout.mostRead.enabled
                  ? "relative min-h-[220px] min-w-0 md:col-span-2 md:h-full md:min-h-0"
                  : `min-w-0 ${heroWidthClass}`
              }
            >
              <HomeHero
                slides={heroSlides}
                status={heroStatus}
                errorMessage={errorMessage}
              />
            </div>

            {layout.mostRead.enabled ? (
              <div className="flex min-h-0 min-w-0 md:col-span-1 md:h-full">
                <MostReadColumn cards={mostReadCards} />
              </div>
            ) : null}
          </div>
        </div>

        <AdSlotReserve />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-8">
            <section className="min-w-0 flex-1" aria-label="Haber akışı">
              <h1 className="mb-6 font-display text-2xl font-semibold tracking-tight text-trnet-text sm:text-3xl">
                {HOME_VISIBLE_H1}
              </h1>

              {status === "loading" && feedCards.length === 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2" aria-busy="true" aria-label="Haberler yükleniyor">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={`feed-skeleton-${i}`}
                      className="overflow-hidden rounded-2xl border border-black/[0.06] bg-trnet-card"
                    >
                      <div className="aspect-[16/10] w-full animate-pulse bg-neutral-200" />
                      <div className="space-y-3 p-5">
                        <div className="h-3 w-24 animate-pulse rounded bg-neutral-200" />
                        <div className="h-5 w-full animate-pulse rounded bg-neutral-200" />
                        <div className="h-5 max-w-[85%] animate-pulse rounded bg-neutral-200" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {status === "error" && feedCards.length === 0 ? (
                <p className="text-sm leading-relaxed text-trnet-text/60">
                  {errorMessage ??
                    "Akış yüklenemedi. Bağlantıyı kontrol edip sayfayı yenileyin."}
                </p>
              ) : null}

              {feedDisplay.latestPerCategory.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {feedDisplay.latestPerCategory.map((card) => (
                    <NewsCard key={`latest-${card.categorySlug}-${card.id}`} card={card} />
                  ))}
                </div>
              ) : null}

              {feedDisplay.categoryBatches.map((batch, batchIndex) => (
                <div key={`feed-batch-${batchIndex}`} className="mt-10 space-y-10">
                  {batch.map((section) => (
                    <div key={`${section.slug}-${batchIndex}`}>
                      <div className="mb-4 flex items-end justify-between gap-3 border-b border-black/10 pb-2">
                        <h2 className="font-display text-xl font-semibold tracking-tight text-trnet-text sm:text-2xl">
                          {section.label}
                        </h2>
                        <Link
                          href={categoryHref(section.slug)}
                          className="shrink-0 text-xs font-semibold uppercase tracking-wide text-trnet-primary transition hover:text-trnet-breaking"
                        >
                          Tümü →
                        </Link>
                      </div>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {section.cards.map((card) => (
                          <NewsCard
                            key={`${section.slug}-${batchIndex}-${card.id}`}
                            card={card}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {feedCards.length > 0 &&
              feedDisplay.latestPerCategory.length === 0 &&
              feedDisplay.categoryBatches.length === 0 ? (
                <p className="text-sm text-trnet-text/60">
                  Kategorili haber bulunamadı. Akış güncelleniyor…
                </p>
              ) : null}

              <div ref={sentinelRef} className="h-4 w-full" aria-hidden />

              {loadingMore ? (
                <p className="mt-6 text-center text-sm text-trnet-text/50">
                  Daha eski haberler getiriliyor…
                </p>
              ) : null}
            </section>

            <Sidebar />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
