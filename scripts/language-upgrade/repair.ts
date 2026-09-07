// Hands a broken upgrade to a headless agent and re-tests, up to a limit.
//
// Only reached when the tests regressed: something that passed before the
// upgrade fails after it. Pre-existing breakage is filtered out earlier by
// test-outcome.ts, so the agent is never asked to fix what the upgrade did not
// break.

import fs from "fs";
import os from "os";
import path from "path";
import ansiColors from "ansi-colors";

import ShellCommandExecutor from "../../lib/shell-command-executor";
import { runTest, type TestOutcome } from "./test-outcome";

// Overridable because the CLI differs by environment: CI installs
// cursor-agent, and a laptop may only have claude. Both read a prompt on
// stdin, which is how the prompt is delivered - a rendered prompt is too long
// and too full of punctuation to pass safely as a shell argument.
export const DEFAULT_REPAIR_COMMAND = "cursor-agent -p --force";

export type RepairContext = {
  courseDir: string;
  course: string;
  language: string;
  fromVersion: string;
  toVersion: string;
  failures: string[];
  preExistingFailures: string[];
  // Where language-templates keeps this language, when a checkout is available.
  templatesLanguageDir: string | null;
  // The file upgrade-language reverts, and so the one most likely to still be
  // written against the old version's API.
  userEditableFile: string | null;
};

export type RepairResult = {
  attempts: number;
  succeeded: boolean;
  outcome: TestOutcome;
};

function renderPreExistingSection(preExistingFailures: string[]): string {
  if (preExistingFailures.length === 0) {
    return "The repository was otherwise green before the upgrade, so anything else that breaks is also yours.";
  }

  return [
    "These were already failing before the upgrade. Leave them alone; they are",
    "not yours to fix and touching them will muddy the diff:",
    "",
    ...preExistingFailures.map((failure) => `- \`${failure}\``),
  ].join("\n");
}

// language-templates is kept current, so by the time a course lags its
// template has usually already been ported to the new version's API. The
// upgrade copies that port in and then reverts the user-editable file, since
// that file holds course-specific logic a generic template would clobber. The
// result is a working reference sitting right next to broken code, and an
// agent that does not know it is there will re-derive the migration from
// scratch and probably diverge from it.
function renderTemplatesReference(context: RepairContext): string {
  if (context.templatesLanguageDir === null) {
    return "No language-templates checkout was passed to this run, so there is no reference to compare against.";
  }

  const reverted = context.userEditableFile
    ? `\`${context.userEditableFile}\`, which the upgrade reverted to keep this course's own logic`
    : "the course's user-editable starter file, which the upgrade reverted to keep this course's own logic";

  return [
    `\`language-templates\` has already been ported to ${context.language} ${context.toVersion}:`,
    "",
    `    ${context.templatesLanguageDir}`,
    "",
    `Read it before changing anything. It shows the shape the new version expects.`,
    "",
    `Then compare it against ${reverted}. Your job is usually a merge rather than a`,
    `rewrite: take the new API from the template, keep what is specific to this course.`,
  ].join("\n");
}

export function renderPrompt(template: string, context: RepairContext): string {
  const values: Record<string, string> = {
    COURSE: context.course,
    COURSE_DIR: context.courseDir,
    LANGUAGE: context.language,
    FROM_VERSION: context.fromVersion,
    TO_VERSION: context.toVersion,
    FAILURES: context.failures.map((failure) => `- \`${failure}\``).join("\n"),
    PRE_EXISTING_SECTION: renderPreExistingSection(context.preExistingFailures),
    TEMPLATES_REFERENCE: renderTemplatesReference(context),
  };

  const rendered = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (!(key in values)) {
      throw new Error(`repair.md refers to {{${key}}}, which is not a value this script provides`);
    }

    return values[key];
  });

  return rendered;
}

export async function runRepair(context: RepairContext, command: string, maxAttempts: number): Promise<RepairResult> {
  const template = fs.readFileSync(path.join(import.meta.dir, "prompts", "repair.md"), "utf8");
  let outcome: TestOutcome = { passed: false, failures: context.failures };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log("");
    console.log(ansiColors.bold(`Repair attempt ${attempt} of ${maxAttempts}`));

    // Re-rendered each time so the agent sees what is still failing rather
    // than what failed originally.
    const prompt = renderPrompt(template, { ...context, failures: outcome.failures });
    const promptPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "course-sdk-repair-")), "repair.md");

    fs.writeFileSync(promptPath, prompt);

    await ShellCommandExecutor.execute(`cd ${context.courseDir} && ${command} < ${promptPath}`, {
      prefix: ansiColors.magenta("[agent] "),
      // A refusal or a crash is not fatal: the test run below is what decides.
      expectedExitCodes: [0, 1, 2],
      shouldLogCommand: true,
    });

    outcome = await runTest(context.courseDir, context.language);

    if (outcome.passed) {
      console.log(ansiColors.green(`Tests pass after ${attempt} repair attempt${attempt === 1 ? "" : "s"}`));

      return { attempts: attempt, succeeded: true, outcome: outcome };
    }

    console.log(ansiColors.yellow(`Still failing: ${outcome.failures.join(", ")}`));
  }

  return { attempts: maxAttempts, succeeded: false, outcome: outcome };
}
