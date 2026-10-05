#!/usr/bin/env bun

// Bumps language-templates to the latest version of one language, in a local
// checkout. Mirrors the shape of the version bumps already in that repo's
// history (see 6eb9b89, Go 1.25 to 1.26).
//
// This deliberately does not validate the result. language-templates has no CI
// and no way to build a Dockerfile in isolation; the real check is running it
// through a course, which upgrade-course-language.ts does next.
//
//   bun scripts/language-upgrade/update-language-templates.ts --templates-repo ../language-templates --language go

import { Command, Option } from "commander";
import ansiColors from "ansi-colors";
import fs from "fs";
import path from "path";
import semver from "semver";
import { glob } from "glob";

import Dockerfile from "../../lib/models/dockerfile";
import Language from "../../lib/models/language";
import ShellCommandExecutor from "../../lib/shell-command-executor";
import { applyVersionPins } from "./version-pins";

const DEFAULT_STATUS_JSON_URL = "https://raw.githubusercontent.com/codecrafters-io/language-dashboard/main/status.json";

type DashboardStatus = {
  generated_at: string;
  languages: Record<string, { latest: string; released_at: string }>;
};

export type TemplatesUpdate = {
  language: string;
  buildpack: string;
  fromVersion: string;
  toVersion: string;
  dockerfileFrom: string;
  dockerfileTo: string;
  baseImageFrom: string;
  baseImageTo: string;
  pinsUpdated: string[];
  pinsSkipped: string[];
};

