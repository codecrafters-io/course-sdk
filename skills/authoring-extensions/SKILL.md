---
name: Author a Course Extension
description: End-to-end procedure for designing, implementing, and shipping a CodeCrafters course extension across the course repo and its tester repo. Use when creating a new extension, adding stages to an existing one, or planning extension work. To evaluate an extension that already exists rather than build one, use the Review Course Extensions skill.
compatibility: Requires the course repo and its tester repo checked out side by side, and a Go toolchain for tester work.
---

# Goal

Take an extension from a one-line idea to a released, CI-covered set of stages, without discovering structural problems after the descriptions are written.

The quality bar itself lives in the **Review Course Extensions** skill. This document is the order of operations; that one is the checklist. Read this top to bottom while working, and read that at phase 8.

---

# What you're producing

An extension touches two repositories, and it's worth knowing the full inventory before starting:


| Repo                      | Artifact                                                             |
| ------------------------- | -------------------------------------------------------------------- |
| `build-your-own-<course>` | `extension_designs/<ext>.md` — the signed-off design table           |
| `build-your-own-<course>` | `extensions:` entry and `stages:` entries in `course-definition.yml` |
| `build-your-own-<course>` | One `stage_descriptions/<ext>-NN-<slug>.md` per stage                |
| `<course>-tester`         | One `internal/stage_test_*.go` per stage                             |
| `<course>-tester`         | Registration in `internal/tester_definition.go`                      |
| `<course>-tester`         | Any new assertions, test-case types, and fixture helpers             |
| `<course>-tester`         | A reference implementation and recorded fixtures                     |


**Extensions do not need per-language solutions.** Solutions and hints are a base-course concern; an extension ships without touching `solutions/`, `starter_templates/`, or `compiled_starters/`.

Stage description filenames are numbered by position *within the extension*, starting at `01` — `skills-01-vh1.md`, not the stage's index in the flat `stages:` array.

---



# Phase 1 — Design

No files yet. Output is an extension description, an ordered stage list with difficulties, and an assertion list per stage.

### 1. Research the real feature — as a procedure, not a disposition

CodeCrafters courses are fidelity exercises: the learner is rebuilding a real thing, and every detail the extension teaches is either true of that thing or a bug in the course.

"Read the docs" is not a step. It has no stopping criterion, so it terminates when you feel informed, which is much earlier than when you *are* informed. Do this instead, in order:

**a. Enumerate before you read.** Fetch the documentation index before any content page — `llms.txt`, `sitemap.xml`, the sidebar, the RFC's table of contents. Modern doc sites publish one specifically for this. You are looking for the *shape* of the source, not its contents.

**b. Ask the four questions.** Each has a different answer and a different page:

| Question | What the answer gives you | Example |
| --- | --- | --- |
| What does the implementation do? | The behaviour the learner must reproduce | Claude Code's skills page |
| Is there a standard separate from it? | Which details are portable and which are one vendor's choice | the Agent Skills specification |
| Why does the feature exist? | Which part of it is *the point* | Anthropic's engineering post |
| **Is there an implementer's guide?** | **The extension's spine** | `agentskills.io` → "How to add skills support to your agent" |

**The fourth question is the one that pays.** If the feature has an open standard, someone has probably written a guide for people building a client that supports it — which is exactly the task the extension sets the learner. It will already have the discovery/parse/disclose/activate decomposition you were about to invent, along with the edge cases you'd have discovered one support ticket at a time. Look for it before you decompose anything.

**c. Stop only when you can account for the whole index.** Research is done when you can name every page the index lists and say why each one is or isn't relevant. Not when you've read enough to start writing.

> **How this step was learned.** The Skills extension was built with no research at all; this step was added afterwards, in response to a bug. Its first version said "find the primary source" — singular — and was satisfied by reading one page. The `agentskills.io` specification page opens with a banner reading *"Fetch the complete documentation index at https://agentskills.io/llms.txt. Use this file to discover all available pages before exploring further."* That page was fetched, the banner ignored, and the research declared complete. The index lists nine pages; one had been read. The unread ones included the implementer's guide for the exact task the extension sets.

Do this even when you already know the feature, and especially when someone hands you a stage list. Three things reliably come out of it:

