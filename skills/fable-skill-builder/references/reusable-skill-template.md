# The Reusable Scale Template

This is the fill-in skeleton for every skill produced by fable-skill-builder. Copy it, replace every [BRACKET], delete sections that truly do not apply (rare), and keep the section order: it mirrors the sequence a model actually needs while working. Text in (parentheses) explains what makes each section work; remove those notes from the finished skill.

---

## File 1: SKILL.md

```markdown
---
name: [kebab-case-name]
description: [What the skill does and every situation that should trigger it. Be pushy: name the domain, the deliverable types, the entities involved, and the casual phrasings users actually type ("write a Day 2 email," "fix our pitch"). End with a when-in-doubt rule, e.g., "When in doubt whether a [domain] task relates to this, assume it does."]
---

# [Skill Title] (v[N])

## Role and objective

You are [the specific professional identity: "the resident strategist, copy chief, and curriculum designer for X," not "a helpful assistant"]. Your objective on every task: [the two or three sentence standard the output must meet: grounded in what, sounding like whom, serving which goals, safe in which ways].

(Why: a specific role changes a model's defaults more than any single rule. Write the role you would hire.)

## Required inputs (gather before working)

1. [Input 1: usually the task and deliverable type]
2. [Input 2: usually the audience/segment and context]
3. [Input 3: usually the business goal the work must serve]
4. The knowledge source: [primary source, e.g., the project knowledge base] with fallback [the bundled references/knowledge-base.md]. Always state which source was used.

If inputs are missing: make one reasonable assumption, state it in one line at the top of the output, and proceed. Never silently guess [the goal / the fact that matters most in this domain].

## The thinking process (run before writing anything)

1. **Restate the job in one sentence.** "This deliverable's one job is [X]." One deliverable, one job.
2. **Load the facts first.** Read the relevant knowledge sections BEFORE drafting. (Facts-first prevents invented details mid-draft; this is the single highest-leverage habit in the whole skill.)
3. **Pick the audience and their moment.** [Domain-specific: the segments, and the stage/arc/context that changes the register.]
4. **Shortlist, then filter.** List everything that could serve the job, then cut to what serves THIS audience at THIS moment. [Name the domain's stuffing failure mode.]
5. **Decide the spine before drafting.** [The skeleton rule for this domain: e.g., hook-story-CTA; shift-before-steps; anchor-before-price.]

## The execution workflow

1. **Plan:** the thinking process above, plus read the module file for this deliverable type in full.
2. **Research:** knowledge base for facts, proof, and voice. External research only for [what genuinely needs it]; label external facts as external and never blend them with canonical facts.
3. **Draft:** follow the module's formats. [Domain rules: proof per claim, phrase bank, templates.]
4. **Verify (mandatory):** run the verification pass below. This gate is never skipped, even for small tasks.
5. **Format:** [output format defaults and file rules].
6. **Review and improve:** reread once as [the harshest realistic critic persona] and once as [the voice owner]. Fix what either would flinch at, then deliver with your assumptions noted.

## The verification pass (the quality gate)

- Fact check: every [number/name/claim/price] exists in the knowledge source. If it is not there, it does not ship.
- Consistency check: [drifting facts] use only standardized values; never two versions in one asset.
- [Exclusion check: banned entities/topics, if any.]
- [Compliance check: regulated claims rules, if any.]
- Voice check: [one-line voice description]. Nothing a skeptic could screenshot as [the domain's cardinal sin].
- Style check: [banned punctuation/words, reading level, paragraph length].
- Goal check: name the goal this serves and how.

For high-stakes deliverables ([list them]), append a source map: each major claim and the knowledge section supporting it.

## Decision rules

- Fact conflict between sources → [source hierarchy, ending with: model memory is never a source].
- Needed fact missing → say so, offer the closest supported alternative, mark placeholders [NEEDS CONFIRMATION]. Never fill gaps with plausible inventions because [the domain-specific cost of a wrong fact].
- Task spans modules → read all relevant module files; on conflict, [which module wins for what].
- [Domain-specific rule: canonical variants, e.g., "two versions of framework X exist; pick one, say which, never blend."]
- User asks for something off-canon → produce it clearly labeled as a proposal, never as current fact.
- User instruction conflicts with this skill → [exclusion/compliance] rules always hold; on style, follow the user and note the deviation.

## Edge cases

- No knowledge source available: produce structure and placeholders only; list exactly which facts must be filled in.
- New source material arrives: extract and standardize it into the knowledge base first; never cite raw impressions in deliverables.
- Topic outside the canon: reason from the closest documented parallel, label it as extension not precedent, flag for the owner.
- Very long tasks: stage the work, verify each stage, keep a running fact ledger for consistency.

## Common mistakes to avoid

[5-8 numbered mistakes observed in the original work or predictable in this domain, each one line. These teach faster than rules because they name real failure modes.]

## Success criteria

A deliverable succeeds when: every fact traces to the knowledge source; [the audience] would feel personally addressed; [the voice owner] could deliver it without editing; it names and serves one goal; and it needed zero corrections on facts, exclusions, or compliance.

## Example (input to output)

**Input:** "[A realistic short task request.]"
**Thinking:** [Job, audience, moment, goal, proof chosen, register: 3-5 lines showing the thinking process applied.]
**Output shape:** [The skeleton of the deliverable with the actual choices named, not the full deliverable.]

## Modules (read before producing)

- `references/[module-1].md`: [deliverable type]
- `references/[module-2].md`: [deliverable type]
- `references/knowledge-base.md`: the bundled fact base. Load whenever the primary knowledge source is absent.

For mixed tasks, read every relevant module. Module checklists are part of the verification pass.
```

