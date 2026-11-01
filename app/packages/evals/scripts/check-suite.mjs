// Structural check that runs without an API key: every suite config points at an existing prompt
// function and fixture file, fixture counts match blueprint 13.15, and every fixture has assertions.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const expected = { "linter.yaml": 110, "idea_scorecard.yaml": 50, "outline.yaml": 20, "script_section.yaml": 20, "prior_stages.yaml": 10, "personalization.yaml": 10, "run_log_summary.yaml": 10, "injection.yaml": 5, "story_consent.yaml": 5 };
let problems = 0;
for (const [f, n] of Object.entries(expected)) {
  const p = join(root, "tests", f);
  if (!existsSync(p)) { console.log(`FAIL missing ${f}`); problems++; continue; }
  const tests = YAML.parse(readFileSync(p, "utf8"));
  if (tests.length !== n) { console.log(`FAIL ${f}: ${tests.length} fixtures, expected ${n}`); problems++; }
  for (const t of tests) if (!t.assert?.length) { console.log(`FAIL ${f}: fixture without assertions: ${t.description}`); problems++; }
}
for (const c of readdirSync(root).filter((x) => x.startsWith("promptfoo.") && x.endsWith(".yaml"))) {
  const cfg = YAML.parse(readFileSync(join(root, c), "utf8"));
  const fn = String(cfg.prompts[0]).split(":").pop();
  const src = readFileSync(join(root, "prompts/render.mjs"), "utf8");
  if (!src.includes(`export const ${fn}`)) { console.log(`FAIL ${c}: prompt function ${fn} missing`); problems++; }
  if (!existsSync(join(root, String(cfg.tests).replace("file://", "")))) { console.log(`FAIL ${c}: tests file missing`); problems++; }
  if (!cfg.providers[0].config.tools?.[0]?.input_schema) { console.log(`FAIL ${c}: no structured output schema`); problems++; }
}
console.log(problems ? `${problems} problems` : `eval suite: 9 suites, 240 fixtures, structure ok`);
process.exit(problems ? 1 : 0);
