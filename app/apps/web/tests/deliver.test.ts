import { describe, expect, it } from "vitest";
import { BEAT_RANGE, beatAt, blankFill, chainingRounds, checkpoints, coverage, cueCardsText, drillQueue, firstWords, measuredWpm, nextReview, runVerdict, scoreTyped, splitBeats, verifyBeats, type Beat, type BeatRow } from "@/lib/deliver/rules";
import { SAMPLE_SCRIPT } from "@/lib/deliver/sample";
import type { ScriptDoc } from "@/lib/write/rules";

// Step 9 acceptance (8.8): beat count and first words, miss moves to tomorrow, due beats, the 6-minute beat, no duration no save.

// A seeded 10-minute script: six sections of plain sentences, about 1,450 words.
function seededScript(): ScriptDoc {
  const sentence = (i: number) => `Sentence number ${i} carries one plain idea about checklists and the people who skip them.`;
  const section = (id: string, kind: any, from: number, count: number, secs: number, ending = false) => ({ id, kind, title: id, text: Array.from({ length: count }, (_, k) => sentence(from + k)).join(" "), target_seconds: secs, ending_point: ending, covered_point_ids: [], uncovered: [] });
  return { sections: [section("s1", "hook", 1, 14, 70), section("s2", "care", 15, 18, 90), section("s3", "idea", 33, 18, 90), section("s4", "evidence", 51, 36, 180), section("s5", "implication", 87, 14, 70, true), section("s6", "close", 101, 10, 50, true)] };
}

describe("beat map (F3.1)", () => {
  it("splits a seeded 10-minute script into 12 to 20 beats with correct first words, reproducing the text exactly", () => {
    const doc = seededScript();
    const beats = splitBeats(doc, 150);
    expect(beats.length).toBeGreaterThanOrEqual(BEAT_RANGE[0]); expect(beats.length).toBeLessThanOrEqual(BEAT_RANGE[1]);
    for (const b of beats) expect(b.first_words).toBe(firstWords(b.text));
    expect(beats[0].first_words).toBe("Sentence number 1");
    expect(verifyBeats(doc, beats).ok).toBe(true);
    expect(beats.map((b) => b.order)).toEqual(beats.map((_, i) => i + 1));
  });
  it("splits the sample script inside the range too", () => {
    const beats = splitBeats(SAMPLE_SCRIPT, 150);
    expect(beats.length).toBeGreaterThanOrEqual(BEAT_RANGE[0]); expect(beats.length).toBeLessThanOrEqual(BEAT_RANGE[1]);
    expect(verifyBeats(SAMPLE_SCRIPT, beats).ok).toBe(true);
  });
  it("refuses beats that change, drop or reorder a word, or whose cue is not the opening", () => {
    const doc = seededScript(); const beats = splitBeats(doc);
    expect(verifyBeats(doc, beats.map((b, i) => i === 3 ? { ...b, text: b.text.replace("checklists", "lists") } : b)).ok).toBe(false);
    expect(verifyBeats(doc, beats.slice(1)).ok).toBe(false);
    expect(verifyBeats(doc, beats.map((b, i) => i === 0 ? { ...b, first_words: "Something else here" } : b)).reason).toMatch(/cue/);
    expect(verifyBeats(doc, []).ok).toBe(false);
  });
});

const row = (order: number, state: BeatRow["state"], due: boolean, next = "2026-11-05"): BeatRow => ({ id: `b${order}`, order, section_id: "s1", text: `Beat ${order} text here now.`, first_words: `Beat ${order} text`, purpose: "idea", target_seconds: 30, stage_note: null, state, next_review_at: next, interval_days: 1, hits: 0, misses: 0, due });

describe("spaced schedule (F3.6)", () => {
  it("a miss moves the review to tomorrow; hits expand 1, 3, 7, 14 and the state follows", () => {
    const today = new Date(Date.UTC(2026, 10, 1));
    expect(nextReview({ interval_days: 7 }, "miss", today)).toEqual({ interval_days: 1, state: "learning", next_review_at: "2026-11-02" });
    expect(nextReview({ interval_days: 1 }, "hit", today)).toMatchObject({ interval_days: 3, state: "learning", next_review_at: "2026-11-04" });
    expect(nextReview({ interval_days: 3 }, "hit", today)).toMatchObject({ interval_days: 7, state: "known" });
    expect(nextReview({ interval_days: 7 }, "hit", today)).toMatchObject({ interval_days: 14, state: "cold", next_review_at: "2026-11-15" });
    expect(nextReview({ interval_days: 14 }, "hit", today).interval_days).toBe(14);
  });
  it("coverage counts known or cold over total", () => {
    expect(coverage([row(1, "cold", false), row(2, "known", false), row(3, "learning", true), row(4, "new", true)])).toEqual({ total: 4, mastered: 2, percent: 50 });
    expect(coverage([]).percent).toBe(0);
  });
  it("the drill queue puts due beats first in script order", () => {
    const rows = [row(1, "known", false), row(2, "new", true), row(3, "learning", true), row(4, "cold", false)];
    expect(drillQueue(rows, true).map((r) => r.order)).toEqual([2, 3]);
    expect(drillQueue(rows, false).map((r) => r.order)).toEqual([2, 3, 1, 4]);
    expect(drillQueue([row(1, "cold", false)], true).map((r) => r.order)).toEqual([1]);
  });
});

