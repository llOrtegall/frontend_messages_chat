// Vendors the backend's wire contracts (backend_messages_chat/src/contracts) into src/contracts.
//
//   bun run contracts:sync    copy from the backend checkout and record its commit
//   bun run contracts:check   fail if src/contracts was edited by hand, or (when the backend
//                             checkout is available) if it differs from the backend's contracts
//
// Backend location: $CONTRACTS_BACKEND_DIR, defaulting to the sibling ../backend_messages_chat.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const target = join(root, "src/contracts");
const manifestPath = join(target, "CONTRACTS_VERSION.json");
const backendDir = resolve(root, process.env.CONTRACTS_BACKEND_DIR ?? "../backend_messages_chat");
const source = join(backendDir, "src/contracts");

interface Manifest {
  backendCommit: string;
  hash: string;
}

const tsFiles = (dir: string) => readdirSync(dir).filter((f) => f.endsWith(".ts")).sort();

function hashDir(dir: string): string {
  const h = createHash("sha256");
  for (const f of tsFiles(dir)) h.update(f).update("\0").update(readFileSync(join(dir, f))).update("\0");
  return h.digest("hex");
}

function fail(msg: string): never {
  console.error(`contracts: ${msg}`);
  process.exit(1);
}

const mode = process.argv[2];

if (mode === "sync") {
  if (!existsSync(source)) fail(`backend contracts not found at ${source} (set CONTRACTS_BACKEND_DIR)`);
  const dirty = execFileSync("git", ["-C", backendDir, "status", "--porcelain", "--", "src/contracts"], { encoding: "utf8" });
  if (dirty.trim()) fail(`backend src/contracts has uncommitted changes; commit them first so the version is traceable`);
  const backendCommit = execFileSync("git", ["-C", backendDir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();

  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  for (const f of tsFiles(source)) writeFileSync(join(target, f), readFileSync(join(source, f)));
  const manifest: Manifest = { backendCommit, hash: hashDir(target) };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`contracts: synced ${tsFiles(target).length} files from backend ${backendCommit.slice(0, 7)}`);
} else if (mode === "check") {
  if (!existsSync(manifestPath)) fail("missing src/contracts/CONTRACTS_VERSION.json; run `bun run contracts:sync`");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  if (hashDir(target) !== manifest.hash) fail("src/contracts was edited by hand; change the backend and re-sync instead");
  if (existsSync(source)) {
    if (hashDir(source) !== manifest.hash) fail(`out of date with backend at ${backendDir}; run \`bun run contracts:sync\``);
    console.log("contracts: in sync with backend");
  } else {
    console.log(`contracts: unmodified (backend ${manifest.backendCommit.slice(0, 7)}); backend checkout not found, skipped drift check`);
  }
} else {
  fail("usage: sync-contracts.ts <sync|check>");
}
