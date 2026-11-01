#!/usr/bin/env node
// studio-managed: installed by the /studio skill; rerunning /studio updates this file.
// Remove this line to keep local edits.
//
// The studio art pipeline: checked-in recipes -> PixelLab takes (kept outside
// the repo) -> recorded verdicts -> byte-identical masters -> derived game
// files -> hash-checked validation. Zero dependencies (Node >= 18).
//
//   node tools/art/studio-art.mjs new-set <set> [--class <class>]
//   node tools/art/studio-art.mjs plan [<set>]
//   node tools/art/studio-art.mjs prompt <set> <id>
//   node tools/art/studio-art.mjs generate <set> <id>... [--dry-run] [--max N]
//   node tools/art/studio-art.mjs resume <set> <id>
//   node tools/art/studio-art.mjs accept <set> <id> <candidate> --notes "..."
//   node tools/art/studio-art.mjs reject <set> <id> <candidate> --notes "..."
//   node tools/art/studio-art.mjs sheet <out.png> --set <set> [--ids a,b] [--accepted] [--outputs] [--scale N] [--tile]
//   node tools/art/studio-art.mjs sheet <out.png> <png file or folder>... [--scale N] [--tile]
//   node tools/art/studio-art.mjs bake [<set>]
//   node tools/art/studio-art.mjs validate [<set>]
//   node tools/art/studio-art.mjs balance
//   node tools/art/studio-art.mjs inventory [--write <file.md>] [--json]
//
// Only `generate`, `resume` and `balance` call PixelLab. The key comes from
// PIXELLAB_API_KEY and is never printed or stored. See docs/art/PIPELINE.md.
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  fail, loadConfig, parseArgs, readJson, rel, sha256, withLock, writeFileAtomic, writeJsonAtomic,
} from "./lib/common.mjs";
import {
  alphaBounds, applyEdits, blank, checker, composite, crop, decodePng, downscale, encodePng, fillRect, flipX,
  hasTransparency, imageSize, pad, parseColour, pixelSha256, plate, scaleNearest,
} from "./lib/png.mjs";
import { drawText, GLYPH_H, textWidth } from "./lib/font.mjs";
import * as pixellab from "./lib/pixellab.mjs";

const cfg = loadConfig();
const setsDir = path.join(cfg.dataDir, "sets");
const fragmentsDir = path.join(cfg.dataDir, "fragments");
const mastersDir = path.join(cfg.dataDir, "masters");

// ------------------------------------------------------------------ data

const setDir = (set) => path.join(setsDir, set);
const recipesFile = (set) => path.join(setDir(set), "recipes.json");
const recordsFile = (set) => path.join(setDir(set), "records.json");
const verdictsFile = (set) => path.join(setDir(set), "verdicts.json");
const rawFile = (set, file) => path.join(cfg.rawDir, set, file);
const masterFile = (set, id, n) => path.join(mastersDir, set, `${id}-${n}.png`);

function listSets() {
  if (!fs.existsSync(setsDir)) return [];
  return fs.readdirSync(setsDir).filter((name) => fs.existsSync(recipesFile(name))).sort();
}

function loadSet(set) {
  if (!fs.existsSync(recipesFile(set))) fail(`no set "${set}" (${rel(cfg.root, recipesFile(set))}); create it with new-set`);
  const file = readJson(recipesFile(set));
  return {
    set,
    file,
    records: readJson(recordsFile(set), {}),
    verdicts: readJson(verdictsFile(set), {}),
  };
}

function expandShared(file, value) {
  if (typeof value === "string" && value.startsWith("@")) {
    const shared = file.shared?.[value.slice(1)];
    if (shared === undefined) throw new Error(`no shared.${value.slice(1)}`);
    return shared;
  }
  return value;
}

function recipe(file, id) {
  const found = (file.recipes ?? []).find((r) => r.id === id);
  if (found === undefined) fail(`unknown recipe ${id}`);
  const defaults = file.defaults ?? {};
  const expanded = Object.fromEntries(Object.entries(found).map(([k, v]) => [k, expandShared(file, v)]));
  return {
    endpoint: cfg.defaultEndpoint,
    fragments: [],
    noBackground: true,
    ...Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, expandShared(file, v)])),
    ...expanded,
    options: { ...expandShared(file, defaults.options ?? {}), ...expandShared(file, found.options ?? {}) },
    negative: [expandShared(file, defaults.negative ?? ""), expandShared(file, found.negative ?? "")].filter(Boolean).join(", "),
  };
}

function parseTake(take) {
  const match = /^(.+)#(\d+)$/.exec(take ?? "");
  if (match === null) fail(`bad take "${take}" (want <recipe-id>#<candidate>)`);
  return { id: match[1], n: Number(match[2]) };
}

async function updateJson(set, file, change) {
  return withLock(setDir(set), () => {
    const current = readJson(file, {});
    const next = change(current);
    writeJsonAtomic(file, next);
    return next;
  });
}

function fragment(name) {
  const file = path.join(fragmentsDir, `${name}.txt`);
  if (!fs.existsSync(file)) fail(`missing prompt fragment ${rel(cfg.root, file)}`);
  const text = fs.readFileSync(file, "utf8").trim();
  const negFile = path.join(fragmentsDir, `${name}.negative.txt`);
  const negative = fs.existsSync(negFile) ? fs.readFileSync(negFile, "utf8").trim() : "";
  return { text, negative };
}

