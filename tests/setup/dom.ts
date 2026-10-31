// Component tests only: happy-dom replaces fetch and WebSocket, which the other suites use for real.
import { afterEach, mock } from "bun:test";
import { createElement } from "react";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();

// Imported once the DOM exists: Testing Library binds `screen` to document.body when loaded.
const { cleanup } = await import("@testing-library/react");
afterEach(cleanup);

mock.module("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => createElement("a", { href, ...props }, children),
}));
