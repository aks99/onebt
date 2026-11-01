import { describe, expect, it } from "vitest";
import { authorship, authorshipNote, canMove, feedbackRequestDraft, followUpAllowed, followUpDraft, pipelineCsv, readinessPassed, researchComplete, type Readiness } from "@/lib/pipeline/rules";
import { DEFAULT_FORM_FIELDS, fieldsForEvent, overLimit, prefill, sourceFor, trimToLimit } from "@/lib/pipeline/formMapper";

// Step 7 acceptance (6.3, 6.4, 13.4): the Ready gate, the five-draft cap, follow-up restraint, authorship, mapping.

const scores = (levels: number[]) => levels.map((l, i) => ({ criterion: i + 1, level: l as 1 | 2 | 3 | 4, reason: "r" }));
const rd = (levels: number[], blocking = false): Readiness => ({ scores: scores(levels), gate_passed: true, linter: { flags: [], blocking }, rewrites: [], organizer_eyes: "" });

describe("readiness gate (13.4)", () => {
  it("needs Level 3 on idea statement, why you and compliance", () => {
    expect(readinessPassed(rd([3, 2, 2, 3, 1, 2, 2, 3])).ok).toBe(true);
    const r = readinessPassed(rd([2, 4, 4, 3, 4, 4, 4, 3]));
    expect(r.ok).toBe(false); expect(r.failing).toEqual([1]); expect(r.reason).toMatch(/Idea statement/);
    expect(readinessPassed(rd([3, 4, 4, 3, 4, 4, 4, 2])).failing).toEqual([8]);
  });
  it("a topic as the one-sentence idea fails criterion 1 and cannot be Ready", () => {
    expect(readinessPassed(rd([1, 3, 3, 3, 3, 3, 3, 3])).ok).toBe(false);
  });
  it("a blocking linter flag blocks even with good scores", () => {
    expect(readinessPassed(rd([4, 4, 4, 4, 4, 4, 4, 4], true)).ok).toBe(false);
  });
  it("no review yet means not ready", () => { expect(readinessPassed(null).ok).toBe(false); });
});

