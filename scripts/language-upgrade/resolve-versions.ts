#!/usr/bin/env bun

// Decides whether a course needs a language version upgrade, and if so, which
// path the upgrade takes. Everything downstream keys off the "mode" it emits.
//
//   bun scripts/language-upgrade/resolve-versions.ts --course-dir courses/build-your-own-redis --language go

import { Command, Option } from "commander";
import fs from "fs";
import path from "path";
import semver from "semver";
import { glob } from "glob";

import Course from "../../lib/models/course";
import Dockerfile from "../../lib/models/dockerfile";
import GlobalLanguageTemplatesDownloader from "../../lib/global-language-templates-downloader";
import Language from "../../lib/models/language";

const DEFAULT_STATUS_JSON_URL = "https://raw.githubusercontent.com/codecrafters-io/language-dashboard/main/status.json";

// "up_to_date": nothing to do.
// "path_a": language-templates already ships the target version, so
//   `course-sdk upgrade-language` can pull it in.
// "path_b": language-templates is behind too, so the course repo forks its own
//   newest Dockerfile and the change is backported to language-templates after.
export type Mode = "up_to_date" | "path_a" | "path_b";

type LanguageStatus = {
  latest: string;
  released_at: string;
};

type DashboardStatus = {
  generated_at: string;
  languages: Record<string, LanguageStatus>;
};

export type Resolution = {
  course: string;
  courseRepo: string;
  language: string;
  buildpack: string;
  mode: Mode;
  latestVersion: string;
  releasedAt: string;
  courseVersion: string;
  templatesVersion: string;
  targetVersion: string;
  baseDockerfile: string;
  targetDockerfile: string;
  targetDockerfileExists: boolean;
  templatesDockerfile: string;
  templatesTargetDockerfile: string;
  dashboardGeneratedAt: string;
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

// Dockerfile#semver strips the language slug rather than the buildpack, which
// leaves "nodejs-" and "dotnet-" prefixes on the string it coerces. Read the
// version straight off the filename instead.
function dockerfileVersion(dockerfile: Dockerfile): string {
  return dockerfile.buildpackWithVersion.substring(dockerfile.buildpack.length + 1);
}

function coerce(version: string): semver.SemVer {
  const coerced = semver.coerce(version);

  if (coerced === null) {
    throw new Error(`Could not parse "${version}" as a version`);
  }

  return coerced;
}

// How many components a Dockerfile name carries varies by language: "nodejs-25"
// and "java-25" use one, "go-1.26" and "dotnet-10.0" use two. The dashboard
// always reports major.minor, so match whatever the existing file already does
// rather than imposing a format.
function matchVersionPrecision(version: string, reference: string): string {
  const componentCount = Math.min(reference.split(".").length, 3);
  const coerced = coerce(version);

  return [coerced.major, coerced.minor, coerced.patch].slice(0, componentCount).join(".");
}

// The downloader hands back the languages/<slug> directory; we want the repo
// root so that emitted paths are relative to it.
async function downloadTemplatesRepo(language: Language): Promise<string> {
  const languageDir = await new GlobalLanguageTemplatesDownloader(language).download();

  return path.resolve(languageDir, "..", "..");
}

function latestTemplatesDockerfile(templatesRepoDir: string, language: Language): Dockerfile {
  const dockerfilesDir = path.join(templatesRepoDir, "languages", language.slug, "dockerfiles");
  const dockerfilePaths = glob.sync(path.join(dockerfilesDir, "*.Dockerfile"));

  if (dockerfilePaths.length === 0) {
    throw new Error(`No Dockerfiles found in ${dockerfilesDir}`);
  }

  return dockerfilePaths.map((dockerfilePath) => new Dockerfile(dockerfilePath)).sort((a, b) => b.semver.compare(a.semver))[0];
}

export async function resolve(
  courseDir: string,
  languageSlug: string,
  statusJsonLocation: string,
  templatesRepoDir?: string,
): Promise<Resolution> {
  const course = Course.loadFromDirectory(courseDir);
  const language = Language.findBySlug(languageSlug);
  const buildpack = language.buildpack;

  const status = await loadDashboardStatus(statusJsonLocation);
  const languageStatus = status.languages[buildpack];

  if (!languageStatus) {
    throw new Error(
      `language-dashboard has no entry for buildpack "${buildpack}". Known buildpacks: ${Object.keys(status.languages).join(", ")}`,
    );
  }

  const courseDockerfile = course.latestDockerfileForLanguage(language);

  if (!courseDockerfile) {
    throw new Error(`${course.slug} has no Dockerfile for ${language.slug}. Use "course-sdk add-language" instead.`);
  }

  // language-templates keeps exactly one Dockerfile per language, so this is
  // the version it currently supports.
  const resolvedTemplatesRepoDir = templatesRepoDir || (await downloadTemplatesRepo(language));
  const templatesDockerfile = latestTemplatesDockerfile(resolvedTemplatesRepoDir, language);

  const latestVersion = languageStatus.latest;
  const courseVersion = dockerfileVersion(courseDockerfile);
  const templatesVersion = dockerfileVersion(templatesDockerfile);

  let mode: Mode;

  if (semver.gte(coerce(courseVersion), coerce(latestVersion))) {
    mode = "up_to_date";
  } else if (semver.gte(coerce(templatesVersion), coerce(latestVersion))) {
    mode = "path_a";
  } else {
    mode = "path_b";
  }

  const targetVersion = matchVersionPrecision(latestVersion, courseVersion);
  const templatesTargetVersion = matchVersionPrecision(latestVersion, templatesVersion);

  const targetDockerfile = path.join("dockerfiles", `${buildpack}-${targetVersion}.Dockerfile`);

  return {
    course: course.slug,
    courseRepo: `build-your-own-${course.slug}`,
    language: language.slug,
    buildpack: buildpack,
    mode: mode,
    latestVersion: latestVersion,
    releasedAt: languageStatus.released_at,
    courseVersion: courseVersion,
    templatesVersion: templatesVersion,
    targetVersion: targetVersion,
    baseDockerfile: path.relative(course.directory, courseDockerfile.path),
    targetDockerfile: targetDockerfile,
    targetDockerfileExists: fs.existsSync(path.join(course.directory, targetDockerfile)),
    templatesDockerfile: path.relative(resolvedTemplatesRepoDir, templatesDockerfile.path),
    templatesTargetDockerfile: path.join("languages", language.slug, "dockerfiles", `${buildpack}-${templatesTargetVersion}.Dockerfile`),
    dashboardGeneratedAt: status.generated_at,
  };
}

export { DEFAULT_STATUS_JSON_URL };

if (import.meta.main) {
  const program = new Command();

  program
    .name("resolve-versions")
    .description("Resolve which language version upgrade a course needs, if any")
    .requiredOption("--course-dir <path>", "path to the course repository checkout")
    .requiredOption("--language <slug>", "course-sdk language slug. Example: 'go'")
    .addOption(new Option("--status-json <location>", "URL or path to the language-dashboard status.json").default(DEFAULT_STATUS_JSON_URL))
    .addOption(new Option("--templates-repo <path>", "path to a language-templates checkout. Defaults to cloning it"))
    .action(async (options) => {
      const resolution = await resolve(options.courseDir, options.language, options.statusJson, options.templatesRepo);

      console.log(JSON.stringify(resolution, null, 2));
    });

  await program.parseAsync(process.argv);
}