/** Fragments, then the subject, then "Must not include: ..." (no endpoint has a working negative field). */
function description(r) {
  const layers = [];
  const negatives = [];
  for (const name of r.fragments ?? []) {
    const { text, negative } = fragment(name);
    layers.push({ source: `fragments/${name}.txt`, text });
    if (negative) negatives.push(negative);
  }
  if (r.subject) layers.push({ source: "recipe subject", text: r.subject });
  if (r.negative) negatives.push(r.negative);
  const terms = [...new Set(negatives.join(", ").split(",").map((t) => t.trim()).filter(Boolean))];
  const text = `${layers.map((l) => l.text).join(" ")}${terms.length ? ` Must not include: ${terms.join(", ")}.` : ""}`;
  return { text, layers };
}

function recordedCandidate(state, id, n) {
  const record = state.records[id];
  const candidate = record?.status === "DONE" ? record.candidates[n] : undefined;
  if (candidate === undefined) fail(`${state.set}: ${id}#${n} was not generated`);
  return candidate;
}

/** Bytes of a take: its master when accepted, else the raw candidate (hash-checked). */
function takeBytes(state, take) {
  const { id, n } = parseTake(take);
  const candidate = recordedCandidate(state, id, n);
  for (const file of [masterFile(state.set, id, n), rawFile(state.set, candidate.file)]) {
    if (!fs.existsSync(file)) continue;
    const bytes = fs.readFileSync(file);
    if (sha256(bytes) !== candidate.sha256) fail(`${rel(cfg.root, file)} is not the recorded ${take}`);
    return { bytes, label: `take ${state.set}/${take} sha256 ${candidate.sha256}` };
  }
  fail(`${take}: neither the master nor the raw take is on this machine (raw folder ${cfg.rawDir})`);
}

function imageSource(state, source) {
  if (source.take) return takeBytes(state, source.take);
  if (source.file) {
    const bytes = fs.readFileSync(path.join(cfg.root, source.file));
    return { bytes, label: `file ${source.file} sha256 ${sha256(bytes)}` };
  }
  fail("an image source wants { take } or { file }");
}

function requestFor(state, r) {
  const { text, layers } = description(r);
  const rule = pixellab.ENDPOINTS[r.endpoint];
  if (rule?.maxDescription && text.length > rule.maxDescription)
    fail(`${r.id}: description is ${text.length} characters (max ${rule.maxDescription}); shorten the fragments or subject`);
  const sizeIssues = pixellab.sizeProblems(r.endpoint, r.width, r.height, r.noBackground);
  if (sizeIssues.length) fail(`${r.id}: ${r.width}x${r.height} for ${r.endpoint}: ${sizeIssues.join("; ")}`);
  const body = {};
  const snapshot = { endpoint: r.endpoint, layers };
  if (rule?.edit) {
    if (!r.edit) fail(`${r.id}: ${r.endpoint} wants "edit": { "take" | "file" }`);
    const src = imageSource(state, r.edit);
    body.image = { base64: pixellab.dataUrl(src.bytes) };
    snapshot.image = src.label;
    Object.assign(body, { description: text, width: r.width, height: r.height, seed: r.seed, no_background: r.noBackground });
  } else {
    Object.assign(body, { description: text, image_size: { width: r.width, height: r.height }, no_background: r.noBackground, seed: r.seed });
  }
  Object.assign(body, r.options ?? {});
  if (r.styleImage) {
    const src = imageSource(state, r.styleImage);
    const size = imageSize(src.bytes);
    body.style_image = {
      image: { base64: pixellab.dataUrl(src.bytes) },
      size: { width: size.width, height: size.height },
      ...(r.styleImage.usage ? { usage_description: r.styleImage.usage } : {}),
    };
    body.style_options = r.styleOptions ?? { color_palette: true, outline: true, detail: true, shading: true };
    snapshot.style_image = { source: src.label, usage: r.styleImage.usage };
  }
  if (r.references?.length) {
    if (r.references.length > 4) fail(`${r.id}: at most 4 references`);
    body.reference_images = [];
    snapshot.reference_images = [];
    for (const ref of r.references) {
      const src = imageSource(state, ref);
      const size = imageSize(src.bytes);
      body.reference_images.push({ image: { base64: pixellab.dataUrl(src.bytes) }, size: { width: size.width, height: size.height }, ...(ref.usage ? { usage_description: ref.usage } : {}) });
      snapshot.reference_images.push({ source: src.label, usage: ref.usage });
    }
  }
  for (const [field, key] of [["colorImage", "color_image"], ["initImage", "init_image"]]) {
    if (!r[field]) continue;
    const src = imageSource(state, r[field]);
    body[key] = { type: "base64", base64: src.bytes.toString("base64"), format: "png" };
    snapshot[key] = src.label;
  }
  const { description: _d, image: _i, style_image: _s, reference_images: _r, color_image: _c, init_image: _n, ...plain } = body;
  return { body, snapshot: { ...snapshot, ...plain, description: text } };
}

// ------------------------------------------------------------------ commands

