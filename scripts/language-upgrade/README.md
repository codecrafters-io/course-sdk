# Language version upgrades

Moves a course, and the shared templates it draws from, onto a newer version of
a language.

```
upgrade-course-language.ts    apply a language version to one course   (start here)
update-language-templates.ts  bump language-templates for one language
check-language-support.ts     which languages can be bumped unattended
resolve-versions.ts           report course / templates / latest versions
version-pins.ts               library: rewrite the version wherever it is pinned
```

## Before you run anything

These scripts **edit checkouts in place and do not create branches or commits**.
Make a branch first, or you will be upgrading `main`.

```sh
git -C ../build-your-own-redis switch -c upgrade-go
git -C ../language-templates switch -c upgrade-go   # only if templates need bumping
```

`upgrade-course-language.ts` runs `course-sdk upgrade-language`, which does
`git checkout` on the starter template's user-editable file and dependency
manifests to preserve course-specific content. **Uncommitted changes to those
files are discarded.** Commit or stash before starting.

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

Then review, compile and test:

```sh
git -C ../build-your-own-redis diff
cd ../build-your-own-redis && course-sdk compile go && course-sdk test go
```

If `language-templates` is behind too, this exits `3` without changing anything
and prints both ways forward. To do it in one go:

```sh
bun scripts/language-upgrade/upgrade-course-language.ts \
  --course-dir ../build-your-own-redis \
  --language go \
  --templates-repo ../language-templates \
  --update-templates
```

That bumps the templates first, then upgrades the course against them. Pass
`--templates-repo` whenever the templates change is not merged yet, so the
course reads your local branch instead of `origin/main`.

Bumping the templates is **one-off per language version, not per course**. Every
course tends to sit on the same version at once, so eleven courses discovering
Go 1.27 would otherwise open eleven identical `language-templates` pull
requests. Check for an open one before using `--update-templates`.

## Bump language-templates on its own

No course needed:

```sh
bun scripts/language-upgrade/update-language-templates.ts \
  --templates-repo ../language-templates \
  --language go
```

Nothing validates this. `language-templates` has no CI and a Dockerfile cannot
be built in isolation, so run a course against it before merging.

## Check what can be automated

```sh
bun scripts/language-upgrade/check-language-support.ts --templates-repo ../language-templates
```

Reports three things: that course upgrades work for every language, which
languages can have their templates bumped and why the rest cannot, and any
version pins not yet covered. Use `--format json` to consume it, `--language
<slug>` for one language.

Course upgrades work everywhere because the Dockerfile is copied out of
`language-templates` verbatim. Only the templates bump has to rewrite a base
image tag, and that is what the report is about.

## Flags

| Flag                              | Scripts                                   | Notes                                                                                                              |
| --------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `--course-dir <path>`             | upgrade-course, resolve                   | course repo checkout                                                                                               |
| `--language <slug>`               | all                                       | course-sdk slug, so `javascript` not `nodejs`                                                                      |
| `--templates-repo <path>`         | all                                       | required for templates bumps and the support check; optional elsewhere, where it defaults to cloning `origin/main` |
| `--update-templates`              | upgrade-course                            | bump templates instead of refusing                                                                                 |
| `--status-json <url\|path>`       | upgrade-course, update-templates, resolve | defaults to language-dashboard's published `status.json`                                                           |
| `--format <text\|markdown\|json>` | check-support                             | defaults to `text`                                                                                                 |

`COURSE_SDK_LANGUAGE_TEMPLATES_REPO` makes `course-sdk` itself read templates
from a local checkout. The scripts set it for you from `--templates-repo`; set
it by hand if you are running `course-sdk add-language` or `upgrade-language`
directly against unmerged templates.

Exit codes: `0` upgraded or already current, `1` failed, `3` templates behind.

## When it refuses

| Message                                                 | Meaning                                                                                                                                                                                                     |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| exit `3`, "language-templates is behind"                | Bump templates first, or re-run with `--update-templates`                                                                                                                                                   |
| "FROM tag has no version token equal to ..."            | This language's templates bump is not automatable. Run the support check; the course upgrade still works once templates are updated by hand                                                                 |
| "holds X, which is not the version being upgraded from" | The pin tracks a different tool and was left alone. Usually correct — Kotlin's `config.yml` holds a Gradle version, Haskell's holds a Stack version                                                         |
| "no Dockerfile for `<lang>`"                            | Course does not have this language yet; use `course-sdk add-language`                                                                                                                                       |
| Tests fail after a clean upgrade                        | Breaking API changes in the starter code. Nothing here fixes those; edit `starter_templates/<lang>/code/` and iterate as in [skills/adding-language-support](../../skills/adding-language-support/SKILL.md) |

A skipped pin is reported with its reason rather than passing silently, so read
the `[pin]` lines even on a successful run.

## Adding a pin

When the support check reports a file under "version pins not covered", a bump
would leave that file stale. Add a pattern to `MANIFEST_PINS` in
`version-pins.ts`, keyed by language slug:

```ts
zig: [{ pathGlob: "code/build.zig.zon", pattern: /^(\s*\.minimum_zig_version\s*=\s*")([\d.]+)(")/m }],
```

The pattern needs exactly three capture groups — prefix, version, suffix — and
paths are relative to the language root, which is `languages/<slug>/` in
language-templates and `starter_templates/<slug>/` in a course. A pin is only
rewritten when it currently holds the version being upgraded from, so nearby
versions belonging to other tools are safe.

Add a case to `version-pins.test.ts`, then re-run the support check to confirm
the file is no longer reported.

## Tests

```sh
bun test scripts/language-upgrade/
```
