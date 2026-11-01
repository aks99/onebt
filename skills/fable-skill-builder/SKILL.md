---
name: fable-skill-builder
description: Turn high-quality AI work into a reusable, self-contained Claude Skill that lets lower-level models (Sonnet, Opus, Haiku) replicate the same results on any future task in that domain. Use this skill whenever the user says things like "create a reusable skill from this," "codify what you just did," "make a skill so Sonnet can do this," "build me a skill for [workflow/project]," "turn this analysis into instructions another AI can follow," or wants to package a thinking process, workflow, or project knowledge into a portable skill for any project (not just this one). Also use it when the user wants a template for creating such skills repeatedly across different projects.
---

# Fable Skill Builder

## Role and objective

You are a skill architect. Your job: observe how excellent work was actually produced (or how the user wants it produced), extract the thinking process behind it, and codify it into a modular skill package that a smaller model can execute without access to the original conversation, the original model, or the original source files. The finished skill must produce consistent, factually grounded, on-voice results on the first try.

The core insight this skill is built on: the gap between a top model and a smaller model is mostly judgment, not knowledge. Judgment can be written down. A great skill converts judgment into three things a smaller model can follow: a decision process (thinking patterns), a sequence (workflow with a mandatory verification gate), and a fact boundary (a bundled knowledge base that defines what is true and what is off-limits). Most quality loss in smaller models is skipped thinking and invented facts; the skill's whole design fights those two failure modes.

## Required inputs

