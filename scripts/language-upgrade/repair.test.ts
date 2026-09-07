import { describe, expect, it } from "bun:test";
import fs from "fs";
import path from "path";

import { renderPrompt, type RepairContext } from "./repair";

const TEMPLATE = fs.readFileSync(path.join(import.meta.dir, "prompts", "repair.md"), "utf8");

const CONTEXT: RepairContext = {
  courseDir: "/tmp/build-your-own-redis",
  course: "redis",
  language: "go",
  fromVersion: "1.26",
  toVersion: "1.27",
  failures: ["solution:02-rg2"],
  preExistingFailures: [],
  templatesLanguageDir: "/tmp/language-templates/languages/go",
  userEditableFile: "app/main.go",
};

describe("renderPrompt", () => {
  // Guards against the template and this script drifting apart, which would
  // otherwise surface as a prompt containing a literal {{PLACEHOLDER}} and an
  // agent quietly doing the wrong thing.
  it("leaves no unsubstituted placeholders in the real template", () => {
    expect(renderPrompt(TEMPLATE, CONTEXT)).not.toMatch(/\{\{|\}\}/);
  });

  it("refuses a placeholder it has no value for", () => {
    expect(() => renderPrompt("fix {{NOT_A_REAL_KEY}} please", CONTEXT)).toThrow(/NOT_A_REAL_KEY/);
  });

  it("names the versions and the failing test", () => {
    const prompt = renderPrompt(TEMPLATE, CONTEXT);

    expect(prompt).toContain("redis");
    expect(prompt).toContain("1.26");
    expect(prompt).toContain("1.27");
    expect(prompt).toContain("solution:02-rg2");
  });

  it("tells the agent the repo was otherwise green when it was", () => {
    expect(renderPrompt(TEMPLATE, CONTEXT)).toContain("otherwise green");
  });

  it("lists pre-existing failures as off limits when there are some", () => {
    const prompt = renderPrompt(TEMPLATE, { ...CONTEXT, preExistingFailures: ["starter:redis-java"] });

    expect(prompt).toContain("starter:redis-java");
    expect(prompt).toContain("Leave them alone");
    expect(prompt).not.toContain("otherwise green");
  });

  // The agent is being asked to fix a version upgrade, so the one edit that
  // would trivially make tests pass is the one it must not make.
  it("forbids undoing the upgrade", () => {
    expect(renderPrompt(TEMPLATE, CONTEXT)).toContain("Do not undo the upgrade");
  });

  // Zig 0.16 in build-your-own-git is the motivating case: the template was
  // already ported, the upgrade reverted the course's copy, and an agent
  // starting from scratch would re-derive a migration that already existed.
  describe("the templates reference", () => {
    it("points at the migrated template and names the reverted file", () => {
      const prompt = renderPrompt(TEMPLATE, CONTEXT);

      expect(prompt).toContain("/tmp/language-templates/languages/go");
      expect(prompt).toContain("app/main.go");
      expect(prompt).toContain("merge");
    });

    it("says so plainly when no templates checkout was passed", () => {
      const prompt = renderPrompt(TEMPLATE, { ...CONTEXT, templatesLanguageDir: null });

      expect(prompt).toContain("no reference to compare against");
      expect(prompt).not.toContain("/tmp/language-templates");
    });

    it("still describes the reverted file when its name is unknown", () => {
      const prompt = renderPrompt(TEMPLATE, { ...CONTEXT, userEditableFile: null });

      expect(prompt).toContain("user-editable starter file");
      expect(prompt).not.toMatch(/\{\{|\}\}/);
    });
  });
});
