#!/usr/bin/env node
// studio-managed: installed by the /studio skill; rerunning /studio updates this file.
// Remove this line to keep local edits.
//
// Sound effects from ElevenLabs, with the same discipline as the art tool:
// checked-in prompts, raw takes outside the repo, recorded verdicts, accepted
// takes copied byte for byte to their game path, hash-checked validation.
//
//   node tools/art/sfx.mjs plan
//   node tools/art/sfx.mjs generate [--only <id>] [--max N]
//   node tools/art/sfx.mjs accept <id> <take> --notes "..."
//   node tools/art/sfx.mjs reject <id> <take> --notes "..."
//   node tools/art/sfx.mjs validate
//
// audio/sfx/prompts.json:
//   { "sounds": [ { "id": "ui.click", "prompt": "a short soft wooden click",
//       "duration": 0.5, "influence": 0.6, "takes": 3,
//       "output": "public/sfx/click.mp3" } ] }
//
// POST https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128
// with header xi-api-key and { text, duration_seconds (0.5-30),
// prompt_influence (0-1), loop, model_id "eleven_text_to_sound_v2" }.
// The key is read from ELEVENLAB_API_KEY (no S; ELEVENLABS_API_KEY also
// works) and never printed. Nothing here plays a sound.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fail, loadConfig, parseArgs, readJson, rel, sha256, withLock, writeFileAtomic, writeJsonAtomic } from "./lib/common.mjs";

const API = "https://api.elevenlabs.io/v1";
const FORMAT = process.env.ELEVENLABS_OUTPUT_FORMAT ?? "mp3_44100_128";
const MODEL = "eleven_text_to_sound_v2";
const cfg = loadConfig();
const promptsFile = path.join(cfg.sfxDir, "prompts.json");
const recordsFile = path.join(cfg.sfxDir, "records.json");
const verdictsFile = path.join(cfg.sfxDir, "verdicts.json");
const rawDir = path.join(cfg.rawDir, "sfx");
const ext = FORMAT.startsWith("mp3") ? "mp3" : FORMAT.startsWith("pcm") ? "pcm" : "bin";

function key() {
  const k = (process.env.ELEVENLAB_API_KEY ?? process.env.ELEVENLABS_API_KEY ?? "").trim();
  if (!k) fail("ELEVENLAB_API_KEY is not set in the environment");
  return k;
}

const prompts = () => readJson(promptsFile, { sounds: [] });

async function update(file, change) {
  return withLock(cfg.sfxDir, () => {
    const next = change(readJson(file, {}));
    writeJsonAtomic(file, next);
    return next;
  });
}

function plan() {
  const records = readJson(recordsFile, {});
  const verdicts = readJson(verdictsFile, {});
  for (const s of prompts().sounds) {
    const takes = Object.keys(records).filter((k) => k.startsWith(`${s.id}#`)).length;
    const accepted = Object.entries(verdicts).find(([k, v]) => k.startsWith(`${s.id}#`) && v.verdict === "ACCEPTED");
    console.log(`${(accepted ? `ACCEPTED ${accepted[0]}` : `${takes}/${s.takes ?? 3} takes`).padEnd(22)} ${s.id} ${s.duration}s -> ${s.output ?? "(no output path)"}`);
  }
  console.log(`raw takes in ${rawDir}`);
}