function newSet(args) {
  const set = args._[1];
  if (!set || !/^[a-z0-9][a-z0-9-]*$/.test(set)) fail("new-set wants a lower-case name like hero-sprites");
  if (fs.existsSync(recipesFile(set))) fail(`${rel(cfg.root, recipesFile(set))} exists`);
  const klass = args.class ?? "unclassified";
  writeJsonAtomic(recipesFile(set), {
    set,
    bead: "",
    class: klass,
    _doc: "See docs/art/PIPELINE.md. Recipes are never edited after generation: add a new id (new seed) instead. '@name' values come from shared.",
    shared: { options: { outline: "single color black outline", detail: "low detail" } },
    defaults: { endpoint: cfg.defaultEndpoint, fragments: ["style"], noBackground: true, options: "@options", negative: "text, letters, watermark, signature, frame, border" },
    recipes: [
      { id: `${set}-a`, concept: "EXAMPLE", width: 64, height: 64, seed: 1001, subject: "Subject: describe one thing, its colours and pose." },
    ],
    outputs: [],
  });
  const style = path.join(fragmentsDir, "style.txt");
  if (!fs.existsSync(style)) {
    fs.mkdirSync(fragmentsDir, { recursive: true });
    fs.writeFileSync(style, "Style: (awaiting the user's approved art direction; copy the style paragraph from docs/art/ART_DIRECTION.md here).\n");
  }
  console.log(`created ${rel(cfg.root, recipesFile(set))}`);
}

function statusOf(state, id) {
  const record = state.records[id];
  if (record === undefined) return "PENDING";
  if (record.status === "SUBMITTED") return "SUBMITTED";
  const verdicts = Object.entries(state.verdicts).filter(([k]) => k.startsWith(`${id}#`));
  if (verdicts.some(([, v]) => v.verdict === "ACCEPTED")) return "ACCEPTED";
  if (verdicts.length === record.candidates.length && verdicts.length > 0) return "REJECTED";
  return "TO-REVIEW";
}

function plan(args) {
  const sets = args._[1] ? [args._[1]] : listSets();
  if (sets.length === 0) console.log(`no sets yet under ${rel(cfg.root, setsDir)}; start one with new-set <name>`);
  let total = 0;
  let calls = 0;
  for (const set of sets) {
    const state = loadSet(set);
    console.log(`${set} (${state.file.class ?? "?"})`);
    for (const { id } of state.file.recipes ?? []) {
      const r = recipe(state.file, id);
      const record = state.records[id];
      const usd = record?.usageUsd;
      console.log(`  ${statusOf(state, id).padEnd(10)} ${id} ${r.endpoint} ${r.width}x${r.height} seed ${r.seed}${usd === undefined ? "" : ` $${usd.toFixed(4)}`}`);
      for (const [key, v] of Object.entries(state.verdicts).filter(([k]) => k.startsWith(`${id}#`)))
        console.log(`             ${key} ${v.verdict}: ${v.notes}`);
    }
    for (const out of state.file.outputs ?? []) console.log(`  output ${out.path} <- ${out.from}${out.steps?.length ? ` (${out.steps.map((s) => s.op).join(", ")})` : ""}`);
    for (const record of Object.values(state.records)) {
      calls += 1;
      total += record.usageUsd ?? 0;
    }
  }
  console.log(`${calls} PixelLab call(s) recorded, US$${total.toFixed(3)}; raw takes in ${cfg.rawDir}`);
}

function prompt(args) {
  const [, set, id] = args._;
  const state = loadSet(set);
  const { text } = description(recipe(state.file, id));
  console.log(`${text}\n(${text.length} characters)`);
}

