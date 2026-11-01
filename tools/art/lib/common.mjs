// studio-managed: installed by the /studio skill; rerunning /studio updates this file.
// Remove this line to keep local edits.
//
// Shared helpers: repository paths, the tool config, JSON I/O, atomic writes
// and a crash-safe directory lock for concurrent runs.
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TOOL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function repoRoot() {
  let dir = TOOL_DIR;
  for (;;) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    const up = path.dirname(dir);
    if (up === dir) return path.resolve(TOOL_DIR, "..", "..");
    dir = up;
  }
}

export function expandHome(p) {
  return p === "~" ? os.homedir() : p.startsWith("~/") ? path.join(os.homedir(), p.slice(2)) : p;
}

/** tools/art/studio-art.config.json, with defaults. */
export function loadConfig(root = repoRoot()) {
  const file = path.join(TOOL_DIR, "studio-art.config.json");
  const cfg = readJson(file, {});
  const repo = path.basename(root);
  const rawTemplate = process.env.STUDIO_RAW_DIR ?? cfg.rawDir ?? "~/.studio-raw/{repo}";
  return {
    root,
    repo,
    dataDir: path.join(root, cfg.dataDir ?? "art"),
    rawDir: path.resolve(expandHome(rawTemplate.replaceAll("{repo}", repo))),
    maxCallsPerRun: cfg.maxCallsPerRun ?? 4,
    defaultEndpoint: cfg.defaultEndpoint ?? "create-image-pixen",
    sfxDir: path.join(root, cfg.sfxDir ?? "audio/sfx"),
  };
}

export function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT" && fallback !== undefined) return fallback;
    if (error.code === "ENOENT") throw new Error(`${file} does not exist`);
    throw new Error(`${file}: ${error.message}`);
  }
}

export function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

export function writeFileAtomic(file, bytes) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, bytes);
  fs.renameSync(tmp, file);
}

const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

/**
 * Runs `fn` holding `<dir>/.lock` (a directory). A lock whose process is gone
 * or that is older than 10 minutes is broken; a live one is waited for 60 s.
 */
export async function withLock(dir, fn) {
  fs.mkdirSync(dir, { recursive: true });
  const lock = path.join(dir, ".lock");
  const deadline = Date.now() + 60_000;
  for (;;) {
    try {
      fs.mkdirSync(lock);
      fs.writeFileSync(path.join(lock, "pid"), String(process.pid));
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      let stale = false;
      try {
        const pid = Number(fs.readFileSync(path.join(lock, "pid"), "utf8"));
        const age = Date.now() - fs.statSync(lock).mtimeMs;
        stale = (pid > 0 && !alive(pid)) || age > 10 * 60_000;
      } catch {
        stale = Date.now() - (fs.statSync(lock, { throwIfNoEntry: false })?.mtimeMs ?? 0) > 5_000;
      }
      if (stale) {
        fs.rmSync(lock, { recursive: true, force: true });
        continue;
      }
      if (Date.now() > deadline) throw new Error(`waited 60 s for the lock ${lock}`);
      sleepSync(250);
    }
  }
  try {
    return await fn();
  } finally {
    fs.rmSync(lock, { recursive: true, force: true });
  }
}

export function rel(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

/** Parses "--key value" and "--flag" options; returns { _: positional, ...options }. */
export function parseArgs(argv, flags = []) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (flags.includes(key)) out[key] = true;
      else {
        if (i + 1 >= argv.length) throw new Error(`${arg} wants a value`);
        out[key] = argv[(i += 1)];
      }
    } else out._.push(arg);
  }
  return out;
}

export function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}
