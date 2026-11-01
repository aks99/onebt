# WORKFLOW: from idea to verified blueprint

Follow the stages in order. Each stage ends with an artifact. Do not start a stage until the previous artifact exists.

## Stage 0: Intake and context harvest (30–60 minutes)

1. Restate the job in one sentence (who builds what for whom at what price).
2. Read every file in the connected folder or attachments. Summarize each in three lines: what it is, what is reusable, what it must not constrain.
3. Load any business-context skills or brand files the owner has. Extract a **canonical facts list**: owner and roles, existing products with prices, audience sizes, distribution channels, credential rules, style rules (banned words, punctuation), compliance rules (no income claims, guarantees allowed). Mark each as "owner-stated".
4. Write the **assumptions block** (one line each) for anything the owner did not say: region, currency, stack, deadline.
5. Create the task list (research threads, synthesis, verification, delivery) so the owner can watch progress.

Artifact: `00-intake.md` (job statement, file summaries, canonical facts, assumptions).

## Stage 1: Research decomposition and briefs (20 minutes)

1. Identify the platform or ecosystem the product depends on. That thread goes first and includes: scale and seasonality, how the platform selects or admits participants, official rules and content guidelines, rights and licensing, terms of use (scraping, data, AI), trademark and brand-use policy with enforcement history, recent organizational changes.
2. Choose the remaining threads from the standard eight in `RESEARCH_BRIEF_TEMPLATE.md`. Merge only when two threads would read the same sources; split when one thread has more than eight key questions.
3. Write one brief per thread using the template. Every brief states: objective, key questions, suggested source types (primary first), constraints (as-of date, geography, currency, "label older facts with dates"), the output path, and the mandatory note format.
4. Launch all threads in parallel if subagents are available. If not, run them sequentially in the same format and keep the same discipline.

Artifact: `research_notes/<title>/<thread>.md` for each thread.

## Stage 2: Research-note discipline (applies to every thread)

Each note has one section per key question with four parts:

- **Takeaway**: 2–4 sentences answering the question with the strongest numbers.
- **Cited Findings**: bullet list; each bullet is one fact, with the quote or figure, the source name, the date of the source or of viewing, and the URL inline. Verbatim quotes in quotation marks; paraphrases without. Prices with the date read.
- **Inferences**: what the facts imply for the product, clearly separated from the facts.
- **Gaps**: what could not be found or verified, and why (blocked site, budget exhausted, no data exists).

Rules: no number without a source; conflicting figures are all recorded with dates; vendor claims are labelled as claims; summaries returned by a fetch are labelled as summaries, not quotes; if the research budget runs out, say so at the top of the note.

## Stage 3: Synthesis (the longest stage)

1. Read every note end to end. Do not skim; the second half of a note often holds the decisive gap statement.
2. Build the **canonical decisions sheet** before drafting: product working name (and the naming risk), pillars and stages, tier names and prices, metering units and allotments, model routing, palette and fonts, stack, data-sourcing policy, legal lines. Every later section reads from this sheet.
3. Draft using `BLUEPRINT_TEMPLATE.md`, one file per section group (0–1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14+appendices). Writing in parts keeps each section complete and lets you join them later.
4. In each section: lead with the decision, then the evidence, then the implication. Tables for anything a builder will look up (features, prices, tokens, tables, prompts). Cite with keys (A1, A2…) that map to a numbered sources appendix; number every block in the appendix, never leave an unnumbered list of URLs.
5. Label every number: sourced (citation key), decision, or assumption. Label owner-stated facts as such.
6. Join the parts. Run automated checks: word count, zero em dashes, banned-word scan, heading count, citation keys that do not exist in the appendix.

Artifact: `<Product>-Master-Blueprint-v1.md`.

## Stage 4: Verification gate (mandatory, never skipped)

1. Hand the document and the notes folder to a reviewer that did not write it (a subagent; or yourself in a fresh pass that reads only the file and the notes). Use `VERIFICATION_CHECKLIST.md`.
2. The reviewer returns a report with every finding as `Line | claim | what the notes say | severity`, plus an internal-consistency list and a citation-gap list.
3. Fix all High and Medium findings in the source parts (not only in the joined file), re-join, re-run the automated checks.
4. Save the verification report beside the document so the next reader knows what was checked.

Artifact: `00-blueprint-verification-report.md` and the corrected document.

## Stage 5: Delivery and handoff

1. Save to the owner's folder: the document, the notes folder, the verification report, and a handoff prompt (what exists, read order, state of work, pending fixes, open decisions, the exact first message for the next account).
2. Send the document in the conversation.
3. Final message: five sentences at most: what was produced, the two or three decisions that matter most, what is open for the owner, where the files are.

## Timing guidance (one session, one model)

Intake 1 hour; briefs 20 minutes; research 15–20 minutes of wall-clock per thread when parallel (or 1–2 hours each when sequential); synthesis 3–5 hours of writing; verification 15–20 minutes plus fixes; delivery 20 minutes. If the owner's usage limit is at risk, deliver the raw notes and a partial document to disk before continuing; a saved draft beats a perfect one that never lands.