async function finish(state, id, jobId, response, result) {
  const images = pixellab.imagesOf(result ?? response);
  if (images.length === 0) throw new Error(`${id}: the response held no image`);
  fs.mkdirSync(path.join(cfg.rawDir, state.set), { recursive: true });
  const candidates = images.map((bytes, index) => {
    const file = `${id}-${index}.png`;
    writeFileAtomic(rawFile(state.set, file), bytes);
    const size = imageSize(bytes) ?? {};
    return { file, sha256: sha256(bytes), width: size.width, height: size.height };
  });
  const usd = pixellab.usageUsd(result, response);
  await updateJson(state.set, recordsFile(state.set), (records) => ({
    ...records,
    [id]: { ...records[id], status: "DONE", jobId, at: new Date().toISOString(), ...(usd === undefined ? {} : { usageUsd: usd }), candidates },
  }));
  fs.appendFileSync(path.join(cfg.dataDir, "costs.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), set: state.set, id, endpoint: state.records[id]?.endpoint ?? recipe(state.file, id).endpoint, usd: usd ?? null })}\n`);
  console.log(`${id}: ${candidates.length} candidate(s) -> ${path.join(cfg.rawDir, state.set)}${usd === undefined ? "" : ` (US$${usd.toFixed(4)})`}`);
}

async function generate(args) {
  const [, set, ...ids] = args._;
  if (!set || ids.length === 0) fail("generate wants <set> <id>...");
  const state = loadSet(set);
  const todo = [];
  for (const id of ids) {
    const record = state.records[id];
    if (record?.status === "DONE") console.log(`${id}: already generated, skipped (no call). Add a new recipe id to try again.`);
    else if (record?.status === "SUBMITTED") console.log(`${id}: submitted earlier as job ${record.jobId}; run resume ${set} ${id}`);
    else todo.push(id);
  }
  const max = Number(args.max ?? cfg.maxCallsPerRun);
  if (todo.length > max) fail(`${todo.length} new calls exceed --max ${max}: sample a few, review them, then batch deliberately with --max`);
  for (const id of todo) {
    const r = recipe(state.file, id);
    const { body, snapshot } = requestFor(state, r);
    if (args["dry-run"]) {
      console.log(`${id}: would POST ${r.endpoint} (${JSON.stringify(body).length} bytes)\n${JSON.stringify(snapshot, null, 2)}`);
      continue;
    }
    console.log(`${id}: POST ${r.endpoint} ${r.width}x${r.height} seed ${r.seed}`);
    const started = await pixellab.submit(r.endpoint, body);
    const jobId = started.jobId ?? `sync-${randomUUID()}`;
    await updateJson(set, recordsFile(set), (records) => {
      if (records[id] !== undefined && records[id].status === "DONE") throw new Error(`${id} was recorded by another run meanwhile`);
      return { ...records, [id]: { id, status: "SUBMITTED", endpoint: r.endpoint, jobId, submittedAt: new Date().toISOString(), request: snapshot } };
    });
    state.records = readJson(recordsFile(set), {});
    if (started.done) await finish(state, id, jobId, started.response, null);
    else {
      console.log(`${id}: job ${jobId} submitted; polling (resume ${set} ${id} if interrupted)`);
      await finish(state, id, jobId, started.response, await pixellab.poll(jobId));
    }
  }
}

async function resume(args) {
  const [, set, id] = args._;
  const state = loadSet(set);
  const record = state.records[id];
  if (record?.status !== "SUBMITTED") fail(`${id} has no submitted job to resume`);
  if (record.jobId.startsWith("sync-")) fail(`${id} was a synchronous call that did not finish; delete its record entry and generate again`);
  await finish(state, id, record.jobId, null, await pixellab.poll(record.jobId, { intervalMs: 2_000 }));
}

async function verdict(args, kind) {
  const [, set, id, n] = args._;
  if (n === undefined || !args.notes) fail(`${kind.toLowerCase()} wants <set> <id> <candidate> --notes "why"`);
  const state = loadSet(set);
  const candidate = recordedCandidate(state, id, Number(n));
  const key = `${id}#${Number(n)}`;
  const master = masterFile(set, id, Number(n));
  if (kind === "ACCEPTED") {
    const raw = rawFile(set, candidate.file);
    const bytes = fs.existsSync(master) ? fs.readFileSync(master) : fs.existsSync(raw) ? fs.readFileSync(raw) : null;
    if (bytes === null) fail(`raw take ${raw} is missing`);
    if (sha256(bytes) !== candidate.sha256) fail(`${raw} changed since it was recorded`);
    writeFileAtomic(master, bytes);
  } else if (fs.existsSync(master)) {
    const used = (state.file.outputs ?? []).filter((o) => o.from === key);
    if (used.length) fail(`${key} is used by outputs ${used.map((o) => o.path).join(", ")}; repoint them first`);
    fs.rmSync(master);
  }
  await updateJson(set, verdictsFile(set), (verdicts) => ({
    ...verdicts,
    [key]: { verdict: kind, notes: args.notes, at: new Date().toISOString() },
  }));
  console.log(`${key}: ${kind}${kind === "ACCEPTED" ? ` -> ${rel(cfg.root, master)}` : ""}`);
}

// ------------------------------------------------------------------ derive

const STEPS = {
  crop: (r, s) => crop(r, s.x, s.y, s.width, s.height),
  scale: (r, s) => scaleNearest(r, s.factor),
  downscale: (r, s) => downscale(r, s.factor),
  edits: (r, s) => applyEdits(r, s.pixels ?? []),
  plate: (r, s) => plate(r, s.size, s.scale ?? 1, s.background),
  pad: (r, s) => pad(r, s.width, s.height, s.anchor),
  flipX: (r) => flipX(r),
};

function derive(state, output) {
  const { id, n } = parseTake(output.from);
  const v = state.verdicts[`${id}#${n}`];
  if (v?.verdict !== "ACCEPTED") throw new Error(`${output.path}: ${output.from} is not ACCEPTED`);
  const candidate = recordedCandidate(state, id, n);
  const file = masterFile(state.set, id, n);
  if (!fs.existsSync(file)) throw new Error(`${output.path}: master ${rel(cfg.root, file)} is missing`);
  const bytes = fs.readFileSync(file);
  if (sha256(bytes) !== candidate.sha256) throw new Error(`${rel(cfg.root, file)} is not the recorded ${output.from}`);
  let raster = decodePng(bytes);
  for (const step of output.steps ?? []) {
    const fn = STEPS[step.op];
    if (fn === undefined) throw new Error(`${output.path}: unknown step ${step.op} (known: ${Object.keys(STEPS).join(", ")})`);
    raster = fn(raster, step);
  }
  if (output.width !== undefined && (raster.width !== output.width || raster.height !== output.height))
    throw new Error(`${output.path}: derives ${raster.width}x${raster.height}, expected ${output.width}x${output.height}`);
  return raster;
}

function bake(args) {
  const sets = args._[1] ? [args._[1]] : listSets();
  let written = 0;
  for (const set of sets) {
    const state = loadSet(set);
    for (const output of state.file.outputs ?? []) {
      if (!output.path.endsWith(".png")) fail(`${output.path}: only .png outputs are derived; convert in a separate, recorded step`);
      const raster = derive(state, output);
      const target = path.join(cfg.root, output.path);
      if (fs.existsSync(target)) {
        try {
          if (pixelSha256(decodePng(fs.readFileSync(target))) === pixelSha256(raster)) continue;
        } catch {}
      }
      writeFileAtomic(target, encodePng(raster));
      written += 1;
      console.log(`baked ${output.path} (${raster.width}x${raster.height}) <- ${set}/${output.from}`);
    }
  }
  console.log(`${written} file(s) written`);
}

function validate(args) {
  const sets = args._[1] ? [args._[1]] : listSets();
  const problems = [];
  let masters = 0;
  let outputs = 0;
  for (const set of sets) {
    let state;
    try {
      state = { set, file: readJson(recipesFile(set)), records: readJson(recordsFile(set), {}), verdicts: readJson(verdictsFile(set), {}) };
    } catch (error) {
      problems.push(error.message);
      continue;
    }
    const ids = new Set();
    for (const raw of state.file.recipes ?? []) {
      if (ids.has(raw.id)) problems.push(`${set}: duplicate recipe id ${raw.id}`);
      ids.add(raw.id);
      try {
        const r = recipe(state.file, raw.id);
        if (!Number.isInteger(r.seed)) problems.push(`${set}/${r.id}: no integer seed`);
        const size = pixellab.sizeProblems(r.endpoint, r.width, r.height, r.noBackground);
        if (size.length) problems.push(`${set}/${r.id}: ${size.join("; ")}`);
      } catch (error) {
        problems.push(`${set}/${raw.id}: ${error.message}`);
      }
    }
    for (const [id, record] of Object.entries(state.records)) {
      if (!ids.has(id)) problems.push(`${set}: record ${id} has no recipe (recipes are never deleted after generation)`);
      if (record.status === "SUBMITTED") problems.push(`${set}/${id}: job ${record.jobId} never finished; resume it`);
    }
    for (const [key, v] of Object.entries(state.verdicts)) {
      const { id, n } = parseTake(key);
      const candidate = state.records[id]?.candidates?.[n];
      if (candidate === undefined) {
        problems.push(`${set}: verdict ${key} for a take that was never generated`);
        continue;
      }
      const file = masterFile(set, id, n);
      if (v.verdict === "ACCEPTED") {
        if (!fs.existsSync(file)) problems.push(`${set}: accepted ${key} has no master ${rel(cfg.root, file)}`);
        else if (sha256(fs.readFileSync(file)) !== candidate.sha256) problems.push(`${set}: ${rel(cfg.root, file)} is not the recorded take ${key}`);
        else masters += 1;
      } else if (fs.existsSync(file)) problems.push(`${set}: ${rel(cfg.root, file)} exists but ${key} is ${v.verdict}`);
    }
    const masterDir = path.join(mastersDir, set);
    if (fs.existsSync(masterDir))
      for (const name of fs.readdirSync(masterDir).filter((f) => f.endsWith(".png"))) {
        const match = /^(.+)-(\d+)\.png$/.exec(name);
        if (match === null || state.verdicts[`${match[1]}#${match[2]}`]?.verdict !== "ACCEPTED")
          problems.push(`${set}: master ${name} has no ACCEPTED verdict`);
      }
    for (const output of state.file.outputs ?? []) {
      try {
        const raster = derive(state, output);
        const target = path.join(cfg.root, output.path);
        if (!fs.existsSync(target)) problems.push(`${output.path} is missing (run bake)`);
        else if (pixelSha256(decodePng(fs.readFileSync(target))) !== pixelSha256(raster)) problems.push(`${output.path} is not what ${output.from} derives (run bake, or record a new take)`);
        else outputs += 1;
      } catch (error) {
        problems.push(error.message);
      }
    }
  }
  // Credential and payload hygiene of everything under the data folder.
  const key = process.env.PIXELLAB_API_KEY?.trim();
  const eleven = (process.env.ELEVENLAB_API_KEY ?? process.env.ELEVENLABS_API_KEY)?.trim();
  const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])) : []);
  for (const file of [...walk(cfg.dataDir), ...walk(cfg.sfxDir)].filter((f) => /\.(json|jsonl|txt|md)$/.test(f))) {
    const text = fs.readFileSync(file, "utf8");
    if ((key && text.includes(key)) || (eleven && text.includes(eleven))) problems.push(`${rel(cfg.root, file)} CONTAINS AN API KEY: remove it and rotate the key`);
    if (/Bearer\s+[A-Za-z0-9._-]{12,}/.test(text)) problems.push(`${rel(cfg.root, file)} contains a Bearer token`);
    if (/base64,[A-Za-z0-9+/=]{200,}/.test(text)) problems.push(`${rel(cfg.root, file)} contains an embedded image payload`);
  }
  if (problems.length) {
    for (const p of problems) console.log(`FAIL ${p}`);
    console.log(`${problems.length} problem(s)`);
    process.exit(1);
  }
  console.log(`ok: ${sets.length} set(s), ${masters} master(s), ${outputs} output(s) verified`);
}

