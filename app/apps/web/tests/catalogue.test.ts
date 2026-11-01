import { describe, expect, it } from "vitest";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { parseCsv, rowsFromValues } from "@/lib/catalogue/csv";
import { bool, callStatus, checkColumns, countryCode, isoDate, nameKey, remap, toCall, toEvent, toOrganizer, tzStatus, type RowProblem } from "@/lib/catalogue/normalize";
import { AUTO_ACCEPT_CONFIDENCE, CALL_FIELDS, EVENT_FIELDS, diffRecords, missingKeys, summarize } from "@/lib/catalogue/diff";
import { distanceKm, matchRatio, rankEvents, scoreEvent, themeSimilarity, type MatchEvent, type MatchIdea, type MatchProfile } from "@/lib/catalogue/matching";
import { icsCalendar } from "@/lib/catalogue/ics";
import { buildJwt, sheetIdFrom } from "@/lib/catalogue/sheets";
import { deadlineReminderText } from "@/lib/email/send";

// Step 6 acceptance (6.2, 12.5, S8.3): the import pipeline's pure parts, the match ranking, the calendar feed.

describe("csv parser", () => {
  it("handles quotes, escaped quotes, commas and CRLF", () => {
    const { headers, rows } = parseCsv('tedx_event_id,event_name,city\r\n"x-1","TEDx ""Wilson"" Park, Edinburgh",Edinburgh\r\nx-2,TEDxPune,Pune\r\n');
    expect(headers).toEqual(["tedx_event_id", "event_name", "city"]);
    expect(rows[0].event_name).toBe('TEDx "Wilson" Park, Edinburgh'); expect(rows[1].city).toBe("Pune");
  });
  it("skips blank rows and a BOM", () => {
    const { rows } = parseCsv("﻿a,b\n1,2\n\n,\n3,4\n");
    expect(rows.length).toBe(2);
  });
  it("sheet values become rows the same way", () => {
    const { rows } = rowsFromValues([["a", "b"], ["1", ""], ["", ""]]);
    expect(rows).toEqual([{ a: "1", b: "" }]);
  });
});

describe("column check and normalization (crawler prompt C.1 to C.3)", () => {
  it("accepts aliases and reports missing required columns", () => {
    const c = checkColumns(["TEDx Event ID", "Name", "Start Date", "City", "Country", "Verified", "Favourite colour"], "events");
    expect(c.ok).toBe(true); expect(c.mapped["Name"]).toBe("event_name"); expect(c.mapped["Verified"]).toBe("curator_verified"); expect(c.unknown).toEqual(["Favourite colour"]);
    expect(checkColumns(["event_name"], "events").missingRequired).toContain("tedx_event_id");
  });
  it("normalizes dates, booleans, countries and statuses", () => {
    expect(isoDate("2027-3-9")).toBe("2027-03-09"); expect(isoDate("11/09/2026")).toBe("2026-11-09"); expect(isoDate("9 Nov 2026")).toBe("2026-11-09"); expect(isoDate("soon")).toBeNull();
    expect(bool("Yes")).toBe(true); expect(bool("no")).toBe(false); expect(bool("")).toBeNull();
    expect(countryCode("United Kingdom")).toBe("GB"); expect(countryCode("in")).toBe("IN"); expect(countryCode("Mars")).toBeNull();
    expect(callStatus("invite_only")).toBe("invitation_only"); expect(callStatus("nominations_only")).toBe("nomination"); expect(callStatus("Open")).toBe("open"); expect(callStatus("whatever")).toBe("unknown");
    expect(tzStatus(null, null)).toBe("unknown"); expect(tzStatus("Europe/London", "9 Nov 23:59 GMT")).toBe("stated"); expect(tzStatus("Europe/London", "9 Nov")).toBe("inferred");
  });
  it("name_key strips TEDx, years and punctuation", () => {
    expect(nameKey("TEDxWilson Park 2027")).toBe("wilson park"); expect(nameKey("TEDxYouth@Pune")).toBe("pune");
  });
  it("an event row needs id and name; bad values are reported, not fatal", () => {
    const problems: RowProblem[] = [];
    const e = toEvent({ tedx_event_id: "x-1", event_name: "TEDxLeeds", start_date: "someday", country_code: "England", city: "Leeds", curator_verified: "yes" }, 2, problems);
    expect(e?.event_date).toBeNull(); expect(e?.country_code).toBeNull(); expect(e?.curator_verified).toBe(true); expect(problems.length).toBe(2);
    expect(toEvent({ event_name: "no id" }, 3, problems)).toBeNull();
  });
  it("organizer contact without source and date is dropped (R6)", () => {
    const problems: RowProblem[] = [];
    const o = toOrganizer({ organizer_id: "leeds.org", organizer_name: "Leeds Ideas", public_contact_email: "speakers@leeds.org" }, 2, problems);
    expect(o?.contact).toBeNull(); expect(problems[0].problem).toMatch(/R6/);
    const ok = toOrganizer({ organizer_id: "leeds.org", organizer_name: "Leeds Ideas", public_contact_email: "speakers@leeds.org", contact_source_url: "https://leeds.org/speak", contact_seen_at: "2026-10-30T10:00:00Z" }, 2, []);
    expect(ok?.contact?.email).toBe("speakers@leeds.org");
  });
  it("a call gets a call_id and a timezone status", () => {
    const k = toCall(remap({ "TEDx Event ID": "x-1", Status: "open", Deadline: "2026-12-09", deadline_timezone: "Europe/London", deadline_raw: "9 Dec 2026 23:59 GMT" }, checkColumns(["TEDx Event ID", "Status", "Deadline", "deadline_timezone", "deadline_raw"], "calls").mapped), 2, []);
    expect(k?.call_id).toBe("x-1-2026"); expect(k?.deadline_timezone_status).toBe("stated"); expect(k?.call_status).toBe("open");
  });
});

