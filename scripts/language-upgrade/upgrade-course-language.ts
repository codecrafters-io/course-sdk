#!/usr/bin/env bun

// Upgrades one course to the latest version of one language.
//
// The templates bump is a separate operation (update-language-templates.ts).
// This script checks for it and refuses to run when language-templates is
// still behind, rather than quietly doing something different. Passing
// --update-templates chains the two.
//
//   bun scripts/language-upgrade/upgrade-course-language.ts --course-dir ../build-your-own-redis --language go
//   bun scripts/language-upgrade/upgrade-course-language.ts --course-dir ../build-your-own-redis --language go --update-templates

import { Command, Option } from "commander";
import ansiColors from "ansi-colors";
import fs from "fs";
import path from "path";

import Course from "../../lib/models/course";
import Language from "../../lib/models/language";
import ShellCommandExecutor from "../../lib/shell-command-executor";
import { DEFAULT_STATUS_JSON_URL, resolve, type Resolution } from "./resolve-versions";
import { applyVersionPins } from "./version-pins";
import { updateLanguageTemplates, type TemplatesUpdate } from "./update-language-templates";
import { captureBaseline, compareToBaseline, runTest } from "./test-outcome";
import { DEFAULT_REPAIR_COMMAND, runRepair } from "./repair";

// Distinct exit codes so the workflow can tell "nothing to do" from "a human
// needs to decide something" from "it broke".
export const EXIT_CODES = {
  success: 0,
  failure: 1,
  templatesBehind: 3,
  testsStillFailing: 4,
} as const;

type Options = {
  courseDir: string;
  language: string;
  statusJson: string;
  templatesRepo?: string;
  updateTemplates: boolean;
  skipTests: boolean;
  repairCommand: string;
  maxRepairAttempts: number;
};

// Not bare parseInt as an argParser: commander passes the previous value as
// the second argument, which parseInt reads as a radix. "2" then parses as
// base 2 and comes out NaN, and a NaN attempt limit silently skips the repair
// loop entirely rather than failing.
export function parseAttempts(value: string): number {
  const parsed = parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(`--max-repair-attempts needs a non-negative whole number, got "${value}"`);
  }

  return parsed;
}

export type TestReport = {
  verdict: "passed" | "pre_existing" | "repaired" | "still_failing";
  failures: string[];
  preExistingFailures: string[];
  repairAttempts: number;
};

function heading(text: string): void {
  console.log("");
  console.log(ansiColors.bold(text));
}

// Echoes back the flags this run was given, so both suggestions can be pasted
// as-is rather than reconstructed.
function reportTemplatesBehind(resolution: Resolution, options: Options): void {
  const templatesArg = options.templatesRepo ? ` --templates-repo ${options.templatesRepo}` : "";
  const statusArg = options.statusJson === DEFAULT_STATUS_JSON_URL ? "" : ` --status-json ${options.statusJson}`;

  console.log("");
  console.log(
    ansiColors.yellow(
      `language-templates is behind: it has ${resolution.language} ${resolution.templatesVersion}, but ${resolution.latestVersion} is out.`,
    ),
  );
  console.log("");
  console.log("Bump the shared template first, then re-run this:");
  console.log("");
  console.log(`  bun scripts/language-upgrade/update-language-templates.ts --language ${resolution.language}${templatesArg}${statusArg}`);
  console.log("");
  console.log("or let this script chain both:");
  console.log("");
  console.log(
    `  bun scripts/language-upgrade/upgrade-course-language.ts --course-dir ${options.courseDir} --language ${resolution.language}${templatesArg}${statusArg} --update-templates`,
  );
  console.log("");
  console.log(
    `Only one course should bump the templates for a given version, otherwise every lagging course opens its own identical language-templates PR. Check for an open one for ${resolution.language} ${resolution.latestVersion} before using --update-templates.`,
  );
}

