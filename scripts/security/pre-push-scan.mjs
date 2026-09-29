#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

const mode = process.argv[2];
if (mode !== "--push" && mode !== "--worktree") {
  console.error("Usage: node scripts/security/pre-push-scan.mjs --push|--worktree");
  process.exit(2);
}

function git(args, options = {}) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...options });
}

function splitNul(value) {
  return value.split("\0").filter(Boolean);
}

function isSecretPath(filePath) {
  if (/(?:^|\/)(?:secrets?|credentials?)(?:\/|$)/i.test(filePath)) return true;
  const name = basename(filePath).toLowerCase();
  if (name === ".env" || (name.startsWith(".env.") && name !== ".env.example")) return true;
  if (["id_rsa", "id_ed25519", "credentials.json", "service-account.json"].includes(name)) return true;
  if (/(?:secret|credential)/i.test(name)) return true;
  return [".pem", ".p12", ".pfx", ".key"].some((suffix) => name.endsWith(suffix));
}

function isTracked(filePath) {
  try {
    git(["ls-files", "--error-unmatch", "--", filePath]);
    return true;
  } catch {
    return false;
  }
}

// Build signatures from fragments so this scanner does not match its own source.
const credentialPatterns = [
  { name: "Google API key", expression: new RegExp("AI" + "za" + "[A-Za-z0-9_-]{30,}") },
  { name: "Gemini key assignment", expression: new RegExp("['\"]?(?:GEMINI|GOOGLE)_API_KEY['\"]?\\s*[:=]\\s*['\"](?!your_|replace_)[^'\"\\s]{16,}['\"]", "i") },
  { name: "provider token", expression: new RegExp("(?:sk-|gh[pousr]_|xox[baprs]-)[A-Za-z0-9_-]{24,}") },
  { name: "private key material", expression: new RegExp(["-----", "BEGIN ", "(?:RSA |EC |OPENSSH )?PRIVATE KEY", "-----"].join("")) },
];
const viteSecretReference = /(?:import\.meta\.env|process\.env)\.VITE_[A-Z0-9_]*(?:API_?KEY|SECRET|TOKEN)/i;
const geminiClientReference = /\bGEMINI_API_KEY\b/;
const findings = [];

function checkText(filePath, text, origin) {
  if (text.includes("\0")) return;
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    for (const pattern of credentialPatterns) {
      if (pattern.expression.test(lines[index])) findings.push(`${origin}: ${filePath}:${index + 1} matches ${pattern.name}`);
    }
    const isClientFile = filePath.startsWith("src/") || filePath === "index.html" || filePath.startsWith("dist/") || /^vite\.config\./.test(filePath);
    if (isClientFile && viteSecretReference.test(lines[index])) findings.push(`${origin}: ${filePath}:${index + 1} references a Vite secret variable`);
    if (isClientFile && geminiClientReference.test(lines[index])) findings.push(`${origin}: ${filePath}:${index + 1} references the Gemini server secret`);
  }
}

function scanWorkingPath(filePath) {
  if (isSecretPath(filePath)) {
    if (isTracked(filePath)) findings.push(`worktree: ${filePath} is tracked; contents were not read`);
    return;
  }
  try {
    if (!lstatSync(filePath).isFile()) return;
    checkText(filePath.replaceAll("\\", "/"), readFileSync(filePath, "utf8"), "worktree");
  } catch {
    // Files may disappear while scanning; outgoing Git objects are checked separately.
  }
}

function scanBuildDirectory(directory) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (isSecretPath(path)) continue;
    if (entry.isDirectory()) scanBuildDirectory(path);
    else if (entry.isFile()) scanWorkingPath(path);
  }
}

function scanWorktree() {
  const paths = splitNul(git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"]));
  for (const filePath of paths) scanWorkingPath(filePath);
  // dist is ignored by Git but may contain the browser bundle about to be shared.
  scanBuildDirectory("dist");
}

function scanCommit(commit) {
  // Scan the full tree at each reachable commit. This includes root commits and ensures a
  // credential cannot be hidden by removing it in a later commit before the push.
  const committedPaths = splitNul(git(["ls-tree", "-r", "--name-only", "-z", commit]));
  for (const filePath of committedPaths) {
    if (isSecretPath(filePath)) {
      findings.push(`outgoing commit ${commit}: secret-like path ${filePath}; contents were not read`);
      continue;
    }
    let content;
    try {
      content = git(["show", `${commit}:${filePath}`], { stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      continue; // Deleted in this commit.
    }
    checkText(filePath, content, `outgoing commit ${commit}`);
  }
}

function scanOutgoingCommits() {
  const input = readFileSync(0, "utf8").trim();
  const zeroSha = /^0+$/;
  const scanned = new Set();
  for (const line of input ? input.split(/\r?\n/) : []) {
    const [localRef, localSha, remoteRef, remoteSha] = line.trim().split(/\s+/);
    if (!localSha || zeroSha.test(localSha)) continue;
    const commits = zeroSha.test(remoteSha ?? "")
      ? splitNul(git(["rev-list", "--reverse", localSha]).replaceAll("\n", "\0"))
      : splitNul(git(["rev-list", "--reverse", localSha, `^${remoteSha}`]).replaceAll("\n", "\0"));
    for (const commit of commits) {
      scanCommit(commit);
      scanned.add(commit);
    }
    if (commits.length) console.log(`Scanned ${commits.length} outgoing commit(s) for ${localRef} -> ${remoteRef}.`);
  }

  // Also inspect locally reachable history, so a credential committed earlier cannot be
  // overlooked simply because its commit is already an ancestor of the branch being pushed.
  const history = splitNul(git(["rev-list", "--all", "--reverse"]).replaceAll("\n", "\0"));
  const remaining = history.filter((commit) => !scanned.has(commit));
  for (const commit of remaining) scanCommit(commit);
  if (remaining.length) console.log(`Scanned ${remaining.length} additional locally reachable commit(s).`);
}

try {
  if (mode === "--push") scanOutgoingCommits();
  scanWorktree();
} catch (error) {
  console.error(`Security scan could not complete: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exit(2);
}

if (findings.length) {
  console.error("Pre-push security scan failed. Remove the finding or rotate the exposed credential; no secret value was printed.");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Pre-push security scan passed: no known credential patterns or client secret references found.");