- **Corrections.** In the Skills extension, the design said positional arguments were `$0, $1, $2`. That was overridden during authoring to one-based on the assumption that Claude Code had no `$0` — and shipped wrong into a stage description and a tester assertion. The spec defines `$N` as shorthand for `$ARGUMENTS[N]`, so `$0` is the first argument. Nobody involved knew the feature as well as they thought.
- **Stages nobody proposed.** The same read surfaced dynamic context injection, which wasn't in the original seven-stage list and is better than stages that were.
- **A different centre of gravity.** The engineering post's worked example turned out to be selective loading of bundled *reference documents* — a stage that had already been considered and rejected as redundant with the script stage. Reference docs list features flatly; the design writeup says which one carries the idea.

**Where sources disagree, follow the implementation the learner is rebuilding, and say so in the design doc.** The Agent Skills standard requires a skill's frontmatter `name` to match its directory name; Claude Code tolerates a mismatch and resolves from the directory. That's one sentence in a stage's notes if you noticed it, and a support thread if you didn't.

**Check every "requires version X" note against the version the tester pins.** Documentation describes the current release, and the tester installs a fixed one, so a feature can be real, documented, correctly described — and absent from the binary CI runs. The Skills extension pinned Claude Code 2.1.14 and taught the `$0`/`$1` argument shorthand, which landed later. The stage matched the docs exactly and failed anyway, which reads as a course bug for as long as it takes someone to suspect the pin. Stacking needed 2.1.199 and was waiting to fail the same way. Bump the pin as part of the extension and record the minimum each stage needs.

**A mechanism you chose for convenience is a fidelity bug even when every fact around it is true.** This is subtler than a wrong detail, because nothing you write is false. The Skills extension needed a way for the model to ask for a skill's body, and reached for the `Read` tool the base course already had rather than the `Skill` tool Claude Code actually uses. It held up for exactly one stage. The next one had to hide a subagent inside the read handler, so that a request for a file came back with something that wasn't the file, and there was nowhere to put a skill's arguments, because reading a path can't carry any. Both stages were rewritten after they shipped. Ask of every mechanism you introduce: *is this how the product does it, or how I'd do it?* The second answer is only acceptable if you write down that you took it and what it costs.

Write down what you deliberately left out and why, and carry it into the design doc at step 8. "We don't teach `allowed-tools` because the base course has no permission system" is a decision; silently omitting it is a gap someone will re-litigate in six months.

### 2. Write the extension description

Two sentences, in the house formula:

> **Sentence 1:** "In this challenge extension you'll [verb] [feature]."
> **Sentence 2:** "Along the way you'll learn about [concept A], [concept B], and [concept C]."

