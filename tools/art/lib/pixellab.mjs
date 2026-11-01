// studio-managed: installed by the /studio skill; rerunning /studio updates this file.
// Remove this line to keep local edits.
//
// Minimal PixelLab v2 client (https://api.pixellab.ai/v2, OpenAPI at
// /v2/openapi.json, LLM docs at /v2/llms.txt).
//
// - The key is read from PIXELLAB_API_KEY only, sent as a Bearer token and
//   never printed, logged or written; error bodies are redacted.
// - POST returns either the image directly (create-image-pixen,
//   create-image-pixflux: synchronous) or { background_job_id } (generate-image-v2,
//   edit-image-pixen, ...), polled at GET /background-jobs/{id} until
//   status is "completed" (result under last_response) or "failed".
// - 429 and 502/503/504 are retried with backoff; other errors are not.
// - Cost comes back as usage: { type: "usd", usd } on the response or the job.
import process from "node:process";

export const API = process.env.PIXELLAB_API_BASE ?? "https://api.pixellab.ai/v2";
const RETRY = new Set([429, 502, 503, 504]);
const POLL_MS = 5_000;
const TIMEOUT_MS = 12 * 60_000;

/** Endpoint rules (from the OpenAPI schema, 2026-10). */
export const ENDPOINTS = {
  "create-image-pixen": { sync: true, multipleOf: 4, min: 16, maxArea: 512 * 512, squareBelow: 32, maxNoBackgroundArea: 65_536, maxDescription: 2000 },
  "create-image-pixflux": { sync: true, min: 16, maxSide: 400, maxDescription: 2000 },
  "create-image-bitforge": { sync: true, min: 16, maxSide: 200, maxDescription: 2000 },
  "generate-image-v2": { sync: false, min: 16, maxDescription: 2000 },
  "generate-ui-v2": { sync: false, min: 16, maxDescription: 2000 },
  "edit-image-pixen": { sync: false, multipleOf: 4, min: 16, maxArea: 256 * 256, maxSide: 256, edit: true, maxDescription: 2000 },
};

export function sizeProblems(endpoint, width, height, noBackground) {
  const rule = ENDPOINTS[endpoint];
  if (rule === undefined) return [];
  const out = [];
  if (!Number.isInteger(width) || !Number.isInteger(height)) out.push("width and height must be integers");
  if (rule.min && (width < rule.min || height < rule.min)) out.push(`sides must be at least ${rule.min}`);
  if (rule.multipleOf && (width % rule.multipleOf || height % rule.multipleOf)) out.push(`sides must be multiples of ${rule.multipleOf}`);
  if (rule.maxArea && width * height > rule.maxArea) out.push(`area must be at most ${rule.maxArea} px`);
  if (rule.maxSide && (width > rule.maxSide || height > rule.maxSide)) out.push(`sides must be at most ${rule.maxSide}`);
  if (rule.squareBelow && (width < rule.squareBelow || height < rule.squareBelow) && width !== height) out.push(`must be square when a side is below ${rule.squareBelow}`);
  if (rule.maxNoBackgroundArea && noBackground && width * height > rule.maxNoBackgroundArea) out.push(`transparent background needs area <= ${rule.maxNoBackgroundArea}`);
  return out;
}

export function apiKey() {
  const key = process.env.PIXELLAB_API_KEY;
  if (key === undefined || key.trim() === "")
    throw new Error("PIXELLAB_API_KEY is not set in the environment (the tool reads the key from the environment only)");
  return key.trim();
}

export function redact(text) {
  return String(text)
    .replaceAll(/data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, "[image]")
    .replaceAll(/"base64"\s*:\s*"[A-Za-z0-9+/=]{100,}"/g, '"base64":"[image]"')
    .replaceAll(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replaceAll(/[\r\n]+/g, " ")
    .slice(0, 500);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function send(method, path, body) {
  const key = apiKey();
  let last = "";
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.ok) return response.json();
    last = `${method} ${path}: HTTP ${response.status}: ${redact(await response.text())}`;
    if (!RETRY.has(response.status)) break;
    await delay(3_000 * attempt);
  }
  throw new Error(last);
}

function property(value, key) {
  return typeof value === "object" && value !== null ? value[key] : undefined;
}

export function usageUsd(...values) {
  for (const value of values) {
    const usd = property(property(value, "usage"), "usd");
    if (typeof usd === "number") return usd;
  }
  return undefined;
}

/** Every image payload in a response, decoded. */
export function collectImages(value, found = []) {
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) found.push(Buffer.from(value.slice(value.indexOf("base64,") + 7), "base64"));
    return found;
  }
  if (typeof value !== "object" || value === null) return found;
  const direct = property(value, "base64");
  if (typeof direct === "string" && direct.length > 100) {
    const at = direct.indexOf("base64,");
    found.push(Buffer.from(at >= 0 ? direct.slice(at + 7) : direct, "base64"));
    return found;
  }
  for (const nested of Object.values(value)) collectImages(nested, found);
  return found;
}

/**
 * Starts a request. Returns { jobId, done, response }: done is true when the
 * images came back directly; otherwise poll(jobId).
 */
export async function submit(endpoint, body) {
  const response = await send("POST", `/${endpoint}`, body);
  const jobId = property(response, "background_job_id");
  if (typeof jobId === "string" && jobId !== "") return { jobId, done: false, response };
  return { jobId: null, done: true, response };
}

export async function poll(jobId, { intervalMs = POLL_MS, timeoutMs = TIMEOUT_MS } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await delay(intervalMs);
    const job = await send("GET", `/background-jobs/${encodeURIComponent(jobId)}`);
    const status = property(job, "status");
    if (status === "completed") return job;
    if (status === "failed") throw new Error(`PixelLab job ${jobId} failed: ${redact(JSON.stringify(property(job, "last_response") ?? job))}`);
  }
  throw new Error(`PixelLab job ${jobId} still running after ${timeoutMs / 1000} s; run resume later`);
}

export function imagesOf(result) {
  return collectImages(property(result, "last_response") ?? result);
}

export async function balance() {
  return send("GET", "/balance");
}

export const dataUrl = (bytes) => `data:image/png;base64,${bytes.toString("base64")}`;
