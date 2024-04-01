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
      new Language("elixir", "Elixir"),
      new Language("go", "Go"),
      new Language("haskell", "Haskell"),
      new Language("java", "Java"),
      new Language("javascript", "JavaScript"),
      new Language("kotlin", "Kotlin"),
      new Language("nim", "Nim"),
      new Language("php", "PHP"),
      new Language("python", "Python"),
      new Language("ruby", "Ruby"),
      new Language("rust", "Rust"),
      new Language("swift", "Swift"),
      new Language("typescript", "TypeScript"),
      new Language("zig", "Zig"),
    ];
  }

  static findBySlug(slug: string): Language {
    const language = this.all().find((language) => language.slug === slug);

    if (!language) {
      throw `Language with slug ${slug} not found`;
    }

    return language;
  }

  static findByLanguagePack(language_pack: string) {
    if (language_pack.startsWith("nodejs")) return this.findBySlug("javascript");
    if (language_pack.startsWith("dotnet")) return this.findBySlug("csharp");
    if (language_pack.startsWith("deno")) return this.findBySlug("typescript");
    return this.findBySlug(language_pack.split("-")[0]);
  }

  get codeFileExtension(): string {
    const extensions: { [key: string]: string } = {
      c: "c",
      clojure: "clj",
      cpp: "cpp",
      crystal: "cr",
      csharp: "cs",
      elixir: "ex",
      go: "go",
      haskell: "hs",
      java: "java",
      javascript: "js",
      kotlin: "kt",
      nim: "nim",
      php: "php",
      python: "py",
      ruby: "rb",
      rust: "rs",
      swift: "swift",
      typescript: "ts",
      zig: "zig",
    };

    return extensions[this.slug];
  }

  get languagePack() {
    if (this.slug === "javascript") return "nodejs";
    if (this.slug === "csharp") return "dotnet";
    if (this.slug === "typescript") return "deno";
    return this.slug;
  }

  get syntaxHighlightingIdentifier() {
    return this.slug;
  }
}
