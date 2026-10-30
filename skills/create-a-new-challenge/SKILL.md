---
name: Create a New Challenge
description: Create a new CodeCrafters course and its tester up through course-definition.yml, the copied repos, and a stub harness. Use when starting a challenge, scaffolding build-your-own-<course> and <course>-tester, or writing the course description and marketing. Stage prose, stage tests, fixtures, solutions, and hints are out of scope.
compatibility: Requires an existing course repo and tester repo to copy (build-your-own-git and git-tester), empty destination git repos, and a Go toolchain for the tester skeleton.
---

# Goal

Take a challenge from a name to two repos that agree on slugs, with catalog copy that matches the other courses, and a tester that loads.

Stop when `TestStagesMatchYAML` passes. Do not write stage prose, stage behavior, a reference runtime, or fixtures.

# What you're producing

| Repo | Artifact |
| --- | --- |
| `build-your-own-<course>` | `course-definition.yml` |
| `build-your-own-<course>` | Copied layout: `LICENSE`, `Makefile`, `.gitignore`, `.github/workflows/test.yml`, `post-diffs-in-pr.yml`, `dockerfiles/` for the languages you ship, `starter_templates/` for those languages plus `all`, `README.md` |
| `<course>-tester` | Go module, `cmd/tester`, `internal/tester_definition.go`, stub stage funcs, `tester_definition_test.go`, `internal/test_helpers/course_definition.yml`, `internal/test_helpers/pass_all/` |
| `<course>-tester` | `Makefile` whose `test` runs `go test ./internal/...` and whose `copy_course_file` copies the sibling course YAML from the working tree |