async function runCourseSdk(courseDir: string, args: string, templatesRepo?: string): Promise<void> {
  const courseSdkDir = path.resolve(import.meta.dir, "..", "..");
  // Point course-sdk at the local templates checkout so an unmerged bump is
  // picked up instead of whatever is on origin/main.
  const env = templatesRepo ? `COURSE_SDK_LANGUAGE_TEMPLATES_REPO=${path.resolve(templatesRepo)} ` : "";

  await ShellCommandExecutor.execute(`cd ${courseDir} && ${env}bun ${path.join(courseSdkDir, "cli.ts")} ${args}`, {
    prefix: ansiColors.cyan("[course-sdk] "),
    shouldLogCommand: true,
  });
}

export async function upgradeCourseLanguage(
  options: Options,
): Promise<{ resolution: Resolution; templatesUpdate: TemplatesUpdate | null; test: TestReport | null } | null> {
  const language = Language.findBySlug(options.language);

  heading("Resolving versions");
  let resolution = await resolve(options.courseDir, options.language, options.statusJson, options.templatesRepo);

  console.log(
    `${resolution.course}: ${resolution.language} ${resolution.courseVersion}, latest ${resolution.latestVersion}, templates ${resolution.templatesVersion}`,
  );

  if (resolution.mode === "up_to_date") {
    console.log(`Already at ${resolution.courseVersion}, nothing to do`);
    return null;
  }

  let templatesUpdate: TemplatesUpdate | null = null;

  if (resolution.mode === "path_b") {
    if (!options.updateTemplates) {
      reportTemplatesBehind(resolution, options);
      process.exit(EXIT_CODES.templatesBehind);
    }

    if (!options.templatesRepo) {
      throw new Error("--update-templates needs --templates-repo, so the bump lands somewhere a PR can be opened from");
    }

    heading(`Bumping language-templates to ${resolution.language} ${resolution.latestVersion}`);
    templatesUpdate = await updateLanguageTemplates(options.templatesRepo, options.language, options.statusJson);

    // Re-resolve so the rest of the run sees the bumped templates.
    resolution = await resolve(options.courseDir, options.language, options.statusJson, options.templatesRepo);

    if (resolution.mode === "path_b") {
      throw new Error(`Templates are still behind after the bump (at ${resolution.templatesVersion}), aborting`);
    }
  }

  heading(`Upgrading ${resolution.course} to ${resolution.language} ${resolution.targetVersion}`);
  await runCourseSdk(options.courseDir, `upgrade-language ${language.slug}`, options.templatesRepo);

  // upgrade-language reverts the dependency manifest wholesale to protect
  // course-specific requires, which also reverts the version directive inside
  // it. Put that back.
  heading("Re-applying version pins");
  const starterDir = path.join(options.courseDir, "starter_templates", language.slug);
  const pinOutcomes = applyVersionPins(starterDir, language.slug, resolution.courseVersion, resolution.targetVersion);

  for (const outcome of pinOutcomes) {
    if (outcome.status === "updated") {
      console.log(`${ansiColors.yellow("[pin]")} ${outcome.path}: ${outcome.before} -> ${outcome.after}`);
    } else if (outcome.status === "skipped") {
      console.log(`${ansiColors.yellow("[pin]")} ${outcome.path}: skipped, ${outcome.reason}`);
    }
  }

  heading(`Compiling ${language.slug}`);
  await runCourseSdk(options.courseDir, `compile ${language.slug}`, options.templatesRepo);

  const testReport = options.skipTests ? null : await testAndRepair(options, resolution, language.slug);

  return { resolution: resolution, templatesUpdate: templatesUpdate, test: testReport };
}

// Best-effort: the repair prompt reads better naming this file, but a course
// whose config.yml is unreadable should still get a repair attempt.
function userEditableFile(courseDir: string, languageSlug: string): string | null {
  try {
    return Course.loadFromDirectory(courseDir).starterTemplateAttributesForLanguage(Language.findBySlug(languageSlug)).user_editable_file ?? null;
  } catch {
    return null;
  }
}

