# Language version upgrades

Scripts to update a course language to a newer version

```
upgrade-course-language.ts    apply a language version to one course   (start here)
update-language-templates.ts  bump language-templates for one language
check-language-support.ts     which languages can be bumped unattended
resolve-versions.ts           report course / templates / latest versions
version-pins.ts               library: rewrite the version wherever it is pinned
test-outcome.ts               library: did the upgrade break this, or was it already broken
repair.ts                     library: hand a regression to an agent and re-test
```

## Before you run anything

These scripts **edit checkouts in place and do not create branches or commits**.
Make a branch first, or you will be upgrading `main`.

```sh
git -C ../build-your-own-redis switch -c upgrade-go
git -C ../language-templates switch -c upgrade-go   # only if templates need bumping
```

**Uncommitted changes to those files are discarded.** Commit or stash before starting.

Everything is run from the course-sdk checkout:

```sh
cd course-sdk && bun install
```



## Upgrade a course

```sh
bun scripts/language-upgrade/upgrade-course-language.ts \
  --course-dir ../build-your-own-redis \
  --language go
```

This runs `course-sdk compile` and then `course-sdk test`, so it needs Docker.
Compile regenerates `compiled_starters/` and `solutions/`, which name the
language version too; without it the diff is half-applied.

Then review:

```sh
git -C ../build-your-own-redis diff
```

## What happens when the tests fail

A failure does not automatically mean the upgrade broke something. Some courses
are already red: `build-your-own-redis` fails `course-sdk test java` on an
untouched `main`.

So on failure the script checks out `HEAD` into a throwaway worktree, runs the
same tests there, and compares. Only failures that are new get handed to a
repair agent. A clean upgrade never pays for the second run.

| Verdict | Meaning | Exit |
| --- | --- | --- |
| `passed` | tests pass | `0` |
| `pre_existing` | fails, but failed the same way before the upgrade. No repair attempted | `0` |
| `repaired` | the upgrade broke tests and the agent fixed them. Review those edits closely | `0` |
| `still_failing` | the agent could not fix it. Needs a human | `4` |

The agent is whatever `--repair-command` names, receiving the prompt in
[`prompts/repair.md`](prompts/repair.md) on stdin. It defaults to
`cursor-agent -p --force`. For `claude` you need it to be able to write and to
read the templates checkout:

```sh
--repair-command "claude -p --permission-mode bypassPermissions --add-dir ../language-templates"
```

`--skip-tests` bypasses all of this and leaves the upgrade unverified.

The prompt points the agent at `language-templates` as a worked reference,
because the template for the new version has usually already been ported.
`upgrade-language` copies that port in and then reverts the `user_editable_file`
to keep course-specific logic, so the fix the agent needs is generally sitting
right next to the code that broke. Pass `--templates-repo` for this to be
useful; without it the prompt says there is no reference.

One caveat: a flake that hits both runs looks identical to a pre-existing
failure, and gets waved through as `pre_existing` with exit `0`. A rust upgrade
did exactly this once and passed cleanly on a re-run. If a `pre_existing`
verdict is surprising, re-run before believing it.

On failure the last 60 lines of the test output are printed, labelled so the
upgraded run and the baseline can be told apart. Full output is not streamed
because Docker builds bury everything else.

If `language-templates` is behind too, this exits `3` without changing anything and prints both ways forward. To do it in one go:

```sh
bun scripts/language-upgrade/upgrade-course-language.ts \
  --course-dir ../build-your-own-redis \
  --language go \
  --templates-repo ../language-templates \
  --update-templates
```

That bumps the templates first, then upgrades the course against them. Pass `--templates-repo` whenever the templates change is not merged yet, so the course reads your local branch instead of `origin/main`.

Bumping the templates is **one-off per language version, not per course**. 

## Bump language-templates on its own

No course needed:

```sh
bun scripts/language-upgrade/update-language-templates.ts \
  --templates-repo ../language-templates \
  --language go
```

Nothing validates this. `language-templates` has no CI and a Dockerfile cannot be built in isolation, so run a course against it before merging.

## Check what can be automated

```sh
bun scripts/language-upgrade/check-language-support.ts --templates-repo ../language-templates
```

Reports three things: that course upgrades work for every language, which languages can have their templates bumped and why the rest cannot, and any version pins not yet covered. Use `--format json` to consume it, `--language <slug>` for one language.

## Flags


| Flag | Scripts | Notes |
| --- | --- | --- |
| `--course-dir <path>` | upgrade-course, resolve | course repo checkout |
| `--language <slug>` | all | course-sdk slug, so `javascript` not `nodejs` |
| `--templates-repo <path>` | all | required for templates bumps and the support check; optional elsewhere, where it defaults to cloning `origin/main` |
| `--update-templates` | upgrade-course | bump templates instead of refusing |
| `--status-json <url\|path>` | upgrade-course, update-templates, resolve | defaults to language-dashboard's published `status.json` |
| `--skip-tests` | upgrade-course | skip compile-and-test verification |
| `--repair-command <cmd>` | upgrade-course | agent to fix a regression, given the prompt on stdin |
| `--max-repair-attempts <n>` | upgrade-course | defaults to `2` |
| `--json-out <path>` | upgrade-course | write the result somewhere instead of scraping stdout |
| `--format <text\|markdown\|json>` | check-support | defaults to `text` |

These scripts set
[`COURSE_SDK_LANGUAGE_TEMPLATES_REPO`](../../README.md#working-against-local-language-templates)
from `--templates-repo`, which is what lets a course read a templates change
before it is merged. You only need to set it yourself when running `course-sdk`
directly.

Exit codes: `0` upgraded or already current, `1` failed, `3` templates behind,
`4` tests still failing after repair.

## When it refuses


| Message | Meaning |
| --- | --- |
| exit `3`, "language-templates is behind" | Bump templates first, or re-run with `--update-templates` |
| "FROM tag has no version token equal to ..." | This language's templates bump is not automatable. Run the support check; the course upgrade still works once templates are updated by hand |
| "holds X, which is not the version being upgraded from" | The pin tracks a different tool and was left alone. Usually correct — Kotlin's `config.yml` holds a Gradle version, Haskell's holds a Stack version |
| "no Dockerfile for `<lang>`" | Course does not have this language yet; use `course-sdk add-language` |
| "Already failing on HEAD" | The course was red before the upgrade. Not this PR's problem, but worth fixing separately |
| exit `4`, still failing after repair | Breaking changes the agent could not resolve. Edit `starter_templates/<lang>/code/` and iterate as in [skills/adding-language-support](../../skills/adding-language-support/SKILL.md) |


A skipped pin is reported with its reason rather than passing silently, so read the `[pin]` lines even on a successful run.

## Adding a pin

When the support check reports a file under "version pins not covered", a bump would leave that file stale. Add a pattern to `MANIFEST_PINS` in `version-pins.ts`, keyed by language slug:

```ts
zig: [{ pathGlob: "code/build.zig.zon", pattern: /^(\s*\.minimum_zig_version\s*=\s*")([\d.]+)(")/m }],
```

The pattern needs exactly three capture groups — prefix, version, suffix — and paths are relative to the language root, which is `languages/<slug>/` in language-templates and `starter_templates/<slug>/` in a course. A pin is only rewritten when it currently holds the version being upgraded from, so nearby versions belonging to other tools are safe.

Add a case to `version-pins.test.ts`, then re-run the support check to confirm the file is no longer reported.

## Tests

```sh
bun test scripts/language-upgrade/
```

