import { afterEach, describe, expect, test } from "bun:test";
import fs from "fs";
import path from "path";
import tmp from "tmp";

import { applyVersionPins } from "./version-pins";

const createdDirs: string[] = [];

function languageRoot(files: Record<string, string>): string {
  const dir = tmp.dirSync().name;
  createdDirs.push(dir);

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
  }

  return dir;
}

function read(dir: string, relativePath: string): string {
  return fs.readFileSync(path.join(dir, relativePath), "utf8");
}

afterEach(() => {
  while (createdDirs.length > 0) {
    fs.rmSync(createdDirs.pop()!, { recursive: true, force: true });
  }
});

describe("config.yml required_executable", () => {
  test("bumps a version that matches the one being upgraded from", () => {
    const dir = languageRoot({ "config.yml": "attributes:\n  required_executable: go (1.26)\n  user_editable_file: app/main.go\n" });

    const outcomes = applyVersionPins(dir, "go", "1.26", "1.27");

    expect(outcomes.find((o) => o.path === "config.yml")?.status).toEqual("updated");
    expect(read(dir, "config.yml")).toContain("required_executable: go (1.27)");
    expect(read(dir, "config.yml")).toContain("user_editable_file: app/main.go");
  });

  test("handles a quoted value", () => {
    const dir = languageRoot({ "config.yml": 'attributes:\n  required_executable: "php (8.5)"\n' });

    applyVersionPins(dir, "php", "8.5", "8.6");

    expect(read(dir, "config.yml")).toContain('required_executable: "php (8.6)"');
  });

  test("leaves a value with no version alone", () => {
    const dir = languageRoot({ "config.yml": 'attributes:\n  required_executable: "uv"\n' });

    const outcomes = applyVersionPins(dir, "python", "3.14", "3.15");

    expect(outcomes.find((o) => o.path === "config.yml")?.status).toEqual("skipped");
    expect(read(dir, "config.yml")).toContain('required_executable: "uv"');
  });

  // The guard that matters: these hold versions of a different tool entirely.
  test("leaves Kotlin's Gradle version alone", () => {
    const dir = languageRoot({ "config.yml": 'attributes:\n  required_executable: "gradle (9.4.1)"\n' });

    const outcomes = applyVersionPins(dir, "kotlin", "2.3", "2.4");

    expect(outcomes.find((o) => o.path === "config.yml")?.status).toEqual("skipped");
    expect(read(dir, "config.yml")).toContain("gradle (9.4.1)");
  });

  test("leaves Haskell's Stack version alone", () => {
    const dir = languageRoot({ "config.yml": "attributes:\n  required_executable: stack (24.33)\n" });

    applyVersionPins(dir, "haskell", "9.10", "9.12");

    expect(read(dir, "config.yml")).toContain("stack (24.33)");
  });

  test("leaves a config.yml that has drifted out of sync alone", () => {
    // Gleam really is in this state: config.yml says 1.14.0, Dockerfile says 1.16.
    const dir = languageRoot({ "config.yml": "attributes:\n  required_executable: gleam (1.14.0)\n" });

    const outcomes = applyVersionPins(dir, "gleam", "1.16", "1.17");

    expect(outcomes.find((o) => o.path === "config.yml")?.status).toEqual("skipped");
    expect(read(dir, "config.yml")).toContain("gleam (1.14.0)");
  });
});