describe("drills (F3.3 to F3.5)", () => {
  it("blank-fill removes about the asked share, keeps the first two words, and is stable for a seed", () => {
    const text = "Checklists fail when the most junior person in the room cannot stop the surgeon, and the list is skipped exactly as written.";
    for (const pct of [10, 30, 60]) {
      const { tokens, answers } = blankFill(text, pct, 7);
      const words = tokens.length; const blanks = tokens.filter((t) => t.blank).length;
      expect(Math.abs(blanks - Math.round((words * pct) / 100))).toBeLessThanOrEqual(1);
      expect(tokens[0].blank).toBe(false); expect(tokens[1].blank).toBe(false);
      expect(answers.length).toBe(blanks);
    }
    expect(blankFill(text, 30, 7).answers).toEqual(blankFill(text, 30, 7).answers);
  });
  it("typed answers score as a hit at 80 percent, ignoring case and punctuation", () => {
    expect(scoreTyped(["junior", "room", "surgeon", "skipped", "written"], "Junior, room, SURGEON. skipped written")).toEqual({ correct: 5, total: 5, hit: true });
    expect(scoreTyped(["junior", "room", "surgeon", "skipped", "written"], "junior room").hit).toBe(false);
    expect(scoreTyped(["junior", "room", "surgeon", "skipped", "written"], "junior room surgeon skipped").hit).toBe(true);
  });
  it("chaining starts at the last beat and adds the previous one each round", () => {
    expect(chainingRounds([{ order: 1 }, { order: 2 }, { order: 3 }])).toEqual([[3], [2, 3], [1, 2, 3]]);
  });
  it("cue cards show the first three words and the stage note", () => {
    const beats: Beat[] = [{ id: "a", order: 1, section_id: "s1", text: "It is three am in Pune.", first_words: "It is three", purpose: "care", target_seconds: 20, stage_note: "centre, still" }];
    expect(cueCardsText(beats)).toBe("1. It is three  [centre, still]");
  });
});

describe("practice timer (F3.7)", () => {
  const beats: Beat[] = Array.from({ length: 15 }, (_, i) => ({ id: `b${i + 1}`, order: i + 1, section_id: i < 12 ? "s1" : "s2", text: `Beat ${i + 1}.`, first_words: `Beat ${i + 1}.`, purpose: "idea", target_seconds: 40, stage_note: null }));
  const doc: ScriptDoc = { sections: [{ id: "s1", kind: "idea", title: "a", text: "", target_seconds: 480, ending_point: false, covered_point_ids: [], uncovered: [] }, { id: "s2", kind: "close", title: "b", text: "", target_seconds: 120, ending_point: true, covered_point_ids: [], uncovered: [] }] };
  it("names the beat the speaker should be on at the 6-minute checkpoint of a seeded script", () => {
    expect(beatAt(beats, 360)?.order).toBe(10); // 9 beats of 40 s end at 360; the tenth starts there
    expect(beatAt(beats, 0)?.order).toBe(1); expect(beatAt(beats, 599)?.order).toBe(15); expect(beatAt(beats, 700)?.order).toBe(15);
    const cps = checkpoints(beats, doc, 10);
    expect(cps.find((c) => c.kind === "checkpoint")?.beat?.order).toBe(10);
    expect(cps.filter((c) => c.kind === "ending").map((c) => c.at)).toEqual([600]);
    expect(cps.at(-1)).toMatchObject({ kind: "slot", at: 600 });
    expect(checkpoints(beats, doc, 18).filter((c) => c.kind === "checkpoint").map((c) => c.at)).toEqual([360, 720]);
  });
  it("verdict and measured pace", () => {
    expect(runVerdict(560, 10)).toMatchObject({ under: true, text: "9:20, 0:40 inside the 10-minute slot" });
    expect(runVerdict(700, 10).text).toBe("11:40, 1:40 over the 10-minute slot");
    expect(measuredWpm([{ word_count: 1500, duration_s: 600 }, { word_count: 1500, duration_s: 600 }])).toBeNull();
    expect(measuredWpm([{ word_count: 1500, duration_s: 600 }, { word_count: 1500, duration_s: 600 }, { word_count: 1500, duration_s: 600 }])).toBe(150);
  });
});
