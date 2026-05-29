"use client";

import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Kök layout hataları — kendi html/body gerekli */
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f4f4f5",
          color: "#0a0a0a",
        }}
      >
        <main style={{ textAlign: "center", padding: "2rem", maxWidth: "28rem" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.15em", color: "#c41e3a" }}>
            KRİTİK HATA
          </p>
          <h1 style={{ marginTop: "1rem", fontSize: "1.75rem", fontWeight: 600 }}>Uygulama başlatılamadı</h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", opacity: 0.7 }}>
            Sayfayı yenileyin. Sorun sürerse geliştirme sunucusunu durdurup{" "}
            <code style={{ fontSize: "0.8rem" }}>npm run dev:clean</code> çalıştırın.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "1.5rem",
              padding: "0.75rem 1.5rem",
              borderRadius: "9999px",
              border: "none",
              background: "#c41e3a",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tekrar dene
          </button>
        </main>
      </body>
    </html>
  );
}
