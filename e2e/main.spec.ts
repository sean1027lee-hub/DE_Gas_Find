import { expect, test } from "@playwright/test";

test("locate → list → detail sheet → navigation link", async ({ page }) => {
  await page.goto("/");

  // First run: location is only requested after the button press.
  await page.getByRole("radio", { name: /Diesel/ }).click();
  await page.getByRole("button", { name: "내 주변 가격 보기" }).click();

  // Summary card + list.
  await expect(page.getByText("가장 싼 곳 · Diesel")).toBeVisible();
  await expect(page.getByText(/\d{2}:\d{2} 기준/)).toBeVisible();
  const rows = page.locator("section[aria-labelledby=list-heading] li button");
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThan(2);

  // Price-ascending among open stations.
  const prices = await rows.evaluateAll((els) =>
    els.map((el) => Number(el.querySelector(".num .sr-only")?.textContent?.match(/(\d),(\d{3})/)?.slice(1).join(".") ?? "NaN")),
  );
  expect(prices.every((p, i) => i === 0 || p >= prices[i - 1])).toBe(true);

  // Detail sheet.
  await rows.first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("list", { name: "연료별 가격" })).toBeVisible();

  const primary = sheet.getByRole("link", { name: /Apple 지도로 길안내/ });
  const href = await primary.getAttribute("href");
  expect(href).toMatch(/^https:\/\/maps\.apple\.com\/\?daddr=\d+\.\d+%2C\d+\.\d+&dirflg=d/);

  const google = sheet.getByRole("link", { name: /Google 지도로 열기/ });
  expect(await google.getAttribute("href")).toMatch(
    /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=\d+\.\d+%2C\d+\.\d+&travelmode=driving$/,
  );

  // Favourite toggles and the sheet closes with Escape.
  await sheet.getByRole("button", { name: "즐겨찾기에 추가" }).click();
  await expect(sheet.getByRole("button", { name: "즐겨찾기에서 빼기" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "즐겨찾기" })).toBeVisible();
});

test("API key never reaches the client", async ({ page, request }) => {
  const responses: string[] = [];
  page.on("response", async (res) => {
    if (res.url().startsWith("http://localhost")) responses.push(await res.text().catch(() => ""));
  });
  await page.goto("/");
  await page.getByRole("button", { name: "내 주변 가격 보기" }).click();
  await expect(page.getByText(/가장 싼 곳/)).toBeVisible();
  const api = await request.get("/api/stations?lat=49.87&lng=8.65&rad=5");
  responses.push(await api.text());
  for (const body of responses) {
    expect(body).not.toMatch(/apikey|TANKERKOENIG_API_KEY/i);
  }
});

test("works offline with the last result and labels it", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "내 주변 가격 보기" }).click();
  await expect(page.getByText(/가장 싼 곳/)).toBeVisible();
  // Let the service worker take control and cache the shell.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByText(/가장 싼 곳/)).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/가장 싼 곳/)).toBeVisible();
  await expect(page.getByRole("button", { name: /가격 .* 기준/ })).toContainText("오프라인");
  await context.setOffline(false);
});

test("no axe violations on list and detail sheet", async ({ page }) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.goto("/");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "내 주변 가격 보기" }).click();
  await expect(page.getByText(/가장 싼 곳/)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.locator("section[aria-labelledby=list-heading] li button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(400);
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual([]);
  for (const scheme of ["dark", "light"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const results = await new AxeBuilder({ page }).withTags(["wcag2aa"]).analyze();
    expect(results.violations.map((v) => `${scheme}: ${v.id} ${v.nodes.map((n) => n.target).join(" ")}`)).toEqual([]);
  }
});
