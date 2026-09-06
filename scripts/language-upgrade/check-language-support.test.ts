import { afterEach, describe, expect, test } from "bun:test";
import fs from "fs";
import path from "path";
import tmp from "tmp";

import { checkLanguage } from "./check-language-support";

const createdDirs: string[] = [];

// Builds a minimal language-templates checkout holding one language.
function templatesRepo(languageSlug: string, files: Record<string, string>): string {
  const dir = tmp.dirSync().name;
  createdDirs.push(dir);

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(dir, "languages", languageSlug, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
  }

  return dir;
}

function goTemplates(extraFiles: Record<string, string> = {}, fromLine = "FROM golang:1.26-alpine"): string {
  return templatesRepo("go", {
    "config.yml": "attributes:\n  required_executable: go (1.26)\n",
    "code/go.mod": "module x\n\ngo 1.26.0\n",
    "dockerfiles/go-1.26.Dockerfile": `${fromLine}\n\nWORKDIR /app\n`,
    ...extraFiles,
  });
}

afterEach(() => {
  while (createdDirs.length > 0) {
    fs.rmSync(createdDirs.pop()!, { recursive: true, force: true });
  }
});

describe("checkLanguage", () => {
  test("reports a language whose tag carries its version as supported", () => {
    const report = checkLanguage(goTemplates(), "go");

    expect(report.support).toEqual("supported");
    expect(report.version).toEqual("1.26");
    expect(report.baseImage).toEqual("1.26-alpine");
    expect(report.blocker).toBeUndefined();
    expect(report.unpinnedFiles).toBeEmpty();
  });

  test("reports a base image tracking another tool as unsupported", () => {
    const report = checkLanguage(goTemplates({}, "FROM debian:trixie"), "go");

    expect(report.support).toEqual("unsupported");
    expect(report.blocker).toMatch(/no version token equal to "1.26"/);
  });

  test("lists the pins it would apply", () => {
    const report = checkLanguage(goTemplates(), "go");

    expect(report.pinnedFiles).toContain("config.yml");
    expect(report.pinnedFiles).toContain("code/go.mod");
  });
});

// This is what surfaced .python-version and Package.swift, neither of which
// blocks a bump but both of which would be left stale by one.
describe("unpinned version files", () => {
  test("flags a file holding the current version that no pin covers", () => {
    const report = checkLanguage(goTemplates({ "code/.tool-versions": "golang 1.26\n" }), "go");

    expect(report.unpinnedFiles).toEqual(["code/.tool-versions"]);
    // Still automatable; a stale file is a gap in the bump, not a blocker.
    expect(report.support).toEqual("supported");
  });

  test("does not flag files a pin already covers", () => {
    const report = checkLanguage(goTemplates(), "go");

    expect(report.unpinnedFiles).not.toContain("code/go.mod");
  });

  test("does not flag a version that is merely a prefix of a longer one", () => {
    const report = checkLanguage(goTemplates({ "code/notes.txt": "needs 1.26.5 or newer\n" }), "go");

    expect(report.unpinnedFiles).toBeEmpty();
  });

  test("does not flag a version that is a suffix of a longer number", () => {
    const report = checkLanguage(goTemplates({ "code/notes.txt": "build 21.26\n" }), "go");

    expect(report.unpinnedFiles).toBeEmpty();
  });

  test("ignores lockfiles, which their own tooling regenerates", () => {
    const report = checkLanguage(goTemplates({ "code/go.sum": "example.com/x v1.26.0 h1:abc=\n" }), "go");

    expect(report.unpinnedFiles).toBeEmpty();
  });
});
