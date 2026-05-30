"use client";

import { Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
};

export function AdminArticlesSearchBar({ value, onChange, resultCount, totalCount }: Props) {
  return (
    <div className="mb-4">
      <label className="relative block">
        <span className="sr-only">Başlığa göre ara</span>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-trnet-text/40"
          aria-hidden
        />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Başlığa göre ara…"
          className="w-full rounded-2xl border border-black/[0.08] bg-white py-3 pl-11 pr-4 text-sm text-trnet-text shadow-sm outline-none transition placeholder:text-trnet-text/40 focus:border-trnet-primary/40 focus:ring-2 focus:ring-trnet-primary/15"
          autoComplete="off"
        />
      </label>
      {value.trim() ? (
        <p className="mt-2 text-xs text-trnet-text/50">
          {resultCount} / {totalCount} haber gösteriliyor
        </p>
      ) : null}
    </div>
  );
}