async function loadDashboardStatus(location: string): Promise<DashboardStatus> {
  if (location.startsWith("http://") || location.startsWith("https://")) {
    const response = await fetch(location);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${location}. Status: ${response.status}`);
    }

    return (await response.json()) as DashboardStatus;
  }

  return JSON.parse(fs.readFileSync(location, "utf8")) as DashboardStatus;
}

export function dockerfileVersion(dockerfile: Dockerfile): string {
  return dockerfile.buildpackWithVersion.substring(dockerfile.buildpack.length + 1);
}

function renderAtSamePrecision(newVersion: string, reference: string): string {
  const coerced = semver.coerce(newVersion);

  if (coerced === null) {
    throw new Error(`Could not parse "${newVersion}" as a version`);
  }

  const componentCount = Math.min(reference.split(".").length, 3);

  return [coerced.major, coerced.minor, coerced.patch].slice(0, componentCount).join(".");
}

// language-templates keeps exactly one Dockerfile per language, unlike course
// repos which accumulate every version. So this is a rename, not an addition.
export function currentDockerfile(languageRootDir: string): Dockerfile {
  const dockerfilePaths = glob.sync(path.join(languageRootDir, "dockerfiles", "*.Dockerfile"));

  if (dockerfilePaths.length === 0) {
    throw new Error(`No Dockerfiles found in ${path.join(languageRootDir, "dockerfiles")}`);
  }

  return dockerfilePaths.map((dockerfilePath) => new Dockerfile(dockerfilePath)).sort((a, b) => b.semver.compare(a.semver))[0];
}

// Rewrites the version in the FROM line's image tag, leaving the rest of the
// tag intact so suffixes like "-alpine" and "-trixie" survive.
//
// Only a whole version token is replaced, never a substring. Plain substring
// replacement looks fine on "golang:1.26-alpine" but fabricates images
// elsewhere: bumping elixir 1.19 to 1.20 against "elixir:1.19.5-alpine" would
// produce "elixir:1.20.5", a tag that need not exist. Those cases refuse
// instead, and so do base images that track something else entirely
// ("gradle:jdk24-alpine" for Kotlin, "debian:trixie" for Zig). Scala's JDK is
// the one image that is safe to leave unchanged; planBaseImageChange does that.
const FROM_LINE_PATTERN = /^(FROM\s+\S+?:)(\S+)$/m;

export function baseImageTag(contents: string): string | null {
  const match = contents.match(FROM_LINE_PATTERN);

  return match ? match[2] : null;
}

// Matches the version, and also any more precise form of it: for a Dockerfile
// named zig-0.16 this finds "0.16" and "0.16.0", but not "0.161" or "10.16".
//
// The more precise form is the point. Zig's build.zig.zon pins
// ".minimum_zig_version = 0.16.0", and an exact-only match missed it, which is
// the same precision trap that makes Docker tags like "elixir:1.19.5" refuse.
export function versionMentionPattern(version: string): RegExp {
  return new RegExp(`(?<![\\d.])${version.replace(/\./g, "\\.")}(?:\\.\\d+)*(?![\\d.])`);
}

// Images that do not encode the language version. A bump renames the
// Dockerfile and rewrites pins, and leaves the FROM line alone.
//
// Scala ships on a JDK (`eclipse-temurin:25-jdk-alpine-3.23`). scala-cli
// downloads the compiler at build time from `--scala-version` in compile.sh.
// Nothing in the Dockerfile changes between 3.8 and 3.9.
//
// Membership is not enough on its own. planBaseImageChange still refuses when
// the Dockerfile mentions the version anywhere, so a later edit that installs
// a specific Scala into the image falls back to the normal refusal instead of
// quietly keeping the old compiler under a new filename.
const BASE_IMAGES_WITHOUT_LANGUAGE_VERSION = new Set(["scala"]);

function keepsUnchangedBaseImage(languageSlug: string, contents: string, version: string): boolean {
  if (!BASE_IMAGES_WITHOUT_LANGUAGE_VERSION.has(languageSlug)) {
    return false;
  }

  if (baseImageTag(contents) === null) {
    return false;
  }

  return !versionMentionPattern(version).test(contents);
}

// Locates the version inside an image tag, or explains why it cannot.
// check-language-support calls planBaseImageChange, which uses this, so the
// support matrix is the same decision the bump enforces.
export function locateVersionToken(tag: string, version: string): { index: number } | { error: string } {
  const versionTokens = [...tag.matchAll(/\d+(?:\.\d+)*/g)];
  const exactMatches = versionTokens.filter((token) => token[0] === version);

  if (exactMatches.length === 0) {
    const found = versionTokens.map((token) => token[0]).join(", ") || "none";

    return {
      error:
        `tag "${tag}" has no version token equal to "${version}" (found: ${found}). ` +
        `Refusing to guess, since a partial match would invent a tag that may not exist.`,
    };
  }

  if (exactMatches.length > 1) {
    return { error: `tag "${tag}" has "${version}" in more than one place, so the right one is ambiguous` };
  }

  return { index: exactMatches[0].index! };
}

export function bumpBaseImage(
  contents: string,
  fromVersion: string,
  toVersion: string,
): { contents: string; before: string; after: string } {
  const existingTag = baseImageTag(contents);

  if (existingTag === null) {
    throw new Error("Could not find a FROM line with a tagged image in the Dockerfile");
  }

  const located = locateVersionToken(existingTag, fromVersion);

  if ("error" in located) {
    throw new Error(`FROM ${located.error}`);
  }

  const newTag = existingTag.slice(0, located.index) + toVersion + existingTag.slice(located.index + fromVersion.length);

  return {
    contents: contents.replace(FROM_LINE_PATTERN, `$1${newTag}`),
    before: existingTag,
    after: newTag,
  };
}

// Like bumpBaseImage, but languages in BASE_IMAGES_WITHOUT_LANGUAGE_VERSION
// keep their tag when the Dockerfile does not mention the version at all.
export function planBaseImageChange(
  contents: string,
  fromVersion: string,
  toVersion: string,
  languageSlug: string,
): { contents: string; before: string; after: string } | { error: string } {
  if (keepsUnchangedBaseImage(languageSlug, contents, fromVersion)) {
    const tag = baseImageTag(contents)!;

    return { contents: contents, before: tag, after: tag };
  }

  try {
    return bumpBaseImage(contents, fromVersion, toVersion);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function updateLanguageTemplates(
  templatesRepoDir: string,
  languageSlug: string,
  statusJsonLocation: string,
): Promise<TemplatesUpdate | null> {
  const language = Language.findBySlug(languageSlug);
  const buildpack = language.buildpack;
  const languageRootDir = path.join(templatesRepoDir, "languages", language.slug);

  if (!fs.existsSync(languageRootDir)) {
    throw new Error(`${languageRootDir} does not exist`);
  }

  const status = await loadDashboardStatus(statusJsonLocation);
  const languageStatus = status.languages[buildpack];

  if (!languageStatus) {
    throw new Error(`language-dashboard has no entry for buildpack "${buildpack}"`);
  }

  const dockerfile = currentDockerfile(languageRootDir);
  const fromVersion = dockerfileVersion(dockerfile);
  const latestVersion = languageStatus.latest;

  if (semver.gte(semver.coerce(fromVersion)!, semver.coerce(latestVersion)!)) {
    console.log(`${language.slug} templates are already at ${fromVersion}, nothing to do`);
    return null;
  }

  const toVersion = renderAtSamePrecision(latestVersion, fromVersion);
  const dockerfileTo = path.join("languages", language.slug, "dockerfiles", `${buildpack}-${toVersion}.Dockerfile`);
  const dockerfileFrom = path.relative(templatesRepoDir, dockerfile.path);

  const planned = planBaseImageChange(dockerfile.contents, fromVersion, toVersion, language.slug);

  if ("error" in planned) {
    throw new Error(planned.error);
  }

  // git mv so the rename is recorded, matching how bumps look in this repo's
  // history rather than showing up as a delete plus an add.
  await ShellCommandExecutor.execute(`git -C ${templatesRepoDir} mv ${dockerfileFrom} ${dockerfileTo}`, {
    prefix: ansiColors.yellow("[git] "),
    shouldLogCommand: true,
  });

  fs.writeFileSync(path.join(templatesRepoDir, dockerfileTo), planned.contents);

  const pinOutcomes = applyVersionPins(languageRootDir, language.slug, fromVersion, toVersion);

  for (const outcome of pinOutcomes) {
    if (outcome.status === "updated") {
      console.log(`${ansiColors.yellow("[pin]")} ${outcome.path}: ${outcome.before} -> ${outcome.after}`);
    } else if (outcome.status === "skipped") {
      console.log(`${ansiColors.yellow("[pin]")} ${outcome.path}: skipped, ${outcome.reason}`);
    }
  }

  return {
    language: language.slug,
    buildpack: buildpack,
    fromVersion: fromVersion,
    toVersion: toVersion,
    dockerfileFrom: dockerfileFrom,
    dockerfileTo: dockerfileTo,
    baseImageFrom: planned.before,
    baseImageTo: planned.after,
    pinsUpdated: pinOutcomes.filter((o) => o.status === "updated").map((o) => o.path),
    pinsSkipped: pinOutcomes.filter((o) => o.status === "skipped").map((o) => `${o.path} (${o.reason})`),
  };
}

if (import.meta.main) {
  const program = new Command();

  program
    .name("update-language-templates")
    .description("Bump language-templates to the latest version of a language")
    .requiredOption("--templates-repo <path>", "path to a language-templates checkout")
    .requiredOption("--language <slug>", "course-sdk language slug. Example: 'go'")
    .addOption(new Option("--status-json <location>", "URL or path to the language-dashboard status.json").default(DEFAULT_STATUS_JSON_URL))
    .action(async (options) => {
      const update = await updateLanguageTemplates(options.templatesRepo, options.language, options.statusJson);

      console.log("");
      console.log(JSON.stringify(update, null, 2));
    });

  await program.parseAsync(process.argv);
}
