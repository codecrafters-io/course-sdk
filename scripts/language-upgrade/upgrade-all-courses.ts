#!/usr/bin/env bun

// Plans a language upgrade across every course the dashboard tracks.
//
// language-templates has to already ship the dashboard's latest version.
// This script refuses otherwise: bump templates from the single-course
// action first, on one course, and merge that pull request. A course that
// is already current, does not ship the language, or already has an open
// upgrade pull request is reported and left alone.
//
//   bun scripts/language-upgrade/upgrade-all-courses.ts --language scala --templates-repo ../language-templates

import { Command, Option } from "commander";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import semver from "semver";

import Language from "../../lib/models/language";
import { DEFAULT_STATUS_JSON_URL } from "./resolve-versions";

// The courses language-dashboard tracks. Keep this in step with the choice
// list on Upgrade language version.
export const COURSE_REPOS = [
  "build-your-own-bittorrent",
  "build-your-own-claude-code",
  "build-your-own-dns-server",
  "build-your-own-git",
  "build-your-own-grep",
  "build-your-own-http-server",
  "build-your-own-interpreter",
  "build-your-own-kafka",
  "build-your-own-redis",
  "build-your-own-shell",
  "build-your-own-sqlite",
];

export type CourseSurvey = {
  repo: string;
  dockerfiles: string[];
  openUpgrade: boolean;
};

export type PlannedCourse = {
  repo: string;
  action: "upgrade" | "skip";
  reason: string;
};

type DashboardStatus = {
  languages: Record<string, { latest: string }>;
};

function coerce(version: string): semver.SemVer {
  const coerced = semver.coerce(version);

  if (coerced === null) {
    throw new Error(`Could not parse "${version}" as a version`);
  }

  return coerced;
}

export function coversLatest(version: string | null, latestVersion: string): boolean {
  return version !== null && semver.gte(coerce(version), coerce(latestVersion));
}

// "scala-3.8.Dockerfile" -> "3.8". Names for other buildpacks are ignored,
// and the highest remaining version wins.
export function latestDockerfileVersion(names: string[], buildpack: string): string | null {
  const prefix = `${buildpack}-`;
  const versions = names.flatMap((name) => {
    if (!name.startsWith(prefix) || !name.endsWith(".Dockerfile")) return [];

    return [name.slice(prefix.length, -".Dockerfile".length)];
  });

  if (versions.length === 0) return null;

  return versions.sort((a, b) => coerce(a).compare(coerce(b))).at(-1) ?? null;
}

export function latestTemplatesVersion(templatesRepoDir: string, languageSlug: string): string | null {
  const language = Language.findBySlug(languageSlug);
  const dockerfilesDir = path.join(templatesRepoDir, "languages", language.slug, "dockerfiles");

  if (!fs.existsSync(dockerfilesDir)) return null;

  return latestDockerfileVersion(fs.readdirSync(dockerfilesDir), language.buildpack);
}

export function templatesRejection(languageSlug: string, templatesVersion: string | null, latestVersion: string): string {
  const found = templatesVersion === null ? `no ${languageSlug} Dockerfiles` : `${languageSlug} ${templatesVersion}`;

  return [
    `language-templates does not have ${languageSlug} ${latestVersion} yet (${found}).`,
    `Run "Upgrade language version" on one course first, with "Also bump language-templates" checked.`,
    `Merge that language-templates pull request after the course looks right, then run this action.`,
  ].join(" ");
}

export function planCourses(languageSlug: string, latestVersion: string, templatesVersion: string | null, courses: CourseSurvey[]): PlannedCourse[] {
  if (!coversLatest(templatesVersion, latestVersion)) {
    throw new Error(templatesRejection(languageSlug, templatesVersion, latestVersion));
  }

  const language = Language.findBySlug(languageSlug);

  return courses.map((course) => {
    const version = latestDockerfileVersion(course.dockerfiles, language.buildpack);

    if (version === null) {
      return { repo: course.repo, action: "skip", reason: `does not ship ${language.slug}` };
    }

    if (coversLatest(version, latestVersion)) {
      return { repo: course.repo, action: "skip", reason: `already on ${language.slug} ${version}` };
    }

    if (course.openUpgrade) {
      return { repo: course.repo, action: "skip", reason: "an upgrade pull request is already open" };
    }

    return { repo: course.repo, action: "upgrade", reason: `${language.slug} ${version} -> ${latestVersion}` };
  });
}

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

function gh(args: string[]): string {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function isNotFound(error: unknown): boolean {
  const failed = error as { status?: number; stderr?: string };

  return failed.status === 1 && /Not Found/.test(failed.stderr ?? "");
}

function dockerfileNames(repo: string): string[] {
  try {
    return gh(["api", `repos/codecrafters-io/${repo}/contents/dockerfiles`, "--jq", ".[].name"])
      .split("\n")
      .filter((name) => name.length > 0);
  } catch (error) {
    if (isNotFound(error)) return [];

    throw error;
  }
}

function hasOpenUpgrade(repo: string, languageSlug: string): boolean {
  const names = gh([
    "pr",
    "list",
    "--repo",
    `codecrafters-io/${repo}`,
    "--state",
    "open",
    "--json",
    "headRefName",
    "--jq",
    ".[].headRefName",
  ])
    .split("\n")
    .filter((name) => name.length > 0);

  return names.some((name) => name.startsWith(`upgrade-${languageSlug}-`));
}

export function surveyCourses(languageSlug: string): CourseSurvey[] {
  return COURSE_REPOS.map((repo) => ({
    repo,
    dockerfiles: dockerfileNames(repo),
    openUpgrade: hasOpenUpgrade(repo, languageSlug),
  }));
}

export type UpgradePlan = {
  upgrade: string[];
  skipped: { repo: string; reason: string }[];
};

export function toUpgradePlan(courses: PlannedCourse[]): UpgradePlan {
  return {
    upgrade: courses.filter((course) => course.action === "upgrade").map((course) => course.repo),
    skipped: courses.filter((course) => course.action === "skip").map((course) => ({ repo: course.repo, reason: course.reason })),
  };
}

if (import.meta.main) {
  const program = new Command();

  program
    .name("upgrade-all-courses")
    .description("Plan a language upgrade for every course. Refuses when language-templates is behind.")
    .requiredOption("--language <slug>", "course-sdk language slug. Example: 'scala'")
    .requiredOption("--templates-repo <path>", "path to a language-templates checkout that already has the target version")
    .addOption(new Option("--status-json <location>", "URL or path to the language-dashboard status.json").default(DEFAULT_STATUS_JSON_URL))
    .action(async (options) => {
      const language = Language.findBySlug(options.language);
      const status = await loadDashboardStatus(options.statusJson);
      const languageStatus = status.languages[language.buildpack];

      if (!languageStatus) {
        throw new Error(
          `language-dashboard has no entry for buildpack "${language.buildpack}". Known buildpacks: ${Object.keys(status.languages).join(", ")}`,
        );
      }

      const templatesVersion = latestTemplatesVersion(options.templatesRepo, language.slug);
      const planned = planCourses(language.slug, languageStatus.latest, templatesVersion, surveyCourses(language.slug));
      const plan = toUpgradePlan(planned);

      for (const course of planned) {
        console.error(`${course.action} ${course.repo}: ${course.reason}`);
      }

      console.log(JSON.stringify(plan));
    });

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
