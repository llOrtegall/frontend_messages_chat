import { describe, test, expect } from "bun:test";
import { Glob } from "bun";
import { dirname, join, relative, resolve } from "node:path";

// Dependency rules on import statements, checked against paths relative to src/.
//
// Modules (the skills' Clean Architecture), src/modules/<m>/:
//   domain          → any module's domain; no packages
//   application     → any module's domain or application (a use case may compose another's); no packages
//   factory.ts      → anything in modules/ and config.ts: pure wiring
//   infrastructure  → any module's domain, shared infrastructure, contracts + zod
//   test/           → not checked (bun:test, faker)
// i18n             → modules' domain only
// hooks, components (framework code outside the modules) → modules' factories and domain (use case input
//   types type-only), hooks, components, i18n + react/next; never infrastructure
//
// ui (components not yet moved to components/, F6) → ui, hooks, components, i18n, modules' factories and domain
// app (routes) → ui, hooks, components + react/next · contracts → contracts + zod

const SRC = resolve(import.meta.dir, "../src");

interface Rule {
  glob: string;
  allows: (target: string, isTypeOnly: boolean) => boolean;
  packages: RegExp;
  skip?: (file: string) => boolean;
}

const NONE = /^$/;
const REACT = /^(react|react-dom|next)(\/|$)/;

const top = (path: string) => path.split("/")[0]!;
const isModuleLayer = (path: string, layer: string) => new RegExp(`^modules/[^/]+/${layer}/`).test(path);
const isModuleDomain = (path: string) => isModuleLayer(path, "domain");
const isFactory = (path: string) => /^modules\/[^/]+\/application\/factory\.ts$/.test(path);
const isModuleTest = (file: string) => isModuleLayer(file, "test");
const usesModulesFromOutside = (target: string, isTypeOnly: boolean) =>
  isModuleDomain(target) || isFactory(target) || (isTypeOnly && isModuleLayer(target, "application"));
const FRAMEWORK = (target: string, isTypeOnly: boolean) =>
  ["hooks", "components", "i18n"].includes(top(target)) || usesModulesFromOutside(target, isTypeOnly);

const RULES: Record<string, Rule> = {
  "modules: domain": { glob: "modules/*/domain/**/*.ts", allows: isModuleDomain, packages: NONE },
  "modules: application": {
    glob: "modules/*/application/**/*.ts",
    allows: (target) => isModuleDomain(target) || isModuleLayer(target, "application"),
    packages: NONE,
    skip: isFactory,
  },
  "modules: factory": {
    glob: "modules/*/application/factory.ts",
    allows: (target) => top(target) === "modules" || target === "config.ts",
    packages: NONE,
  },
  "modules: infrastructure": {
    glob: "modules/*/infrastructure/**/*.ts",
    allows: (target) => isModuleDomain(target) || target.startsWith("modules/shared/infrastructure/") || top(target) === "contracts",
    packages: /^zod$/,
  },
  i18n: { glob: "i18n/**/*.ts", allows: isModuleDomain, packages: NONE },
  hooks: { glob: "hooks/**/*.{ts,tsx}", allows: FRAMEWORK, packages: REACT },
  components: { glob: "components/**/*.{ts,tsx}", allows: FRAMEWORK, packages: REACT },
  ui: {
    glob: "ui/**/*.{ts,tsx}",
    allows: (target, isTypeOnly) => top(target) === "ui" || FRAMEWORK(target, isTypeOnly),
    packages: REACT,
  },
  app: { glob: "app/**/*.{ts,tsx}", allows: (target) => ["ui", "hooks", "components"].includes(top(target)), packages: REACT },
  contracts: { glob: "contracts/**/*.ts", allows: (target) => top(target) === "contracts", packages: /^zod$/ },
};

const IMPORT_RE = /(?:^|\n)\s*(import|export)(\s+type)?\s[^;]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

/** Path relative to src/ an import points to, or null for a package. */
function targetOf(file: string, spec: string): string | null {
  if (spec.startsWith("@/")) return spec.slice(2);
  if (!spec.startsWith(".")) return null;
  return relative(SRC, resolve(SRC, dirname(file), spec));
}

async function violations(rule: Rule): Promise<string[]> {
  const found: string[] = [];
  for await (const file of new Glob(rule.glob).scan(SRC)) {
    if (isModuleTest(file) || rule.skip?.(file)) continue;
    const text = await Bun.file(join(SRC, file)).text();
    for (const match of text.matchAll(IMPORT_RE)) {
      const spec = match[3] ?? match[4]!;
      const target = targetOf(file, spec);
      const allowed = target === null ? rule.packages.test(spec) : rule.allows(target, Boolean(match[2]));
      if (!allowed) found.push(`${file} → ${spec}`);
    }
  }
  return found;
}

describe("architecture", () => {
  for (const [name, rule] of Object.entries(RULES)) {
    test(`${name} only depends on what it may`, async () => {
      expect(await violations(rule)).toEqual([]);
    });
  }

  test("only config.ts reads the environment", async () => {
    const offenders: string[] = [];
    for await (const file of new Glob("**/*.{ts,tsx}").scan(SRC)) {
      if (file === "config.ts" || isModuleTest(file)) continue;
      if ((await Bun.file(join(SRC, file)).text()).includes("process.env")) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
