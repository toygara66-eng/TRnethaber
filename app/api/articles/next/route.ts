import { NextResponse } from "next/server";
import { getNextPublishedArticle } from "@/lib/queries/article";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const currentId = searchParams.get("currentId")?.trim();

    if (!currentId) {
      return NextResponse.json(
        { error: "currentId zorunludur." },
        { status: 400 },
      );
    }

    const article = await getNextPublishedArticle(currentId);

    if (!article) {
      return NextResponse.json({ article: null });
    }

    return NextResponse.json({ article });
  } catch (err) {
    console.error("[api/articles/next]", err);
    return NextResponse.json(
      { error: "Sonraki haber yüklenemedi." },
      { status: 500 },
    );
  }
}