async function testAndRepair(options: Options, resolution: Resolution, languageSlug: string): Promise<TestReport> {
  heading(`Testing ${languageSlug}`);
  const outcome = await runTest(options.courseDir, languageSlug);

  if (outcome.passed) {
    console.log(ansiColors.green("Tests pass"));

    return { verdict: "passed", failures: [], preExistingFailures: [], repairAttempts: 0 };
  }

  console.log(ansiColors.yellow(`Failing: ${outcome.failures.join(", ")}`));

  // Whether the upgrade caused this is not visible in the failure itself.
  // build-your-own-redis fails "course-sdk test java" on an untouched main, so
  // without this check the agent below is sent to fix someone else's bug.
  heading("Checking whether this was already failing before the upgrade");
  const comparison = compareToBaseline(outcome, await captureBaseline(options.courseDir, languageSlug));

  if (comparison.kind === "pre_existing") {
    console.log(ansiColors.yellow(`Already failing on HEAD: ${comparison.failures.join(", ")}`));
    console.log("The upgrade did not cause this, so no repair was attempted.");

    return { verdict: "pre_existing", failures: comparison.failures, preExistingFailures: comparison.failures, repairAttempts: 0 };
  }

  // Unreachable: the post-upgrade run failed, so the comparison cannot say it
  // passed. Present so the compiler can narrow to a regression below.
  if (comparison.kind === "passed") {
    return { verdict: "passed", failures: [], preExistingFailures: [], repairAttempts: 0 };
  }

  const baselineFailures = comparison.baselineFailures;

  console.log(ansiColors.red(`The upgrade broke: ${comparison.failures.join(", ")}`));

  const repair = await runRepair(
    {
      courseDir: options.courseDir,
      course: resolution.course,
      language: languageSlug,
      fromVersion: resolution.courseVersion,
      toVersion: resolution.targetVersion,
      failures: comparison.failures,
      preExistingFailures: baselineFailures,
      templatesLanguageDir: options.templatesRepo ? path.resolve(options.templatesRepo, "languages", languageSlug) : null,
      userEditableFile: userEditableFile(options.courseDir, languageSlug),
    },
    options.repairCommand,
    options.maxRepairAttempts,
  );

  return {
    verdict: repair.succeeded ? "repaired" : "still_failing",
    failures: repair.outcome.failures,
    preExistingFailures: baselineFailures,
    repairAttempts: repair.attempts,
  };
}

if (import.meta.main) {
  const program = new Command();

  program
    .name("upgrade-course-language")
    .description("Upgrade a course to the latest version of a language")
    .requiredOption("--course-dir <path>", "path to the course repository checkout")
    .requiredOption("--language <slug>", "course-sdk language slug. Example: 'go'")
    .addOption(new Option("--status-json <location>", "URL or path to the language-dashboard status.json").default(DEFAULT_STATUS_JSON_URL))
    .addOption(new Option("--templates-repo <path>", "path to a language-templates checkout. Defaults to cloning it"))
    .addOption(new Option("--update-templates", "bump language-templates first when it is behind, instead of refusing").default(false))
    .addOption(new Option("--skip-tests", "do not run course-sdk test after upgrading. Leaves the upgrade unverified").default(false))
    .addOption(new Option("--repair-command <command>", "headless agent to fix a regression. Receives the prompt on stdin").default(DEFAULT_REPAIR_COMMAND))
    .addOption(new Option("--max-repair-attempts <count>", "how many times to let the agent try").default(2).argParser(parseAttempts))
    .addOption(new Option("--json-out <path>", "also write the result here, for callers that would rather not scrape stdout"))
    .action(async (options) => {
      const result = await upgradeCourseLanguage(options);

      if (result) {
        console.log("");
        console.log(JSON.stringify(result, null, 2));
      }

      if (options.jsonOut) {
        fs.writeFileSync(options.jsonOut, JSON.stringify(result ?? { upToDate: true }, null, 2));
      }

      // Exits non-zero only when the upgrade itself left the course broken.
      // A pre-existing failure is reported but does not fail the run, since
      // blocking on it would hold the upgrade hostage to an unrelated bug.
      if (result?.test?.verdict === "still_failing") {
        process.exit(EXIT_CODES.testsStillFailing);
      }
    });

  await program.parseAsync(process.argv);
}