// ------------------------------------------------------------------ sheets

const LIGHT = parseColour("#f2f2f2");
const DARK = parseColour("#1e2126");
const SHEET_BG = parseColour("#8f949b");
const INK = parseColour("#101114");
const GREEN = parseColour("#0b5d1e");
const RED = parseColour("#8b0d0d");

function tileOn(raster, bg, checkerColours) {
  const p = 4;
  const out = checkerColours ? checker(raster.width + p * 2, raster.height + p * 2, ...checkerColours) : blank(raster.width + p * 2, raster.height + p * 2, bg);
  return composite(out, raster, p, p);
}

function repeat3(raster) {
  const out = blank(raster.width * 3, raster.height * 3);
  for (let y = 0; y < 3; y += 1) for (let x = 0; x < 3; x += 1) composite(out, raster, x * raster.width, y * raster.height);
  return out;
}

function sheetItemsFromSet(args) {
  const state = loadSet(args.set);
  const items = [];
  if (args.outputs) {
    for (const output of state.file.outputs ?? []) {
      const file = path.join(cfg.root, output.path);
      if (fs.existsSync(file)) items.push({ label: output.path.split("/").pop(), sub: `<- ${output.from}`, raster: decodePng(fs.readFileSync(file)) });
    }
    return items;
  }
  const only = args.ids ? new Set(args.ids.split(",")) : null;
  for (const [id, record] of Object.entries(state.records)) {
    if (only && !only.has(id)) continue;
    if (record.status !== "DONE") continue;
    record.candidates.forEach((candidate, n) => {
      const v = state.verdicts[`${id}#${n}`];
      if (args.accepted && v?.verdict !== "ACCEPTED") return;
      const file = [masterFile(args.set, id, n), rawFile(args.set, candidate.file)].find((f) => fs.existsSync(f));
      if (!file) {
        console.log(`skip ${id}#${n}: no raw take on this machine`);
        return;
      }
      items.push({ label: `${id}#${n}`, sub: v ? v.verdict : "TO REVIEW", status: v?.verdict, raster: decodePng(fs.readFileSync(file)) });
    });
  }
  return items;
}

