import { describe, expect, it } from "vitest";
import { BRIEF_MIN, TEMPLATES, briefChars, briefSavable, coverage, cutPercent, defaultSections, estimateSeconds, factcheckText, jargon, lockCheck, numbersIn, paceLine, prompterText, quirks, readability, storyConsentProblems, syllables, wordBudget, wordsIn, type OutlineDoc, type ScriptDoc, type ScriptRubric } from "@/lib/write/rules";
import { factcheckPdf, outlinePdf, scriptDocx, scriptPdf } from "@/lib/write/exporters";

// Step 8 acceptance (7.7): the brief minimum, the word budget, coverage, the quirk list, the lock gate, exports.

describe("idea brief (F2.0)", () => {
  it("refuses 499 characters and accepts 500", () => {
    expect(briefSavable({ idea: "x".repeat(499) })).toBe(false); expect(briefSavable({ idea: "x".repeat(300), belief: "y".repeat(200) })).toBe(true);
    expect(briefChars({ a: "ab", b: "cde" })).toBe(5); expect(BRIEF_MIN).toBe(500);
  });
});

describe("word budget and pace (F2.1, F2.17)", () => {
  it("a 10-minute talk is 1,300 to 1,600 words; 18 minutes is 2,340 to 2,880", () => {
    expect(wordBudget(10)).toMatchObject({ low: 1300, high: 1600 }); expect(wordBudget(18)).toMatchObject({ low: 2340, high: 2880 });
    expect(wordBudget(10).target).toBe(1380); expect(wordBudget(10).bufferSeconds).toBe(48);
  });
  it("estimates seconds and writes the pace line with the assumption labelled", () => {
    expect(estimateSeconds(1500, 150)).toBe(600);
    expect(paceLine(1750, 10, 150, false).text).toMatch(/assumed 150 words a minute .* 11:40, 1:40 over the 10-minute slot/);
    expect(paceLine(1400, 10, 140, true).text).toMatch(/your measured pace .* 10:00/);
  });
  it("cut percent lands on the target", () => { expect(cutPercent(1750, 10, 150)).toBe(21); expect(cutPercent(1300, 10, 150)).toBe(0); });
  it("templates split time and cite a source; sections carry budgets and an ending point", () => {
    for (const t of Object.values(TEMPLATES)) { expect(Math.abs(t.sections.reduce((n, s) => n + s.share, 0) - 1)).toBeLessThan(0.001); expect(t.source.length).toBeGreaterThan(20); expect(t.sections.some((s) => s.endingPoint)).toBe(true); }
    const secs = defaultSections("ted_four_beat", 10, 150);
    expect(secs.length).toBe(5); expect(secs.reduce((n, s) => n + s.target_seconds, 0)).toBeGreaterThan(540); expect(secs.reduce((n, s) => n + s.target_seconds, 0)).toBeLessThanOrEqual(552);
  });
});

const outline: OutlineDoc = { sections: [
  { id: "s1", kind: "hook", purpose: "Make them care", talking_points: [{ id: "p1", kind: "story", text: "The night the nurse did not speak", source: "brief", consent: "pseudonymized" }, { id: "p2", kind: "number", text: "3 of 10 checklists skipped", source: "brief", consent: "not_a_story" }], story_slot: true, target_seconds: 70, target_words: 175, ending_point: false },
  { id: "s2", kind: "idea", purpose: "The idea", talking_points: [{ id: "p3", kind: "claim", text: "Checklists fail without a stop rule", source: "idea_card", consent: "not_a_story" }], story_slot: false, target_seconds: 90, target_words: 225, ending_point: true },
] };
const script: ScriptDoc = { sections: [
  { id: "s1", kind: "hook", title: "Opening", text: "It is 3 am in an operating theatre in Pune. A nurse sees the count is wrong and says nothing. In 3 of 10 surgeries the checklist is skipped.", target_seconds: 70, ending_point: false, covered_point_ids: ["p1", "p2"], uncovered: [] },
  { id: "s2", kind: "idea", title: "The idea", text: "Checklists fail when the most junior person cannot stop the room.", target_seconds: 90, ending_point: true, covered_point_ids: ["p3"], uncovered: [] },
] };

describe("coverage and consent (7.7, F2.15)", () => {
  it("every talking point is covered or listed as uncovered", () => {
    expect(coverage(outline, script)).toMatchObject({ total: 3, covered: 3, missing: [], complete: true });
    const partial: ScriptDoc = { sections: [{ ...script.sections[0], covered_point_ids: ["p1"], uncovered: [{ id: "p2", why: "no source for the 3 of 10 figure" }] }, script.sections[1]] };
    const c = coverage(outline, partial); expect(c.uncovered).toEqual(["p2"]); expect(c.complete).toBe(true);
    const missing: ScriptDoc = { sections: [{ ...script.sections[0], covered_point_ids: ["p1"], uncovered: [] }, script.sections[1]] };
    expect(coverage(outline, missing).missing).toEqual(["p2"]);
  });
  it("a story without a consent chip is flagged", () => {
    expect(storyConsentProblems(outline)).toEqual([]);
    expect(storyConsentProblems({ sections: [{ ...outline.sections[0], talking_points: [{ ...outline.sections[0].talking_points[0], consent: "not_a_story" }] }] }).length).toBe(1);
  });
});

