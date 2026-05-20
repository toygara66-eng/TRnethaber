import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, "..", ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const ARTICLE_SELECT = `
  id,
  title,
  slug,
  spot_metni,
  kapak_gorseli,
  okuma_sayisi,
  is_breaking,
  published_at,
  category_id,
  categories (
    id,
    slug,
    name
  )
`;

const ordered = await supabase
  .from("articles")
  .select(ARTICLE_SELECT)
  .order("published_at", { ascending: false, nullsFirst: false })
  .order("created_at", { ascending: false });

console.log("double order error:", ordered.error);
console.log("double order count:", ordered.data?.length);

const single = await supabase
  .from("articles")
  .select(ARTICLE_SELECT)
  .order("published_at", { ascending: false });

console.log("single order error:", single.error);
console.log("single order count:", single.data?.length);
