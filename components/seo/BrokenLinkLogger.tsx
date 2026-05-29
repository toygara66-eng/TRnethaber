"use client";

import { useEffect, useRef } from "react";

/** 404 sayfasında hatalı URL'yi Supabase broken_links tablosuna kaydeder */
export function BrokenLinkLogger() {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current || typeof window === "undefined") return;
    logged.current = true;

    const url = `${window.location.pathname}${window.location.search}`;

    void fetch("/api/broken-links/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      keepalive: true,
    }).catch((err) => {
      console.warn("[BrokenLinkLogger]", err);
    });
  }, []);

  return null;
}
