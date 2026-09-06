# Language version upgrades

Scripts for moving a course, and the shared templates it draws from, onto a
newer version of a language.

```
resolve-versions.ts           what version is the course on, the templates on, and the latest
update-language-templates.ts  bump language-templates for one language
upgrade-course-language.ts    apply a language version to one course
check-language-support.ts     which languages can be upgraded unattended
version-pins.ts               shared: rewrite the version wherever it is pinned
```

## Upgrading a course

```sh
bun scripts/language-upgrade/upgrade-course-language.ts \
  --course-dir ../build-your-own-redis --language go
```

If `language-templates` is behind too, this refuses with exit code 3 and prints
the two ways forward: bump the templates on their own, or re-run with
`--update-templates` to chain both.

Bumping the templates is a one-off per language version, not something each
course does. Every course tends to sit on the same version at once, so eleven
courses discovering Go 1.27 would otherwise open eleven identical
`language-templates` pull requests. One course bumps the shared template; the
rest pick it up once it merges.

Because `language-templates` has no CI and a Dockerfile cannot be built in
isolation, the templates bump is never validated on its own. Running it through
a course is the validation, so pass `--templates-repo` pointing at the checkout
holding the unmerged bump.

Exit codes: `0` upgraded or nothing to do, `1` failed, `3` templates are behind.

## Languages that cannot be upgraded unattended

Roughly half of them, today. This is fine, and the scripts refuse loudly rather
than producing a plausible-looking but broken change.

Run the check rather than trusting the list below, which is a snapshot:

```sh
bun scripts/language-upgrade/check-language-support.ts --templates-repo ../language-templates
```

It reads the templates as they are now, and answers using the same rule the
bump enforces, so the two cannot drift apart.

As of Go 1.26 / Node 25 / Rust 1.96, twelve languages upgrade cleanly:

> csharp, go, haskell, java, javascript, ocaml, php, python, ruby, rust, swift,
> typescript

and eleven need a human. The upgrade turns on rewriting the version in the base
image tag, so what these have in common is that the tag does not carry the
language's version.

### The version lives somewhere other than the FROM tag

| Language | Base image                           | Where the version actually is                        |
| -------- | ------------------------------------ | ---------------------------------------------------- |
| ada      | `gcc:15.2.0-trixie`                  | `ENV ALIRE_VERSION=2.1.1`                            |
| kotlin   | `gradle:jdk24-alpine`                | a GitHub release URL, `kotlin-compiler-2.3.20.zip`   |
| odin     | `silkeh/clang:21-trixie`             | a git branch, `dev-2026-04`                          |
| zig      | `debian:trixie`                      | a download URL in a `RUN` step                       |
| scala    | `eclipse-temurin:25-jdk-alpine-3.23` | nowhere; scala-cli is fetched from `releases/latest` |

Ada is the closest to workable, since the version is at least present verbatim
as an env var. Kotlin and Odin also spell theirs out, but in formats that do not
match the Dockerfile name (`2.3.20` against `kotlin-2.3`, `dev-2026-04` against
`odin-2026.4`). Scala pins nothing, so there is no version to rewrite.

### The number in the filename is not a tool version

| Language | Base image                    | What the number means        | Where it lives                           |
| -------- | ----------------------------- | ---------------------------- | ---------------------------------------- |
| c        | `gcc:15.2.0-trixie`           | C23, the language standard   | `CMAKE_C_STANDARD` in `CMakeLists.txt`   |
| cpp      | `gcc:15.2.0-trixie`           | C++23, the language standard | `CMAKE_CXX_STANDARD` in `CMakeLists.txt` |
| clojure  | `clojure:tools-deps-bookworm` | a library version            | `org.clojure/clojure` in `deps.edn`      |

Upgrading these means something different from bumping an image, so they are out
of scope rather than unimplemented. The check reports these files under "version
also appears in", which is where an upgrade would have to happen instead.

### The registry tag is more precise than the Dockerfile name

| Language | Dockerfile    | Base image                                       |
| -------- | ------------- | ------------------------------------------------ |
| dart     | `dart-3.11`   | `dart:3.11.0`                                    |
| elixir   | `elixir-1.19` | `elixir:1.19.5-alpine`                           |
| gleam    | `gleam-1.16`  | `ghcr.io/gleam-lang/gleam:v1.16.0-erlang-alpine` |

These refuse on purpose. Only whole version tokens are replaced, so bumping
Elixir 1.19 to 1.20 will not turn `1.19.5` into `1.20.5` and invent a release
that need not exist.

This is the group most worth fixing. It needs a registry lookup to turn "the
latest 1.20.x" into a tag that exists, which nothing here does yet.

## Version pins

A version is rarely in one place. Bumping Go means the Dockerfile tag,
`config.yml`'s `required_executable`, and `go.mod`'s `go` directive; Java means
three separate properties in `pom.xml`.

Rewriting every version-shaped string would break things, because plenty of
nearby values track something else entirely:

| Where                     | Value                        | What it actually is                     |
| ------------------------- | ---------------------------- | --------------------------------------- |
| kotlin `config.yml`       | `gradle (9.4.1)`             | Gradle, not Kotlin 2.3                  |
| haskell `config.yml`      | `stack (24.33)`              | Stack, not GHC 9.10                     |
| haskell `stack.yaml`      | `resolver: lts-24.33`        | the Stackage snapshot                   |
| kotlin `build.gradle.kts` | `JavaLanguageVersion.of(24)` | the Java toolchain                      |
| rust `Cargo.toml`         | `edition = "2024"`           | the edition                             |
| java `pom.xml`            | `<version>1.0</version>`     | the project's own version               |
| gleam `config.yml`        | `gleam (1.14.0)`             | already out of sync with its Dockerfile |

So a pin is only rewritten when it currently holds the version being upgraded
_from_. Everything above fails that check and is reported as skipped, with the
reason, rather than passing silently.

Lockfiles are left alone deliberately. Regenerating one belongs to its tool, not
to a regex.

`check-language-support.ts` also reports files under `code/` that mention the
current version but that no pin covers, which is how `.python-version` and
`Package.swift` were found. Every automatable language is currently clean, so a
new entry there means a bump would leave something stale.

## Adding support for a language

1. Run the check to see what is blocking it.
2. If the blocker is a version outside the FROM tag, that needs new handling in
   `update-language-templates.ts`.
3. If the check reports unpinned files, add patterns to `MANIFEST_PINS` in
   `version-pins.ts` and a test alongside the others.
