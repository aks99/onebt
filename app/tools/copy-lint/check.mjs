// Copy lint (blueprint 11.9): fails if UI copy, emails or docs under apps/ contain an em dash, an exclamation
// mark, or a banned phrase. Run: node tools/copy-lint/check.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
const banned = ["get selected", "guaranteed", "TED-approved", "TED talk", "unleash", "elevate", "seamless", "game changer", "next level", "dive in", "secret weapon"];
const exts = new Set([".tsx", ".ts", ".md", ".mdx", ".json", ".html"]);
let problems = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "node_modules" || name === ".next") continue;
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!exts.has(extname(p))) continue;
    const text = readFileSync(p, "utf8");
    text.split("\n").forEach((line, i) => {
      if (line.includes("—")) { console.log(`${p}:${i + 1}: em dash`); problems++; }
      // An exclamation mark in prose: after a letter and before a quote, a space or the line end.
      // TypeScript's non-null "!" before ")" "," ";" "." is not prose and is not flagged.
      if (/[A-Za-z0-9]!(?=["'\s]|$)/.test(line) && !/!==|!=|!\[/.test(line)) { console.log(`${p}:${i + 1}: exclamation mark`); problems++; }
      for (const b of banned) if (line.toLowerCase().includes(b.toLowerCase())) { console.log(`${p}:${i + 1}: banned phrase "${b}"`); problems++; }
      // "unlock" is fine for the Idea Lock (F1.1.9); it is banned as a buzzword ("unlock your potential").
      if (/\bunlock(s|ing|ed)?\s+(your|the\s+(power|potential|secret)|new|growth|success|full)/i.test(line)) { console.log(`${p}:${i + 1}: buzzword "unlock ..."`); problems++; }
    });
  }
}
walk(new URL("../../apps", import.meta.url).pathname);
if (problems) { console.error(`${problems} copy problems`); process.exit(1); }
console.log("copy lint: clean");
