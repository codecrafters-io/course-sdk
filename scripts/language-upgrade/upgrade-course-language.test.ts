import { describe, expect, it } from "bun:test";
import { Command, Option } from "commander";

import { parseAttempts } from "./upgrade-course-language";

describe("parseAttempts", () => {
  it("reads whole numbers in base 10", () => {
    expect(parseAttempts("0")).toBe(0);
    expect(parseAttempts("2")).toBe(2);
    expect(parseAttempts("10")).toBe(10);
  });

  it("rejects values that are not numbers", () => {
    expect(() => parseAttempts("lots")).toThrow(/non-negative whole number/);
  });

  it("rejects negatives, which would skip the loop as silently as NaN did", () => {
    expect(() => parseAttempts("-1")).toThrow(/non-negative whole number/);
  });

  // Regression: bare parseInt as an argParser receives commander's previous
  // value as its radix, so "2" parsed as base 2 and produced NaN. The repair
  // loop then ran zero times and reported still_failing without ever calling
  // the agent, which looks identical to an agent that tried and gave up.
  it("survives being used as a commander argParser, where bare parseInt does not", () => {
    const parse = (parser: (value: string, previous: unknown) => unknown) => {
      const program = new Command();

      program.addOption(new Option("--max-repair-attempts <count>").default(2).argParser(parser as never));
      program.parse(["node", "script", "--max-repair-attempts", "2"]);

      return program.opts().maxRepairAttempts;
    };

    expect(parse(parseAttempts as never)).toBe(2);
    expect(parse(parseInt as never)).toBeNaN();
  });
});