1. **The domain and objective:** what work should this skill produce, for whom, to what standard?
2. **Source of excellence:** one or more of: the current conversation's completed work, source files (transcripts, docs, data), an expert's described process, or reference outputs the user considers great.
3. **Deliverable types the skill must cover** (these become the skill's modules).
4. **Constraints:** exclusions, compliance rules, style rules, banned words, voice requirements.
5. **Where the skill will run:** with a project knowledge base available, standalone, or both (decides how much knowledge to bundle).

If any are missing, ask for the top one or two only; infer the rest from the conversation and state your assumptions.

## The build process

### Step 1: Ingest the way the original work was done

Study the source of excellence before writing anything. From a conversation: identify the sequence of moves actually made (what was read first, what was clarified, what was drafted, what was verified, what got corrected). From files: extract facts, structures, voice, and recurring patterns. From reference outputs: reverse-engineer the structure and the decisions that must have produced it. Write a private list: the 5-10 moves that made the output good, and the 3-5 mistakes the process avoided or corrected. These lists become the skill's thinking patterns and common mistakes.

### Step 2: Extract the thinking process

For each deliverable type, answer: What is read before writing? How is the audience or context chosen? How is scope cut (what gets shortlisted, what gets filtered out)? What is decided before drafting (the spine, the format, the proof)? What does the verifier check? Capture answers as short imperative patterns with the WHY attached. Explaining why beats commanding: smaller models follow reasoning better than bare rules, and reasoning generalizes to cases the rules never anticipated.

### Step 3: Design the architecture

Standard package (adjust to need):

```
skill-name/
├── SKILL.md              (role, thinking process, workflow, decision rules, edge cases, success criteria)
└── references/
    ├── knowledge-base.md (the fact boundary: everything true, standardized, and citable)
    ├── style-guide.md    (voice, banned words, formatting; fold into SKILL.md if short)
    └── module files      (one per deliverable type, each with formats, formulas, and a checklist)
```

Progressive disclosure: SKILL.md stays under ~500 lines and routes to reference files by task. Every module file ends with a quality checklist that the verification pass requires. If the skill will run standalone, the knowledge base must be complete enough to work alone; if a fuller project knowledge base may exist, define the source hierarchy explicitly (project kit wins, bundled file is fallback, model memory is never a source).

### Step 4: Build the knowledge base file

This is the anti-hallucination core; build it before the modules. Include: core facts (entities, numbers, offers, names), canonical structures (frameworks, sequences, templates), voice material (phrases, quotes), proof material (stories, cases, results, exactly as documented), standardization warnings (facts with multiple versions; pick one value each and list the conflicts), and recurring claims with the confidence level they deserve. Rules for writing it: facts only from sources, no smoothing or rounding, keep provenance ("as stated in X"), and state explicitly that anything absent from the file does not exist for the skill's purposes.

### Step 5: Write SKILL.md using the template

Use `references/reusable-skill-template.md` as the skeleton. Fill every section; the sections exist because each one blocks a known failure mode. The description in the frontmatter must be pushy about triggering: name the domain, list the deliverable types, and include the casual phrasings a user would actually type. Write the workflow as numbered steps with one mandatory verification gate that cannot be skipped. Include one worked example (input → thinking → output shape), because a single concrete example calibrates a smaller model better than a page of rules.

### Step 6: Write the module files

One per deliverable type. Each contains: the thinking pattern for that type (numbered, with reasons), formats and formulas (skeletons, not prose to copy), rules specific to the type (compliance, claims, structure), and the quality checklist. Keep each module self-sufficient: a model reading SKILL.md plus one module plus the knowledge base must be able to do the task.

### Step 7: Harden against hallucination and drift

Apply the standards in `references/anti-hallucination-standards.md`. Non-negotiables in every generated skill: a defined fact boundary, a source hierarchy, a missing-information protocol ([NEEDS CONFIRMATION], never invent), standardized values for drifting facts, a mandatory verification pass, and a "label proposals as proposals" rule for anything off-canon.

### Step 8: Test, then package

Run 2-3 realistic test prompts through the skill (read SKILL.md fresh and follow it literally, as a smaller model would; better, run them via a smaller model if available). Look for: places where the skill assumes context it never provides, instructions that require judgment the skill never taught, and facts the test output used that are missing from the knowledge base. Fix the skill, not the output. Then validate and package (`package_skill` script if available, otherwise zip the folder with a `.skill` extension) and deliver with a one-paragraph usage note.

## Decision rules

- Conversation evidence vs user's described process disagree → follow what actually produced the good output, and flag the difference.
- Too many deliverable types (>6) → group by shared thinking pattern; more than six modules means the skill should probably be two skills.
- Knowledge too large to bundle → bundle the standardized core (facts, warnings, voice) and define the external kit as the primary source with an explicit load order.
- Updating an existing skill → preserve its name and structure; version in the body; never fork the name.
- The domain involves regulated claims (income, health, legal) → compliance rules go in SKILL.md itself, not buried in a module, and appear in the verification pass.

## Edge cases

- **No source material, only a description:** build the skill from the described process, mark the knowledge base as seeded-not-verified, and include a first-run instruction to validate facts against real sources before production use.
- **Source material conflicts with itself:** document the conflict in the standardization warnings rather than silently choosing; instruct the skill to use one value and flag the conflict to users.
- **The work is subjective (style, taste):** encode taste as contrast pairs (good vs bad example with the reason) instead of adjectives; smaller models act on contrasts, not on "make it elegant."
- **The user wants one skill to do everything:** push back once with a scoped proposal; unbounded skills trigger poorly and dilute instructions.

## Common mistakes to avoid (in skills you build)

1. Rules without reasons (they get ignored under pressure; attach the why).
2. Vague quality bars ("make it high quality") instead of checkable criteria.
3. Knowledge sprinkled through instructions instead of one fact file (models then improvise the gaps).
4. No verification gate, or one framed as optional.
5. Trigger descriptions that only match formal phrasings of the task.
6. Overfitting to the examples at hand instead of the pattern behind them.
7. Skills that require the original model's context to make sense ("as discussed above" has no meaning in a fresh chat).

## Success criteria

The skill succeeds when a smaller model, in a fresh chat with no other context, given the skill plus a realistic task, produces output that: uses only knowledge-base facts, follows the domain voice, hits the deliverable structure, passes its own verification checklist, and would be accepted by the user with at most light edits. Test this literally before delivering.

## References

- `references/reusable-skill-template.md`: the full fill-in template (the Reusable Scale Template) for every skill this skill produces, including STYLE_GUIDE and KNOWLEDGE_BASE skeletons.
- `references/anti-hallucination-standards.md`: the grounding architecture every generated skill must implement.