async function generate(args) {
  key();
  const records = readJson(recordsFile, {});
  const todo = [];
  for (const s of prompts().sounds) {
    if (args.only && s.id !== args.only) continue;
    for (let n = 0; n < (s.takes ?? 3); n += 1) if (!records[`${s.id}#${n}`]) todo.push({ s, n });
  }
  const max = Number(args.max ?? cfg.maxCallsPerRun);
  if (todo.length > max) fail(`${todo.length} takes exceed --max ${max}`);
  fs.mkdirSync(rawDir, { recursive: true });
  for (const { s, n } of todo) {
    const body = { text: s.prompt, duration_seconds: s.duration, prompt_influence: s.influence ?? 0.5, loop: false, model_id: s.model ?? MODEL };
    let last = "";
    let bytes = null;
    for (let attempt = 1; attempt <= 4 && bytes === null; attempt += 1) {
      const response = await fetch(`${API}/sound-generation?output_format=${FORMAT}`, {
        method: "POST",
        headers: { "xi-api-key": key(), "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) bytes = Buffer.from(await response.arrayBuffer());
      else {
        last = `HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`;
        if (response.status !== 429 && response.status < 500) break;
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
    if (bytes === null) fail(`${s.id}#${n}: ${last}`);
    const file = `${s.id}-${n}.${ext}`;
    writeFileAtomic(path.join(rawDir, file), bytes);
    await update(recordsFile, (r) => ({ ...r, [`${s.id}#${n}`]: { id: s.id, n, at: new Date().toISOString(), format: FORMAT, request: body, file, sha256: sha256(bytes), bytes: bytes.length } }));
    console.log(`${s.id}#${n}: ${bytes.length} bytes -> ${path.join(rawDir, file)}`);
  }
}

async function verdict(args, kind) {
  const [, id, n] = args._;
  if (n === undefined || !args.notes) fail(`${kind.toLowerCase()} wants <id> <take> --notes "why"`);
  const take = `${id}#${n}`;
  const record = readJson(recordsFile, {})[take];
  if (!record) fail(`${take} was not generated`);
  const sound = prompts().sounds.find((s) => s.id === id);
  if (kind === "ACCEPTED") {
    if (!sound?.output) fail(`${id} has no "output" path in prompts.json`);
    const bytes = fs.readFileSync(path.join(rawDir, record.file));
    if (sha256(bytes) !== record.sha256) fail(`${record.file} changed since it was recorded`);
    writeFileAtomic(path.join(cfg.root, sound.output), bytes);
    await update(verdictsFile, (v) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k.startsWith(`${id}#`) && x.verdict === "ACCEPTED" ? { ...x, verdict: "SUPERSEDED" } : x])));
  }
  await update(verdictsFile, (v) => ({ ...v, [take]: { verdict: kind, notes: args.notes, at: new Date().toISOString() } }));
  console.log(`${take}: ${kind}${kind === "ACCEPTED" ? ` -> ${sound.output}` : ""}`);
}

function validate() {
  const records = readJson(recordsFile, {});
  const verdicts = readJson(verdictsFile, {});
  const problems = [];
  let ok = 0;
  for (const s of prompts().sounds) {
    const accepted = Object.entries(verdicts).filter(([k, v]) => k.startsWith(`${s.id}#`) && v.verdict === "ACCEPTED");
    if (accepted.length > 1) problems.push(`${s.id}: more than one ACCEPTED take`);
    if (accepted.length === 0) continue;
    const record = records[accepted[0][0]];
    const file = path.join(cfg.root, s.output ?? "");
    if (!record) problems.push(`${s.id}: accepted ${accepted[0][0]} has no record`);
    else if (!s.output || !fs.existsSync(file)) problems.push(`${s.id}: ${s.output ?? "output"} is missing`);
    else if (sha256(fs.readFileSync(file)) !== record.sha256) problems.push(`${s.output} is not the recorded take ${accepted[0][0]}`);
    else ok += 1;
  }
  for (const p of problems) console.log(`FAIL ${p}`);
  if (problems.length) process.exit(1);
  console.log(`ok: ${ok} accepted sound(s) verified (${rel(cfg.root, cfg.sfxDir)})`);
}

const args = parseArgs(process.argv.slice(2));
const commands = { plan, generate: () => generate(args), accept: () => verdict(args, "ACCEPTED"), reject: () => verdict(args, "REJECTED"), validate };
if (!commands[args._[0]]) {
  console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//   node")).map((l) => l.slice(3)).join("\n"));
  process.exit(args._[0] ? 1 : 0);
}
await commands[args._[0]]();
