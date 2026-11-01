import { describe, expect, it } from "vitest";
import { computeJourney, defaultWeekTarget, nextBestAction, weekMessage, type JourneyInput } from "@/lib/journey/recommender";
import { INTERVIEW_PROMPTS, answerOk, dossierChars, interviewProgress, renderDossier, validateAnswer } from "@/lib/find/interview";
import { contentWords, framingViolations, lockCheck, topicOverlap, totalScore, OVERLAP_THRESHOLD, type Scorecard } from "@/lib/find/ideaRules";
import { statusForOutcome, validateExistingApplication, validateThreeQuestions } from "@/lib/onboarding/validate";
import { validateStage } from "@/lib/find/priorStages";
import { mondayIso } from "@/lib/talks";

// Step 5 acceptance (6.1, 6.5, 5.3, 5.4): the recommender, the Journey, the lock gate, the fresh-idea
// check, the interview minimums and the onboarding validators.

const base: JourneyInput = {
  path: "apply", stage: "position", ideaCount: 0, ideaLocked: false, dossierChars: 0, trackedEvents: 0, applications: [], priorStages: 0,
  briefChars: 0, outlineFinal: false, scriptLocked: false, fitToTime: null, beatsMastered: 0, beatsTotal: 0, eventDate: null, published: false,
  launchSteps: 0, weekCompleted: 0, weekTarget: 3, weekPaused: false, now: new Date("2026-11-01T12:00:00Z"),
};

describe("next best action (5.3)", () => {
  it("new member: give the Idea Lab material", () => {
    const a = nextBestAction(base);
    expect(a.href).toBe("/find/idea-lab"); expect(a.minutes).toBeLessThanOrEqual(5); expect(a.alt?.href).toBe("/find/idea-lab/interview");
  });
  it("material written, no ideas: generate", () => {
    expect(nextBestAction({ ...base, dossierChars: 420 }).title).toMatch(/Generate/);
  });
  it("candidates exist: pick and lock, with a reason that states a fact", () => {
    const a = nextBestAction({ ...base, dossierChars: 420, ideaCount: 5 });
    expect(a.title).toMatch(/lock/i); expect(a.reason).toContain("5 candidate ideas");
  });
  it("idea locked, nothing tracked: find events", () => {
    expect(nextBestAction({ ...base, ideaLocked: true, stage: "discover" }).href).toBe("/find/events");
  });
  it("a deadline within 10 days wins over everything", () => {
    const a = nextBestAction({ ...base, ideaLocked: true, trackedEvents: 3, applications: [{ status: "drafting", eventName: "TEDxWilson Park", deadline: "2026-11-09" }] });
    expect(a.title).toContain("TEDxWilson Park"); expect(a.reason).toBe("because the deadline is in 8 days");
  });
  it("a due follow-up is surfaced", () => {
    const a = nextBestAction({ ...base, ideaLocked: true, trackedEvents: 1, applications: [{ status: "applied", eventName: "TEDxPune", appliedAt: "2026-10-10", followUpAt: "2026-10-24" }] });
    expect(a.title).toMatch(/follow-up to TEDxPune/);
  });
  it("invited path skips Discover and Apply and goes to the brief", () => {
    const a = nextBestAction({ ...base, path: "invited", ideaLocked: true });
    expect(a.href).toBe("/write/brief"); expect(a.reason).toContain("0 of 500");
  });
  it("accepted with a brief: outline, then script, then drills, then timing", () => {
    const acc = { ...base, ideaLocked: true, trackedEvents: 2, applications: [{ status: "accepted", eventName: "TEDxPune" }], briefChars: 800 };
    expect(nextBestAction(acc).href).toBe("/write/outline");
    expect(nextBestAction({ ...acc, outlineFinal: true }).href).toBe("/write/script");
    expect(nextBestAction({ ...acc, outlineFinal: true, scriptLocked: true, beatsTotal: 12, beatsMastered: 3 }).href).toBe("/deliver/memorize");
    expect(nextBestAction({ ...acc, outlineFinal: true, scriptLocked: true, beatsTotal: 12, beatsMastered: 12 }).href).toBe("/deliver/timer");
  });
  it("published path is all launch", () => {
    expect(nextBestAction({ ...base, path: "published", published: true }).href).toBe("/amplify/launch");
  });
  it("never promises selection", () => {
    const states: JourneyInput[] = [base, { ...base, ideaLocked: true }, { ...base, ideaLocked: true, trackedEvents: 2 }, { ...base, path: "published", published: true, launchSteps: 2 }];
    for (const s of states) { const a = nextBestAction(s); expect(`${a.title} ${a.reason}`).not.toMatch(/guarantee|selected|chosen/i); }
  });
});

