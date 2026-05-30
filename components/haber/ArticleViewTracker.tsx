"use client";

import { useEffect, useRef } from "react";

const STORAGE_KEY = "trnethaber_recorded_views";
const COOKIE_PREFIX = "trnethaber_v_";
const MAX_STORED_IDS = 400;

function readStoredIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function hasViewCookie(articleId: string): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => {
    const [key] = part.trim().split("=");
    return key === `${COOKIE_PREFIX}${articleId}`;
  });
}

function markViewRecorded(articleId: string): void {
  if (typeof window === "undefined") return;

  document.cookie = `${COOKIE_PREFIX}${articleId}=1; path=/; max-age=86400; SameSite=Lax`;

  const ids = readStoredIds();
  ids.add(articleId);
  const list = Array.from(ids).slice(-MAX_STORED_IDS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* depolama dolu — cookie yeterli */
  }
}

function alreadyRecorded(articleId: string): boolean {
  if (hasViewCookie(articleId)) return true;
  return readStoredIds().has(articleId);
}

async function recordView(articleId: string, slug: string): Promise<void> {
  if (alreadyRecorded(articleId)) return;

  markViewRecorded(articleId);

  try {
    await fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, slug }),
      cache: "no-store",
      keepalive: true,
    });
  } catch {
    /* ağ hatası — tekrar sayımı cookie/localStorage engeller */
  }
}

type Props = {
  articleId: string;
  slug: string;
  /** Sonsuz akışta görünür olunca say (varsayılan: hemen) */
  observeVisibility?: boolean;
};

export function ArticleViewTracker({
  articleId,
  slug,
  observeVisibility = false,
}: Props) {
  const recordedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    recordedRef.current = false;
  }, [articleId]);

  useEffect(() => {
    if (!articleId) return;

    if (!observeVisibility) {
      if (!recordedRef.current) {
        recordedRef.current = true;
        void recordView(articleId, slug);
      }
      return;
    }

    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.35);
        if (!visible || recordedRef.current) return;
        recordedRef.current = true;
        void recordView(articleId, slug);
        observer.disconnect();
      },
      { threshold: [0.35, 0.5], rootMargin: "0px 0px -20% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [articleId, slug, observeVisibility]);

  if (!observeVisibility) return null;

  return <div ref={rootRef} className="h-0 w-0 overflow-hidden" aria-hidden />;
}
