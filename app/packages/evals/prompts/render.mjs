// Promptfoo prompt functions: one per action. Each returns the same messages runAiAction sends
// (the shared preamble as the system turn, the rendered body as the user turn), so the evals test the
// exact prompts the product uses. The structured-output tool is attached by the provider config.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const lib = join(here, "../../prompts");
const preamble = readFileSync(join(lib, "preamble.md"), "utf8");
const registry = JSON.parse(readFileSync(join(lib, "registry.json"), "utf8"));
function render(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars[k];
    return typeof v === "string" ? v : v === undefined || v === null ? "" : JSON.stringify(v, null, 1);
  });
}
function make(action) {
  return async ({ vars }) => {
    const body = readFileSync(join(lib, `actions/${action}/${registry.actions[action].version}.md`), "utf8");
    return [{ role: "system", content: preamble }, { role: "user", content: render(body, vars) }];
  };
}
export const linter = make("linter");
export const idea_scorecard = make("idea_scorecard");
export const outline = make("outline");
export const script_section = make("script_section");
export const prior_stages_framing = make("prior_stages_framing");
export const personalization = make("personalization");
export const run_log_summary = make("run_log_summary");
export const event_tagging = make("event_tagging");