describe("journey (5.7, S2.2)", () => {
  it("new member: Position in progress, Discover available, rest later", () => {
    const j = computeJourney(base);
    expect(j[0].state).toBe("in_progress"); expect(j[1].state).toBe("available"); expect(j[2].state).toBe("locked"); expect(j[0].note).toBe("no idea yet");
  });
  it("locked idea and two tracked events: Apply in progress", () => {
    const j = computeJourney({ ...base, ideaLocked: true, trackedEvents: 2, applications: [{ status: "applied", eventName: "x" }] });
    expect(j.map((s) => s.state).slice(0, 3)).toEqual(["done", "done", "in_progress"]); expect(j[2].note).toBe("1 sent");
  });
  it("invited path marks Discover and Apply as skipped", () => {
    const j = computeJourney({ ...base, path: "invited", ideaLocked: true });
    expect(j[1].note).toBe("skipped (invited)"); expect(j[3].state).toBe("in_progress");
  });
  it("published path: Amplify in progress", () => {
    expect(computeJourney({ ...base, path: "published", published: true })[6].state).toBe("in_progress");
  });
  it("week message never shames", () => {
    expect(weekMessage({ weekCompleted: 0, weekTarget: 3, weekPaused: false }, true)).toMatch(/Fresh start/);
    expect(weekMessage({ weekCompleted: 0, weekTarget: 3, weekPaused: true }, true)).toMatch(/paused/);
    expect(weekMessage({ weekCompleted: 3, weekTarget: 3, weekPaused: false }, false)).toMatch(/Week done/);
    expect(defaultWeekTarget("apply")).toBe(2); expect(defaultWeekTarget("rehearse")).toBe(3);
  });
  it("weeks start on Monday", () => {
    expect(mondayIso(new Date("2026-11-01T12:00:00Z"))).toBe("2026-10-26");   // a Sunday
    expect(mondayIso(new Date("2026-11-02T00:30:00Z"))).toBe("2026-11-02");   // a Monday
  });
});

const score = (levels: number[]): Scorecard => ({ scores: levels.map((l, i) => ({ criterion: i + 1, level: l as 1 | 2 | 3 | 4, reason: "r" })), gate_passed: true, fixes: [] });

