import { describe, expect, test } from "bun:test";
import fs from "fs";
import os from "os";
import path from "path";

import { coversLatest, latestDockerfileVersion, latestTemplatesVersion, planCourses, templatesRejection, toUpgradePlan } from "./upgrade-all-courses";

const shell = { repo: "build-your-own-shell", dockerfiles: ["scala-3.9.Dockerfile"], openUpgrade: false };
const redis = { repo: "build-your-own-redis", dockerfiles: ["scala-3.8.Dockerfile"], openUpgrade: false };
const git = { repo: "build-your-own-git", dockerfiles: ["go-1.27.Dockerfile"], openUpgrade: false };
const kafka = { repo: "build-your-own-kafka", dockerfiles: ["scala-3.8.Dockerfile"], openUpgrade: true };

describe("latestDockerfileVersion", () => {
  test("reads the version off the filename and ignores other languages", () => {
    expect(latestDockerfileVersion(["scala-3.7.Dockerfile", "scala-3.8.Dockerfile", "go-1.27.Dockerfile"], "scala")).toBe("3.8");
  });

  test("is empty when the language is not shipped", () => {
    expect(latestDockerfileVersion(["go-1.27.Dockerfile"], "scala")).toBeNull();
  });
});

describe("coversLatest", () => {
  test("treats 3.9 and 3.9.0 as the same version", () => {
    expect(coversLatest("3.9", "3.9")).toBe(true);
    expect(coversLatest("3.9.0", "3.9")).toBe(true);
    expect(coversLatest("3.8", "3.9")).toBe(false);
    expect(coversLatest(null, "3.9")).toBe(false);
  });
});

describe("planCourses", () => {
  test("refuses when language-templates does not have the latest version", () => {
    expect(() => planCourses("scala", "3.9", "3.8", [redis])).toThrow(templatesRejection("scala", "3.8", "3.9"));
    expect(() => planCourses("scala", "3.9", null, [redis])).toThrow(/no scala Dockerfiles/);
  });

  test("skips a course that was already upgraded and still upgrades the ones behind", () => {
    const plan = toUpgradePlan(planCourses("scala", "3.9", "3.9", [shell, redis, git, kafka]));

    expect(plan.upgrade).toEqual(["build-your-own-redis"]);
    expect(plan.skipped).toEqual([
      { repo: "build-your-own-shell", reason: "already on scala 3.9" },
      { repo: "build-your-own-git", reason: "does not ship scala" },
      { repo: "build-your-own-kafka", reason: "an upgrade pull request is already open" },
    ]);
  });

  test("succeeds with nothing to upgrade when every course is current", () => {
    const plan = toUpgradePlan(planCourses("scala", "3.9", "3.9", [shell]));

    expect(plan.upgrade).toEqual([]);
    expect(plan.skipped).toEqual([{ repo: "build-your-own-shell", reason: "already on scala 3.9" }]);
  });
});

describe("latestTemplatesVersion", () => {
  test("reads the highest Dockerfile in a templates checkout", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "templates-"));
    const dockerfiles = path.join(root, "languages", "scala", "dockerfiles");
    fs.mkdirSync(dockerfiles, { recursive: true });
    fs.writeFileSync(path.join(dockerfiles, "scala-3.8.Dockerfile"), "FROM scratch\n");
    fs.writeFileSync(path.join(dockerfiles, "scala-3.9.Dockerfile"), "FROM scratch\n");

    expect(latestTemplatesVersion(root, "scala")).toBe("3.9");
    expect(latestTemplatesVersion(root, "go")).toBeNull();

    fs.rmSync(root, { recursive: true, force: true });
  });
});
