// WCAG 2.x contrast check for every token pair listed in tokens.json, light and dark.
// Text pairs must reach 4.5:1, UI pairs 3:1 (blueprint 11.3, 11.8). Exits non-zero on any failure.
// Run: node scripts/check-contrast.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(here, "../tokens/tokens.json"), "utf8"));

const lum = (hex) => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

let failures = 0;
const rows = [];
for (const theme of ["light", "dark"]) {
  const t = tokens[theme];
  for (const [fg, bg] of tokens.contrast_requirements.text_pairs) {
    const r = contrast(t[fg], t[bg]);
    const ok = r >= 4.5;
    if (!ok) failures++;
    rows.push([theme, "text", fg, bg, r.toFixed(2), ok ? "pass" : "FAIL"]);
  }
  for (const [fg, bg] of tokens.contrast_requirements.ui_pairs) {
    const r = contrast(t[fg], t[bg]);
    const ok = r >= 3;
    if (!ok) failures++;
    rows.push([theme, "ui", fg, bg, r.toFixed(2), ok ? "pass" : "FAIL"]);
  }
}
const prompter = contrast(tokens.prompter.text, tokens.prompter.bg);
rows.push(["prompter", "text", "text", "bg", prompter.toFixed(2), prompter >= 4.5 ? "pass" : "FAIL"]);
if (prompter < 4.5) failures++;

const pad = (s, n) => String(s).padEnd(n);
console.log(pad("theme", 9) + pad("kind", 6) + pad("foreground", 20) + pad("background", 16) + pad("ratio", 8) + "result");
for (const r of rows) console.log(pad(r[0], 9) + pad(r[1], 6) + pad(r[2], 20) + pad(r[3], 16) + pad(r[4], 8) + r[5]);
console.log(`\n${rows.length} pairs checked, ${failures} failures`);
if (process.argv.includes("--markdown")) {
  const md = ["| Theme | Kind | Foreground | Background | Ratio | Result |", "|---|---|---|---|---|---|", ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
  console.log("\n" + md);
}
process.exit(failures ? 1 : 0);