describe("idea lock gate (13.3, F1.1.9)", () => {
  it("unscored cannot be locked", () => { expect(lockCheck(null)).toMatchObject({ ok: false, code: "IDEA_NOT_SCORED" }); });
  it("a platitude (Level 1 on idea-not-topic or arguable) is blocked with no override", () => {
    const v = lockCheck(score([1, 3, 3, 3, 3, 3, 3, 3, 3]), "I want it anyway because it is my brand");
    expect(v).toMatchObject({ ok: false, code: "IDEA_GATE_FAILED" });
    expect(lockCheck(score([3, 3, 3, 1, 3, 3, 3, 3, 3]))).toMatchObject({ ok: false, code: "IDEA_GATE_FAILED" });
  });
  it("Level 2 on evidence needs a written reason, then passes", () => {
    const s = score([3, 4, 3, 3, 2, 3, 3, 3, 3]);
    expect(lockCheck(s)).toMatchObject({ ok: false, code: "IDEA_NEEDS_WORK", criteria: [5] });
    expect(lockCheck(s, "short")).toMatchObject({ ok: false });
    expect(lockCheck(s, "The two hospital studies are in my evidence notes.").ok).toBe(true);
  });
  it("Level 3 everywhere locks cleanly and totals 27/36", () => {
    const s = score([3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(lockCheck(s).ok).toBe(true); expect(totalScore(s)).toEqual({ total: 27, max: 36 });
  });
});

describe("fresh-idea check (6.5 rule 5, F1.5.3)", () => {
  const idea = "Hospital checklists fail without a stop rule. Checklists fail when the most junior person cannot stop the room. Checklists work because they are thorough";
  it("same topic crosses the line and names the shared words", () => {
    const r = topicOverlap("Why surgical checklists fail in the operating room", idea);
    expect(r.score).toBeGreaterThanOrEqual(OVERLAP_THRESHOLD); expect(r.shared).toContain("checklists");
  });
  it("an adjacent topic stays under the line", () => {
    expect(topicOverlap("Leading hospital teams through budget cuts", idea).score).toBeLessThan(OVERLAP_THRESHOLD);
    expect(topicOverlap("Safety culture in nursing", idea).score).toBeLessThan(OVERLAP_THRESHOLD);
  });
  it("content words drop stop words and short words", () => {
    expect(contentWords("How this talk about checklists went")).toEqual(["checklists", "went"]);
  });
  it("framing: the blueprint's own example sentence passes", () => {
    const ok = "I have spoken to audiences of 40 to 400 on adjacent subjects (clinical safety culture; leading hospital teams), but this idea, that checklists fail when nurses are not allowed to stop a surgeon, is one I have researched for two years and have not yet shared from any stage. I would like a TEDx stage to be the first.";
    expect(framingViolations(ok)).toEqual([]);
  });
  it("framing: tying a prior stage to the idea is caught", () => {
    expect(framingViolations("I have delivered this talk many times to hospital audiences.").length).toBe(1);
    expect(framingViolations("In 2024 I presented this idea to 400 leaders in Mumbai.").length).toBe(1);
    expect(framingViolations("I spoke on this topic at TEDxPune before.").length).toBe(1);
  });
});

describe("idea interview (F1.1.1)", () => {
  it("eight prompts with minimums between 60 and 200", () => {
    expect(INTERVIEW_PROMPTS.length).toBe(8);
    for (const p of INTERVIEW_PROMPTS) { expect(p.minChars).toBeGreaterThanOrEqual(60); expect(p.minChars).toBeLessThanOrEqual(200); }
  });
  it("refuses short answers with a clear message", () => {
    expect(validateAnswer("controversy", "too short")).toMatch(/9 of 120 characters/);
    expect(answerOk("controversy", "x".repeat(120))).toBe(true);
  });
  it("progress and dossier length add up", () => {
    const answers = { controversy: "a".repeat(130), misconception: "b".repeat(10) };
    expect(interviewProgress(answers)).toEqual({ answered: 1, total: 8, complete: false });
    expect(dossierChars(answers, "c".repeat(60))).toBe(200);
    expect(renderDossier(answers, "pasted")).toContain("Pasted material\npasted");
  });
});

describe("onboarding validators (5.4)", () => {
  it("three questions: expertise one line, city, country, month or not sure", () => {
    expect(validateThreeQuestions("apply", { expertise: "Patient safety in surgical teams", city: "Pune", countryCode: "IN", targetMonth: null })).toEqual({});
    const e = validateThreeQuestions("apply", { expertise: "x", city: "", countryCode: "India", targetMonth: "2027-13" });
    expect(Object.keys(e).sort()).toEqual(["city", "countryCode", "expertise", "targetMonth"]);
  });
  it("invited path needs event name, date and a slot between 3 and 18", () => {
    const e = validateThreeQuestions("invited", { expertise: "Patient safety", city: "Pune", countryCode: "IN", targetMonth: null, slotMinutes: 25 });
    expect(Object.keys(e).sort()).toEqual(["eventDate", "eventName", "slotMinutes"]);
  });
  it("already-applied form: applied date defaults to today and cannot be in the future", () => {
    const now = new Date("2026-11-01T12:00:00Z");
    expect(validateExistingApplication({ eventName: "TEDxPune", appliedAt: "2026-11-01", outcome: "waiting" }, now)).toEqual({});
    expect(validateExistingApplication({ eventName: "TEDxPune", appliedAt: "2026-11-02", outcome: "waiting" }, now).appliedAt).toMatch(/future/);
    expect(statusForOutcome("waiting")).toBe("applied"); expect(statusForOutcome("accepted")).toBe("accepted");
  });
  it("prior stage needs an organization and a topic; a link must be a URL, never a file", () => {
    expect(validateStage({ month: 3, year: 2025, city: "Mumbai", countryCode: "IN", organization: "Hospital leadership summit", audienceSize: 400, topic: "Leading hospital teams", resultLine: "", link: "" })).toEqual({});
    const e = validateStage({ month: null, year: null, city: "", countryCode: null, organization: "", audienceSize: null, topic: "", resultLine: "", link: "C:\\notes.txt" });
    expect(Object.keys(e).sort()).toEqual(["link", "organization", "topic"]);
  });
});
