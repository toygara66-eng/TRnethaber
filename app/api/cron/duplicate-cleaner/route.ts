import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { runDuplicateCleaner } from "@/lib/articles/duplicate-cleaner";
import { cronUnauthorizedResponse, verifyCronRequest } from "@/lib/bot/cron-auth";
import { getDuplicateCleanerEnvMissing } from "@/lib/env/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return handleDuplicateCleaner(request);
}

export async function POST(request: Request) {
  return handleDuplicateCleaner(request);
}

async function handleDuplicateCleaner(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json(cronUnauthorizedResponse(), { status: 401 });
  }

  const missing = getDuplicateCleanerEnvMissing();
  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Eksik ortam değişkenleri: ${missing.join(", ")}`,
      },
      { status: 500 },
    );
  }

  try {
    const result = await runDuplicateCleaner();

    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }

    if (result.deletedCount > 0) {
      revalidatePath("/");
      revalidatePath("/api/home/vitrin");
      revalidatePath("/admin/articles");
      revalidatePath("/sitemap.xml");
    }

    return NextResponse.json({
      ok: true,
      scanned: result.scanned,
      deletedCount: result.deletedCount,
      removed: result.removed.map((r) => ({
        title: r.deletedTitle,
        keptTitle: r.keptTitle,
        matchKind: r.matchKind,
        categorySlug: r.categorySlug,
        sharedToken: r.sharedToken ?? null,
        similarityPercent:
          r.matchKind === "general_similarity"
            ? Math.round(r.similarity * 100)
            : null,
      })),
      message:
        result.deletedCount > 0
          ? `${result.deletedCount} mükerrer haber silindi.`
          : "Mükerrer haber bulunamadı.",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Mükerrer haber temizliği başarısız.";
    console.error("[duplicate-cleaner]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
