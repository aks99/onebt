// ICS calendar output for deadlines (F1.2.4, S2.1 "ICS link", S3.5 "Add to calendar"). All-day events
// because a deadline with an unknown timezone is shown as a date only (6.2 v1.4). Pure functions.

export interface IcsEvent { uid: string; date: string; summary: string; description?: string; url?: string }

function esc(s: string) { return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
function ymd(iso: string) { return iso.replace(/-/g, "").slice(0, 8); }
function stamp(now: Date) { return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"); }
function fold(line: string) {
  // RFC 5545: lines at most 75 octets, continuation lines start with a space
  const out: string[] = []; let s = line;
  while (Buffer.byteLength(s, "utf8") > 75) { let cut = 75; while (Buffer.byteLength(s.slice(0, cut), "utf8") > 75) cut--; out.push(s.slice(0, cut)); s = " " + s.slice(cut); }
  out.push(s); return out.join("\r\n");
}

export function icsCalendar(events: IcsEvent[], calName = "One Big Talk deadlines", now = new Date()) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//One Big Talk//Deadlines//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${esc(calName)}`];
  for (const e of events) {
    const next = new Date(e.date + "T00:00:00Z"); next.setUTCDate(next.getUTCDate() + 1);
    lines.push("BEGIN:VEVENT", `UID:${esc(e.uid)}`, `DTSTAMP:${stamp(now)}`, `DTSTART;VALUE=DATE:${ymd(e.date)}`, `DTEND;VALUE=DATE:${ymd(next.toISOString().slice(0, 10))}`, `SUMMARY:${esc(e.summary)}`);
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    if (e.url) lines.push(`URL:${esc(e.url)}`);
    // Reminders at 14, 7, 3 and 1 days (5.6)
    for (const d of [14, 7, 3, 1]) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.summary)}`, `TRIGGER:-P${d}D`, "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
