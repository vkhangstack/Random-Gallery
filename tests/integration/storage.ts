import { readFileSync } from "node:fs";
import ts from "typescript";
import type { Page } from "playwright/test";
import type * as Storage from "../../src/storage/images";
declare global {
  interface Window {
    testStorage: typeof Storage;
  }
}
export async function loadStorage(page: Page) {
  await page.goto("/");
  const source = ts.transpileModule(
    readFileSync("src/storage/images.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  await page.evaluate(async (moduleSource) => {
    const url = URL.createObjectURL(
      new Blob([moduleSource], { type: "text/javascript" }),
    );
    try {
      window.testStorage = await import(/* @vite-ignore */ url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }, source);
}
