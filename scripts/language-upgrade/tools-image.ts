// course-sdk lints courses with toolchain images it ships itself, so a course
// can be upgraded past the toolchain that checks it. "course-sdk lint" then
// runs cargo clippy against a Cargo.toml whose rust-version the active rustc
// cannot satisfy, and the course's PR goes red for a reason that lives in this
// repository rather than in the course.
//
// This only reports. Bumping is a separate decision, because the image has to
// be at least as new as the newest version across every course, so it does not
// belong to whichever course happened to trigger a given run.

import fs from "fs";
import path from "path";
import semver from "semver";

import { baseImageTag } from "./update-language-templates";

// Only the images whose version has to keep up with a course language.
// docker-tools tracks hadolint:latest-alpine, and js-tools runs prettier over
// Markdown, YAML and JS, so neither is coupled to a course language's version.
const TOOLS_IMAGES: Record<string, string> = {
  go: "go-tools.Dockerfile",
  rust: "rust-tools.Dockerfile",
};

export type ToolsImageReport =
  | { status: "not_coupled" }
  | { status: "current"; file: string; version: string }
  | { status: "behind"; file: string; version: string; target: string }
  | { status: "unknown"; file: string; reason: string };

export function courseSdkRoot(): string {
  return path.resolve(import.meta.dir, "..", "..");
}

// The tag holds more than a version: "rust:1.96-trixie", "golang:1.19-alpine".
// The leading numeric token is the language version in both, and these are the
// only two images this looks at.
function versionInTag(tag: string): string | null {
  const match = tag.match(/\d+(?:\.\d+)*/);

  return match ? match[0] : null;
}

export function checkToolsImage(languageSlug: string, targetVersion: string, sdkRoot = courseSdkRoot()): ToolsImageReport {
  const filename = TOOLS_IMAGES[languageSlug];

  if (!filename) {
    return { status: "not_coupled" };
  }

  const file = path.join("lib", "dockerfiles", filename);
  const absolutePath = path.join(sdkRoot, file);

  if (!fs.existsSync(absolutePath)) {
    return { status: "unknown", file: file, reason: "no such file" };
  }

  const tag = baseImageTag(fs.readFileSync(absolutePath, "utf8"));

  if (tag === null) {
    return { status: "unknown", file: file, reason: "no FROM line" };
  }

  const version = versionInTag(tag);

  if (version === null) {
    return { status: "unknown", file: file, reason: `FROM tag "${tag}" holds no version` };
  }

  const current = semver.coerce(version);
  const target = semver.coerce(targetVersion);

  if (current === null || target === null) {
    return { status: "unknown", file: file, reason: `cannot compare "${version}" with "${targetVersion}"` };
  }

  if (semver.gte(current, target)) {
    return { status: "current", file: file, version: version };
  }

  return { status: "behind", file: file, version: version, target: targetVersion };
}

// Written into the PR body, so it has to explain the problem to someone who
// did not run the upgrade and does not know this coupling exists.
export function describeToolsImage(report: ToolsImageReport, languageSlug: string): string | null {
  if (report.status !== "behind") {
    return null;
  }

  return [
    `course-sdk's \`${report.file}\` is on ${languageSlug} ${report.version}, older than the ${report.target} this upgrade moves to.`,
    `\`course-sdk lint\` runs inside that image, so it will fail here until the image is bumped on course-sdk's main branch.`,
    `That bump is deliberately not part of this PR: the image has to serve every course, not just this one.`,
  ].join(" ");
}
