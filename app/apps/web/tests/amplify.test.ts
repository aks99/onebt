import { describe, expect, it } from "vitest";
import { STANDARD_PLAN, bioLine, complianceFlags, datePlan, dueNow, insertLink, isOfficialUrl, isRelative, kitText, nextMondayOrTuesday, planProgress, publicationLabel, uploadPackChecks } from "@/lib/amplify/rules";

// Step 10 acceptance (9.1 principle 1, F4.1 to F4.4, F4.11): the official link, the compliance check, the plan dated
// from the link, the upload pack rules, the bio phrasing.

describe("publication tracker (F4.1)", () => {
  it("accepts only the official YouTube or TED link", () => {
    expect(isOfficialUrl("https://www.youtube.com/watch?v=abcDEF123")).toBe(true);
    expect(isOfficialUrl("https://youtu.be/abcDEF123")).toBe(true);
    expect(isOfficialUrl("https://www.ted.com/talks/some_speaker_some_talk")).toBe(true);
    expect(isOfficialUrl("https://vimeo.com/123")).toBe(false); expect(isOfficialUrl("http://youtube.com/watch?v=abcDEF123")).toBe(false); expect(isOfficialUrl("")).toBe(false);
  });
  it("names every state in plain words", () => { expect(publicationLabel("awaiting_upload")).toMatch(/Awaiting/); expect(publicationLabel("limited")).toMatch(/Limited/); });
});

describe("compliance check (9.1)", () => {
  const banned = ["my TED", "talk"].join(" "); const approved = ["TED", "approved"].join("-");
  it("flags the TED mix-ups, endorsement, logo and re-uploads as blocking", () => {
    const flags = complianceFlags(`Watch ${banned}. I am now a TED speaker, ${approved}. I will re-upload the video to my channel with the TED logo.`);
    expect(flags.filter((f) => f.blocking).map((f) => f.rule)).toEqual(expect.arrayContaining(["say TEDx, not TED", "no TED speaker", "no endorsement", "no logo", "no re-upload"]));
  });
  it("passes clean copy and asks for the independence phrase on the first mention", () => {
    expect(complianceFlags("I spoke at TEDxWilson Park 2027, an independently organized TEDx event. Here is the official link.", { requirePhrase: true })).toEqual([]);
    const f = complianceFlags("I spoke at TEDxWilson Park. Here is the link.", { requirePhrase: true });
    expect(f.map((x) => x.rule)).toEqual(["say how it was organized"]); expect(f[0].blocking).toBe(false);
  });
  it("warns on clips over 60 seconds and on hype", () => {
    expect(complianceFlags("Here is a 3-minute clip from the talk.").map((f) => f.rule)).toContain("clip length");
    expect(complianceFlags("This will go viral.").map((f) => f.rule)).toContain("no guarantee");
  });
});

describe("launch plan (F4.3)", () => {
  it("the standard plan is relative until the link exists, then dates from a Monday or Tuesday launch", () => {
    expect(STANDARD_PLAN.every((i) => isRelative(i.when))).toBe(true);
    expect(nextMondayOrTuesday(new Date("2026-12-03T00:00:00Z"))).toBe("2026-12-07"); // Thursday to Monday
    expect(nextMondayOrTuesday(new Date("2026-12-08T00:00:00Z"))).toBe("2026-12-08"); // Tuesday stays
    const dated = datePlan(STANDARD_PLAN, "2026-12-07");
    expect(dated.find((i) => i.text.startsWith("Launch on a Monday"))?.when).toBe("2026-12-07");
    expect(dated.find((i) => i.text.startsWith("Reply to every comment"))?.when).toBe("2026-12-08");
    expect(dated.find((i) => i.text.startsWith("Write the launch team"))?.when).toBe("2026-11-23");
    expect(dated.map((i) => i.when)).toEqual([...dated.map((i) => i.when)].sort());
  });
  it("progress and due items", () => {
    const items = datePlan(STANDARD_PLAN, "2026-12-07").map((i, k) => ({ ...i, done: k < 3 }));
    expect(planProgress(items)).toMatchObject({ done: 3, total: STANDARD_PLAN.length });
    expect(dueNow(items, "2026-12-07").length).toBe(3); // launch day items and the draft-copy item (not the three done)
    expect(dueNow(STANDARD_PLAN, "2026-12-07")).toEqual([]);
  });
});