function sheetItemsFromPaths(paths) {
  const files = paths.flatMap((p) => {
    const full = path.resolve(p);
    if (fs.statSync(full).isDirectory()) return fs.readdirSync(full).filter((f) => f.toLowerCase().endsWith(".png")).sort().map((f) => path.join(full, f));
    return [full];
  });
  return files.flatMap((file) => {
    try {
      return [{ label: path.basename(file), sub: "", raster: decodePng(fs.readFileSync(file)) }];
    } catch (error) {
      console.log(`skip ${file}: ${error.message}`);
      return [];
    }
  });
}

function sheet(args) {
  const out = args._[1];
  if (!out || !out.endsWith(".png")) fail("sheet wants an output .png path");
  const items = args.set ? sheetItemsFromSet(args) : sheetItemsFromPaths(args._.slice(2));
  if (items.length === 0) fail("nothing to show");
  const maxSide = Math.max(...items.map((i) => Math.max(i.raster.width, i.raster.height)));
  const scale = Number(args.scale ?? Math.max(1, Math.min(8, Math.floor(192 / maxSide))));
  const blocks = items.map((item) => {
    const tiles = [tileOn(item.raster, LIGHT), tileOn(item.raster, DARK)];
    if (scale > 1) {
      const big = scaleNearest(item.raster, scale);
      tiles.push(tileOn(big, null, [parseColour("#ffffff"), parseColour("#e2e2e2")]), tileOn(big, null, [parseColour("#2c3036"), parseColour("#1e2126")]));
    }
    if (args.tile) tiles.push(tileOn(repeat3(item.raster), LIGHT));
    const meta = `${item.raster.width}X${item.raster.height}${hasTransparency(item.raster) ? " A" : ""}`;
    const head = (GLYPH_H + 3) * 2;
    const width = Math.max(tiles.reduce((s, t) => s + t.width + 6, 0), textWidth(item.label) + 4, textWidth(`${item.sub} ${meta}`) + 4);
    const height = head + Math.max(...tiles.map((t) => t.height));
    const block = blank(width, height, SHEET_BG);
    drawText(block, item.label, 0, 0, INK);
    drawText(block, `${item.sub} ${meta}`.trim(), 0, GLYPH_H + 3, item.status === "ACCEPTED" ? GREEN : item.status === "REJECTED" ? RED : INK);
    let x = 0;
    for (const t of tiles) {
      composite(block, t, x, head);
      x += t.width + 6;
    }
    return block;
  });
  const gap = 14;
  const maxWidth = Math.max(Number(args.width ?? 1600), ...blocks.map((b) => b.width));
  const rows = [];
  let row = [];
  let rowWidth = 0;
  for (const b of blocks) {
    if (row.length && rowWidth + b.width + gap > maxWidth) {
      rows.push(row);
      row = [];
      rowWidth = 0;
    }
    row.push(b);
    rowWidth += b.width + gap;
  }
  rows.push(row);
  const width = Math.max(...rows.map((r) => r.reduce((s, b) => s + b.width + gap, gap)));
  const height = rows.reduce((s, r) => s + Math.max(...r.map((b) => b.height)) + gap, gap);
  const sheetRaster = blank(width, height, SHEET_BG);
  let y = gap;
  for (const r of rows) {
    let x = gap;
    for (const b of r) {
      composite(sheetRaster, b, x, y);
      x += b.width + gap;
    }
    y += Math.max(...r.map((b) => b.height)) + gap;
  }
  fillRect(sheetRaster, 0, 0, width, 1, INK);
  writeFileAtomic(path.resolve(out), encodePng(sheetRaster));
  console.log(`wrote ${out} (${items.length} image(s); native on light and dark${scale > 1 ? `, x${scale} on light and dark checkers` : ""}${args.tile ? ", 3x3 repeat" : ""})`);
}

