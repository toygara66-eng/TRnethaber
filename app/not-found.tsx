"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NotFoundView } from "@/components/seo/NotFoundView";

const REDIRECT_SECONDS = 12;

export default function NotFound() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      router.replace("/");
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [secondsLeft, router]);

  return (
    <NotFoundView
      title="Aradığınız sayfa bulunamadı"
      description={`Bu adres artık mevcut değil veya taşınmış olabilir. ${secondsLeft} saniye içinde ana sayfaya yönlendirileceksiniz.`}
    >
      <div
        className="mt-8 flex h-16 w-16 items-center justify-center rounded-full border-2 border-trnet-primary/30 bg-trnet-card font-display text-2xl font-semibold text-trnet-primary shadow-sm"
        aria-live="polite"
        aria-atomic="true"
      >
        {secondsLeft}
      </div>
    </NotFoundView>
  );
}
