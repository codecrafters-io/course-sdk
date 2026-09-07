// Runs "course-sdk test" and turns its output into something comparable, so an
// upgrade can tell breakage it caused from breakage that was already there.
//
// That distinction is not academic. build-your-own-redis fails "course-sdk test
// java" on an untouched checkout of main, so an upgrade that naively treats any
// failure as its own fault would send a repair agent off to fix starter code
// nobody broke.

import fs from "fs";
import os from "os";
import path from "path";
import ansiColors from "ansi-colors";

import ShellCommandExecutor from "../../lib/shell-command-executor";

export type TestOutcome = {
  passed: boolean;
  // Stable identifiers such as "starter:redis-java" or "solution:01-jm1".
  // course-sdk aborts at the first failure, so this holds at most one entry;
  // it is a list so that comparing two runs stays a set operation.
  failures: string[];
};

export type BaselineComparison =
  | { kind: "passed" }
  | { kind: "pre_existing"; failures: string[] }
  | { kind: "regression"; failures: string[]; baselineFailures: string[] };

const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

// course-sdk announces each phase on its own line. Tracking these lets a
// failure be attributed to the thing that failed rather than to the run.
const CONTEXT_PATTERNS: { pattern: RegExp; label: (match: RegExpMatchArray) => string }[] = [
  { pattern: /^Testing Dockerfile:\s*(\S+)/, label: (m) => `dockerfile:${m[1]}` },
  { pattern: /^Testing starter:\s*(\S+)/, label: (m) => `starter:${m[1]}` },
  { pattern: /^\s*-\s*Testing solution for stage\s*(\S+)/, label: (m) => `solution:${m[1]}` },
  { pattern: /^Testing solutions:\s*(\S+)/, label: (m) => `solutions:${m[1]}` },
];

// The only trustworthy failure signals. "Test failed" on its own is not one:
// the starter phase deliberately runs the program before stage 1 is
// uncommented and *expects* it to fail, so that string appears in a fully
// passing run.
const FAILURE_PATTERNS = [/^\s*-?\s*Process exited with code \d+ \(expected: [\d,]+\)/, /^\s*\w+ failed\. Check the logs above/];

export function parseTestOutput(output: string, exitCode: number): TestOutcome {
  const lines = output.replace(ANSI_PATTERN, "").split("\n");
  const failures = new Set<string>();
  let context = "unknown";

  for (const line of lines) {
    for (const { pattern, label } of CONTEXT_PATTERNS) {
      const match = line.match(pattern);

      if (match) {
        context = label(match);
        break;
      }
    }

    if (FAILURE_PATTERNS.some((pattern) => pattern.test(line))) {
      failures.add(context);
    }
  }

  // A non-zero exit with nothing recognisable in the output means the parser
  // missed something. Record it rather than reporting a false pass.
  if (exitCode !== 0 && failures.size === 0) {
    failures.add(`exit:${exitCode}`);
  }

  return { passed: exitCode === 0 && failures.size === 0, failures: [...failures].sort() };
}

// Docker builds make a full test run thousands of lines, so it is captured
// rather than streamed. That would leave a failure undiagnosable, hence the
// excerpt below: enough to see the compiler or tester error without the build.
const FAILURE_EXCERPT_LINES = 60;

function printFailureExcerpt(output: string, label: string): void {
  const lines = output.trimEnd().split("\n");
  const excerpt = lines.slice(-FAILURE_EXCERPT_LINES);

  console.log("");
  console.log(ansiColors.dim(`--- last ${excerpt.length} lines of ${label} (${lines.length} total) ---`));

  for (const line of excerpt) {
    console.log(ansiColors.dim("  ") + line);
  }

  console.log(ansiColors.dim("--- end ---"));
}

export async function runTest(courseDir: string, languageSlug: string, label = "course-sdk test"): Promise<TestOutcome> {
  const courseSdkDir = path.resolve(import.meta.dir, "..", "..");

  // Templates are deliberately not wired in here: "test" compiles from the
  // course's own starter_templates and dockerfiles, so a bumped local
  // templates checkout must not colour the result.
  const result = await ShellCommandExecutor.execute(`cd ${courseDir} && bun ${path.join(courseSdkDir, "cli.ts")} test ${languageSlug}`, {
    prefix: ansiColors.magenta("[test] "),
    expectedExitCodes: [0, 1],
    shouldSuppressOutput: true,
  });

  const output = result.stdout + result.stderr;
  const outcome = parseTestOutput(output, result.exitCode);

  if (!outcome.passed) {
    printFailureExcerpt(output, label);
  }

  return outcome;
}

// Tests the pre-upgrade state without disturbing the upgraded working tree, by
// checking HEAD out into a throwaway worktree. Nothing is committed during an
// upgrade, so HEAD is exactly the state we started from.
//
// Only called when the post-upgrade run fails, which keeps the common case
// free: a clean upgrade never pays for a second test run.
export async function captureBaseline(courseDir: string, languageSlug: string): Promise<TestOutcome> {
  const worktreeDir = fs.mkdtempSync(path.join(os.tmpdir(), "course-sdk-baseline-"));

  await ShellCommandExecutor.execute(`git -C ${courseDir} worktree add --detach ${worktreeDir} HEAD`, {
    prefix: ansiColors.yellow("[git] "),
    shouldSuppressOutput: true,
  });

  try {
    return await runTest(worktreeDir, languageSlug, "the pre-upgrade baseline");
  } finally {
    await ShellCommandExecutor.execute(`git -C ${courseDir} worktree remove --force ${worktreeDir}`, {
      prefix: ansiColors.yellow("[git] "),
      expectedExitCodes: [0, 1],
      shouldSuppressOutput: true,
    });
  }
}

export function compareToBaseline(after: TestOutcome, baseline: TestOutcome): BaselineComparison {
  if (after.passed) {
    return { kind: "passed" };
  }

  const newFailures = after.failures.filter((failure) => !baseline.failures.includes(failure));

  // Same things failing as before the upgrade. Worth reporting, but not worth
  // asking an agent to fix, since the upgrade did not cause it.
  if (newFailures.length === 0) {
    return { kind: "pre_existing", failures: after.failures };
  }

  return { kind: "regression", failures: newFailures, baselineFailures: baseline.failures };
}
