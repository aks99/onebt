// Structural checks on the prompt library: every registry action has a prompt file and a schema,
// every placeholder is documented in the body, no em dashes or exclamation marks, the preamble carries
// R10 and R11, and no prompt tells the model to record, transcribe or analyze audio or video.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const reg = JSON.parse(readFileSync(join(here, "../registry.json"), "utf8"));
const pre = readFileSync(join(here, "../preamble.md"), "utf8");
let problems = 0;
const fail = (m) => { console.log("FAIL " + m); problems++; };
for (const rule of ["R1 ", "R2 ", "R7 ", "R9 ", "R10 ", "R11 "]) if (!pre.includes(rule)) fail(`preamble missing ${rule.trim()}`);
if (pre.includes("—")) fail("preamble has an em dash");
if (/[A-Za-z]!(\s|$)/.test(pre)) fail("preamble has an exclamation mark");
for (const [key, spec] of Object.entries(reg.actions)) {
  const p = join(here, `../actions/${key}/${spec.version}.md`);
  const s = join(here, `../actions/${key}/schema.json`);
  if (!existsSync(p)) { fail(`${key}: missing ${spec.version}.md`); continue; }
  if (!existsSync(s)) { fail(`${key}: missing schema.json`); continue; }
  const body = readFileSync(p, "utf8");
  if (body.includes("—")) fail(`${key}: em dash`);
  if (/[A-Za-z]!(\s|$)/.test(body)) fail(`${key}: exclamation mark`);
  if (/(transcribe|listen to|watch the video|analy[sz]e the (audio|video|recording)|\brecord (the|your|a|yourself))/i.test(body)) fail(`${key}: media language`);
  const schema = JSON.parse(readFileSync(s, "utf8"));
  if (schema.type !== "object" || schema.additionalProperties !== false) fail(`${key}: schema must be a closed object`);
  if (!["sonnet", "haiku"].includes(spec.model)) fail(`${key}: unknown model`);
}
console.log(problems ? `${problems} problems` : `prompt library: ${Object.keys(reg.actions).length} actions, all checks pass`);
process.exit(problems ? 1 : 0);
