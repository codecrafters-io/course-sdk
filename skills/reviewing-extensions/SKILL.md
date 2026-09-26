---
name: Review Course Extensions
description: Rubric for evaluating CodeCrafters extensions, stages, stage descriptions, examples, tester test design, and tester unit tests. Use when reviewing an extension PR, auditing an existing extension or stage, or scoring LLM-generated course content. To build a new extension rather than judge one, use the Author a Course Extension skill.
compatibility: No tooling required. Reference doc; pairs with `course-definition.yml`, `stage_descriptions/`, and the course's tester repo.
---

# Goal

A single shared standard for what a good extension looks like, so that humans and LLMs grade course content the same way.

This rubric was derived by reading every stage description and tester in **shell, redis, http-server, sqlite, git, and claude-code** (~140 stages, 5 tester repos), then validated by using it to build one extension end to end. The raw per-course findings are in `research/`.

To *produce* an extension, read the **Author a Course Extension** skill instead. It covers the design and implementation procedure and points back here at its self-review step.

---

# How to read the rules

Each rule is tagged. **The tags matter more than the rules.**

| Tag | Meaning | What to do when it fails |
| --- | --- | --- |
| **`MUST`** | Mechanically checkable, no judgment involved. A failure is a defect, not a preference. | Block. Fix before merge. |
| **`SHOULD`** | The house default. Correlated with stages that don't generate support load. | Allowed to deviate, but say why in the PR description. |
| **`TASTE`** | Genuinely optional. Good courses disagree with each other here. | Ignore freely. Never flag in review. |

There are 21 `MUST` rules, 47 `SHOULD`, and 15 `TASTE`.