describe("copy kit and upload pack (F4.4, F4.2, F4.11)", () => {
  it("inserts the official link into every block once", () => {
    const kit = insertLink({ personal_email: "Watch it here: [link]", linkedin_post: "The idea first.", email_signature_line: "Spoke at TEDxPune 2026, an independently organized TEDx event" }, "https://youtu.be/abcDEF123");
    expect(kit.personal_email).toBe("Watch it here: https://youtu.be/abcDEF123");
    expect(kit.linkedin_post).toBe("The idea first.\nhttps://youtu.be/abcDEF123");
    expect(kit.email_signature_line).toMatch(/event https:\/\/youtu.be\/abcDEF123$/);
    expect(insertLink(kit, "https://youtu.be/abcDEF123").linkedin_post).toBe(kit.linkedin_post);
    expect(kitText(kit)).toContain("LINKEDIN POST");
  });
  it("checks the upload pack against TED's playbook", () => {
    const problems = uploadPackChecks({ titles: ["A very long title ".repeat(7), "Checklists need a stop rule | Ash Goel | TEDxPune"], description: "One sentence only.", bio: "Short. Bio.", tags: ["a", "b"] }, "Ash Goel", "TEDxPune");
    expect(problems.join(" ")).toMatch(/2 title options/); expect(problems.join(" ")).toMatch(/Title 1 is \d+ characters/); expect(problems.join(" ")).toMatch(/Description has 1 sentence/); expect(problems.join(" ")).toMatch(/Bio has 2 sentences/); expect(problems.join(" ")).toMatch(/2 tags/);
    expect(uploadPackChecks({ titles: ["Why checklists fail without a stop rule | Ash Goel | TEDxPune", "The stop rule | Ash Goel | TEDxPune", "Who may stop the room | Ash Goel | TEDxPune"], description: "A nurse saw the count was wrong and said nothing. Checklists fail when the most junior person cannot stop the room.", bio: "Ash Goel has spent twelve years inside operating theatres. He trained as a nurse. He has read every checklist study since 2009. He runs a small clinic. He lives in Pune.", tags: ["checklists", "safety", "hospitals", "hierarchy", "speaking up"] }, "Ash Goel", "TEDxPune")).toEqual([]);
  });
  it("the bio line uses the exact phrasing", () => { expect(bioLine("TEDxPune", 2027)).toBe("Spoke at TEDxPune 2027, an independently organized TEDx event."); expect(complianceFlags(bioLine("TEDxPune", 2027), { requirePhrase: true })).toEqual([]); });
});

// Deadline chips show the organizer's stated time and the member's local time (11.8), checked here with the UI helper.
import { memberLocalText, zonedToUtc } from "@onebigtalk/ui";
describe("deadline in two timezones (11.8)", () => {
  it("converts 23:59 in New York to the member's time in Kolkata", () => {
    expect(zonedToUtc("2026-12-09", "23:59", "America/New_York")?.toISOString()).toBe("2026-12-10T04:59:00.000Z");
    expect(memberLocalText("2026-12-09", "23:59", "America/New_York", "Asia/Kolkata")).toBe("10 Dec, 10:29 your time");
    expect(memberLocalText("2026-12-09", "23:59", "America/New_York", "America/New_York")).toBe("");
    expect(memberLocalText("2026-07-01", "12:00", "Europe/London", "Asia/Kolkata")).toBe("1 Jul, 16:30 your time"); // BST
  });
});
