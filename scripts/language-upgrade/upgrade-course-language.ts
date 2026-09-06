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
import path from "path";

import Language from "../../lib/models/language";
import ShellCommandExecutor from "../../lib/shell-command-executor";
import { DEFAULT_STATUS_JSON_URL, resolve, type Resolution } from "./resolve-versions";
import { applyVersionPins } from "./version-pins";
import { updateLanguageTemplates, type TemplatesUpdate } from "./update-language-templates";

// Distinct exit codes so the workflow can tell "nothing to do" from "a human
// needs to decide something" from "it broke".
export const EXIT_CODES = {
  success: 0,
  failure: 1,
  templatesBehind: 3,
} as const;

type Options = {
  courseDir: string;
  language: string;
  statusJson: string;
  templatesRepo?: string;
  updateTemplates: boolean;
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
): Promise<{ resolution: Resolution; templatesUpdate: TemplatesUpdate | null } | null> {
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

  return { resolution: resolution, templatesUpdate: templatesUpdate };
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
    .action(async (options) => {
      const result = await upgradeCourseLanguage(options);

      if (result) {
        console.log("");
        console.log(JSON.stringify(result, null, 2));
      }
    });

  await program.parseAsync(process.argv);
}
