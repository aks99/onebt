import type { ScriptDoc } from "@/lib/write/rules";

// A short original sample script (about five minutes) so the free plan can try the drills and the timer before
// a member has a locked script of their own. It is an example, not a model answer, and nothing in it is about TED.

export const SAMPLE_TITLE = "The ninety-second repair";
export const SAMPLE_SLOT_MINUTES = 5;

export const SAMPLE_SCRIPT: ScriptDoc = { sections: [
  { id: "s1", kind: "hook", title: "Opening", target_seconds: 55, ending_point: false, covered_point_ids: [], uncovered: [], text:
    "My neighbour and I did not speak for eleven years. It started with a fence post. He moved it forty centimetres onto what I thought was my side. I said something sharp. He said something sharper. Then we both went inside, and the silence set like concrete.\n\nEleven years is a long time to be angry about forty centimetres." },
  { id: "s2", kind: "care", title: "Why it matters", target_seconds: 60, ending_point: false, covered_point_ids: [], uncovered: [], text:
    "Most of us carry a fence post. A sister we do not call. A colleague we route around. A friend who said one wrong thing at one wrong dinner. We tell ourselves the gap is about the thing that happened. It almost never is. The gap is about the ninety seconds right after the thing happened, and what we did not do in them." },
  { id: "s3", kind: "idea", title: "The idea", target_seconds: 60, ending_point: false, covered_point_ids: [], uncovered: [], text:
    "Here is what I have come to believe. A relationship is not decided by the rupture. It is decided by the repair, and the repair has a window. About ninety seconds. Inside that window, one plain sentence closes the gap. Outside it, every hour adds a layer of story, and the story is always worse than the thing.\n\nI call it the ninety-second repair, and it has three parts." },
  { id: "s4", kind: "evidence", title: "The three parts", target_seconds: 70, ending_point: false, covered_point_ids: [], uncovered: [], text:
    "First, name the small thing, not the big one. Not \"we need to talk about how you treat me.\" Just \"that came out harder than I meant.\" Second, give up the point, for now. You can be right tomorrow. Tonight you only have to be kind. Third, say one sentence and stop. Repairs fail when they turn into explanations, because an explanation sounds like a case, and a case invites a verdict.\n\nI tried it on my neighbour. Not in the first ninety seconds, obviously. Eleven years late. I walked over and said, \"I was rude about the fence, and I have missed talking to you.\" One sentence. Then I stopped. He looked at the post, and he looked at me, and he said, \"It was probably forty centimetres.\"" },
  { id: "s5", kind: "implication", title: "What changes", target_seconds: 35, ending_point: true, covered_point_ids: [], uncovered: [], text:
    "If this is true, then the skill worth practising is not winning the argument and it is not avoiding the argument. It is noticing the window. The small catch in your chest that says: this is the moment. Ninety seconds. One sentence. Stop." },
  { id: "s6", kind: "close", title: "Close", target_seconds: 20, ending_point: true, covered_point_ids: [], uncovered: [], text:
    "We rebuilt the fence together last spring. The post is exactly where he put it. I measured." },
] };