// ------------------------------------------------------------------ inventory

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico", ".svg", ".aseprite", ".ase", ".psd", ".tga"]);
const TEXT_EXT = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".html", ".htm", ".css", ".scss", ".json", ".py", ".lua", ".gd", ".tscn", ".tres", ".cs", ".rs", ".go", ".java", ".kt", ".c", ".cc", ".cpp", ".h", ".hpp", ".swift", ".yaml", ".yml", ".toml", ".xml", ".plist", ".vue", ".svelte", ".rb", ".php", ".tmx", ".tsx", ".atlas", ".fnt", ".webmanifest"]);
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", "out", ".orchestration", ".beads", "vendor", "venv", ".venv", "__pycache__", "target", "Library", "Temp", "obj", ".godot", ".import", "coverage", ".next", ".cache", ".claude", ".parcel-cache", "bower_components"]);

function walkRepo(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walkRepo(path.join(dir, entry.name), acc);
    } else if (entry.isFile()) acc.push(path.join(dir, entry.name));
  }
  return acc;
}

function proposeClass(relPath, size) {
  const p = relPath.toLowerCase();
  const name = path.basename(p);
  const rules = [
    [/favicon|apple-touch|app-?icon|launcher|icon-\d+|logo/, "app-icon / branding"],
    [/(^|[/_.-])(fonts?|glyphs?)([/_.-]|$)/, "font"],
    [/(^|[/_.-])(ui|hud|gui|button|btn|cursor|panel|menu|frame)s?([/_.-]|$)/, "ui"],
    [/(^|[/_.-])(icons?)([/_.-]|$)/, "ui-icons"],
    [/(^|[/_.-])(tiles?|tileset|terrain|ground|floor|wall|map)s?([/_.-]|$)/, "tiles / terrain"],
    [/(^|[/_.-])(bg|backgrounds?|backdrop|sky|parallax|scene|splash|title)([/_.-]|$)/, "backgrounds"],
    [/(^|[/_.-])(fx|vfx|effects?|particles?|explosion|smoke|spark)s?([/_.-]|$)/, "effects"],
    [/(^|[/_.-])(portraits?|avatars?|faces?)([/_.-]|$)/, "portraits"],
    [/(^|[/_.-])(items?|pickups?|loot|weapons?|powerups?|coins?|gems?)([/_.-]|$)/, "items"],
    [/(^|[/_.-])(buildings?|houses?|structures?|castle|tower)s?([/_.-]|$)/, "buildings"],
    [/(^|[/_.-])(sprites?|units?|chars?|characters?|players?|enemies|enemy|heroes|hero|mobs?|npcs?|monsters?)([/_.-]|$)/, "characters / units"],
  ];
  for (const [re, klass] of rules) if (re.test(p) || re.test(name)) return klass;
  if (size && size.width && size.height && size.width >= size.height * 2 && size.width % size.height === 0) return "sprite sheet (frames?)";
  return "unclassified";
}