describe("dependency manifests", () => {
  test("go.mod keeps its three-component precision", () => {
    const dir = languageRoot({
      "config.yml": "attributes:\n  required_executable: go (1.26)\n",
      "code/go.mod": "module github.com/codecrafters-io/redis-starter-go\n\ngo 1.26.0\n",
    });

    applyVersionPins(dir, "go", "1.26", "1.27");

    expect(read(dir, "code/go.mod")).toContain("go 1.27.0");
  });

  test("go.mod preserves course-specific requires", () => {
    const dir = languageRoot({
      "config.yml": "attributes:\n  required_executable: go (1.26)\n",
      "code/go.mod": [
        "module github.com/codecrafters-io/claude-code-starter-go",
        "",
        "go 1.26.0",
        "",
        "require github.com/openai/openai-go/v3 v3.16.0",
        "",
        "require (",
        "\tgithub.com/tidwall/gjson v1.18.0 // indirect",
        ")",
        "",
      ].join("\n"),
    });

    applyVersionPins(dir, "go", "1.26", "1.27");

    const goMod = read(dir, "code/go.mod");
    expect(goMod).toContain("go 1.27.0");
    expect(goMod).toContain("github.com/openai/openai-go/v3 v3.16.0");
    expect(goMod).toContain("github.com/tidwall/gjson v1.18.0 // indirect");
  });

  test("Cargo.toml bumps rust-version but not edition", () => {
    const dir = languageRoot({
      "config.yml": "attributes:\n  required_executable: cargo (1.96)\n",
      "code/Cargo.toml": '[package]\nname = "redis-starter-rust"\nedition = "2024"\nrust-version = "1.96"\n',
    });

    applyVersionPins(dir, "rust", "1.96", "1.98");

    expect(read(dir, "code/Cargo.toml")).toContain('rust-version = "1.98"');
    expect(read(dir, "code/Cargo.toml")).toContain('edition = "2024"');
  });

  test("csproj TargetFramework, whose filename carries a mustache placeholder", () => {
    const dir = languageRoot({
      "config.yml": "attributes:\n  required_executable: dotnet (10.0)\n",
      "code/CodeCrafters.Redis.csproj":
        "<Project>\n  <PropertyGroup>\n    <TargetFramework>net10.0</TargetFramework>\n  </PropertyGroup>\n</Project>\n",
    });

    applyVersionPins(dir, "csharp", "10.0", "11.0");

    expect(read(dir, "code/CodeCrafters.Redis.csproj")).toContain("<TargetFramework>net11.0</TargetFramework>");
  });

  test("pyproject requires-python", () => {
    const dir = languageRoot({
      "config.yml": 'attributes:\n  required_executable: "uv"\n',
      "code/pyproject.toml": '[project]\nname = "redis"\nrequires-python = ">=3.14"\n',
    });

    applyVersionPins(dir, "python", "3.14", "3.15");

    expect(read(dir, "code/pyproject.toml")).toContain('requires-python = ">=3.15"');
  });

  // Both of these were found by check-language-support rather than by reading
  // the templates, and both would have left the language half-upgraded.
  test(".python-version, which selects the interpreter", () => {
    const dir = languageRoot({
      "config.yml": 'attributes:\n  required_executable: "uv"\n',
      "code/pyproject.toml": '[project]\nrequires-python = ">=3.14"\n',
      "code/.python-version": "3.14\n",
    });

    applyVersionPins(dir, "python", "3.14", "3.15");

    expect(read(dir, "code/.python-version")).toEqual("3.15\n");
  });

  test("swift-tools-version in Package.swift", () => {
    const dir = languageRoot({
      "config.yml": 'attributes:\n  required_executable: "swift (>=6.0)"\n',
      "code/Package.swift":
        "// swift-tools-version: 6.0\n// The swift-tools-version declares the minimum version.\n\nimport PackageDescription\n",
    });

    applyVersionPins(dir, "swift", "6.0", "6.2");

    const packageSwift = read(dir, "code/Package.swift");
    expect(packageSwift).toContain("// swift-tools-version: 6.2");
    expect(packageSwift).toContain("import PackageDescription");
  });

  test("mix.exs elixir requirement", () => {
    const dir = languageRoot({
      "config.yml": 'attributes:\n  required_executable: "mix"\n',
      "code/mix.exs": 'defmodule Redis.MixProject do\n  def project do\n    [\n      elixir: "~> 1.19",\n    ]\n  end\nend\n',
    });

    applyVersionPins(dir, "elixir", "1.19", "1.20");

    expect(read(dir, "code/mix.exs")).toContain('elixir: "~> 1.20"');
  });

  test("stack.yaml bumps the GHC compiler but not the Stackage resolver", () => {
    const dir = languageRoot({
      "config.yml": "attributes:\n  required_executable: stack (24.33)\n",
      "code/stack.yaml": "resolver: lts-24.33\ncompiler: ghc-9.10\n\npackages:\n  - .\n",
    });

    applyVersionPins(dir, "haskell", "9.10", "9.12");

    const stackYaml = read(dir, "code/stack.yaml");
    expect(stackYaml).toContain("compiler: ghc-9.12");
    expect(stackYaml).toContain("resolver: lts-24.33");
  });

  test("pom.xml bumps all three Java pins but not the project version", () => {
    const dir = languageRoot({
      "config.yml": "attributes:\n  required_executable: mvn\n",
      "code/pom.xml": [
        "<project>",
        "    <artifactId>redis</artifactId>",
        "    <version>1.0</version>",
        "    <properties>",
        "        <maven.compiler.source>26</maven.compiler.source>",
        "        <maven.compiler.target>26</maven.compiler.target>",
        "        <java.version>26</java.version>",
        "    </properties>",
        "</project>",
        "",
      ].join("\n"),
    });

    const outcomes = applyVersionPins(dir, "java", "26", "27");

    expect(outcomes.filter((o) => o.status === "updated")).toHaveLength(3);

    const pom = read(dir, "code/pom.xml");
    expect(pom).toContain("<maven.compiler.source>27</maven.compiler.source>");
    expect(pom).toContain("<maven.compiler.target>27</maven.compiler.target>");
    expect(pom).toContain("<java.version>27</java.version>");
    expect(pom).toContain("<version>1.0</version>");
  });

  test("reports a manifest that is not present", () => {
    const dir = languageRoot({ "config.yml": "attributes:\n  required_executable: go (1.26)\n" });

    const outcomes = applyVersionPins(dir, "go", "1.26", "1.27");

    expect(outcomes.find((o) => o.path === "code/go.mod")?.status).toEqual("missing");
  });

  // course-sdk refreshes config.yml from language-templates during
  // upgrade-language, so by the time pins run it already holds the new version.
  test("reports a file already refreshed from templates as already correct", () => {
    const dir = languageRoot({
      "config.yml": "attributes:\n  required_executable: go (1.27)\n",
      "code/go.mod": "module x\n\ngo 1.26.0\n",
    });

    const outcomes = applyVersionPins(dir, "go", "1.26", "1.27");

    expect(outcomes.find((o) => o.path === "config.yml")?.reason).toEqual("already at the target version");
    expect(read(dir, "code/go.mod")).toContain("go 1.27.0");
  });

  test("is a no-op when already at the target version", () => {
    const dir = languageRoot({
      "config.yml": "attributes:\n  required_executable: go (1.27)\n",
      "code/go.mod": "module x\n\ngo 1.27.0\n",
    });

    const outcomes = applyVersionPins(dir, "go", "1.27", "1.27");

    expect(outcomes.every((o) => o.status !== "updated")).toBeTrue();
  });

  test("languages with no manifest pin only touch config.yml", () => {
    const dir = languageRoot({
      "config.yml": "attributes:\n  required_executable: zig (0.16)\n",
      "code/build.zig": "// nothing versioned here\n",
    });

    const outcomes = applyVersionPins(dir, "zig", "0.16", "0.17");

    expect(outcomes).toHaveLength(1);
    expect(read(dir, "config.yml")).toContain("zig (0.17)");
    expect(read(dir, "code/build.zig")).toEqual("// nothing versioned here\n");
  });
});
