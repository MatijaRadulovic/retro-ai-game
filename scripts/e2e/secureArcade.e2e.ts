// Production-preview security journey. Uses the real browser client/server and a local fake provider.
// Run `npm run test:security` after `npx playwright install chromium` (once).
import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import { createServer, type Server as NetServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import { dirname, join } from "node:path";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";

type Child = { name: string; proc: ChildProcess; output: string[] };
const require = createRequire(import.meta.url);
const SENTINEL = "W08_SERVER_SECRET_DO_NOT_EXPOSE";

function cliPath(pkg: string, bin: string): string {
  const manifestPath = require.resolve(`${pkg}/package.json`);
  const manifest = require(manifestPath) as { bin: string | Record<string, string> };
  return join(dirname(manifestPath), typeof manifest.bin === "string" ? manifest.bin : manifest.bin[bin]);
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as { port: number };
      server.close(() => resolve(address.port));
    });
  });
}

function start(name: string, args: string[], env: NodeJS.ProcessEnv, ready: RegExp): Promise<Child> {
  const proc = spawn(process.execPath, args, { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  const output: string[] = [];
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${name} did not start: ${output.join("\n")}`)), 30_000);
    const receive = (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/)) if (line.trim()) output.push(line);
      if (ready.test(output.join("\n"))) { clearTimeout(timer); resolve({ name, proc, output }); }
    };
    proc.stdout?.on("data", receive);
    proc.stderr?.on("data", receive);
    proc.once("error", (error) => { clearTimeout(timer); reject(error); });
    proc.once("exit", (code) => { clearTimeout(timer); reject(new Error(`${name} exited with ${code}: ${output.join("\n")}`)); });
  });
}

async function stop(child: Child | undefined): Promise<void> {
  if (!child || child.proc.exitCode !== null || child.proc.signalCode !== null) return;
  const exited = new Promise<void>((resolve) => child.proc.once("exit", () => resolve()));
  child.proc.kill("SIGTERM");
  const timer = setTimeout(() => child.proc.kill("SIGKILL"), 5_000);
  await exited;
  clearTimeout(timer);
}

function scanFiles(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? scanFiles(child) : [child];
  });
}

async function main(): Promise<void> {
  let api: Child | undefined;
  let preview: Child | undefined;
  let maliciousServer: NetServer | undefined;
  let maliciousHits = 0;
  const apiPort = Number(process.env.E2E_API_PORT ?? await freePort());
  const webPort = Number(process.env.E2E_WEB_PORT ?? await freePort());
  const maliciousPort = await freePort();
  const apiOrigin = `http://127.0.0.1:${apiPort}`;
  const webOrigin = `http://127.0.0.1:${webPort}`;
  const maliciousOrigin = `http://127.0.0.1:${maliciousPort}`;
  const maliciousScript = `${maliciousOrigin}/probe.js`;
  maliciousServer = createHttpServer((_request, response) => {
    maliciousHits += 1;
    response.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "access-control-allow-origin": "*" });
    response.end("window.__w08_csp_probe = true;");
  });
  maliciousServer.listen(maliciousPort, "127.0.0.1");
  await new Promise<void>((resolve) => maliciousServer!.once("listening", resolve));

  // Positive control: the cross-origin endpoint itself really returns executable JavaScript.
  assert.equal((await fetch(maliciousScript)).status, 200);
  maliciousHits = 0;

  const browser = await chromium.launch({ headless: true });
  try {
    preview = await start("Vite production preview", [cliPath("vite", "vite"), "preview", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"],
      { API_PORT: String(apiPort) }, /Local:/);
    api = await start("fake security API", ["--import", "tsx", "scripts/e2e/fakeAdvisorServer.ts"],
      { PORT: String(apiPort), CLIENT_ORIGIN: webOrigin, E2E_SEED_PERK_POINTS: "1" }, /E2E fake-provider server listening/);

    const htmlResponse = await fetch(webOrigin);
    assert.equal(htmlResponse.status, 200);
    const csp = htmlResponse.headers.get("content-security-policy") ?? "";
    assert.match(csp, /script-src 'self'/);
    assert.equal(htmlResponse.headers.get("x-content-type-options"), "nosniff");
    assert.equal(htmlResponse.headers.get("referrer-policy"), "no-referrer");
    const html = await htmlResponse.text();
    const jsPath = /src="([^"]+\.js)"/.exec(html)?.[1];
    assert.ok(jsPath, "built page references a JS bundle");
    const jsResponse = await fetch(new URL(jsPath!, webOrigin));
    assert.equal(jsResponse.status, 200);
    assert.equal(jsResponse.headers.get("x-content-type-options"), "nosniff");
    assert.equal(jsResponse.headers.get("referrer-policy"), "no-referrer");

    const context = await browser.newContext();
    const page = await context.newPage();
    const cspEvents: string[] = [];
    page.on("console", (message) => {
      if (/content security policy|violates the following/i.test(message.text())) cspEvents.push(message.text());
    });
    await page.addInitScript((args: { appOrigin: string; scriptUrl: string }) => {
      if (location.origin !== args.appOrigin) return;
      const w = window as Window & { __w08CspEvents?: string[]; __w08_xss?: number };
      w.__w08CspEvents = [];
      w.__w08_xss = 0;
      document.addEventListener("securitypolicyviolation", (event) => {
        w.__w08CspEvents!.push(`${event.violatedDirective}|${event.blockedURI}`);
      });
      document.addEventListener("DOMContentLoaded", () => {
        const external = document.createElement("script");
        external.src = args.scriptUrl;
        document.head.append(external);
      }, { once: true });
      localStorage.setItem("retro-snake-best-score", "999999");
      localStorage.setItem("retro-snake-game-state", '{"score":999999,"perkPoints":999999}');
    }, { appOrigin: webOrigin, scriptUrl: maliciousScript });

    const gameCreated = page.waitForResponse((response) => response.url().endsWith("/api/games") && response.request().method() === "POST");
    const agentRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/shop-agent")) agentRequests.push(request.postData() ?? "");
    });
    await page.goto(webOrigin);
    await page.waitForSelector('#server-connection[data-connection="online"]');
    const created = await gameCreated;
    assert.equal(created.status(), 201);
    const createdBody = await created.json() as { game: { id: string; players: Array<{ score: number; progression: { perkPoints: number } }> } };
    const gameId = createdBody.game.id;
    assert.equal(createdBody.game.players[0]!.score, 0);
    assert.equal(createdBody.game.players[0]!.progression.perkPoints, 0);
    assert.equal(await page.locator("#best-score").textContent(), "999999", "best score is a client-local display value, not authoritative game state");
    assert.equal(await page.evaluate(() => (window as Window & { __w08CspEvents?: string[] }).__w08CspEvents?.some((entry) => entry.startsWith("script-src"))), true);
    assert.ok(cspEvents.length > 0, "browser reports a concrete CSP violation");
    assert.equal(maliciousHits, 0, "CSP blocked the script before the independent HTTP-200 endpoint was requested");
    assert.equal(await page.evaluate(() => Boolean((window as Window & { __w08CspProbe?: boolean }).__w08CspProbe)), false);

    await page.keyboard.press("ArrowUp");
    await page.waitForSelector("#shop-toggle:not([disabled])");
    await page.click("#shop-toggle");
    await page.waitForSelector("#perk-shop:not([hidden])");
    await page.waitForSelector("#shop-agent-button:not([disabled])");
    assert.match(await page.locator("#status").textContent() ?? "", /PAUSED/);
    const before = await page.locator("#score, #xp-value, #perk-points-value, #extra-xp-value, #luck-value, #life-value").allTextContents();
    const agentResponse = page.waitForResponse((response) => response.url().includes("/shop-agent"));
    await page.click("#shop-agent-button");
    await page.waitForFunction(() => (document.querySelector("#shop-agent-output")?.textContent ?? "").includes("PLAN:"));
    const response = await agentResponse;
    assert.equal(response.status(), 200);
    const responseText = await response.text();
    assert.equal(responseText.includes(SENTINEL), false);
    assert.equal(responseText.includes("<img"), false);
    assert.deepEqual(agentRequests.map((value) => JSON.parse(value)), [{ goal: "plan_next_purchases" }]);
    const output = await page.locator("#shop-agent-output").textContent() ?? "";
    assert.match(output, /Recommended order: EXTRA XP/);
    assert.doesNotMatch(output, /<img|javascript:|W08_SERVER_SECRET/);
    assert.equal(await page.locator("#shop-agent-output img, #shop-agent-output a").count(), 0);
    assert.equal(await page.evaluate(() => (window as Window & { __w08_xss?: number }).__w08_xss), 0);
    assert.deepEqual(await page.locator("#score, #xp-value, #perk-points-value, #extra-xp-value, #luck-value, #life-value").allTextContents(), before);
    assert.match(await page.locator("#status").textContent() ?? "", /PAUSED/);

    // A same-site but different-origin form submission is rejected before a state change.
    const attacker = await context.newPage();
    await attacker.goto(maliciousOrigin);
    await attacker.setContent(`<form id="csrf" method="post" action="${webOrigin}/api/games/${encodeURIComponent(gameId)}/pause"><input name="attack" value="pause"></form>`);
    const providerAttemptsBeforeCsrf = api!.output.filter((entry) => entry.includes('"kind":"provider_attempt"')).length;
    const runSummariesBeforeCsrf = api!.output.filter((entry) => entry.includes('"kind":"agent_run_finished"')).length;
    const csrfNavigation = attacker.waitForNavigation();
    await attacker.locator("#csrf").evaluate((form: HTMLFormElement) => form.submit());
    await csrfNavigation;
    assert.match(await attacker.locator("body").innerText(), /request_forbidden/);
    assert.match(await page.locator("#status").textContent() ?? "", /PAUSED/);
    assert.equal(api!.output.filter((entry) => entry.includes('"kind":"provider_attempt"')).length, providerAttemptsBeforeCsrf);
    assert.equal(api!.output.filter((entry) => entry.includes('"kind":"agent_run_finished"')).length, runSummariesBeforeCsrf);

    // The localStorage game-state forgery was ignored: the server-created snapshot and agent request
    // contain only authoritative state / the fixed goal. Best score is intentionally decorative.
    const assetFiles = scanFiles("dist");
    assert.equal(assetFiles.some((file) => readFileSync(file, "utf8").includes(SENTINEL)), false);
    const logs = api!.output.join("\n");
    assert.equal(logs.includes(SENTINEL), false);
    assert.equal(logs.includes("retro_session="), false);
    assert.equal(logs.includes("x-retro-request"), false);
    for (const line of api!.output.filter((entry) => entry.startsWith("{"))) assert.doesNotThrow(() => JSON.parse(line));
    const runtimeEvents = api!.output.filter((entry) => entry.startsWith('{"event":"w08_security_event"'))
      .map((entry) => JSON.parse(entry) as Record<string, unknown>);
    const agentEvents = runtimeEvents.filter((entry) => entry.operation === "shop_agent");
    assert.ok(agentEvents.length >= 4, "provider attempts and run summary use the common schema");
    const agentCorrelationIds = new Set(agentEvents.map((entry) => entry.correlationId));
    assert.equal(agentCorrelationIds.size, 1, "agent events correlate with their originating request");
    assert.equal(agentCorrelationIds.has(response.headers()["x-correlation-id"]), true);
    const csrfEvents = runtimeEvents.filter((entry) => entry.kind === "request_denied" && entry.reason === "request_forbidden");
    assert.equal(csrfEvents.length, 1);
    const fixtureEvents = api!.output.filter((entry) => entry.startsWith('{"event":"w08_e2e_fixture"'));
    assert.equal(fixtureEvents.length, 1);
    const fixtureMetrics = JSON.parse(fixtureEvents[0]!) as { providerCalls: number; toolResultsInTranscript: number; transcriptContainsSentinel: boolean; allowedToolNames: string[] };
    assert.equal(fixtureMetrics.providerCalls, 3);
    assert.equal(fixtureMetrics.toolResultsInTranscript, 2);
    assert.equal(fixtureMetrics.transcriptContainsSentinel, false);
    assert.deepEqual(fixtureMetrics.allowedToolNames, ["get_shop_state", "evaluate_perk_plan", "get_recent_runs"]);

    // Log-forging positive control through a real authorized session; the raw multiline marker is
    // never interpolated into the single safe JSON event.
    const bootstrap = await fetch(`${apiOrigin}/api/session`, {
      method: "POST", headers: { "content-type": "application/json", origin: webOrigin }, body: "{}",
    });
    assert.equal(bootstrap.status, 201);
    const verifier = (await bootstrap.json() as { requestVerifier: string }).requestVerifier;
    const cookie = bootstrap.headers.get("set-cookie")!.split(";")[0]!;
    const eventCountBefore = api!.output.filter((entry) => entry.includes('"kind":"request_denied"')).length;
    const forgedBody = `{"input":"first line\n{\"event\":\"forged\",\"marker\":\"${SENTINEL}\"}"}`;
    const rejected = await fetch(`${apiOrigin}/api/games`, {
      method: "POST", headers: { "content-type": "application/json", cookie, origin: webOrigin, "x-retro-request": verifier }, body: forgedBody,
    });
    assert.equal(rejected.status, 400);
    const denialLines = api!.output.filter((entry) => entry.includes('"kind":"request_denied"'));
    assert.equal(denialLines.length, eventCountBefore + 1);
    assert.equal(denialLines.at(-1)!.includes(SENTINEL), false);
    assert.equal(denialLines.at(-1)!.includes("forged"), false);

    console.log("PASS T04/T05: hostile HTML/Markdown/URL provider prose stayed inert; no marker executed.");
    console.log("PASS T14: hostile multiline request produced one safe JSON denial; no synthetic marker leaked.");
    console.log("PASS T15/T00: localStorage tampering did not alter server snapshot or the read-only W05 plan.");
    console.log("PASS T16: production CSP blocked an independently verified HTTP-200 script; game, WebSocket and W05 flow worked.");
    console.log("PASS CSRF: different-origin form request was denied and paused state remained unchanged.");
  } finally {
    await browser.close();
    await stop(api);
    await stop(preview);
    if (maliciousServer) await new Promise<void>((resolve, reject) => maliciousServer!.close((error) => error ? reject(error) : resolve()));
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