function inventory(args) {
  const files = walkRepo(cfg.root);
  const studioData = rel(cfg.root, cfg.dataDir) + "/";
  const images = files.filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()));
  const texts = files.filter((f) => TEXT_EXT.has(path.extname(f).toLowerCase()) && fs.statSync(f).size < 2_000_000 && !f.includes(`${path.sep}tools${path.sep}art${path.sep}`));
  const corpus = texts.map((f) => ({ file: rel(cfg.root, f), lines: fs.readFileSync(f, "utf8").split("\n") }));
  const rows = images.map((file) => {
    const r = rel(cfg.root, file);
    const bytes = fs.readFileSync(file);
    let size = imageSize(bytes);
    if (size === null && r.endsWith(".svg")) {
      const text = bytes.toString("utf8", 0, 4000);
      const w = /\swidth="(\d+)/.exec(text)?.[1];
      const h = /\sheight="(\d+)/.exec(text)?.[1];
      const vb = /viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"/.exec(text);
      size = { width: Number(w ?? vb?.[1]) || undefined, height: Number(h ?? vb?.[2]) || undefined, format: "svg" };
    }
    const base = path.basename(r);
    const stem = base.replace(/\.[^.]+$/, "");
    const refs = [];
    for (const { file: tf, lines } of corpus) {
      lines.forEach((line, i) => {
        if (refs.length < 50 && (line.includes(base) || (stem.length >= 5 && new RegExp(`\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(line)))) refs.push(`${tf}:${i + 1}`);
      });
    }
    let alpha = null;
    if (size?.format === "png") {
      try {
        const raster = decodePng(bytes);
        alpha = hasTransparency(raster);
        const bounds = alphaBounds(raster);
        if (bounds) size.content = `${bounds.width}x${bounds.height}`;
      } catch {}
    }
    return {
      path: r,
      bytes: bytes.length,
      width: size?.width ?? null,
      height: size?.height ?? null,
      format: size?.format ?? path.extname(r).slice(1),
      alpha,
      content: size?.content ?? null,
      studio: r.startsWith(studioData),
      refs,
      class: proposeClass(r, size),
    };
  });
  if (args.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  const legacy = rows.filter((r) => !r.studio);
  const byClass = new Map();
  for (const r of legacy) byClass.set(r.class, [...(byClass.get(r.class) ?? []), r]);
  const loaders = new Map();
  for (const r of legacy) for (const ref of r.refs) loaders.set(ref.split(":")[0], (loaders.get(ref.split(":")[0]) ?? 0) + 1);
  const unused = legacy.filter((r) => r.refs.length === 0);
  const lines = [];
  lines.push(`Generated by \`node tools/art/studio-art.mjs inventory --write docs/art/ASSET_INVENTORY.md\` on ${new Date().toISOString().slice(0, 10)}. Rerunning replaces only this block.`);
  lines.push("");
  lines.push(`**${legacy.length} image file(s)** outside the studio data folder (${(legacy.reduce((s, r) => s + r.bytes, 0) / 1024).toFixed(0)} KiB)${rows.length > legacy.length ? `, plus ${rows.length - legacy.length} studio master(s)` : ""}. ${unused.length} have no reference found in code (dynamic paths, atlases or unused).`);
  lines.push("");
  lines.push("| Proposed class | Files | Sizes |");
  lines.push("| --- | ---: | --- |");
  for (const [klass, list] of [...byClass].sort((a, b) => b[1].length - a[1].length)) {
    const sizes = [...new Set(list.map((r) => (r.width ? `${r.width}x${r.height}` : "?")))];
    lines.push(`| ${klass} | ${list.length} | ${sizes.slice(0, 6).join(", ")}${sizes.length > 6 ? ", ..." : ""} |`);
  }
  lines.push("");
  if (loaders.size) {
    lines.push("Where images are referenced (file: references):");
    lines.push("");
    for (const [file, count] of [...loaders].sort((a, b) => b[1] - a[1]).slice(0, 12)) lines.push(`- \`${file}\`: ${count}`);
    lines.push("");
  }
  lines.push("| File | Size | Bytes | Alpha | Content box | Used in | Proposed class |");
  lines.push("| --- | --- | ---: | --- | --- | --- | --- |");
  for (const r of legacy.sort((a, b) => a.path.localeCompare(b.path)))
    lines.push(`| \`${r.path}\` | ${r.width ? `${r.width}x${r.height}` : "?"} | ${r.bytes} | ${r.alpha === null ? "-" : r.alpha ? "yes" : "no"} | ${r.content ?? "-"} | ${r.refs.length ? r.refs.slice(0, 3).map((x) => `\`${x}\``).join(", ") + (r.refs.length > 3 ? ` +${r.refs.length - 3}` : "") : "**none found**"} | ${r.class} |`);
  const block = lines.join("\n");
  if (!args.write) {
    console.log(block);
    return;
  }
  const target = path.resolve(cfg.root, args.write);
  const BEGIN = "<!-- studio:inventory:begin -->";
  const END = "<!-- studio:inventory:end -->";
  let doc = fs.existsSync(target)
    ? fs.readFileSync(target, "utf8")
    : `# Asset inventory\n\nEvery image the project ships today, for planning a graphics refresh. The orchestrator fills in the notes below the generated block: what each class should become, which assets to keep, and the order of the refresh.\n\n${BEGIN}\n${END}\n\n## Refresh notes\n\n- (awaiting the user's direction)\n`;
  if (!doc.includes(BEGIN)) doc = `${doc.trimEnd()}\n\n${BEGIN}\n${END}\n`;
  doc = doc.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}`), `${BEGIN}\n${block}\n${END}`);
  writeFileAtomic(target, doc);
  console.log(`wrote ${rel(cfg.root, target)}: ${legacy.length} image(s), ${byClass.size} class(es), ${unused.length} without references`);
}

// ------------------------------------------------------------------ main

const argv = process.argv.slice(2);
const args = parseArgs(argv, ["dry-run", "accepted", "outputs", "tile", "json"]);
const command = args._[0];
const commands = {
  "new-set": () => newSet(args),
  plan: () => plan(args),
  prompt: () => prompt(args),
  generate: () => generate(args),
  resume: () => resume(args),
  accept: () => verdict(args, "ACCEPTED"),
  reject: () => verdict(args, "REJECTED"),
  sheet: () => sheet(args),
  bake: () => bake(args),
  validate: () => validate(args),
  balance: async () => console.log(JSON.stringify(await pixellab.balance(), null, 2)),
  inventory: () => inventory(args),
};
if (!commands[command]) {
  console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//   ")).map((l) => l.slice(3)).join("\n"));
  process.exit(command ? 1 : 0);
}
try {
  await commands[command]();
} catch (error) {
  fail(pixellab.redact(error.message));
}
