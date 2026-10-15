# Build your own Shell — Writing & Design Pattern Analysis

**Repo:** `/Users/yash/projects/codecrafters/_misc/course-sdk/.analysis-tmp/build-your-own-shell`  
**Files read:** All 76 stage descriptions; full deep-read of base (8), quoting (6), redirection (4), pipelines (3), completions (6), filename-completion (7), programmable-completion (10), navigation (4), history (6), plus representative background-jobs, parameter-expansion, and history-persistence stages.

---

## Stage Composition Overview

| Extension prefix | Stage count |
|---|---|
| `programmable-completion` | 10 |
| `background-jobs` | 9 |
| `base` | 8 |
| `parameter-expansion` | 7 |
| `filename-completion` | 7 |
| `quoting` | 6 |
| `history-persistence` | 6 |
| `history` | 6 |
| `completions` | 6 |
| `redirection` | 4 |
| `navigation` | 4 |
| `pipelines` | 3 |
| **Total** | **76** |

---

## 1. STAGE DESCRIPTION ANATOMY

### Recurring section skeleton (canonical, ~74/76 stages)

```
[Opening paragraph — 1–2 sentences, always present]

### [Concept heading — named after the feature]
[Explanation, rules, examples/tables]

### Tests
[Tester invocation + transcript + verification bullets]

### Notes          ← present in ~47/76 stages
[Scope limits, language hints, deferred work]
```

**Literal heading names observed:**
- `### Tests` — **74/76** stages (missing only in `base-01-oo8.md`, `base-02-cz2.md`)
- `### Notes` — **47/76** stages
- Concept headings are **free-form** but follow naming conventions:
  - Builtin stages: `### The \`echo\` Builtin`, `### The PATH Environment Variable`
  - Feature stages: `### Single Quotes`, `### Tab Autocompletion`, `### Reaping Before Each Prompt`
  - Recap headings (navigation, background-jobs): `### The \`cd\` Builtin (Recap)`, `### Background Jobs (Recap)`

### Typical word counts

| Tier | Word count | Examples |
|---|---|---|
| Minimal / legacy | 22–93 | `base-01-oo8.md` (22), `base-02-cz2.md` (88), `history-01-bq4.md` (91) |
| Standard | 140–350 | Most quoting, redirection, base-03–08 |
| Rich / advanced | 350–507 | `background-jobs-07-rq2.md` (507), `completions-01-qp2.md` (478), `base-07-mg5.md` (432) |
| **Average** | **~237 words/stage** | Range: 22–507 |

### Opening paragraph vs Tests vs Notes

**Opening paragraph** (always first):
- One sentence starting with `"In this stage, you'll..."` (72/76) or `"In this stage, you will..."` (3/76)
- Occasionally omits "In this stage" entirely (`base-01-oo8.md`)
- States the single deliverable; rarely lists steps

**Concept section** (between opening and Tests):
- Defines the feature, gives rules as numbered/bulleted lists or markdown tables
- Shows 1–3 example transcripts
- Defers out-of-scope behavior explicitly in newer extensions

**Tests section** (near-universal):
- Always starts: `"The tester will execute your program like this:"`
- Shows `./your_program.sh` (sometimes prefixed with env vars like `PATH=...` or `HISTFILE=...`)
- Shows a full `$ prompt → input → output` transcript
- Ends with `"The tester will verify that:"` + bullet checklist

**Notes section** (when present):
- Random/generated test values
- Language-specific library recommendations (Handlebars `{{#lang_is_*}}` blocks)
- Explicit scope exclusions ("only need to…", "We'll handle X in later stages")
- Edge-case clarifications (zsh vs bash behavior, optional trailing `&`)

### Older vs newer extension differences

| Pattern | Older (base-01/02, early history) | Newer (background-jobs, programmable-completion, filename-completion) |
|---|---|---|
| Section skeleton | Incomplete — no `### Tests`/`### Notes` | Full skeleton always |
| Opening | Context-first or bare minimum | `"In this stage, you'll..."` + concept heading |
| Concept depth | Thin or absent | Rich: tables, step-by-step algorithms, format breakdowns |
| Scope deferral | Implicit ("in later stages") | Explicit bullet lists of what's excluded |
| Recap sections | Rare | `"### The cd Builtin (Recap)"`, `"### Background Jobs (Recap)"` |
| Language hints | Sparse | Handlebars per-language readline recommendations |
| Format specs | Minimal | Precise (24-char status padding, marker rules, normalized output) |

