import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { AdminEntityRow } from "@/lib/queries/admin";

type Props = {
  entities: AdminEntityRow[];
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const TYPE_BADGE: Record<AdminEntityRow["entity_type"], string> = {
  kisi: "bg-violet-500/10 text-violet-700",
  kurum: "bg-trnet-primary/10 text-trnet-primary",
  takim: "bg-amber-500/10 text-amber-800",
};

export function EntitiesTable({ entities }: Props) {
  if (entities.length === 0) {
    return (
      <div className="admin-card p-12 text-center">
        <p className="text-trnet-text/60">Henüz varlık kaydı yok. Yukarıdaki formdan ekleyin.</p>
      </div>
    );
  }

  return (
    <div className="admin-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] bg-trnet-surface/80">
              <th className="px-5 py-4 font-semibold text-trnet-text">İsim</th>
              <th className="px-5 py-4 font-semibold text-trnet-text">Tür</th>
              <th className="px-5 py-4 font-semibold text-trnet-text">Eklenme</th>
              <th className="px-5 py-4 font-semibold text-trnet-text">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.05]">
            {entities.map((entity) => (
              <tr key={entity.id} className="transition hover:bg-trnet-surface/50">
                <td className="max-w-sm px-5 py-4">
                  <p className="font-medium text-trnet-text">{entity.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-trnet-text/45">{entity.slug}</p>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${TYPE_BADGE[entity.entity_type]}`}
                  >
                    {entity.entity_type_label}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-trnet-text/60">
                  {formatDate(entity.created_at)}
                </td>
                <td className="px-5 py-4">
                  <Link
                    href={`/kimdir/${entity.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-sm font-medium text-trnet-primary hover:underline"
                  >
                    Profil
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