describe("readability, jargon and quirks (F2.7, F2.9)", () => {
  it("counts syllables and grades text", () => {
    expect(syllables("checklist")).toBe(2); expect(syllables("operating")).toBe(4); expect(syllables("the")).toBe(1);
    const r = readability("It is 3 am. A nurse sees the count is wrong and says nothing. Nobody stops the surgeon.");
    expect(r.sentences).toBe(3); expect(r.gradeLevel).toBeLessThan(6);
    expect(wordsIn("one two, three.")).toBe(3);
  });
  it("lists jargon with plain alternatives", () => {
    const j = jargon("We leverage a robust framework to operationalize stakeholder alignment.");
    expect(j.map((x) => x.word)).toEqual(expect.arrayContaining(["leverage", "robust", "framework", "operationalize", "stakeholder", "alignment"]));
    expect(j.find((x) => x.word === "leverage")?.plain).toBe("use");
  });
  it("catches TED's quirks: meta-talk, apology, summary ending, pitch, overstatement, pun", () => {
    const hits = quirks("Today I'm going to talk about checklists. Sorry if this runs long. This always works for everyone. In conclusion, buy my book. Let me TED-ucate you.");
    expect(hits.map((h) => h.key)).toEqual(expect.arrayContaining(["meta", "apology", "summary", "pitch", "overstatement", "pun"]));
    expect(quirks("It is 3 am in an operating theatre.")).toEqual([]);
  });
});

const rubric = (levels: number[]): ScriptRubric => ({ scores: levels.map((l, i) => ({ criterion: i + 1, level: l as 1 | 2 | 3 | 4, reason: "r" })), lock_gate_passed: true, quirks: [], strongest_line: "", weakest_line: "", next_step: "" });
describe("script lock gate (7.4)", () => {
  it("needs Level 3 on structure, one idea, ending and compliance", () => {
    expect(lockCheck(rubric([3, 2, 3, 2, 2, 2, 2, 2, 3, 2, 3])).ok).toBe(true);
    const r = lockCheck(rubric([3, 3, 3, 3, 3, 3, 3, 3, 1, 3, 3]));
    expect(r.ok).toBe(false); expect(r.failing).toEqual([9]); expect(r.reason).toMatch(/Ending/);
  });
  it("a summary ending is Level 1 on Ending and blocks unless a reason is written", () => {
    const summary = rubric([3, 3, 3, 3, 3, 3, 3, 3, 1, 3, 3]);
    expect(lockCheck(summary, "short").ok).toBe(false);
    expect(lockCheck(summary, "The organizer asked for this ending; I will rework it after their review.").ok).toBe(true);
    expect(lockCheck(null).reason).toMatch(/Score the script/);
  });
});

describe("exports (F2.11, F2.8)", () => {
  it("the fact-check sheet lists every number in a seeded script", () => {
    const text = script.sections.map((s) => s.text).join(" ");
    const nums = numbersIn(text); expect(nums).toEqual(expect.arrayContaining(["3", "10"]));
    const sheet = factcheckText(script, [{ text: "3 of 10 surgeries skip the checklist", section_id: "s1", claim_type: "number", risk: "medium", status: "needs_source", source_url: null, note: null, r5_flag: false, overclaim_flag: false }], "Checklists");
    for (const n of nums) expect(sheet).toContain(n);
    expect(sheet).toMatch(/needs a source/); expect(sheet).toMatch(/2 to 12 hours/);
  });
  it("prompter text carries section headers and the ending point", () => {
    const t = prompterText(script); expect(t).toContain("OPENING"); expect(t).toContain("[ENDING POINT: you can stop here]");
  });
  it("PDF and DOCX exports build real files", async () => {
    const pdf = await scriptPdf("Checklists", script, { slotMinutes: 10, wpm: 150, version: 1, locked: true }, "One Big Talk");
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF"); expect(pdf.length).toBeGreaterThan(1000);
    const docx = await scriptDocx("Checklists", script, { version: 1, locked: false });
    expect(docx.subarray(0, 2).toString()).toBe("PK");
    expect((await outlinePdf("Checklists", outline, "f")).subarray(0, 4).toString()).toBe("%PDF");
    expect((await factcheckPdf("Checklists", script, [], "f")).subarray(0, 4).toString()).toBe("%PDF");
  });
});