**Legacy outlier — `base-01-oo8.md` (entire file):**
> Every shell starts with a [prompt](https://app.codecrafters.io/concepts/what-is-a-shell-prompt) (usually `$`) that signals it's ready for your command.
>
> In this stage, you'll print that prompt.

**Legacy outlier — `base-02-cz2.md` uses a numbered list instead of `###` headings:**
> Your program should:
>
> 1. Display the prompt `$ ` (keep the code from the previous stage)
> 2. Read the user's input
> 3. Print an error message in exactly this format: `{command}: command not found`

---

## 2. OBJECTIVE / SCOPE PER STAGE

### How many new concepts per stage?

**Dominant pattern: 1 primary concept per stage.** The course aggressively decomposes features into atomic steps.

**Single-concept examples:**
- `base-04-pn5.md` — only `exit` builtin
- `quoting-04-le5.md` — only backslashes inside single quotes
- `redirection-02-vz4.md` — only `2>` stderr redirect
- `completions-03-qm8.md` — only bell-on-no-match behavior

**Multi-concept / bundled examples (rarer, usually flagged):**
- `programmable-completion-03-wl6.md` — registers `-C` AND extends `-p` to display (2 related flags, one storage model)
- `quoting-05-gu3.md` — covers both `\"` and `\\` inside double quotes, but explicitly excludes `\$`, `` \` ``, `\<newline>`
- `background-jobs-08-bv8.md` — introduces automatic reaping AND documents two reaping points
- `base-07-mg5.md` — PATH traversal + execute-permission check + builtin precedence (3 steps, but one cohesive `type` extension)

### "In this stage you'll..." phrasing

**Canonical template:**
> In this stage, you'll **[implement / add support for / extend / register / handle / ensure]** **[specific feature]**.

**Verb frequency (opening sentences):**
- `implement` — 27
- `add` — 19
- `extend` — 10
- `handle` — 6
- `register` — 3

**Stub-registration pattern** (extension stage 1):
> In this stage, you'll register `complete` as a shell builtin.  
> — `programmable-completion-01-ne7.md`

> For this stage, you only need to register `complete` as a builtin so that it's recognized by the `type` command. We'll get to implementing the actual behavior in later stages.

**Incremental extension pattern:**
> In this stage, you'll extend the `type` builtin to search for executable files using PATH.  
> — `base-07-mg5.md`

> In this stage, you'll extend your `cd` builtin to handle relative paths.  
> — `navigation-03-gq9.md`

### Continuity / back-references

Used in ~19 stages. Common phrases:

> 1. Display the prompt `$ ` (keep the code from the previous stage)  
> — `base-02-cz2.md`

> So far, your shell only completes filenames in the current directory. Now you'll extend it…  
> — `filename-completion-02-ue6.md`

> As a recap, `cd` can receive multiple argument types:  
> - Absolute paths… (Handled in previous stages)  
> — `navigation-03-gq9.md`, `navigation-04-gp4.md`

> In earlier stages, you registered completer scripts with `complete -C` and stored them. Now you'll actually run them.  
> — `programmable-completion-04-pm5.md`

> We'll handle executable files in later stages.  
> — `base-06-ez5.md`

---

## 3. EXTENSION COMPOSITION

### Per-extension stage arcs

#### **base** (8 stages) — Core REPL + builtins + externals
1. Print a prompt
2. Handle invalid commands
3. Implement a REPL
4. Implement exit
5. Implement echo
6. Implement type (builtins only)
7. Locate executable files (extend type + PATH)
8. Run a program (spawn external with args)

**Arc:** Prompt → error handling → loop → builtin commands one-by-one → distinguish builtin vs external → PATH lookup → process spawning. Classic incremental decomposition of "builtin vs external command."

**Difficulty:** `very_easy → easy×5 → medium×2`

---

#### **navigation** (4 stages)
1. The pwd builtin
2. The cd builtin: Absolute paths
3. The cd builtin: Relative paths
4. The cd builtin: Home directory

**Arc:** Read CWD → cd absolute → cd relative → cd `~`. Each path type is its own stage.

**Difficulty:** `easy → medium×3`

---

#### **quoting** (6 stages) — Exemplary incremental decomposition
1. Single quotes
2. Double quotes
3. Backslash outside quotes
4. Backslash within single quotes
5. Backslash within double quotes
6. Executing a quoted executable

**Arc:** Quote type by quote type → escape context by context → apply quoting to executable name lookup. Each quoting rule gets its own stage; double-quote `$`/`` ` `` deferred explicitly.

**Difficulty:** `medium×6` (flat — no ramp within extension)

---

#### **redirection** (4 stages)
1. Redirect stdout (`>`, `1>`)
2. Redirect stderr (`2>`)
3. Append stdout (`>>`, `1>>`)
4. Append stderr (`2>>`)

**Arc:** stdout overwrite → stderr overwrite → stdout append → stderr append. Symmetric 2×2 matrix.

**Difficulty:** `medium×4`

---

#### **pipelines** (3 stages)
1. Dual-command pipeline (external only)
2. Pipelines with built-ins
3. Multi-command pipelines

**Arc:** Simplest case → add builtin complexity → scale to N commands. Jumps to `hard` immediately.

**Difficulty:** `hard×3`

---

#### **completions** (6 stages)
1. Builtin completion (`echo`, `exit`)
2. Completion with arguments
3. Missing completions (bell)
4. Executable completion (PATH)
5. Multiple completions (double-tab list)
6. Partial completions (LCP)

**Arc:** Single match → args preserved → no-match bell → PATH executables → multi-match UX → LCP algorithm.

**Difficulty:** `medium, medium, easy, medium, hard, hard`

---

#### **filename-completion** (7 stages)
1. File completion (CWD, single match)
2. Nested file completion
3. Directory completion (trailing `/`)
4. Missing completions (bell)
5. Multiple matches
6. Partial completions (LCP)
7. Multi-argument completions

**Arc:** Mirrors command-completion arc but for filesystem tokens; adds directory `/` suffix rule and multi-argument position.

**Difficulty:** `medium, medium, easy, easy, hard, hard, easy`

---

#### **programmable-completion** (10 stages — largest extension)
1. Register complete builtin
2. Printing missing specifications (`-p` error only)
3. Displaying registered specifications (`-C` + `-p` display)
4. Single completion (run script)
5. Handling no completions (bell)
6. Passing command-line arguments (`argv[1-3]`)
7. Passing environment variables (`COMP_LINE`, `COMP_POINT`)
8. Multiple completer candidates
9. Longest common prefix
10. Unregister a completion (`-r`)

**Arc:** Register stub → error path → storage/display → invoke script → empty output → context passing (args then env) → multi-match UX → LCP → cleanup.

**Difficulty:** `easy×6, medium×3, easy` — front-loaded easy registration stages

---

#### **background-jobs** (9 stages)
1. The jobs builtin (empty stub)
2. Starting background jobs (`&`)
3. Printing background job output
4. List a single job
5. List multiple jobs (markers `+`/`-`)
6. Reap one job
7. Reap multiple jobs
8. Reap before the next prompt
9. Recycle job numbers

**Arc:** Register → launch → I/O wiring → format spec → scale → zombie reaping → auto-reap → number recycling.

**Difficulty:** `easy → medium×7 → easy`

---

#### **history** (6 stages)
1. The history builtin (type registration only)
2. Listing history
3. Limiting history entries
4. Up-arrow navigation
5. Down-arrow navigation
6. Executing commands from history

**Arc:** Register → list → limit → up → down → execute. Arrow-key stages are test-only with minimal spec.

**Difficulty:** `easy → medium×5`

---

### Difficulty sequence summary (from `course-definition.yml`)

| Extension | Stage 1 difficulty | Last stage difficulty | Pattern |
|---|---|---|---|
| base | very_easy | medium | Ramp up |
| navigation | easy | medium | Stage 1 easy ✓ |
| quoting | medium | medium | Flat medium |
| redirection | medium | medium | Flat medium |
| pipelines | hard | hard | No ramp — all hard |
| completions | medium | hard | Ramp to hard |
| filename-completion | medium | easy | Ends easy |
| programmable-completion | easy | easy | Stage 1 easy ✓ |
| background-jobs | easy | easy | Stage 1 easy ✓ |
| history | easy | medium | Stage 1 easy ✓ |
| parameter-expansion | easy | easy | Stage 1 easy ✓ |
| history-persistence | medium | medium | No easy stage 1 |

**Is stage 1 always easy?** No — quoting, redirection, pipelines, and history-persistence start at medium or hard. Extensions that introduce a new *builtin* typically start with an easy "register stub" stage.

**What does the last stage typically do?**
- Caps a feature family (LCP, multi-arg, recycling)
- Handles edge/cleanup behavior (`complete -r`, append-on-exit)
- Integrates prior stages into a "real-world" scenario (quoted executable, execute recalled history)

### Builtin vs external & quoting progressions (design exemplars)

**Builtin vs external (`base`):**
```
echo/exit/type (builtin, in-process)
  → type distinguishes builtin vs "not found"
  → type adds PATH lookup (external discovery)
  → run program (external execution with fork/exec)
```
Each layer adds one responsibility without rewriting prior stages.

**Quoting (`quoting`):**
```
quote mechanism (single → double)
  → escape mechanism (outside → inside single → inside double, with explicit exclusions)
  → apply quoting to executable name resolution
```
Rules are separated by *syntactic context*, not lumped into one "parsing" stage.

---

## 4. EXAMPLES

### 5 representative example blocks (verbatim)

**Example 1 — Simple prompt + error (`base-02-cz2.md`):**
```
$ xyz
xyz: command not found
```

**Example 2 — REPL loop with random commands (`base-03-ff0.md`):**
```bash
$ invalid_command_1
invalid_command_1: command not found
$ invalid_command_2
invalid_command_2: command not found
$ invalid_command_3
invalid_command_3: command not found
$
```

**Example 3 — External program with concrete + generated values (`base-08-ip1.md`):**
```bash
$ custom_exe_1234 alice
Program was passed 2 args (including program name).
Arg #0 (program name): custom_exe_1234
Arg #1: alice
Program Signature: 5998595441
```

**Example 4 — Tab completion with `<TAB>` notation (`completions-01-qp2.md`):**
```bash
$ ech<TAB>
$ echo 

$ exi<TAB>
$ exit 
```

**Example 5 — Bell + double-tab listing (`completions-05-wh6.md`):**
```bash
$ xyz_<TAB><TAB>
xyz_bar  xyz_baz  xyz_quz
$ xyz_
```

### Example conventions

| Convention | Usage |
|---|---|
| **Prompt** | Always `$ ` (dollar + space). Sometimes `$` alone on last line signals empty input / test end |
| **Concrete values** | Used in early/base stages (`echo hello world`, `/usr/bin/ls`) |
| **Placeholders** | `<command>`, `<pid>`, `<path_to_history_file>`, `invalid_command_1`, `custom_exe_1234` |
| **Random values** | Explicitly noted in Notes: "command names will be random", "random number of arguments" |
| **Invisible chars** | `<TAB>`, `<ENTER>`, `<UP ARROW>`, `<DOWN ARROW>` as inline annotations; `\x07` for bell; `\ ` for escaped space in prose/tables |
| **HTML in tables** | `<code style="white-space: pre;">` to preserve multiple spaces in quoting tables |
| **Inline comments in examples** | `# note the trailing space`, `# Bell rings, input unchanged`, `# (tester appends more lines…)` |
| **Input + output** | Almost always both shown; tester transcript is the spec |
| **Partial lines** | `# Note: The prompt lines below are displayed on the same line` for progressive TAB completion |

**Bell character representation (`completions-03-qm8.md`):**
> The bell is produced by printing the [bell character](https://en.wikipedia.org/wiki/Bell_character) `\x07` to the terminal.

**Escaped spaces in table (`quoting-03-yt5.md`):**
> | `echo three\ \ \ spaces` | <code style="white-space: pre;">three   spaces</code> | Each <code style="white-space: pre;">\ </code> creates a literal space… |

---

## 5. TESTS SECTION

### 3 Tests sections quoted verbatim

**Tests A — Minimal exit test (`base-04-pn5.md`):**
> ### Tests
>
> The tester will execute your program like this:
>
> ```bash
> ./your_program.sh
> ```
>
> It will then send an invalid command to your shell, followed by the `exit` command:
>
> ```bash
> $ invalid_command_1
> invalid_command_1: command not found
> $ exit
> ```
>
> The tester will verify that your shell terminates after receiving the `exit` command.

**Tests B — PATH override + verification bullets (`base-07-mg5.md`):**
> ### Tests
>
> The tester will execute your program with a custom `PATH` like this:
>
> ```bash
> PATH="/usr/bin:/usr/local/bin:$PATH" ./your_program.sh
> ```
>
> It will then send a series of `type` commands to your shell:
>
> ```bash
> $ type ls
> ls is /usr/bin/ls
> $ type valid_command
> valid_command is /usr/local/bin/valid_command
> $ type invalid_command
> invalid_command: not found
> $
> ```
>
> The tester will verify that the `type` command correctly identifies executable files in the PATH:
> - Executable files in PATH are reported with their full path (`<command> is <full_path>`).
> - Files without execute permissions are skipped.
> - Non-existent commands print the `<command>: not found` message.

**Tests C — Streaming pipeline with runtime file mutation (`pipelines-01-br6.md`):**
> ### Tests
>
> The tester will execute your program like this:
>
> ```bash
> ./your_program.sh
> ```
>
> It'll then execute multiple pipelines with two commands in them. Examples:
>
> ```bash
> $ cat /tmp/foo/file | wc
>        5      10      77
> ```
>
> ```bash
> $ tail -f /tmp/foo/file-1 | head -n 5
> raspberry strawberry
> pear mango
> pineapple apple
> # (tester appends more lines to /tmp/foo/file-1)
> # (And expects the running command to keep printing new lines)
> This is line 4.
> This is line 5.
> $
> ```
>
> The tester will check if the final output matches the expected output after pipeline execution.
>
> For the `tail -f` command, the tester will append content to the the input file while the pipeline is running.

### Tests section patterns

| Element | Pattern |
|---|---|
| Invocation | Always `./your_program.sh`; sometimes prefixed with env vars |
| Exact command sequence | Yes — full transcript is the contract |
| Exact expected strings | Yes for builtins/errors; partial for external program output |
| Random/generated values | Disclosed in Tests or Notes, never hidden |
| Local testing | **Never mentioned** — no "run tests locally", no `codecrafters test` |
| Verification style | `"The tester will verify that:"` + bullet checklist (behavioral assertions) |
| Placeholder syntax | `<command>`, `<pid>`, `<path_to_history_file>` in examples meaning "tester-supplied" |

---

## 6. NOTES / EDGE CASES

### What goes into Notes

1. **Deferred scope** — "only need to X; we'll do Y later"
2. **Random test data** — names, argument counts, PIDs vary
3. **Language-specific hints** — Handlebars blocks recommending readline/rustyline/JLine
4. **Shell compatibility caveats** — "Bash interpretation, not zsh"
5. **Implementation hints** — `waitpid WNOHANG`, `os.pathsep`, FIFO behavior
6. **Optional formatting** — trailing `&` on jobs output is optional
7. **External tool assumptions** — "cat is available, don't implement it"

### 5+ verbatim scope-limiting sentences

1. > For now, we'll treat all commands as "invalid". In later stages we'll handle executing "valid" commands like `echo`, `cd` etc.  
   — `base-02-cz2.md`

2. > We'll handle executable files in later stages.  
   — `base-06-ez5.md`

3. > We won't cover the following cases in this stage:  
   > - `\$`: escapes the dollar sign.  
   > - `` \` ``: escapes the backtick.  
   > - `\<newline>`: escapes a newline character.  
   — `quoting-05-gu3.md`

4. > You don't need to implement any completion logic in this stage. Just register `complete` so it shows up as a builtin.  
   — `programmable-completion-01-ne7.md`

5. > For this stage, you only need to match the prefix against files in the current working directory. We'll implement completion in nested directories in later stages.  
   — `filename-completion-01-zv2.md`

6. > You don't need to pass completion context (like the current word being typed) to the completer yet. That comes in later stages.  
   — `programmable-completion-04-pm5.md`

7. > Only handle normal exits for this stage. Don't worry about processes killed by signals or stopped.  
   — `background-jobs-06-ma9.md`

8. > In this stage, support the simple `$VAR` syntax only. We'll get to supporting the `${VAR}` form in the later stages.  
   — `parameter-expansion-05-ge9.md`

---

## 7. LANGUAGE

### Voice & style profile

| Dimension | Pattern |
|---|---|
| **Person** | Second person ("you/your") throughout |
| **Tense** | Present for behavior specs; future ("you'll") in opening sentence only |
| **Sentence length** | Short–medium (12–25 words); lists break up density |
| **Contractions** | Common: "you'll", "don't", "won't", "it's", "we'll" |
| **Hedging** | Light: "typically", "most languages", "for example", "should" |
| **Imperatives** | Direct in Tests context ("Display", "Check", "Remove") |
| **Jargon** | Introduced inline with links, rarely formally defined |

### 5 especially clear sentences

1. > When your shell receives the `exit` command, it should terminate immediately.  
   — `base-04-pn5.md`

2. > If the directory change fails, the current directory should remain unchanged.  
   — `navigation-02-ra6.md`

3. > The `>` operator only redirects standard output, not standard error.  
   — `redirection-01-jv1.md`

4. > Each argument is completed independently against the current working directory. A preceding directory argument (like `bar/`) does not change the search directory for subsequent arguments.  
   — `filename-completion-07-bf8.md`

5. > A job's `Done` entry appears exactly once. Either from automatic reaping or from calling `jobs`, whichever happens first.  
   — `background-jobs-08-bv8.md`

### 5 confusing / ambiguous / overloaded sentences

1. > For the `type` command, the tester will check if the command correctly handles the built-in command and prints the correct output, the `ls` output is not supposed to be printed.  
   — `pipelines-02-ny9.md` *(run-on, unclear which output goes where)*

2. > history as a shell builtin that lists previously executed commands.  
   — `history-01-bq4.md` *(grammatically broken)*

3. > The tester will then execute the `type history` command and expect the output to be `history is a shell builtin`.  
   — `history-01-bq4.md` *(duplicates prior sentence)*

4. > # Note: The prompt lines below are displayed on the same line  
   — `completions-06-wt6.md` *(contradicts normal `$ prompt` on new line convention)*

5. > It will then run `declare -p` with a variable name has not been defined.  
   — `parameter-expansion-02-oa2.md` *(grammar error; obscures intent)*

### Jargon introduced without definition

- **REPL** — linked to Wikipedia, defined inline in `base-03-ff0.md`
- **FIFO** — mentioned in `background-jobs-03-si2.md` Notes without prior introduction
- **Zombie process** — named in `background-jobs-06-ma9.md` with brief explanation
- **LCP (longest common prefix)** — used as acronym in stage titles before always spelling out in body
- **File descriptor notation (`1>`, `2>`)** — explained in redirection stages
- **Reaping** — used repeatedly in background-jobs without a standalone definition (context-only)
- **`COMP_POINT` as byte index** — stated but distinction from character index is easy to miss

---

## 8. LINKS & EXTERNAL DOCS

**Total external links:** ~44 across 76 stages (~0.6 links/stage). Heavily front-loaded in base; sparse in advanced extensions.

| Link type | When used | Examples |
|---|---|---|
| **CodeCrafters concepts** | First introduction of course-specific ideas | `what-is-a-shell-prompt`, `what-are-builtin-commands`, `what-is-path`, `shell-quoting` |
| **POSIX / Open Group spec** | Builtin definitions | `exit`, `echo`, `type` utilities |
| **GNU Bash manual** | Quoting, pipelines, history, completion | Single/double quotes, pipelines, HISTFILE |
| **Wikipedia** | General CS concepts | REPL, fork, anonymous pipe, bell character, pwd |
| **man7.org** | `jobs` builtin |
| **Language docs** | In Notes via Handlebars | readline, rustyline, JLine, exec.LookPath |

**Spec vs inline rule:** Base stages link out for builtins; newer extensions (background-jobs, filename-completion, programmable-completion) give **everything inline** with no external spec links. Quoting uses GNU Bash manual links but still provides full rule tables inline — links are supplementary, not required reading.

---

## 9. WEAK SPOTS — 10 Worst Stage Descriptions

### 1. `base-01-oo8.md` — Critically underspecified
- **22 words total.** No Tests section, no Notes, no example transcript, no mention of `$ ` vs `$`.
- Learner has no test contract beyond marketing copy.

### 2. `base-02-cz2.md` — Non-standard skeleton, no Tests
- Uses numbered list instead of `###` sections.
- No Tests/Notes; `{command}` placeholder format shown but tester behavior unspecified.
- Only stage continuity reference is "keep the code from the previous stage."

### 3. `history-01-bq4.md` — Broken prose, redundant Tests
- Opening: *"history as a shell builtin that lists previously executed commands"* — missing verb.
- Tests section repeats the same assertion twice.
- No concept section explaining what "register as builtin" means beyond a one-line example.

### 4. `history-04-rh7.md` / `history-05-vq0.md` / `history-06-dm2.md` — Tests-only arrow-key trilogy
- No spec for: empty history behavior, wrapping at top/bottom, editing recalled line, whether partial input is preserved.
- ~370 words each but ~300 is duplicated readline library boilerplate across 3 files.
- `<UP ARROW>` notation shown but key codes / readline integration left entirely to learner.

### 5. `pipelines-01-br6.md` — Thin concept, heavy implicit requirements
- Concept section is 2 sentences; Tests include `tail -f` streaming with file appends — complex behavior with minimal setup guidance.
- Notes mention fork/pipe/wikipedia links but no step-by-step algorithm.
- All 3 pipeline stages are `hard` with no ramp.

### 6. `pipelines-02-ny9.md` — Ambiguous builtin-in-pipeline semantics
- Example `$ ls | type exit` is confusing: which stdin does `type` read?
- Run-on verification sentence (quoted above) doesn't specify expected stdout/stderr routing.
- Only 164 words; least detailed of the hard stages.

### 7. `history-persistence-05-kz7.md` — Tests-only, no spec
- Entire stage is Tests section (28 lines). No explanation of write format, ordering, whether `history` commands are included, newline handling.
- Relies entirely on prior stages + implicit bash behavior.

### 8. `quoting-02-tg6.md` — Deferred behavior without pointer
- States double quotes allow `$` and `\` interpretation *"but we'll cover those exceptions in later stages"* — doesn't say which stage covers `$` (answer: parameter-expansion, a different extension entirely).
- No Notes section to clarify cross-extension dependency.

### 9. `completions-06-wt6.md` — Confusing same-line prompt notation
- *"The prompt lines below are displayed on the same line"* contradicts every other stage's newline-based prompt convention.
- Progressive TAB on one line (`$ xyz_<TAB>` → `$ xyz_foo_<TAB>`) is hard to parse; easy to misimplement as separate lines.

### 10. `parameter-expansion-07-my0.md` — Dense edge case, formatting glitch
- Critical rule buried: empty expanded word is **dropped entirely** from argv — only explained in one sentence after example.
- Missing blank line before `### Tests` (line 16 runs into prior paragraph).
- No Notes section; no table contrasting `$missing` vs `${missing}word`.

**Honorable mention:** `programmable-completion-02-oi7.md` — uses `<command>` placeholder in test transcript without explaining angle-bracket convention; body says "you'll only return the error output" which sounds like a partial implementation trap.

---

## Cross-Cutting Design Patterns (Summary)

1. **Atomic stages** — One concept, one stage; multi-concept only when tightly coupled.
2. **Stub-first extensions** — Stage 1 registers builtin with empty/partial impl (`complete`, `jobs`, `declare`, `history`).
3. **Symmetric feature matrices** — Redirection (>/>> × stdout/stderr), quoting (context × mechanism).
4. **Progressive UX stages** — Completion family always: single match → bell → multi-list → LCP.
5. **Tests as spec** — Transcript + verification bullets = the contract; Notes add scope boundaries.
6. **Explicit deferral** — "We won't cover…", "In this stage, you only need…" prevents scope creep.
7. **Recap headings** — Multi-stage features (cd, background jobs) re-list prior coverage at stage open.
8. **Legacy → modern drift** — Base stages 1–2 are outliers; everything after base-03 follows the rich template.

---

*Analysis based on 76 files in `stage_descriptions/` and full `course-definition.yml` (731 lines).*

[REDACTED]