describe("diff rules (F1.2.16, 12.5)", () => {
  const cur = { name: "TEDxLeeds", city: "Leeds", theme: null, confidence: 0.9 } as any;
  it("a blank cell never erases a fact; a changed fact is listed", () => {
    const items = diffRecords("event", "x-1", { name: "TEDxLeeds", city: null, theme: "Thresholds", confidence: 0.9 } as any, cur, ["name", "city", "theme"] as any, false);
    expect(items.map((i) => i.field)).toEqual(["theme"]);
  });
  it("verified rows auto-apply; status and deadline wait unless verified", () => {
    const unverified = diffRecords("call", "c-1", { call_status: "closed", deadline: "2026-12-01", form_type: "typeform", confidence: 0.95 } as any, { call_status: "open", deadline: "2026-12-09", form_type: "google_forms" } as any, CALL_FIELDS as any, false);
    expect(unverified.find((i) => i.field === "call_status")?.auto).toBe(false);
    expect(unverified.find((i) => i.field === "deadline")?.auto).toBe(false);
    expect(unverified.find((i) => i.field === "form_type")?.auto).toBe(true);
    const verified = diffRecords("call", "c-1", { call_status: "closed", confidence: 0.3 } as any, { call_status: "open" } as any, CALL_FIELDS as any, true);
    expect(verified[0].auto).toBe(true);
  });
  it("a new low-confidence row waits; a new high-confidence row applies", () => {
    expect(diffRecords("event", "n-1", { name: "x", confidence: 0.5 } as any, null, EVENT_FIELDS as any, false)[0].auto).toBe(false);
    expect(diffRecords("event", "n-2", { name: "x", confidence: AUTO_ACCEPT_CONFIDENCE } as any, null, EVENT_FIELDS as any, false)[0].auto).toBe(true);
  });
  it("summary counts new, changed, unchanged, expired", () => {
    const items = [{ entity: "event", key: "a", field: "*", before: null, after: "new", confidence: 1, auto: true }, { entity: "event", key: "b", field: "theme", before: null, after: "x", confidence: 1, auto: true }, { entity: "event", key: "b", field: "city", before: "a", after: "b", confidence: 1, auto: true }] as any;
    expect(summarize(items, ["a", "b", "c"], ["gone"], 2)).toEqual({ total: 3, new: 1, changed: 1, unchanged: 1, expired: 1, errors: 2 });
    expect(missingKeys(["a", "gone"], ["a", "b"])).toEqual(["gone"]);
  });
});

const now = new Date("2026-11-01T12:00:00Z");
const idea: MatchIdea = { title: "Hospital checklists fail without a stop rule", throughline: "Checklists fail when the most junior person cannot stop the room", belief: "Checklists work because they are thorough" };
const profile: MatchProfile = { city: "Edinburgh", region: "Scotland", country_code: "GB", travel_radius_km: 800, lat: 55.95, lng: -3.19 };
const base: MatchEvent = { id: "e1", name: "TEDxWilson Park", city: "Edinburgh", region: "Scotland", country_code: "GB", lat: 55.95, lng: -3.19, event_type: "standard", event_date: "2027-03-14", theme: "Thresholds", theme_history: [{ year: 2026, theme: "Safety in numbers" }], tags: ["health"], application_status: "open", application_deadline: "2026-12-09", status_label: null, local_connection_required: false, pitch_video_required: false, talk_length_target: null, last_verified_at: "2026-10-30T00:00:00Z", expired: false, curator_verified: true };