describe("status moves (6.3 quality gates)", () => {
  it("a sixth concurrent draft is refused with a clear message", () => {
    expect(canMove("planned", "drafting", { activeDrafts: 5, readinessPassed: false, isThisActive: false })).toEqual({ ok: false, reason: "Finish or park one of your 5 drafts first." });
    expect(canMove("planned", "drafting", { activeDrafts: 4, readinessPassed: false, isThisActive: false }).ok).toBe(true);
    expect(canMove("drafting", "ready", { activeDrafts: 5, readinessPassed: true, isThisActive: true }).ok).toBe(true);
  });
  it("Ready needs a passed review; applied without it asks for confirmation and will not count", () => {
    expect(canMove("drafting", "ready", { activeDrafts: 1, readinessPassed: false, isThisActive: true }).ok).toBe(false);
    expect(canMove("drafting", "applied", { activeDrafts: 1, readinessPassed: false, isThisActive: true }).confirm).toMatch(/not count toward your 100/);
    expect(canMove("ready", "applied", { activeDrafts: 1, readinessPassed: true, isThisActive: true }).confirm).toMatch(/organizer's form/);
  });
  it("outcomes need a sent application", () => {
    expect(canMove("planned", "accepted", { activeDrafts: 0, readinessPassed: false, isThisActive: false }).ok).toBe(false);
    expect(canMove("interview", "accepted", { activeDrafts: 0, readinessPassed: false, isThisActive: false }).ok).toBe(true);
  });
});

describe("follow-up restraint (F1.3.7 v1.4)", () => {
  const base = { status: "applied" as const, appliedAt: "2026-10-10", followUpSentAt: null, decisionDate: null, noEnquiries: false, hasPublicForm: true, today: "2026-11-01" };
  it("allowed 14 days after applying through a public form", () => { expect(followUpAllowed(base)).toBe("OK"); });
  it("never before the decision date, never where the organizer says no, only once, only with a public form", () => {
    expect(followUpAllowed({ ...base, decisionDate: "2026-11-15" })).toBe("BEFORE_DECISION_DATE");
    expect(followUpAllowed({ ...base, noEnquiries: true })).toBe("ORGANIZER_SAYS_NO");
    expect(followUpAllowed({ ...base, followUpSentAt: "2026-10-28T00:00:00Z" })).toBe("ALREADY_SENT");
    expect(followUpAllowed({ ...base, hasPublicForm: false })).toBe("NO_PUBLIC_FORM");
    expect(followUpAllowed({ ...base, appliedAt: "2026-10-25" })).toBe("TOO_EARLY");
    expect(followUpAllowed({ ...base, status: "drafting" })).toBe("NOT_APPLIED");
  });
  it("the draft is a status enquiry, never a second pitch", () => {
    const d = followUpDraft({ memberName: "Ash", eventName: "TEDxPune", appliedAt: "2026-10-10", oneSentence: "Checklists fail when the most junior person cannot stop the room" });
    expect(d.subject).toMatch(/short check-in/); expect(d.body).toMatch(/confirm it arrived/); expect(d.body).not.toMatch(/guarantee|selected|book|course|program/i);
    expect(d.body.length).toBeLessThan(700);
    expect(feedbackRequestDraft({ memberName: "Ash", eventName: "TEDxPune" }).body).toMatch(/No pressure/);
  });
});

describe("authorship meter (F1.3.15)", () => {
  it("typed fields are all the member's; AI fields are split by words kept", () => {
    const a = authorship({ bio: "I lead hospital teams in Pune.", idea: "Checklists fail when the most junior person cannot stop the room" }, { bio: "user", idea: "llm" }, { idea: "Checklists fail when the most junior person cannot stop the room" });
    expect(a.by_field.bio.typed).toBe(30); expect(a.by_field.idea.kept).toBe(a.by_field.idea.kept); expect(a.by_field.idea.typed).toBe(0);
    expect(a.your_words_pct).toBeGreaterThan(20); expect(a.your_words_pct).toBeLessThan(40);
  });
  it("a reworded AI sentence counts the new words as typed", () => {
    const a = authorship({ idea: "Safety checklists collapse when nurses are not allowed to halt the surgeon" }, { idea: "llm" }, { idea: "Checklists fail when the most junior person cannot stop the room" });
    expect(a.your_words_pct).toBeGreaterThan(60);
  });
  it("empty answers give 100% and the note reads plainly", () => {
    const a = authorship({}, {}, {});
    expect(a.your_words_pct).toBe(100); expect(authorshipNote(a, "One Big Talk")).toMatch(/100% of the characters/);
  });
});

describe("form mapper (F1.3.2)", () => {
  const pack = { titles: ["The person who cannot say stop"], one_sentence: "Checklists fail when the most junior person cannot stop the room", idea_statement: "x ".repeat(230).trim(), why_now: "why now text", why_you: "why you text", bio_150: "short bio", bio_250: "long bio", links: "https://example.com", experience_summary: "spoke to 400" };
  it("routes fields by key and label", () => {
    expect(sourceFor({ key: "q1", label: "Describe your talk idea" })).toBe("idea_statement");
    expect(sourceFor({ key: "q2", label: "Your idea in one sentence" })).toBe("one_sentence");
    expect(sourceFor({ key: "q3", label: "Why this event and this audience" })).toBe("why_now");
    expect(sourceFor({ key: "q4", label: "Why are you the person to give this talk" })).toBe("why_you");
    expect(sourceFor({ key: "q5", label: "Speaker bio", limit_type: "words", limit: 100 })).toBe("bio_150");
    expect(sourceFor({ key: "q5b", label: "Full bio", limit_type: "words", limit: 300 })).toBe("bio_250");
    expect(sourceFor({ key: "q6", label: "Previous speaking experience" })).toBe("experience_summary");
    expect(sourceFor({ key: "q7", label: "Link to a pitch video" })).toBe("video_link");
    expect(sourceFor({ key: "q8", label: "Dietary requirements" })).toBe("member");
  });
  it("pre-fills and trims to the limit; empty sources stay for the member", () => {
    const { answers, sources } = prefill(DEFAULT_FORM_FIELDS, pack);
    expect(answers.one_sentence).toBe(pack.one_sentence); expect(answers.idea_statement.split(/\s+/).length).toBeLessThanOrEqual(250);
    expect(sources.video_link).toBe("empty"); expect(answers.past_speaking).toBe("spoke to 400");
    expect(trimToLimit("one two three four", { key: "k", label: "l", limit_type: "words", limit: 2 })).toBe("one two");
    expect(trimToLimit("hello wide world", { key: "k", label: "l", limit_type: "chars", limit: 8 })).toBe("hello");
    expect(overLimit("one two three", { key: "k", label: "l", limit_type: "words", limit: 2 })).toBe(true);
  });
  it("uses the curator's fields when the event has them, else the default eight", () => {
    expect(fieldsForEvent([{ key: "bio", label: "Bio", limit_type: "chars", limit: 600 }]).length).toBe(1);
    expect(fieldsForEvent(null).length).toBe(8); expect(fieldsForEvent([]).length).toBe(8);
  });
});

describe("research step and export", () => {
  it("three answers of 20 characters complete the research step", () => {
    expect(researchComplete({ theme_in_own_words: "x".repeat(20), past_talk_watched: "y".repeat(20), why_this_audience: "z".repeat(19) })).toBe(false);
    expect(researchComplete({ theme_in_own_words: "x".repeat(20), past_talk_watched: "y".repeat(20), why_this_audience: "z".repeat(20) })).toBe(true);
  });
  it("CSV escapes commas and quotes", () => {
    const csv = pipelineCsv([{ event: 'TEDx "Wilson" Park, Edinburgh', city: "Edinburgh", status: "applied", applied_at: "2026-10-30", follow_up_at: "", follow_up_sent: "", outcome: "", outcome_at: "", event_date: "", deadline: "", readiness: "passed", counts_toward_100: "yes", notes: "line1\nline2" }]);
    expect(csv.split("\r\n")[1]).toBe('"TEDx ""Wilson"" Park, Edinburgh",Edinburgh,applied,2026-10-30,,,,,,,passed,yes,"line1\nline2"');
  });
});