Leave out course-specific scripts from the source repo (git's "git is unavailable" workflow does not belong on a new course). Do not copy git's `compiled_starters/` or `solutions/`. Generate this course's own with `course-sdk compile` in phase 4.

Base stages in the YAML have no `primary_extension_slug`. Leave the `extensions:` block out of `course-definition.yml`. Core rejects the course definition update with `Validation failed: Extension <slug> has no stages` for any extension that has no stages yet, so an extension enters the YAML in the same change as its stages.

# Phase 1 — Name the course

Write the last thing the learner's program can do, in one paragraph, before any file. The course `name` is that promise.

If the name claims a product and the base only builds one piece of it, rename. "Build your own Docker" promises a daemon, `docker build`, and `docker ps`. A program that only runs an OCI bundle is "Build your own Docker runtime".

Pick the folder names and the `slug` together. The slug is the URL (`docker-runtime`). The folders follow the existing pair: `build-your-own-<course>` and `<course>-tester`. They do not have to equal the slug.

# Phase 2 — Copy the repos

Copy `build-your-own-git` and `git-tester` into the empty destination repos. Edit in place. One commit for that scaffold, when the user asks for a commit.

Strip every language you are not shipping, from `languages:`, `dockerfiles/`, and `starter_templates/`. Point starters at the new module path and binary name. The executable the tester invokes is `your_program.sh`.

Do not install the real program you will test against (runc, redis-server, claude) into the learner Dockerfiles.

Every starter's main file needs the line `You can use print statements as follows for debugging, they'll be visible when running tests.` as a comment directly above its debug print. `course-sdk compile` builds each language's first-stage solution by finding that line, and it stops with `Didn't find a line that matches /You can use print/` in any language where it's missing. Check every language: the tokenizer course's TypeScript starter was the one that left it out.

If the stages give the program JSON files to read, add a JSON library to every starter whose standard library has none, as `build-your-own-claude-code` does. Add `serde_json` to Rust's `Cargo.toml` and run `cargo fetch` to add it to `Cargo.lock` without bumping other crates. Add Gson to Java's `pom.xml`. For C++, add `nlohmann-json` to `vcpkg.json`, then `find_package(nlohmann_json CONFIG REQUIRED)` and `target_link_libraries(<binary> PRIVATE nlohmann_json::nlohmann_json)` to `CMakeLists.txt`. Python, Go, and TypeScript already have JSON. Parsing JSON by hand is busywork unrelated to the challenge.

If the tester runs the learner's program from a temporary directory (`executable.WorkingDir`), copy the Python `.codecrafters/run.sh` from `build-your-own-shell`. It passes `--project` and `PYTHONPATH` relative to the script. git's version runs `uv run -m app.main` from the current directory and fails with `No module named 'app'`.

# Phase 3 — course-definition.yml

Read `schemas/course-definition.json` and one live course (`build-your-own-redis` or `build-your-own-git`) before writing. Match their shape.

Set `release_status: alpha` on the course and on each language. `completion_percentage: 5`. `testimonials: []`. Leave `concept_slugs` out until you have a real catalog slug. Leave `tester_source_code_url` out.

**Never invent stage slugs.** Ask for them. Assign in order. Keep unused ones in a comment at the top of the file.

```yaml
# Unallocated slugs, in order, for later extension stages:
# lo6 gd9 iu2
```

A second commit, when asked, is the slug assignment. Renames of `stage_descriptions/` belong in that commit if the files already exist. `git add -A` so the renames are recorded.

## Description

`description_md` is 25–50 words, two paragraphs:

> X is \<what it is\>. In this challenge, you'll build your own X that's capable of A, B, and C.
>
> Along the way, you'll learn about D, E, and more.

Name capabilities the base actually has. Do not list extension work in paragraph one.

`short_description_md` is plain text, under 70 characters:

> Learn about D, E, and more

## Marketing

`marketing.difficulty` is `easy`, `medium`, or `hard`.

`sample_extension_idea_title` is a short name. `sample_extension_idea_description` is one sentence in the git shape: "A \<product\> that can \<verb\>."

`frequently_asked_questions` is these four questions, in this order:

1. What exactly will I build?
2. What exactly will I learn?
3. Why should I build such a project?
4. What are the prerequisites for this challenge?

"What will I build?" is the base, then one line on what that base can already do, then a short list of later extensions, then "At the end, you'll have a GitHub repo to show off."

Attach each capability to the operation that delivers it, in words a newcomer can check. "Decode those IDs back to text, including text that matches GPT-2" read as nonsense, because matching GPT-2 is an encoding property. The fix named the stage and the result: "In the last stage, your program loads GPT-2's vocabulary files and produces the same token IDs as GPT-2."

"What will I learn?" says "In the first N stages" with the real base count. Prerequisites name the languages you actually ship. Close prerequisites with the two sentences the other courses use: curiosity and persistence, and that this is not a follow-along tutorial.

## Extensions

Planned extensions live in core, in `data/course_extension_ideas.yml`, as entries with `slug: "<course>-<idea>"`, `course_slug`, `development_status: "not_started"`, `name`, and `description_markdown`. That file feeds the extension-idea voting page. Its sync raises `Course not found` when the course record does not exist yet, so add the entries after the course is created in core. The tokenizer course first put four description-only extensions in `course-definition.yml`, and core refused to apply the update.

Each `description_markdown` is two sentences, about 28–44 words. Link the spec. End the second sentence with "and more".

> In this challenge extension you'll \<verb\> [\<feature\>](\<spec\>) \<to your implementation\>.
>
> Along the way you'll learn about A, B, and more.

## Stage blurbs

`marketing_md` is one or two sentences starting "In this stage, you'll …". It is the overview line, not the stage description. No `primary_extension_slug` on base stages. Once stage descriptions exist, `marketing_md` is the description's hook word for word. Edit both together, and copy the YAML to the tester afterwards.

# Phase 4 — Tester harness

The harness is the skeleton that makes the YAML load. It is not the tests.

- Module `github.com/codecrafters-io/<course>-tester`, `tester-utils` at the version git-tester uses, then `go mod tidy`.
- `ExecutableFileName: "your_program.sh"`. No `LegacyExecutableFileName` unless you are replacing an old course.
- One `TestFunc` per stage slug. The func logs and returns "this stage is not implemented yet".
- `TestStagesMatchYAML` against `internal/test_helpers/course_definition.yml`.
- Copy that YAML from the sibling working tree. `make copy_course_file` in an existing tester fetches GitHub `main` and will wipe local edits. Point this course's target at the sibling path, and use it only after the course file is the one you want copied.
- `internal/test_helpers/pass_all/your_program.sh` forwards to the real program, the way git forwards to `git` and claude-code forwards to `claude`. `codecrafters.yml` with `debug: true` sits next to it. Every directory a later fixture test uses as `CODECRAFTERS_REPOSITORY_DIR` needs that file, or the tester exits before your stage runs.
- `Makefile` `test` is `go test -v ./internal/...`. `./internal/` alone skips packages under it.
- Copy git-tester's `test.sh` (`exec "${TESTER_DIR}/tester"`, mode 755) to the tester root. `main.goreleaser.yml` packs it into every release, and course-sdk runs it to start the tester.
- Publish a release before the course's CI can go green. The course's per-language `test` jobs download `codecrafters-io/<slug>-tester` from its latest GitHub release, and with no release they fail with `Failed to fetch latest tester version. Status: 404`. `publish.yml` builds the release when you push a `v*` tag. Start at `v1`.

```sh
go test -count=1 ./internal/ -run TestStagesMatchYAML
```

Run `course-sdk compile` in the course repo once stage 1 has its slug. It needs Docker running, because README postprocessing builds a `js-tools` image. Commit what it writes to `compiled_starters/` and `solutions/<lang>/01-<slug>/`. The course's `verify_templates_compiled` CI job reruns the compile and fails on any diff or on untracked files under `compiled_starters/`. Those first-stage solutions are generated from the starters. Hand-written solutions for later stages still belong to **Add Stage Hints and Solutions**.

```sh
course-sdk compile && git status --short compiled_starters solutions
```

`pass_all` is how you later check the tests against the real program. It is not the fixture oracle. If the course adds a field the real program does not print, `pass_all` will fail that stage. Record that and move on. Do not weaken the course so the oracle goes green, and do not start the reference runtime in this skill.

# Phase 5 — Commits

Only when the user asks. Two commits, in this order:

1. Scaffold after the copy and the edits that make it this course.
2. Slug assignment, once the user supplies slugs.

Do not put stage implementation into either commit.

# Stop

This skill is finished when:

- both repos exist and `TestStagesMatchYAML` passes
- `course-sdk compile` succeeds and leaves no uncommitted changes
- the description, short description, FAQs, and sample extension match the shapes above
- `course-definition.yml` has no `extensions:` block, and planned extensions are written as core extension ideas
- you have told the user that stage work has not started

Do not do any of the following here:

- `stage_descriptions/*.md` prose
- stage test bodies, bundles, probes, or a reference runtime
- `stages_test.go` fixtures
- hand-written `solutions/` past the generated first stage, or hints

## Who writes the base stages

**Author a Course Extension** writes them. Use it for the base course as well as for extensions. The base-course exceptions, which that skill does not repeat, are:

- filenames are `stage_descriptions/base-NN-<slug>.md`, numbered within the base
- stage YAML has no `primary_extension_slug`
- the reference lives at `internal/test_helpers/scenarios/base/`
- register timeouts in `tester_definition.go` when a stage waits

**Add Stage Hints and Solutions** owns per-language solutions and hints. An extension still ships without them. A base course does not.

Do not add a stage-implementation phase to this skill. The handoff above is the end.
