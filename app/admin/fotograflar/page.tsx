import { MediaLibraryPageClient } from "@/components/admin/MediaLibraryPageClient";
import { listMediaLibrary } from "@/lib/actions/media-library";

export const dynamic = "force-dynamic";

export default async function AdminFotograflarPage() {
  const result = await listMediaLibrary();
  const items = result.ok ? result.items : [];

  return (
    <>
      <header className="border-b border-black/[0.06] bg-trnet-card px-4 py-4 shadow-sm sm:px-6 sm:py-5 lg:px-8">
        <h1 className="font-display text-2xl font-semibold text-trnet-text sm:text-3xl">
          Medya Kütüphanesi
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-trnet-text/55">
          Supabase Storage ({`news-images`}) içindeki tüm görseller. Haber kapakları ve
          editör görselleri buradan yönetilir.
        </p>
        {!result.ok ? (
          <p className="mt-3 text-sm text-trnet-breaking" role="alert">
            {result.error}
          </p>
        ) : null}
      </header>

      <div className="admin-page !pt-4 sm:!pt-6">
        <MediaLibraryPageClient initialItems={items} />
      </div>
    </>
  );
}