Some of the `MUST` rules are already enforced in CI, so failing them blocks the PR whatever a reviewer thinks. The `test_stage_descriptions` job in `.github/workflows/test-course-definition.yml` runs [`codecrafters-io/llm-rules-test`](https://github.com/codecrafters-io/llm-rules-test) over every changed file under `stage_descriptions/`, grading each against 16 atomic rules with an LLM. The rules live in that repo's `rules/` directory, one markdown file each — read them directly when a CI failure is unclear, since the job reports the rule `id` that fired. Note that `course-sdk lint` is a *different* and much narrower thing: it runs prettier, gofmt, rustfmt, and hadolint, and checks no prose at all.

**This is descriptive, not prescriptive.** These rules are what the courses learners like actually do. When the domain fights the rule, the domain wins — e.g. SQLite's b-tree stages legitimately blow the word budget because you cannot explain a page header in 250 words. State the reason and move on.

---

# The rubric

## A. Stage scope and objective

| | Rule |
| --- | --- |
| `MUST` | The text before the first heading — the hook — is **exactly one sentence**, stating what the learner will implement, in the form "In this stage, you'll implement/add/handle X." No preamble before it, no second sentence after it, soft cap 160 characters. Anything else you wanted to say there belongs in the first explanation section. |
| `MUST` | Every assertion the tester makes appears in the description, and every behaviour the description requires is tested. No silent requirements. |
| `SHOULD` | One concept per stage. A stage introducing two unrelated mechanisms is two stages. |
| `SHOULD` | A `### Notes` section fences the scope — what the learner may hardcode, what's deferred to later stages, what edge cases are out of bounds. This is the highest-value section per word in the whole format. |
| `MUST` | `### Notes` has at most **3** top-level bullets. A bullet may be several sentences and may nest, so the fix is to consolidate related points into one bullet, not to delete the content. |
| `SHOULD` | State the bare-minimum passing behaviour explicitly when it's less than the full feature ("you can hardcode the response for now"). |
| `TASTE` | A short recap of the previous stage before the objective. |

**Anti-pattern:** a stage whose objective sentence contains "and" joining two verbs.

## B. Extension composition

| | Rule |
| --- | --- |
| `MUST` | Extension `description_markdown` states both the built artifact and the concepts learned. |
| `SHOULD` | That description follows the house shape: "In this challenge extension you'll add support for `[X][link]` to your <thing> implementation", then "Along the way you'll learn about A, B, and more", with reference-style links to official docs. All eleven redis extensions match it exactly, at 28–44 words. |
| `SHOULD` | No sentence in it exceeds ~20 words. The opening sentence states what gets built and nothing else — if a definition belongs in the description, it goes in its own sentence rather than an appositive on that one. |
| `TASTE` | Whether to define the feature at all. Redis never does: Bitmaps and Sorted Sets are established terms a reader can look up, so the link suffices and stage 1 does the teaching. A one-sentence gloss earns its place when the name was *coined* by the vendor and the reader has nothing to match it against — "Skills" in build-your-own-claude-code. Budget ~60 words when you include one. |
| `MUST` | Every stage has a `difficulty`. |
| `TASTE` | `tester_source_code_url` is optional per the schema and mostly unused: sqlite, http-server, shell, and the claude-code base course have none, while redis has 7 across 159 stages and git 7. If you add it, match it to the course's existing practice, and pin a commit SHA with a line anchor pointing at the test function (`blob/<sha>/internal/test_ping_pong.go#L35`) — redis has three stages targeting one file at different anchors. A `blob/main/` link with no anchor rots on the next edit. |
| `MUST` | References to *other* stages use plural phrasing: "earlier stages", "later stages", "subsequent stages". Not by number ("as in stage 4"), not by name ("the advertising stage"), not singular ("the next stage"). Numbers shift when a stage is inserted and names shift when one is renamed, and referring to the *current* stage is unrestricted. |
| `SHOULD` | 6–11 stages, decomposed along a single named axis. |
| `SHOULD` | Difficulty ramps monotonically-ish; no two-tier jumps; at most one `hard`. |
| `SHOULD` | Single-item before multiple-item; read before write; happy path before error path; blocking/concurrency last. |
| `SHOULD` | Stage 1 of an extension is completable by editing a handful of lines. |
| `TASTE` | A welcome/orientation line on stage 1 that frames the whole extension. |
| `TASTE` | Sub-numbering in titles, e.g. "Handle multiple clients (1/3)". |

## C. Examples

| | Rule |
| --- | --- |
| `MUST` | At least one complete example showing the exact input and the exact expected output. |
| `MUST` | Randomized values are called out as random ("the tester will use a random port"), so the learner doesn't hardcode them. |
| `MUST` | In a tool-spec example, the `description` field says only what the tool returns. What the model should do with the result belongs in the system prompt example. |
| `SHOULD` | Three or more fenced code blocks per stage. The best stages read as prose-wrapped examples, not examples appended to prose. |
| `SHOULD` | Pair an *annotated* breakdown with a *literal* copy-pasteable version. The annotated one teaches; the literal one is what they diff against. |
| `SHOULD` | Make invisible characters visible — `\r\n`, trailing spaces, null bytes — with explicit escapes or an annotation. |
| `SHOULD` | Use concrete literals (`strawberry`, `6379`, `apple`) not placeholders (`<value>`, `$PORT`) in example output. |
| `SHOULD` | Show at least one negative/edge example when the stage has one (empty list, missing key, out-of-range index). |
| `SHOULD` | Inline everything needed to pass. Links are for depth, never for requirements. |
| `TASTE` | Tables for rule-like content (escape sequences, status codes, type bytes). |
| `TASTE` | Pseudocode or diff blocks showing the shape of the change. |
| `TASTE` | `#### First request` / `#### Second request` subsections for multi-step stages. |

**Anti-pattern:** an example whose output is described in prose ("the server should respond with a 200") instead of shown.

**Anti-pattern:** a tool `description` that also instructs the model — `"Load a skill's instructions and follow them"` — while the prose says the program returns the body for the model to follow. A tool description is read by the model at runtime, so the two readings disagree about who acts on the instructions, and the learner can't tell which one is the contract.

## D. Tests section

| | Rule |
| --- | --- |
| `MUST` | Every stage has a `### Tests` section. |
| `MUST` | It shows the exact command the tester runs and the exact output expected, as literal text. |
| `SHOULD` | End with a bulleted list of what the tester verifies — one bullet per assertion. |
| `SHOULD` | 1–3 assertions per stage. More than 3 is a scope smell. |
| `SHOULD` | Describe the tester's setup (files it creates, values it generates) when the learner's output depends on it. |
| `TASTE` | Showing the tester's own log output format. |

## E. Language

| | Rule |
| --- | --- |
| `MUST` | No unresolved authoring artifacts: no content in HTML comments, no empty or duplicated headings, no truncated sections, no TODOs. |
| `SHOULD` | 200–350 words of prose. Under 120 is usually under-specified; over 600 usually means two stages. |
| `SHOULD` | Second person, present/future tense, active voice. "You'll parse the header", not "the header is parsed". |
| `SHOULD` | Define domain jargon on first use, inline, in one clause. Assume the base course and nothing else. |
| `SHOULD` | One idea per paragraph, 2–4 sentences. Prefer a list or table over a long sentence with commas. |
| `MUST` | No semicolons in prose. Split the sentence, or use a dash or a comma. Semicolons inside code fences and inline code spans are untouched by this. |
| `SHOULD` | Name things the same way everywhere — the script name, the flag, the command — across description, tester output, and `course-definition.yml`. |
| `SHOULD` | Call the shipping product by its plain name — "Redis supports", "Claude Code accepts" — never "real Redis" or "Real Claude Code". Context already distinguishes it from the learner's version, and the qualifier implies theirs is the fake one. Across 230 stage descriptions in the five most popular courses there are two instances, both the comparative "just like the real Redis" in a stage 1 that is explicitly placing the learner's server beside the product. That construction is fine; "real X" as a standing name is not. |
| `TASTE` | `{{#reader_is_bot}}` blocks and language-conditional notes. |

## F. Markdown and formatting

Measured across the 152 stage descriptions in redis, git, dns-server, and claude-code: 628 code blocks, of which **78% are tagged `bash`** and 16% carry no tag; **420 `###` headings, 7 `####`, one stray `##`, zero `#`**; and 153 of the external links point at `redis.io` alone.

| | Rule |
| --- | --- |
| `MUST` | Sections use `###`. A stage description contains no `#` or `##` — the title comes from `course-definition.yml`. Use `####` only for sub-steps within a section. |
| `MUST` | Every shell command or terminal session is fenced as ```` ```bash ````. An untagged fence containing a `$` prompt or a `./your_program.sh` invocation is a defect, not a style preference. |
| `SHOULD` | A block in a real language carries that language's tag — `json`, `yaml`, `js`, `python`, `markdown`, `diff`. |
| `SHOULD` | Content that isn't a language uses a bare fence, or `text`. Protocol wire dumps, annotated hexdumps, directory trees, and rendered prompt text are all legitimately untagged — don't invent a tag to satisfy the previous rule. |
| `SHOULD` | Identifiers are backticked every time they appear in prose: command names, flags, file and directory paths, filenames, field and frontmatter keys, environment variables, placeholders, and literal values. |
| `SHOULD` | The first mention of a real-world identifier links to its official documentation, with the identifier backticked inside the link text — ``[`RPUSH`](https://redis.io/docs/latest/commands/rpush/)``. |
| `SHOULD` | Links go to a primary source, deep-linked to the exact section: the vendor's docs, the RFC, the format spec. Wikipedia, a blog, or a doc root is a fallback for when no primary source covers the point. |
| `TASTE` | Bold on the first use of a term of art. |
| `TASTE` | Reference-style vs inline links. |

Linking the spec is not decoration. A CodeCrafters course is a fidelity exercise, and the link is what lets a learner check the course against the thing it claims to reproduce — and what lets the next author notice the course drifted. Rule C's "links are for depth, never for requirements" still binds: link generously, but the stage must be passable without following any of them.

**Anti-patterns:** a `$`-prefixed command in an untagged fence; a link to a documentation root where the reader needs one section of it; an identifier written bare in prose and backticked three paragraphs later.

## G. Test design (tester repo)

| | Rule |
| --- | --- |
| `MUST` | Numbers in the description (ports, sizes, offsets, counts) match what the tester actually uses. |
| `MUST` | The tester checks for unexpected extra output/data, not just that the expected bytes are present. |
| `SHOULD` | Failure messages are of the form "Expected X, got Y" with both values printed. A learner should not need to read the tester source to understand a failure. |
| `SHOULD` | Three logging layers: `Infof` for what the tester is doing, `Debugf` for raw bytes/traffic, `Successf` for each passed assertion. |
| `SHOULD` | Randomize identifiers and values (keys, names, ports, contents) to defeat hardcoding; pin protocol constants and anything the description states literally. |
| `SHOULD` | Later stages re-exercise earlier behaviour rather than testing the new feature in isolation. |
| `SHOULD` | Reuse the shared test-case abstractions (`SendCommandTestCase`, `CommandResponseTestCase`, `SendRequestTestCase`) rather than hand-rolling assertions. |
| `SHOULD` | Explicit per-stage timeouts when the stage involves waiting, blocking, or an external process. For a stage that runs the learner's program *n* times, budget roughly *n* × the executable timeout plus setup headroom. |
| `SHOULD` | Fixtures must not contain a shortcut to the assertion. If the expected answer can be derived from a filename, an identifier, or the fixture's own text, the test passes without exercising the feature. |
| `SHOULD` | Draw randomised values for different roles from disjoint pools, so an assertion on one role can't be satisfied by a value from another. |
| `SHOULD` | In LLM-backed courses, prefer assertions on values the model *echoes* over values it *counts or computes*. Counting is among the least reliable things a model does, and the base course usually already has a precedent showing this. When the thing you wanted counted is something the program *sent*, the row below is what to do instead — this rule is easy to agree with and still violate, because "don't make the model count" doesn't name an alternative. |
| `MUST` | No assertion compares a model's answer for exact equality. The model chooses its own wording, so an exact match fails over prose rather than over behaviour: `The payments dashboard is owned by **medlar**.` is a correct answer and a failed test. Assert instead that the discriminating value is present and that the value a wrong implementation would have produced is absent. A stage whose seeded decoy exists precisely so the right answer can be told from the wrong one already has both halves. |
| `SHOULD` | When the property under test is about what the program *sent* rather than what it concluded, assert on the recorded request. It is exact where a model's answer is approximate, it removes the stage's dependence on model judgment, and it usually piggybacks on a run the stage already makes instead of costing another. A stage checking that every discovered item was advertised can read them out of the outbound request, where an "how many do you have?" round trip can only ever assert a loose minimum. |
| `MUST` | Before keying an assertion on a request, confirm the implementation being reproduced actually sends it. A request assertion describes traffic, and traffic is a property of the product, not of your design. The Skills extension's subagent stage originally waited for a request carrying the subagent's answer, which does not exist: a named invocation is resolved without consulting the model, so the main conversation makes zero calls and the reply is relayed straight to the user. The assertion was unsatisfiable by any submission, correct or not. |
| `TASTE` | Emoji/checkmarks in success output. |

## H. Cross-stage consistency

| | Rule |
| --- | --- |
| `MUST` | `marketing_md` describes the stage it's attached to. |
| `SHOULD` | Section ordering is identical across all stages in an extension. |
| `SHOULD` | Each stage's opening connects to the previous one ("In the previous stage you handled X; now…"). |
| `SHOULD` | The same explanation of a shared concept is written once and referenced, not re-explained differently in three stages. |

## I. Tester unit tests

A stage's test function can't be unit tested — it needs a network, a model, and the learner's program. Everything it *depends on* can be, and must be, because a bug in that layer fails correct submissions and looks to the learner like their own code is wrong.

The layer worth testing is the deterministic one: fixture generation, expected-value computation, formatting, and the word lists and pools the assertions draw from. Extract it into its own package so it's reachable without a harness.

| | Rule |
| --- | --- |
| `MUST` | Any value the tester computes itself and then asserts on is pinned by a unit test against a reference produced by a *different* tool. A hash computed in Go is checked against the shell command the learner will actually run. |
| `MUST` | Every unit test is mutation-checked once: break the thing it guards, confirm it fails, revert. A test that cannot fail is worse than no test, because it reads as coverage. |
| `SHOULD` | Test the *invariants your assertions depend on*, not just that functions return the right value. This is the highest-value category and the one people skip. |
| `SHOULD` | Any pool of randomised values feeding a negative or substring-based assertion gets a test proving no value is a substring of another. |
| `SHOULD` | Pools serving different roles get a test proving they're disjoint. |
| `SHOULD` | Fixture text gets a test proving it doesn't leak the expected answer. |
| `SHOULD` | Unit tests are hermetic and instant — no network, no model, no subprocess. If a test needs any of those, it belongs in the end-to-end fixtures instead. |
| `TASTE` | Table-driven cases vs one test per behaviour. |
| `TASTE` | A throwaway print-only harness that renders generated fixtures so you can read them as a learner would. Useful while authoring; never committed. |

**What an invariant test looks like.** The Skills extension's stacking stage invokes two skills at once and asserts that *both* their tokens appear in one response. That assertion is only sound if no token is a substring of another — otherwise one token satisfies the check for two, and a program that expanded just the first invocation passes. The unit test asserts the property of the word list, not the behaviour of a function:

```go
func TestNoTokenIsASubstringOfAnother(t *testing.T) {
	for _, outer := range tokenWords {
		for _, inner := range tokenWords {
			if outer == inner {
				continue
			}
			assert.NotContains(t, outer, inner, "%q contains %q", outer, inner)
		}
	}
}
```

This is worth writing because the failure it prevents is invisible: someone adds a plausible word to the list a year later, one stage starts failing for a fraction of learners, and nothing points at the word list. The generic version of the rule: **whenever an assertion's soundness rests on a property of your fixture data, test the property.**

**Note on seeded randomness.** If fixture helpers draw from a seeded generator, the generator needs initialising in `TestMain` — the tester binary normally does that in its entrypoint, and unit tests don't go through it.

---

# Using this to review

**As a gate (CI, or an LLM reviewer):** check only the `MUST` rules. They're objective; false positives are near zero. Output is pass/fail with a line reference.

**As a review (human or LLM, on a PR):** check `MUST` + `SHOULD`. For each `SHOULD` failure, quote the text and propose a concrete replacement. Never report a `TASTE` item. On a tester-only PR, sections G and I are the relevant ones; on a course-repo PR, A through F and H.

**As a score (for comparing generated candidates):** weight `MUST` at 0 or fail-the-whole-thing, and score `SHOULD` compliance as the signal. Don't score `TASTE` at all — doing so produces homogenous, formulaic content, which is the failure mode these courses avoid today.

**Deciding taste calls:** default to splitting. A stage that takes you more than ~15 minutes to write a clean example for is two stages. A stage you can't summarize in one sentence is two stages. Learners have never complained that stages were too small.

---

# Evidence

## Worked example

The `skills` extension of **build-your-own-claude-code** (7 stages, `vh1` through `mj2`) was designed and built with this rubric, and is the source of section G's last seven rules and all of section I. Three of those seven came from shipping the extension and then watching it fail — which is also why one of them notes that the rule above it was already written, agreed with, and violated anyway. Read it alongside `claude-code-tester`'s `internal/skills_manager/` package for a concrete instance of the format.

## Source analyses

`research/` contains the per-course analyses this was built from:

- `redis.md` — 49 stages, 8 extensions. The reference implementation of this format.
- `shell.md` — quoting/completion extensions; best examples of table-driven rule presentation.
- `http_sqlite.md` — HTTP server (tight, exemplary) vs SQLite (where the word budget legitimately breaks).
- `git_claudecode.md` — small courses; shows what drops out when an extension is short.
- `testers.md` — test design patterns across 5 tester repos.
