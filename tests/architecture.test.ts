import { describe, test, expect } from "bun:test";
import { Glob } from "bun";
import { dirname, join, relative, resolve } from "node:path";

// Hexagonal dependency rule on import statements (same idea as the backend's):
//   domain          → domain, contracts (type-only: entities are the wire types)
//   application     → domain, application
//   infrastructure  → domain, contracts, infrastructure + zod
//   ui              → domain, application, ui, composition-root + react/next
//   app (routes)    → ui + react/next
//   contracts       → contracts + zod (vendored from the backend)
// Only composition-root.ts may import infrastructure.

const SRC = resolve(import.meta.dir, "../src");

interface Rule {
  layers: string[];
  packages: RegExp;
  typeOnly?: string[];
}

const NONE = /^$/;
const REACT = /^(react|react-dom|next)(\/|$)/;

const RULES: Record<string, Rule> = {
  domain: { layers: ["domain"], packages: NONE, typeOnly: ["contracts"] },
  application: { layers: ["domain", "application"], packages: NONE },
  infrastructure: { layers: ["domain", "contracts", "infrastructure"], packages: /^zod$/ },
  ui: { layers: ["domain", "application", "ui", "composition-root.ts"], packages: REACT },
  app: { layers: ["ui"], packages: REACT },
  contracts: { layers: ["contracts"], packages: /^zod$/ },
};

const IMPORT_RE = /(?:^|\n)\s*(import|export)(\s+type)?\s[^;]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

/** Top-level folder (or root file) of src/ an import points to, or null for a package. */
function targetLayer(file: string, spec: string): string | null {
  if (spec.startsWith("@/")) return spec.slice(2).split("/")[0]!.replace(/^composition-root$/, "composition-root.ts");
  if (!spec.startsWith(".")) return null;
  return relative(SRC, resolve(SRC, dirname(file), spec)).split("/")[0]!;
}

async function violations(layer: string): Promise<string[]> {
  const rule = RULES[layer]!;
  const found: string[] = [];
  for await (const file of new Glob(`${layer}/**/*.{ts,tsx}`).scan(SRC)) {
    const text = await Bun.file(join(SRC, file)).text();
    for (const m of text.matchAll(IMPORT_RE)) {
      const isType = Boolean(m[2]);
      const spec = m[3] ?? m[4]!;
      const target = targetLayer(file, spec);
      if (target === null) {
        if (!rule.packages.test(spec)) found.push(`${file} → ${spec}`);
      } else if (!rule.layers.includes(target) && !(isType && rule.typeOnly?.includes(target))) {
        found.push(`${file} → ${spec}`);
      }
    }
  }
  return found;
}

describe("architecture", () => {
  for (const layer of Object.keys(RULES)) {
    test(`${layer} only depends on allowed layers`, async () => {
      expect(await violations(layer)).toEqual([]);
    });
  }

  test("only providers.tsx reaches the composition root", async () => {
    const offenders: string[] = [];
    for await (const file of new Glob("ui/**/*.{ts,tsx}").scan(SRC)) {
      if (file === "ui/providers.tsx") continue;
      if ((await Bun.file(join(SRC, file)).text()).includes("composition-root")) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