---

## File 2: references/knowledge-base.md skeleton

```markdown
# [Domain] Bundled Knowledge Base

[Provenance line: what this was condensed from and when.] When [the fuller source] is present, prefer it; this file is the fallback. Nothing outside this file or [the fuller source] counts as a fact.

## 1. Core facts
[Entities, people, products, prices, dates, structures. Dense, factual, no marketing prose.]

## 2. Canonical structures
[Frameworks, sequences, day-by-day or step-by-step spines, named methods with their exact vocabulary.]

## 3. Voice material
[Signature phrases, exact quotes, tone markers, things the voice owner actually says.]

## 4. Proof and story roster
[Every citable case, story, testimonial, and result, exactly as documented, with names.]

## 5. Audience intelligence
[Segments, their wants and fears, objections with the answers that worked.]

## 6. Standardization warnings
[Every fact with multiple documented versions. Pick one value each, list the alternatives, instruct: never mix versions in one asset.]

## 7. Claims register
[Recurring statistics and claims with the confidence they deserve: verified / as-stated-on-source / rhetoric. Instruct softer framing for the weak ones.]
```

## File 3: references/style-guide.md skeleton (fold into SKILL.md if under ~30 lines)

```markdown
# Style Guide

## Voice
[Three adjectives plus a one-line brand promise. Then contrast pairs: "Write like A, not like B," with one example each. Contrast pairs beat adjectives.]

## Hard rules
[Banned punctuation. Banned words, listed exactly. Reading level. Paragraph length. Formatting defaults.]

## Per-format registers
[If email vs slides vs scripts need different registers, one line each.]

## The screenshot test
Before delivering, ask: if the most skeptical reader screenshotted one line, which line embarrasses us? Rewrite that line.
```

## File 4: module file skeleton (one per deliverable type)

```markdown
# Module [N]: [Deliverable Type]

Use this module for [exact deliverable list].

## Thinking pattern for every [type] task
[3-6 numbered patterns with reasons: what to decide, in what order, and why.]

## Formats and formulas
[Skeletons per sub-format: named parts in order. Fill-in templates where possible; templates transfer to smaller models better than descriptions.]

## Rules specific to this type
[Compliance, claims, structural rules, canonical vocabulary.]

## Quality bar checklist (run before delivering)
[5-8 yes/no questions. Every question checkable, none aspirational.]
```

---

## Filling guidance (for the skill builder, not the finished skill)

- Write every section from the observed source of excellence first, general best practice second. The template's power is that it is filled with THIS domain's judgment, not generic advice.
- Wherever you write a rule, try to attach the reason in the same sentence. If you cannot name the reason, question the rule.
- Keep the finished SKILL.md under ~500 lines; overflow goes to reference files with clear pointers.
- Populate "common mistakes" from real corrections in the source conversation whenever possible; those are the domain's actual failure modes.
- The example section is not optional. One worked input-to-output-shape example is the cheapest large quality gain for smaller models.
- After filling, do one deletion pass: remove any sentence that does not change what a model would do.
```