describe("match ranking (F1.2.1, F1.2.2)", () => {
  it("eligibility first: closed, invitation-only, passed deadline and unmet local rule go to watch", () => {
    expect(scoreEvent(idea, profile, { ...base, application_status: "invitation_only" }, now).bucket).toBe("watch");
    expect(scoreEvent(idea, profile, { ...base, application_status: "closed" }, now).bucket).toBe("watch");
    expect(scoreEvent(idea, profile, { ...base, application_deadline: "2026-10-01" }, now).bucket).toBe("watch");
    expect(scoreEvent(idea, profile, { ...base, city: "Pune", region: "Maharashtra", country_code: "IN", local_connection_required: true }, now).bucket).toBe("watch");
    expect(scoreEvent(idea, profile, base, now).bucket).toBe("apply");
  });
  it("an unknown local rule is a caution, never a pass", () => {
    const r = scoreEvent(idea, profile, { ...base, city: "Leeds", region: "Yorkshire", event_type: "university", local_connection_required: null }, now);
    expect(r.bucket).toBe("apply"); expect(r.caution).toMatch(/campus or alumni/);
  });
  it("same city scores above same country above elsewhere; theme words count", () => {
    const home = scoreEvent(idea, profile, base, now);
    const country = scoreEvent(idea, profile, { ...base, id: "e2", city: "Leeds", region: "Yorkshire", lat: 53.8, lng: -1.55 }, now);
    const abroad = scoreEvent(idea, profile, { ...base, id: "e3", city: "Pune", region: null, country_code: "IN", lat: 18.52, lng: 73.86 }, now);
    expect(home.parts.geography).toBe(3); expect(country.parts.geography).toBe(1); expect(abroad.parts.geography).toBe(0);
    expect(home.score).toBeGreaterThan(country.score); expect(country.score).toBeGreaterThan(abroad.score);
    expect(themeSimilarity(idea, { ...base, theme: "Checklists and the stop rule" }).shared).toContain("checklists");
  });
  it("why you match has three lines and one caution; deadline fit prefers 14 or more days", () => {
    const r = scoreEvent(idea, profile, { ...base, talk_length_target: "8 min" }, now);
    expect(r.why.length).toBe(3); expect(r.why.join(" ")).toMatch(/38 days to the deadline/); expect(r.caution).toBe("8-minute slots only"); expect(r.parts.deadline).toBe(2);
    expect(scoreEvent(idea, profile, { ...base, application_deadline: "2026-11-08" }, now).parts.deadline).toBe(1);
  });
  it("an invitation-only event never scores open-call likelihood; ranking sorts apply by score then deadline", () => {
    expect(scoreEvent(idea, profile, { ...base, application_status: "invitation_only" }, now).parts.openCall).toBe(0);
    const { apply, watch } = rankEvents(idea, profile, [base, { ...base, id: "e2", city: "Pune", country_code: "IN", lat: 18.52, lng: 73.86 }, { ...base, id: "e3", application_status: "closed" }], now);
    expect(apply.map((a) => a.eventId)).toEqual(["e1", "e2"]); expect(watch.map((w) => w.eventId)).toEqual(["e3"]);
    expect(matchRatio(apply[0].score)).toBeLessThanOrEqual(1);
  });
  it("distance and the travel radius caution", () => {
    expect(Math.round(distanceKm(55.95, -3.19, 51.5, -0.12))).toBeGreaterThan(500);
    const r = scoreEvent(idea, { ...profile, travel_radius_km: 100 }, { ...base, city: "London", region: "England", lat: 51.5, lng: -0.12 }, now);
    expect(r.caution).toMatch(/beyond the 100 km/);
  });
  it("sixty days without verification is a caution", () => {
    expect(scoreEvent(idea, profile, { ...base, last_verified_at: "2026-08-01T00:00:00Z" }, now).caution).toMatch(/60 days/);
  });
});

describe("calendar feed and reminders (F1.2.4)", () => {
  it("writes an all-day VEVENT with four alarms and folded lines", () => {
    const ics = icsCalendar([{ uid: "e1-2026-12-09@onebigtalk", date: "2026-12-09", summary: "TEDxWilson Park: application deadline", description: "x".repeat(120), url: "https://onebigtalk.com/find/events/e1" }], "One Big Talk deadlines", now);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261209"); expect(ics).toContain("DTEND;VALUE=DATE:20261210");
    expect((ics.match(/BEGIN:VALARM/g) ?? []).length).toBe(4); expect(ics).toContain("TRIGGER:-P14D"); expect(ics).toContain("TRIGGER:-P1D");
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
  });
  it("reminder copy states the fact and promises nothing", () => {
    const m = deadlineReminderText("TEDxPune", "2026-12-09", 7, "https://onebigtalk.com");
    expect(m.subject).toBe("TEDxPune: application deadline in 7 days"); expect(m.text).not.toMatch(/guarantee|selected|hurry/i); expect(m.text).toContain("9 December 2026");
    expect(deadlineReminderText("x", "2026-12-09", 1, "").subject).toMatch(/tomorrow/);
  });
});

describe("google sheets client", () => {
  it("extracts a sheet id from a link", () => {
    expect(sheetIdFrom("https://docs.google.com/spreadsheets/d/1AbC_dEf-123/edit#gid=0")).toBe("1AbC_dEf-123"); expect(sheetIdFrom(" 1AbC ")).toBe("1AbC");
  });
  it("signs a readonly JWT the token endpoint can verify", () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const jwt = buildJwt({ client_email: "svc@example.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) as string }, 1_700_000_000);
    const [h, c, sig] = jwt.split(".");
    const claims = JSON.parse(Buffer.from(c, "base64url").toString());
    expect(claims.scope).toBe("https://www.googleapis.com/auth/spreadsheets.readonly"); expect(claims.exp - claims.iat).toBe(3600);
    const v = createVerify("RSA-SHA256"); v.update(`${h}.${c}`);
    expect(v.verify(publicKey, Buffer.from(sig, "base64url"))).toBe(true);
  });
});
