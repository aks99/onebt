# Anti-Hallucination Standards

Every skill produced by fable-skill-builder implements all of these. They exist because smaller models fail in predictable ways: they fill gaps with plausible inventions, they average conflicting numbers, they drift from voice under time pressure, and they skip verification when the draft looks finished. Each standard blocks one of those failures. When building a skill, check the finished package against this list.

## 1. The fact boundary

The skill bundles a knowledge base file and states explicitly: nothing outside this file (or the named fuller source) counts as a fact. This single sentence converts hallucination from an invisible failure into a checkable rule violation. Corollary: facts live in ONE file, not sprinkled through instructions; sprinkled facts train the model to improvise the gaps between them.

## 2. The source hierarchy

Three tiers, always stated: primary source (the project's full knowledge base, when present) → bundled fallback (the skill's knowledge-base.md) → nothing. Model memory and general training knowledge are explicitly named as never-a-source for domain facts. External research, when allowed, is labeled external in the output and never blended with canonical facts.

## 3. The missing-information protocol

When a needed fact is absent: say so plainly, offer the closest supported alternative, and mark placeholders as [NEEDS CONFIRMATION]. The skill must state the domain-specific COST of inventing (a wrong price, a fake testimonial, a fabricated citation) because models honor rules better when they understand the stakes. Never let the skill frame gap-filling as helpfulness.

## 4. Standardized values for drifting facts

Real source material contains contradictions (numbers stated differently on different days). The knowledge base lists every known conflict, picks one canonical value each, and the verification pass checks that no asset mixes versions. Without this, a smaller model will average, alternate, or pick whichever version it saw last.

## 5. The mandatory verification gate

The workflow contains a verification pass that is structurally impossible to read as optional: it is a numbered workflow step, it has its own section, and the skill says outright that it is never skipped. The pass is a checklist of yes/no questions (facts, consistency, exclusions, compliance, voice, style, goal), not an invitation to "review carefully." For high-stakes deliverables, require a source map: claim → supporting knowledge section.

## 6. Proposals stay proposals

Anything the user requests that goes beyond the canon (new pricing, new policy, new claims, new positioning) is produced clearly labeled as a proposal for the owner's decision, never presented as current fact. This keeps the skill useful for ideation without letting ideation contaminate the canon.

## 7. Confidence labeling for weak claims

The knowledge base's claims register grades recurring statistics: verified, as-stated-in-source, or rhetoric. The skill instructs softer framing for weak ones ("in our experience with 700+ projects" instead of fake precision). This prevents the common failure where a model upgrades folklore into cited fact.

## 8. Exclusion rules with zero ambiguity

Banned entities, retired partnerships, and off-limits topics get an absolute rule (zero references, zero names, zero quotes) plus a stated replacement (what to use in that slot instead). Bans without replacements get violated under pressure; the replacement makes compliance the path of least resistance.

## 9. Voice by contrast, taste by example

Subjective standards are encoded as contrast pairs ("write like A, not like B," with one example each) and one worked input-to-output example. Adjectives ("premium," "engaging") do not transfer to smaller models; contrasts and examples do.

## 10. Self-containment test

Before delivery, read the skill as if in a fresh chat with no other context: every instruction must make sense without the original conversation. Phrases like "as discussed above," references to files the user may not have, and assumed context are defects. The test: could a model that has never seen the source material follow this skill and stay factual? If not, the knowledge base is incomplete.

## 11. Scope discipline

A skill that claims to do everything triggers poorly and dilutes its instructions. Each skill covers one domain with up to ~6 deliverable modules. Beyond that, split into two skills. Within scope, the trigger description is generous (casual phrasings, indirect requests); outside scope, the skill should not fire.

## 12. Drift maintenance

Skills decay as the domain changes. Every generated skill should carry a short maintenance note: when new source material arrives, update the knowledge base FIRST (extract, standardize, version), then adjust modules; never patch facts inline in module files. Version the skill in the SKILL.md title and keep the name stable so updates replace rather than fork.
