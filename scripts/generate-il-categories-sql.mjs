/**
 * Yerel il kategori INSERT SQL üretir.
 * node scripts/generate-il-categories-sql.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const illerPath = path.join(root, "lib", "data", "turkiye-iller.ts");
const src = fs.readFileSync(illerPath, "utf8");
const matches = [...src.matchAll(/\{\s*slug:\s*"([^"]+)",\s*name:\s*"([^"]+)"\s*\}/g)];

const values = matches
  .map(([, slug, name]) => `  ('${slug}', '${name.replace(/'/g, "''")}')`)
  .join(",\n");

const sql = `-- Otomatik üretildi: node scripts/generate-il-categories-sql.mjs
INSERT INTO public.categories (slug, name, parent_id)
SELECT v.slug, v.name, p.id
FROM (
VALUES
${values}
) AS v(slug, name)
CROSS JOIN (SELECT id FROM public.categories WHERE slug = 'yerel-haberler') AS p
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  parent_id = EXCLUDED.parent_id;
`;

const out = path.join(root, "supabase", "migrations", "_il-categories-generated.sql");
fs.writeFileSync(out, sql, "utf8");
console.log(`Yazıldı: ${out} (${matches.length} il)`);
