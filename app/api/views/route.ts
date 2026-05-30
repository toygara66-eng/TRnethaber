import { NextResponse } from "next/server";
import { incrementArticleView } from "@/lib/articles/increment-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  articleId?: string;
  slug?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek." }, { status: 400 });
  }

  const result = await incrementArticleView({
    articleId: body.articleId,
    slug: body.slug,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    view_count: result.view_count,
    skipped: result.skipped ?? false,
  });
}
