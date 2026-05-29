"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ImageFallback } from "@/components/ui/ImageFallback";
import {
  DEFAULT_COVER_IMAGE,
  isAllowedCoverUrl,
  isLocalImageSrc,
  resolveCoverImageSrc,
} from "@/lib/images/cover";
import { safeText } from "@/lib/safe-display";

type SafeImageProps = Omit<ImageProps, "src" | "alt"> & {
  src?: string | null;
  alt?: string | null;
  fallback?: string;
  /** Kart (açık tema) veya manşet (koyu tema) yer tutucu */
  placeholderVariant?: "dark" | "card";
};

type LoadState = "loading" | "loaded" | "error";

function pickDisplaySrc(primary: string, fallback: string): string {
  const candidate = primary.trim() || fallback.trim() || DEFAULT_COVER_IMAGE;
  if (isLocalImageSrc(candidate)) return candidate;
  if (isAllowedCoverUrl(candidate)) return candidate;
  return fallback.trim() || DEFAULT_COVER_IMAGE;
}

export function SafeImage({
  src,
  fallback = DEFAULT_COVER_IMAGE,
  alt,
  placeholderVariant = "dark",
  onError,
  onLoad,
  fill,
  className = "",
  ...rest
}: SafeImageProps) {
  const resolvedFallback = resolveCoverImageSrc(fallback, DEFAULT_COVER_IMAGE);
  const primarySrc = useMemo(
    () => resolveCoverImageSrc(src, resolvedFallback),
    [src, resolvedFallback],
  );

  const [currentSrc, setCurrentSrc] = useState(() =>
    pickDisplaySrc(primarySrc, resolvedFallback),
  );
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    setCurrentSrc(pickDisplaySrc(primarySrc, resolvedFallback));
    setLoadState("loading");
  }, [primarySrc, resolvedFallback]);

  const safeAlt = safeText(alt, "Haber görseli");
  const displaySrc = pickDisplaySrc(currentSrc, resolvedFallback);
  const showBrandedFallback = loadState === "error";
  const showImage = !showBrandedFallback;
  const useUnoptimized = !isLocalImageSrc(displaySrc);

  const wrapperClass = fill
    ? "relative block h-full w-full overflow-hidden bg-[#1a1a1a]"
    : "relative inline-block overflow-hidden bg-[#1a1a1a]";

  return (
    <span className={wrapperClass}>
      <ImageFallback
        className={`absolute inset-0 z-0 transition-opacity duration-300 ${
          loadState === "loaded" ? "opacity-0" : "opacity-100"
        } ${loadState === "loading" ? "animate-pulse" : ""}`}
        variant={placeholderVariant}
      />

      {showImage ? (
        <Image
          {...rest}
          fill={fill}
          src={displaySrc}
          alt={safeAlt}
          unoptimized={useUnoptimized}
          referrerPolicy="no-referrer"
          className={`relative z-10 object-cover transition-opacity duration-300 ${
            loadState === "loaded" ? "opacity-100" : "opacity-0"
          } ${className}`}
          onLoad={(event) => {
            setLoadState("loaded");
            onLoad?.(event);
          }}
          onError={(event) => {
            onError?.(event);
            if (isLocalImageSrc(displaySrc)) {
              setLoadState("error");
              return;
            }
            const next = pickDisplaySrc(resolvedFallback, DEFAULT_COVER_IMAGE);
            if (displaySrc !== next) {
              setCurrentSrc(next);
              setLoadState("loading");
              return;
            }
            setLoadState("error");
          }}
        />
      ) : null}
    </span>
  );
}
