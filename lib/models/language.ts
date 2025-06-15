export default class Language {
  slug: string;
  name: string;

  constructor(slug: string, name: string) {
    this.slug = slug;
    this.name = name;
  }

  static all() {
    return [
      new Language("c", "C"),
      new Language("cpp", "C++"),
      new Language("clojure", "Clojure"),
      new Language("crystal", "Crystal"),
      new Language("csharp", "C#"),
      new Language("dart", "Dart"),
      new Language("elixir", "Elixir"),
      new Language("gleam", "Gleam"),
      new Language("go", "Go"),
      new Language("haskell", "Haskell"),
      new Language("java", "Java"),
      new Language("javascript", "JavaScript"),
      new Language("kotlin", "Kotlin"),
      new Language("nim", "Nim"),
      new Language("ocaml", "OCaml"),
      new Language("odin", "Odin"),
      new Language("php", "PHP"),
      new Language("python", "Python"),
      new Language("ruby", "Ruby"),
      new Language("rust", "Rust"),
      new Language("scala", "Scala"),
      new Language("swift", "Swift"),
      new Language("typescript", "TypeScript"),
      new Language("zig", "Zig"),
    ];
  }

  static findBySlug(slug: string): Language {
    const language = this.all().find((language) => language.slug === slug);

    if (!language) {
      throw `Language with slug '${slug}' not found. Available slugs: ${this.all()
        .map((l) => l.slug)
        .join(", ")}`;
    }

    return language;
  }

  static findByLanguagePack(language_pack: string) {
    if (language_pack.startsWith("nodejs")) return this.findBySlug("javascript");
    if (language_pack.startsWith("dotnet")) return this.findBySlug("csharp");
    if (language_pack.startsWith("bun")) return this.findBySlug("typescript");
    return this.findBySlug(language_pack.split("-")[0]);
  }

  get codeFileExtension(): string {
    const extensions: { [key: string]: string } = {
      c: "c",
      clojure: "clj",
      cpp: "cpp",
      crystal: "cr",
      csharp: "cs",
      dart: "dart",
      elixir: "ex",
      gleam: "gleam",
      go: "go",
      haskell: "hs",
      java: "java",
      javascript: "js",
      kotlin: "kt",
      nim: "nim",
      ocaml: "ml",
      odin: "odin",
      php: "php",
      python: "py",
      ruby: "rb",
      rust: "rs",
      scala: "scala",
      swift: "swift",
      typescript: "ts",
      zig: "zig",
    };

    return extensions[this.slug];
  }

  get filesToIgnoreDuringUpgrade(): string[] {
    const files: { [key: string]: string[] } = {
      c: ["CMakeLists.txt", "vcpkg.json", "vcpkg-configuration.json"],
      cpp: ["CMakeLists.txt", "vcpkg.json", "vcpkg-configuration.json"],
      gleam: ["gleam.toml", "manifest.toml"],
      go: ["go.mod", "go.sum"],
      java: ["pom.xml"],
      python: ["Pipfile", "Pipfile.lock"],
      rust: ["Cargo.toml", "Cargo.lock"],
    };

    if (!files[this.slug]) {
      throw new Error(
        `course-sdk doesn't know how to upgrade ${this.name}. Please add the files to ignore during upgrade to the filesToIgnoreDuringUpgrade method.`
      );
    }

    return files[this.slug];
  }

  get languagePack() {
    if (this.slug === "javascript") return "nodejs";
    if (this.slug === "csharp") return "dotnet";
    if (this.slug === "typescript") return "bun";
    return this.slug;
  }

  get syntaxHighlightingIdentifier() {
    return this.slug;
  }
}
