// Small RFC 4180 CSV parser (quotes, escaped quotes, newlines inside quotes, CRLF). No dependency.
// Returns the header row and one object per data row keyed by the trimmed header names.

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const src = text.replace(/^﻿/, "");
  const table: string[][] = [];
  let row: string[] = [], cell = "", inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false; }
      else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = ""; table.push(row); row = [];
    } else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); table.push(row); }
  const nonEmpty = table.filter((r) => r.some((v) => v.trim() !== ""));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };
  const headers = nonEmpty[0].map((h) => h.trim());
  const rows = nonEmpty.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])));
  return { headers, rows };
}

// Google Sheets values come back as string[][]; the first row is the header.
export function rowsFromValues(values: string[][]): { headers: string[]; rows: Record<string, string>[] } {
  if (!values.length) return { headers: [], rows: [] };
  const headers = values[0].map((h) => String(h ?? "").trim());
  const rows = values.slice(1).filter((r) => r.some((v) => String(v ?? "").trim() !== ""))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? "").trim()])));
  return { headers, rows };
}
