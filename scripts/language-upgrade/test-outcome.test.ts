import { describe, expect, it } from "bun:test";

import { compareToBaseline, parseTestOutput, type TestOutcome } from "./test-outcome";

// Trimmed from real "course-sdk test" output. The starter phase running the
// program twice is the part that matters: the first run is expected to fail.
const PASSING_RUN = `
Testing languages: go

Testing Dockerfile: redis-go-1.27
  - Building go-1.27 image without cache
  - Took 26 secs

Testing starter: redis-go
  - Executing starter repo script
     [stage-1] Running tests for Stage 1: Bind to a port
     [stage-1] Test failed
  - Script output verified
  - Uncommenting starter code...
  - Executing starter repo script with first stage uncommented
     [stage-1] Test passed.
  - Took 3 secs

Testing solutions: redis-go
  - Testing solution for stage 01-jm1
     [stage-1] Test passed.
  - Took 3 secs
`;

const STARTER_FAILURE = `
Testing starter: redis-java
  - Executing starter repo script
     [stage-1] Test failed
  - Script output verified
  - Uncommenting starter code...
  - Executing starter repo script with first stage uncommented
     [stage-1] Test failed

  - Process exited with code 1 (expected: 0)

StarterCodeTester failed. Check the logs above for more details.
`;

const SOLUTION_FAILURE = `
Testing starter: redis-go
  - Executing starter repo script with first stage uncommented
     [stage-1] Test passed.

Testing solutions: redis-go
  - Testing solution for stage 01-jm1
     [stage-1] Test passed.
  - Testing solution for stage 02-rg2
     [stage-2] Test failed

  - Process exited with code 1 (expected: 0)

SolutionsTester failed. Check the logs above for more details.
`;

describe("parseTestOutput", () => {
  it("treats the starter's expected failure as a pass", () => {
    // "Test failed" appears here, but only in the run that is supposed to fail.
    expect(parseTestOutput(PASSING_RUN, 0)).toEqual({ passed: true, failures: [] });
  });

  it("attributes a starter failure to the starter", () => {
    expect(parseTestOutput(STARTER_FAILURE, 1)).toEqual({ passed: false, failures: ["starter:redis-java"] });
  });

  it("attributes a solution failure to the stage that failed", () => {
    expect(parseTestOutput(SOLUTION_FAILURE, 1)).toEqual({ passed: false, failures: ["solution:02-rg2"] });
  });

  it("attributes a Dockerfile failure to the Dockerfile", () => {
    const output = `
Testing Dockerfile: redis-go-1.27
  - Building go-1.27 image without cache

  - Process exited with code 1 (expected: 0)
`;

    expect(parseTestOutput(output, 1)).toEqual({ passed: false, failures: ["dockerfile:redis-go-1.27"] });
  });

  it("strips colour codes before matching", () => {
    const coloured = "Testing starter: redis-java\n\x1b[91m  - Process exited with code 1 (expected: 0)\x1b[0m\n";

    expect(parseTestOutput(coloured, 1).failures).toEqual(["starter:redis-java"]);
  });

  // Rather than reporting a pass it cannot justify, since a silent false pass
  // would let a broken upgrade through.
  it("records an unrecognised failure instead of trusting the output", () => {
    expect(parseTestOutput("something went wrong in a way we do not parse\n", 1)).toEqual({ passed: false, failures: ["exit:1"] });
  });

  it("does not invent a failure when the run is clean", () => {
    expect(parseTestOutput("Testing languages: go\n", 0)).toEqual({ passed: true, failures: [] });
  });
});

describe("compareToBaseline", () => {
  const clean: TestOutcome = { passed: true, failures: [] };

  it("reports a pass without consulting the baseline", () => {
    expect(compareToBaseline(clean, { passed: false, failures: ["starter:redis-java"] })).toEqual({ kind: "passed" });
  });

  // The build-your-own-redis java case: broken before the upgrade, still broken
  // after, and not the upgrade's problem to fix.
  it("calls an unchanged failure pre-existing", () => {
    const failing: TestOutcome = { passed: false, failures: ["starter:redis-java"] };

    expect(compareToBaseline(failing, failing)).toEqual({ kind: "pre_existing", failures: ["starter:redis-java"] });
  });

  it("calls a failure against a clean baseline a regression", () => {
    const failing: TestOutcome = { passed: false, failures: ["solution:02-rg2"] };

    expect(compareToBaseline(failing, clean)).toEqual({
      kind: "regression",
      failures: ["solution:02-rg2"],
      baselineFailures: [],
    });
  });

  // A repo can be failing one thing beforehand and a different thing after.
  // The new one is still the upgrade's doing.
  it("spots a new failure alongside an existing one", () => {
    const before: TestOutcome = { passed: false, failures: ["starter:redis-java"] };
    const after: TestOutcome = { passed: false, failures: ["solution:02-rg2"] };

    expect(compareToBaseline(after, before)).toEqual({
      kind: "regression",
      failures: ["solution:02-rg2"],
      baselineFailures: ["starter:redis-java"],
    });
  });
});
