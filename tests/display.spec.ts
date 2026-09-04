import { expect, test, type Page } from "@playwright/test";

async function installWebMcp(page: Page) {
  await page.addInitScript(() => {
    const tools = new Map<string, unknown>();
    const modelContext = {
      registerTool(tool: { name: string }, options?: { signal?: AbortSignal }) {
        tools.set(tool.name, tool);
        options?.signal?.addEventListener("abort", () => tools.delete(tool.name), { once: true });
        return Promise.resolve();
      },
      __tools: tools,
    };
    Object.defineProperty(document, "modelContext", { value: modelContext, configurable: true });
  });
}

async function setViaWebMcp(page: Page, text: string) {
  return page.evaluate(async (value) => {
    const context = document.modelContext as unknown as { __tools: Map<string, { execute: (input: { text: string }) => Promise<{ success: true }> }> };
    return context.__tools.get("set_text")?.execute({ text: value });
  }, text);
}

async function expectNoOverflow(page: Page) {
  const geometry = await page.getByTestId("display-text").evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
    bodyHeight: document.body.scrollHeight,
    viewportHeight: window.innerHeight,
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.clientHeight + 1);
  expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.bodyHeight).toBeLessThanOrEqual(geometry.viewportHeight);
}

test.beforeEach(async ({ page }) => {
  await installWebMcp(page);
  await page.goto("/");
});

test("registers one constrained set_text WebMCP tool", async ({ page }) => {
  const details = await page.evaluate(() => {
    const tools = (document.modelContext as unknown as { __tools: Map<string, { inputSchema: { properties: { text: { maxLength: number } } } }> }).__tools;
    return { size: tools.size, maxLength: tools.get("set_text")?.inputSchema.properties.text.maxLength };
  });
  expect(details).toEqual({ size: 1, maxLength: 2000 });
});

test("sets, replaces, clears, and persists basic text", async ({ page }) => {
  await expect(setViaWebMcp(page, "HELLO")).resolves.toEqual({ success: true });
  await expect(page.getByTestId("display-text")).toHaveText("HELLO");
  await setViaWebMcp(page, "Hello from WebMCP");
  await expect(page.getByTestId("display-text")).toHaveText("Hello from WebMCP");
  await page.reload();
  await expect(page.getByTestId("display-text")).toHaveText("Hello from WebMCP");
  await setViaWebMcp(page, "");
  await expect(page.getByTestId("display-text")).toBeEmpty();
});

test("preserves multiline, multilingual, emoji, and HTML-looking plain text", async ({ page }) => {
  const value = "First line\n第二行 · مرحباً · Привет\nEmoji 🚀 <script>alert('no')</script>";
  await setViaWebMcp(page, value);
  await expect(page.getByTestId("display-text")).toHaveText(value);
  await expect(page.getByTestId("display-text").locator("script")).toHaveCount(0);
  expect(await page.getByTestId("display-text").evaluate((element) => getComputedStyle(element).whiteSpace)).toBe("pre-wrap");
  await expectNoOverflow(page);
});

for (const viewport of [
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 3840, height: 2160 },
]) {
  test(`fits long content at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const longText = Array.from({ length: 90 }, (_, index) => `Line ${index + 1}: multilingual text 世界 مرحبا 🚀`).join(" ");
    await setViaWebMcp(page, longText.slice(0, 2000));
    await page.waitForTimeout(100);
    await expectNoOverflow(page);
    await expect(page.getByTestId("display-text")).toBeVisible();
  });
}

test("wraps an enormous unbroken word without scrolling", async ({ page }) => {
  await setViaWebMcp(page, "a".repeat(2000));
  await page.waitForTimeout(100);
  await expectNoOverflow(page);
});

test("rejects invalid and oversized input", async ({ page }) => {
  const errors = await page.evaluate(async () => {
    const tool = (document.modelContext as unknown as { __tools: Map<string, { execute: (input: Record<string, unknown>) => Promise<unknown> }> }).__tools.get("set_text")!;
    const messages: string[] = [];
    for (const input of [{ text: 42 }, { text: "x".repeat(2001) }]) {
      try { await tool.execute(input); } catch (error) { messages.push((error as Error).message); }
    }
    return messages;
  });
  expect(errors).toEqual(["text must be a string", "text must be 2000 characters or fewer"]);
});
