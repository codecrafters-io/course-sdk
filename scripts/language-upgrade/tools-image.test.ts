import { describe, expect, it } from "bun:test";
import fs from "fs";
import path from "path";
import tmp from "tmp";

import { checkToolsImage, courseSdkRoot, describeToolsImage } from "./tools-image";

function sdkRootWith(files: Record<string, string>): string {
  const root = tmp.dirSync().name;

  for (const [name, contents] of Object.entries(files)) {
    const target = path.join(root, "lib", "dockerfiles", name);

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }

  return root;
}

describe("checkToolsImage", () => {
  it("ignores languages with no toolchain image of their own", () => {
    // Most languages are linted by prettier or not at all, so there is nothing
    // in this repository that can fall behind them.
    for (const slug of ["python", "zig", "haskell", "java"]) {
      expect(checkToolsImage(slug, "99.0", sdkRootWith({}))).toEqual({ status: "not_coupled" });
    }
  });

  it("reports an image older than the version being upgraded to", () => {
    const root = sdkRootWith({ "rust-tools.Dockerfile": "FROM rust:1.96-trixie\n\nWORKDIR /workdir\n" });

    expect(checkToolsImage("rust", "1.98", root)).toEqual({
      status: "behind",
      file: "lib/dockerfiles/rust-tools.Dockerfile",
      version: "1.96",
      target: "1.98",
    });
  });

  it("accepts an image newer than the course, since it only has to be new enough", () => {
    const root = sdkRootWith({ "rust-tools.Dockerfile": "FROM rust:1.99-trixie\n" });

    expect(checkToolsImage("rust", "1.98", root)).toMatchObject({ status: "current", version: "1.99" });
  });

  it("accepts an exact match", () => {
    const root = sdkRootWith({ "rust-tools.Dockerfile": "FROM rust:1.98-trixie\n" });

    expect(checkToolsImage("rust", "1.98", root)).toMatchObject({ status: "current" });
  });

  // golang:1.19-alpine puts the version before the suffix, rust:1.96-trixie
  // after the colon. Both are the leading numeric token.
  it("reads the version out of a go tag", () => {
    const root = sdkRootWith({ "go-tools.Dockerfile": "FROM golang:1.19-alpine\n" });

    expect(checkToolsImage("go", "1.27", root)).toMatchObject({ status: "behind", version: "1.19", target: "1.27" });
  });

  it("compares across differing precision", () => {
    const root = sdkRootWith({ "rust-tools.Dockerfile": "FROM rust:1.96-trixie\n" });

    expect(checkToolsImage("rust", "1.96.1", root)).toMatchObject({ status: "behind" });
    expect(checkToolsImage("rust", "1.96.0", root)).toMatchObject({ status: "current" });
  });

  it("says so rather than guessing when the tag holds no version", () => {
    const root = sdkRootWith({ "rust-tools.Dockerfile": "FROM rust:latest\n" });

    expect(checkToolsImage("rust", "1.98", root)).toMatchObject({ status: "unknown" });
  });

  it("says so when the file is missing", () => {
    expect(checkToolsImage("rust", "1.98", sdkRootWith({}))).toMatchObject({ status: "unknown", reason: "no such file" });
  });

  // Guards the mapping against a rename of the real files.
  it("finds the images that actually ship in this repository", () => {
    for (const slug of ["rust", "go"]) {
      expect(checkToolsImage(slug, "0.1", courseSdkRoot()).status).not.toBe("unknown");
    }
  });
});

describe("describeToolsImage", () => {
  it("stays quiet unless the image is behind", () => {
    expect(describeToolsImage({ status: "not_coupled" }, "python")).toBeNull();
    expect(describeToolsImage({ status: "current", file: "f", version: "1.98" }, "rust")).toBeNull();
  });

  it("names the file, both versions, and why the bump is not in this PR", () => {
    const message = describeToolsImage(
      { status: "behind", file: "lib/dockerfiles/rust-tools.Dockerfile", version: "1.96", target: "1.98" },
      "rust",
    );

    expect(message).toContain("lib/dockerfiles/rust-tools.Dockerfile");
    expect(message).toContain("1.96");
    expect(message).toContain("1.98");
    expect(message).toContain("course-sdk lint");
    expect(message).toContain("every course");
  });
});
