"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import { DEFAULT_COVER_IMAGE, resolveCoverImageSrc } from "@/lib/images/cover";

type SafeImageProps = Omit<ImageProps, "src"> & {
  src?: string | null;
  fallback?: string;
};

export function SafeImage({
  src,
  fallback = DEFAULT_COVER_IMAGE,
  alt,
  onError,
  ...rest
}: SafeImageProps) {
  const resolvedFallback = resolveCoverImageSrc(fallback, DEFAULT_COVER_IMAGE);
  const [currentSrc, setCurrentSrc] = useState(() =>
    resolveCoverImageSrc(src, resolvedFallback),
  );

  useEffect(() => {
    setCurrentSrc(resolveCoverImageSrc(src, resolvedFallback));
  }, [src, resolvedFallback]);

  return (
    <Image
      {...rest}
      src={currentSrc}
      alt={alt}
      onError={(event) => {
        onError?.(event);
        if (currentSrc !== resolvedFallback) {
          setCurrentSrc(resolvedFallback);
        }
      }}
    />
  );
}
