// Reproducible browser smoke for ASK SHOP AI. Starts the fake-provider backend and the Vite
// client, drives headless Chromium, and checks the scenarios from Evidence 013.
// Run: npx playwright install chromium   (once)
//      npm run test:e2e
import { spawn, type ChildProcess } from "node:child_process";
import assert from "node:assert/strict";
import { chromium, type Page } from "playwright";

const API_PORT = 3001; // fixed by the Vite proxy in vite.config.ts
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5199);
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;

type Server = { proc: ChildProcess; output: string[] };

function start(command: string, args: string[], env: NodeJS.ProcessEnv, ready: RegExp): Promise<Server> {
  const proc = spawn(command, args, { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  const output: string[] = [];
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${command} ${args.join(" ")} did not start`)), 30_000);
    const onData = (chunk: Buffer) => {
      for (const line of chunk.toString().split("\n")) if (line.trim()) output.push(line);
      if (ready.test(output.join("\n"))) { clearTimeout(timer); resolve({ proc, output }); }
    };
    proc.stdout?.on("data", onData);
    proc.stderr?.on("data", onData);
    proc.once("exit", (code) => { clearTimeout(timer); reject(new Error(`${command} exited with ${code}: ${output.join("\n")}`)); });
  });
}

function stop(server: Server | undefined): void {
  server?.proc.removeAllListeners("exit");
  server?.proc.kill("SIGTERM");
}

function telemetry(server: Server): Array<Record<string, unknown>> {
  return server.output.filter((line) => line.startsWith("{")).map((line) => JSON.parse(line) as Record<string, unknown>);
}

async function text(page: Page, selector: string): Promise<string> {
  return (await page.textContent(selector))?.trim() ?? "";
}

async function progression(page: Page) {
  return {
    score: await text(page, "#score"),
    xp: await text(page, "#xp-value"),
    points: await text(page, "#perk-points-value"),
    extraXp: await text(page, "#extra-xp-value"),
    luck: await text(page, "#luck-value"),
    lives: await text(page, "#life-value"),
  };
}

async function openFreshShop(page: Page): Promise<void> {
  await page.goto(WEB_URL);
  await page.waitForSelector('#server-connection[data-connection="online"]');
  await page.keyboard.press("ArrowUp");
  await page.waitForSelector("#shop-toggle:not([disabled])");
  await page.click("#shop-toggle");
  await page.waitForSelector("#perk-shop:not([hidden])");
  await page.waitForSelector("#shop-advice-button:not([disabled])");
}

class Skip extends Error {}
const results: Array<[string, "PASS" | "SKIP"]> = [];
async function check(id: string, name: string, body: () => Promise<void>): Promise<void> {
  try {
    await body();
    results.push([id, "PASS"]);
    console.log(`PASS ${id} ${name}`);
  } catch (error) {
    if (!(error instanceof Skip)) throw error;
    results.push([id, "SKIP"]);
    console.log(`SKIP ${id} ${name} — ${error.message}`);
  }
}

async function main(): Promise<void> {
  let api: Server | undefined;
  let web: Server | undefined;
  const browser = await chromium.launch();
  try {
    web = await start("npx", ["vite", "--host", "127.0.0.1", "--port", String(WEB_PORT), "--strictPort"], {}, /Local:/);

    api = await start("npx", ["tsx", "scripts/e2e/fakeAdvisorServer.ts"], { PORT: String(API_PORT) }, /listening/);
    const page = await browser.newPage();

    await check("M1", "ASK SHOP AI shows a pending state, then validated advice", async () => {
      await openFreshShop(page);
      assert.match(await text(page, "#status"), /PAUSED/);
      await page.click("#shop-advice-button");
      assert.match(await text(page, "#shop-advice-output"), /CHECKING/);
      await page.waitForFunction(() => /GEMINI|GEMMA/.test(document.querySelector("#shop-advice-output")?.textContent ?? ""));
      assert.match(await text(page, "#shop-advice-output"), /^(BUY|WAIT)/);
    });

    await check("M3", "Flash 503 falls back to Flash-Lite and the UI labels the fallback model", async () => {
      assert.match(await text(page, "#shop-advice-output"), /GEMINI FLASH-LITE$/);
      const attempts = telemetry(api!);
      assert.equal(attempts[0]?.model, "gemini-3.8-flash");
      assert.equal(attempts[0]?.providerStatus, 503);
      assert.equal(attempts[1]?.model, "gemini-3.5-flash-lite");
      assert.equal(attempts[1]?.status, "success");
      assert.equal(attempts[1]?.fallbackUsed, true);
    });

    await check("M2", "Advice never buys: score, XP, points and perk levels are unchanged", async () => {
      const before = await progression(page);
      await page.waitForTimeout(500);
      assert.deepEqual(await progression(page), before);
      assert.match(await text(page, "#status"), /PAUSED/);
    });

    await check("M4", "Closing the shop during a pending request hides the late answer and resumes", async () => {
      await openFreshShop(page);
      const attemptsBefore = telemetry(api!).length;
      await page.click("#shop-advice-button");
      assert.match(await text(page, "#shop-advice-output"), /CHECKING/);
      await page.click("#shop-close");
      await page.waitForSelector("#perk-shop", { state: "hidden" });
      assert.doesNotMatch(await text(page, "#status"), /PAUSED/);
      await page.waitForTimeout(2500); // longer than the fake provider's answer delay
      assert.doesNotMatch(await text(page, "#shop-advice-output"), /GEMINI|GEMMA|CHECKING/);
      // The Vite dev/preview proxy does not forward the browser abort to the backend, so the
      // provider call behind the proxy may still finish; M4b checks backend cancellation directly.
      const late = telemetry(api!).slice(attemptsBefore).map((event) => `${event.model}:${event.status}`);
      console.log(`     provider attempts behind the proxy after close: ${late.join(", ") || "none"}`);
    });

    await check("M4b", "A client disconnect aborts the provider call on the backend", async () => {
      const api_ = `http://127.0.0.1:${API_PORT}/api/games`;
      const post = (path: string, body: unknown = {}, signal?: AbortSignal) => fetch(`${api_}${path}`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal,
      });
      const { game } = await (await post("")).json() as { game: { id: string } };
      await post(`/${game.id}/move`, { direction: "up" });
      await post(`/${game.id}/pause`);
      const attemptsBefore = telemetry(api!).length;
      await post(`/${game.id}/shop-advice`, {}, AbortSignal.timeout(300)).catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const late = telemetry(api!).slice(attemptsBefore);
      assert.ok(late.length > 0, "provider was called");
      assert.ok(late.every((event) => event.status !== "success"), "no successful answer after disconnect");
      assert.equal(late.at(-1)?.errorClass, "cancelled");
    });

    await check("M5", "Buying a perk while advice is pending discards the stale answer", async () => {
      await openFreshShop(page);
      const buyable = await page.$("#perk-shop button[id^=buy-]:not([disabled])");
      if (!buyable) {
        throw new Skip("no affordable perk in a fresh run; stale-revision discard is covered by tests/shopAdvice.test.ts");
      }
      await page.click("#shop-advice-button");
      await buyable.click();
      await page.waitForTimeout(2500);
      assert.doesNotMatch(await text(page, "#shop-advice-output"), /GEMINI|GEMMA/);
    });

    stop(api);
    api = await start("npx", ["tsx", "scripts/e2e/fakeAdvisorServer.ts"], { PORT: String(API_PORT), FAKE_PROVIDER: "off" }, /listening/);

    await check("M6", "No provider configured: safe unavailable message, game state unchanged", async () => {
      await openFreshShop(page);
      const before = await progression(page);
      await page.click("#shop-advice-button");
      await page.waitForFunction(() => /UNAVAILABLE/.test(document.querySelector("#shop-advice-output")?.textContent ?? ""));
      assert.equal(await text(page, "#shop-advice-output"), "SHOP ADVICE IS UNAVAILABLE. NO PURCHASE WAS MADE.");
      assert.deepEqual(await progression(page), before);
    });

    const passed = results.filter(([, status]) => status === "PASS").length;
    console.log(`\n${passed} passed, ${results.length - passed} skipped, 0 failed.`);
  } finally {
    await browser.close();
    stop(api);
    stop(web);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