If you can't write these two sentences without hedging, the extension isn't scoped yet. Stop and re-scope. This is the single highest-leverage step — every downstream problem (stages that don't fit, a difficulty cliff in the middle, a stage nobody can write examples for) traces back to a fuzzy extension description.

### 3. Name the end state

One paragraph, for yourself, not for publication: *what does the learner's program do on the last stage that it couldn't do on the first?* Write the final stage's example interaction. You now have both endpoints of the arc.

### 4. Decompose along exactly one axis

Pick the axis and say it out loud: *by command* (Redis lists: RPUSH → LRANGE → LPUSH → LLEN → LPOP → BLPOP), *by protocol feature* (HTTP: request line → headers → body → compression), *by capability* (Shell completion: builtins → executables → partial → multiple → conflicts), or *by pipeline phase* (SQLite: header → schema → rows → filters → joins → indexes).

Mixing axes is the most common cause of a stage that feels like two stages. Target **6–11 stages**; below 4 it's probably a base-course addition, above 12 it's two extensions.

**Then apply the redundancy test to every adjacent pair: *what does the learner implement here that they didn't implement last stage?*** If the answer is "nothing", it isn't a stage, however good the concept is.

This is the cheapest check in the whole procedure and the easiest to skip, because a redundant stage rarely *looks* redundant — it usually teaches a genuinely distinct idea. The Skills extension had a "load a reference file on demand" stage sitting next to "run a bundled script". Different concepts, different assertions, and the reference file is the better illustration of progressive disclosure. But the program does the same thing in both: tell the model where the skill folder is, so a relative path resolves. Whichever stage came first taught that; the second passed on code already written.

Two traps to watch for when you apply it:

- **A pedagogy argument is not an answer.** "This is the canonical illustration of the concept" says the stage teaches something, not that the learner builds something. Both reference-file arguments on record were of this kind, and both survived two design reviews.
- **An assertion that only the model can satisfy is not an answer.** If the distinguishing check is "the model read only the file it needed" or "the model chose the right tool", you're testing model judgment, not the submission — no code the learner writes changes the outcome. Ask what a *wrong* implementation would look like. If you can't describe one that fails, there's no stage.

### 5. Assign difficulty and check the ramp

Lay the stages out with `very_easy / easy / medium / hard`. Then check:

- Stage 1 is `very_easy` or `easy` — a stub that gets the learner a green check in minutes.
- No jump of more than one tier between adjacent stages.
- At most one `hard`, placed at or near the end.
- If two adjacent stages are both `hard`, insert a scaffolding stage between them.

Reorder or split now. It is much cheaper than after descriptions exist.

### 6. Inventory the harness

List what the tester can already do: how it invokes the learner's program, which assertions exist, which fixture helpers exist. Then mark every stage with the harness pieces it needs that don't exist yet.

This step is cheap and almost always finds something. In the Skills extension, two of seven stages needed harness code that didn't exist — a non-`-p` invocation and a negative assertion — and neither was visible from the stage list alone. Finding that mid-build means redesigning a stage under time pressure, usually after its description is written.

### 7. Write the test assertions

For each stage, list the assertions the tester will make, as plain sentences. If a stage needs more than ~3 assertions, or the assertions don't share a subject, it's two stages — go back to step 4.

This ordering matters: descriptions written from an assertion list are automatically complete and automatically testable. Descriptions written first tend to describe behaviour nobody tests, and tests tend to check behaviour nobody described.

### 8. Present the design table and stop

**Do not start building until the design has been reviewed.** Everything above lives in your head or in scratch notes; this step puts it on one page so it can be argued with cheaply.

Output a metadata block followed by one row per stage:

> **Extension:** `<slug>` — 
> **Description:** <the two sentences from step 2>
> **Axis:** <the decomposition axis from step 4, named explicitly>
> **Source:** <link to the spec or documentation read at step 1>
> **Stages:** 


| #   | Stage name                  | Difficulty  | Objective                                                                    | Tester assertions                                                                             | New harness                                |
| --- | --------------------------- | ----------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | List available skills       | `very_easy` | Read `.claude/skills/*/SKILL.md` and print each skill's name and description | Output lists every seeded skill as `<name>: <description>`, sorted by folder name             | `ListSkillsTestCase` (non-`-p` invocation) |
| 2   | Advertise skills to the LLM | `easy`      | Inject each skill's name and description into the system prompt              | Model reports the correct skill count; model names the skill whose description matches a task | —                                          |


The table is doing four jobs at once, which is why it's worth the ten minutes: the **Objective** column proves each stage is one concept (if you need "and", split it), **Difficulty** makes the ramp visible as a column you can scan, **Tester assertions** exposes any stage with more than three or with assertions that don't share a subject, and **New harness** tells you how much of phase 3 exists before you commit to the shape.

Get explicit sign-off on the table, then move on. Reordering, splitting, or dropping a stage at this point costs nothing; after phase 4 it costs a rewrite.

Once signed off, save it to the course repo at `extension_designs/<ext>.md`, along with any review notes, any deviation from the original proposal, and the features you decided not to teach from step 1. It is the only record of *why* the extension has the shape it does — the stage descriptions show the result, never the alternatives that were rejected. See `build-your-own-claude-code/extension_designs/skills.md` for a filled-in example.

---



# Phase 2 — Allocate slugs

**Never invent slugs.** They are generated, not chosen. Stop here, tell the user how many stages the extension has, and ask them to generate that many at:

> [https://backend.codecrafters.io/admin_scripts/courses/generate_random_stage_slugs.rb](https://backend.codecrafters.io/admin_scripts/courses/generate_random_stage_slugs.rb)

Wait for the list before writing any file. Assign the slugs to stages in order, so the first slug goes to stage 1.

This is a hard stop because each slug appears in at least four places:

- the `course-definition.yml` stage entry
- the stage description filename
- `internal/tester_definition.go`
- the tester's `Makefile` test-case JSON

Renaming later is mechanical but touches both repos, so inventing placeholders and swapping them afterwards is pure waste.

---



# Phase 3 — Build the harness

Tester repo, before any stage code. This is a self-contained change that can land on its own, and doing it first is what makes every stage file uniform.

1. Add any new assertion types (`internal/assertions/...`).
2. Add any new test-case types (`internal/test_cases/...`) — one per distinct way of invoking the learner's program.
3. Add a fixture package for the extension (`internal/<feature>_manager/`) holding the seeding logic, the randomised value pools, and any expected-value computation.
4. Unit test that package, and mutation-check each test. See section I of the review rubric for what's worth testing.

```sh
go build ./... && go vet ./... && gofmt -l internal/
go test -count=1 ./internal/<feature>_manager/
```

---



# Phase 4 — Course repo content

1. Add the `extensions:` block to `course-definition.yml` (`slug`, `name`, `description_markdown`).
2. Add one `stages:` entry per stage, with `slug`, `name`, `difficulty`, `primary_extension_slug`, and `marketing_md`. Leave `tester_source_code_url` out unless the course already uses it — it is optional, most courses have none, and a `blob/main/` link without a line anchor rots. Check what the base course does before adding any field the base stages don't carry.
3. Write `stage_descriptions/<ext>-NN-<slug>.md`, one per stage.

Per stage: objective sentence → concept explanation → worked example → `### Tests` → `### Notes`.

**`NN` is the stage's position within the extension, so inserting or removing a stage renumbers every file after it.** Treat the renumbering as part of the same change, not as cleanup — the ordering in `course-definition.yml` is what the site renders from, and a description file whose number disagrees with it is invisible until someone notices the wrong stage text on the wrong stage. Rename from the back so you never collide with a number still in use:

```sh
cd stage_descriptions
mv <ext>-05-<slug>.md <ext>-06-<slug>.md
mv <ext>-04-<slug>.md <ext>-05-<slug>.md
```

Slugs, tester function names, and `tester_definition.go` are all unaffected — only the filename prefixes move.

Write each stage's worked example in the same pass as its assertion list from phase 1. They are the same information aimed at two readers, and writing them apart is how tests and descriptions drift.

---



# Phase 5 — Tester stages

1. One `internal/stage_test_<ext>_<name>.go` per stage, built on the phase 3 helpers.
2. Register each in `internal/tester_definition.go` with a timeout.
3. Add a `Makefile` define listing the extension's stages, plus a target for running them locally.
4. Re-sync the tester's copy of the course definition, or `TestStagesMatchYAML` will fail.

**Do not use `make copy_course_file` for this while the course change is still local.** That target fetches `course-definition.yml` from GitHub `main`, so it overwrites your edits with the pre-change version — the opposite of what you want, and the failure looks like your stage registration is wrong. Copy from your working tree instead, and use `make copy_course_file` only after the course-repo change has merged.

```sh
cp ../build-your-own-<course>/course-definition.yml internal/test_helpers/course_definition.yml
go build ./... && go vet ./... && gofmt -l internal/
TESTER_DIR=$(pwd) go test -count=1 -run TestStagesMatchYAML ./internal/
```

Expect this copy to drag in unrelated drift if the fixture has gone stale against the course repo — it usually has. Commit that separately from the extension work.

---



# Phase 6 — Reference implementation and fixtures

Until this exists the extension has **no CI coverage at all**, so don't treat phases 3–5 as done without it.

1. Write a reference implementation that passes every stage, under `internal/test_helpers/scenarios/<ext>/`.
2. Record fixtures: `make record_fixtures`.
3. Add the extension's stage slugs to `internal/stages_test.go` with the fixture path.
4. Run the flakiness check, weighted toward stages whose assertions depend on model judgment:

```sh
make test_flakiness RUNS=100
```

**Fixtures record the model's choices alongside your tester's.** A byte-exact fixture taken over a live model pins its wording and the number of round trips it took, neither of which says anything about the code under test, and both of which drift. On the Skills extension both drifted within a day: one recording opened with "I see. The skill instructions indicate…" and the next with "I've read the skill instructions.", and a stage that took four requests one day took seven the next. Write a `NormalizeOutputFunc` from the start that strips what the model decided and keeps what the tester did about it — the learner program's output lines, and any tally of requests. What the program printed is already covered by the stage assertions, whose verdicts stay in the fixture. `tester-utils` runs the normalizer over the stored fixture as well as the live output, so tightening it later costs nothing.

**Run every stage against the real implementation, and expect one not to survive it.** A reference implementation you wrote will do whatever the stage needs; the product has opinions. Claude Code expands a stack of skills only in an interactive session — under `-p` it expands the first and hands the rest of the line to it as argument text — so the Skills extension's stacking stage cannot run in the real-CLI scenario at all, and that scenario carries a separate slug list with it excluded. Find this out in phase 6, not from a learner. When a stage does have to be excluded, say so in the design doc: a silently shorter slug list looks like an oversight.

**Adding or removing a test case reshuffles every randomised value after it.** Fixture recordings are deterministic per run, so a test case that draws from the generator shifts the sequence for everything downstream. Dropping one prompt selection from the Skills extension's first stage renamed every skill in every later stage and produced a 150-line fixture diff for a two-line change. Alarming, harmless, and worth recognising rather than investigating.

**Both of these need a live model**, which means `CODECRAFTERS_SECRET_OPENROUTER_API_KEY` in the environment. If you don't have it, you cannot finish this phase — say so explicitly rather than letting the extension look finished. A stage with a reference implementation, passing unit tests, and no recorded fixtures still has zero CI coverage, and that distinction disappears the moment nobody writes it down. Carry it into the design doc's review notes and into the PR description.

---



# Phase 7 — Release

1. Merge the course-definition and stage-description change.
2. Cut a tester release: `make release` tags the next `v<N>` and CI publishes it.

---



# Phase 8 — Self-review

Run the **Review Course Extensions** rubric over the result: the `MUST` list as a hard checklist, the `SHOULD` list as a discussion. Then re-read stages 1, middle, and last back to back and ask whether a learner who just finished the base course could follow them cold.

Part of that `MUST` list is enforced by CI, so check it yourself rather than discovering it on the PR. The `test_stage_descriptions` job grades every changed `stage_descriptions/` file against the 16 prose rules in [`codecrafters-io/llm-rules-test`](https://github.com/codecrafters-io/llm-rules-test); clone it and read `rules/`. The mechanical ones — one-sentence hook, `###` headings only, no semicolons in prose, at most 3 `### Notes` bullets, plural references to other stages, a `### Tests` section carrying a command and an expected output — are worth a pass over each file before you open the PR. `course-sdk lint` does not check any of this, and running it will not tell you whether these pass.

---



# Removing a stage

The eight phases above are additive, and removal is not their inverse. It touches the same inventory, plus every record that refers to the stage *by position* — which is where the silent breakage lives.

Stages get removed for two reasons, and it's worth knowing which one you're acting on. Either the stage fails the redundancy test from phase 1 step 4 and the learner implements nothing new, or it's real but trivial — a one-line change on a structure an earlier stage already built. The second kind can have perfectly good assertions, which is what makes it easy to defend and easy to keep by mistake.

Work through it in this order. The grep at the end is not optional; it's where most of the residue turns up.

**Tester repo**

1. Delete `internal/stage_test_<ext>_<name>.go`.
2. Remove its entry from `internal/tester_definition.go`.
3. Remove its slug from the `Makefile` stage JSON, and renumber the `tester_log_prefix` and `title` of every stage after it.
4. Remove the feature's handling from the reference implementation under `internal/test_helpers/scenarios/`.
5. Remove the slug from `internal/stages_test.go` and re-record fixtures.
6. Delete fixture fields and helpers that existed only for that stage.

**Course repo**

7. Remove the `stages:` entry from `course-definition.yml`.
8. Delete `stage_descriptions/<ext>-NN-<slug>.md` and renumber every file after it, back to front.
9. Update the design doc's stage table, and add a **deviation entry saying why**. The stage descriptions show what shipped; the deviation record is the only place the rejected alternative survives, and a stage removed without one gets re-proposed within a year.
10. Return the slug to your unallocated list. Don't invent a replacement later when you have one sitting free.

**Then grep, in both repos and in these skills**

11. `rg <slug>` — catches registrations, fixtures, and Makefile entries.
12. `rg 'stage [0-9]'` over the design doc. Positional prose goes stale silently: "stage 6 supplies it per-invocation", "stages 4, 6, 8 and 9 need new tester code", "the mirror of stage 8". None of it fails a test.
13. Check whether the extension is still the worked example cited in these two skills, and whether the invariant test quoted in the rubric's section I still guards a live assertion.

**Delete orphaned harness last, after the rest of the change is settled.** An assertion or fixture field that a removal appears to orphan is often picked straight back up by a stage you're adding in the same pass — removing `disable-model-invocation` from the Skills extension orphaned `DoesNotContainAssertion` for about twenty minutes, until the stacking stage needed it for a negative check.

Finally, re-check the ramp. Removing a stage can leave a two-tier jump where there wasn't one, or strip the extension's only `hard` and leave it ending on the tier it reached halfway through. Neither breaks a rule, but both are worth a line in the design doc rather than a surprise later.

---



# Worked example

The `skills` extension of **build-your-own-claude-code** (7 stages, `vh1` through `mj2`) was built with this procedure. Its `internal/skills_manager/` package in `claude-code-tester` is a concrete instance of the phase 3 fixture package.

Its `extension_designs/skills.md` is worth reading for the deviations section alone: nine designed stages became six, and the record of *why* each one was cut is the part a stage description can never show.