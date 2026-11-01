// Text-only guard (blueprint 11.7, 14.1): no component or page may request a camera or microphone,
// record media, transcribe speech, or accept audio or video uploads. Scans packages/ui and apps/web.
// Run: node scripts/check-no-capture.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const roots = [join(here, "../src"), join(here, "../../../apps/web")];
const forbidden = [
  /getUserMedia/, /getDisplayMedia/, /MediaRecorder/, /navigator\.mediaDevices/, /SpeechRecognition/, /webkitSpeechRecognition/,
  /AudioContext/, /MediaStream/, /<audio[\s>]/i, /<video[\s>]/i, /\scapture=["']/i,
  /accept=["'][^"']*(audio|video)/i, /\.webm/, /\.mp4/, /\.mp3/, /\.wav/, /deepgram/i, /assemblyai/i, /whisper/i,
];
const exts = new Set([".ts", ".tsx", ".js", ".mjs", ".jsx", ".html", ".css"]);
let hits = 0;
function walk(dir) {
  let entries = [];
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    const p = join(dir, name);
    if (name === "node_modules" || name === ".next" || name === "dist") continue;
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!exts.has(extname(p))) continue;
    if (p.endsWith("check-no-capture.mjs")) continue;
    const lines = readFileSync(p, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (/Permissions-Policy/i.test(line)) return;   // the header that refuses camera and microphone
      for (const re of forbidden) if (re.test(line)) { console.log(`${p}:${i + 1}: ${re}`); hits++; }
    });
  }
}
roots.forEach(walk);
if (hits) { console.error(`${hits} capture or media references found. This product is text only.`); process.exit(1); }
console.log("no-capture check: clean (no camera, microphone, recording, transcription or media upload references)");
